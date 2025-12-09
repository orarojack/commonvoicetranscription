# Language Selection Issue - Diagnosis and Fix

## Problem Summary
Users can select languages (Somali, Maasai, Kalenjin, Kikuyu) during profile creation, but when they try to review recordings, they see no recordings even though they selected a language.

## Root Cause Analysis

### How Language Selection Works
1. **Profile Creation**: Users select a language from dropdown (Somali, Luo, Maasai, Kalenjin, Kikuyu)
2. **Storage**: Language is saved to `users.languages` array field in the database
3. **Querying**: When loading recordings, the system:
   - Gets user's selected language from `user.languages[0]`
   - Maps language name to table name using `getLanguageTableName()`:
     - "Somali" → "somali" table
     - "Luo" → "luo" table
     - "Maasai" → "maasai" table
     - "Kalenjin" → "kalenjin" table
     - "Kikuyu" → "kikuyu" table
   - Queries that specific table for recordings

### The Issue
The problem occurs when:
1. **Table doesn't exist**: The language-specific table (e.g., "somali", "maasai", "kalenjin", "kikuyu") doesn't exist in the database
2. **Table is empty**: The table exists but has no recordings
3. **Language value mismatch**: The language value stored doesn't match the expected format

## Database Tables Structure

### Users Table
- `languages` (TEXT[]): Array of languages selected by user
- `language_dialect` (VARCHAR(50)): Dialect for the selected language
- `accent_dialect` (VARCHAR(50)): Accent dialect

### Language-Specific Tables
The system expects these tables to exist:
- `luo` - For Luo language recordings
- `somali` - For Somali language recordings
- `maasai` - For Maasai language recordings
- `kalenjin` - For Kalenjin language recordings
- `kikuyu` - For Kikuyu language recordings

## Fixes Applied

### 1. Enhanced Error Logging
Added detailed error messages when tables don't exist:
- Shows which language the user selected
- Shows which table was attempted to be queried
- Provides clear guidance on what needs to be created

### 2. Better Empty Table Detection
Added warnings when tables exist but have no recordings

### 3. Diagnostic Script
Created `scripts/check_language_issue.js` to help diagnose:
- What languages users have selected
- Which tables exist in the database
- Which tables have recordings
- Table structure and columns

## How to Fix the Issue

### Step 1: Check What Tables Exist
Run the diagnostic script:
```bash
node scripts/check_language_issue.js
```

This will show:
- Which language tables exist
- Which tables have recordings
- What languages users have selected

### Step 2: Create Missing Tables
If tables are missing, you need to create them in Supabase. Each language table should have a similar structure to the `luo` table.

### Step 3: Verify Language Values
Check that users' `languages` array contains the correct values:
- Should be: `["Somali"]`, `["Maasai"]`, `["Kalenjin"]`, `["Kikuyu"]`, or `["Luo"]`
- Case-sensitive: Must match exactly (e.g., "Somali" not "somali")

### Step 4: Check Table Structure
Each language table should have:
- `id` - Primary key
- `language` - Language identifier (optional, since table name indicates language)
- `status` - Recording status (pending, approved, rejected)
- `sentence` or `actualSentence` or `cleaned_transcript` - The text
- `audio_url` - URL to audio file
- `user_id` - User who created the recording
- `duration` - Recording duration
- `created_at` - Creation timestamp

## Common Issues and Solutions

### Issue 1: Table Doesn't Exist
**Symptom**: No recordings shown, console shows "Table does not exist"
**Solution**: Create the missing table in Supabase SQL Editor

### Issue 2: Table Exists But Empty
**Symptom**: No recordings shown, but no error
**Solution**: Import recordings into that language table

### Issue 3: Language Value Mismatch
**Symptom**: Wrong table queried
**Solution**: Check `users.languages` array values match exactly:
- "Somali" (capital S)
- "Luo" (capital L)
- "Maasai" (capital M)
- "Kalenjin" (capital K)
- "Kikuyu" (capital K)

### Issue 4: Language Not Saved
**Symptom**: `user.languages` is null or empty
**Solution**: Check profile setup form is saving language correctly

## Testing

To test if the fix works:
1. Create a test user with a specific language (e.g., "Somali")
2. Check that `users.languages` contains `["Somali"]`
3. Try to load recordings - should query "somali" table
4. Check console logs for detailed error messages if table doesn't exist

## Next Steps

1. Run the diagnostic script to identify which tables are missing
2. Create missing tables in Supabase
3. Verify users' language selections are correct
4. Test with a user who has selected each language

