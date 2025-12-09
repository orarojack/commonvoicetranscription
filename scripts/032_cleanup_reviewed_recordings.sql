-- ============================================================================
-- Cleanup Script: Remove Reviewed Recordings from Language Tables
-- ============================================================================
-- This script removes recordings that have been reviewed (exist in language_reviews)
-- from the language tables (luo, somali, kalenjin, kikuyu, maasai)
-- 
-- IMPORTANT: 
-- 1. Run the verification queries in 031_validation_workflow_helpers.sql first
-- 2. Review the results before running DELETE statements
-- 3. Consider backing up your data before running this script
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFICATION - See what will be deleted
-- ============================================================================
-- Run these queries first to see what will be deleted

-- Count of reviewed recordings that still exist in language tables
SELECT 
    'luo' as table_name,
    COUNT(*) as reviewed_recordings_still_in_table
FROM luo l
WHERE EXISTS (
    SELECT 1 
    FROM language_reviews lr 
    WHERE lr.source_table = 'luo' 
    AND lr.recording_id = l.id
)
UNION ALL
SELECT 
    'somali' as table_name,
    COUNT(*) as reviewed_recordings_still_in_table
FROM somali s
WHERE EXISTS (
    SELECT 1 
    FROM language_reviews lr 
    WHERE lr.source_table = 'somali' 
    AND lr.recording_id = s._id
)
UNION ALL
SELECT 
    'kalenjin' as table_name,
    COUNT(*) as reviewed_recordings_still_in_table
FROM kalenjin k
WHERE EXISTS (
    SELECT 1 
    FROM language_reviews lr 
    WHERE lr.source_table = 'kalenjin' 
    AND lr.recording_id = k._id
)
UNION ALL
SELECT 
    'kikuyu' as table_name,
    COUNT(*) as reviewed_recordings_still_in_table
FROM kikuyu ki
WHERE EXISTS (
    SELECT 1 
    FROM language_reviews lr 
    WHERE lr.source_table = 'kikuyu' 
    AND lr.recording_id = ki._id
)
UNION ALL
SELECT 
    'maasai' as table_name,
    COUNT(*) as reviewed_recordings_still_in_table
FROM maasai m
WHERE EXISTS (
    SELECT 1 
    FROM language_reviews lr 
    WHERE lr.source_table = 'maasai' 
    AND lr.recording_id = m._id
);

-- ============================================================================
-- STEP 2: VIEW DETAILS - See which recordings will be deleted
-- ============================================================================

-- View reviewed recordings in luo table
SELECT 
    'luo' as source_table,
    l.id as recording_id,
    l.cleaned_transcript as transcript,
    l.status,
    lr.decision as review_decision,
    lr.created_at as reviewed_at,
    u.email as reviewer_email
FROM luo l
INNER JOIN language_reviews lr ON l.id = lr.recording_id AND lr.source_table = 'luo'
LEFT JOIN users u ON lr.reviewer_id = u.id
ORDER BY lr.created_at DESC
LIMIT 100;

-- View reviewed recordings in somali table
SELECT 
    'somali' as source_table,
    s._id as recording_id,
    s.cleaned_transcript as transcript,
    lr.decision as review_decision,
    lr.created_at as reviewed_at,
    u.email as reviewer_email
FROM somali s
INNER JOIN language_reviews lr ON s._id = lr.recording_id AND lr.source_table = 'somali'
LEFT JOIN users u ON lr.reviewer_id = u.id
ORDER BY lr.created_at DESC
LIMIT 100;

-- View reviewed recordings in kalenjin table
SELECT 
    'kalenjin' as source_table,
    k._id as recording_id,
    k.cleaned_transcript as transcript,
    lr.decision as review_decision,
    lr.created_at as reviewed_at,
    u.email as reviewer_email
FROM kalenjin k
INNER JOIN language_reviews lr ON k._id = lr.recording_id AND lr.source_table = 'kalenjin'
LEFT JOIN users u ON lr.reviewer_id = u.id
ORDER BY lr.created_at DESC
LIMIT 100;

-- View reviewed recordings in kikuyu table
SELECT 
    'kikuyu' as source_table,
    ki._id as recording_id,
    ki.cleaned_transcript as transcript,
    lr.decision as review_decision,
    lr.created_at as reviewed_at,
    u.email as reviewer_email
FROM kikuyu ki
INNER JOIN language_reviews lr ON ki._id = lr.recording_id AND lr.source_table = 'kikuyu'
LEFT JOIN users u ON lr.reviewer_id = u.id
ORDER BY lr.created_at DESC
LIMIT 100;

