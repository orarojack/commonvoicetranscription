-- Migration to allow same email for different roles
-- This script removes the unique constraint on email alone
-- and adds a composite unique constraint on (email, role)

-- Step 1: Drop the existing unique constraint on email
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Step 2: Add a composite unique constraint on email + role
-- This allows the same email to be used for different roles
-- but prevents duplicate email+role combinations
ALTER TABLE users 
ADD CONSTRAINT users_email_role_unique UNIQUE (email, role);

-- Add index for better query performance on email lookups
CREATE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role);

-- This migration enables:
-- ✓ user@example.com can be both a contributor AND a reviewer
-- ✗ user@example.com cannot be a contributor twice
-- ✗ user@example.com cannot be a reviewer twice

