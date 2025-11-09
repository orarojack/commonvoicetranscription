# Quick Setup: Role-Based Email Uniqueness

## What You Need to Do

### 1. Run Database Migration (REQUIRED)

**You MUST run this SQL migration in your Supabase database:**

```sql
-- Copy and paste this into Supabase SQL Editor and run it

-- Step 1: Drop the existing unique constraint on email
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Step 2: Add a composite unique constraint on email + role
ALTER TABLE users 
ADD CONSTRAINT users_email_role_unique UNIQUE (email, role);

-- Step 3: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role);
```

**How to run:**
1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Paste the SQL above
5. Click **Run**

### 2. That's It!

The code changes are already done. Once you run the migration, the feature will work immediately.

## How to Test

### Test 1: Create Multiple Accounts with Same Email
1. Go to signup page
2. Create a **contributor** account with `test@example.com`
3. Sign out
4. Create a **reviewer** account with the same `test@example.com`
5. ✅ Both accounts should be created successfully

### Test 2: Prevent Duplicate Role
1. Try to create another **contributor** account with `test@example.com`
2. ❌ You should get error: "An account with this email already exists as a contributor"

### Test 3: Role Selector on Login
1. Go to signin page
2. Enter `test@example.com` and password
3. ✅ You should see a role selector asking which account to sign in to
4. Select contributor or reviewer
5. ✅ You should be logged in to the selected account

## Before and After

### ❌ BEFORE (Old Behavior)
- One email = One account only
- If `user@example.com` is a contributor, they cannot create a reviewer account
- Users need separate emails for different roles

### ✅ AFTER (New Behavior)
- One email = Multiple accounts (different roles)
- `user@example.com` can be BOTH contributor AND reviewer
- Same password works for both accounts
- Users can switch roles using the same credentials

## Important Notes

1. **Existing Users**: This change won't affect existing accounts
2. **Password**: If you use the same email for multiple roles, you'll use the same password
3. **Profile Data**: Each role has separate profile data (name, age, demographics, etc.)
4. **Admin Login**: Admin accounts still require the separate admin login page

## Troubleshooting

### Error: "duplicate key value violates unique constraint"
- The migration hasn't been run yet
- Go back to Step 1 and run the SQL migration

### Error: "users_email_key does not exist"
- This is fine - it means the old constraint was already removed or never existed
- Continue with the rest of the migration

### Role selector not showing when logging in
1. Make sure you have multiple accounts with the same email
2. Check browser console for errors
3. Clear browser cache and try again

### OAuth (Google/GitHub) not working
- OAuth also supports the new behavior
- When signing up with Google/GitHub, you can create multiple accounts with different roles

## Files Changed

If you're curious about the implementation:
- `lib/database.ts` - Added helper methods for email+role queries
- `components/auth-provider.tsx` - Updated signup and login logic
- `app/auth/signin/page.tsx` - Added role selector UI
- `app/api/auth/google/route.ts` - Updated Google OAuth
- `app/api/auth/github/route.ts` - Updated GitHub OAuth
- `scripts/010_allow_role_based_email_uniqueness.sql` - Database migration

For detailed documentation, see `ROLE_BASED_EMAIL_UNIQUENESS.md`

## Need Help?

Check the detailed documentation in `ROLE_BASED_EMAIL_UNIQUENESS.md` for:
- Complete technical details
- Rollback instructions
- Troubleshooting guide
- Security considerations