-- View reviewed recordings in maasai table
SELECT 
    'maasai' as source_table,
    m._id as recording_id,
    m.cleaned_transcript as transcript,
    lr.decision as review_decision,
    lr.created_at as reviewed_at,
    u.email as reviewer_email
FROM maasai m
INNER JOIN language_reviews lr ON m._id = lr.recording_id AND lr.source_table = 'maasai'
LEFT JOIN users u ON lr.reviewer_id = u.id
ORDER BY lr.created_at DESC
LIMIT 100;

-- ============================================================================
-- STEP 3: DELETE OPERATIONS (Run only after reviewing Step 1 and Step 2)
-- ============================================================================
-- Uncomment and run these DELETE statements one at a time
-- Start with a small batch or test on a single recording first

-- Delete reviewed recordings from luo table
-- BEGIN;
-- DELETE FROM luo
-- WHERE id IN (
--     SELECT lr.recording_id 
--     FROM language_reviews lr 
--     WHERE lr.source_table = 'luo'
-- );
-- -- Check the count before committing
-- -- SELECT COUNT(*) FROM luo WHERE id IN (SELECT recording_id FROM language_reviews WHERE source_table = 'luo');
-- COMMIT;

-- Delete reviewed recordings from somali table
-- BEGIN;
-- DELETE FROM somali
-- WHERE _id IN (
--     SELECT lr.recording_id 
--     FROM language_reviews lr 
--     WHERE lr.source_table = 'somali'
-- );
-- COMMIT;

-- Delete reviewed recordings from kalenjin table
-- BEGIN;
-- DELETE FROM kalenjin
-- WHERE _id IN (
--     SELECT lr.recording_id 
--     FROM language_reviews lr 
--     WHERE lr.source_table = 'kalenjin'
-- );
-- COMMIT;

-- Delete reviewed recordings from kikuyu table
-- BEGIN;
-- DELETE FROM kikuyu
-- WHERE _id IN (
--     SELECT lr.recording_id 
--     FROM language_reviews lr 
--     WHERE lr.source_table = 'kikuyu'
-- );
-- COMMIT;

-- Delete reviewed recordings from maasai table
-- BEGIN;
-- DELETE FROM maasai
-- WHERE _id IN (
--     SELECT lr.recording_id 
--     FROM language_reviews lr 
--     WHERE lr.source_table = 'maasai'
-- );
-- COMMIT;

-- ============================================================================
-- STEP 4: VERIFICATION AFTER CLEANUP
-- ============================================================================
-- Run these after the DELETE operations to verify cleanup was successful

-- Should return 0 for all tables if cleanup was successful
SELECT 
    'luo' as table_name,
    COUNT(*) as remaining_reviewed_recordings
FROM luo l
WHERE EXISTS (
    SELECT 1 
    FROM language_reviews lr 
    WHERE lr.source_table = 'luo' 
    AND lr.recording_id = l.id
)
UNION ALL
SELECT 
    'somali' as table_name,
    COUNT(*) as remaining_reviewed_recordings
FROM somali s
WHERE EXISTS (
    SELECT 1 
    FROM language_reviews lr 
    WHERE lr.source_table = 'somali' 
    AND lr.recording_id = s._id
)
UNION ALL
SELECT 
    'kalenjin' as table_name,
    COUNT(*) as remaining_reviewed_recordings
FROM kalenjin k
WHERE EXISTS (
    SELECT 1 
    FROM language_reviews lr 
    WHERE lr.source_table = 'kalenjin' 
    AND lr.recording_id = k._id
)
UNION ALL
SELECT 
    'kikuyu' as table_name,
    COUNT(*) as remaining_reviewed_recordings
FROM kikuyu ki
WHERE EXISTS (
    SELECT 1 
    FROM language_reviews lr 
    WHERE lr.source_table = 'kikuyu' 
    AND lr.recording_id = ki._id
)
UNION ALL
SELECT 
    'maasai' as table_name,
    COUNT(*) as remaining_reviewed_recordings
FROM maasai m
WHERE EXISTS (
    SELECT 1 
    FROM language_reviews lr 
    WHERE lr.source_table = 'maasai' 
    AND lr.recording_id = m._id
);

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Always run verification queries (Step 1) before DELETE operations
-- 2. Review the details (Step 2) to ensure you're deleting the right records
-- 3. Consider backing up your data before running DELETE statements
-- 4. Run DELETE statements one table at a time and verify after each
-- 5. Use transactions (BEGIN/COMMIT) to ensure atomicity
-- 6. After cleanup, the workflow will automatically delete recordings when they're reviewed

