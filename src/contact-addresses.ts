import { SafeError, addressFingerprint, hash, id, now, sql } from "./core";

export const isPhone = (s: string) => /^\d{8,16}$/.test(s);
export const isLid = (s: string) => /^\d{8,20}@lid$/.test(s);
type Pair = { phone: string; lid: string };
type Card = {
  id: string;
  address: string;
  generation: number;
  alias: string;
  address_version: number;
};

// Only backend code calls this with an authenticated provider observation.
// MCP never accepts phone, LID, or proof as user-controlled parameters.
export async function resolveAddress(
  db: D1Database,
  address: string,
  generation: number,
) {
  const pair = await sql(
    db,
    "SELECT phone,lid FROM contact_identity_pairs WHERE connection_generation=? AND (phone=? OR lid=?)",
    generation,
    address,
    address,
  ).first<Pair>();
  const addresses = pair ? [pair.phone, pair.lid] : [address, address];
  const cards = (
    await sql(
      db,
      "SELECT id,address,generation,alias,address_version FROM contacts WHERE deleted=0 AND address IN (?,?)",
      ...addresses,
    ).all<Card>()
  ).results;
  if (cards.length > 1)
    throw new SafeError("identidade_conflitante_requer_revisao", 409);
  const card = cards[0];
  const pairCondition = pair
    ? "EXISTS(SELECT 1 FROM contact_identity_pairs WHERE connection_generation=? AND phone=? AND lid=?)"
    : "NOT EXISTS(SELECT 1 FROM contact_identity_pairs WHERE connection_generation=? AND (phone=? OR lid=?))";
  const args: (string | number | null)[] = [
    generation,
    pair?.phone ?? address,
    pair?.lid ?? address,
  ];
  let cardCondition = "1";
  if (card) {
    cardCondition =
      "EXISTS(SELECT 1 FROM contacts WHERE id=? AND address=? AND generation=? AND address_version=? AND deleted=0)";
    args.push(card.id, card.address, card.generation, card.address_version);
  }
  const guard = sql(
    db,
    `SELECT json(CASE WHEN ${pairCondition} AND ${cardCondition} THEN 'true' ELSE 'identity changed' END)`,
    ...args,
  );
  return { address: card?.address ?? pair?.phone ?? address, pair, guard };
}

