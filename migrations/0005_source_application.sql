ALTER TABLE sources ADD COLUMN extraction_owner TEXT NOT NULL DEFAULT 'backend' CHECK(extraction_owner IN ('backend','skill'));
ALTER TABLE sources ADD COLUMN skill_applied INTEGER NOT NULL DEFAULT 0 CHECK(skill_applied IN (0,1));
