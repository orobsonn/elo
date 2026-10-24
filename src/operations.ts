import { id, now, sql, SafeError, addressFingerprint } from "./core";
import type { AppEnv } from "./env";
export async function deleteContact(
  db: D1Database,
  contactId: string,
  encryptionKey: string,
) {
  const t = now();
  const contact = await sql(
    db,
    "SELECT address,generation FROM contacts WHERE id=? AND deleted=0",
    contactId,
  ).first<{ address: string | null; generation: number }>();
  const fingerprint = contact?.address
    ? await addressFingerprint(contact.address, encryptionKey)
    : null;
  const pairs = contact?.address
    ? (
        await sql(
          db,
          "SELECT phone,lid FROM contact_identity_pairs WHERE phone=? OR lid=?",
          contact.address,
          contact.address,
        ).all<{ phone: string; lid: string }>()
      ).results
    : [];
  const fingerprints = await Promise.all(
    [...new Set(pairs.flatMap((p) => [p.phone, p.lid]))].map((x) =>
      addressFingerprint(x, encryptionKey),
    ),
  );
  const changed = await db
    .batch([
      sql(
        db,
        "SELECT json(CASE WHEN ? IS NULL OR EXISTS(SELECT 1 FROM contacts WHERE id=? AND deleted=0 AND generation=? AND address IS ?) THEN 'true' ELSE 'contato alterado' END)",
        contact?.generation ?? null,
        contactId,
        contact?.generation ?? null,
        contact?.address ?? null,
      ),
      sql(
        db,
        "INSERT OR IGNORE INTO tombstones(provider_key,deleted_at) SELECT provider_key,? FROM messages WHERE contact_id=?",
        t,
        contactId,
      ),
      sql(
        db,
        "INSERT OR IGNORE INTO forgotten_addresses(fingerprint,forgotten_at) SELECT ?,? WHERE ? IS NOT NULL",
        fingerprint,
        t,
        fingerprint,
      ),
      sql(db, "DELETE FROM contact_directory WHERE contact_id=?", contactId),
      sql(
        db,
        "UPDATE contacts SET deleted=1,generation=generation+1,address=NULL,alias='Contato excluído',relationship='provisional',cadence_days=NULL,snooze_until=NULL WHERE id=? AND NOT EXISTS(SELECT 1 FROM contact_associations WHERE provisional_id=?)",
        contactId,
        contactId,
      ),
      sql(
        db,
        "UPDATE actions SET status=CASE WHEN status IN ('prepared','awaiting_approval','authorized') THEN 'cancelled' ELSE status END,content='',address='',alias='Contato excluído' WHERE contact_id=?",
        contactId,
      ),
      sql(
        db,
        "DELETE FROM source_dependencies WHERE source_id IN (SELECT id FROM sources WHERE contact_id=?) OR context_source_id IN (SELECT id FROM sources WHERE contact_id=?)",
        contactId,
        contactId,
      ),
      sql(db, "DELETE FROM memory WHERE contact_id=?", contactId),
      sql(db, "DELETE FROM tasks WHERE contact_id=?", contactId),
      sql(db, "DELETE FROM special_dates WHERE contact_id=?", contactId),
      sql(db, "DELETE FROM interactions WHERE contact_id=?", contactId),
      sql(
        db,
        "UPDATE sources SET content=NULL,deleted=1,version=version+1,extract_state='done',lease=NULL WHERE contact_id=?",
        contactId,
      ),
      ...fingerprints.map((f) =>
        sql(
          db,
          "INSERT OR IGNORE INTO forgotten_addresses(fingerprint,forgotten_at) VALUES(?,?)",
          f,
          t,
        ),
      ),
      sql(
        db,
        "DELETE FROM contact_identity_pairs WHERE phone=? OR lid=?",
        contact?.address ?? null,
        contact?.address ?? null,
      ),
    ])
    .catch(() => {
      throw new SafeError("contato_alterado_repita_exclusao", 409);
    });
  if (
    !changed[4].meta.changes &&
    (await sql(
      db,
      "SELECT 1 FROM contact_associations WHERE provisional_id=?",
      contactId,
    ).first())
  )
    throw new SafeError("contato_ja_associado_selecione_ficha_atual", 409);
  return {
    deleted: true,
    retained:
      "IDs opacos, tombstones e registro mínimo para impedir replay; backups e terceiros têm retenção própria.",
  };
}
export async function exportData(env: AppEnv) {
  const tables = [
    "contacts",
    "contact_directory",
    "contact_identity_pairs",
    "identity_observations",
    "forgotten_addresses",
    "sources",
    "source_dependencies",
    "messages",
    "memory",
    "tasks",
    "special_dates",
    "interactions",
    "actions",
    "action_events",
    "review_runs",
  ] as const;
  let ti = 0,
    offset = 0,
    first = true,
    started = false,
    closed = false;
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (closed) return;
      try {
        if (!started) {
          controller.enqueue(
            enc.encode('{"format":"elo-export-v1","tables":{'),
          );
          started = true;
          return;
        }
        if (ti >= tables.length) {
          controller.enqueue(enc.encode("}}"));
          controller.close();
          closed = true;
          return;
        }
        const table = tables[ti];
        const rows = await sql(
          env.DB,
          `SELECT * FROM ${table} LIMIT 100 OFFSET ?`,
          offset,
        ).all<Record<string, unknown>>();
        if (closed) return;
        let chunk =
          offset === 0 ? `${ti ? "," : ""}${JSON.stringify(table)}:[` : "";
        for (const row of rows.results) {
          if (table === "sources" && Number(row.expires_at) <= now())
            row.content = null;
          if (
            table === "actions" &&
            Number(row.prepared_at) <= now() - 30 * 86400000
          ) {
            row.content = "";
            row.address = "";
          }
          chunk += `${first ? "" : ","}${JSON.stringify(row)}`;
          first = false;
        }
        if (rows.results.length < 100) {
          chunk += "]";
          ti++;
          offset = 0;
          first = true;
        } else offset += 100;
        controller.enqueue(enc.encode(chunk));
      } catch {
        closed = true;
        controller.error(new Error("exportacao_interrompida_repita"));
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="elo-dados-privados.json"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
