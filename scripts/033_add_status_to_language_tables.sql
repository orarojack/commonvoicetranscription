-- ============================================================================
-- Add Status Column to All Language Tables
-- ============================================================================
-- This script adds a 'status' column to somali, kalenjin, kikuyu, and maasai tables
-- Note: luo table already has a status column
-- ============================================================================

-- ============================================================================
-- PART 1: Add status column to somali table
-- ============================================================================

-- Add status column if it doesn't exist
ALTER TABLE somali 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Add check constraint for status values
ALTER TABLE somali
DROP CONSTRAINT IF EXISTS somali_status_check;

ALTER TABLE somali
ADD CONSTRAINT somali_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing records to have 'pending' status if NULL
UPDATE somali 
SET status = 'pending' 
WHERE status IS NULL;

-- Make status NOT NULL (after setting defaults)
ALTER TABLE somali 
ALTER COLUMN status SET NOT NULL;

-- Create index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_somali_status ON somali(status);

-- Add comment
COMMENT ON COLUMN somali.status IS 'Recording status: pending (awaiting validation), approved (validated), rejected (invalid)';

-- ============================================================================
-- PART 2: Add status column to kalenjin table
-- ============================================================================

-- Add status column if it doesn't exist
ALTER TABLE kalenjin 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Add check constraint for status values
ALTER TABLE kalenjin
DROP CONSTRAINT IF EXISTS kalenjin_status_check;

ALTER TABLE kalenjin
ADD CONSTRAINT kalenjin_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing records to have 'pending' status if NULL
UPDATE kalenjin 
SET status = 'pending' 
WHERE status IS NULL;

-- Make status NOT NULL (after setting defaults)
ALTER TABLE kalenjin 
ALTER COLUMN status SET NOT NULL;

-- Create index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_kalenjin_status ON kalenjin(status);

-- Add comment
COMMENT ON COLUMN kalenjin.status IS 'Recording status: pending (awaiting validation), approved (validated), rejected (invalid)';

-- ============================================================================
-- PART 3: Add status column to kikuyu table
-- ============================================================================

-- Add status column if it doesn't exist
ALTER TABLE kikuyu 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Add check constraint for status values
ALTER TABLE kikuyu
DROP CONSTRAINT IF EXISTS kikuyu_status_check;

ALTER TABLE kikuyu
ADD CONSTRAINT kikuyu_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing records to have 'pending' status if NULL
UPDATE kikuyu 
SET status = 'pending' 
WHERE status IS NULL;

-- Make status NOT NULL (after setting defaults)
ALTER TABLE kikuyu 
ALTER COLUMN status SET NOT NULL;

-- Create index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_kikuyu_status ON kikuyu(status);

-- Add comment
COMMENT ON COLUMN kikuyu.status IS 'Recording status: pending (awaiting validation), approved (validated), rejected (invalid)';

-- ============================================================================
-- PART 4: Add status column to maasai table
-- ============================================================================

-- Add status column if it doesn't exist
ALTER TABLE maasai 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Add check constraint for status values
ALTER TABLE maasai
DROP CONSTRAINT IF EXISTS maasai_status_check;

ALTER TABLE maasai
ADD CONSTRAINT maasai_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing records to have 'pending' status if NULL
UPDATE maasai 
SET status = 'pending' 
WHERE status IS NULL;

-- Make status NOT NULL (after setting defaults)
ALTER TABLE maasai 
ALTER COLUMN status SET NOT NULL;

-- Create index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_maasai_status ON maasai(status);

-- Add comment
COMMENT ON COLUMN maasai.status IS 'Recording status: pending (awaiting validation), approved (validated), rejected (invalid)';

-- ============================================================================
-- PART 5: Verification Queries
-- ============================================================================

-- Check status column was added successfully
SELECT 
    'somali' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'somali'
  AND column_name = 'status'
UNION ALL
SELECT 
    'kalenjin' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'kalenjin'
  AND column_name = 'status'
UNION ALL
SELECT 
    'kikuyu' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'kikuyu'
  AND column_name = 'status'
UNION ALL
SELECT 
    'maasai' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'maasai'
  AND column_name = 'status';

-- Check status distribution
SELECT 
    'somali' as table_name,
    status,
    COUNT(*) as count
FROM somali
GROUP BY status
UNION ALL
SELECT 
    'kalenjin' as table_name,
    status,
    COUNT(*) as count
FROM kalenjin
GROUP BY status
UNION ALL
SELECT 
    'kikuyu' as table_name,
    status,
    COUNT(*) as count
FROM kikuyu
GROUP BY status
UNION ALL
SELECT 
    'maasai' as table_name,
    status,
    COUNT(*) as count
FROM maasai
GROUP BY status
ORDER BY table_name, status;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Status column added successfully to all language tables!';
    RAISE NOTICE 'Tables updated: somali, kalenjin, kikuyu, maasai';
    RAISE NOTICE 'All existing records set to "pending" status';
END $$;

