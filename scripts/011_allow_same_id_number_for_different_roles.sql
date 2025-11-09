-- Migration Script: Allow Same ID Number for Different Roles
-- This script removes the unique constraint on id_number to allow the same ID number
-- to be used for different roles (contributor and reviewer) when copying profile data

-- Step 1: Drop the existing unique constraint on id_number
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_number_key;

-- Step 2: Drop any unique index on id_number if it exists
DROP INDEX IF EXISTS idx_users_id_number_unique;

-- Step 3: Keep the non-unique index for performance (faster lookups)
-- This index remains for query performance but doesn't enforce uniqueness
-- The original index from 009_add_id_number_and_accent_dialect.sql was:
-- CREATE INDEX IF NOT EXISTS idx_users_id_number ON users(id_number);
-- So we keep that for performance, but remove uniqueness constraint

-- Note: This allows the same ID number to be used for multiple user accounts
-- which is necessary when copying profile data from contributor to reviewer accounts
-- for the same person (same email, different roles).

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Removed unique constraint on id_number';
    RAISE NOTICE 'Same person can now use their ID number for both contributor and reviewer accounts';
    RAISE NOTICE 'Profile copying will now work correctly for id_number field';
END $$;

