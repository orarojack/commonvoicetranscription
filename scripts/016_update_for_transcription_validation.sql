-- =============================================
-- MIGRATION: Update Schema for Transcription Validation Workflow
-- =============================================
-- This migration updates the database schema to support:
-- 1. Tracking original transcriptions before edits
-- 2. Recording whether transcriptions were edited
-- 3. Removing rejection workflow (Pass or Edited only)
-- =============================================

-- Add new columns to recordings table
ALTER TABLE recordings 
ADD COLUMN IF NOT EXISTS original_sentence TEXT,
ADD COLUMN IF NOT EXISTS transcription_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- Update existing recordings to have original_sentence = sentence
UPDATE recordings 
SET original_sentence = sentence 
WHERE original_sentence IS NULL;

-- Drop old constraint on status (includes 'rejected')
ALTER TABLE recordings 
DROP CONSTRAINT IF EXISTS recordings_status_check;

-- Add new constraint on status (only 'pending' and 'approved')
ALTER TABLE recordings 
ADD CONSTRAINT recordings_status_check 
CHECK (status IN ('pending', 'approved'));

-- Drop old constraint on decision (includes 'rejected')
ALTER TABLE reviews 
DROP CONSTRAINT IF EXISTS reviews_decision_check;

-- Add new constraint on decision (only 'approved')
-- All validations result in approval (either as Pass or Edited)
ALTER TABLE reviews 
ADD CONSTRAINT reviews_decision_check 
CHECK (decision IN ('approved'));

-- Add index for transcription_edited for faster queries
CREATE INDEX IF NOT EXISTS idx_recordings_transcription_edited 
ON recordings(transcription_edited);

-- Add index for edited_by for tracking who edited
CREATE INDEX IF NOT EXISTS idx_recordings_edited_by 
ON recordings(edited_by);

-- Add comment to explain the workflow
COMMENT ON COLUMN recordings.original_sentence IS 'Original transcription before any edits by validators';
COMMENT ON COLUMN recordings.sentence IS 'Current transcription (may be edited by validators)';
COMMENT ON COLUMN recordings.transcription_edited IS 'TRUE if validator edited the transcription';
COMMENT ON COLUMN recordings.edited_by IS 'Validator who edited the transcription';
COMMENT ON COLUMN recordings.edited_at IS 'When the transcription was edited';
COMMENT ON COLUMN recordings.status IS 'Validation status: pending (awaiting validation) or approved (validated as Pass or Edited)';
COMMENT ON COLUMN reviews.decision IS 'Always approved - validators either Pass (correct) or Edit (corrected) transcriptions';

-- =============================================
-- VERIFICATION QUERY
-- =============================================
-- Run this to verify the migration worked:
-- 
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'recordings' 
-- AND column_name IN ('original_sentence', 'transcription_edited', 'edited_by', 'edited_at');
-- =============================================

