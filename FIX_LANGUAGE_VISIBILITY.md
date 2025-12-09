# Fix: Languages Not Visible After Profile Creation

## Issue Summary
Users can select languages (Somali, Maasai, Kalenjin, Kikuyu) during profile creation, but when they try to review recordings, they see no recordings even though they selected a language.

## Root Cause
The system queries language-specific database tables (e.g., "somali", "maasai", "kalenjin", "kikuyu") based on the user's selected language. If these tables don't exist or are empty, users see no recordings.

## What Was Fixed

### 1. Enhanced Error Logging ✅
- Added detailed console error messages when language tables don't exist
- Shows which language the user selected and which table was queried
- Provides clear guidance on what needs to be created

### 2. Better Empty Table Detection ✅
- Added warnings when tables exist but have no recordings
- Improved error messages for debugging

### 3. Diagnostic Script ✅
- Created `scripts/check_language_issue.js` to diagnose:
  - What languages users have selected
  - Which tables exist in the database
  - Which tables have recordings
  - Table structure and columns

## How to Diagnose the Issue

### Step 1: Check Browser Console
When a user with a selected language (e.g., "Somali") tries to load recordings, check the browser console for:
- `🔍 Querying somali table: ...` - Shows which table is being queried
- `❌ CRITICAL: Table "somali" does not exist in database!` - Indicates missing table
- `⚠️ Table "somali" exists but has no recordings` - Indicates empty table

### Step 2: Run Diagnostic Script
```bash
node scripts/check_language_issue.js
```

This will show:
- Which language tables exist
- Which tables have recordings
- What languages users have selected
- Table structure information

### Step 3: Check Database Directly
In Supabase SQL Editor, run:
```sql
-- Check what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('luo', 'somali', 'maasai', 'kalenjin', 'kikuyu');

-- Check user language selections
SELECT id, email, languages, language_dialect 
FROM users 
WHERE languages IS NOT NULL 
  AND array_length(languages, 1) > 0;

-- Check recordings in each table (if they exist)
SELECT COUNT(*) as count, 'luo' as table_name FROM luo
UNION ALL
SELECT COUNT(*), 'somali' FROM somali
UNION ALL
SELECT COUNT(*), 'maasai' FROM maasai
UNION ALL
SELECT COUNT(*), 'kalenjin' FROM kalenjin
UNION ALL
SELECT COUNT(*), 'kikuyu' FROM kikuyu;
```

## Common Issues and Solutions

### Issue 1: Table Doesn't Exist
**Symptom**: 
- Console shows: `❌ CRITICAL: Table "somali" does not exist in database!`
- User sees no recordings

**Solution**: 
1. Create the missing table in Supabase SQL Editor
2. The table structure should match the `luo` table structure
3. See `scripts/001_create_tables.sql` for reference structure

### Issue 2: Table Exists But Empty
**Symptom**: 
- Console shows: `⚠️ Table "somali" exists but has no recordings`
- User sees no recordings

**Solution**: 
1. Import recordings into that language table
2. Ensure recordings have `status = 'pending'` for reviewers to see them

### Issue 3: Language Value Mismatch
**Symptom**: 
- Wrong table is queried
- Language value in database doesn't match expected format

**Solution**: 
1. Check `users.languages` array values match exactly:
   - Must be: `["Somali"]`, `["Maasai"]`, `["Kalenjin"]`, `["Kikuyu"]`, or `["Luo"]`
   - Case-sensitive: "Somali" not "somali"
2. Update incorrect values:
   ```sql
   UPDATE users 
   SET languages = ARRAY['Somali'] 
   WHERE languages = ARRAY['somali'];
   ```

### Issue 4: Language Not Saved During Profile Creation
**Symptom**: 
- `user.languages` is null or empty
- User sees default language (Luo) recordings

**Solution**: 
1. Check profile setup form is saving language correctly
2. Verify `updateProfile` function in `components/auth-provider.tsx` is called with `languages: [formData.language]`
3. Check database to see if language was saved:
   ```sql
   SELECT id, email, languages FROM users WHERE id = 'USER_ID_HERE';
   ```

## Database Tables Required

The system expects these tables to exist:
- ✅ `luo` - For Luo language (usually exists)
- ❓ `somali` - For Somali language (may not exist)
- ❓ `maasai` - For Maasai language (may not exist)
- ❓ `kalenjin` - For Kalenjin language (may not exist)
- ❓ `kikuyu` - For Kikuyu language (may not exist)

Each table should have:
- `id` - Primary key
- `status` - Recording status (pending, approved, rejected)
- `sentence` or `actualSentence` or `cleaned_transcript` - The text
- `audio_url` - URL to audio file
- `user_id` - User who created the recording
- `duration` - Recording duration
- `created_at` - Creation timestamp
- `language` - Language identifier (optional, since table name indicates language)

## Testing Checklist

- [ ] Run diagnostic script to identify missing tables
- [ ] Check browser console for error messages when loading recordings
- [ ] Verify users' language selections in database
- [ ] Create missing language tables if needed
- [ ] Import test recordings into each language table
- [ ] Test with a user who has selected each language
- [ ] Verify recordings appear for each language

## Next Steps

1. **Immediate**: Run the diagnostic script to see what's missing
2. **Short-term**: Create missing tables or import recordings
3. **Long-term**: Consider adding a fallback mechanism (e.g., show all recordings if language table is empty)

## Files Modified

1. `lib/database.ts` - Enhanced error logging for missing tables
2. `scripts/check_language_issue.js` - New diagnostic script
3. `LANGUAGE_ISSUE_DIAGNOSIS.md` - Detailed diagnosis document
4. `FIX_LANGUAGE_VISIBILITY.md` - This file

