-- Remove PROMPT_COLLECTION/ prefix from audio paths in all language tables
-- This script updates mediaPathId (new schema) and audio_url (old schema) columns

-- ============================================================================
-- NEW SCHEMA TABLES (somali, kalenjin, kikuyu, maasai)
-- These tables use 'mediaPathId' column
-- ============================================================================

-- Update somali table
-- Using SUBSTRING to only remove prefix from the start (safer than REPLACE)
UPDATE somali
SET "mediaPathId" = SUBSTRING("mediaPathId" FROM LENGTH('PROMPT_COLLECTION/') + 1)
WHERE "mediaPathId" LIKE 'PROMPT_COLLECTION/%';

-- Alternative simpler version (if you prefer):
-- UPDATE somali
-- SET "mediaPathId" = REPLACE("mediaPathId", 'PROMPT_COLLECTION/', '')
-- WHERE "mediaPathId" LIKE 'PROMPT_COLLECTION/%';

-- Update kalenjin table
UPDATE kalenjin
SET "mediaPathId" = SUBSTRING("mediaPathId" FROM LENGTH('PROMPT_COLLECTION/') + 1)
WHERE "mediaPathId" LIKE 'PROMPT_COLLECTION/%';

-- Update kikuyu table
UPDATE kikuyu
SET "mediaPathId" = SUBSTRING("mediaPathId" FROM LENGTH('PROMPT_COLLECTION/') + 1)
WHERE "mediaPathId" LIKE 'PROMPT_COLLECTION/%';

-- Update maasai table
UPDATE maasai
SET "mediaPathId" = SUBSTRING("mediaPathId" FROM LENGTH('PROMPT_COLLECTION/') + 1)
WHERE "mediaPathId" LIKE 'PROMPT_COLLECTION/%';

-- ============================================================================
-- OLD SCHEMA TABLE (luo)
-- This table uses 'audio_url' column
-- Only update if it's not a full URL (http/https) and starts with PROMPT_COLLECTION/
-- ============================================================================

UPDATE luo
SET audio_url = SUBSTRING(audio_url FROM LENGTH('PROMPT_COLLECTION/') + 1)
WHERE audio_url LIKE 'PROMPT_COLLECTION/%'
  AND audio_url NOT LIKE 'http%'
  AND audio_url NOT LIKE 'https%';

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to check how many records were updated
-- ============================================================================

-- Check somali table
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN "mediaPathId" LIKE 'PROMPT_COLLECTION/%' THEN 1 END) as still_has_prefix,
    COUNT(CASE WHEN "mediaPathId" NOT LIKE 'PROMPT_COLLECTION/%' AND "mediaPathId" IS NOT NULL THEN 1 END) as prefix_removed
FROM somali;

-- Check kalenjin table
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN "mediaPathId" LIKE 'PROMPT_COLLECTION/%' THEN 1 END) as still_has_prefix,
    COUNT(CASE WHEN "mediaPathId" NOT LIKE 'PROMPT_COLLECTION/%' AND "mediaPathId" IS NOT NULL THEN 1 END) as prefix_removed
FROM kalenjin;

-- Check kikuyu table
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN "mediaPathId" LIKE 'PROMPT_COLLECTION/%' THEN 1 END) as still_has_prefix,
    COUNT(CASE WHEN "mediaPathId" NOT LIKE 'PROMPT_COLLECTION/%' AND "mediaPathId" IS NOT NULL THEN 1 END) as prefix_removed
FROM kikuyu;

-- Check maasai table
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN "mediaPathId" LIKE 'PROMPT_COLLECTION/%' THEN 1 END) as still_has_prefix,
    COUNT(CASE WHEN "mediaPathId" NOT LIKE 'PROMPT_COLLECTION/%' AND "mediaPathId" IS NOT NULL THEN 1 END) as prefix_removed
FROM maasai;

-- Check luo table
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN audio_url LIKE 'PROMPT_COLLECTION/%' AND audio_url NOT LIKE 'http%' THEN 1 END) as still_has_prefix,
    COUNT(CASE WHEN audio_url NOT LIKE 'PROMPT_COLLECTION/%' AND audio_url IS NOT NULL THEN 1 END) as prefix_removed
FROM luo;

-- ============================================================================
-- SAMPLE QUERIES - Check a few records to verify the update
-- ============================================================================

-- Sample from somali table
SELECT _id, "mediaPathId", language
FROM somali
WHERE "mediaPathId" IS NOT NULL
LIMIT 10;

-- Sample from luo table
SELECT id, audio_url, language
FROM luo
WHERE audio_url IS NOT NULL
  AND audio_url NOT LIKE 'http%'
LIMIT 10;

