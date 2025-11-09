# Testing Reviewer Signup Requirements

## Quick Test Guide

The changes have been implemented. To see them working:

### ✅ Step 1: Restart Your Dev Server

**Important**: You must restart your development server to see the changes!

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
# or
pnpm dev
```

### ✅ Step 2: Test the 1-Hour Requirement

**Scenario**: Try to sign up as reviewer with < 1 hour of recordings

1. **Setup**: Create a contributor account with email `test@example.com`
2. **Record**: Make some recordings (but less than 1 hour total approved time)
3. **Test**: Try to sign up as reviewer with same email `test@example.com`
4. **Expected**: You should see an error message like:
   ```
   "You must complete at least 1 hour (3600 seconds) of approved recordings 
   as a contributor before you can sign up as a reviewer. 
   You currently have X minutes of approved recordings. 
   You need Y more minutes to qualify."
   ```

### ✅ Step 3: Test Profile Copying (When 1 Hour is Met)

**Scenario**: Contributor with complete profile signs up as reviewer

1. **Setup**: 
   - Contributor account with complete profile
   - Has 1+ hour of approved recordings
   - Email: `test@example.com`

2. **Sign Up as Reviewer**:
   - Go to signup page
   - Select "Reviewer" role
   - Use same email: `test@example.com`
   - Use same password

3. **Expected Result**:
   - ✅ Signup succeeds (no 1-hour error)
   - ✅ Account created with `profile_complete: true`
   - ✅ All profile data copied from contributor account

4. **After Admin Approval**:
   - Login as reviewer
   - ✅ Should skip profile setup page
   - ✅ Should go directly to dashboard/listen page

### ✅ Step 4: Check Console Logs

When testing, check your browser console and terminal for these logs:

**During Signup:**
- Look for: `hasUserCompletedRecordingTarget` calls
- Look for: Profile copying logs

**After Login:**
- Look for: `"Profile setup - Reviewer already has complete profile, redirecting to dashboard"`

---

## Verification Checklist

✅ **1-Hour Check Working?**
- [ ] Try signing up as reviewer with < 1 hour → Should see error
- [ ] Try with 1+ hour → Should succeed

✅ **Profile Copying Working?**
- [ ] Contributor has complete profile
- [ ] Sign up as reviewer with same email
- [ ] Check database: Reviewer should have all profile fields filled
- [ ] Reviewer `profile_complete` should be `true`

✅ **Skip Profile Setup Working?**
- [ ] Login as approved reviewer with complete profile
- [ ] Should NOT see profile setup form
- [ ] Should redirect to dashboard automatically

---

## Debugging

If you don't see the changes:

1. **Hard Refresh Browser**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Clear Browser Cache**: DevTools → Application → Clear Storage
3. **Check Terminal**: Look for TypeScript errors
4. **Check Console**: Look for JavaScript errors

## Quick Verification Commands

Check if code is in place:

```bash
# Check for 1-hour check in signup
grep -n "hasUserCompletedRecordingTarget" components/auth-provider.tsx

# Check for profile copying
grep -n "profileDataToCopy" components/auth-provider.tsx

# Check for skip profile setup
grep -n "reviewer.*profile_complete" app/profile/setup/page.tsx
```

---

## Expected Behavior

### ❌ Contributor with 30 minutes → Reviewer Signup
- **Result**: Signup blocked
- **Message**: Shows current progress and remaining time

### ✅ Contributor with 60+ minutes + Complete Profile → Reviewer Signup  
- **Result**: Signup succeeds
- **Profile**: All data copied
- **After Approval**: Skips profile setup

### ✅ New User → Reviewer Signup (No Contributor)
- **Result**: Signup succeeds (no 1-hour check)
- **Profile**: Must complete profile setup

---

**Note**: Make sure your dev server is running the latest code. If you're using a build, run `npm run build` first!

