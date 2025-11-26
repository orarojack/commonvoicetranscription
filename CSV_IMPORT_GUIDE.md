# CSV Import Guide for Recordings

This guide explains how to import audio recordings and transcriptions from CSV files into the Africa Next Voices database.

## Overview

The system allows you to import recordings from external storage buckets by uploading a CSV file with audio URLs and transcriptions. Recordings are automatically filtered by language so validators only see recordings in their selected language.

## CSV Format

Your CSV file should have the following columns:

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `audio_url` | Yes | Full URL to the audio file in your external bucket | `https://bucket.example.com/audio/somali_001.mp3` |
| `transcription` | Yes | The text transcription of the audio | `Hello, how are you?` |
| `language` | Yes | Language of the recording (must match validator languages) | `Somali`, `Luo`, `Maasai`, `Kalenjin`, or `Kikuyu` |
| `duration` | No | Duration in seconds (defaults to 0 if not provided) | `5.2` |

### Example CSV File

```csv
audio_url,transcription,language,duration
https://bucket.example.com/audio/somali_001.mp3,Hello, how are you today?,Somali,3.5
https://bucket.example.com/audio/somali_002.mp3,What is your name?,Somali,2.8
https://bucket.example.com/audio/luo_001.mp3,Good morning,Luo,2.1
https://bucket.example.com/audio/luo_002.mp3,How was your day?,Luo,3.2
https://bucket.example.com/audio/maasai_001.mp3,Welcome to our village,Maasai,4.1
```

## Supported Languages

The following languages are supported (must match exactly):

- `Somali`
- `Luo`
- `Maasai`
- `Kalenjin`
- `Kikuyu`

## Import Process

### Option 1: Using API Endpoint (Recommended)

1. **Prepare your CSV file** with the format described above
2. **Make a POST request** to `/api/admin/import-recordings` with the CSV file:

```bash
curl -X POST \
  http://localhost:3000/api/admin/import-recordings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@recordings.csv"
```

### Option 2: Using Admin Dashboard (If Available)

1. Navigate to the admin dashboard
2. Go to "Import Recordings" section
3. Upload your CSV file
4. Review the import results

## How Language Filtering Works

1. **Validators select a language** when building their profile (e.g., "Somali")
2. **Recordings are tagged with language** during import (e.g., `language: "Somali"`)
3. **System automatically filters** - validators only see recordings matching their selected language
4. **If no language selected** - validator sees all languages (not recommended)

## Import Response

The API returns a JSON response with import statistics:

```json
{
  "message": "Import completed",
  "total": 100,
  "success": 95,
  "failed": 5,
  "errors": [
    "Invalid language \"English\" for recording with audio URL: https://...",
    "Failed to import recording https://...: ..."
  ]
}
```

## Troubleshooting

### Common Errors

1. **"Missing required fields"**
   - Ensure your CSV has `audio_url`, `transcription`, and `language` columns
   - Check for typos in column names

2. **"Invalid language"**
   - Language must be exactly one of: `Somali`, `Luo`, `Maasai`, `Kalenjin`, `Kikuyu`
   - Check for typos or extra spaces

3. **"Failed to import recording"**
   - Check that the audio URL is accessible
   - Verify the URL format is correct
   - Ensure the audio file exists in your bucket

### Best Practices

1. **Test with a small CSV first** (5-10 recordings)
2. **Verify audio URLs** are accessible before importing
3. **Use consistent language names** (exact match required)
4. **Include duration** when possible for better metadata
5. **Keep CSV files organized** by language for easier management

## Database Migration

Before importing, make sure you've run the migration to add the language field:

```sql
-- Run this in Supabase SQL Editor
-- File: scripts/019_add_language_to_recordings.sql
```

## Notes

- Recordings are imported with `status: 'pending'` and will appear in validators' review queues
- All imported recordings are associated with a system user account
- The system automatically prevents duplicate reviews
- Validators can only see recordings in their selected language


