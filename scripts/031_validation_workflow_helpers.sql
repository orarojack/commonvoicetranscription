-- ============================================================================
-- SQL Helper Scripts for Validation Workflow
-- ============================================================================
-- This script provides SQL statements to help manage and verify the validation workflow
-- where validated recordings are moved from language tables to language_reviews
-- ============================================================================

-- ============================================================================
-- PART 1: VERIFICATION QUERIES
-- ============================================================================
-- Use these to check the current state of your data

-- 1.1: Count pending recordings per language table
SELECT 
    'luo' as table_name,
    COUNT(*) as pending_count
FROM luo
WHERE status = 'pending'
UNION ALL
SELECT 
    'somali' as table_name,
    COUNT(*) as pending_count
FROM somali
UNION ALL
SELECT 
    'kalenjin' as table_name,
    COUNT(*) as pending_count
FROM kalenjin
UNION ALL
SELECT 
    'kikuyu' as table_name,
    COUNT(*) as pending_count
FROM kikuyu
UNION ALL
SELECT 
    'maasai' as table_name,
    COUNT(*) as pending_count
FROM maasai
ORDER BY table_name;

-- 1.2: Count validated recordings per language (in language_reviews)
SELECT 
    source_table,
    decision,
    COUNT(*) as review_count
FROM language_reviews
GROUP BY source_table, decision
ORDER BY source_table, decision;

-- 1.3: Check for any recordings that have been reviewed but still exist in language tables
-- (This should return 0 if the workflow is working correctly)
SELECT 
    lr.source_table,
    lr.recording_id,
    lr.reviewer_id,
    lr.decision,
    lr.created_at as reviewed_at
FROM language_reviews lr
WHERE EXISTS (
    SELECT 1 
    FROM luo l 
    WHERE l.id = lr.recording_id AND lr.source_table = 'luo'
)
OR EXISTS (
    SELECT 1 
    FROM somali s 
    WHERE s._id = lr.recording_id AND lr.source_table = 'somali'
)
OR EXISTS (
    SELECT 1 
    FROM kalenjin k 
    WHERE k._id = lr.recording_id AND lr.source_table = 'kalenjin'
)
OR EXISTS (
    SELECT 1 
    FROM kikuyu ki 
    WHERE ki._id = lr.recording_id AND lr.source_table = 'kikuyu'
)
OR EXISTS (
    SELECT 1 
    FROM maasai m 
    WHERE m._id = lr.recording_id AND lr.source_table = 'maasai'
);

-- 1.4: Get statistics per validator
SELECT 
    u.email as reviewer_email,
    lr.source_table,
    lr.decision,
    COUNT(*) as reviews_count,
    SUM(lr.time_spent) as total_time_spent_seconds,
    AVG(lr.confidence) as avg_confidence
FROM language_reviews lr
JOIN users u ON lr.reviewer_id = u.id
GROUP BY u.email, lr.source_table, lr.decision
ORDER BY u.email, lr.source_table, lr.decision;

-- ============================================================================
-- PART 2: CLEANUP QUERIES (Use with caution!)
-- ============================================================================
-- These queries help clean up any orphaned data

-- 2.1: Find and optionally delete recordings that have been reviewed but still exist
-- WARNING: This will delete recordings! Review the SELECT first before running DELETE
-- Step 1: First, see what would be deleted (run this first!)
SELECT 
    'luo' as source_table,
    l.id as recording_id,
    l.cleaned_transcript as transcript,
    lr.decision,
    lr.created_at as reviewed_at
FROM luo l
INNER JOIN language_reviews lr ON l.id = lr.recording_id AND lr.source_table = 'luo'
UNION ALL
SELECT 
    'somali' as source_table,
    s._id as recording_id,
    s.cleaned_transcript as transcript,
    lr.decision,
    lr.created_at as reviewed_at
FROM somali s
INNER JOIN language_reviews lr ON s._id = lr.recording_id AND lr.source_table = 'somali'
UNION ALL
SELECT 
    'kalenjin' as source_table,
    k._id as recording_id,
    k.cleaned_transcript as transcript,
    lr.decision,
    lr.created_at as reviewed_at
