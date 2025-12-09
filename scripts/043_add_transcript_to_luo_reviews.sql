-- ============================================================================
-- Add transcript Column to luo_reviews Table
-- ============================================================================
-- This script adds a 'transcript' column to store the validated/edited transcript
-- ============================================================================

-- Add transcript column to luo_reviews
ALTER TABLE luo_reviews 
ADD COLUMN IF NOT EXISTS transcript TEXT;

COMMENT ON COLUMN luo_reviews.transcript IS 'The validated/edited transcript from the review';

-- Verify column was added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'luo_reviews'
  AND column_name = 'transcript';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Transcript column added to luo_reviews table!';
END $$;

