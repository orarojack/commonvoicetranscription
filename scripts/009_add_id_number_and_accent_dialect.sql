-- Migration Script: Add ID Number and Accent Dialect fields
-- This script adds new fields to the users table for better user identification and voice profiling

-- Add id_number column (unique identifier for users)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS id_number VARCHAR(50) UNIQUE;

-- Add accent_dialect column (to select user's accent dialect)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS accent_dialect VARCHAR(50) CHECK (accent_dialect IN ('Milambo', 'Nyanduat'));

-- Add accent_description column (optional text description of accent)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS accent_description TEXT;

-- Update employment_status constraint to include 'student' if not already there
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_employment_status_check;

ALTER TABLE users 
ADD CONSTRAINT users_employment_status_check 
CHECK (employment_status IN ('employed', 'self-employed', 'student', 'unemployed'));

-- Create index on id_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_id_number ON users(id_number);

-- Create index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

-- Add comments for documentation
COMMENT ON COLUMN users.id_number IS 'National ID number - unique identifier for each user';
COMMENT ON COLUMN users.accent_dialect IS 'Dialect selection for the user''s accent (Milambo or Nyanduat)';
COMMENT ON COLUMN users.accent_description IS 'Optional text description of the user''s accent or speaking style';

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Added columns: id_number, accent_dialect, accent_description';
    RAISE NOTICE 'Updated employment_status constraint to include student';
    RAISE NOTICE 'Created indexes on id_number and phone_number';
END $$;

