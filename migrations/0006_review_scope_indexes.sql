-- Review coverage uses indexed time windows and pending edits to reduce historical scans.
CREATE INDEX sources_received_review ON sources(received_at,seq);
CREATE INDEX sources_pending_edits ON sources(seq) WHERE version>1 AND version>reviewed_version;
