-- ============================================================================
-- Remove ALL Foreign Key Constraints from Review Tables
-- ============================================================================
-- This script removes foreign key constraints on recording_id from all review tables
-- This is necessary because recordings are deleted after review, but reviews should persist
-- ============================================================================

-- ============================================================================
-- STEP 1: Find all foreign key constraints on recording_id
-- ============================================================================
SELECT 
    tc.table_name,
    tc.constraint_name,
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
    AND tc.table_name IN ('luo_reviews', 'somali_reviews', 'kalenjin_reviews', 'kikuyu_reviews', 'maasai_reviews')
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'recording_id'
ORDER BY tc.table_name;

-- ============================================================================
-- STEP 2: Remove foreign key constraints (run these one at a time if needed)
-- ============================================================================

-- Remove from somali_reviews
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
        AND tc.table_name = 'somali_reviews'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'recording_id'
    LIMIT 1;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE somali_reviews DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Dropped constraint % from somali_reviews', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found on somali_reviews.recording_id';
    END IF;
END $$;

-- Remove from kalenjin_reviews
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
        AND tc.table_name = 'kalenjin_reviews'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'recording_id'
    LIMIT 1;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE kalenjin_reviews DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Dropped constraint % from kalenjin_reviews', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found on kalenjin_reviews.recording_id';
    END IF;
END $$;

-- Remove from kikuyu_reviews
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
        AND tc.table_name = 'kikuyu_reviews'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'recording_id'
    LIMIT 1;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE kikuyu_reviews DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Dropped constraint % from kikuyu_reviews', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found on kikuyu_reviews.recording_id';
    END IF;
END $$;

-- Remove from maasai_reviews
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
        AND tc.table_name = 'maasai_reviews'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'recording_id'
    LIMIT 1;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE maasai_reviews DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Dropped constraint % from maasai_reviews', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found on maasai_reviews.recording_id';
    END IF;
END $$;

-- Remove from luo_reviews
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
        AND tc.table_name = 'luo_reviews'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'recording_id'
    LIMIT 1;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE luo_reviews DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Dropped constraint % from luo_reviews', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found on luo_reviews.recording_id';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Verify all constraints are removed
-- ============================================================================
SELECT 
    tc.table_name,
    tc.constraint_name,
    '✅ Removed' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.table_name IN ('luo_reviews', 'somali_reviews', 'kalenjin_reviews', 'kikuyu_reviews', 'maasai_reviews')
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'recording_id';

-- Should return 0 rows if all constraints were successfully removed

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Foreign key constraints removed from all review tables!';
    RAISE NOTICE 'Reviews can now be stored even if recordings are deleted.';
END $$;

