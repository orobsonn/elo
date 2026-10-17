import { z } from "zod";
import { id, now, SafeError, sql } from "./core";
import { parse } from "./memory";

const contactId = z.string().regex(/^ct_[a-f0-9]{32}$/);
export const associateContactSchema = z
  .object({
    provisional_id: contactId,
    target_id: contactId,
    confirm: z.literal("associar_contatos_selecionados"),
  })
  .strict();

type Contact = {
  id: string;
  alias: string;
  relationship: string;
  address: string | null;
  address_version: number;
  generation: number;
  deleted: number;
  cadence_days: number | null;
  snooze_until: string | null;
};

// Dates are not automatically reconciled, even when their values happen to match.
// Both originals remain available for the owner to resolve before association.
const dateConflict = `EXISTS(SELECT 1 FROM special_dates a JOIN special_dates b ON a.relation=b.relation AND a.label=b.label WHERE a.contact_id=s.id AND b.contact_id=d.id)`;
const preferenceConflict = `(s.cadence_days IS NOT NULL AND d.cadence_days IS NOT NULL AND s.cadence_days!=d.cadence_days) OR (s.snooze_until IS NOT NULL AND d.snooze_until IS NOT NULL AND s.snooze_until!=d.snooze_until)`;
const inflight = `EXISTS(SELECT 1 FROM actions a WHERE a.contact_id IN (s.id,d.id) AND a.status IN ('executing','uncertain'))`;

export async function associateContact(db: D1Database, input: unknown) {
  const p = parse(associateContactSchema, input);
  if (p.provisional_id === p.target_id)
    throw new SafeError("associacao_invalida");
  const contacts = (
    await sql(
      db,
      "SELECT * FROM contacts WHERE id IN (?,?)",
      p.provisional_id,
      p.target_id,
    ).all<Contact>()
  ).results;
  const s = contacts.find((c) => c.id === p.provisional_id),
    d = contacts.find((c) => c.id === p.target_id);
  if (
    !s ||
    !d ||
    s.deleted ||
    d.deleted ||
    s.relationship !== "provisional" ||
    !s.address ||
    d.address
  )
    throw new SafeError("associacao_indisponivel_ou_alterada", 409);
  const conditions = await sql(
    db,
    `SELECT ${inflight} inflight, (${dateConflict} OR (${preferenceConflict})) conflict, x.data_generation FROM contacts s CROSS JOIN contacts d CROSS JOIN settings x WHERE s.id=? AND d.id=? AND x.id=1`,
    s.id,
    d.id,
  ).first<{ inflight: number; conflict: number; data_generation: number }>();
  if (!conditions)
    throw new SafeError("associacao_indisponivel_ou_alterada", 409);
  if (conditions.inflight)
    throw new SafeError("associacao_envio_em_andamento_ou_incerto", 409);
  if (conditions.conflict)
    throw new SafeError("associacao_conflito_datas_ou_cadencia", 409);

  const marker = id("link"),
    t = now(),
    claimed = "EXISTS(SELECT 1 FROM contact_associations WHERE id=?)";
  // D1 batch is a transaction. Its first statement is the only claim; every write
  // is fenced by that random marker, so a stale preflight cannot partially move data.
  const result = await db.batch([
    sql(
      db,
      `INSERT INTO contact_associations(id,provisional_id,target_id,provisional_generation,target_generation,associated_at)
      SELECT ?,s.id,d.id,s.generation,d.generation,? FROM contacts s CROSS JOIN contacts d CROSS JOIN settings x
      WHERE s.id=? AND d.id=? AND x.id=1 AND s.deleted=0 AND d.deleted=0
      AND s.relationship='provisional' AND s.address=? AND d.address IS NULL
      AND s.generation=? AND d.generation=? AND s.address_version=? AND d.address_version=? AND s.cadence_days IS ? AND s.snooze_until IS ? AND d.alias=? AND x.data_generation=?
      AND NOT ${inflight} AND NOT ${dateConflict} AND NOT (${preferenceConflict})
      AND NOT EXISTS(SELECT 1 FROM contact_associations old WHERE old.provisional_id=s.id OR old.target_id=s.id)`,
      marker,
      t,
      s.id,
      d.id,
      s.address,
      s.generation,
      d.generation,
      s.address_version,
      d.address_version,
      s.cadence_days,
      s.snooze_until,
      d.alias,
      conditions.data_generation,
    ),
    // Free the UNIQUE address before attaching it to the selected destination.
    sql(
      db,
      `UPDATE contacts SET address=NULL,address_version=address_version+1,generation=generation+1,deleted=1,cadence_days=NULL,snooze_until=NULL WHERE id=? AND ${claimed}`,
      s.id,
      marker,
    ),
    sql(
      db,
      `UPDATE contacts SET address=?,address_version=address_version+1,generation=generation+1,cadence_days=COALESCE(cadence_days,?),snooze_until=COALESCE(snooze_until,?) WHERE id=? AND ${claimed}`,
      s.address,
      s.cadence_days,
      s.snooze_until,
      d.id,
      marker,
    ),
    sql(
      db,
      `UPDATE memory SET contact_id=?,state=CASE WHEN state IN ('confirmed','supporting','pending') THEN 'pending' ELSE state END,needs_review=CASE WHEN state IN ('confirmed','supporting','pending') THEN 1 ELSE needs_review END,confirmed_at=CASE WHEN state IN ('confirmed','supporting','pending') THEN NULL ELSE confirmed_at END,reason=CASE WHEN state IN ('confirmed','supporting','pending') THEN 'Associação manual: revisar. ' || reason ELSE reason END WHERE contact_id=? AND ${claimed}`,
      d.id,
      s.id,
      marker,
    ),
    ...["tasks", "special_dates", "interactions", "messages"].map((table) =>
      sql(
        db,
        `UPDATE ${table} SET contact_id=? WHERE contact_id=? AND ${claimed}`,
        d.id,
        s.id,
        marker,
      ),
    ),
    sql(
      db,
      `UPDATE sources SET contact_id=?,version=version+1,reviewed_version=0,identity_review_required=1,extract_state=CASE WHEN extract_state='processing' THEN 'pending' ELSE extract_state END,lease=NULL,lease_until=NULL WHERE contact_id=? AND ${claimed}`,
      d.id,
      s.id,
      marker,
    ),
    sql(
      db,
      `UPDATE actions SET contact_id=CASE WHEN contact_id=? THEN ? ELSE contact_id END,status=CASE WHEN status IN ('prepared','awaiting_approval','authorized') THEN 'cancelled' ELSE status END WHERE contact_id IN (?,?) AND ${claimed}`,
      s.id,
      d.id,
      s.id,
      d.id,
      marker,
    ),
  ]);
  if (!result[0].meta.changes)
    throw new SafeError("associacao_indisponivel_ou_alterada", 409);
  return {
    associated: true,
    contact_id: d.id,
    alias: d.alias,
    memory_review_required: true,
  };
}
