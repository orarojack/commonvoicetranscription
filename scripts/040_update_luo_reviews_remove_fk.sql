-- ============================================================================
-- Remove Foreign Key Constraint from luo_reviews
-- ============================================================================
-- Since recordings are deleted after review, the foreign key constraint
-- prevents storing reviews for deleted recordings.
-- This script removes the foreign key constraint from luo_reviews.
-- ============================================================================

-- Remove foreign key constraint from luo_reviews
-- Try common constraint names
ALTER TABLE luo_reviews 
DROP CONSTRAINT IF EXISTS luo_reviews_recording_id_fkey;

ALTER TABLE luo_reviews 
DROP CONSTRAINT IF EXISTS luo_reviews_recording_id_fkey1;

-- Verify constraint was removed
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
    AND tc.table_name = 'luo_reviews'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'recording_id';

-- Should return 0 rows if constraint was successfully removed

