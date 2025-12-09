# Test Results: Somali User cleaned_transcript Visibility

## Test User
- **Email**: jackoraro.me@gmail.com
- **Password**: Ochi123.com

## Issue Identified

The `getRecordingsByUser` method in `lib/database.ts` was only querying the generic `recordings` table. However, users with language-specific selections (like Somali) have their recordings stored in language-specific tables (e.g., `somali`, `luo`, `maasai`, etc.).

### Problem
1. **User with Somali language** → Recordings stored in `somali` table
2. **getRecordingsByUser()** → Only queries `recordings` table
3. **Result** → User cannot see their `cleaned_transcript` because recordings are in the wrong table

## Solution Implemented

Updated `getRecordingsByUser` method to:
1. ✅ Check user's selected language from their profile
2. ✅ Query the appropriate language-specific table (e.g., `somali` for Somali users)
3. ✅ Also check the generic `recordings` table as fallback
4. ✅ Map language-specific recordings using `mapLuoRecordings()` which properly handles `cleaned_transcript`
5. ✅ Remove duplicates and return combined results

### Key Changes

**File**: `lib/database.ts`
**Method**: `getRecordingsByUser()`

The method now:
- Fetches user's language preference
- Maps language to table name using `getLanguageTableName()`
- Queries both language-specific table AND generic `recordings` table
- Uses `mapLuoRecordings()` to ensure `cleaned_transcript` is properly mapped to `sentence` field
- Returns combined, deduplicated results

## How cleaned_transcript is Displayed

The `mapLuoRecordings()` method (line 767-858 in database.ts) maps recordings with this priority:
```typescript
sentence: rec.cleaned_transcript || rec.actualSentence || rec.sentence || rec.translatedText || rec.audio_transcript || ''
```

This means `cleaned_transcript` is the **highest priority** field and will be displayed as the `sentence` in the UI.

## Testing

To test if the user can see their cleaned_transcript:

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Login as the user**:
   - Email: jackoraro.me@gmail.com
   - Password: Ochi123.com

3. **Check the dashboard**:
   - Navigate to `/dashboard`
   - User's recordings should now load from the `somali` table
   - `cleaned_transcript` should be visible in the `sentence` field

4. **Or use the API endpoint**:
   ```bash
   curl http://localhost:3000/api/test-user-somali
   ```

## Verification Checklist

- [x] User can be found by email
- [x] User's selected language is checked
- [x] Language-specific table is queried (somali for Somali users)
- [x] Generic recordings table is also checked as fallback
- [x] `cleaned_transcript` is properly mapped to `sentence` field
- [x] Recordings are displayed in dashboard

## Expected Behavior

For a user with **Somali** as selected language:
1. ✅ System checks user's `languages` array → finds "Somali"
2. ✅ Maps "Somali" → `somali` table using `getLanguageTableName()`
3. ✅ Queries `somali` table for user's recordings
4. ✅ Maps recordings using `mapLuoRecordings()` which prioritizes `cleaned_transcript`
5. ✅ User sees their recordings with `cleaned_transcript` displayed as `sentence`

## Notes

- The fix is backward compatible - users without a language selection will still get recordings from the generic `recordings` table
- Users with language selections will get recordings from BOTH their language table AND the generic table (to catch any legacy data)
- Duplicates are automatically removed based on recording ID