export async function observePair(
  db: D1Database,
  phone: string,
  lid: string,
  generation: number,
  proof: string,
  encryptionKey?: string,
  directoryGuard?: D1PreparedStatement,
) {
  if (!isPhone(phone) || !isLid(lid))
    throw new SafeError("endereco_do_evento_invalido");
  const previous = (
    await sql(
      db,
      "SELECT phone,lid FROM contact_identity_pairs WHERE connection_generation=? AND (phone=? OR lid=?)",
      generation,
      phone,
      lid,
    ).all<Pair>()
  ).results;
  if (previous.some((p) => p.phone !== phone || p.lid !== lid))
    throw new SafeError("identidade_conflitante_requer_revisao", 409);
  const fingerprints = encryptionKey
    ? await Promise.all(
        [phone, lid].map((x) => addressFingerprint(x, encryptionKey)),
      )
    : [];
  if (
    fingerprints.length &&
    (await sql(
      db,
      "SELECT 1 FROM forgotten_addresses WHERE fingerprint IN (?,?)",
      ...fingerprints,
    ).first())
  )
    return { forgotten: true };
  const cards = (
    await sql(
      db,
      "SELECT id,address,generation,alias,address_version FROM contacts WHERE deleted=0 AND address IN (?,?) ORDER BY (relationship!='provisional') DESC,(SELECT count(*) FROM contact_associations WHERE target_id=contacts.id) DESC,(SELECT count(*) FROM sources WHERE contact_id=contacts.id) DESC,created_at,id",
      phone,
      lid,
    ).all<Card>()
  ).results;
  const target = cards[0];
  const source =
    cards.length === 2 ? cards.find((c) => c.id !== target!.id) : undefined;
  const settings = await sql(
    db,
    "SELECT data_generation FROM settings WHERE id=1",
  ).first<{ data_generation: number }>();
  const statements: D1PreparedStatement[] = [
    ...(directoryGuard ? [directoryGuard] : []),
    sql(
      db,
      "SELECT json(CASE WHEN EXISTS(SELECT 1 FROM settings WHERE id=1 AND (connection_generation=0 OR connection_generation=?) AND data_generation=?) THEN 'true' ELSE 'identity changed' END)",
      generation,
      settings!.data_generation,
    ),
  ];
  statements.push(
    ...(await observationStatements(db, proof, [phone, lid], generation)),
  );
  if (fingerprints.length)
    statements.push(
      sql(
        db,
        `SELECT json(CASE WHEN
          NOT EXISTS(SELECT 1 FROM directory_identity_fingerprints WHERE connection_generation=? AND phone_fp=? AND lid_fp!=?)
          AND NOT EXISTS(SELECT 1 FROM directory_identity_fingerprints WHERE connection_generation=? AND lid_fp=? AND phone_fp!=?)
        THEN 'true' ELSE 'identity conflict' END)`,
        generation,
        fingerprints[0],
        fingerprints[1],
        generation,
        fingerprints[1],
        fingerprints[0],
      ),
      sql(
        db,
        "SELECT json(CASE WHEN NOT EXISTS(SELECT 1 FROM forgotten_addresses WHERE fingerprint IN (?,?)) THEN 'true' ELSE 'forgotten identity' END)",
        ...fingerprints,
      ),
    );
  // Reject stale preflight, including a concurrent insert, deletion, association or alias edit.
  statements.push(
    sql(
      db,
      "SELECT json(CASE WHEN (SELECT count(*) FROM contacts WHERE deleted=0 AND address IN (?,?))=? THEN 'true' ELSE 'identity changed' END)",
      phone,
      lid,
      cards.length,
    ),
  );
  for (const c of cards)
    statements.push(
      sql(
        db,
        "SELECT json(CASE WHEN EXISTS(SELECT 1 FROM contacts WHERE id=? AND address=? AND generation=? AND address_version=? AND alias=? AND deleted=0) THEN 'true' ELSE 'identity changed' END)",
        c.id,
        c.address,
        c.generation,
        c.address_version,
        c.alias,
      ),
    );
  // INSERT, rather than REPLACE, makes conflicting concurrent evidence roll back.
  statements.push(
    sql(
      db,
      "INSERT INTO contact_identity_pairs(connection_generation,phone,lid,proof_key,observed_at) VALUES(?,?,?,?,?) ON CONFLICT(connection_generation,phone) DO UPDATE SET observed_at=MAX(observed_at,excluded.observed_at) WHERE lid=excluded.lid",
      generation,
      phone,
      lid,
      proof,
      now(),
    ),
  );
  statements.push(
    sql(
      db,
      "SELECT json(CASE WHEN EXISTS(SELECT 1 FROM contact_identity_pairs WHERE connection_generation=? AND phone=? AND lid=?) THEN 'true' ELSE 'identity conflict' END)",
      generation,
      phone,
      lid,
    ),
  );
  if (!previous.length && !source) {
    statements.push(
      sql(
        db,
        "UPDATE contacts SET generation=generation+1,address_version=address_version+1 WHERE address IN (?,?) AND deleted=0",
        phone,
        lid,
      ),
    );
    statements.push(
      sql(
        db,
        "UPDATE actions SET status='cancelled' WHERE contact_id IN (SELECT id FROM contacts WHERE address IN (?,?)) AND status IN ('prepared','awaiting_approval','authorized')",
        phone,
        lid,
      ),
    );
  }
  if (source && target) {
    // Reconciliation is evidence-based, but only technical provisional duplicates may be retired.
    statements.push(
      sql(
        db,
        `SELECT json(CASE WHEN
      NOT EXISTS(SELECT 1 FROM actions WHERE contact_id IN (?,?) AND status IN ('executing','uncertain'))
      AND EXISTS(SELECT 1 FROM contacts s,contacts d WHERE s.id=? AND d.id=?
        AND s.relationship='provisional' AND NOT EXISTS(SELECT 1 FROM contact_associations WHERE target_id=s.id)
        AND (s.alias_origin!='manual' OR s.alias=d.alias)
        AND NOT (s.cadence_days IS NOT NULL AND d.cadence_days IS NOT NULL AND s.cadence_days!=d.cadence_days)
        AND NOT (s.snooze_until IS NOT NULL AND d.snooze_until IS NOT NULL AND s.snooze_until!=d.snooze_until))
      AND NOT EXISTS(SELECT 1 FROM special_dates a JOIN special_dates b ON a.relation=b.relation AND a.label=b.label WHERE a.contact_id=? AND b.contact_id=?)
      THEN 'true' ELSE 'identity needs review' END)`,
        source.id,
        target.id,
        source.id,
        target.id,
        source.id,
        target.id,
      ),
    );
    const marker = id("link");
    statements.push(
      sql(
        db,
        "INSERT INTO contact_associations VALUES(?,?,?,?,?,?)",
        marker,
        source.id,
        target.id,
        source.generation,
        target.generation,
        now(),
      ),
    );
    statements.push(
      sql(
        db,
        "UPDATE contacts SET deleted=1,address=NULL,generation=generation+1,address_version=address_version+1 WHERE id=?",
        source.id,
      ),
    );
    statements.push(
      sql(
        db,
        "UPDATE contacts SET generation=generation+1,address_version=address_version+1,cadence_days=COALESCE(cadence_days,(SELECT cadence_days FROM contacts WHERE id=?)),snooze_until=COALESCE(snooze_until,(SELECT snooze_until FROM contacts WHERE id=?)) WHERE id=?",
        source.id,
        source.id,
        target.id,
      ),
    );
    for (const table of ["messages", "tasks", "special_dates", "interactions"])
      statements.push(
        sql(
          db,
          `UPDATE ${table} SET contact_id=? WHERE contact_id=?`,
          target.id,
          source.id,
        ),
      );
    statements.push(
      sql(
        db,
        "UPDATE memory SET contact_id=?,state=CASE WHEN state IN ('confirmed','supporting') THEN 'pending' ELSE state END,needs_review=1,confirmed_at=NULL WHERE contact_id=?",
        target.id,
        source.id,
      ),
    );
    statements.push(
      sql(
        db,
        "UPDATE sources SET contact_id=?,version=version+1,reviewed_version=0,identity_review_required=1,extract_state=CASE WHEN extract_state='processing' THEN 'pending' ELSE extract_state END,lease=NULL,lease_until=NULL WHERE contact_id=?",
        target.id,
        source.id,
      ),
    );
    statements.push(
      sql(
        db,
        "UPDATE actions SET contact_id=CASE WHEN contact_id=? THEN ? ELSE contact_id END,status=CASE WHEN status IN ('prepared','awaiting_approval','authorized') THEN 'cancelled' ELSE status END WHERE contact_id IN (?,?)",
        source.id,
        target.id,
        source.id,
        target.id,
      ),
    );
    statements.push(
      sql(
        db,
        "INSERT OR IGNORE INTO contact_directory(contact_id,search_name,connection_generation,synced_at) SELECT ?,search_name,connection_generation,synced_at FROM contact_directory WHERE contact_id=?",
        target.id,
        source.id,
      ),
    );
    statements.push(
      sql(db, "DELETE FROM contact_directory WHERE contact_id=?", source.id),
    );
  }
  try {
    await db.batch(statements);
  } catch {
    throw new SafeError(
      "identidade_conflitante_ou_alterada_requer_revisao",
      409,
    );
  }
  return { forgotten: false };
}

// Reserve the message proof even when its first callback exposes only one alias.
// This prevents a concurrent conflicting callback from learning an unrelated pair.
export async function observationStatements(
  db: D1Database,
  proof: string,
  addresses: string[],
  generation: number,
) {
  const keys = await Promise.all(
    addresses.map((a) => hash(JSON.stringify([generation, a]))),
  );
  const first = keys[0],
    second = keys[1] ?? first;
  const statements = [
    sql(
      db,
      "INSERT OR IGNORE INTO identity_observations(proof_key,address_key,other_key,observed_at) VALUES(?,?,?,?)",
      proof,
      first,
      keys[1] ?? null,
      now(),
    ),
    sql(
      db,
      "SELECT json(CASE WHEN EXISTS(SELECT 1 FROM identity_observations WHERE proof_key=? AND (address_key IN (?,?) OR other_key IN (?,?))) THEN 'true' ELSE 'proof conflict' END)",
      proof,
      first,
      second,
      first,
      second,
    ),
  ];
  if (keys.length === 2)
    statements.push(
      sql(
        db,
        "UPDATE identity_observations SET address_key=?,other_key=? WHERE proof_key=?",
        first,
        second,
        proof,
      ),
    );
  return statements;
}
