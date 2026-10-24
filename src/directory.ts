import { z } from "zod";
import { observePair } from "./contact-addresses";
import type { AppEnv } from "./env";
import {
  hash,
  id,
  now,
  SafeError,
  safeAlias,
  seal,
  unseal,
  sql,
  addressFingerprint,
} from "./core";
import {
  getConnection,
  deviceIdentity,
  contactPage,
  contactIdentityPairs,
} from "./zapi";

export const syncSchema = z
  .object({ cursor: z.string().max(2000).nullable().optional() })
  .strict();
const cursorSchema = z
  .object({
    run: z.string(),
    page: z.number().int().min(1).max(1000),
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
  let run = id("dsync");
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
    run = saved.run;
    page = saved.page;
    expires = saved.expires;
  }
  if (!p.cursor) {
    await sql(
      env.DB,
      "UPDATE directory_state SET completed_at=NULL,connection_generation=?,data_generation=?,run_id=?,next_page=1 WHERE id=1",
      c.connection_generation,
      settings!.data_generation,
      run,
    ).run();
  }
  const active = await sql(
    env.DB,
    "SELECT 1 FROM directory_state WHERE id=1 AND run_id=? AND next_page=? AND connection_generation=? AND data_generation=?",
    run,
    page,
    c.connection_generation,
    settings!.data_generation,
  ).first();
  if (!active) throw new SafeError("agenda_alterada_reinicie", 409);
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
  let mappingLimited = false;
  const unresolved = await sql(
    env.DB,
    `SELECT 1 FROM contacts c WHERE c.deleted=0 AND c.address LIKE '%@lid'
    AND NOT EXISTS(SELECT 1 FROM contact_identity_pairs p WHERE p.connection_generation=? AND p.lid=c.address) LIMIT 1`,
    c.connection_generation,
  ).first();
  if (unresolved) {
    const phones = [
      ...new Set(
        rows
          .filter(
            (r) =>
              /^\d{8,16}$/.test(r.phone) &&
              r.phone !== c.credentials.device_identity &&
              !r.isGroup,
          )
          .map((r) => r.phone),
      ),
    ];
    const pairs = await contactIdentityPairs(c.credentials, phones);
    if ((await deviceIdentity(c.credentials)) !== c.credentials.device_identity)
      throw new SafeError("numero_remetente_alterado_reconfigure", 409);
    const lids = pairs.map((p) => p.lid);
    const known = lids.length
      ? (
          await sql(
            env.DB,
            `SELECT address FROM contacts c WHERE deleted=0 AND address IN (SELECT value FROM json_each(?)) AND NOT EXISTS(SELECT 1 FROM contact_identity_pairs p WHERE p.connection_generation=? AND p.lid=c.address)`,
            JSON.stringify(lids),
            c.connection_generation,
          ).all<{ address: string }>()
        ).results
      : [];
    const addresses = new Set(known.map((r) => r.address));
    const repairs = pairs.filter((p) => addresses.has(p.lid));
    mappingLimited = repairs.length > 1;
    for (const pair of repairs.slice(0, 1)) {
      await observePair(
        env.DB,
        pair.phone,
        pair.lid,
        c.connection_generation,
        await hash(`${c.connection_generation}:directory:${run}:${pair.phone}`),
        env.ENCRYPTION_KEY,
      );
    }
  }
  const assert = () =>
    sql(
      env.DB,
      "SELECT json(CASE WHEN EXISTS(SELECT 1 FROM settings WHERE id=1 AND connection_generation=? AND data_generation=?) AND EXISTS(SELECT 1 FROM directory_state WHERE id=1 AND run_id=? AND next_page=?) THEN 'true' ELSE 'agenda alterada' END)",
      c.connection_generation,
      settings!.data_generation,
      run,
      page,
    );
  const preparedRows = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const phone = row.phone;
    if (
      !/^\d{8,16}$/.test(phone) ||
      phone === c.credentials.device_identity ||
      row.isGroup ||
      seen.has(phone)
    )
      continue;
    seen.add(phone);
    preparedRows.push({
      phone,
      id: id("ct"),
      alias: aliasFor(row.short),
      fingerprint: await addressFingerprint(phone, env.ENCRYPTION_KEY),
      name: normalizeName(
        [row.name, row.short, row.vname]
          .filter((x): x is string => typeof x === "string")
          .join(" ")
          .slice(0, 768),
      ),
    });
  }
  const eligible = preparedRows.length;
  const payload = JSON.stringify(preparedRows);
  // Recompute the canonical address INSIDE the write transaction. A concurrent
  // identity merge cannot make this page re-create a retired technical record.
  const directoryRows = `WITH input AS (SELECT json_extract(value,'$.id') id,json_extract(value,'$.phone') phone,json_extract(value,'$.alias') alias,json_extract(value,'$.name') name FROM json_each(?) WHERE NOT EXISTS(SELECT 1 FROM forgotten_addresses f WHERE f.fingerprint=json_extract(value,'$.fingerprint'))),
    resolved AS (SELECT input.*,COALESCE((SELECT c.address FROM contacts c LEFT JOIN contact_identity_pairs p ON p.connection_generation=? AND p.phone=input.phone WHERE c.deleted=0 AND (c.address=input.phone OR c.address=p.lid) LIMIT 1),input.phone) address FROM input)`;
  const statements = [
    assert(),
    sql(
      env.DB,
      `SELECT json(CASE WHEN NOT EXISTS(SELECT 1 FROM json_each(?) j JOIN contact_identity_pairs p ON p.phone=json_extract(j.value,'$.phone') AND p.connection_generation=? WHERE (SELECT count(*) FROM contacts c WHERE deleted=0 AND c.address IN (p.phone,p.lid))>1) THEN 'true' ELSE 'identity conflict' END)`,
      payload,
      c.connection_generation,
    ),
    sql(
      env.DB,
      `${directoryRows} INSERT OR IGNORE INTO contacts(id,alias,address,created_at,alias_origin) SELECT id,alias,address,?,'provider' FROM resolved`,
      payload,
      c.connection_generation,
      t,
    ),
    sql(
      env.DB,
      `${directoryRows} UPDATE contacts SET alias=(SELECT r.alias FROM resolved r WHERE r.address=contacts.address),alias_origin='provider' WHERE deleted=0 AND alias_origin IN ('system','provider') AND EXISTS(SELECT 1 FROM resolved r WHERE r.address=contacts.address)`,
      payload,
      c.connection_generation,
    ),
    sql(
      env.DB,
      `${directoryRows} INSERT INTO contact_directory(contact_id,search_name,connection_generation,synced_at) SELECT c.id,r.name,?,? FROM contacts c JOIN resolved r ON r.address=c.address WHERE c.deleted=0 ON CONFLICT(contact_id) DO UPDATE SET search_name=excluded.search_name,connection_generation=excluded.connection_generation,synced_at=excluded.synced_at`,
      payload,
      c.connection_generation,
      c.connection_generation,
      t,
    ),
  ];
  const complete = rows.length < 100 && !mappingLimited;
  const nextPage = mappingLimited ? page : page + 1;
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
  statements.push(
    sql(
      env.DB,
      "UPDATE directory_state SET next_page=? WHERE id=1 AND run_id=? AND next_page=?",
      complete ? null : nextPage,
      run,
      page,
    ),
  );
  try {
    await env.DB.batch(statements);
  } catch {
    throw new SafeError("agenda_alterada_ou_gravacao_falhou_repita", 409);
  }
  return {
    processed: rows.length,
    identity_mapping_pending: mappingLimited,
    eligible,
    complete,
    next_cursor: complete
      ? null
      : page < 1000
        ? await seal(
            {
              run,
              page: nextPage,
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
