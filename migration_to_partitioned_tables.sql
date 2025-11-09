-- Migration Script: Convert recordings table to partitioned tables
-- This creates separate tables for pending, approved, and rejected recordings
-- while maintaining all existing functionality

-- ===========================================
-- STEP 1: Create new partitioned structure
-- ===========================================

-- Create pending_recordings table (same structure as recordings)
CREATE TABLE IF NOT EXISTS pending_recordings (
    LIKE recordings INCLUDING ALL,
    CONSTRAINT pending_recordings_status_check CHECK (status = 'pending')
);

-- Create approved_recordings table
CREATE TABLE IF NOT EXISTS approved_recordings (
    LIKE recordings INCLUDING ALL,
    CONSTRAINT approved_recordings_status_check CHECK (status = 'approved')
);

-- Create rejected_recordings table
CREATE TABLE IF NOT EXISTS rejected_recordings (
    LIKE recordings INCLUDING ALL,
    CONSTRAINT rejected_recordings_status_check CHECK (status = 'rejected')
);

-- ===========================================
-- STEP 2: Create indexes on new tables
-- ===========================================

-- Pending recordings indexes (most queried)
CREATE INDEX IF NOT EXISTS idx_pending_recordings_user_id ON pending_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_recordings_created_at ON pending_recordings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_recordings_user_created ON pending_recordings(user_id, created_at DESC);

-- Approved recordings indexes
CREATE INDEX IF NOT EXISTS idx_approved_recordings_user_id ON approved_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_approved_recordings_created_at ON approved_recordings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approved_recordings_reviewed_by ON approved_recordings(reviewed_by);

-- Rejected recordings indexes
CREATE INDEX IF NOT EXISTS idx_rejected_recordings_user_id ON rejected_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_rejected_recordings_created_at ON rejected_recordings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rejected_recordings_reviewed_by ON rejected_recordings(reviewed_by);

-- ===========================================
-- STEP 3: Create view for unified access (optional)
-- ===========================================

-- Create a view that combines all three tables
CREATE OR REPLACE VIEW all_recordings AS
SELECT * FROM pending_recordings
UNION ALL
SELECT * FROM approved_recordings
UNION ALL
SELECT * FROM rejected_recordings;

-- ===========================================
-- STEP 4: Create function to move recordings
-- ===========================================

CREATE OR REPLACE FUNCTION move_recording_to_status(
    p_recording_id UUID,
    p_new_status VARCHAR(20),
    p_reviewer_id UUID DEFAULT NULL,
    p_reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS VOID AS $$
DECLARE
    v_recording RECORD;
BEGIN
    -- Get the recording from appropriate table
    SELECT * INTO v_recording FROM pending_recordings WHERE id = p_recording_id;
    
    IF NOT FOUND THEN
        SELECT * INTO v_recording FROM approved_recordings WHERE id = p_recording_id;
    END IF;
    
    IF NOT FOUND THEN
        SELECT * INTO v_recording FROM rejected_recordings WHERE id = p_recording_id;
    END IF;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recording % not found', p_recording_id;
    END IF;
    
    -- Delete from current table
    DELETE FROM pending_recordings WHERE id = p_recording_id;
    DELETE FROM approved_recordings WHERE id = p_recording_id;
    DELETE FROM rejected_recordings WHERE id = p_recording_id;
    
    -- Insert into new table with updated status
    v_recording.status := p_new_status;
    IF p_reviewer_id IS NOT NULL THEN
        v_recording.reviewed_by := p_reviewer_id;
        v_recording.reviewed_at := p_reviewed_at;
    END IF;
    v_recording.updated_at := NOW();
    
    IF p_new_status = 'pending' THEN
        INSERT INTO pending_recordings VALUES (v_recording.*);
    ELSIF p_new_status = 'approved' THEN
        INSERT INTO approved_recordings VALUES (v_recording.*);
    ELSIF p_new_status = 'rejected' THEN
        INSERT INTO rejected_recordings VALUES (v_recording.*);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- STEP 5: Migrate existing data (run after testing!)
-- ===========================================

-- WARNING: Only run this after testing the structure!
-- Migrate pending recordings
-- INSERT INTO pending_recordings SELECT * FROM recordings WHERE status = 'pending';

-- Migrate approved recordings
-- INSERT INTO approved_recordings SELECT * FROM recordings WHERE status = 'approved';

-- Migrate rejected recordings
-- INSERT INTO rejected_recordings SELECT * FROM recordings WHERE status = 'rejected';

-- Verify counts match
-- SELECT 
--     (SELECT COUNT(*) FROM recordings WHERE status = 'pending') as old_pending,
--     (SELECT COUNT(*) FROM pending_recordings) as new_pending,
--     (SELECT COUNT(*) FROM recordings WHERE status = 'approved') as old_approved,
--     (SELECT COUNT(*) FROM approved_recordings) as new_approved,
--     (SELECT COUNT(*) FROM recordings WHERE status = 'rejected') as old_rejected,
--     (SELECT COUNT(*) FROM rejected_recordings) as new_rejected;

-- ===========================================
-- STEP 6: Update foreign key constraints
-- ===========================================

-- Update reviews table foreign key to work with all three tables
-- This requires dropping and recreating the FK constraint
-- ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_recording_id_fkey;
-- Note: PostgreSQL doesn't support FK to multiple tables directly
-- We'll need to use triggers or application-level checks

-- ===========================================
-- NOTES
-- ===========================================

/*
IMPLEMENTATION CONSIDERATIONS:

1. Foreign Keys: 
   - Reviews table references recordings.id
   - Need to ensure FK works across all three tables
   - Consider using a trigger function to check all tables

2. Application Code Changes:
   - Update all queries to use appropriate table
   - Use move_recording_to_status() function for status changes
   - Update getRecordingsByStatus() to query correct table

3. Rollback Plan:
   - Keep original recordings table as backup
   - Can recreate from view if needed

4. Performance:
   - Smaller tables = faster queries
   - Indexes are more efficient
   - No status filtering needed

5. Testing:
   - Test with small dataset first
   - Verify all CRUD operations work
   - Test concurrent access
*/

