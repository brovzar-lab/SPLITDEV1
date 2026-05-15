ALTER TABLE screenplay ADD COLUMN triage_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE screenplay ADD COLUMN triage_error TEXT;
