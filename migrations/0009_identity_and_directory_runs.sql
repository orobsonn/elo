-- Exact provider evidence only. Neither names nor inferred phone conversions are keys.
CREATE TABLE contact_identity_pairs (
  connection_generation INTEGER NOT NULL,
  phone TEXT NOT NULL,
  lid TEXT NOT NULL,
  proof_key TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  PRIMARY KEY(connection_generation,phone),
  UNIQUE(connection_generation,lid)
);
ALTER TABLE directory_state ADD COLUMN run_id TEXT;
ALTER TABLE directory_state ADD COLUMN next_page INTEGER;
ALTER TABLE directory_state ADD COLUMN data_generation INTEGER;
ALTER TABLE actions ADD COLUMN request_fingerprint TEXT;
CREATE UNIQUE INDEX actions_open_request ON actions(request_fingerprint) WHERE status IN ('awaiting_approval','executing','uncertain');
ALTER TABLE contacts ADD COLUMN alias_origin TEXT NOT NULL DEFAULT 'manual';
UPDATE contacts SET alias_origin='system' WHERE alias IN ('Contato provisório','Contato da agenda');
CREATE TABLE identity_observations (
  proof_key TEXT PRIMARY KEY,
  address_key TEXT NOT NULL,
  other_key TEXT,
  observed_at INTEGER NOT NULL
);

-- Legacy hashes covered text only. Revoke pending proposals during upgrade.
-- Executing/uncertain attempts retain their original state and cannot be resent.
INSERT INTO action_events(action_id,state,at) SELECT id,'cancelled',unixepoch()*1000 FROM actions WHERE status IN ('prepared','awaiting_approval','authorized');
UPDATE actions SET status='cancelled' WHERE status IN ('prepared','awaiting_approval','authorized');
