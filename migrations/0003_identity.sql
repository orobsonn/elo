-- Minimal audit and transaction marker. Provider addresses never enter this table.
CREATE TABLE contact_associations (
  id TEXT PRIMARY KEY,
  provisional_id TEXT NOT NULL UNIQUE REFERENCES contacts(id),
  target_id TEXT NOT NULL REFERENCES contacts(id),
  provisional_generation INTEGER NOT NULL,
  target_generation INTEGER NOT NULL,
  associated_at INTEGER NOT NULL,
  CHECK(provisional_id != target_id)
);
CREATE INDEX contact_associations_target ON contact_associations(target_id);
