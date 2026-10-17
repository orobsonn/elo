-- Old material moved to another identity never auto-confirms itself again.
ALTER TABLE sources ADD COLUMN identity_review_required INTEGER NOT NULL DEFAULT 0;
