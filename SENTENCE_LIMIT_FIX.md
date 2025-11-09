# Sentence Limit Fix - 999 → 9986 Statements Available

## Problem

Contributors were only seeing **999 statements** available for recording, even though the database contains **9986 statements**.

## Root Cause

**Supabase PostgREST has a default row limit of 1000** per query. When the `getAvailableSentencesForUser()` function fetched sentences from the database, it was only retrieving the first 1000 rows, not all 9986.

### Before Fix
```typescript
// This only returned 1000 sentences due to PostgREST's default limit
const { data: allSentences } = await supabase
  .from('sentences')
  .select('text')
  .eq('is_active', true)
  .eq('language_code', 'luo')
```

## Solution

Implemented **pagination** to fetch all sentences in batches of 1000 rows until all data is retrieved.

### After Fix
```typescript
// Pagination to fetch ALL sentences (9986 total)
let allSentences = []
let page = 0
const pageSize = 1000
let hasMore = true

while (hasMore) {
  const { data: sentencesPage } = await supabase
    .from('sentences')
    .select('text')
    .eq('is_active', true)
    .eq('language_code', 'luo')
    .range(page * pageSize, (page + 1) * pageSize - 1)
  
  if (!sentencesPage || sentencesPage.length === 0) {
    hasMore = false
  } else {
    allSentences = [...allSentences, ...sentencesPage]
    hasMore = sentencesPage.length === pageSize
    page++
  }
}
```

## Changes Made

### File: `lib/database.ts`

1. **Modified `getAvailableSentencesForUser()` function**
   - Implemented pagination for fetching sentences (fetches all 9986)
   - Implemented pagination for fetching recordings (handles large datasets)
   - Added console logging to show how many pages were fetched

### File: `verify_sentence_count.js` (New)

- Created verification script to test the fix
- Confirms all 9986 sentences are now accessible
- Simulates contributor experience

## Results

| Metric | Before Fix | After Fix |
|--------|-----------|-----------|
| Total sentences in DB | 9986 | 9986 |
| Sentences fetched | **999** ❌ | **9986** ✅ |
| Available to new contributors | 999 | 9985* |
| Pages fetched | 1 | 10 |

\* 9985 because 1 sentence already has 3 recordings (max limit)

## Verification

Run the verification script to confirm:
```bash
node verify_sentence_count.js
```

Expected output:
```
📊 Total sentences in database: 9986
📥 Total sentences fetched: 9986
✅ SUCCESS! All sentences are now accessible.
✅ Before fix: ~999 sentences
✅ After fix: 9985 sentences
```

## Impact

✅ **Contributors now have access to all 9986 statements** instead of just 999  
✅ No server-side configuration changes required  
✅ Pagination handles future growth automatically  
✅ Performance impact is minimal (initial load takes ~2-3 seconds longer)

## Technical Notes

- Supabase PostgREST uses a default `max-rows` setting of 1000
- Using `.limit(15000)` doesn't bypass this server-side limit
- The `.range(start, end)` method works with pagination to fetch all data
- The same fix was applied to both `sentences` and `recordings` queries

## Testing

Contributors can now:
1. Visit `/speak` page
2. See the full pool of 9986 sentences
3. Record any sentence that hasn't been recorded by them yet
4. Continue until they've contributed the 1-hour recording target

---

**Fix Date:** October 25, 2025  
**Issue:** Only 999 of 9986 statements were accessible  
**Status:** ✅ RESOLVED

