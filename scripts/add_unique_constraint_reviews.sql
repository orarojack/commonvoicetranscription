-- ============================================
-- Add Unique Constraint to Reviews Table
-- ============================================
-- 
-- This script adds a unique constraint on recording_id in the reviews table
-- to prevent duplicate reviews for the same recording.
--
-- IMPORTANT: Run remove_duplicate_reviews.ts FIRST to clean up existing duplicates
-- before applying this constraint, otherwise the constraint creation will fail.
--
-- Usage:
--   1. First, remove existing duplicates:
--      npx tsx scripts/remove_duplicate_reviews.ts
--
--   2. Then, run this SQL script in your Supabase SQL editor or via psql:
--      psql -U postgres -d your_database -f scripts/add_unique_constraint_reviews.sql
--
-- ============================================

-- Step 1: Check for existing duplicates before adding constraint
-- If this query returns any rows, you need to remove duplicates first
SELECT 
    recording_id, 
    COUNT(*) as review_count
FROM reviews
GROUP BY recording_id
HAVING COUNT(*) > 1;

-- Step 2: Add unique constraint on recording_id
-- This will prevent future duplicate reviews
-- Note: This will fail if duplicates still exist in the database
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'reviews_recording_id_unique'
    ) THEN
        -- Add unique constraint
        ALTER TABLE reviews 
        ADD CONSTRAINT reviews_recording_id_unique 
        UNIQUE (recording_id);
        
        RAISE NOTICE 'Unique constraint added successfully';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- Step 3: Verify constraint was created
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'reviews'::regclass
AND conname = 'reviews_recording_id_unique';

-- Step 4: Create index for better query performance (if not already exists)
CREATE INDEX IF NOT EXISTS idx_reviews_recording_id_unique 
ON reviews(recording_id);

-- ============================================
-- Notes:
-- ============================================
-- After adding this constraint:
-- - Any attempt to insert a duplicate review will fail with a unique constraint violation
-- - The application code should handle this error gracefully
-- - The createReview function already checks for duplicates, but this provides
--   database-level protection as a safety net
-- ============================================

