-- Script to check luo table structure and sample data
-- This will help us understand the schema of the luo table

-- Check if luo table exists and get its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'luo'
ORDER BY ordinal_position;

-- Get sample data from luo table (first 5 rows)
SELECT * FROM luo LIMIT 5;

-- Count total records in luo table
SELECT COUNT(*) as total_records FROM luo;

-- Count records by status (if status column exists)
SELECT status, COUNT(*) as count 
FROM luo 
GROUP BY status;

-- Check for pending records (exact match)
SELECT COUNT(*) as pending_count_exact 
FROM luo 
WHERE status = 'pending';

-- Check for pending records (case-insensitive)
SELECT COUNT(*) as pending_count_ci 
FROM luo 
WHERE LOWER(status) = 'pending';

-- Check all distinct status values
SELECT DISTINCT status, COUNT(*) as count
FROM luo
GROUP BY status
ORDER BY count DESC;

-- Check if status column is NULL
SELECT COUNT(*) as null_status_count
FROM luo
WHERE status IS NULL;

-- Check sample records with different status values
SELECT id, status, language, audio_url, sentence, transcription
FROM luo
LIMIT 10;

