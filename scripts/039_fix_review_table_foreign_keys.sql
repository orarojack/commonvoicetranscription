-- ============================================================================
-- Fix Foreign Key Constraints on Review Tables
-- ============================================================================
-- Since recordings are deleted after review, the foreign key constraint
-- prevents inserting reviews for recordings that no longer exist.
-- This script modifies the constraints to handle this workflow.
-- ============================================================================

-- ============================================================================
-- OPTION 1: Remove Foreign Key Constraints (Recommended)
-- ============================================================================
-- Since we delete recordings after review, foreign keys don't make sense.
-- Reviews should persist as historical records even after recording deletion.
-- ============================================================================

-- Remove foreign key from somali_reviews
ALTER TABLE somali_reviews 
DROP CONSTRAINT IF EXISTS somali_reviews_recording_id_fkey;

-- Remove foreign key from kalenjin_reviews
ALTER TABLE kalenjin_reviews 
DROP CONSTRAINT IF EXISTS kalenjin_reviews_recording_id_fkey;

-- Remove foreign key from kikuyu_reviews
ALTER TABLE kikuyu_reviews 
DROP CONSTRAINT IF EXISTS kikuyu_reviews_recording_id_fkey;

-- Remove foreign key from maasai_reviews
ALTER TABLE maasai_reviews 
DROP CONSTRAINT IF EXISTS maasai_reviews_recording_id_fkey;

-- Remove foreign key from luo_reviews (if it exists)
-- Check constraint name first, common names:
ALTER TABLE luo_reviews 
DROP CONSTRAINT IF EXISTS luo_reviews_recording_id_fkey;

ALTER TABLE luo_reviews 
DROP CONSTRAINT IF EXISTS luo_reviews_recording_id_fkey1;

-- ============================================================================
-- OPTION 2: Make Foreign Keys Deferrable (Alternative)
-- ============================================================================
-- If you want to keep foreign keys but allow orphaned reviews,
-- you can make them deferrable. Uncomment this section if you prefer this approach.
-- ============================================================================

-- First drop existing constraints (from Option 1 above)
-- Then add deferrable constraints:

-- ALTER TABLE somali_reviews
-- ADD CONSTRAINT somali_reviews_recording_id_fkey 
-- FOREIGN KEY (recording_id) 
-- REFERENCES somali(_id) 
-- ON DELETE CASCADE
-- DEFERRABLE INITIALLY DEFERRED;

-- ALTER TABLE kalenjin_reviews
-- ADD CONSTRAINT kalenjin_reviews_recording_id_fkey 
-- FOREIGN KEY (recording_id) 
-- REFERENCES kalenjin(_id) 
-- ON DELETE CASCADE
-- DEFERRABLE INITIALLY DEFERRED;

-- ALTER TABLE kikuyu_reviews
-- ADD CONSTRAINT kikuyu_reviews_recording_id_fkey 
-- FOREIGN KEY (recording_id) 
-- REFERENCES kikuyu(_id) 
-- ON DELETE CASCADE
-- DEFERRABLE INITIALLY DEFERRED;

-- ALTER TABLE maasai_reviews
-- ADD CONSTRAINT maasai_reviews_recording_id_fkey 
-- FOREIGN KEY (recording_id) 
-- REFERENCES maasai(_id) 
-- ON DELETE CASCADE
-- DEFERRABLE INITIALLY DEFERRED;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check which constraints still exist
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
    AND tc.table_name IN ('somali_reviews', 'kalenjin_reviews', 'kikuyu_reviews', 'maasai_reviews')
    AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- ============================================================================
-- NOTES
-- ============================================================================
-- After removing foreign keys:
-- - Reviews can exist even if the recording was deleted (as intended)
-- - The unique constraint (recording_id, reviewer_id) still prevents duplicates
-- - Historical review data is preserved
-- - Application code handles the relationship logic

