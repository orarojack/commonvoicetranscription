-- Create unified language_reviews table for storing reviews across all language tables
-- This table supports reviews for: luo, somali, maasai, kalenjin, kikuyu, etc.
-- The source_table column tracks which language table the recording belongs to

-- Step 1: Create language_reviews table
CREATE TABLE IF NOT EXISTS language_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_table VARCHAR(50) NOT NULL CHECK (source_table IN ('luo', 'somali', 'maasai', 'kalenjin', 'kikuyu', 'recordings')),
    recording_id TEXT NOT NULL,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected')),
    notes TEXT,
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    time_spent INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate reviews from the same reviewer for the same recording in the same source table
    CONSTRAINT unique_language_reviewer_recording UNIQUE (source_table, recording_id, reviewer_id)
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_language_reviews_source_table ON language_reviews(source_table);
CREATE INDEX IF NOT EXISTS idx_language_reviews_recording_id ON language_reviews(recording_id);
CREATE INDEX IF NOT EXISTS idx_language_reviews_reviewer_id ON language_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_language_reviews_decision ON language_reviews(decision);
CREATE INDEX IF NOT EXISTS idx_language_reviews_created_at ON language_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_language_reviews_source_recording ON language_reviews(source_table, recording_id);
CREATE INDEX IF NOT EXISTS idx_language_reviews_source_reviewer ON language_reviews(source_table, reviewer_id);

-- Step 3: Add comment to table
COMMENT ON TABLE language_reviews IS 'Unified reviews table for all language-specific recording tables (luo, somali, maasai, kalenjin, kikuyu, etc.)';

-- Step 4: Migrate existing luo_reviews data to language_reviews (if any exist)
-- This ensures backward compatibility
DO $$
BEGIN
    -- Check if luo_reviews table exists and has data
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'luo_reviews'
    ) THEN
        -- Migrate existing luo_reviews to language_reviews
        INSERT INTO language_reviews (
            source_table,
            recording_id,
            reviewer_id,
            decision,
            notes,
            confidence,
            time_spent,
            created_at
        )
        SELECT 
            'luo' as source_table,
            recording_id,
            reviewer_id,
            decision,
            notes,
            confidence,
            time_spent,
            created_at
        FROM luo_reviews
        WHERE NOT EXISTS (
            SELECT 1 
            FROM language_reviews lr
            WHERE lr.source_table = 'luo'
            AND lr.recording_id = luo_reviews.recording_id
            AND lr.reviewer_id = luo_reviews.reviewer_id
        )
        ON CONFLICT (source_table, recording_id, reviewer_id) DO NOTHING;
        
        RAISE NOTICE 'Migrated existing luo_reviews to language_reviews';
    END IF;
END $$;
