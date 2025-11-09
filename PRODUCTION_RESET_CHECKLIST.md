# Production Reset Checklist

This guide helps you safely clear all test data before going to production.

## ⚠️ BEFORE YOU START

**IMPORTANT**: This will permanently delete ALL:
- Test recordings
- Test user accounts (contributors & reviewers)
- Test reviews
- Storage files

**WHAT WILL BE PRESERVED:**
- ✅ Admin accounts (all users with `role = 'admin'`)
- ✅ Database schema and structure
- ✅ Sentences table (reference data)
- ✅ All indexes and constraints

## 📋 Pre-Reset Checklist

Before running the reset script:

- [ ] **Backup your database** (if you want to keep a copy of test data)
- [ ] **Verify admin accounts** - Make sure you know your admin login credentials
- [ ] **Check storage usage** - Note how much storage you're using for reference
- [ ] **Review test data** - Confirm which data is test vs. production
- [ ] **Close all sessions** - Log out from all test accounts
- [ ] **Stop active processes** - Ensure no recordings are being submitted/reviewed

## 🚀 Step-by-Step Reset Process

### Step 1: Verify Admin Accounts

First, verify your admin accounts exist and you can log in:

```sql
-- Run this in Supabase SQL Editor to see your admin accounts
SELECT id, email, role, name, created_at 
FROM users 
WHERE role = 'admin';
```

**Make sure you can log in with at least one admin account!**

### Step 2: Backup (Optional but Recommended)

If you want to keep a copy of your test data:

1. Go to Supabase Dashboard → Settings → Database
2. Click "Download backup" or use pg_dump
3. Or export specific tables:
   ```sql
   -- Export to CSV (optional)
   COPY (SELECT * FROM recordings) TO '/tmp/recordings_backup.csv' CSV HEADER;
   COPY (SELECT * FROM users WHERE role != 'admin') TO '/tmp/users_backup.csv' CSV HEADER;
   COPY (SELECT * FROM reviews) TO '/tmp/reviews_backup.csv' CSV HEADER;
   ```

### Step 3: Run the Reset Script

**Method 1: Using Supabase Dashboard (Recommended)**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open `scripts/014_reset_all_data_keep_admins.sql`
6. **Read through the entire script** to understand what it does
7. Copy the entire contents
8. Paste into SQL Editor
9. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)
10. **Review the output messages carefully**

**Method 2: Using psql (Command Line)**

```bash
# Connect to Supabase
psql "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# Run the script
\i scripts/014_reset_all_data_keep_admins.sql
```

### Step 4: Verify Deletion

After running the script, verify everything was deleted:

```sql
-- Should return only admin accounts
SELECT COUNT(*) as admin_count FROM users WHERE role = 'admin';
SELECT COUNT(*) as user_count FROM users WHERE role != 'admin'; -- Should be 0
SELECT COUNT(*) as recording_count FROM recordings; -- Should be 0
SELECT COUNT(*) as review_count FROM reviews; -- Should be 0
```

### Step 5: Delete Storage Files

⚠️ **CRITICAL**: The SQL script attempts to delete storage files, but you must manually verify and delete if needed.

1. Go to Supabase Dashboard → **Storage**
2. Click on **recordings** bucket (or **audio-recordings**)
3. Select all files/folders
4. Click **Delete**
5. Confirm deletion

**OR** Use the manual guide: `scripts/015_delete_storage_files_manual.md`

### Step 6: Final Verification

Verify your system is ready for production:

```sql
-- Admin accounts exist
SELECT email, name, role FROM users WHERE role = 'admin';

-- No test data remains
SELECT 
  (SELECT COUNT(*) FROM users WHERE role != 'admin') as users,
  (SELECT COUNT(*) FROM recordings) as recordings,
  (SELECT COUNT(*) FROM reviews) as reviews;
```

All counts should be **0** except for admin users.

## 🔒 Post-Reset Security Checklist

Before going live:

- [ ] **Review admin accounts** - Remove any test admin accounts
- [ ] **Verify email configuration** - Test email notifications work
- [ ] **Check environment variables** - Ensure production values are set
- [ ] **Review storage policies** - Ensure proper access controls
- [ ] **Test signup flow** - Create a test account to verify everything works
- [ ] **Test recording submission** - Verify contributors can submit
- [ ] **Test review process** - Verify reviewers can review
- [ ] **Check Mozilla integration** - If using, verify upload credentials

## 📊 Expected Results

After reset, you should have:

✅ **Users**: Only admin accounts
✅ **Recordings**: 0
✅ **Reviews**: 0
✅ **Storage**: Empty or minimal
✅ **Sentences**: Still available (reference data)

## 🚨 Troubleshooting

### Issue: "Cannot delete storage files via SQL"

**Solution**: Delete manually via Supabase Dashboard → Storage → recordings bucket

### Issue: "Some data still remains"

**Solution**: 
1. Check which data remains
2. Manually delete if needed:
   ```sql
   DELETE FROM reviews WHERE recording_id IN (SELECT id FROM recordings);
   DELETE FROM recordings WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin');
   DELETE FROM users WHERE role != 'admin';
   ```

### Issue: "Admin account missing"

**Solution**: 
1. Don't panic - the script only deletes non-admin users
2. If you accidentally deleted an admin, restore from backup
3. Or create a new admin account manually

### Issue: "Foreign key constraint errors"

**Solution**: The script handles this by deleting in the correct order. If errors occur:
1. Check the error message
2. Delete in order: reviews → recordings → users

## 📝 Post-Production Notes

After reset and before going live:

1. **Update environment variables** if using different values for production
2. **Review all user-facing content** for test data references
3. **Test the complete user journey** as a new user
4. **Document any customizations** you've made
5. **Set up monitoring** for production environment
6. **Prepare backup strategy** for production data

## ✅ Production Ready Checklist

Your system is ready for production when:

- [x] All test data deleted
- [x] Only admin accounts remain
- [x] Storage files cleared
- [x] Admin can log in successfully
- [x] New user signup works
- [x] Recording submission works
- [x] Review process works
- [x] All integrations tested (email, Mozilla, etc.)
- [x] Environment variables configured
- [x] Error handling verified

## 🎉 You're Ready!

Once all checks pass, your system is ready for production users!

