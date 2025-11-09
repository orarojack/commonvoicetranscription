-- Sync language_dialect from accent_dialect for existing users
-- This is for users who entered accent_dialect before we made both fields sync

-- Update users who have accent_dialect but no language_dialect
UPDATE users
SET language_dialect = accent_dialect
WHERE accent_dialect IS NOT NULL 
  AND accent_dialect != ''
  AND (language_dialect IS NULL OR language_dialect = '');

-- Also update users who have language_dialect but no accent_dialect (just in case)
UPDATE users
SET accent_dialect = language_dialect
WHERE language_dialect IS NOT NULL 
  AND language_dialect != ''
  AND (accent_dialect IS NULL OR accent_dialect = '');

-- Verify the update
SELECT 
  id,
  name,
  language_dialect,
  accent_dialect,
  CASE 
    WHEN language_dialect = accent_dialect THEN 'Synced'
    WHEN language_dialect IS NULL AND accent_dialect IS NULL THEN 'Both Empty'
    ELSE 'Mismatch'
  END as sync_status
FROM users
WHERE language_dialect IS NOT NULL OR accent_dialect IS NOT NULL
LIMIT 20;

