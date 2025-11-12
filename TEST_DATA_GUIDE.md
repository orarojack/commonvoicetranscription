# Test Data for Validation Testing

## Quick Setup

Run this to add 10 sample pending recordings for testing:

### Supabase Dashboard:
1. Go to SQL Editor
2. Copy/paste: `scripts/017_insert_test_recordings.sql`
3. Run
4. Done! ✅

### Command Line:
```bash
psql "your_connection_string" -f scripts/017_insert_test_recordings.sql
```

---

## What Gets Created

### 1 Test User:
- **Email**: `testcontributor@test.com`
- **Password**: `test123`
- **Role**: contributor
- **UUID**: `11111111-1111-1111-1111-111111111111`

### 10 Test Recordings:
All recordings are in **"pending"** status ready for validation.

| # | Sentence (Transcription) | Duration | Status | Notes |
|---|--------------------------|----------|--------|-------|
| 1 | An neno wacho ni dhano duto ochwere | 4.5s | Pending | Correct - should PASS |
| 2 | Odhiambo odhi chiro e cham | 5.2s | Pending | May need editing |
| 3 | Chiemo osechiew kendo wan wadhiambo | 3.8s | Pending | Correct - should PASS |
| 4 | Anyuola osebedo ka somo kitabu maber | 6.1s | Pending | Spelling check |
| 5 | Piny Luo ochiegni gi nam Victoria | 4.7s | Pending | Correct - should PASS |
| 6 | Ng'ato ka ng'ato nyalo konyo ji mamoko | 5.5s | Pending | Check for omissions |
| 7 | Wuon dala en ng'at maduong' e od | 4.2s | Pending | Correct - should PASS |
| 8 | Nyathi odongo mondo obedo ng'at maber | 5.9s | Pending | Check for extras |
| 9 | Ji duto dwaro rito chunygi gi ngima maberie | 6.8s | Pending | Correct - should PASS |
| 10 | Wuoro gi min ne ng'eyo ni nyathindo dwarore gi luoro | 7.2s | Pending | Correct - should PASS |

**Total Duration**: ~54 seconds of audio

---

## Testing the Validation Workflow

### Test Scenario 1: Pass (Correct Transcription)
1. Go to `/listen` page as a validator
2. Listen to Recording #1
3. Transcription matches audio perfectly
4. Click green **"Pass"** button
5. ✅ Recording should be marked as validated

### Test Scenario 2: Edit (Incorrect Transcription)
1. Listen to Recording #2
2. Transcription doesn't match audio
3. Click the **pencil icon** to edit
4. Correct the transcription
5. Click **"Save"**
6. Click purple **"Edited"** button
7. ✅ Recording saved with corrected transcription

### Test Scenario 3: Skip
1. Listen to any recording
2. Click **"Skip"** if unsure
3. Recording moves to "Skipped" list
4. Can restore it later

---

## Verify Test Data

### Check if recordings were inserted:
```sql
SELECT 
  id, 
  sentence, 
  duration, 
  status, 
  created_at
FROM recordings
WHERE user_id = '11111111-1111-1111-1111-111111111111'
ORDER BY created_at DESC;
```

Should return **10 rows** with status = 'pending'

### Check in the app:
1. Sign in as a validator
2. Go to `/listen` page
3. You should see 10 recordings ready for validation

---

## Admin Dashboard Testing

After running the test data:

### Overview Tab Should Show:
- Total Recordings: +10
- Pending Recordings: +10
- Validated Recordings: 0 (until you validate some)

### Recordings Tab:
- Filter by "Pending" → Should show 10 test recordings
- Each recording shows the Luo sentence

---

## Validation Testing Checklist

- [ ] Test **Pass** button (approve correct transcriptions)
- [ ] Test **Edit** functionality (click pencil icon)
- [ ] Test **Edited** button (submit corrected transcription)
- [ ] Test **Skip** button (skip unclear recordings)
- [ ] Verify edited transcriptions save to database
- [ ] Check original_sentence field preserves original
- [ ] Verify transcription_edited flag is set correctly
- [ ] Check edited_by and edited_at fields populate

---

## Sample Validation Scenarios

### Recording #1 - Perfect Match ✅
**Expected**: Validator listens and clicks "Pass"
**Database After**:
```sql
{
  sentence: "An neno wacho ni dhano duto ochwere",
  original_sentence: NULL,
  transcription_edited: FALSE,
  status: "approved",
  reviewed_by: validator_id
}
```

### Recording #2 - Needs Correction ✏️
**Expected**: Validator edits "chiro" → "chiemo" and clicks "Edited"
**Database After**:
```sql
{
  sentence: "Odhiambo odhi chiemo e cham",  // Corrected
  original_sentence: "Odhiambo odhi chiro e cham",  // Original preserved
  transcription_edited: TRUE,
  edited_by: validator_id,
  edited_at: timestamp,
  status: "approved"
}
```

---

## Cleanup After Testing

### Remove all test data:
```sql
-- Remove test recordings
DELETE FROM recordings 
WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- Remove test user
DELETE FROM users 
WHERE id = '11111111-1111-1111-1111-111111111111';
```

### Or remove just the recordings:
```sql
-- Keep user, remove only recordings
DELETE FROM recordings 
WHERE user_id = '11111111-1111-1111-1111-111111111111';
```

---

## Using Real Audio Files

The test data uses placeholder audio URLs. For real testing:

### Option 1: Upload to Supabase Storage
```bash
# Upload audio files to Supabase Storage
# Then update recordings with real URLs
UPDATE recordings 
SET audio_url = 'https://your-project.supabase.co/storage/v1/object/public/audio/file.mp3'
WHERE id = 'recording-id';
```

### Option 2: Use Data URLs (Base64)
```sql
-- For small audio files, you can use base64 data URLs
UPDATE recordings 
SET audio_url = 'data:audio/mp3;base64,//uQx...'
WHERE id = 'recording-id';
```

### Option 3: Use Local Development Server
```sql
-- Point to files served by your Next.js dev server
UPDATE recordings 
SET audio_url = 'http://localhost:3000/audio/sample.mp3'
WHERE id = 'recording-id';
```

---

## Quick Test Commands

### Insert test data:
```bash
psql "your_connection" -f scripts/017_insert_test_recordings.sql
```

### Verify insertion:
```bash
psql "your_connection" -c "SELECT COUNT(*) FROM recordings WHERE user_id = '11111111-1111-1111-1111-111111111111';"
```

### Cleanup:
```bash
psql "your_connection" -c "DELETE FROM recordings WHERE user_id = '11111111-1111-1111-1111-111111111111';"
```

---

## Summary

✅ **10 test recordings** ready for validation  
✅ **Pending status** - ready to test workflow  
✅ **Luo sentences** - realistic data  
✅ **Various durations** - 3.8s to 7.2s  
✅ **Easy cleanup** - Single DELETE command  

Run the script and start testing your validation workflow! 🎯

