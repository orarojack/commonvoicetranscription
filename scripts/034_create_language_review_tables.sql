-- ============================================================================
-- Create Individual Review Tables for Each Language
-- ============================================================================
-- This script creates separate review tables for each language:
-- - somali_reviews
-- - kalenjin_reviews
-- - kikuyu_reviews
-- - maasai_reviews
-- Note: luo_reviews already exists (created in script 027)
-- ============================================================================

-- ============================================================================
-- PART 1: Create somali_reviews table
-- ============================================================================

-- Step 1: Ensure somali._id has a unique constraint (required for foreign key)
DO $$
BEGIN
    -- Check if _id column is already a primary key
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'somali' 
        AND constraint_type = 'PRIMARY KEY'
        AND constraint_name LIKE '%_id%'
    ) THEN
        -- Check if there's already a unique constraint on _id
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'somali' 
            AND tc.constraint_type = 'UNIQUE'
            AND ccu.column_name = '_id'
        ) THEN
            -- Add unique constraint to _id column
            ALTER TABLE somali ADD CONSTRAINT somali_id_unique UNIQUE (_id);
            RAISE NOTICE 'Added unique constraint to somali._id';
        ELSE
            RAISE NOTICE 'somali._id already has a unique constraint';
        END IF;
    ELSE
        RAISE NOTICE 'somali._id is already a primary key';
    END IF;
END $$;

-- Step 2: Create somali_reviews table
-- NOTE: No foreign key on recording_id because recordings are deleted after review
-- Reviews should persist as historical records even after recording deletion
CREATE TABLE IF NOT EXISTS somali_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id TEXT NOT NULL, -- No foreign key - recording may be deleted
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected')),
    notes TEXT,
    transcript TEXT, -- The validated/edited transcript
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_spent INTEGER NOT NULL DEFAULT 0,
    
    -- Prevent duplicate reviews from the same reviewer for the same recording
    CONSTRAINT unique_somali_reviewer_recording UNIQUE (recording_id, reviewer_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_somali_reviews_recording_id ON somali_reviews(recording_id);
CREATE INDEX IF NOT EXISTS idx_somali_reviews_reviewer_id ON somali_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_somali_reviews_decision ON somali_reviews(decision);
CREATE INDEX IF NOT EXISTS idx_somali_reviews_created_at ON somali_reviews(created_at DESC);

-- Add comment to table
COMMENT ON TABLE somali_reviews IS 'Reviews for recordings in the somali table';

-- ============================================================================
-- PART 2: Create kalenjin_reviews table
-- ============================================================================

-- Step 1: Ensure kalenjin._id has a unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'kalenjin' 
        AND constraint_type = 'PRIMARY KEY'
        AND constraint_name LIKE '%_id%'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'kalenjin' 
            AND tc.constraint_type = 'UNIQUE'
            AND ccu.column_name = '_id'
        ) THEN
            ALTER TABLE kalenjin ADD CONSTRAINT kalenjin_id_unique UNIQUE (_id);
            RAISE NOTICE 'Added unique constraint to kalenjin._id';
        ELSE
            RAISE NOTICE 'kalenjin._id already has a unique constraint';
        END IF;
    ELSE
        RAISE NOTICE 'kalenjin._id is already a primary key';
    END IF;
END $$;

-- Step 2: Create kalenjin_reviews table
-- NOTE: No foreign key on recording_id because recordings are deleted after review
CREATE TABLE IF NOT EXISTS kalenjin_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id TEXT NOT NULL, -- No foreign key - recording may be deleted
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected')),
    notes TEXT,
    transcript TEXT, -- The validated/edited transcript
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_spent INTEGER NOT NULL DEFAULT 0,
    
    CONSTRAINT unique_kalenjin_reviewer_recording UNIQUE (recording_id, reviewer_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kalenjin_reviews_recording_id ON kalenjin_reviews(recording_id);
CREATE INDEX IF NOT EXISTS idx_kalenjin_reviews_reviewer_id ON kalenjin_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_kalenjin_reviews_decision ON kalenjin_reviews(decision);
CREATE INDEX IF NOT EXISTS idx_kalenjin_reviews_created_at ON kalenjin_reviews(created_at DESC);

COMMENT ON TABLE kalenjin_reviews IS 'Reviews for recordings in the kalenjin table';

-- ============================================================================
-- PART 3: Create kikuyu_reviews table
-- ============================================================================

-- Step 1: Ensure kikuyu._id has a unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'kikuyu' 
        AND constraint_type = 'PRIMARY KEY'
        AND constraint_name LIKE '%_id%'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'kikuyu' 
            AND tc.constraint_type = 'UNIQUE'
            AND ccu.column_name = '_id'
        ) THEN
            ALTER TABLE kikuyu ADD CONSTRAINT kikuyu_id_unique UNIQUE (_id);
            RAISE NOTICE 'Added unique constraint to kikuyu._id';
        ELSE
            RAISE NOTICE 'kikuyu._id already has a unique constraint';
        END IF;
    ELSE
        RAISE NOTICE 'kikuyu._id is already a primary key';
    END IF;
