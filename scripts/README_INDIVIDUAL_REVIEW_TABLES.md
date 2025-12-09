# Individual Review Tables Setup Guide

This guide explains how to set up individual review tables for each language and add status columns to all language tables.

## Overview

Instead of using a unified `language_reviews` table, each language now has its own review table:
- `luo_reviews` (already exists)
- `somali_reviews` (new)
- `kalenjin_reviews` (new)
- `kikuyu_reviews` (new)
- `maasai_reviews` (new)

Additionally, all language tables now have a `status` column:
- `luo` (already has status)
- `somali` (status added)
- `kalenjin` (status added)
- `kikuyu` (status added)
- `maasai` (status added)

## Migration Steps

### Step 1: Add Status Columns
Run `033_add_status_to_language_tables.sql` to add `status` column to all language tables.

```sql
-- This will:
-- 1. Add status column to somali, kalenjin, kikuyu, maasai
-- 2. Set all existing records to 'pending'
-- 3. Add check constraints
-- 4. Create indexes for performance
```

### Step 2: Create Individual Review Tables
Run `034_create_language_review_tables.sql` to create review tables for each language.

```sql
-- This will:
-- 1. Ensure unique constraints on _id columns
-- 2. Create somali_reviews, kalenjin_reviews, kikuyu_reviews, maasai_reviews
-- 3. Add foreign key constraints
-- 4. Create indexes for performance
```

### Step 3: Migrate Existing Reviews (if any)
If you have existing reviews in `language_reviews`, run `035_migrate_to_individual_review_tables.sql` to migrate them.

```sql
-- This will:
-- 1. Copy reviews from language_reviews to individual tables
-- 2. Prevent duplicates
-- 3. Verify migration counts
```

## Script Execution Order

1. **First**: `033_add_status_to_language_tables.sql`
2. **Second**: `034_create_language_review_tables.sql`
3. **Third** (if needed): `035_migrate_to_individual_review_tables.sql`

## Table Structure

### Language Tables (with status column)

All language tables now have:
- `status` VARCHAR(20) NOT NULL DEFAULT 'pending'
- Check constraint: `status IN ('pending', 'approved', 'rejected')`
- Index on `status` column

**Note**: 
- `luo` table uses `id` (TEXT)
- Other tables (`somali`, `kalenjin`, `kikuyu`, `maasai`) use `_id` (TEXT)

### Review Tables Structure

Each review table has the same structure:

```sql
CREATE TABLE {language}_reviews (
    id UUID PRIMARY KEY,
    recording_id TEXT NOT NULL REFERENCES {language}(_id),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    decision VARCHAR(20) CHECK (decision IN ('approved', 'rejected')),
    notes TEXT,
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_spent INTEGER DEFAULT 0,
    UNIQUE (recording_id, reviewer_id)
);
```

## Verification Queries

### Check Status Columns

```sql
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('somali', 'kalenjin', 'kikuyu', 'maasai')
  AND column_name = 'status';
```

### Check Review Tables

```sql
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN (
    'luo_reviews', 
    'somali_reviews', 
    'kalenjin_reviews', 
    'kikuyu_reviews', 
    'maasai_reviews'
  )
ORDER BY table_name;
```

### Check Status Distribution

```sql
SELECT 
    'somali' as table_name,
    status,
    COUNT(*) as count
FROM somali
GROUP BY status
UNION ALL
SELECT 'kalenjin', status, COUNT(*) FROM kalenjin GROUP BY status
UNION ALL
SELECT 'kikuyu', status, COUNT(*) FROM kikuyu GROUP BY status
UNION ALL
SELECT 'maasai', status, COUNT(*) FROM maasai GROUP BY status
ORDER BY table_name, status;
```

## Code Updates Required

After running these scripts, you'll need to update your application code to:

1. **Use individual review tables** instead of `language_reviews`
   - `somali_reviews` for Somali recordings
   - `kalenjin_reviews` for Kalenjin recordings
   - `kikuyu_reviews` for Kikuyu recordings
   - `maasai_reviews` for Maasai recordings
   - `luo_reviews` for Luo recordings

2. **Query by status** in language tables:
   ```sql
   SELECT * FROM somali WHERE status = 'pending';
   ```

3. **Update status** when creating reviews:
   ```sql
   UPDATE somali SET status = 'approved' WHERE _id = '...';
   ```

## Benefits of Individual Review Tables

1. **Better Organization**: Each language has its own review table
2. **Simpler Queries**: No need to filter by `source_table`
3. **Better Performance**: Smaller tables, faster queries
4. **Clearer Structure**: Easier to understand and maintain
5. **Status Tracking**: All tables now have consistent status columns

## Rollback (if needed)

If you need to rollback:

1. **Drop individual review tables**:
   ```sql
   DROP TABLE IF EXISTS somali_reviews;
   DROP TABLE IF EXISTS kalenjin_reviews;
   DROP TABLE IF EXISTS kikuyu_reviews;
   DROP TABLE IF EXISTS maasai_reviews;
   ```

2. **Remove status columns** (optional):
   ```sql
   ALTER TABLE somali DROP COLUMN IF EXISTS status;
   ALTER TABLE kalenjin DROP COLUMN IF EXISTS status;
   ALTER TABLE kikuyu DROP COLUMN IF EXISTS status;
   ALTER TABLE maasai DROP COLUMN IF EXISTS status;
   ```

## Troubleshooting

### Issue: Foreign key constraint fails

**Solution**: Ensure unique constraints exist on `_id` columns:
```sql
-- Check if constraint exists
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'somali' 
  AND constraint_type = 'UNIQUE';
```

### Issue: Status column already exists

**Solution**: The script uses `ADD COLUMN IF NOT EXISTS`, so it's safe to run multiple times.

### Issue: Review table already exists

**Solution**: The script uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times.

## Next Steps

After running these scripts:

1. ✅ Verify all tables and columns were created
2. ✅ Update application code to use individual review tables
3. ✅ Test the validation workflow
4. ✅ Monitor for any issues

## Support

If you encounter issues:
1. Check the verification queries above
2. Review error messages in the SQL output
3. Ensure all prerequisites are met (unique constraints, etc.)

