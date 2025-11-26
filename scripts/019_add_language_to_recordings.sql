-- Migration Script: Add Language Field to Recordings
-- This script adds a language field to the recordings table so recordings can be filtered by language

-- Step 1: Add language column to recordings table
ALTER TABLE recordings 
ADD COLUMN IF NOT EXISTS language VARCHAR(50);

-- Step 2: Create index for better query performance when filtering by language
CREATE INDEX IF NOT EXISTS idx_recordings_language ON recordings(language);

-- Step 3: Update comment for documentation
COMMENT ON COLUMN recordings.language IS 'Language of the recording (e.g., Somali, Luo, Maasai, Kalenjin, Kikuyu). Used to filter recordings for validators based on their selected language.';

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Added language column to recordings table';
    RAISE NOTICE 'Created index on language for better query performance';
END $$;


