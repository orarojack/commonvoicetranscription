# Review Workflow - Complete Guide

## Overview

When a validator reviews a recording, the review is stored in the appropriate review table based on the language:

- **Luo** recordings → `luo_reviews` table
- **Somali** recordings → `somali_reviews` table
- **Kalenjin** recordings → `kalenjin_reviews` table
- **Kikuyu** recordings → `kikuyu_reviews` table
- **Maasai** recordings → `maasai_reviews` table

After validation, the recording is **deleted** from the language table, leaving only pending recordings for validators to review.

## Workflow Steps

### 1. Validator Reviews a Recording

When a validator clicks "Yes" (Approve) or "No" (Reject):

**If "Yes" (Approve):**
- Validator **must** review/edit the transcription (field is required)
- Can edit the transcription or keep as-is if correct
- Review is created with `decision: "approved"`

**If "No" (Reject):**
- Validator **must** provide a rejection reason (field is required)
- Review is created with `decision: "rejected"`

### 2. Review is Stored

The review is automatically stored in the correct review table:
- Code maps `source_table` (e.g., "maasai") → review table (e.g., "maasai_reviews")
- Review includes:
  - `recording_id`: The ID of the recording that was reviewed
  - `reviewer_id`: The validator who reviewed it
  - `decision`: "approved" or "rejected"
  - `notes`: Transcription details (edited text, corrections, or rejection reason)
  - `confidence`: Confidence level (80-100 for approved, 0 for rejected)
  - `time_spent`: Time taken to review (in seconds)
  - `created_at`: Timestamp of when review was created

### 3. Recording is Deleted

After the review is successfully created:
- The recording is **deleted** from the source language table (e.g., `maasai` table)
- This ensures only **pending** recordings remain in language tables
- The review persists in the review table as a historical record

## Database Schema

### Review Tables Structure

All review tables have the same structure:

```sql
CREATE TABLE {language}_reviews (
    id UUID PRIMARY KEY,
    recording_id TEXT NOT NULL,  -- No foreign key (recording may be deleted)
    reviewer_id UUID REFERENCES users(id),
    decision VARCHAR(20) CHECK (decision IN ('approved', 'rejected')),
    notes TEXT,  -- Contains transcription details or rejection reason
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_spent INTEGER DEFAULT 0,
    UNIQUE (recording_id, reviewer_id)  -- Prevents duplicate reviews
);
```

**Important Notes:**
- **No foreign key on `recording_id`**: Recordings are deleted after review, so reviews must persist independently
- **Unique constraint**: Prevents the same reviewer from reviewing the same recording twice
- **Historical records**: Reviews remain even after recordings are deleted

## Setup Instructions

### Step 1: Create Review Tables

Run `scripts/034_create_language_review_tables.sql` to create:
- `somali_reviews`
- `kalenjin_reviews`
- `kikuyu_reviews`
- `maasai_reviews`

Note: `luo_reviews` should already exist.

### Step 2: Add Status Columns

Run `scripts/033_add_status_to_language_tables.sql` to add `status` column to:
- `somali`
- `kalenjin`
- `kikuyu`
- `maasai`

### Step 3: Remove Foreign Key Constraints (if tables already exist)

If you created the review tables before, run `scripts/039_fix_review_table_foreign_keys.sql` to remove foreign key constraints that prevent storing reviews for deleted recordings.

### Step 4: Migrate Existing Reviews (if any)

If you have reviews in `language_reviews`, run:
- `scripts/035_migrate_to_individual_review_tables.sql` - Migrates all reviews
- `scripts/038_migrate_maasai_review.sql` - Migrates specific maasai reviews

## Verification Queries

### Check Reviews by Language

```sql
-- Count reviews in each table
SELECT 'luo_reviews' as table_name, COUNT(*) as count FROM luo_reviews
UNION ALL
SELECT 'somali_reviews', COUNT(*) FROM somali_reviews
UNION ALL
SELECT 'kalenjin_reviews', COUNT(*) FROM kalenjin_reviews
UNION ALL
SELECT 'kikuyu_reviews', COUNT(*) FROM kikuyu_reviews
UNION ALL
SELECT 'maasai_reviews', COUNT(*) FROM maasai_reviews;
```

### View Recent Reviews

```sql
-- Recent maasai reviews
SELECT 
    recording_id,
    reviewer_id,
    decision,
    notes,
    created_at
FROM maasai_reviews
ORDER BY created_at DESC
LIMIT 10;
```

### Check Pending Recordings

```sql
-- Pending maasai recordings (should not include reviewed ones)
SELECT COUNT(*) as pending_count
FROM maasai
WHERE status = 'pending';
```

## Troubleshooting

### Issue: Review not appearing in review table

**Check:**
1. Browser console for error messages
2. Verify the table exists: `SELECT * FROM {language}_reviews LIMIT 1;`
3. Check if foreign key constraint is blocking: Run `scripts/039_fix_review_table_foreign_keys.sql`

### Issue: Foreign key constraint error

**Solution:** Run `scripts/039_fix_review_table_foreign_keys.sql` to remove foreign key constraints.

### Issue: Recording still in language table after review

**Check:**
1. Browser console for deletion errors
2. Verify the recording ID matches the column name (`_id` for new schema, `id` for luo)
3. Check if deletion is being skipped due to errors

## Code Flow

1. **Validation submitted** → `handleValidation()` in `app/listen/page.tsx`
2. **Review created** → `createLanguageReview()` in `lib/database.ts`
3. **Table mapping** → Maps `source_table` to review table name
4. **Insert review** → Inserts into appropriate review table
5. **Delete recording** → Removes recording from language table

## Benefits

✅ **Clean separation**: Validated recordings removed from pending queues  
✅ **Historical records**: Reviews persist even after recording deletion  
✅ **No duplicates**: Unique constraint prevents same reviewer reviewing twice  
✅ **Language-specific**: Each language has its own review table  
✅ **Status tracking**: All language tables have consistent status columns  

## Summary

- ✅ Reviews are stored in individual review tables (`{language}_reviews`)
- ✅ Recordings are deleted from language tables after review
- ✅ Only pending recordings remain in language tables
- ✅ Reviews persist as historical records
- ✅ No foreign key constraints on `recording_id` (allows orphaned reviews)

