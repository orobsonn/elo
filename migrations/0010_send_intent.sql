-- Explicit prepare intent distinguishes an owner send request from a requested preview.
-- Existing attempts retain the stricter mode; no pending legacy authorization survives.
ALTER TABLE actions ADD COLUMN review_required INTEGER NOT NULL DEFAULT 1 CHECK(review_required IN (0,1));
INSERT INTO action_events(action_id,state,at) SELECT id,'cancelled',unixepoch()*1000 FROM actions WHERE status IN ('prepared','awaiting_approval','authorized');
UPDATE actions SET status='cancelled' WHERE status IN ('prepared','awaiting_approval','authorized');
DROP INDEX actions_open_request;
CREATE UNIQUE INDEX actions_open_request ON actions(request_fingerprint) WHERE status IN ('prepared','awaiting_approval','executing','uncertain');
