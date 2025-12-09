# Schema Compatibility Fix - Language Tables

## Problem Identified

The language tables (kalenjin, somali, kikuyu, maasai) have a **different schema** than the `luo` table:

### Old Schema (luo table):
- `id` - Primary key
- `status` - Recording status (pending, approved, rejected)
- `created_at` - Creation timestamp
- `audio_url` - Audio file URL
- `user_id` - User who created recording
- `sentence` - Text content

### New Schema (kalenjin, somali, kikuyu, maasai tables):
- `_id` - Primary key (instead of `id`)
- **No `status` column** - All recordings are effectively "pending"
- **No `created_at` column** - No timestamp available
- `mediaPathId` - Audio file path (instead of `audio_url`)
- `recorder_uuid` - User identifier (instead of `user_id`)
- `cleaned_transcript`, `actualSentence`, `translatedText` - Text content options

## Fixes Applied

### 1. Updated `mapLuoRecordings()` Function ✅
- Now accepts `tableName` parameter to determine schema type
- Automatically detects schema (new vs old) based on column presence
- Maps `_id` → `id` for new schema tables
- Maps `mediaPathId` → `audio_url` with proper URL construction
- Maps `recorder_uuid` → `user_id`
- Handles missing `status` (defaults to 'pending')
- Handles missing `created_at` (uses current time or null)
- Uses correct storage bucket name based on table name

### 2. Updated Query Functions ✅
- `getLanguageRecordingsByStatus()` - Handles missing `status` and `created_at` columns
- `getRecordingsFromLanguageTable()` - Handles missing columns gracefully
- All functions now pass `tableName` to mapping function
- Fallback ordering by `_id` or `id` when `created_at` is missing
- Returns all recordings when `status` column doesn't exist

### 3. Storage Bucket Mapping ✅
- Each language table uses its own storage bucket:
  - `luo` → `luo` bucket
  - `kalenjin` → `kalenjin` bucket
  - `somali` → `somali` bucket
  - `kikuyu` → `kikuyu` bucket
  - `maasai` → `maasai` bucket

## How It Works Now

1. **Schema Detection**: The mapping function automatically detects which schema is being used
2. **Column Mapping**: Maps new schema columns to expected format:
   - `_id` → `id`
   - `mediaPathId` → `audio_url` (with proper URL construction)
   - `recorder_uuid` → `user_id`
3. **Missing Columns**: Handles missing columns gracefully:
   - No `status` → defaults to 'pending'
   - No `created_at` → uses current time or skips ordering
4. **Error Handling**: Provides clear error messages when tables don't exist

## Testing

To verify the fix works:

1. **Check Browser Console**: When a user with a selected language (e.g., "Kalenjin") loads recordings, you should see:
   - `🔍 Querying kalenjin table: ...`
   - `📦 Mapped X recordings from kalenjin table. Schema: new`
   - No errors about missing columns

2. **Verify Recordings Appear**: Users should now see recordings from their selected language table

3. **Check Audio URLs**: Audio files should load correctly from the appropriate storage bucket

## What This Fixes

✅ Users can now see recordings from kalenjin, somali, kikuyu, and maasai tables  
✅ No more errors about missing `status` or `created_at` columns  
✅ Audio files load from correct storage buckets  
✅ Proper column mapping between different schemas  
✅ Backward compatible with existing `luo` table schema  

## Files Modified

- `lib/database.ts` - Updated mapping and query functions to handle both schemas

