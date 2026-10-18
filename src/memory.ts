import { z } from "zod";
import { DAY, SafeError, hash, id, now, privatePattern, sql } from "./core";

const internalId = z.string().min(1).max(100);
const concise = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (v) => !privatePattern.test(v) && !/(?:\+?\d[\s().-]*){8,}/u.test(v),
      "identificador_restrito",
    );
export const memoryFields = [
  "context",
  "goals",
  "preferences",
  "agreements",
  "next_steps",
  "relationship",
] as const;
export const factSchema = z
  .object({
    field: z.enum(memoryFields),
    value: concise(350),
    certainty: z.enum(["explicit", "inferred", "uncertain"]),
    reason: concise(240).optional(),
  })
  .strict();
export const memoryCandidateSchema = factSchema
  .extend({
    contact_id: internalId,
    source_id: internalId,
    source_version: z.number().int().positive().optional(),
  })
  .strict();
const calendarDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T12:00:00Z");
    return !Number.isNaN(+d) && d.toISOString().slice(0, 10) === v;
  });
export const memoryQuerySchema = z
  .object({
    contact_id: internalId,
    cursor: z.string().max(100).nullish(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strict();
export const memoryReviewSchema = z
  .object({
    id: internalId,
    decision: z.enum(["confirm", "correct", "discard"]),
    value: concise(350).optional(),
  })
  .strict()
  .refine((p) => p.decision !== "correct" || !!p.value, "correcao_ausente");
export const taskFieldsSchema = z
  .object({
    subject: concise(200),
    responsible: concise(60).optional(),
    reason: concise(240),
    due_date: calendarDay.nullish(),
    date_note: concise(120).optional(),
    state: z.enum(["open", "done", "discarded"]).optional(),
  })
  .strict();
export const taskSchema = taskFieldsSchema
  .extend({
    contact_id: internalId,
    source_id: internalId,
    source_version: z.number().int().positive().optional(),
  })
  .strict();
export const importSourceSchema = z
  .object({
    contact_id: internalId,
    source_key: z.string().min(1).max(200),
    occurred_at: z.number().int().min(946684800000),
    text: z.string().min(1).max(16000),
    kind: z.enum(["meeting", "note"]),
    extraction: z
      .object({
        facts: z.array(factSchema).max(12),
        tasks: z.array(taskFieldsSchema.omit({ state: true }).strict()).max(6),
      })
      .strict()
      .optional(),
  })
  .strict();
export const taskQuerySchema = z
  .object({
    contact_id: internalId,
    state: z.enum(["open", "done", "discarded"]).optional(),
    cursor: z.string().max(100).nullish(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strict();
export const taskReviewSchema = z
  .object({
    id: internalId,
    contact_id: internalId,
    state: z.enum(["open", "done", "discarded"]),
    due_date: calendarDay.nullish(),
    date_note: concise(120).optional(),
  })
  .strict();
export const dateSchema = z
  .object({
    contact_id: internalId,
    relation: z.enum(["self", "spouse", "child", "other"]),
    label: concise(60),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    leap_policy: z.enum(["feb28", "mar01", "leap_only"]).optional(),
  })
  .strict()
  .refine(
    (p) => p.day <= new Date(Date.UTC(2000, p.month, 0)).getUTCDate(),
    "data_invalida",
  )
  .refine(
    (p) => p.month !== 2 || p.day !== 29 || !!p.leap_policy,
    "politica_29_fevereiro_obrigatoria",
  );
export const interactionSchema = z
  .object({
    contact_id: internalId,
    source_id: internalId,
    kind: z.enum(["meeting", "relevant"]),
    at: z.number().int().min(946684800000),
  })
  .strict();
export const attentionSchema = z
  .object({
    contact_id: internalId.optional(),
    day: calendarDay.optional(),
    timezone: z.string().max(80).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strict();
export const reviewPageSchema = z
  .object({
    day: calendarDay.optional(),
    timezone: z.string().max(80).optional(),
    run_id: internalId.optional(),
    cursor: z.string().max(100).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strict();
export const reviewCompleteSchema = z
  .object({ run_id: internalId, page_token: z.string().min(1).max(100) })
  .strict();
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const p = schema.safeParse(input);
  if (!p.success) throw new SafeError("entrada_invalida");
  return p.data;
}
async function activeContact(db: D1Database, contact: string) {
  if (
    !(await sql(
      db,
      "SELECT 1 FROM contacts WHERE id=? AND deleted=0",
      contact,
    ).first())
  )
    throw new SafeError("contato_indisponivel", 404);
}
export type SourceFence = {
  source_id: string;
  contact_id: string;
  version: number;
  contact_generation: number;
  data_generation: number;
  lease?: string;
  skill_apply?: boolean;
};
export async function sourceFence(
  db: D1Database,
  contact: string,
  source: string,
  version?: number,
): Promise<SourceFence> {
  const s = await sql(
    db,
    "SELECT s.version,c.generation contact_generation,x.data_generation FROM sources s JOIN contacts c ON c.id=s.contact_id CROSS JOIN settings x WHERE x.id=1 AND s.id=? AND s.contact_id=? AND s.deleted=0 AND c.deleted=0 AND s.expires_at>? AND s.content IS NOT NULL",
    source,
    contact,
    now(),
  ).first<{
    version: number;
    contact_generation: number;
    data_generation: number;
  }>();
  if (!s || (version !== undefined && s.version !== version))
    throw new SafeError("fonte_indisponivel_ou_alterada", 409);
  return { source_id: source, contact_id: contact, ...s };
}
// All writes in an extraction batch recheck this fence, including expiry at commit.
export function fenceSQL(
  f: SourceFence,
  t = now(),
): { query: string; params: (string | number | null)[] } {
  return {
    query: `EXISTS(SELECT 1 FROM sources fs JOIN contacts fc ON fc.id=fs.contact_id CROSS JOIN settings fx WHERE fx.id=1 AND fs.id=? AND fs.contact_id=? AND fs.version=? AND fc.generation=? AND fx.data_generation=? AND fs.deleted=0 AND fc.deleted=0 AND fs.content IS NOT NULL AND fs.expires_at>MAX(?,CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)) ${f.lease ? "AND fs.extraction_owner='backend' AND fs.lease=? AND fs.extract_state='processing' AND fs.lease_until>?" : ""} ${f.skill_apply ? "AND fs.extraction_owner='skill' AND fs.skill_applied=0" : ""})`,
    params: [
      f.source_id,
      f.contact_id,
      f.version,
      f.contact_generation,
      f.data_generation,
      t,
      ...(f.lease ? [f.lease, t] : []),
    ],
  };
}
export async function memoryStatement(
  db: D1Database,
  p: z.infer<typeof memoryCandidateSchema>,
  f: SourceFence,
) {
  const key = await hash(
      `memory:${p.contact_id}:${p.source_id}:${f.version}:${p.field}:${p.value}`,
    ),
    mid = id("mem"),
    t = now(),
    guard = fenceSQL(f, t);
  const statement = sql(
    db,
    `INSERT OR IGNORE INTO memory(id,contact_id,field,value,state,reason,source_id,source_version,occurred_at,recorded_at,confirmed_at,dedup_key)
 SELECT ?,?,?,?,CASE WHEN s.identity_review_required=1 OR ?!='explicit' OR (s.kind='message' AND NOT EXISTS(SELECT 1 FROM messages origin WHERE origin.source_id=s.id AND origin.direction='in')) THEN 'pending' WHEN EXISTS(SELECT 1 FROM memory WHERE contact_id=? AND field=? AND state='confirmed' AND value!=?) THEN 'pending' WHEN EXISTS(SELECT 1 FROM memory WHERE contact_id=? AND field=? AND state='confirmed') THEN 'supporting' ELSE 'confirmed' END,
 CASE WHEN s.identity_review_required=1 THEN 'Associação manual: revisar atribuição desta fonte' WHEN s.kind='message' AND NOT EXISTS(SELECT 1 FROM messages origin WHERE origin.source_id=s.id AND origin.direction='in') THEN 'Fala do consultor ou autoria não atribuída ao contato' WHEN EXISTS(SELECT 1 FROM memory WHERE contact_id=? AND field=? AND state='confirmed' AND value!=?) THEN 'Conflito com fato confirmado' ELSE ? END,?,?,s.occurred_at,?,CASE WHEN s.identity_review_required=0 AND ?='explicit' AND (s.kind!='message' OR EXISTS(SELECT 1 FROM messages origin WHERE origin.source_id=s.id AND origin.direction='in')) AND NOT EXISTS(SELECT 1 FROM memory WHERE contact_id=? AND field=? AND state='confirmed') THEN ? ELSE NULL END,? FROM sources s WHERE s.id=? AND ${guard.query}`,
    mid,
    p.contact_id,
    p.field,
    p.value,
    p.certainty,
    p.contact_id,
    p.field,
    p.value,
    p.contact_id,
    p.field,
    p.contact_id,
    p.field,
    p.value,
    p.reason ??
      (p.certainty === "explicit"
        ? "Fato explícito na fonte"
        : "Informação a avaliar"),
    p.source_id,
    f.version,
    t,
    p.certainty,
    p.contact_id,
    p.field,
    t,
    key,
    p.source_id,
    ...guard.params,
  );
  return { statement, key, id: mid };
}
export async function writeMemory(db: D1Database, input: unknown) {
  const p = parse(memoryCandidateSchema, input),
    f = await sourceFence(db, p.contact_id, p.source_id, p.source_version),
    w = await memoryStatement(db, p, f);
  await w.statement.run();
  const result = await sql(
    db,
    "SELECT id,state FROM memory WHERE dedup_key=?",
    w.key,
  ).first<{ id: string; state: string }>();
  if (!result) throw new SafeError("fonte_alterada", 409);
  return result;
}
export async function importSource(db: D1Database, input: unknown) {
  const p = parse(importSourceSchema, input);
  await activeContact(db, p.contact_id);
  const t = now();
  if (p.occurred_at > t + 300000) throw new SafeError("data_nao_confiavel");
  const key = await hash(`import:${p.contact_id}:${p.kind}:${p.source_key}`),
    sid = id("src");
  const expired = p.occurred_at + 30 * DAY <= t;
  await sql(
    db,
    `INSERT OR IGNORE INTO sources(id,contact_id,dedup_key,kind,occurred_at,received_at,expires_at,content,extract_state,extraction_owner) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM contacts WHERE id=? AND deleted=0)`,
    sid,
    p.contact_id,
    key,
    p.kind,
    p.occurred_at,
    t,
    p.occurred_at + 30 * DAY,
    expired ? null : p.text,
    expired || p.extraction ? "done" : "pending",
    p.extraction ? "skill" : "backend",
    p.contact_id,
  ).run();
  let s = await sql(
    db,
    "SELECT id source_id,expires_at,content,occurred_at,extraction_owner,skill_applied FROM sources WHERE dedup_key=? AND deleted=0 AND contact_id=?",
    key,
    p.contact_id,
  ).first<{
    source_id: string;
    expires_at: number;
    content: string | null;
    occurred_at: number;
    extraction_owner: string;
    skill_applied: number;
  }>();
  if (!s) throw new SafeError("contato_indisponivel", 404);
  let available = s.expires_at > now() && s.content !== null;
  if (p.extraction && s.extraction_owner === "skill" && available) {
    if (s.content !== p.text || s.occurred_at !== p.occurred_at)
      throw new SafeError("origem_ja_importada_com_conteudo_diferente", 409);
    if (!s.skill_applied) {
      const fence: SourceFence = {
        ...(await sourceFence(db, p.contact_id, s.source_id)),
        skill_apply: true,
      };
      const facts = await Promise.all(
        p.extraction.facts.map((f) =>
          memoryStatement(
            db,
            { ...f, contact_id: p.contact_id, source_id: s!.source_id },
            fence,
          ),
        ),
      );
      const tasks = await Promise.all(
        p.extraction.tasks.map((task) =>
          taskStatement(
            db,
            {
              ...task,
              contact_id: p.contact_id,
              source_id: s!.source_id,
              state: "open",
            },
            fence,
          ),
        ),
      );
      const guard = fenceSQL(fence);
      try {
        await db.batch([
          ...facts.map((w) => w.statement),
          ...tasks.map((w) => w.statement),
          sql(
            db,
            // 2 violates the CHECK constraint and rolls the whole D1 batch back if
            // eligibility expires between earlier inserts and this final marker.
            `UPDATE sources SET skill_applied=CASE WHEN ${guard.query} THEN 1 ELSE 2 END WHERE id=? AND extraction_owner='skill' AND skill_applied=0`,
            ...guard.params,
            s.source_id,
          ),
        ]);
      } catch {
        throw new SafeError("aplicacao_nao_concluida", 409);
      }
      // A concurrent application may have won; a stale/expired fence must not claim success.
      s = await sql(
        db,
        "SELECT id source_id,expires_at,content,occurred_at,extraction_owner,skill_applied FROM sources WHERE id=? AND contact_id=? AND deleted=0 AND EXISTS(SELECT 1 FROM contacts WHERE id=? AND deleted=0)",
        s.source_id,
        p.contact_id,
        p.contact_id,
      ).first<typeof s>();
      if (!s || !s.skill_applied) throw new SafeError("fonte_alterada", 409);
      available = s.expires_at > now() && s.content !== null;
    }
  }
  return {
    source_id: s.source_id,
    source_available: available,
    extraction_owner: s.extraction_owner,
    application_state: !available
      ? "unavailable"
      : s.extraction_owner === "backend"
        ? "automatic"
        : s.skill_applied
          ? "applied"
          : "pending",
  };
}
async function contextSources(
  db: D1Database,
  selected: { id: string; version: unknown }[],
  contact: string,
) {
  const ids = [
    ...new Map(selected.map((x) => [x.id + ":" + x.version, x])).values(),
  ];
  if (!ids.length) return [];
  return (
    await sql(
      db,
      `SELECT d.source_id,d.source_version,d.context_source_id source_id_context,d.context_source_version version_used,s.occurred_at,s.version current_version,CASE WHEN s.deleted=0 AND s.content IS NOT NULL AND s.expires_at>? THEN 1 ELSE 0 END available FROM source_dependencies d JOIN json_each(?) selected ON d.source_id=json_extract(selected.value,'$.id') AND d.source_version=json_extract(selected.value,'$.version') JOIN sources s ON s.id=d.context_source_id JOIN sources original ON original.id=d.source_id WHERE original.contact_id=? AND s.contact_id=? AND d.context_source_id!=d.source_id ORDER BY d.source_id,d.context_source_id`,
      now(),
      JSON.stringify(ids),
      contact,
      contact,
    ).all<{
      source_id: string;
      source_version: number;
      source_id_context: string;
      version_used: number;
      occurred_at: number;
      current_version: number;
      available: number;
    }>()
  ).results;
}
function contextFor(
  rows: Awaited<ReturnType<typeof contextSources>>,
  source: string,
  version: unknown,
) {
  return rows
    .filter((x) => x.source_id === source && x.source_version === version)
    .map((x) => ({
      source_id: x.source_id_context,
      version_used: x.version_used,
      occurred_at: x.occurred_at,
      available: !!x.available,
      version_changed: x.current_version !== x.version_used,
    }));
}
export async function getMemory(db: D1Database, input: unknown) {
  const p = parse(memoryQuerySchema, input);
  await activeContact(db, p.contact_id);
  const limit = p.limit ?? 25,
    t = now();
  const r = await sql(
    db,
    `SELECT m.id,m.field,m.value,m.state,m.reason,m.source_id,m.source_version,m.occurred_at,m.recorded_at,m.confirmed_at,m.needs_review,m.context_revision,CASE WHEN s.expires_at>? AND s.content IS NOT NULL AND s.deleted=0 THEN 1 ELSE 0 END source_available FROM memory m LEFT JOIN sources s ON s.id=m.source_id WHERE m.contact_id=? AND m.id>? ORDER BY m.id LIMIT ?`,
    t,
    p.contact_id,
    p.cursor ?? "",
    limit + 1,
  ).all<Record<string, unknown> & { id: string }>();
  const contexts = await contextSources(
    db,
    r.results
      .slice(0, limit)
      .map((x) => ({ id: String(x.source_id), version: x.source_version })),
    p.contact_id,
  );
  const interactions = await sql(
    db,
    "SELECT kind,MAX(at) at FROM interactions WHERE contact_id=? GROUP BY kind",
    p.contact_id,
  ).all<{ kind: string; at: number }>();
  const lastMessage = await sql(
    db,
    "SELECT MAX(s.occurred_at) at,MAX(CASE WHEN m.direction='out' THEN s.occurred_at END) sent_at FROM sources s JOIN messages m ON m.source_id=s.id WHERE s.contact_id=?",
    p.contact_id,
  ).first<{ at: number | null; sent_at: number | null }>();
  const lastAction = await sql(
    db,
    "SELECT MAX(COALESCE(claimed_at,prepared_at)) at FROM actions WHERE contact_id=? AND status IN ('accepted','delivered')",
    p.contact_id,
  ).first<{ at: number | null }>();
  const lastMeeting = await sql(
    db,
    "SELECT MAX(occurred_at) at FROM sources WHERE contact_id=? AND kind='meeting' AND deleted=0",
    p.contact_id,
  ).first<{ at: number | null }>();
  const dates = await sql(
    db,
    "SELECT id,relation,label,month,day,leap_policy FROM special_dates WHERE contact_id=? ORDER BY id LIMIT 51",
    p.contact_id,
  ).all();
  const byKind = Object.fromEntries(
    interactions.results.map((x) => [x.kind, x.at]),
  );
  const latest = (...times: (number | null | undefined)[]) => {
    const values = times.filter((v): v is number => typeof v === "number");
    return values.length ? Math.max(...values) : null;
  };
  return {
    items: r.results.slice(0, limit).map((x) => ({
      ...x,
      source_available: !!x.source_available,
      needs_review: !!x.needs_review,
      context_sources: contextFor(
        contexts,
        String(x.source_id),
        x.source_version,
      ),
    })),
    next_cursor: r.results.length > limit ? r.results[limit - 1].id : null,
    dates: dates.results.slice(0, 50),
    dates_complete: dates.results.length <= 50,
    interactions: {
      meeting: latest(byKind.meeting, lastMeeting?.at),
      relevant: byKind.relevant ?? null,
      last_message: lastMessage?.at ?? null,
      last_sent: latest(lastMessage?.sent_at, lastAction?.at),
    },
  };
}
export async function reviewMemory(db: D1Database, input: unknown) {
  const p = parse(memoryReviewSchema, input),
    t = now();
  const m = await sql(
    db,
    `SELECT m.*,c.generation contact_generation,s.version live_source_version,x.data_generation
     FROM memory m JOIN contacts c ON c.id=m.contact_id JOIN sources s ON s.id=m.source_id CROSS JOIN settings x
     WHERE m.id=? AND c.deleted=0 AND x.id=1`,
    p.id,
  ).first<{
    id: string;
    contact_id: string;
    field: string;
    value: string;
    state: string;
    source_id: string;
    source_version: number;
    occurred_at: number;
    needs_review: number;
    context_revision: number;
    contact_generation: number;
    live_source_version: number;
    data_generation: number;
  }>();
  if (!m) throw new SafeError("memoria_indisponivel", 404);
  const selected = `id=? AND contact_id=? AND field=? AND value=? AND state=? AND source_id=? AND source_version=? AND needs_review=? AND context_revision=?
    AND EXISTS(SELECT 1 FROM contacts c WHERE c.id=? AND c.generation=? AND c.deleted=0)
    AND EXISTS(SELECT 1 FROM sources s WHERE s.id=? AND s.contact_id=? AND s.version=?)
    AND EXISTS(SELECT 1 FROM settings x WHERE x.id=1 AND x.data_generation=?)`;
  const selectedParams = [
    m.id,
    m.contact_id,
    m.field,
    m.value,
    m.state,
    m.source_id,
    m.source_version,
    m.needs_review,
    m.context_revision,
    m.contact_id,
    m.contact_generation,
    m.source_id,
    m.contact_id,
    m.live_source_version,
    m.data_generation,
  ];
  if (p.decision === "discard") {
    const changed = await sql(
      db,
      `UPDATE memory SET state='discarded',needs_review=0 WHERE ${selected}`,
      ...selectedParams,
    ).run();
    if (!changed.meta.changes)
      throw new SafeError("memoria_alterada_recarregue", 409);
    return { id: p.id, state: "discarded" };
  }
  if (!["pending", "confirmed", "supporting"].includes(m.state))
    throw new SafeError("revisao_ja_encerrada", 409);
  const marker = `revising:${id("claim")}`,
    target = p.decision === "correct" ? id("mem") : m.id;
  // The random claim is first in the transaction. A stale selection cannot
  // supersede another fact or clear identity/source review requirements.
  const claimed =
    "EXISTS(SELECT 1 FROM memory chosen WHERE chosen.id=? AND chosen.state=?)";
  const statements = [
    sql(
      db,
      `UPDATE memory SET state=? WHERE ${selected}`,
      marker,
      ...selectedParams,
    ),
    sql(
      db,
      `UPDATE memory SET state='superseded',needs_review=0 WHERE contact_id=? AND field=? AND state='confirmed' AND id!=? AND ${claimed}`,
      m.contact_id,
      m.field,
      m.id,
      m.id,
      marker,
    ),
  ];
  if (p.decision === "correct") {
    statements.push(
      sql(
        db,
        `INSERT INTO memory(id,contact_id,field,value,state,reason,source_id,source_version,occurred_at,recorded_at,confirmed_at,dedup_key)
      SELECT ?,contact_id,field,?,'confirmed',?,source_id,source_version,occurred_at,?,?,? FROM memory WHERE id=? AND state=?`,
        target,
        p.value!,
        `Correção pelo consultor de ${m.id}`,
        t,
        t,
        await hash(`review:${m.id}:${p.value}`),
        m.id,
        marker,
      ),
    );
    statements.push(
      sql(
        db,
        "UPDATE memory SET state='superseded',needs_review=0 WHERE id=? AND state=?",
        m.id,
        marker,
      ),
    );
  } else
    statements.push(
      sql(
        db,
        "UPDATE memory SET state='confirmed',confirmed_at=?,needs_review=0,reason='Confirmado pelo consultor' WHERE id=? AND state=?",
        t,
        m.id,
        marker,
      ),
    );
  const changed = await db.batch(statements);
  if (!changed[0].meta.changes || !changed.at(-1)!.meta.changes)
    throw new SafeError("memoria_alterada_recarregue", 409);
  return { id: target, state: "confirmed" };
}
export async function taskStatement(
  db: D1Database,
  p: z.infer<typeof taskSchema>,
  f: SourceFence,
) {
  const key = await hash(
      `task:${p.source_id}:${p.subject}:${p.due_date ?? ""}`,
    ),
    tid = id("task"),
    guard = fenceSQL(f);
  return {
    key,
    id: tid,
    statement: sql(
      db,
      `INSERT OR IGNORE INTO tasks(id,contact_id,subject,responsible,reason,due_date,date_note,state,source_id,source_version,dedup_key,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE ${guard.query}`,
      tid,
      p.contact_id,
      p.subject,
      p.responsible ?? null,
      p.reason,
      p.due_date ?? null,
      p.date_note ?? null,
      p.state ?? "open",
      p.source_id,
      f.version,
      key,
      now(),
      ...guard.params,
    ),
  };
}
export async function writeTask(db: D1Database, input: unknown) {
  const p = parse(taskSchema, input),
    f = await sourceFence(db, p.contact_id, p.source_id, p.source_version),
    w = await taskStatement(db, p, f);
  await w.statement.run();
  const result = await sql(
    db,
    "SELECT id,state FROM tasks WHERE dedup_key=?",
    w.key,
  ).first<{ id: string; state: string }>();
  if (!result) throw new SafeError("fonte_alterada", 409);
  return result;
}
export async function writeDate(db: D1Database, input: unknown) {
  const p = parse(dateSchema, input);
  await activeContact(db, p.contact_id);
  await sql(
    db,
    `INSERT INTO special_dates(id,contact_id,relation,label,month,day,leap_policy) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM contacts WHERE id=? AND deleted=0) ON CONFLICT(contact_id,relation,label) DO UPDATE SET month=excluded.month,day=excluded.day,leap_policy=excluded.leap_policy`,
    id("date"),
    p.contact_id,
    p.relation,
    p.label,
    p.month,
    p.day,
    p.leap_policy ?? "leap_only",
    p.contact_id,
  ).run();
  return { saved: true, leap_policy: p.leap_policy ?? "leap_only" };
}
export async function recordInteraction(db: D1Database, input: unknown) {
  const p = parse(interactionSchema, input);
  if (p.at > now() + 300000) throw new SafeError("data_nao_confiavel");
  const fence = await sourceFence(db, p.contact_id, p.source_id),
    guard = fenceSQL(fence);
  await sql(
    db,
    `INSERT INTO interactions(id,contact_id,kind,at,source_id) SELECT ?,?,?,?,? WHERE ${guard.query} ON CONFLICT(contact_id,kind,source_id) DO UPDATE SET at=excluded.at`,
    id("int"),
    p.contact_id,
    p.kind,
    p.at,
    p.source_id,
    ...guard.params,
  ).run();
  return { recorded: true };
}
export function localDay(at: number, timezone = "America/Fortaleza") {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at);
  } catch {
    throw new SafeError("fuso_invalido");
  }
}
// Binary search the timezone's calendar boundary; handles DST without a fixed UTC offset.
export function dayWindow(day: string, timezone: string) {
  parse(calendarDay, day);
  localDay(now(), timezone);
  const center = Date.parse(day + "T12:00:00Z");
  const boundary = (target: string) => {
    let lo = center - 3 * DAY,
      hi = center + 3 * DAY;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (localDay(mid, timezone) < target) lo = mid;
      else hi = mid;
    }
    return hi;
  };
  const next = new Date(Date.parse(day + "T12:00:00Z") + DAY)
    .toISOString()
    .slice(0, 10);
  return { from: boundary(day), to: boundary(next) };
}
export async function attention(db: D1Database, input: unknown = {}) {
  const p = parse(attentionSchema, input),
    day = p.day ?? localDay(now(), p.timezone),
    limit = p.limit ?? 25;
  if (p.contact_id) await activeContact(db, p.contact_id);
  const contact = p.contact_id ?? null,
    timezone = p.timezone ?? "America/Fortaleza",
    window = dayWindow(day, timezone);
  const tasks = await sql(
    db,
    `SELECT t.id,t.contact_id,c.alias,t.subject,t.responsible,t.reason,t.due_date,t.date_note,t.state,t.source_id,t.source_version,t.needs_review,t.context_revision,s.occurred_at source_occurred_at,t.updated_at,CASE WHEN s.expires_at>? AND s.content IS NOT NULL AND s.deleted=0 THEN 1 ELSE 0 END source_available FROM tasks t JOIN contacts c ON c.id=t.contact_id LEFT JOIN sources s ON s.id=t.source_id WHERE c.deleted=0 AND (? IS NULL OR t.contact_id=?) AND t.state='open' AND (t.due_date IS NULL OR t.due_date<=?) ORDER BY t.due_date,t.id LIMIT ?`,
    now(),
    contact,
    contact,
    day,
    limit + 1,
  ).all();
  const pending = await sql(
    db,
    `SELECT m.id,m.contact_id,c.alias,m.field,m.value,m.reason,m.source_id,m.occurred_at,m.needs_review,CASE WHEN s.expires_at>? AND s.content IS NOT NULL AND s.deleted=0 THEN 1 ELSE 0 END source_available FROM memory m JOIN contacts c ON c.id=m.contact_id LEFT JOIN sources s ON s.id=m.source_id WHERE c.deleted=0 AND (? IS NULL OR m.contact_id=?) AND (m.state='pending' OR (m.needs_review=1 AND m.state IN ('confirmed','supporting'))) ORDER BY m.recorded_at,m.id LIMIT ?`,
    now(),
    contact,
    contact,
    limit + 1,
  ).all<{ source_available: number }>();
  const dates = await sql(
    db,
    "SELECT d.id,d.contact_id,c.alias,d.relation,d.label,d.month,d.day,d.leap_policy FROM special_dates d JOIN contacts c ON c.id=d.contact_id WHERE c.deleted=0 AND (? IS NULL OR d.contact_id=?) ORDER BY d.id LIMIT 501",
    contact,
    contact,
  ).all<{
    id: string;
    contact_id: string;
    alias: string;
    relation: string;
    label: string;
    month: number;
    day: number;
    leap_policy: string;
  }>();
  const year = Number(day.slice(0, 4)),
    leap = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
  const dueDates = dates.results.flatMap((d) => {
    let month = d.month,
      date = d.day;
    if (month === 2 && date === 29 && !leap) {
      if (d.leap_policy === "leap_only") return [];
      if (d.leap_policy === "feb28") date = 28;
      else {
        month = 3;
        date = 1;
      }
    }
    const on = `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
    return on === day ? [{ ...d, on }] : [];
  });
  const cadence = await sql(
    db,
    `SELECT c.id contact_id,c.alias,c.cadence_days,c.snooze_until,MAX(i.at) last_relevant FROM contacts c LEFT JOIN interactions i ON i.contact_id=c.id AND i.kind='relevant' WHERE c.deleted=0 AND c.cadence_days IS NOT NULL AND (? IS NULL OR c.id=?) GROUP BY c.id HAVING (c.snooze_until IS NULL OR c.snooze_until<=?) AND (last_relevant IS NULL OR last_relevant+c.cadence_days*86400000<=?) LIMIT ?`,
    contact,
    contact,
    day,
    window.to,
    limit + 1,
  ).all<{ cadence_days: number; last_relevant: number | null }>();
  const cadences = cadence.results;
  const unreviewed = (await sql(
    db,
    `SELECT COUNT(*) n FROM sources s JOIN contacts c ON c.id=s.contact_id WHERE c.deleted=0 AND s.deleted=0 AND (? IS NULL OR s.contact_id=?) AND s.version>s.reviewed_version AND ((s.received_at>=? AND s.received_at<?) OR s.version>1)`,
    contact,
    contact,
    window.from,
    window.to,
  ).first<{ n: number }>())!.n;
  return {
    day,
    tasks: tasks.results
      .slice(0, limit)
      .map((x) => ({
        ...x,
        source_available: !!x.source_available,
        needs_review: !!x.needs_review,
      })),
    pending: pending.results
      .slice(0, limit)
      .map((x) => ({ ...x, source_available: !!x.source_available })),
    unreviewed: {
      count: unreviewed,
      from: window.from,
      to: window.to,
      basis: "received_at_or_unreviewed_edit",
      action: "review_page",
    },
    dates: dueDates.slice(0, limit),
    cadence: cadences.slice(0, limit),
    coverage: {
      complete:
        tasks.results.length <= limit &&
        pending.results.length <= limit &&
        dates.results.length <= 500 &&
        cadence.results.length <= limit,
      review_required: true,
    },
    suggested_action:
      "Avaliar fontes e preparar retorno; nenhum envio automático",
  };
}
export async function getTasks(db: D1Database, input: unknown) {
  const p = parse(taskQuerySchema, input);
  await activeContact(db, p.contact_id);
  const limit = p.limit ?? 25;
  const r = await sql(
    db,
    `SELECT t.id,t.contact_id,t.subject,t.responsible,t.reason,t.due_date,t.date_note,t.state,t.source_id,t.source_version,t.needs_review,t.context_revision,t.updated_at,CASE WHEN s.expires_at>? AND s.content IS NOT NULL AND s.deleted=0 THEN 1 ELSE 0 END source_available FROM tasks t LEFT JOIN sources s ON s.id=t.source_id WHERE t.contact_id=? AND t.id>? AND t.state=? ORDER BY t.id LIMIT ?`,
    now(),
    p.contact_id,
    p.cursor ?? "",
    p.state ?? "open",
    limit + 1,
  ).all<{
    id: string;
    source_id: string;
    source_version: number | null;
    source_available: number;
    needs_review: number;
  }>();
  const contexts = await contextSources(
    db,
    r.results
      .slice(0, limit)
      .map((x) => ({ id: x.source_id, version: x.source_version })),
    p.contact_id,
  );
  return {
    items: r.results.slice(0, limit).map((x) => ({
      ...x,
      source_available: !!x.source_available,
      needs_review: !!x.needs_review,
      context_sources: contextFor(contexts, x.source_id, x.source_version),
    })),
    next_cursor: r.results.length > limit ? r.results[limit - 1].id : null,
  };
}
export async function reviewTask(db: D1Database, input: unknown) {
  const p = parse(taskReviewSchema, input);
  const r = await sql(
    db,
    `UPDATE tasks SET state=?,due_date=CASE WHEN ? THEN ? ELSE due_date END,date_note=COALESCE(?,date_note),updated_at=? WHERE id=? AND contact_id=? AND EXISTS(SELECT 1 FROM contacts WHERE id=? AND deleted=0)`,
    p.state,
    "due_date" in p ? 1 : 0,
    p.due_date ?? null,
    p.date_note ?? null,
    now(),
    p.id,
    p.contact_id,
    p.contact_id,
  ).run();
  if (!r.meta.changes) throw new SafeError("tarefa_indisponivel", 404);
  return { id: p.id, state: p.state };
}
type ReviewItem = {
  seq: number;
  source_id: string;
  contact_id: string;
  alias: string;
  source_version: number;
  occurred_at: number;
  received_at: number;
  text: string;
  kind: string;
  source_kind: string;
  direction: "in" | "out" | null;
};
type ReviewRun = {
  id: string;
  day: string;
  timezone: string;
  from_at: number;
  to_at: number;
  snapshot_seq: number;
  after_seq: number;
  last_page_token: string | null;
  state: string;
};
// A source can enter the scope behind the persisted cursor, even without text.
// Never complete a run that omitted it; already-shown versions are separate.
const unseenReviewSources = `FROM sources s JOIN contacts c ON c.id=s.contact_id
  WHERE s.seq<=r.snapshot_seq AND ((s.received_at>=r.from_at AND s.received_at<r.to_at) OR (s.version>1 AND s.version>s.reviewed_version))
  AND s.deleted=0 AND c.deleted=0
  AND NOT EXISTS(SELECT 1 FROM review_items ri WHERE ri.run_id=r.id AND ri.source_id=s.id)`;
export async function reviewPage(db: D1Database, input: unknown = {}) {
  const p = parse(reviewPageSchema, input);
  let run: ReviewRun | null;
  if (p.run_id) {
    run = await sql(
      db,
      "SELECT * FROM review_runs WHERE id=?",
      p.run_id,
    ).first<ReviewRun>();
    if (
      !run ||
      run.state === "complete" ||
      !p.cursor ||
      p.cursor !== run.last_page_token
    )
      throw new SafeError("pagina_invalida_ou_concorrente", 409);
  } else {
    if (p.cursor) throw new SafeError("cursor_sem_revisao");
    const timezone = p.timezone ?? "America/Fortaleza",
      day = p.day ?? localDay(now(), timezone),
      window = dayWindow(day, timezone),
      rid = id("review");
    const snapshot = (await sql(
      db,
      "SELECT COALESCE(MAX(seq),0) n FROM sources",
    ).first<{ n: number }>())!.n;
    await sql(
      db,
      "INSERT INTO review_runs(id,day,timezone,from_at,to_at,snapshot_seq,created_at) VALUES(?,?,?,?,?,?,?)",
      rid,
      day,
      timezone,
      window.from,
      window.to,
      snapshot,
      now(),
    ).run();
    run = {
      id: rid,
      day,
      timezone,
      from_at: window.from,
      to_at: window.to,
      snapshot_seq: snapshot,
      after_seq: 0,
      last_page_token: null,
      state: "reading",
    };
  }
  const limit = p.limit ?? 25;
  const result = await sql(
    db,
    `SELECT s.seq,s.id source_id,s.contact_id,c.alias,s.version source_version,s.occurred_at,s.received_at,s.content text,s.kind,s.kind source_kind,m.direction FROM sources s JOIN contacts c ON c.id=s.contact_id LEFT JOIN messages m ON m.source_id=s.id WHERE s.seq>? AND s.seq<=? AND ((s.received_at>=? AND s.received_at<?) OR (s.version>1 AND s.version>s.reviewed_version)) AND s.expires_at>? AND s.deleted=0 AND c.deleted=0 AND s.content IS NOT NULL ORDER BY s.seq LIMIT ?`,
    run.after_seq,
    run.snapshot_seq,
    run.from_at,
    run.to_at,
    now(),
    limit + 1,
  ).all<ReviewItem>();
  const coverageTime = now();
  const unavailableRows = (await sql(
    db,
    `SELECT COUNT(*) n,
      COALESCE(SUM(CASE WHEN s.expires_at<=? THEN 1 ELSE 0 END),0) expired,
      COALESCE(SUM(CASE WHEN s.expires_at>? AND s.content IS NULL AND m.kind='unsupported_media' THEN 1 ELSE 0 END),0) unsupported_format,
      COALESCE(SUM(CASE WHEN s.expires_at>? AND s.content IS NULL AND (m.kind IS NULL OR m.kind!='unsupported_media') THEN 1 ELSE 0 END),0) missing_text
      FROM sources s JOIN contacts c ON c.id=s.contact_id LEFT JOIN messages m ON m.source_id=s.id
      WHERE s.seq<=? AND ((s.received_at>=? AND s.received_at<?) OR (s.version>1 AND s.version>s.reviewed_version)) AND c.deleted=0 AND s.deleted=0 AND (s.expires_at<=? OR s.content IS NULL)`,
    coverageTime,
    coverageTime,
    coverageTime,
    run.snapshot_seq,
    run.from_at,
    run.to_at,
    coverageTime,
  ).first<{
    n: number;
    expired: number;
    unsupported_format: number;
    missing_text: number;
  }>())!;
  const unavailable = unavailableRows.n;
  const items = result.results.slice(0, limit),
    availableDone = result.results.length <= limit,
    complete = availableDone && unavailable === 0,
    after = items.at(-1)?.seq ?? run.after_seq,
    token = id("page");
  const pageCommit = await db.batch([
    sql(
      db,
      `UPDATE review_runs SET after_seq=?,last_page_token=?,state=? WHERE id=? AND after_seq=? AND last_page_token IS ? AND state IN ('reading','ready')`,
      after,
      token,
      availableDone ? (unavailable ? "unavailable" : "ready") : "reading",
      run.id,
      run.after_seq,
      run.last_page_token,
    ),
    ...items.map((item) =>
      sql(
        db,
        `INSERT INTO review_items(run_id,source_id,version) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM review_runs WHERE id=? AND last_page_token=? AND state IN ('reading','ready','unavailable')) ON CONFLICT(run_id,source_id) DO UPDATE SET version=MAX(version,excluded.version)`,
        run.id,
        item.source_id,
        item.source_version,
        run.id,
        token,
      ),
    ),
    sql(
      db,
      `UPDATE review_runs AS r SET state='unavailable' WHERE id=? AND last_page_token=? AND state='ready' AND EXISTS(SELECT 1 ${unseenReviewSources})`,
      run.id,
      token,
    ),
  ]);
  if (!pageCommit[0].meta.changes)
    throw new SafeError("pagina_invalida_ou_concorrente", 409);
  const progress = (await sql(
    db,
    `SELECT (SELECT COUNT(*) FROM review_items ri JOIN sources s ON s.id=ri.source_id WHERE ri.run_id=r.id AND s.deleted=0 AND s.version>ri.version) changed,
      (SELECT COUNT(*) ${unseenReviewSources}) unseen,
      (SELECT COUNT(*) ${unseenReviewSources} AND s.content IS NOT NULL AND s.expires_at>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)) readable
      FROM review_runs r WHERE r.id=?`,
    run.id,
  ).first<{ changed: number; unseen: number; readable: number }>())!;
  const changed = progress.changed;
  const covered = complete && progress.unseen === 0;
  return {
    run_id: run.id,
    page_token: token,
    items: items.map(({ seq, ...x }) => x),
    next_cursor: availableDone ? null : token,
    coverage: {
      unavailable_count: unavailable,
      unavailable_reasons: {
        expired: unavailableRows.expired,
        unsupported_format: unavailableRows.unsupported_format,
        missing_text: unavailableRows.missing_text,
      },
      newer_versions_pending: changed,
      current_versions_complete: covered && changed === 0,
      available_complete: availableDone && progress.readable === 0,
      unseen_sources_pending: availableDone ? progress.unseen : 0,
      day: run.day,
      timezone: run.timezone,
      from: run.from_at,
      to: run.to_at,
      basis: "received_at_or_unreviewed_edit",
      snapshot_seq: run.snapshot_seq,
      through_seq: after,
      complete: covered,
      external_completeness: "unknown",
      message:
        "Cobertura das versões mostradas na base capturada; inclui edições pendentes de outros dias e preserva datas originais. Se unseen_sources_pending>0, há fontes não mostradas, inclusive indisponíveis; uma nova revisão só poderá avaliá-las se estiverem legíveis",
    },
  };
}
export async function reviewComplete(db: D1Database, input: unknown) {
  const p = parse(reviewCompleteSchema, input);
  const result = await db.batch([
    sql(
      db,
      `UPDATE review_runs AS r SET state='complete' WHERE id=? AND last_page_token=? AND state='ready' AND NOT EXISTS(SELECT 1 ${unseenReviewSources})`,
      p.run_id,
      p.page_token,
    ),
    sql(
      db,
      `UPDATE sources SET reviewed_version=MAX(reviewed_version,(SELECT ri.version FROM review_items ri WHERE ri.run_id=? AND ri.source_id=sources.id)) WHERE id IN (SELECT source_id FROM review_items WHERE run_id=?) AND deleted=0 AND EXISTS(SELECT 1 FROM review_runs WHERE id=? AND last_page_token=? AND state='complete')`,
      p.run_id,
      p.run_id,
      p.run_id,
      p.page_token,
    ),
  ]);
  if (!result[0].meta.changes)
    throw new SafeError("revisao_incompleta_ou_token_invalido", 409);
  const changed = (await sql(
    db,
    "SELECT COUNT(*) n FROM review_items ri JOIN sources s ON s.id=ri.source_id WHERE ri.run_id=? AND s.deleted=0 AND s.version>ri.version",
    p.run_id,
  ).first<{ n: number }>())!.n;
  return {
    complete: true,
    scope: "displayed_versions",
    newer_versions_pending: changed,
    current_versions_complete: changed === 0,
  };
}
export async function expire(db: D1Database) {
  const t = now();
  const result = await sql(
    db,
    "UPDATE sources SET content=NULL,extract_state='done',lease=NULL,lease_until=NULL WHERE (expires_at<=? OR occurred_at<=? OR deleted=1 OR contact_id IN (SELECT id FROM contacts WHERE deleted=1)) AND (content IS NOT NULL OR extract_state!='done' OR lease IS NOT NULL)",
    t,
    t - 30 * DAY,
  ).run();
  return { expired: result.meta.changes };
}
export type MemoryToolDefinition = readonly [
  name: string,
  description: string,
  schema: z.ZodType,
  call: (input: unknown) => Promise<unknown>,
  read: boolean,
];
export function toolDefinitions(
  db: D1Database,
  timezone = "America/Fortaleza",
): MemoryToolDefinition[] {
  return [
    [
      "source_import",
      "Importa reunião/anotações por chave estável. Com extraction aplica fatos/tarefas uma vez em lote atômico pela Skill; sem extraction processa no backend. Replay preserva o produtor original. Texto pode conter dados pessoais.",
      importSourceSchema,
      (p) => importSource(db, p),
      false,
    ],
    [
      "memory_write",
      "Registra fato conciso sustentado por fonte: explícito novo confirma; dúvidas e conflitos ficam pendentes.",
      memoryCandidateSchema,
      (p) => writeMemory(db, p),
      false,
    ],
    [
      "memory_get",
      "Consulta memória paginada com origem, datas, revisão e disponibilidade da fonte; mostra interações distintas.",
      memoryQuerySchema,
      (p) => getMemory(db, p),
      true,
    ],
    [
      "memory_review",
      "Confirma, corrige ou descarta uma informação a avaliar. Correção preserva o registro anterior.",
      memoryReviewSchema,
      (p) => reviewMemory(db, p),
      false,
    ],
    [
      "task_write",
      "Registra pendência idempotente sustentada por fonte; data relativa ambígua deve ficar sem due_date e com date_note.",
      taskSchema,
      (p) => writeTask(db, p),
      false,
    ],
    [
      "tasks_get",
      "Consulta tarefas por contato e estado com cursor, inclusive retornos futuros e fonte expirada.",
      taskQuerySchema,
      (p) => getTasks(db, p),
      true,
    ],
    [
      "task_review",
      "Conclui, reabre, descarta ou ajusta prazo de uma tarefa. Independente de envio e revisão de mensagens.",
      taskReviewSchema,
      (p) => reviewTask(db, p),
      false,
    ],
    [
      "date_write",
      "Registra aniversário/data opcional. 29/02 exige regra explícita; ano de nascimento não é necessário.",
      dateSchema,
      (p) => writeDate(db, p),
      false,
    ],
    [
      "interaction_record",
      "Registra reunião ou contato relevante explícito; mensagem genérica não conclui reunião nem tarefa.",
      interactionSchema,
      (p) => recordInteraction(db, p),
      false,
    ],
    [
      "attention_get",
      "Lista prazos, pendências de avaliação, datas e cadência; cobertura limitada exige revisão, sem garantia de urgência.",
      attentionSchema,
      (p) => attention(db, { timezone, ...parse(attentionSchema, p) }),
      true,
    ],
    [
      "review_page",
      "Revisa fontes do dia local de ingresso e edições ainda pendentes, mesmo de outro dia; preserva data original, tipo e direção (in=contato, out=consultor; null para reunião/nota). Não atribua falas do consultor ao contato. Avança somente usando o token persistido da página anterior. unavailable_reasons separa expired, unsupported_format (registro sem representação textual utilizável; subtipo desconhecido) e missing_text. Não prometa recuperação nem conclusão com lacunas.",
      reviewPageSchema,
      (p) => reviewPage(db, { timezone, ...parse(reviewPageSchema, p) }),
      false,
    ],
    [
      "review_complete",
      "Marca somente as versões mostradas como avaliadas após a última página e seu token; edição posterior continua pendente. Não conclui tarefa nem envia mensagem.",
      reviewCompleteSchema,
      (p) => reviewComplete(db, p),
      false,
    ],
  ];
}
