-- One bounded receipt for the active directory run. Old cursors must restart.
ALTER TABLE directory_state ADD COLUMN step INTEGER NOT NULL DEFAULT 0;
ALTER TABLE directory_state ADD COLUMN last_step INTEGER;
ALTER TABLE directory_state ADD COLUMN last_result TEXT;
ALTER TABLE directory_state ADD COLUMN epoch TEXT;
UPDATE directory_state SET completed_at=NULL,run_id=NULL,next_page=NULL;
-- Reconciliation must touch the affected identity, not unrelated history.
CREATE INDEX contacts_pending_lid ON contacts(address) WHERE deleted=0 AND address GLOB '*@lid';
CREATE INDEX actions_contact_state ON actions(contact_id,status);
CREATE INDEX tasks_contact ON tasks(contact_id);
