# Database Migration Guide

## Migration 009: Add ID Number and Accent Dialect

This migration adds the following enhancements to the users table:

### Changes:
1. **New Column: `id_number`** - VARCHAR(50), UNIQUE
   - Stores user's national ID number
   - Ensures uniqueness across all users
   - Indexed for fast lookups

2. **New Column: `accent_dialect`** - VARCHAR(50)
   - Stores user's accent dialect selection (Milambo or Nyanduat)
   - Required field with CHECK constraint
   - Helps in voice profiling and dataset categorization

3. **New Column: `accent_description`** - TEXT
   - Optional text field for detailed accent description
   - Allows users to provide additional context about their speaking style
   - Appears conditionally after selecting an accent dialect

4. **Updated Constraint: `employment_status`**
   - Added 'student' as a valid employment status option
   - Options now: employed, self-employed, student, unemployed

5. **New Indexes:**
   - `idx_users_id_number` - for faster ID number lookups
   - `idx_users_phone_number` - for faster phone number lookups

### How to Run the Migration:

#### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `009_add_id_number_and_accent_dialect.sql`
4. Paste it into the SQL Editor
5. Click "Run" to execute the migration

#### Option 2: Using Command Line
If you have direct PostgreSQL access:
```bash
psql -U your_username -d your_database -f scripts/009_add_id_number_and_accent_dialect.sql
```

### Verification:

After running the migration, verify the changes:

```sql
-- Check if columns were added
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('id_number', 'accent_dialect', 'accent_description');

-- Check if indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' 
AND indexname IN ('idx_users_id_number', 'idx_users_phone_number');

-- Check the updated constraint
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'users_employment_status_check';
```

### Rollback (if needed):

If you need to rollback this migration:

```sql
-- Remove the new columns
ALTER TABLE users DROP COLUMN IF EXISTS id_number;
ALTER TABLE users DROP COLUMN IF EXISTS accent_dialect;
ALTER TABLE users DROP COLUMN IF EXISTS accent_description;

-- Remove the indexes
DROP INDEX IF EXISTS idx_users_id_number;
DROP INDEX IF EXISTS idx_users_phone_number;

-- Restore the old employment_status constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_employment_status_check;
ALTER TABLE users ADD CONSTRAINT users_employment_status_check 
CHECK (employment_status IN ('employed', 'self-employed', 'unemployed'));
```

### Notes:
- This migration is **safe to run on existing data** - it only adds new columns and doesn't modify existing data
- The `id_number`, `accent_dialect`, and `accent_description` columns are nullable by default, so existing users won't be affected
- Users will be prompted to fill in their information when they next update their profile
- The unique constraint on `id_number` will prevent duplicate ID numbers from being registered
- The `accent_dialect` field has only 2 options: Milambo and Nyanduat
- The `accent_description` field is optional and appears after selecting a dialect

