# Fix: Somali Table Missing Status Column

## Error
```
column somali.status does not exist
GET https://xairkvhobxfdgahmsxcu.supabase.co/rest/v1/somali?select=*&order=created_at.desc&status=eq.pending 400 (Bad Request)
```

## Problem

The code was trying to filter recordings by `status` column in the `somali` table, but this table doesn't have a `status` column. Different language tables may have different schemas:

- **luo table**: Has `status` column (pending, approved)
- **somali table**: Does NOT have `status` column
- Other language tables may also have different schemas

## Solution

Updated two methods in `lib/database.ts` to gracefully handle tables without a `status` column:

### 1. `getLanguageRecordingsByStatus()`

**Changes:**
- Tries to filter by `status` first
- If error indicates missing `status` column, retries without status filter
- Returns all recordings if table doesn't have status column
- Works for both limited queries and paginated queries

### 2. `getRecordingsFromLanguageTable()`

**Changes:**
- Tries to filter by `status` first
- If error indicates missing `status` column, retries without status filter
- Logs a warning when status column is missing
- Returns all recordings from the table

## How It Works

1. **First attempt**: Query with `status` filter
2. **If error about missing column**: Detect the error message contains "column" and "status"
3. **Retry**: Query again without `status` filter
4. **Return**: All recordings (since we can't filter by status)

## Behavior

- **Tables WITH status column** (like `luo`): Works as before, filters by status
- **Tables WITHOUT status column** (like `somali`): Returns all recordings, logs warning

## Notes

- The fix is backward compatible
- Tables with status columns continue to work normally
- Tables without status columns will return all recordings
- Warning messages help identify which tables need schema updates
- No breaking changes to existing functionality

## Future Improvements

If you want to add `status` column to the `somali` table, you can run:

```sql
ALTER TABLE somali 
ADD COLUMN status VARCHAR(20) DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved'));

-- Update existing records
UPDATE somali SET status = 'pending' WHERE status IS NULL;
```

This would make the `somali` table consistent with the `luo` table schema.
