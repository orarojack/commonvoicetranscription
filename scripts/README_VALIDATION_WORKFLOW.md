# Validation Workflow SQL Scripts Guide

This guide explains how to use the SQL scripts for managing the validation workflow where validated recordings are moved from language tables to `language_reviews`.

## Overview

When a validator reviews a recording:
1. A review record is created in `language_reviews` table
2. The recording is automatically deleted from the source language table (luo, somali, kalenjin, kikuyu, maasai)
3. Only pending recordings remain in the language tables

## Available Scripts

### 1. `031_validation_workflow_helpers.sql`
**Purpose**: Verification, statistics, and monitoring queries

**Use this script for:**
- Checking how many pending recordings exist per language
- Viewing validation statistics
- Monitoring validator performance
- Checking for duplicate reviews
- Viewing recent validations

**When to use:**
- Daily monitoring
- Performance analysis
- Troubleshooting
- Generating reports

**Key Queries:**
- Count pending recordings per language table
- Count validated recordings in language_reviews
- Check for orphaned data (reviewed recordings still in language tables)
- View validation statistics per validator
- Daily validation statistics

### 2. `032_cleanup_reviewed_recordings.sql`
**Purpose**: Cleanup script to remove reviewed recordings that may still exist in language tables

**Use this script for:**
- Cleaning up data that was reviewed before the automatic deletion was implemented
- Removing any orphaned reviewed recordings

**When to use:**
- One-time cleanup after implementing the new workflow
- If you notice reviewed recordings still in language tables
- After migrating from an old system

**⚠️ IMPORTANT:**
- Always run verification queries first (Step 1)
- Review the details (Step 2) before deleting
- Consider backing up your data
- Run DELETE statements one table at a time
- Use transactions (BEGIN/COMMIT)

## Quick Start

### Daily Monitoring

Run these queries from `031_validation_workflow_helpers.sql`:

```sql
-- 1. Check pending recordings count
SELECT 
    'luo' as table_name,
    COUNT(*) as pending_count
FROM luo
WHERE status = 'pending'
UNION ALL
-- ... (see full query in script)

-- 2. Check validation statistics
SELECT 
    lr.source_table,
    COUNT(*) as total_validations,
    COUNT(CASE WHEN lr.decision = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN lr.decision = 'rejected' THEN 1 END) as rejected_count
FROM language_reviews lr
GROUP BY lr.source_table;
```

### One-Time Cleanup

If you have reviewed recordings that still exist in language tables:

1. **First, verify what will be deleted:**
   ```sql
   -- Run Step 1 from 032_cleanup_reviewed_recordings.sql
   -- This shows the count of reviewed recordings still in tables
   ```

2. **Review the details:**
   ```sql
   -- Run Step 2 from 032_cleanup_reviewed_recordings.sql
   -- This shows which specific recordings will be deleted
   ```

3. **Delete (one table at a time):**
   ```sql
   -- Uncomment and run DELETE statements from Step 3
   -- Start with one table, verify, then move to the next
   ```

4. **Verify cleanup:**
   ```sql
   -- Run Step 4 from 032_cleanup_reviewed_recordings.sql
   -- Should return 0 for all tables if successful
   ```

## Common Tasks

### Check if workflow is working correctly

```sql
-- This should return 0 if workflow is working
SELECT 
    COUNT(*) as reviewed_recordings_still_in_tables
FROM language_reviews lr
WHERE EXISTS (
    SELECT 1 FROM luo l WHERE l.id = lr.recording_id AND lr.source_table = 'luo'
)
OR EXISTS (
    SELECT 1 FROM somali s WHERE s._id = lr.recording_id AND lr.source_table = 'somali'
)
-- ... (check all language tables)
```

### View recent validations

```sql
SELECT 
    lr.source_table,
    lr.recording_id,
    u.email as reviewer_email,
    lr.decision,
    lr.notes,
    lr.created_at as validated_at
FROM language_reviews lr
JOIN users u ON lr.reviewer_id = u.id
ORDER BY lr.created_at DESC
LIMIT 50;
```

### Get validator statistics

```sql
SELECT 
    u.email as reviewer_email,
    lr.source_table,
    COUNT(*) as reviews_count,
    AVG(lr.confidence) as avg_confidence,
    SUM(lr.time_spent) as total_time_seconds
FROM language_reviews lr
JOIN users u ON lr.reviewer_id = u.id
GROUP BY u.email, lr.source_table
ORDER BY reviews_count DESC;
```

## Troubleshooting

### Problem: Reviewed recordings still appearing in language tables

**Solution:**
1. Check if automatic deletion is working:
   ```sql
   -- Run query from 031_validation_workflow_helpers.sql Part 1.3
   ```
2. If there are orphaned records, use `032_cleanup_reviewed_recordings.sql`
3. Check application logs for deletion errors

### Problem: Duplicate reviews

**Solution:**
```sql
-- Check for duplicates (should return 0)
SELECT 
    source_table,
    recording_id,
    reviewer_id,
    COUNT(*) as review_count
FROM language_reviews
GROUP BY source_table, recording_id, reviewer_id
HAVING COUNT(*) > 1;
```

### Problem: Missing reviews

**Solution:**
- Check if reviews were created successfully
- Verify `language_reviews` table exists
- Check for database errors in application logs

## Best Practices

1. **Regular Monitoring**: Run verification queries daily
2. **Backup Before Cleanup**: Always backup before running DELETE statements
3. **Test First**: Test queries on a small dataset first
4. **Use Transactions**: Wrap DELETE statements in transactions
5. **Verify After**: Always verify results after cleanup operations

## Schema Notes

### Language Tables Structure

- **luo**: Uses `id` (TEXT) and `status` column
- **somali, kalenjin, kikuyu, maasai**: Use `_id` (TEXT) and no `status` column (all considered pending)

### language_reviews Table

- `source_table`: Which language table the recording came from
- `recording_id`: The ID from the source table
- `reviewer_id`: UUID of the validator
- `decision`: 'approved' or 'rejected'
- `notes`: Transcription details and corrections
- Unique constraint: (source_table, recording_id, reviewer_id)

## Support

If you encounter issues:
1. Check the verification queries first
2. Review application logs
3. Verify database constraints are in place
4. Check that `language_reviews` table exists and has correct structure

