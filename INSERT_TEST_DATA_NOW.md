# 🚀 Insert Test Data - Quick Start

## Add 10 Test Recordings for Validation Testing

### Quick Method (Supabase Dashboard):

1. **Open**: Supabase Dashboard → SQL Editor
2. **Copy**: Contents of `scripts/017_insert_test_recordings.sql`
3. **Paste** and **Run**
4. **Done!** ✅

---

## What You Get

### ✅ 1 Test Contributor
- Email: `testcontributor@test.com`
- Password: `test123`

### ✅ 10 Pending Recordings
All with Luo sentences ready for validation testing

```
Total: 10 recordings
Status: All "pending"
Duration: ~54 seconds total
Language: Luo (Dholuo)
```

---

## Test the Workflow

1. **Sign in** as a validator
2. **Go to** `/listen` page
3. **You'll see** 10 recordings ready
4. **Test**:
   - Click "Pass" for correct ones ✅
   - Edit and click "Edited" for corrections ✏️
   - Skip if needed ⏭️

---

## Verify It Worked

### In Database:
```sql
SELECT COUNT(*) 
FROM recordings 
WHERE status = 'pending' 
AND user_id = '11111111-1111-1111-1111-111111111111';
```
Should return: **10**

### In App:
- Go to `/listen` page
- Should see recordings available for validation

---

## Cleanup After Testing

```sql
-- Remove test recordings
DELETE FROM recordings 
WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- Remove test user (optional)
DELETE FROM users 
WHERE id = '11111111-1111-1111-1111-111111111111';
```

---

**Ready to test your validation workflow!** 🎯

