# Database Reset Instructions

This guide explains how to reset your database to remove all recordings and non-admin users while keeping admin credentials intact.

## ⚠️ WARNING

**This operation is IRREVERSIBLE!** All user data, recordings, and reviews will be permanently deleted. Only admin accounts will be preserved.

## What Will Be Deleted

- ✅ All recordings (pending, approved, and rejected) **from database**
- ✅ All reviews
- ✅ All contributor accounts
- ✅ All reviewer accounts
- ✅ All user profiles and demographic data
- ⚠️ **Storage Files**: The script will attempt to delete files from Supabase Storage, but this may require manual deletion via Dashboard (see below)

## What Will Be Preserved

- ✅ Admin accounts (all users with `role = 'admin'`)
- ✅ Sentences table (reference data from Mozilla API)
- ✅ Database schema and table structure
- ✅ All indexes and constraints

## How to Run the Reset Script

### Option 1: Using Supabase Dashboard (Recommended)

1. Log in to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your project
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the file `scripts/014_reset_all_data_keep_admins.sql`
6. Copy the entire contents of the file
7. Paste it into the SQL Editor
8. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)
9. Review the output messages to confirm deletion

### Option 2: Using psql (Command Line)

```bash
# Connect to your Supabase database
psql "postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# Or if you have connection string in .env
psql $DATABASE_URL

# Run the script
\i scripts/014_reset_all_data_keep_admins.sql
```

### Option 3: Using Supabase CLI

```bash
# Make sure you're logged in
supabase login

# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Run the SQL script
supabase db execute -f scripts/014_reset_all_data_keep_admins.sql
```

## Verification Steps

After running the script, verify the results:

1. **Check Admin Accounts**:
   ```sql
   SELECT id, email, role, name FROM users WHERE role = 'admin';
   ```
   You should see all your admin accounts listed.

2. **Verify No Non-Admin Users**:
   ```sql
   SELECT COUNT(*) FROM users WHERE role != 'admin';
   ```
   This should return `0`.

3. **Verify No Recordings**:
   ```sql
   SELECT COUNT(*) FROM recordings;
   ```
   This should return `0`.

4. **Verify No Reviews**:
   ```sql
   SELECT COUNT(*) FROM reviews;
   ```
   This should return `0`.

## Storage Files Cleanup

⚠️ **IMPORTANT**: The SQL script will attempt to delete storage files, but due to RLS (Row Level Security) policies, this may fail. 

**You must manually delete storage files using one of these methods:**

### Method 1: Supabase Dashboard (Recommended)
1. Go to **Storage** → **recordings** bucket
2. Select all files/folders
3. Click **Delete**

See `scripts/015_delete_storage_files_manual.md` for detailed instructions.

### Method 2: After Running SQL Script
After running the SQL script, check if storage files were deleted:
1. Go to Storage in Supabase Dashboard
2. Check the `recordings` bucket
3. If files still exist, delete them manually using the Dashboard

**Why this is necessary:**
- Storage files are stored separately from database records
- RLS policies may prevent SQL from deleting storage files
- Manual deletion via Dashboard is the most reliable method

## After Reset

1. ✅ Admin accounts can log in normally
2. ✅ New users can create fresh accounts
3. ✅ Contributors can start submitting recordings
4. ✅ Reviewers can start reviewing (after admin approval)
5. ✅ All data starts from zero
6. ✅ **Remember to delete storage files manually if they weren't deleted automatically**

## Troubleshooting

### If the script fails:

1. Check the error message in the SQL output
2. Common issues:
   - **Foreign key constraint errors**: The script handles this, but if you see errors, you may need to manually delete in order:
     - Reviews first
     - Recordings second
     - Users last
   - **Permission errors**: Ensure you're using an admin database user
   - **Transaction errors**: Make sure no other processes are accessing the database

### If some data remains:

The script includes verification at the end. If warnings appear:
1. Manually check what data remains
2. You may need to run individual DELETE statements
3. Check for any custom constraints or triggers that might prevent deletion

## Safety Notes

- The script uses a transaction (BEGIN/COMMIT) so if anything fails, nothing is deleted
- Admin accounts are protected by the `WHERE role != 'admin'` condition
- The script logs counts before and after deletion for verification
- Always backup your database before running destructive operations

## Backup Before Reset (Optional but Recommended)

If you want to backup before resetting:

```sql
-- Export users (excluding passwords for security)
COPY (SELECT id, email, role, name, created_at FROM users WHERE role != 'admin') 
TO '/tmp/users_backup.csv' CSV HEADER;

-- Export recordings metadata (not audio files)
COPY (SELECT id, user_id, sentence, duration, status, created_at FROM recordings) 
TO '/tmp/recordings_backup.csv' CSV HEADER;
```

## Need Help?

If you encounter any issues:
1. Check the Supabase logs in the dashboard
2. Review the error messages carefully
3. Ensure you have the correct permissions
4. Verify your database connection

