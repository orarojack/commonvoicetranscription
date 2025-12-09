-- ============================================================================
-- Migrate All Maasai Reviews from language_reviews to maasai_reviews
-- ============================================================================
-- This script migrates all maasai reviews from language_reviews to maasai_reviews
-- NOTE: Since recordings are deleted after review, we need to temporarily
-- modify the foreign key constraint to allow orphaned reviews
-- ============================================================================

-- Step 1: Count how many maasai reviews need to be migrated
SELECT 
    COUNT(*) as reviews_to_migrate
FROM language_reviews lr
WHERE lr.source_table = 'maasai'
AND NOT EXISTS (
    SELECT 1 
    FROM maasai_reviews mr 
    WHERE mr.recording_id = lr.recording_id 
    AND mr.reviewer_id = lr.reviewer_id
);

-- Step 2: Temporarily drop the foreign key constraint
-- This allows us to insert reviews even if the recording was already deleted
-- Try to find and drop the constraint (constraint name may vary)
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

-- Step 3: Insert all maasai reviews into maasai_reviews
-- Extract transcript from notes if available, otherwise leave NULL
INSERT INTO maasai_reviews (
    recording_id,
    reviewer_id,
    decision,
    notes,
    transcript,
    confidence,
    time_spent,
    created_at
)
SELECT 
    lr.recording_id,
    lr.reviewer_id,
    lr.decision,
    lr.notes,
    -- Try to extract transcript from notes (if it contains "to: " or "confirmed as correct: ")
    CASE 
        WHEN lr.notes LIKE '%to: "%' THEN
            SUBSTRING(lr.notes FROM 'to: "([^"]+)"')
        WHEN lr.notes LIKE '%confirmed as correct: "%' THEN
            SUBSTRING(lr.notes FROM 'confirmed as correct: "([^"]+)"')
        WHEN lr.notes LIKE '%Original transcription: "%' THEN
            SUBSTRING(lr.notes FROM 'Original transcription: "([^"]+)"')
        ELSE NULL
    END as transcript,
    lr.confidence,
    lr.time_spent,
    lr.created_at
FROM language_reviews lr
WHERE lr.source_table = 'maasai'
AND NOT EXISTS (
    SELECT 1 
    FROM maasai_reviews mr 
    WHERE mr.recording_id = lr.recording_id 
    AND mr.reviewer_id = lr.reviewer_id
)
ON CONFLICT (recording_id, reviewer_id) DO NOTHING;

-- Step 4: DO NOT re-add the foreign key constraint
-- Since recordings are deleted after review, foreign keys don't make sense
-- Reviews should persist as historical records even after recording deletion
-- The unique constraint (recording_id, reviewer_id) still prevents duplicates

-- Step 3: Verify the migration
SELECT 
    'maasai_reviews' as table_name,
    COUNT(*) as total_reviews
FROM maasai_reviews;

-- Step 4: Check if the specific review was migrated
SELECT 
    'maasai_reviews' as table_name,
    recording_id,
    reviewer_id,
    decision,
    created_at
FROM maasai_reviews
WHERE recording_id = '683df39504a2b86675a3a02e'
AND reviewer_id = '5cbc441a-6466-4333-8aeb-365316fb36af';

-- Step 5: Verify no maasai reviews remain in language_reviews (should be 0)
SELECT 
    COUNT(*) as remaining_maasai_reviews_in_language_reviews
FROM language_reviews
WHERE source_table = 'maasai';

-- Step 6: Optional - Delete from language_reviews after migration (uncomment if verified)
-- WARNING: Only run this after verifying the migration was successful!
-- DELETE FROM language_reviews
-- WHERE source_table = 'maasai'
-- AND EXISTS (
--     SELECT 1 
--     FROM maasai_reviews mr 
--     WHERE mr.recording_id = language_reviews.recording_id 
--     AND mr.reviewer_id = language_reviews.reviewer_id
-- );

