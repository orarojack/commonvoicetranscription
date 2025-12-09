-- ============================================================================
-- Check for Maasai Reviews in language_reviews Table
-- ============================================================================
-- This script checks if there are any maasai reviews in the old language_reviews table
-- that should have been in maasai_reviews
-- ============================================================================

-- Check if language_reviews table exists and has maasai reviews
SELECT 
    'language_reviews' as source_table,
    source_table as language,
    COUNT(*) as review_count
FROM language_reviews
WHERE source_table = 'maasai'
GROUP BY source_table;

-- View recent maasai reviews from language_reviews (if any)
SELECT 
    id,
    source_table,
    recording_id,
    reviewer_id,
    decision,
    notes,
    created_at
FROM language_reviews
WHERE source_table = 'maasai'
ORDER BY created_at DESC
LIMIT 10;

-- Check if any of these recording_ids exist in maasai_reviews
SELECT 
    lr.recording_id,
    lr.reviewer_id,
    lr.decision,
    lr.created_at as language_reviews_created_at,
    CASE 
        WHEN mr.id IS NOT NULL THEN '✅ Already in maasai_reviews'
        ELSE '❌ Missing from maasai_reviews'
    END as status
FROM language_reviews lr
LEFT JOIN maasai_reviews mr 
    ON lr.recording_id = mr.recording_id 
    AND lr.reviewer_id = mr.reviewer_id
WHERE lr.source_table = 'maasai'
ORDER BY lr.created_at DESC;

