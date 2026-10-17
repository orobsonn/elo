-- Review markers track versions actually returned to a reader, not a sequence watermark.
ALTER TABLE sources ADD COLUMN reviewed_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE review_items (
  run_id TEXT NOT NULL REFERENCES review_runs(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  PRIMARY KEY(run_id, source_id)
);
CREATE INDEX sources_unreviewed ON sources(seq) WHERE version > reviewed_version;
