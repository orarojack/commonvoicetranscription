# Role-Based Email Uniqueness Feature

## Overview
This feature allows users to create multiple accounts with the same email address, as long as each account has a different role (contributor or reviewer). This enables users to switch between roles using the same credentials.

## What Changed

### Database Schema
- **Removed**: UNIQUE constraint on `email` column alone
- **Added**: Composite UNIQUE constraint on `(email, role)` combination
- **Result**: Same email can be used for both contributor AND reviewer accounts, but not duplicated within the same role

### Code Changes

#### 1. Database Layer (`lib/database.ts`)
- Added `getUserByEmailAndRole()` method to query users by email AND role
- Added `getAllUsersByEmail()` method to get all accounts with the same email

#### 2. Authentication Provider (`components/auth-provider.tsx`)
- Updated `signup()` function to check for email+role combination instead of email alone
- Updated `login()` function to handle multiple accounts with the same email
- Added role selector logic when user has multiple accounts

#### 3. OAuth Handlers
- Updated Google OAuth handler (`app/api/auth/google/route.ts`)
- Updated GitHub OAuth handler (`app/api/auth/github/route.ts`)
- Both now check for email+role combination instead of email alone

#### 4. Sign-in Page (`app/auth/signin/page.tsx`)
- Added role selection step for users with multiple accounts
- Users see a nice UI to select which account (role) they want to sign in to

## User Experience

### Signup Flow
1. User signs up as a **contributor** with `user@example.com`
   - ✅ Account created successfully
2. Same user signs up as a **reviewer** with `user@example.com` (same email, same password)
   - ✅ Second account created successfully
3. If user tries to create another **contributor** account with `user@example.com`
   - ❌ Error: "An account with this email already exists as a contributor"

### Login Flow
1. User enters email and password
2. System checks how many accounts match
3. **Scenario A**: Only one account exists
   - User is logged in directly
4. **Scenario B**: Multiple accounts exist (e.g., both contributor and reviewer)
   - User sees a role selector screen
   - User chooses which account to sign in to
   - User is logged in to the selected account

## Database Migration

### Step 1: Run the SQL Migration

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `scripts/010_allow_role_based_email_uniqueness.sql`
4. Click "Run" to execute

**Option B: Using PowerShell Script**
```powershell
# Navigate to your project directory
cd "C:\Users\jacko\Downloads\voice-platform (1)"

# Read the SQL file
$sql = Get-Content -Path "scripts\010_allow_role_based_email_uniqueness.sql" -Raw

# Install PostgreSQL client if not already installed
# Install-Module -Name SimplySql

# Connect to your Supabase database
# Update these with your Supabase connection details
Import-Module SimplySql
$connectionString = "Host=<your-supabase-host>;Port=5432;Database=postgres;Username=postgres;Password=<your-password>;SSL Mode=Require;"
Open-PostGreConnection -ConnectionString $connectionString

# Execute the migration
Invoke-SqlUpdate -Query $sql

# Close connection
Close-SqlConnection
```

**Option C: Using psql Command Line**
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f scripts/010_allow_role_based_email_uniqueness.sql
```

### Step 2: Verify Migration
After running the migration, verify it worked:

```sql
-- Check the constraints on the users table
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'users' AND table_schema = 'public';

-- You should see:
-- users_email_role_unique | UNIQUE
```

### Step 3: Test the Feature
1. Try creating a contributor account with an email
2. Try creating a reviewer account with the same email
3. Both should succeed!
4. Try logging in - if you have both accounts, you'll see a role selector

## Rollback (If Needed)

If you need to rollback this change:

```sql
-- Remove the composite unique constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_role_unique;

-- Add back the original unique constraint on email
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
```

**Warning**: Rollback will fail if you have duplicate emails in the database. You'll need to manually remove duplicates first.

## Technical Details

### Composite Unique Constraint
```sql
ALTER TABLE users 
ADD CONSTRAINT users_email_role_unique UNIQUE (email, role);
```

This creates a unique index on the combination of `email` and `role`, allowing:
- ✅ `user@example.com` + `contributor`
- ✅ `user@example.com` + `reviewer`
- ❌ `user@example.com` + `contributor` (duplicate)

### New Database Methods

```typescript
// Check if email+role combination exists
async getUserByEmailAndRole(
  email: string, 
  role: "contributor" | "reviewer"
): Promise<User | null>

// Get all accounts with this email
async getAllUsersByEmail(email: string): Promise<User[]>
```

### Login with Multiple Accounts

```typescript
// Login function now accepts optional preferred role
async login(
  email: string, 
  password: string, 
  preferredRole?: "contributor" | "reviewer"
)

// If multiple accounts exist and no role specified,
// throws error: "MULTIPLE_ACCOUNTS:contributor and reviewer"
// The signin page catches this and shows role selector
```

## Benefits

1. **Flexibility**: Users can have both contributor and reviewer accounts
2. **Same Credentials**: Users can use the same email and password for both roles
3. **Easy Role Switching**: No need to maintain separate emails for different roles
4. **Data Separation**: Each role has its own account with separate profile data

## Security Considerations

- Password is shared between accounts (same email, same password)
- Profile data is separate for each role-account
- Role-based access control still applies (contributors can't access reviewer features and vice versa)
- Admin accounts still require separate login

## Future Enhancements

Potential improvements for future versions:
1. Add a "Switch Role" button for users with multiple accounts
2. Show all available accounts on profile page
3. Allow account linking/unlinking
4. Add account type badges in the UI
5. Implement role-based notifications

## Support

If you encounter issues:
1. Check database migration completed successfully
2. Clear browser cache and localStorage
3. Verify Supabase connection is working
4. Check browser console for errors
5. Review server logs for authentication errors

## Credits

Implementation Date: October 17, 2025
Feature Request: User wants to use same email for both contributor and reviewer roles