END $$;

-- Step 2: Create kikuyu_reviews table
-- NOTE: No foreign key on recording_id because recordings are deleted after review
CREATE TABLE IF NOT EXISTS kikuyu_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id TEXT NOT NULL, -- No foreign key - recording may be deleted
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected')),
    notes TEXT,
    transcript TEXT, -- The validated/edited transcript
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_spent INTEGER NOT NULL DEFAULT 0,
    
    CONSTRAINT unique_kikuyu_reviewer_recording UNIQUE (recording_id, reviewer_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kikuyu_reviews_recording_id ON kikuyu_reviews(recording_id);
CREATE INDEX IF NOT EXISTS idx_kikuyu_reviews_reviewer_id ON kikuyu_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_kikuyu_reviews_decision ON kikuyu_reviews(decision);
CREATE INDEX IF NOT EXISTS idx_kikuyu_reviews_created_at ON kikuyu_reviews(created_at DESC);

COMMENT ON TABLE kikuyu_reviews IS 'Reviews for recordings in the kikuyu table';

-- ============================================================================
-- PART 4: Create maasai_reviews table
-- ============================================================================

-- Step 1: Ensure maasai._id has a unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'maasai' 
        AND constraint_type = 'PRIMARY KEY'
        AND constraint_name LIKE '%_id%'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'maasai' 
            AND tc.constraint_type = 'UNIQUE'
            AND ccu.column_name = '_id'
        ) THEN
            ALTER TABLE maasai ADD CONSTRAINT maasai_id_unique UNIQUE (_id);
            RAISE NOTICE 'Added unique constraint to maasai._id';
        ELSE
            RAISE NOTICE 'maasai._id already has a unique constraint';
        END IF;
    ELSE
        RAISE NOTICE 'maasai._id is already a primary key';
    END IF;
END $$;

-- Step 2: Create maasai_reviews table
-- NOTE: No foreign key on recording_id because recordings are deleted after review
CREATE TABLE IF NOT EXISTS maasai_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id TEXT NOT NULL, -- No foreign key - recording may be deleted
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected')),
    notes TEXT,
    transcript TEXT, -- The validated/edited transcript
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_spent INTEGER NOT NULL DEFAULT 0,
    
    CONSTRAINT unique_maasai_reviewer_recording UNIQUE (recording_id, reviewer_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_maasai_reviews_recording_id ON maasai_reviews(recording_id);
CREATE INDEX IF NOT EXISTS idx_maasai_reviews_reviewer_id ON maasai_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_maasai_reviews_decision ON maasai_reviews(decision);
CREATE INDEX IF NOT EXISTS idx_maasai_reviews_created_at ON maasai_reviews(created_at DESC);

COMMENT ON TABLE maasai_reviews IS 'Reviews for recordings in the maasai table';

-- ============================================================================
-- PART 5: Verification Queries
-- ============================================================================

-- Check all review tables exist
SELECT 
    table_name,
    'exists' as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('luo_reviews', 'somali_reviews', 'kalenjin_reviews', 'kikuyu_reviews', 'maasai_reviews')
ORDER BY table_name;

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

-- Check constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public' 
  AND tc.table_name IN ('luo_reviews', 'somali_reviews', 'kalenjin_reviews', 'kikuyu_reviews', 'maasai_reviews')
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Review tables created successfully!';
    RAISE NOTICE 'Created tables: somali_reviews, kalenjin_reviews, kikuyu_reviews, maasai_reviews';
    RAISE NOTICE 'Note: luo_reviews already exists';
    RAISE NOTICE 'All tables have unique constraints to prevent duplicate reviews';
END $$;

