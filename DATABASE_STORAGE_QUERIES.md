# Database Storage Queries

## Overview
File sizes are tracked in the database only (no UI). Use these SQL queries in your Supabase SQL Editor to check storage statistics anytime.

## Setup

### Run Migration
```sql
-- In Supabase SQL Editor, run:
-- File: scripts/013_add_file_size_tracking.sql
```

This adds:
- `file_size` column to `recordings` table (in bytes)
- `storage_stats` view for easy querying
- Index for performance
- Calculates file size for existing recordings

## Quick Queries

### 1. View All Storage Statistics
```sql
SELECT * FROM storage_stats;
```

**Returns:**
| Column | Description | Example |
|--------|-------------|---------|
| total_recordings | Total number of recordings | 1,245 |
| total_size | Total storage used | 2.5 GB |
| average_size | Average file size | 2.1 MB |
| largest_file | Biggest file | 5.8 MB |
| smallest_file | Smallest file | 45 KB |
| approved_size | Storage for approved | 1.8 GB |
| pending_size | Storage for pending | 500 MB |
| rejected_size | Storage for rejected | 200 MB |

### 2. View Individual Recording Sizes
```sql
SELECT 
  id,
  sentence,
  duration,
  pg_size_pretty(file_size) as file_size,
  status,
  created_at
FROM recordings
ORDER BY file_size DESC
LIMIT 20;
```

### 3. Find Largest Files
```sql
SELECT 
  id,
  sentence,
  pg_size_pretty(file_size) as file_size,
  duration,
  status
FROM recordings
WHERE file_size > 0
ORDER BY file_size DESC
LIMIT 10;
```

### 4. Find Smallest Files (excluding 0)
```sql
SELECT 
  id,
  sentence,
  pg_size_pretty(file_size) as file_size,
  duration,
  status
FROM recordings
WHERE file_size > 0
ORDER BY file_size ASC
LIMIT 10;
```

### 5. Storage by Status
```sql
SELECT 
  status,
  COUNT(*) as count,
  pg_size_pretty(SUM(file_size)) as total_size,
  pg_size_pretty(AVG(file_size)) as avg_size
FROM recordings
GROUP BY status
ORDER BY status;
```

### 6. Storage by Contributor
```sql
SELECT 
  u.name,
  u.email,
  COUNT(r.id) as recordings,
  pg_size_pretty(SUM(r.file_size)) as total_storage
FROM recordings r
JOIN users u ON r.user_id = u.id
GROUP BY u.id, u.name, u.email
ORDER BY SUM(r.file_size) DESC
LIMIT 20;
```

### 7. Storage Growth Over Time
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as recordings,
  pg_size_pretty(SUM(file_size)) as daily_storage
FROM recordings
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;
```

### 8. Files with Missing Sizes
```sql
SELECT 
  id,
  sentence,
  status,
  created_at
FROM recordings
WHERE file_size = 0 OR file_size IS NULL
LIMIT 50;
```

### 9. Recalculate File Sizes (if needed)
```sql
UPDATE recordings
SET file_size = LENGTH(SUBSTRING(audio_url FROM 'base64,(.*)')) * 3 / 4
WHERE audio_url LIKE 'data:%' 
  AND (file_size = 0 OR file_size IS NULL);
```

## Storage Format Functions

### Convert Bytes to Human-Readable
PostgreSQL's `pg_size_pretty()` automatically formats:
- `1024` → "1024 bytes"
- `1048576` → "1024 kB"
- `1073741824` → "1024 MB"
- `1099511627776` → "1024 GB"

### Raw Bytes Queries
```sql
-- Total size in bytes
SELECT SUM(file_size) FROM recordings;

-- Average size in bytes
SELECT AVG(file_size) FROM recordings;

-- Total size in MB
SELECT SUM(file_size) / 1048576 as total_mb FROM recordings;

-- Total size in GB
SELECT SUM(file_size) / 1073741824.0 as total_gb FROM recordings;
```

## Monitoring Queries

### Check if Migration Ran Successfully
```sql
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'recordings' 
  AND column_name = 'file_size';
```

### Verify Storage Stats View
```sql
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE viewname = 'storage_stats';
```

### Count Files by Size Range
```sql
SELECT 
  CASE 
    WHEN file_size < 500000 THEN 'Under 500 KB'
    WHEN file_size < 1000000 THEN '500 KB - 1 MB'
    WHEN file_size < 2000000 THEN '1 MB - 2 MB'
    WHEN file_size < 5000000 THEN '2 MB - 5 MB'
    ELSE 'Over 5 MB'
  END as size_range,
  COUNT(*) as count,
  pg_size_pretty(SUM(file_size)) as total_size
FROM recordings
WHERE file_size > 0
GROUP BY 
  CASE 
    WHEN file_size < 500000 THEN 'Under 500 KB'
    WHEN file_size < 1000000 THEN '500 KB - 1 MB'
    WHEN file_size < 2000000 THEN '1 MB - 2 MB'
    WHEN file_size < 5000000 THEN '2 MB - 5 MB'
    ELSE 'Over 5 MB'
  END
ORDER BY MIN(file_size);
```

## Export Queries

### Export to CSV (in Supabase)
1. Run your query
2. Click "Download as CSV" button in Supabase SQL Editor

### Example Export Query
```sql
SELECT 
  r.id,
  u.name as contributor,
  r.sentence,
  r.duration,
  r.file_size,
  pg_size_pretty(r.file_size) as file_size_formatted,
  r.status,
  r.created_at
FROM recordings r
LEFT JOIN users u ON r.user_id = u.id
ORDER BY r.created_at DESC;
```

## Maintenance

### Update File Sizes for New Recordings
When recordings are uploaded via HTTP URLs, you may need to update sizes manually:

```sql
-- If you have the actual file size, update it:
UPDATE recordings 
SET file_size = [actual_size_in_bytes]
WHERE id = '[recording_id]';
```

### Clean Up Zero-Size Entries
```sql
-- Find recordings with no file size data
SELECT COUNT(*) 
FROM recordings 
WHERE file_size = 0 OR file_size IS NULL;

-- Recalculate for data URLs
UPDATE recordings
SET file_size = LENGTH(SUBSTRING(audio_url FROM 'base64,(.*)')) * 3 / 4
WHERE audio_url LIKE 'data:%' AND (file_size = 0 OR file_size IS NULL);
```

## Performance Tips

1. **Use Indexes**: File size column is indexed for fast queries
2. **Limit Results**: Always use `LIMIT` for large datasets
3. **Cache Results**: For reports, save query results rather than re-running
4. **Scheduled Queries**: Set up automated reports if needed

## Summary

All storage information is stored in the database. Use the `storage_stats` view for quick overview, or write custom queries for detailed analysis. No UI changes needed - all data accessible via SQL queries in Supabase SQL Editor.

