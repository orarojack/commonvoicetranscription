# Fix: Missing language_reviews Table

## Error
```
Failed to load resource: the server responded with a status of 404
Could not find the table 'public.language_reviews' in the schema cache
```

## Problem

The code expects a unified `language_reviews` table that can store reviews for all language-specific tables (luo, somali, maasai, kalenjin, kikuyu) with a `source_table` column to track which table the recording belongs to.

However, this table doesn't exist in the database. Only the `luo_reviews` table exists from an earlier migration.

## Solution

### 1. Created Migration Script

**File**: `scripts/029_create_language_reviews_table.sql`

This script:
- Creates the `language_reviews` table with proper schema
- Includes `source_table` column to track language tables
- Migrates existing `luo_reviews` data to `language_reviews`
- Creates necessary indexes for performance
- Maintains backward compatibility

### 2. Updated Code with Fallback Logic

**File**: `lib/database.ts`

Updated methods to gracefully handle missing `language_reviews` table:

1. **`getReviewsByReviewer()`** - Falls back to `luo_reviews` if `language_reviews` doesn't exist
2. **`getReviewsByRecording()`** - Falls back to `luo_reviews` for luo recordings
3. **`createLanguageReview()`** - Falls back to `luo_reviews` when creating reviews for luo table

The fallback only works for `source_table = "luo"`. For other languages (somali, maasai, etc.), the migration must be run first.

## How to Apply the Fix

### Option 1: Run the Migration (Recommended)

Run the migration script in your Supabase SQL editor:

```sql
-- Run scripts/029_create_language_reviews_table.sql
```

This will:
- Create the `language_reviews` table
- Migrate existing `luo_reviews` data
- Enable support for all language tables

### Option 2: Use Fallback (Temporary)

The code now has fallback logic that will work with `luo_reviews` for luo language only. This is a temporary solution until the migration is run.

**Limitations:**
- Only works for `source_table = "luo"`
- Other languages (somali, maasai, etc.) will still fail until migration is run
- Not ideal for production

## Testing

After running the migration:

1. **Test reviewer functionality:**
   - Login as a reviewer
   - Navigate to `/listen`
   - Should load recordings without errors
   - Should be able to create reviews

2. **Verify table exists:**
   ```sql
   SELECT * FROM language_reviews LIMIT 10;
   ```

3. **Check data migration:**
   ```sql
   SELECT COUNT(*) FROM language_reviews WHERE source_table = 'luo';
   SELECT COUNT(*) FROM luo_reviews;
   -- These should match (if all luo_reviews were migrated)
   ```

## Schema

The `language_reviews` table structure:

```sql
CREATE TABLE language_reviews (
    id UUID PRIMARY KEY,
    source_table VARCHAR(50) NOT NULL,  -- 'luo', 'somali', 'maasai', etc.
    recording_id TEXT NOT NULL,
    reviewer_id UUID NOT NULL,
    decision VARCHAR(20) NOT NULL,      -- 'approved', 'rejected'
    notes TEXT,
    confidence INTEGER NOT NULL,
    time_spent INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE (source_table, recording_id, reviewer_id)
);
```

## Notes

- The fallback logic is backward compatible
- Existing `luo_reviews` data will be migrated automatically
- The migration is idempotent (safe to run multiple times)
- After migration, the fallback logic will no longer be needed but won't cause issues
