import { z } from "zod";
import { DAY, SafeError, hash, id, now, sql, addressFingerprint } from "./core";
import { normalizeName, escapeLike } from "./directory";
import {
  isPhone,
  isLid,
  observePair,
  resolveAddress,
  observationStatements,
} from "./contact-addresses";
const eventSchema = z.object({
  type: z.string().max(64),
  phone: z.string().max(100).optional(),
  chatLid: z
    .string()
    .regex(/^\d{8,20}@lid$/)
    .optional(),
  messageId: z.string().max(200).optional(),
  instanceId: z.string().max(200).optional(),
  momment: z.number().optional(),
  moment: z.number().optional(),
  fromMe: z.boolean().optional(),
  isGroup: z.boolean().optional(),
  isNewsletter: z.boolean().optional(),
  isEdit: z.boolean().optional(),
  error: z
    .union([z.string().max(1000), z.boolean()])
    .nullable()
    .optional(),
  text: z.object({ message: z.string().max(10000) }).optional(),
  ids: z.array(z.string().max(200)).max(20).optional(),
  status: z.string().max(32).optional(),
  deleted: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  isEdited: z.boolean().optional(),
});
const statusRanks: Record<string, number> = {
  PENDING: 0,
  SENT: 1,
  RECEIVED: 3,
  DELIVERED: 3,
  READ: 4,
  PLAYED: 4,
};
export async function ingest(
  db: D1Database,
  input: unknown,
  generation: number,
  encryptionKey?: string,
) {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) throw new SafeError("evento_invalido");
  const e = parsed.data;
  if (e.isGroup || e.isNewsletter) return { ignored: "group" };
  const t = now();
  const eventTime = e.momment ?? e.moment;
  const mutation = eventTime && eventTime < 1e12 ? eventTime * 1000 : eventTime;
  if (!mutation || mutation > t + 300000 || mutation < 946684800000)
    throw new SafeError("data_nao_confiavel");
  const settings = await sql(
    db,
    "SELECT connection_generation,data_generation FROM settings WHERE id=1",
  ).first<{ connection_generation: number; data_generation: number }>();
  // Generation 0 is the unconfigured local repository; HTTP ingress checks configuration separately.
  if (
    settings?.connection_generation !== 0 &&
    settings?.connection_generation !== generation
  )
    throw new SafeError("conexao_alterada", 409);
  if (e.type === "MessageStatusCallback" || e.type === "DeliveryCallback") {
    const rank =
      e.type === "DeliveryCallback" ? 1 : statusRanks[e.status ?? ""];
    if (rank === undefined) return { ignored: "status_unsupported" };
    for (const providerId of e.ids ?? (e.messageId ? [e.messageId] : [])) {
      const key = await hash(`${generation}:${providerId}`);
      const failed = e.type === "DeliveryCallback" && !!e.error ? 1 : 0;
      await db.batch([
        sql(
          db,
          "INSERT INTO provider_status(provider_key,status_rank,failed,updated_at) VALUES(?,?,?,?) ON CONFLICT(provider_key) DO UPDATE SET status_rank=MAX(status_rank,excluded.status_rank),failed=MAX(failed,excluded.failed),updated_at=MAX(updated_at,excluded.updated_at)",
          key,
          rank,
          failed,
          mutation,
        ),
        sql(
          db,
          "UPDATE messages SET status_rank=MAX(status_rank,?) WHERE provider_key=?",
          rank,
          key,
        ),
        sql(
          db,
          "UPDATE actions SET status=CASE WHEN ?>=3 THEN 'delivered' WHEN ?=1 AND status!='delivered' THEN 'failed' ELSE status END,safe_error=CASE WHEN ?=1 AND status!='delivered' THEN 'provedor_recusou_envio' ELSE safe_error END WHERE provider_id=? AND connection_generation=? AND status IN ('executing','uncertain','accepted','failed')",
          rank,
          failed,
          failed,
          providerId,
          generation,
        ),
      ]);
    }
    return { persisted: true };
  }
  if (e.type !== "ReceivedCallback") return { ignored: "unsupported_event" };
  const rawAddress = e.chatLid ?? e.phone;
  if (rawAddress && !/^\d{8,20}(?:@lid)?$/.test(rawAddress))
    throw new SafeError("endereco_do_evento_invalido");
  if (!e.messageId || !rawAddress) throw new SafeError("evento_incompleto");
  const fingerprint = encryptionKey
    ? await addressFingerprint(rawAddress, encryptionKey)
    : null;
  if (
    fingerprint &&
    (await sql(
      db,
      "SELECT 1 FROM forgotten_addresses WHERE fingerprint=?",
      fingerprint,
    ).first())
  )
    return { ignored: "forgotten_contact" };
  const key = await hash(`${generation}:${e.messageId}`);
  if (e.deleted || e.isDeleted) {
    await db.batch([
      sql(db, "INSERT OR IGNORE INTO tombstones VALUES(?,?)", key, t),
      sql(
        db,
        "UPDATE sources SET content=NULL,deleted=1,version=version+1,extract_state='done',lease=NULL WHERE dedup_key=? AND deleted=0",
        key,
      ),
      sql(
        db,
        "UPDATE memory SET needs_review=1 WHERE source_id IN (SELECT id FROM sources WHERE dedup_key=?)",
        key,
      ),
    ]);
    return { persisted: true };
  }
  if (
    await sql(db, "SELECT 1 FROM tombstones WHERE provider_key=?", key).first()
  )
    return { ignored: "deleted" };
  const original = await sql(
    db,
    "SELECT c.address FROM messages m JOIN contacts c ON c.id=m.contact_id WHERE m.provider_key=?",
    key,
  ).first<{ address: string }>();
  if (e.phone && !isPhone(e.phone) && !isLid(e.phone))
    throw new SafeError("endereco_do_evento_invalido");
  if (e.chatLid && e.phone && isLid(e.phone) && e.phone !== e.chatLid)
    throw new SafeError("identidade_do_evento_diverge", 409);
  // A replay cannot attach a new pair to an unrelated message's identity.
  if (original) {
    const resolved = await resolveAddress(db, rawAddress, generation);
    if (
      original.address !== resolved.address &&
      original.address !== e.phone &&
      original.address !== e.chatLid
    )
      throw new SafeError("identidade_do_evento_diverge", 409);
  }
  if (e.chatLid && e.phone && isPhone(e.phone) && mutation > t - 30 * DAY) {
    const linked = await observePair(
      db,
      e.phone,
      e.chatLid,
      generation,
      key,
      encryptionKey,
    );
    if (linked.forgotten) return { ignored: "forgotten_contact" };
  }
  const { address, pair, guard } = await resolveAddress(
    db,
    rawAddress,
    generation,
  );
  if (pair && encryptionKey) {
    for (const value of [pair.phone, pair.lid]) {
      if (
        await sql(
          db,
          "SELECT 1 FROM forgotten_addresses WHERE fingerprint=?",
          await addressFingerprint(value, encryptionKey),
        ).first()
      )
        return { ignored: "forgotten_contact" };
    }
  }
  const existing = await sql(
    db,
    "SELECT m.source_id,m.contact_id,m.direction,c.address FROM messages m JOIN contacts c ON c.id=m.contact_id WHERE m.provider_key=?",
    key,
  ).first<{
    source_id: string;
    contact_id: string;
    direction: string;
    address: string;
  }>();
  const fillMutation = mutation;
  async function fillMissingText(record: NonNullable<typeof existing>) {
    if (record.address !== address)
      throw new SafeError("identidade_do_evento_diverge", 409);
    if (
      e.fromMe !== undefined &&
      record.direction !== (e.fromMe ? "out" : "in")
    )
      throw new SafeError("direcao_do_evento_diverge", 409);
    // Transaction-local claim makes a losing replay a no-op.
    const claim = id("hydrate");
    const recovered = await db.batch([
      sql(
        db,
        `UPDATE sources SET content=?,version=version+1,extract_state='pending',attempts=0,next_attempt=0,lease=?,lease_until=NULL,safe_error=NULL
        WHERE id=? AND contact_id=? AND content IS NULL AND deleted=0
        AND expires_at>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)
        AND occurred_at>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)-2592000000
        AND NOT EXISTS(SELECT 1 FROM tombstones WHERE provider_key=?)
        AND EXISTS(SELECT 1 FROM contacts WHERE id=sources.contact_id AND deleted=0 AND address=?)
        AND EXISTS(SELECT 1 FROM messages WHERE source_id=sources.id AND kind='unsupported_media' AND mutation_at<=?)
        AND EXISTS(SELECT 1 FROM settings WHERE id=1 AND (connection_generation=0 OR connection_generation=?))`,
        e.text!.message,
        claim,
        record.source_id,
        record.contact_id,
        key,
        address,
        fillMutation,
        generation,
      ),
      sql(
        db,
        "UPDATE messages SET kind='text',mutation_at=MAX(mutation_at,?) WHERE source_id=? AND EXISTS(SELECT 1 FROM sources WHERE id=messages.source_id AND lease=?)",
        fillMutation,
        record.source_id,
        claim,
      ),
      sql(
        db,
        "UPDATE memory SET needs_review=1 WHERE source_id=? AND EXISTS(SELECT 1 FROM sources WHERE id=memory.source_id AND lease=?)",
        record.source_id,
        claim,
      ),
      sql(
        db,
        "UPDATE sources SET lease=NULL WHERE id=? AND lease=?",
        record.source_id,
        claim,
      ),
    ]);
    return { persisted: true, duplicate: !recovered[0].meta.changes };
  }
  if (existing) {
    if (existing.address !== address)
      throw new SafeError("identidade_do_evento_diverge", 409);
    if (
      e.fromMe !== undefined &&
      existing.direction !== (e.fromMe ? "out" : "in")
    )
      throw new SafeError("direcao_do_evento_diverge", 409);
    if (!e.isEdit && !e.isEdited && e.text?.message)
      return fillMissingText(existing);
    const deleted = e.deleted || e.isDeleted;
    if (deleted || e.isEdited || e.isEdit) {
      const mutationQuery = deleted
        ? sql(
            db,
            "UPDATE sources SET content=NULL,deleted=1,version=version+1,extract_state='done' WHERE id=? AND deleted=0",
            existing.source_id,
          )
        : sql(
            db,
            "UPDATE sources SET content=?,version=version+1,extract_state='pending',attempts=0,next_attempt=0,lease=NULL,lease_until=NULL,safe_error=NULL WHERE id=? AND deleted=0 AND expires_at>? AND content IS NOT ? AND ?>=(SELECT mutation_at FROM messages WHERE source_id=?)",
            e.text?.message ?? null,
            existing.source_id,
            t,
            e.text?.message ?? null,
            mutation,
            existing.source_id,
          );
      await db.batch([
        ...(deleted
          ? [sql(db, "INSERT OR IGNORE INTO tombstones VALUES(?,?)", key, t)]
          : []),
        mutationQuery,
        sql(
          db,
          "UPDATE messages SET mutation_at=MAX(mutation_at,?) WHERE source_id=?",
          mutation,
          existing.source_id,
        ),
        sql(
          db,
          "UPDATE memory SET needs_review=1 WHERE source_id=?",
          existing.source_id,
        ),
      ]);
    }
    return { persisted: true, duplicate: !deleted && !e.isEdited && !e.isEdit };
  }
  if (e.deleted || e.isDeleted) {
    await sql(db, "INSERT OR IGNORE INTO tombstones VALUES(?,?)", key, t).run();
    return { persisted: true };
  }
  if (mutation <= t - 30 * DAY) {
    await sql(db, "INSERT OR IGNORE INTO tombstones VALUES(?,?)", key, t).run();
    return { ignored: "expired" };
  }
  const ct = id("ct"),
    source = id("src"),
    message = id("msg");
  const text = e.text?.message ?? null;
  const kind = text === null ? "unsupported_media" : "text";
  const observationWrites = [
    sql(
      db,
      "SELECT json(CASE WHEN EXISTS(SELECT 1 FROM settings WHERE id=1 AND (connection_generation=0 OR connection_generation=?) AND data_generation=?) THEN 'true' ELSE 'connection changed' END)",
      generation,
      settings!.data_generation,
    ),
    guard,
    ...(await observationStatements(
      db,
      key,
      pair ? [pair.phone, pair.lid] : [rawAddress],
      generation,
    )),
  ];
  const inserted = await db.batch([
    ...observationWrites,
    sql(
      db,
      "INSERT OR IGNORE INTO contacts(id,alias,address,created_at,alias_origin) SELECT ?,'Contato provisório',?,?,'system' WHERE NOT EXISTS(SELECT 1 FROM tombstones WHERE provider_key=?) AND NOT EXISTS(SELECT 1 FROM forgotten_addresses WHERE fingerprint=?)",
      ct,
      address,
      t,
      key,
      fingerprint,
    ),
    sql(
      db,
      "INSERT OR IGNORE INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content,extract_state) SELECT ?,id,?,'message',?,?,?,?,? FROM contacts WHERE address=? AND deleted=0 AND NOT EXISTS(SELECT 1 FROM tombstones WHERE provider_key=?)",
      source,
      key,
      mutation,
      t,
      mutation + 30 * DAY,
      text,
      text ? "pending" : "done",
      address,
      key,
    ),
    sql(
      db,
      "INSERT OR IGNORE INTO messages(id,source_id,provider_key,contact_id,direction,kind,mutation_at) SELECT ?,s.id,?,s.contact_id,?,?,? FROM sources s WHERE dedup_key=? AND deleted=0 AND NOT EXISTS(SELECT 1 FROM tombstones WHERE provider_key=?)",
      message,
      key,
      e.fromMe ? "out" : "in",
      kind,
      mutation,
      key,
      key,
    ),
    sql(
      db,
      "UPDATE messages SET status_rank=MAX(status_rank,COALESCE((SELECT status_rank FROM provider_status WHERE provider_key=?),0)) WHERE provider_key=?",
      key,
      key,
    ),
    sql(db, "UPDATE settings SET last_received=? WHERE id=1", t),
  ]);
  // Both initial callbacks can observe no row. If this insert lost, re-read
  // the winner once and apply the same guarded fill instead of losing text.
  if (
    !inserted[observationWrites.length + 2].meta.changes &&
    text &&
    !e.isEdit &&
    !e.isEdited
  ) {
    const winner = await sql(
      db,
      "SELECT m.source_id,m.contact_id,m.direction,c.address FROM messages m JOIN contacts c ON c.id=m.contact_id JOIN sources s ON s.id=m.source_id WHERE m.provider_key=? AND c.deleted=0 AND s.deleted=0 AND NOT EXISTS(SELECT 1 FROM tombstones WHERE provider_key=m.provider_key)",
      key,
    ).first<NonNullable<typeof existing>>();
    if (winner) return fillMissingText(winner);
  }
  return { persisted: true };
}
export async function listContacts(
  db: D1Database,
  p: { query?: string; cursor?: string | null; limit?: number },
) {
  const limit = Math.min(p.limit ?? 25, 50);
  const results = await sql(
    db,
    "SELECT id,alias,relationship,cadence_days,snooze_until FROM contacts WHERE deleted=0 AND id>? AND (alias LIKE ? ESCAPE '\\' OR EXISTS(SELECT 1 FROM contact_directory d JOIN settings s ON s.id=1 WHERE d.contact_id=contacts.id AND d.connection_generation=s.connection_generation AND d.search_name LIKE ? ESCAPE '\\')) ORDER BY id LIMIT ?",
    p.cursor ?? "",
    `%${escapeLike(p.query ?? "")}%`,
    `%${escapeLike(normalizeName(p.query ?? ""))}%`,
    limit + 1,
  ).all<{
    id: string;
    alias: string;
    relationship: string;
    cadence_days: number | null;
    snooze_until: string | null;
  }>();
  return {
    directory: await sql(
      db,
      "SELECT completed_at,connection_generation=(SELECT connection_generation FROM settings WHERE id=1) current_connection FROM directory_state WHERE id=1",
    ).first(),
    items: results.results.slice(0, limit),
    next_cursor:
      results.results.length > limit ? results.results[limit - 1].id : null,
  };
}
export type MessageQuery = {
  contact_id?: string;
  conversation_id?: string;
  from?: number;
  to?: number;
  direction?: string;
  term?: string;
  limit?: number;
  cursor?: string | null;
  received_since?: number;
};
export async function listMessages(db: D1Database, p: MessageQuery) {
  const limit = Math.min(p.limit ?? 25, 50);
  let cursor = 0;
  let snapshot = Number(
    (await sql(db, "SELECT COALESCE(MAX(seq),0) seq FROM sources").first<{
      seq: number;
    }>())!.seq,
  );
  if (p.cursor) {
    try {
      const obj = JSON.parse(atob(p.cursor));
      if (
        !Number.isInteger(obj.after) ||
        !Number.isInteger(obj.snapshot) ||
        obj.after < 0
      )
        throw 0;
      cursor = obj.after;
      snapshot = obj.snapshot;
    } catch {
      throw new SafeError("cursor_invalido");
    }
  }
  const contact = p.contact_id ?? p.conversation_id?.replace(/^cv_/, "ct_");
  const clauses = ["s.seq>?", "s.seq<=?", "s.expires_at>?", "c.deleted=0"];
  const params: (string | number | null)[] = [cursor, snapshot, now()];
  if (contact) {
    clauses.push("s.contact_id=?");
    params.push(contact);
  }
  if (p.from !== undefined) {
    clauses.push("s.occurred_at>=?");
    params.push(p.from);
  }
  if (p.to !== undefined) {
    clauses.push("s.occurred_at<?");
    params.push(p.to);
  }
  if (p.received_since !== undefined) {
    clauses.push("s.received_at>=?");
    params.push(p.received_since);
  }
  if (p.direction) {
    clauses.push("m.direction=?");
    params.push(p.direction);
  }
  if (p.term) {
    clauses.push("s.content LIKE ?");
    params.push(`%${p.term}%`);
  }
  const r = await sql(
    db,
    `SELECT s.seq,s.id source_id,s.contact_id,c.alias,s.occurred_at,s.received_at,s.content,s.deleted,m.id,m.direction,m.kind,m.status_rank FROM sources s JOIN messages m ON m.source_id=s.id JOIN contacts c ON c.id=s.contact_id WHERE ${clauses.join(" AND ")} ORDER BY s.seq LIMIT ?`,
    ...params,
    limit + 1,
  ).all<{
    seq: number;
    source_id: string;
    contact_id: string;
    alias: string;
    occurred_at: number;
    received_at: number;
    content: string | null;
    deleted: number;
    id: string;
    direction: string;
    kind: string;
    status_rank: number;
  }>();
  const rows = r.results.slice(0, limit);
  const cap = await sql(
    db,
    "SELECT capture_from FROM settings WHERE id=1",
  ).first<{ capture_from: number }>();
  return {
    items: rows.map((x) => ({
      id: x.id,
      source_id: x.source_id,
      contact_id: x.contact_id,
      conversation_id: x.contact_id.replace(/^ct_/, "cv_"),
      alias: x.alias,
      occurred_at: x.occurred_at,
      received_at: x.received_at,
      text: x.content,
      deleted: !!x.deleted,
      direction: x.direction,
      kind: x.kind,
      status: x.status_rank,
    })),
    next_cursor:
      r.results.length > limit
        ? btoa(JSON.stringify({ after: rows.at(-1)!.seq, snapshot }))
        : null,
    coverage: {
      capture_started_at: cap?.capture_from,
      from: p.from ?? null,
      to: p.to ?? null,
      snapshot,
      complete: r.results.length <= limit,
      external_completeness: "unknown",
      unsupported: "mídia não analisada; grupos não capturados",
    },
  };
}
export async function createContact(db: D1Database, alias: string) {
  const ct = id("ct");
  await sql(
    db,
    "INSERT INTO contacts(id,alias,created_at) VALUES(?,?,?)",
    ct,
    alias,
    now(),
  ).run();
  return { id: ct, alias };
}
