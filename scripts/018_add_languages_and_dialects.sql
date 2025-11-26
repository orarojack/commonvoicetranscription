-- Migration Script: Add Support for All Languages and Dialects
-- This script updates the language_dialect and accent_dialect columns to support all languages and their dialects

-- Step 1: Ensure language_dialect column exists (create if it doesn't)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS language_dialect VARCHAR(50);

-- Step 2: Ensure accent_dialect column exists (create if it doesn't)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS accent_dialect VARCHAR(50);

-- Step 3: Drop existing constraints if they exist
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_language_dialect_check;

ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_accent_dialect_check;

-- Step 4: Add new constraints with all supported dialects
-- Languages and Dialects:
-- Somali: Maxatiri
-- Luo: Nyanduat, Milambo
-- Maasai: Maasai, Samburu
-- Kalenjin: Nandi, Kipsigis
-- Kikuyu: KIRINYAGA (KI-NDIA & GI-GICHUGU), GI-KABETE (KIAMBU), KI-MURANGA, KI-MATHIRA

ALTER TABLE users 
ADD CONSTRAINT users_language_dialect_check 
CHECK (language_dialect IS NULL OR language_dialect IN (
  'Maxatiri',                    -- Somali
  'Nyanduat', 'Milambo',        -- Luo
  'Maasai', 'Samburu',          -- Maasai
  'Nandi', 'Kipsigis',          -- Kalenjin
  'KI-NDIA', 'GI-GICHUGU',      -- Kikuyu - Kirinyaga
  'GI-KABETE',                  -- Kikuyu - Kiambu
  'KI-MURANGA',                 -- Kikuyu - Muranga
  'KI-MATHIRA'                  -- Kikuyu - Nyeri
));

-- Step 5: Add constraint for accent_dialect (same dialects as language_dialect)
ALTER TABLE users 
ADD CONSTRAINT users_accent_dialect_check 
CHECK (accent_dialect IS NULL OR accent_dialect IN (
  'Maxatiri',                    -- Somali
  'Nyanduat', 'Milambo',        -- Luo
  'Maasai', 'Samburu',          -- Maasai
  'Nandi', 'Kipsigis',          -- Kalenjin
  'KI-NDIA', 'GI-GICHUGU',      -- Kikuyu - Kirinyaga
  'GI-KABETE',                  -- Kikuyu - Kiambu
  'KI-MURANGA',                 -- Kikuyu - Muranga
  'KI-MATHIRA'                  -- Kikuyu - Nyeri
));

-- Step 6: Ensure indexes exist for better query performance
CREATE INDEX IF NOT EXISTS idx_users_language_dialect ON users(language_dialect);
CREATE INDEX IF NOT EXISTS idx_users_accent_dialect ON users(accent_dialect);

-- Step 7: Update comments for documentation
COMMENT ON COLUMN users.language_dialect IS 'Dialect selection based on selected language. Supports: Somali (Maxatiri), Luo (Nyanduat, Milambo), Maasai (Maasai, Samburu), Kalenjin (Nandi, Kipsigis), Kikuyu (KI-NDIA, GI-GICHUGU, GI-KABETE, KI-MURANGA, KI-MATHIRA)';
COMMENT ON COLUMN users.accent_dialect IS 'Dialect selection for the user''s accent. Same dialects as language_dialect.';

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Updated language_dialect and accent_dialect constraints to support all languages and dialects';
    RAISE NOTICE 'Supported languages: Somali, Luo, Maasai, Kalenjin, Kikuyu';
END $$;

