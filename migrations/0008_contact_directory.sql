CREATE TABLE contact_directory (contact_id TEXT PRIMARY KEY REFERENCES contacts(id), search_name TEXT NOT NULL, connection_generation INTEGER NOT NULL, synced_at INTEGER NOT NULL);
CREATE TABLE forgotten_addresses (fingerprint TEXT PRIMARY KEY, forgotten_at INTEGER NOT NULL);
CREATE TABLE directory_usage (day TEXT PRIMARY KEY, calls INTEGER NOT NULL DEFAULT 0);
CREATE TABLE directory_state (id INTEGER PRIMARY KEY CHECK(id=1), completed_at INTEGER, connection_generation INTEGER);
INSERT INTO directory_state(id) VALUES(1);
