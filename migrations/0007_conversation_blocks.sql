ALTER TABLE sources ADD COLUMN extraction_batch_limit INTEGER NOT NULL DEFAULT 20 CHECK(extraction_batch_limit BETWEEN 1 AND 20);
CREATE INDEX sources_extraction_queue ON sources(seq) WHERE extraction_owner='backend' AND deleted=0 AND content IS NOT NULL AND attempts<3 AND extract_state IN ('pending','processing');
CREATE INDEX sources_extraction_contact ON sources(contact_id,seq) WHERE extraction_owner='backend' AND deleted=0 AND content IS NOT NULL AND attempts<3 AND extract_state IN ('pending','processing');
ALTER TABLE memory ADD COLUMN context_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN source_version INTEGER;
ALTER TABLE tasks ADD COLUMN needs_review INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN context_revision INTEGER NOT NULL DEFAULT 0;
CREATE TABLE source_dependencies (
 source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
 source_version INTEGER NOT NULL,
 context_source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
 context_source_version INTEGER NOT NULL,
 PRIMARY KEY(source_id,source_version,context_source_id,context_source_version)
);
CREATE INDEX source_dependencies_reverse ON source_dependencies(context_source_id);
CREATE INDEX memory_source_version ON memory(source_id,source_version);
CREATE INDEX tasks_source_version ON tasks(source_id,source_version);
CREATE TRIGGER source_context_edited AFTER UPDATE OF version,deleted ON sources WHEN NEW.version!=OLD.version OR NEW.deleted!=OLD.deleted
BEGIN
 UPDATE memory SET needs_review=1,context_revision=context_revision+1 WHERE id IN (SELECT m.id FROM source_dependencies d JOIN memory m ON m.source_id=d.source_id AND m.source_version=d.source_version WHERE d.context_source_id=NEW.id AND (d.context_source_version!=NEW.version OR NEW.deleted=1));
 UPDATE tasks SET needs_review=1,context_revision=context_revision+1 WHERE id IN (SELECT id FROM tasks WHERE source_id=NEW.id UNION SELECT t.id FROM source_dependencies d JOIN tasks t ON t.source_id=d.source_id AND t.source_version=d.source_version WHERE d.context_source_id=NEW.id AND (d.context_source_version!=NEW.version OR NEW.deleted=1));
END;
CREATE TRIGGER source_context_removed BEFORE DELETE ON sources
BEGIN
 UPDATE memory SET needs_review=1,context_revision=context_revision+1 WHERE id IN (SELECT m.id FROM source_dependencies d JOIN memory m ON m.source_id=d.source_id AND m.source_version=d.source_version WHERE d.context_source_id=OLD.id);
 UPDATE tasks SET needs_review=1,context_revision=context_revision+1 WHERE id IN (SELECT id FROM tasks WHERE source_id=OLD.id UNION SELECT t.id FROM source_dependencies d JOIN tasks t ON t.source_id=d.source_id AND t.source_version=d.source_version WHERE d.context_source_id=OLD.id);
END;
