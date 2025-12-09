# Recording Metadata in Review Tables

## Overview

All review tables now store complete recording metadata alongside the review information. This ensures that even after a recording is deleted from the source language table, all its original data is preserved in the review table.

## Added Columns

The following columns have been added to all review tables:
- `luo_reviews`
- `somali_reviews`
- `kalenjin_reviews`
- `kikuyu_reviews`
- `maasai_reviews`

### Metadata Columns

| Column | Type | Description |
|-------|------|-------------|
| `original_transcript` | TEXT | Original transcript from the recording (cleaned_transcript or actualSentence) |
| `audio_url` | TEXT | Full URL to the audio file |
| `media_path_id` | TEXT | Media path ID from the recording |
| `duration` | DOUBLE PRECISION | Audio duration in seconds |
| `language` | TEXT | Language of the recording |
| `recorder_uuid` | TEXT | UUID of the person who recorded this |
| `user_id` | TEXT | User ID (alternative to recorder_uuid) |
| `recording_created_at` | TIMESTAMP | When the original recording was created |
| `domain` | TEXT | Domain/category of recording |
| `prompt_type` | TEXT | Type of prompt used |
| `word_count` | INTEGER | Word count of transcript |
| `ratio` | DOUBLE PRECISION | Some ratio metric |

## Setup Instructions

### Step 1: Run the SQL Script

Run `scripts/044_add_recording_metadata_to_review_tables.sql` in your Supabase SQL Editor.

This will add all the metadata columns to all review tables.

### Step 2: Verify Columns Were Added

Run this query to verify:

```sql
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('luo_reviews', 'somali_reviews', 'kalenjin_reviews', 'kikuyu_reviews', 'maasai_reviews')
  AND column_name IN ('transcript', 'original_transcript', 'audio_url', 'media_path_id', 'duration', 'language')
ORDER BY table_name, column_name;
```

## How It Works

### When Creating a Review

1. **Before deleting the recording**: The system fetches all data from the original recording
2. **Extracts metadata**: All relevant fields are extracted and stored in a metadata object
3. **Creates review**: The review is created with:
   - Review-specific fields (decision, notes, transcript, confidence, time_spent)
   - All original recording metadata (audio_url, duration, language, etc.)
4. **Deletes recording**: The original recording is deleted from the language table

### Data Mapping

The code automatically handles schema differences:

- **New schema tables** (somali, kalenjin, kikuyu, maasai):
  - `_id` → `recording_id`
  - `mediaPathId` → `media_path_id`
  - `recorder_uuid` → `recorder_uuid`
  - `cleaned_transcript` or `actualSentence` → `original_transcript`

- **Old schema table** (luo):
  - `id` → `recording_id`
  - `audio_url` → `audio_url`
  - `user_id` → `user_id`
  - `cleaned_transcript` or `sentence` → `original_transcript`

## Example Review Record

After a review is created, the review table will contain:

```json
{
  "id": "uuid",
  "recording_id": "683df39504a2b86675a3a02e",
  "reviewer_id": "5cbc441a-6466-4333-8aeb-365316fb36af",
  "decision": "approved",
  "transcript": "Validated and edited transcript",
  "original_transcript": "Original cleaned transcript",
  "audio_url": "https://...supabase.co/storage/v1/object/public/somali/filename.wav",
  "media_path_id": "filename.wav",
  "duration": 3.5,
  "language": "Somali",
  "recorder_uuid": "user-uuid",
  "user_id": "user-uuid",
  "recording_created_at": "2025-01-01T00:00:00Z",
  "domain": "general",
  "prompt_type": "PROMPT_COLLECTION",
  "word_count": 10,
  "ratio": 0.95,
  "confidence": 85,
  "time_spent": 30,
  "created_at": "2025-12-09T09:25:45Z"
}
```

## Benefits

1. **Complete History**: All recording data is preserved even after deletion
2. **Audit Trail**: Full context for each review decision
3. **Analytics**: Can analyze original vs. validated transcripts
4. **Debugging**: Can trace back to original recording details
5. **Reporting**: Rich data for generating reports and statistics

## Notes

- **Existing Reviews**: Reviews created before this update will have NULL values for metadata columns (since recordings were already deleted)
- **New Reviews**: All new reviews will automatically include complete metadata
- **Migration**: If you need to backfill metadata for existing reviews, you would need the original recordings (which may no longer exist)

## Related Scripts

- `044_add_recording_metadata_to_review_tables.sql` - Adds metadata columns
- `041_remove_all_review_foreign_keys.sql` - Removes foreign keys (required first)
- `042_add_transcript_to_review_tables.sql` - Adds transcript column
- `043_add_transcript_to_luo_reviews.sql` - Adds transcript to luo_reviews