FROM kalenjin k
INNER JOIN language_reviews lr ON k._id = lr.recording_id AND lr.source_table = 'kalenjin'
UNION ALL
SELECT 
    'kikuyu' as source_table,
    ki._id as recording_id,
    ki.cleaned_transcript as transcript,
    lr.decision,
    lr.created_at as reviewed_at
FROM kikuyu ki
INNER JOIN language_reviews lr ON ki._id = lr.recording_id AND lr.source_table = 'kikuyu'
UNION ALL
SELECT 
    'maasai' as source_table,
    m._id as recording_id,
    m.cleaned_transcript as transcript,
    lr.decision,
    lr.created_at as reviewed_at
FROM maasai m
INNER JOIN language_reviews lr ON m._id = lr.recording_id AND lr.source_table = 'maasai';

-- Step 2: If the above looks correct, uncomment and run the DELETE statements below
-- (One DELETE per language table)

-- Delete reviewed recordings from luo table
-- DELETE FROM luo
-- WHERE id IN (
--     SELECT lr.recording_id 
--     FROM language_reviews lr 
--     WHERE lr.source_table = 'luo'
-- );

-- Delete reviewed recordings from somali table
-- DELETE FROM somali
-- WHERE _id IN (
--     SELECT lr.recording_id 
--     FROM language_reviews lr 
--     WHERE lr.source_table = 'somali'
-- );

-- Delete reviewed recordings from kalenjin table
-- DELETE FROM kalenjin
-- WHERE _id IN (
--     SELECT lr.recording_id 
--     FROM language_reviews lr 
--     WHERE lr.source_table = 'kalenjin'
-- );

-- Delete reviewed recordings from kikuyu table
-- DELETE FROM kikuyu
-- WHERE _id IN (
--     SELECT lr.recording_id 
--     FROM language_reviews lr 
--     WHERE lr.source_table = 'kikuyu'
-- );

-- Delete reviewed recordings from maasai table
-- DELETE FROM maasai
-- WHERE _id IN (
--     SELECT lr.recording_id 
--     FROM language_reviews lr 
--     WHERE lr.source_table = 'maasai'
-- );

-- ============================================================================
-- PART 3: VIEW RECENT VALIDATIONS
-- ============================================================================

-- 3.1: View recent validations with details
SELECT 
    lr.id as review_id,
    lr.source_table,
    lr.recording_id,
    u.email as reviewer_email,
    lr.decision,
    lr.notes,
    lr.confidence,
    lr.time_spent as time_spent_seconds,
    lr.created_at as validated_at
FROM language_reviews lr
JOIN users u ON lr.reviewer_id = u.id
ORDER BY lr.created_at DESC
LIMIT 50;

-- 3.2: View validations by date
SELECT 
    DATE(lr.created_at) as validation_date,
    lr.source_table,
    lr.decision,
    COUNT(*) as count
FROM language_reviews lr
GROUP BY DATE(lr.created_at), lr.source_table, lr.decision
ORDER BY validation_date DESC, lr.source_table;

-- ============================================================================
-- PART 4: VALIDATION STATISTICS
-- ============================================================================

-- 4.1: Overall validation statistics
SELECT 
    lr.source_table,
    COUNT(*) as total_validations,
    COUNT(CASE WHEN lr.decision = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN lr.decision = 'rejected' THEN 1 END) as rejected_count,
    AVG(lr.confidence) as avg_confidence,
    AVG(lr.time_spent) as avg_time_spent_seconds,
    SUM(lr.time_spent) as total_time_spent_seconds
FROM language_reviews lr
GROUP BY lr.source_table
ORDER BY lr.source_table;

-- 4.2: Daily validation statistics (last 30 days)
SELECT 
    DATE(lr.created_at) as date,
    lr.source_table,
    COUNT(*) as validations_count,
    COUNT(CASE WHEN lr.decision = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN lr.decision = 'rejected' THEN 1 END) as rejected
FROM language_reviews lr
WHERE lr.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(lr.created_at), lr.source_table
ORDER BY date DESC, lr.source_table;

-- ============================================================================
-- PART 5: CHECK FOR DUPLICATE REVIEWS
-- ============================================================================

