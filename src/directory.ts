import { z } from "zod";
import type { AppEnv } from "./env";
import {
  id,
  now,
  SafeError,
  safeAlias,
  seal,
  unseal,
  sql,
  addressFingerprint,
} from "./core";
import { getConnection, deviceIdentity, contactPage } from "./zapi";

export const syncSchema = z
  .object({ cursor: z.string().max(2000).nullable().optional() })
  .strict();
const cursorSchema = z
  .object({
    page: z.number().int().min(2).max(1000),
    generation: z.number().int(),
    data: z.number().int(),
    expires: z.number().int(),
  })
  .strict();
export const normalizeName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");
function aliasFor(short: unknown) {
  // Only a provider's explicit single-word short label is eligible. Never split a full name.
  if (typeof short !== "string" || !/^\p{L}[\p{L}'’-]{1,23}$/u.test(short))
    return "Contato da agenda";
  try {
    return safeAlias(short);
  } catch {
    return "Contato da agenda";
  }
}
export async function syncContacts(env: AppEnv, input: unknown) {
  const p = syncSchema.parse(input),
    c = await getConnection(env),
    t = now();
  const settings = await sql(
    env.DB,
    "SELECT data_generation FROM settings WHERE id=1",
  ).first<{ data_generation: number }>();
  let page = 1,
    expires = t + 3600000;
  if (p.cursor) {
    let saved: z.infer<typeof cursorSchema>;
    try {
      saved = cursorSchema.parse(await unseal(p.cursor, env.ENCRYPTION_KEY));
    } catch {
      throw new SafeError("cursor_agenda_invalido");
    }
    if (
      saved.expires < t ||
      saved.generation !== c.connection_generation ||
      saved.data !== settings!.data_generation
    )
      throw new SafeError("agenda_alterada_reinicie", 409);
    page = saved.page;
    expires = saved.expires;
  }
  if (
    !c.credentials.device_identity ||
    (await deviceIdentity(c.credentials)) !== c.credentials.device_identity
  )
    throw new SafeError("numero_remetente_alterado_reconfigure", 409);
  const day = new Date(t).toISOString().slice(0, 10);
  const quota = await sql(
    env.DB,
    "INSERT INTO directory_usage(day,calls) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET calls=calls+1 WHERE calls<300 RETURNING calls",
    day,
  ).first();
  if (!quota) throw new SafeError("cota_agenda_300_paginas_dia", 429);
  const rows = await contactPage(c.credentials, page);
  if ((await deviceIdentity(c.credentials)) !== c.credentials.device_identity)
    throw new SafeError("numero_remetente_alterado_reconfigure", 409);
  const assert = () =>
    sql(
      env.DB,
      "SELECT json(CASE WHEN EXISTS(SELECT 1 FROM settings WHERE id=1 AND connection_generation=? AND data_generation=?) THEN 'true' ELSE 'agenda alterada' END)",
      c.connection_generation,
      settings!.data_generation,
    );
  const statements = [assert()];
  let eligible = 0;
  const seen = new Set<string>();
  for (const row of rows) {
    const phone = row.phone;
    if (
      typeof phone !== "string" ||
      !/^\d{8,16}$/.test(phone) ||
      phone === c.credentials.device_identity ||
      row.isGroup === true ||
      seen.has(phone)
    )
      continue;
    seen.add(phone);
    eligible++;
    const fingerprint = await addressFingerprint(phone, env.ENCRYPTION_KEY),
      alias = aliasFor(row.short);
    const name = normalizeName(
      [row.name, row.short, row.vname]
        .filter((x): x is string => typeof x === "string")
        .join(" ")
        .slice(0, 768),
    );
    statements.push(
      sql(
        env.DB,
        "INSERT OR IGNORE INTO contacts(id,alias,address,created_at) SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM forgotten_addresses WHERE fingerprint=?)",
        id("ct"),
        alias,
        phone,
        t,
        fingerprint,
      ),
    );
    statements.push(
      sql(
        env.DB,
        "UPDATE contacts SET alias=? WHERE address=? AND deleted=0 AND alias='Contato provisório'",
        alias,
        phone,
      ),
    );
    statements.push(
      sql(
        env.DB,
        "INSERT INTO contact_directory(contact_id,search_name,connection_generation,synced_at) SELECT id,?,?,? FROM contacts WHERE address=? AND deleted=0 AND NOT EXISTS(SELECT 1 FROM forgotten_addresses WHERE fingerprint=?) ON CONFLICT(contact_id) DO UPDATE SET search_name=excluded.search_name,connection_generation=excluded.connection_generation,synced_at=excluded.synced_at",
        name,
        c.connection_generation,
        t,
        phone,
        fingerprint,
      ),
    );
  }
  const complete = rows.length < 100;
  if (complete)
    statements.push(
      sql(
        env.DB,
        "UPDATE directory_state SET completed_at=?,connection_generation=? WHERE id=1",
        t,
        c.connection_generation,
      ),
    );
  statements.push(assert());
  try {
    await env.DB.batch(statements);
  } catch {
    throw new SafeError("agenda_alterada_ou_gravacao_falhou_repita", 409);
  }
  return {
    processed: rows.length,
    eligible,
    complete,
    next_cursor: complete
      ? null
      : page < 1000
        ? await seal(
            {
              page: page + 1,
              generation: c.connection_generation,
              data: settings!.data_generation,
              expires,
            },
            env.ENCRYPTION_KEY,
          )
        : null,
    limited: !complete && page >= 1000,
    coverage:
      "Percurso paginado da agenda; o provedor pode mudar a lista durante a consulta. Sem histórico retroativo.",
    next: complete
      ? "Busque pelo nome com contacts_list. Homônimos exigem escolha por alias/ID."
      : "Continue contacts_sync com next_cursor antes de concluir ausência ou unicidade.",
  };
}
