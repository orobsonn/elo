-- Authenticated directory evidence survives partial repairs/page rollback without
-- retaining raw addresses. These markers suppress imports; they never merge cards.
CREATE TABLE directory_identity_fingerprints (
  connection_generation INTEGER NOT NULL,
  phone_fp TEXT NOT NULL,
  lid_fp TEXT NOT NULL,
  PRIMARY KEY(connection_generation,phone_fp),
  UNIQUE(connection_generation,lid_fp)
);
-- Connection changes invalidate provider evidence. Restore's data-generation
-- bump only invalidates work/authorizations; proof present in the backup survives.
CREATE TRIGGER directory_identity_fingerprints_reset
AFTER UPDATE OF connection_generation ON settings
WHEN OLD.connection_generation != NEW.connection_generation
BEGIN
  DELETE FROM directory_identity_fingerprints;
END;