-- 5.1: Find duplicate reviews (same reviewer reviewing same recording)
-- This should return 0 if the unique constraint is working
SELECT 
    source_table,
    recording_id,
    reviewer_id,
    COUNT(*) as review_count
FROM language_reviews
GROUP BY source_table, recording_id, reviewer_id
HAVING COUNT(*) > 1;

-- ============================================================================
-- PART 6: SAMPLE PENDING RECORDINGS
-- ============================================================================

-- 6.1: View sample pending recordings from each language table
SELECT 
    'luo' as table_name,
    id as recording_id,
    cleaned_transcript as transcript,
    status,
    created_at
FROM luo
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- For new schema tables (somali, kalenjin, kikuyu, maasai), they don't have status column
-- so all records are considered pending:
SELECT 
    'somali' as table_name,
    _id as recording_id,
    cleaned_transcript as transcript,
    created_at
FROM somali
ORDER BY _id DESC
LIMIT 10;

-- ============================================================================
-- PART 7: MIGRATION HELPERS (If you have existing reviewed recordings)
-- ============================================================================

-- 7.1: If you have recordings with status='approved' that should be moved to reviews
-- First, check how many exist:
SELECT 
    'luo' as table_name,
    COUNT(*) as approved_count
FROM luo
WHERE status = 'approved'
UNION ALL
SELECT 
    'somali' as table_name,
    COUNT(*) as approved_count
FROM somali
WHERE status = 'approved'
UNION ALL
SELECT 
    'kalenjin' as table_name,
    COUNT(*) as approved_count
FROM kalenjin
WHERE status = 'approved'
UNION ALL
SELECT 
    'kikuyu' as table_name,
    COUNT(*) as approved_count
FROM kikuyu
WHERE status = 'approved'
UNION ALL
SELECT 
    'maasai' as table_name,
    COUNT(*) as approved_count
FROM maasai
WHERE status = 'approved';

-- 7.2: Create reviews for existing approved recordings (if needed)
-- WARNING: Only run this if you have approved recordings that don't have reviews yet
-- This creates review records for recordings that are already approved
-- Uncomment and modify as needed:

-- For luo table:
-- INSERT INTO language_reviews (
--     source_table,
--     recording_id,
--     reviewer_id,
--     decision,
--     notes,
--     confidence,
--     time_spent,
--     created_at
-- )
-- SELECT 
--     'luo' as source_table,
--     l.id as recording_id,
--     l.reviewed_by as reviewer_id,
--     'approved' as decision,
--     'Migrated from existing approved recording' as notes,
--     90 as confidence,
--     0 as time_spent,
--     COALESCE(l.reviewed_at, l.updated_at, l.created_at) as created_at
-- FROM luo l
-- WHERE l.status = 'approved'
-- AND l.reviewed_by IS NOT NULL
-- AND NOT EXISTS (
--     SELECT 1 
--     FROM language_reviews lr 
--     WHERE lr.source_table = 'luo' 
--     AND lr.recording_id = l.id
-- )
-- ON CONFLICT (source_table, recording_id, reviewer_id) DO NOTHING;

-- ============================================================================
-- PART 8: HEALTH CHECK QUERIES
-- ============================================================================

-- 8.1: Overall health check - summary of all tables
SELECT 
    'Pending Recordings' as metric,
    'luo' as table_name,
    COUNT(*)::text as value
FROM luo WHERE status = 'pending'
UNION ALL
SELECT 
    'Pending Recordings' as metric,
    'somali' as table_name,
    COUNT(*)::text as value
FROM somali
UNION ALL
SELECT 
    'Validated Recordings' as metric,
    lr.source_table as table_name,
    COUNT(*)::text as value
FROM language_reviews lr
GROUP BY lr.source_table
ORDER BY metric, table_name;

-- 8.2: Check for any issues
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM language_reviews lr
            WHERE EXISTS (
                SELECT 1 FROM luo l WHERE l.id = lr.recording_id AND lr.source_table = 'luo'
            )
        ) THEN 'WARNING: Reviewed recordings still exist in language tables'
        ELSE 'OK: No reviewed recordings in language tables'
    END as status_check;

