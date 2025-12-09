-- ============================================================================
-- Add transcript Column to All Review Tables
-- ============================================================================
-- This script adds a 'transcript' column to store the validated/edited transcript
-- alongside each review
-- ============================================================================

-- Add transcript column to luo_reviews
ALTER TABLE luo_reviews 
ADD COLUMN IF NOT EXISTS transcript TEXT;

COMMENT ON COLUMN luo_reviews.transcript IS 'The validated/edited transcript from the review';

-- Add transcript column to somali_reviews
ALTER TABLE somali_reviews 
ADD COLUMN IF NOT EXISTS transcript TEXT;

COMMENT ON COLUMN somali_reviews.transcript IS 'The validated/edited transcript from the review';

-- Add transcript column to kalenjin_reviews
ALTER TABLE kalenjin_reviews 
ADD COLUMN IF NOT EXISTS transcript TEXT;

COMMENT ON COLUMN kalenjin_reviews.transcript IS 'The validated/edited transcript from the review';

-- Add transcript column to kikuyu_reviews
ALTER TABLE kikuyu_reviews 
ADD COLUMN IF NOT EXISTS transcript TEXT;

COMMENT ON COLUMN kikuyu_reviews.transcript IS 'The validated/edited transcript from the review';

-- Add transcript column to maasai_reviews
ALTER TABLE maasai_reviews 
ADD COLUMN IF NOT EXISTS transcript TEXT;

COMMENT ON COLUMN maasai_reviews.transcript IS 'The validated/edited transcript from the review';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that transcript column was added
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('luo_reviews', 'somali_reviews', 'kalenjin_reviews', 'kikuyu_reviews', 'maasai_reviews')
  AND column_name = 'transcript'
ORDER BY table_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Transcript column added to all review tables!';
    RAISE NOTICE 'The validated/edited transcript will now be stored with each review.';
END $$;

