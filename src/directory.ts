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
    step: z.number().int().nonnegative(),
    epoch: z.string(),
    expires: z.number().int(),
  })
  .strict();
const resultSchema = z
  .object({
    processed: z.number().int().min(0).max(100),
    identity_mapping_pending: z.boolean(),
    eligible: z.number().int().min(0).max(100),
    complete: z.boolean(),
    next_cursor: z.string().max(2000).nullable(),
    limited: z.boolean(),
    coverage: z.string().max(500),
    next: z.string().max(500),
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
export async function syncContacts(
  env: AppEnv,
  input: unknown,
): Promise<z.infer<typeof resultSchema>> {
  const p = syncSchema.parse(input),
    c = await getConnection(env),
    t = now();
  const settings = await sql(
    env.DB,
    "SELECT data_generation FROM settings WHERE id=1",
  ).first<{ data_generation: number }>();
  let run = id("dsync");
  let page = 1,
    step = 0,
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
      saved.data !== settings!.data_generation ||
      saved.epoch !== env.AUTH_EPOCH
    )
      throw new SafeError("agenda_alterada_reinicie", 409);
    run = saved.run;
    page = saved.page;
    step = saved.step;
    expires = saved.expires;
  }
  if (!p.cursor) {
    await sql(
      env.DB,
      "UPDATE directory_state SET completed_at=NULL,connection_generation=?,data_generation=?,run_id=?,next_page=1,step=0,last_step=NULL,last_result=NULL,epoch=? WHERE id=1",
      c.connection_generation,
      settings!.data_generation,
      run,
      env.AUTH_EPOCH,
    ).run();
  }
  // Keep only the last committed response. Replaying that exact step returns its
  // original sealed cursor without another provider request, quota or write.
  const committedResponse = async () => {
    const receipt = await sql(
      env.DB,
      `SELECT d.last_result FROM directory_state d JOIN settings s ON s.id=d.id
      WHERE d.id=1 AND d.run_id=? AND d.connection_generation=? AND d.data_generation=?
      AND d.epoch=? AND d.last_step=? AND d.step=? AND s.connection_generation=? AND s.data_generation=?`,
      run,
      c.connection_generation,
      settings!.data_generation,
      env.AUTH_EPOCH,
      step,
      step + 1,
      c.connection_generation,
      settings!.data_generation,
    ).first<{ last_result: string | null }>();
    return receipt?.last_result
      ? resultSchema.parse(JSON.parse(receipt.last_result))
      : null;
  };
  if (p.cursor) {
    const receipt = await committedResponse();
    if (receipt) return receipt;
  }
  const active = await sql(
    env.DB,
    "SELECT 1 FROM directory_state WHERE id=1 AND run_id=? AND next_page=? AND connection_generation=? AND data_generation=? AND step=? AND epoch=?",
    run,
    page,
    c.connection_generation,
    settings!.data_generation,
    step,
    env.AUTH_EPOCH,
  ).first();
  if (!active) throw new SafeError("agenda_alterada_reinicie", 409);
  const assert = () =>
    sql(
      env.DB,
      "SELECT json(CASE WHEN EXISTS(SELECT 1 FROM settings WHERE id=1 AND connection_generation=? AND data_generation=?) AND EXISTS(SELECT 1 FROM directory_state WHERE id=1 AND run_id=? AND next_page=? AND step=? AND epoch=?) THEN 'true' ELSE 'agenda alterada' END)",
      c.connection_generation,
      settings!.data_generation,
      run,
      page,
      step,
      env.AUTH_EPOCH,
    );
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
  // Retain only this page's authenticated evidence, including entries outside
  // the repair slice, so deletion can fence every import in the write batch.
  const provedLids = new Map<string, string>();
  let repairs: { phone: string; lid: string }[] = [];
  const repairLimit = 5;
  const unresolved = await sql(
    env.DB,
    `SELECT 1 FROM contacts c WHERE c.deleted=0 AND c.address GLOB '*@lid'
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
    for (const pair of pairs) provedLids.set(pair.phone, pair.lid);
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
    repairs = pairs.filter((p) => addresses.has(p.lid));
    mappingLimited = repairs.length > repairLimit;
  }
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
      proof_lid: provedLids.get(phone) ?? null,
      identity_fingerprint: provedLids.has(phone)
        ? await addressFingerprint(provedLids.get(phone)!, env.ENCRYPTION_KEY)
        : null,
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
  const forgottenIdentity = provedLids.size
    ? "f.fingerprint IN (json_extract(value,'$.fingerprint'),json_extract(value,'$.identity_fingerprint'))"
    : "f.fingerprint=json_extract(value,'$.fingerprint')";
  const directoryRows = `WITH input AS MATERIALIZED (SELECT json_extract(value,'$.id') id,json_extract(value,'$.phone') phone,json_extract(value,'$.alias') alias,json_extract(value,'$.name') name FROM json_each(?) WHERE NOT EXISTS(SELECT 1 FROM forgotten_addresses f WHERE ${forgottenIdentity})),
    resolved AS MATERIALIZED (SELECT input.*,COALESCE(
      (SELECT c.address FROM contacts c WHERE c.address=input.phone AND c.deleted=0),
      (SELECT c.address FROM contact_identity_pairs p JOIN contacts c ON c.address=p.lid AND c.deleted=0 WHERE p.connection_generation=? AND p.phone=input.phone),
      input.phone) address FROM input)`;
  const proofGuard = () =>
    sql(
      env.DB,
      `SELECT json(CASE WHEN NOT EXISTS(SELECT 1 FROM json_each(?) j
      WHERE json_extract(j.value,'$.proof_lid') IS NOT NULL AND (
        EXISTS(SELECT 1 FROM contact_identity_pairs p WHERE p.connection_generation=? AND p.phone=json_extract(j.value,'$.phone') AND p.lid!=json_extract(j.value,'$.proof_lid'))
        OR EXISTS(SELECT 1 FROM contact_identity_pairs p WHERE p.connection_generation=? AND p.lid=json_extract(j.value,'$.proof_lid') AND p.phone!=json_extract(j.value,'$.phone'))
      )) THEN 'true' ELSE 'identity conflict' END)`,
      payload,
      c.connection_generation,
      c.connection_generation,
    );
  const propagateForgotten = () =>
    sql(
      env.DB,
      `WITH forgotten AS MATERIALIZED (
      SELECT json_extract(j.value,'$.fingerprint') phone_fp,json_extract(j.value,'$.identity_fingerprint') lid_fp
      FROM json_each(?) j WHERE json_extract(j.value,'$.identity_fingerprint') IS NOT NULL
      AND EXISTS(SELECT 1 FROM forgotten_addresses f WHERE f.fingerprint IN (json_extract(j.value,'$.fingerprint'),json_extract(j.value,'$.identity_fingerprint')))
    ) INSERT OR IGNORE INTO forgotten_addresses(fingerprint,forgotten_at)
    SELECT phone_fp,? FROM forgotten UNION SELECT lid_fp,? FROM forgotten`,
      payload,
      t,
      t,
    );
  const recoverOrThrow = async (error: unknown) => {
    try {
      const receipt = await committedResponse();
      if (receipt) return receipt;
    } catch {
      throw new SafeError("agenda_gravacao_nao_confirmada_repita_cursor", 503);
    }
    throw error;
  };
  if (provedLids.size) {
    // Commit only HMAC evidence before any independent repair can remove the
    // final pending LID. Deletion consumes it atomically, even after page rollback
    // and even if the provider never returns the same pair again.
    try {
      await env.DB.batch([
        assert(),
        proofGuard(),
        sql(
          env.DB,
          `INSERT OR IGNORE INTO directory_identity_fingerprints(connection_generation,phone_fp,lid_fp)
          SELECT ?,json_extract(value,'$.fingerprint'),json_extract(value,'$.identity_fingerprint')
          FROM json_each(?) WHERE json_extract(value,'$.identity_fingerprint') IS NOT NULL`,
          c.connection_generation,
          payload,
        ),
        sql(
          env.DB,
          `SELECT json(CASE WHEN NOT EXISTS(SELECT 1 FROM json_each(?) j
          WHERE json_extract(j.value,'$.identity_fingerprint') IS NOT NULL AND NOT EXISTS(
            SELECT 1 FROM directory_identity_fingerprints p WHERE p.connection_generation=?
            AND p.phone_fp=json_extract(j.value,'$.fingerprint') AND p.lid_fp=json_extract(j.value,'$.identity_fingerprint')
          )) THEN 'true' ELSE 'identity conflict' END)`,
          payload,
          c.connection_generation,
        ),
        propagateForgotten(),
      ]);
    } catch {
      return recoverOrThrow(
        new SafeError("identidade_conflitante_ou_alterada_requer_revisao", 409),
      );
    }
  }
  // Sequential independent transactions retain the existing identity guards.
  // Five leaves headroom for D1 preflights and provider calls on Workers Free.
  for (const pair of repairs.slice(0, repairLimit)) {
    try {
      await observePair(
        env.DB,
        pair.phone,
        pair.lid,
        c.connection_generation,
        await hash(`${c.connection_generation}:directory:${run}:${pair.phone}`),
        env.ENCRYPTION_KEY,
        assert(),
      );
    } catch (error) {
      // Only the matching durable receipt can prove a concurrent page succeeded.
      return recoverOrThrow(error);
    }
  }
  const statements = [
    assert(),
    ...(provedLids.size ? [proofGuard(), propagateForgotten()] : []),
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
      `${directoryRows} UPDATE contacts SET alias=(SELECT r.alias FROM resolved r WHERE r.address=contacts.address),alias_origin='provider' WHERE deleted=0 AND alias_origin IN ('system','provider') AND address IN (SELECT address FROM resolved)`,
      payload,
      c.connection_generation,
    ),
    sql(
      env.DB,
      `${directoryRows} INSERT INTO contact_directory(contact_id,search_name,connection_generation,synced_at) SELECT c.id,r.name,?,? FROM resolved r CROSS JOIN contacts c WHERE c.address=r.address AND c.deleted=0 ON CONFLICT(contact_id) DO UPDATE SET search_name=excluded.search_name,connection_generation=excluded.connection_generation,synced_at=excluded.synced_at`,
      payload,
      c.connection_generation,
      c.connection_generation,
      t,
    ),
  ];
  const complete = rows.length < 100 && !mappingLimited;
  const nextPage = mappingLimited ? page : page + 1;
  // Build the whole reply before writing. Encryption/serialization must not
  // fail after D1 has already advanced the only cursor the client can use.
  const response = {
    processed: rows.length,
    identity_mapping_pending: mappingLimited,
    eligible,
    complete,
    next_cursor:
      complete || page >= 1000
        ? null
        : await seal(
            {
              run,
              page: nextPage,
              generation: c.connection_generation,
              data: settings!.data_generation,
              step: step + 1,
              epoch: env.AUTH_EPOCH,
              expires,
            },
            env.ENCRYPTION_KEY,
          ),
    limited: !complete && page >= 1000,
    coverage:
      "Percurso paginado da agenda; o provedor pode mudar a lista durante a consulta. Sem histórico retroativo.",
    next: complete
      ? "Busque pelo nome com contacts_list. Homônimos exigem escolha por alias/ID."
      : "Continue contacts_sync com next_cursor antes de concluir ausência ou unicidade.",
  };
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
      "UPDATE directory_state SET next_page=?,step=step+1,last_step=?,last_result=? WHERE id=1 AND run_id=? AND next_page=? AND step=? AND epoch=?",
      complete ? null : nextPage,
      step,
      JSON.stringify(response),
      run,
      page,
      step,
      env.AUTH_EPOCH,
    ),
  );
  try {
    await env.DB.batch(statements);
  } catch {
    // A binding/transport failure need not mean the transaction rolled back.
    // Return only a matching durable receipt, never success inferred from page.
    try {
      const receipt = await committedResponse();
      if (receipt) return receipt;
    } catch {
      throw new SafeError("agenda_gravacao_nao_confirmada_repita_cursor", 503);
    }
    throw new SafeError("agenda_alterada_ou_gravacao_falhou_repita", 409);
  }
  return response;
}
