-- Create luo_reviews table for storing reviews of luo table recordings
-- The luo table uses TEXT for id, not UUID, so we need a separate reviews table

-- Step 1: Ensure luo.id has a unique constraint (required for foreign key)
-- Check if id is already a primary key or has unique constraint
DO $$
BEGIN
    -- Check if id column is already a primary key
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'luo' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        -- Check if there's already a unique constraint on id
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'luo' 
            AND tc.constraint_type = 'UNIQUE'
            AND ccu.column_name = 'id'
        ) THEN
            -- Add unique constraint to id column
            ALTER TABLE luo ADD CONSTRAINT luo_id_unique UNIQUE (id);
            RAISE NOTICE 'Added unique constraint to luo.id';
        ELSE
            RAISE NOTICE 'luo.id already has a unique constraint';
        END IF;
    ELSE
        RAISE NOTICE 'luo.id is already a primary key';
    END IF;
END $$;

-- Step 2: Create luo_reviews table with foreign key reference
CREATE TABLE IF NOT EXISTS luo_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id TEXT NOT NULL REFERENCES luo(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected')),
    notes TEXT,
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_spent INTEGER NOT NULL DEFAULT 0,
    
    -- Prevent duplicate reviews from the same reviewer for the same recording
    CONSTRAINT unique_luo_reviewer_recording UNIQUE (recording_id, reviewer_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_luo_reviews_recording_id ON luo_reviews(recording_id);
CREATE INDEX IF NOT EXISTS idx_luo_reviews_reviewer_id ON luo_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_luo_reviews_decision ON luo_reviews(decision);
CREATE INDEX IF NOT EXISTS idx_luo_reviews_created_at ON luo_reviews(created_at DESC);

-- Add comment to table
COMMENT ON TABLE luo_reviews IS 'Reviews for recordings in the luo table';

