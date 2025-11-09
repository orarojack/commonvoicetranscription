-- Migration Script: Reset All Data While Keeping Admin Accounts
-- This script deletes all recordings, reviews, and non-admin users
-- while preserving admin credentials for fresh start
-- 
-- ⚠️ WARNING: This will permanently delete all user data and recordings!
-- ⚠️ Only run this if you want to start fresh with a clean database!
-- 
-- SAFETY: This script preserves all admin accounts (role = 'admin')

BEGIN;

-- Step 1: Display current counts before deletion (for verification)
DO $$
DECLARE
    admin_count INTEGER;
    user_count INTEGER;
    recording_count INTEGER;
    review_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    SELECT COUNT(*) INTO user_count FROM users WHERE role != 'admin';
    SELECT COUNT(*) INTO recording_count FROM recordings;
    SELECT COUNT(*) INTO review_count FROM reviews;
    
    RAISE NOTICE '=== BEFORE DELETION ===';
    RAISE NOTICE 'Admin accounts: %', admin_count;
    RAISE NOTICE 'Non-admin users: %', user_count;
    RAISE NOTICE 'Recordings: %', recording_count;
    RAISE NOTICE 'Reviews: %', review_count;
END $$;

-- Step 2: Delete all files from Supabase Storage buckets
-- This deletes actual audio files stored in the 'recordings' bucket
-- Note: This requires the storage admin API or we need to use the Supabase Dashboard
DO $$
DECLARE
    storage_files_count INTEGER;
BEGIN
    -- Count files in storage (if accessible via SQL)
    SELECT COUNT(*) INTO storage_files_count 
    FROM storage.objects 
    WHERE bucket_id = 'recordings' OR bucket_id = 'audio-recordings';
    
    -- Try to delete files from storage
    -- Note: This may require service_role permissions
    DELETE FROM storage.objects 
    WHERE bucket_id = 'recordings' OR bucket_id = 'audio-recordings';
    
    RAISE NOTICE 'Storage files deleted (if accessible): %', storage_files_count;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE WARNING 'Could not delete storage files via SQL. You need to delete them manually from Supabase Dashboard or use Storage API.';
    WHEN OTHERS THEN
        RAISE WARNING 'Storage deletion may have failed. Check Supabase Dashboard Storage section to delete files manually.';
END $$;

-- Step 3: Delete all reviews first (they reference recordings and users)
-- This must be done before deleting recordings/users to avoid foreign key issues
DELETE FROM reviews;

-- Step 4: Clear reviewed_by references in recordings (set to NULL)
-- This prevents issues when deleting users
UPDATE recordings 
SET reviewed_by = NULL, reviewed_at = NULL 
WHERE reviewed_by IS NOT NULL;

-- Step 5: Delete all recordings (they reference users via user_id with CASCADE)
-- Since we're deleting recordings explicitly, CASCADE will handle user deletions
-- But we want to keep admins, so we'll delete recordings first
DELETE FROM recordings;

-- Step 6: Delete all non-admin users (contributors and reviewers)
-- This deletes users where role != 'admin'
DELETE FROM users 
WHERE role != 'admin';

-- Step 7: Verify deletion and show remaining data
DO $$
DECLARE
    remaining_admin_count INTEGER;
    remaining_user_count INTEGER;
    remaining_recording_count INTEGER;
    remaining_review_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_admin_count FROM users WHERE role = 'admin';
    SELECT COUNT(*) INTO remaining_user_count FROM users WHERE role != 'admin';
    SELECT COUNT(*) INTO remaining_recording_count FROM recordings;
    SELECT COUNT(*) INTO remaining_review_count FROM reviews;
    
    RAISE NOTICE '=== AFTER DELETION ===';
    RAISE NOTICE 'Admin accounts preserved: %', remaining_admin_count;
    RAISE NOTICE 'Non-admin users remaining: % (should be 0)', remaining_user_count;
    RAISE NOTICE 'Recordings remaining: % (should be 0)', remaining_recording_count;
    RAISE NOTICE 'Reviews remaining: % (should be 0)', remaining_review_count;
    
    IF remaining_user_count > 0 OR remaining_recording_count > 0 OR remaining_review_count > 0 THEN
        RAISE WARNING 'Some data still remains! Please check manually.';
    ELSE
        RAISE NOTICE '✅ All data deleted successfully! Only admin accounts remain.';
    END IF;
END $$;

-- Commit the transaction
COMMIT;

-- Final message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database reset complete!';
    RAISE NOTICE 'All recordings, reviews, and non-admin users have been deleted.';
    RAISE NOTICE 'Admin accounts have been preserved.';
    RAISE NOTICE 'Users can now create fresh accounts from scratch.';
    RAISE NOTICE '========================================';
END $$;

