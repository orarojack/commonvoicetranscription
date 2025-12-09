-- ============================================================================
-- Migrate Reviews from language_reviews to Individual Review Tables
-- ============================================================================
-- This script migrates existing reviews from the unified language_reviews table
-- to the individual review tables (somali_reviews, kalenjin_reviews, etc.)
-- ============================================================================

-- ============================================================================
-- PART 1: Migrate somali reviews
-- ============================================================================

INSERT INTO somali_reviews (
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
    -- Extract transcript from notes if available
    CASE 
        WHEN lr.notes LIKE '%to: "%' THEN SUBSTRING(lr.notes FROM 'to: "([^"]+)"')
        WHEN lr.notes LIKE '%confirmed as correct: "%' THEN SUBSTRING(lr.notes FROM 'confirmed as correct: "([^"]+)"')
        WHEN lr.notes LIKE '%Original transcription: "%' THEN SUBSTRING(lr.notes FROM 'Original transcription: "([^"]+)"')
        ELSE NULL
    END as transcript,
    lr.confidence,
    lr.time_spent,
    lr.created_at
FROM language_reviews lr
WHERE lr.source_table = 'somali'
AND NOT EXISTS (
    SELECT 1 
    FROM somali_reviews sr 
    WHERE sr.recording_id = lr.recording_id 
    AND sr.reviewer_id = lr.reviewer_id
)
ON CONFLICT (recording_id, reviewer_id) DO NOTHING;

-- ============================================================================
-- PART 2: Migrate kalenjin reviews
-- ============================================================================

INSERT INTO kalenjin_reviews (
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
    CASE 
        WHEN lr.notes LIKE '%to: "%' THEN SUBSTRING(lr.notes FROM 'to: "([^"]+)"')
        WHEN lr.notes LIKE '%confirmed as correct: "%' THEN SUBSTRING(lr.notes FROM 'confirmed as correct: "([^"]+)"')
        WHEN lr.notes LIKE '%Original transcription: "%' THEN SUBSTRING(lr.notes FROM 'Original transcription: "([^"]+)"')
        ELSE NULL
    END as transcript,
    lr.confidence,
    lr.time_spent,
    lr.created_at
FROM language_reviews lr
WHERE lr.source_table = 'kalenjin'
AND NOT EXISTS (
    SELECT 1 
    FROM kalenjin_reviews kr 
    WHERE kr.recording_id = lr.recording_id 
    AND kr.reviewer_id = lr.reviewer_id
)
ON CONFLICT (recording_id, reviewer_id) DO NOTHING;

-- ============================================================================
-- PART 3: Migrate kikuyu reviews
-- ============================================================================

INSERT INTO kikuyu_reviews (
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
    CASE 
        WHEN lr.notes LIKE '%to: "%' THEN SUBSTRING(lr.notes FROM 'to: "([^"]+)"')
        WHEN lr.notes LIKE '%confirmed as correct: "%' THEN SUBSTRING(lr.notes FROM 'confirmed as correct: "([^"]+)"')
        WHEN lr.notes LIKE '%Original transcription: "%' THEN SUBSTRING(lr.notes FROM 'Original transcription: "([^"]+)"')
        ELSE NULL
    END as transcript,
    lr.confidence,
    lr.time_spent,
    lr.created_at
FROM language_reviews lr
WHERE lr.source_table = 'kikuyu'
AND NOT EXISTS (
    SELECT 1 
    FROM kikuyu_reviews kir 
    WHERE kir.recording_id = lr.recording_id 
    AND kir.reviewer_id = lr.reviewer_id
)
ON CONFLICT (recording_id, reviewer_id) DO NOTHING;

-- ============================================================================
-- PART 4: Migrate maasai reviews
-- ============================================================================

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
    CASE 
        WHEN lr.notes LIKE '%to: "%' THEN SUBSTRING(lr.notes FROM 'to: "([^"]+)"')
        WHEN lr.notes LIKE '%confirmed as correct: "%' THEN SUBSTRING(lr.notes FROM 'confirmed as correct: "([^"]+)"')
        WHEN lr.notes LIKE '%Original transcription: "%' THEN SUBSTRING(lr.notes FROM 'Original transcription: "([^"]+)"')
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

-- ============================================================================
-- PART 5: Verification - Compare counts
-- ============================================================================

-- Count reviews in language_reviews vs individual tables
SELECT 
    'language_reviews' as source,
    source_table,
    COUNT(*) as review_count
FROM language_reviews
WHERE source_table IN ('somali', 'kalenjin', 'kikuyu', 'maasai')
GROUP BY source_table
UNION ALL
SELECT 
    'somali_reviews' as source,
    'somali' as source_table,
    COUNT(*) as review_count
FROM somali_reviews
UNION ALL
SELECT 
    'kalenjin_reviews' as source,
    'kalenjin' as source_table,
    COUNT(*) as review_count
FROM kalenjin_reviews
UNION ALL
SELECT 
    'kikuyu_reviews' as source,
    'kikuyu' as source_table,
    COUNT(*) as review_count
FROM kikuyu_reviews
UNION ALL
SELECT 
    'maasai_reviews' as source,
    'maasai' as source_table,
    COUNT(*) as review_count
FROM maasai_reviews
ORDER BY source_table, source;

-- ============================================================================
-- PART 6: Optional - Archive or Drop language_reviews table
-- ============================================================================
-- Uncomment these if you want to remove the unified language_reviews table
-- after migration is complete and verified

-- Option 1: Rename to archive (keeps data for reference)
-- ALTER TABLE language_reviews RENAME TO language_reviews_archive;

-- Option 2: Drop the table (permanently deletes data)
-- WARNING: Only do this after verifying all data has been migrated!
-- DROP TABLE IF EXISTS language_reviews;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
DECLARE
    somali_count INTEGER;
    kalenjin_count INTEGER;
    kikuyu_count INTEGER;
    maasai_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO somali_count FROM somali_reviews;
    SELECT COUNT(*) INTO kalenjin_count FROM kalenjin_reviews;
    SELECT COUNT(*) INTO kikuyu_count FROM kikuyu_reviews;
    SELECT COUNT(*) INTO maasai_count FROM maasai_reviews;
    
    RAISE NOTICE '✅ Migration completed!';
    RAISE NOTICE 'somali_reviews: % reviews', somali_count;
    RAISE NOTICE 'kalenjin_reviews: % reviews', kalenjin_count;
    RAISE NOTICE 'kikuyu_reviews: % reviews', kikuyu_count;
    RAISE NOTICE 'maasai_reviews: % reviews', maasai_count;
    RAISE NOTICE 'Run verification queries in PART 5 to compare counts';
END $$;

