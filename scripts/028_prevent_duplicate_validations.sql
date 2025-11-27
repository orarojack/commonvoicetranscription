-- SQL Script to Prevent Validators from Validating the Same Recording Twice
-- This script ensures data integrity and prevents duplicate validations

-- ============================================================================
-- PART 1: Ensure Unique Constraint Exists (Prevents Duplicate Reviews)
-- ============================================================================
-- The luo_reviews table should already have this, but we'll verify and add if missing

DO $$
BEGIN
    -- Check if unique constraint exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'luo_reviews' 
        AND constraint_name = 'unique_luo_reviewer_recording'
    ) THEN
        -- Add unique constraint to prevent same reviewer reviewing same recording twice
        ALTER TABLE luo_reviews 
        ADD CONSTRAINT unique_luo_reviewer_recording 
        UNIQUE (recording_id, reviewer_id);
        
        RAISE NOTICE 'Added unique constraint: unique_luo_reviewer_recording';
    ELSE
        RAISE NOTICE 'Unique constraint unique_luo_reviewer_recording already exists';
    END IF;
END $$;

-- ============================================================================
-- PART 2: Create Function to Check if Recording is Already Reviewed
-- ============================================================================
-- This function can be used in application code to check before showing recordings

CREATE OR REPLACE FUNCTION is_recording_reviewed_by_user(
    p_recording_id TEXT,
    p_reviewer_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM luo_reviews 
        WHERE recording_id = p_recording_id 
        AND reviewer_id = p_reviewer_id
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment
COMMENT ON FUNCTION is_recording_reviewed_by_user IS 'Checks if a recording has already been reviewed by a specific reviewer';

-- ============================================================================
-- PART 3: Create View to Get Only Unreviewed Recordings for a Reviewer
-- ============================================================================
-- This view filters out recordings that a specific reviewer has already reviewed

CREATE OR REPLACE VIEW luo_unreviewed_for_reviewer AS
SELECT 
    l.*,
    u.id as reviewer_id
FROM luo l
CROSS JOIN users u
WHERE u.role = 'reviewer'
AND NOT EXISTS (
    SELECT 1 
    FROM luo_reviews lr 
    WHERE lr.recording_id = l.id 
    AND lr.reviewer_id = u.id
)
AND l.status = 'pending';

-- Add comment
COMMENT ON VIEW luo_unreviewed_for_reviewer IS 'Shows pending recordings that each reviewer has not yet reviewed';

-- ============================================================================
-- PART 4: Create Trigger to Automatically Update Status When Review is Created
-- ============================================================================
-- This ensures the luo table status is always in sync with the review decision

CREATE OR REPLACE FUNCTION update_luo_status_on_review()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the luo table status based on the review decision
    UPDATE luo
    SET 
        status = CASE 
            WHEN NEW.decision = 'approved' THEN 'approved'
            WHEN NEW.decision = 'rejected' THEN 'rejected'
            ELSE status
        END,
        reviewed_by = NEW.reviewer_id,
        reviewed_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.recording_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_luo_status_on_review ON luo_reviews;
CREATE TRIGGER trigger_update_luo_status_on_review
    AFTER INSERT ON luo_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_luo_status_on_review();

-- Add comment
COMMENT ON FUNCTION update_luo_status_on_review IS 'Automatically updates luo table status when a review is created';

-- ============================================================================
-- PART 5: Create Index to Speed Up "Already Reviewed" Queries
-- ============================================================================
-- This index helps quickly check if a recording has been reviewed

CREATE INDEX IF NOT EXISTS idx_luo_reviews_recording_reviewer 
ON luo_reviews(recording_id, reviewer_id);

-- ============================================================================
-- PART 6: Create Function to Get Recordings Excluding Reviewed Ones
-- ============================================================================
-- This function returns pending recordings that a reviewer hasn't reviewed yet

CREATE OR REPLACE FUNCTION get_unreviewed_luo_recordings(
    p_reviewer_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_language TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    sentence TEXT,
    cleaned_transcript TEXT,
    actualSentence TEXT,
    audio_url TEXT,
    mediaPathId TEXT,
    duration DOUBLE PRECISION,
    status VARCHAR,
    language TEXT,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.sentence,
        l.cleaned_transcript,
        l."actualSentence",
        l.audio_url,
        l."mediaPathId",
        l.duration,
        l.status,
        l.language,
        l.user_id,
        l.created_at,
        l.updated_at
    FROM luo l
    WHERE l.status = 'pending'
    AND NOT EXISTS (
        SELECT 1 
        FROM luo_reviews lr 
        WHERE lr.recording_id = l.id 
        AND lr.reviewer_id = p_reviewer_id
    )
    AND (p_language IS NULL OR l.language ILIKE '%' || p_language || '%')
    ORDER BY l.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment
COMMENT ON FUNCTION get_unreviewed_luo_recordings IS 'Returns pending recordings that a specific reviewer has not yet reviewed, optionally filtered by language';

-- ============================================================================
-- PART 7: Add Check to Prevent Reviewing Non-Pending Recordings
-- ============================================================================
-- This ensures reviewers can only review recordings that are still pending

CREATE OR REPLACE FUNCTION check_recording_status_before_review()
RETURNS TRIGGER AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    -- Get the current status of the recording
    SELECT status INTO v_status
    FROM luo
    WHERE id = NEW.recording_id;
    
    -- Only allow reviewing if status is 'pending'
    -- Note: We allow reviewing even if status is already approved/rejected
    -- because multiple reviewers might review the same recording
    -- But you can uncomment the check below if you want strict pending-only reviews
    
    -- IF v_status != 'pending' THEN
    --     RAISE EXCEPTION 'Cannot review recording with status: %. Only pending recordings can be reviewed.', v_status;
    -- END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (optional - uncomment if you want strict pending-only reviews)
-- DROP TRIGGER IF EXISTS trigger_check_recording_status_before_review ON luo_reviews;
-- CREATE TRIGGER trigger_check_recording_status_before_review
--     BEFORE INSERT ON luo_reviews
--     FOR EACH ROW
--     EXECUTE FUNCTION check_recording_status_before_review();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test the unique constraint (should fail if trying to insert duplicate)
-- INSERT INTO luo_reviews (recording_id, reviewer_id, decision, confidence, time_spent)
-- VALUES ('test_id', '00000000-0000-0000-0000-000000000000', 'approved', 90, 10);
-- INSERT INTO luo_reviews (recording_id, reviewer_id, decision, confidence, time_spent)
-- VALUES ('test_id', '00000000-0000-0000-0000-000000000000', 'approved', 90, 10);
-- This second insert should fail with a unique constraint violation

-- Check if a specific recording is reviewed by a specific reviewer
-- SELECT is_recording_reviewed_by_user('recording_id_here', 'reviewer_uuid_here');

-- Get unreviewed recordings for a reviewer
-- SELECT * FROM get_unreviewed_luo_recordings('reviewer_uuid_here', 10, 'Luo');

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This script provides:
-- 1. Unique constraint to prevent duplicate reviews (database level)
-- 2. Helper function to check if recording is already reviewed
-- 3. View to see unreviewed recordings per reviewer
-- 4. Trigger to automatically update luo.status when review is created
-- 5. Index for faster "already reviewed" queries
-- 6. Function to get unreviewed recordings for a reviewer
-- 7. Optional trigger to prevent reviewing non-pending recordings

