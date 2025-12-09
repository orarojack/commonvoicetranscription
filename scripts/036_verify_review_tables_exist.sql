-- ============================================================================
-- Verify Review Tables Exist
-- ============================================================================
-- This script checks if all individual review tables exist
-- Run this to verify before using the review functionality
-- ============================================================================

-- Check which review tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('luo_reviews', 'somali_reviews', 'kalenjin_reviews', 'kikuyu_reviews', 'maasai_reviews') 
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('luo_reviews', 'somali_reviews', 'kalenjin_reviews', 'kikuyu_reviews', 'maasai_reviews')
ORDER BY table_name;

-- If any tables are missing, you'll see fewer rows
-- Expected: 5 rows (one for each review table)

-- Check table structures
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('luo_reviews', 'somali_reviews', 'kalenjin_reviews', 'kikuyu_reviews', 'maasai_reviews')
ORDER BY table_name, ordinal_position;

-- Count reviews in each table
SELECT 
    'luo_reviews' as table_name,
    COUNT(*) as review_count
FROM luo_reviews
UNION ALL
SELECT 
    'somali_reviews' as table_name,
    COUNT(*) as review_count
FROM somali_reviews
UNION ALL
SELECT 
    'kalenjin_reviews' as table_name,
    COUNT(*) as review_count
FROM kalenjin_reviews
UNION ALL
SELECT 
    'kikuyu_reviews' as table_name,
    COUNT(*) as review_count
FROM kikuyu_reviews
UNION ALL
SELECT 
    'maasai_reviews' as table_name,
    COUNT(*) as review_count
FROM maasai_reviews
ORDER BY table_name;

-- If you get errors saying tables don't exist, run script 034_create_language_review_tables.sql first

