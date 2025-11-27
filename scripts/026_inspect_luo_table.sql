-- Comprehensive inspection of luo table structure and data
-- Run this in Supabase SQL Editor to understand the actual schema

-- 1. Check table structure (columns, types, constraints)
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'luo'
ORDER BY ordinal_position;

-- 2. Get sample data (first 10 rows) to see actual values
SELECT * 
FROM luo 
LIMIT 10;

-- 3. Check all distinct status values and their counts
SELECT 
    status,
    COUNT(*) as count,
    COUNT(*) * 100.0 / (SELECT COUNT(*) FROM luo) as percentage
FROM luo 
GROUP BY status
ORDER BY count DESC;

-- 4. Check if status column has NULL values
SELECT 
    COUNT(*) as total_rows,
    COUNT(status) as rows_with_status,
    COUNT(*) - COUNT(status) as null_status_count
FROM luo;

-- 5. Check language column values
SELECT 
    language,
    COUNT(*) as count
FROM luo 
GROUP BY language
ORDER BY count DESC
LIMIT 20;

-- 6. Check for common column name variations
-- Check if transcription column exists
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'luo'
  AND column_name IN ('sentence', 'transcription', 'text', 'content');

-- 7. Check audio_url column - see sample values
SELECT 
    id,
    audio_url,
    CASE 
        WHEN audio_url LIKE 'http%' THEN 'Full URL'
        WHEN audio_url LIKE '/%' THEN 'Path'
        WHEN audio_url IS NULL THEN 'NULL'
        ELSE 'Filename or other'
    END as url_type
FROM luo
LIMIT 20;

-- 8. Check if there are any indexes on status column
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'luo';

-- 9. Count records by status (including NULL)
SELECT 
    COALESCE(status::text, 'NULL') as status_value,
    COUNT(*) as count
FROM luo
GROUP BY status
ORDER BY count DESC;

