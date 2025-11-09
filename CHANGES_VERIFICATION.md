# ✅ Changes Verification - Reviewer Signup Requirements

## All Changes Are Present! ✅

I've verified all code changes are in place. Here's where they are:

### 1. ✅ 1-Hour Target Check
**File**: `components/auth-provider.tsx` (Lines 353-380)

The code checks for 1-hour requirement:
```typescript
// Line 353-380
if (role === "reviewer") {
  const contributorAccount = await db.getUserByEmailAndRole(email.toLowerCase().trim(), "contributor")
  
  if (contributorAccount) {
    const hasCompletedTarget = await db.hasUserCompletedRecordingTarget(contributorAccount.id)
    
    if (!hasCompletedTarget) {
      // Shows error with current progress
      throw new Error("You must complete at least 1 hour...")
    }
  }
}
```

**Also in**: 
- `app/api/auth/google/route.ts` (Lines 101-123)
- `app/api/auth/github/route.ts` (Lines 143-165)

### 2. ✅ Profile Data Copying
**File**: `components/auth-provider.tsx` (Lines 382-443)

The code copies profile data:
```typescript
// Line 382-406
let profileDataToCopy: Partial<User> | null = null
if (role === "reviewer") {
  const contributorAccount = await db.getUserByEmailAndRole(email.toLowerCase().trim(), "contributor")
  if (contributorAccount && contributorAccount.profile_complete) {
    profileDataToCopy = {
      name: contributorAccount.name,
      age: contributorAccount.age,
      // ... all profile fields
    }
  }
}

// Line 409-426 - Creates user with copied data
const newUser = await db.createUser({
  profile_complete: profileDataToCopy ? true : false,
  // ... all copied fields
})
```

**Also in**:
- `app/api/auth/google/route.ts` (Lines 125-183)
- `app/api/auth/github/route.ts` (Lines 167-225)

### 3. ✅ Skip Profile Setup
**File**: `app/profile/setup/page.tsx` (Lines 127-130)

The code skips profile setup:
```typescript
// Line 127-130
} else if (!isLoading && user && user.role === "reviewer" && user.profile_complete) {
  // Reviewer with complete profile - skip setup and go to dashboard
  console.log("Profile setup - Reviewer already has complete profile, redirecting to dashboard")
  router.push("/dashboard")
}
```

---

## 🔍 How to See the Changes Working

### Option 1: Test the 1-Hour Requirement

**You need to test with a contributor account that has < 1 hour of recordings:**

1. **Create a contributor account** (if you don't have one)
   - Sign up as contributor with email: `test-contributor@test.com`

2. **Make some recordings** (but not 1 hour total)
   - Record a few sentences
   - Get some approved (need admin to approve them)
   - Make sure total is less than 3600 seconds (1 hour)

3. **Try to sign up as reviewer** with the same email
   - Go to `/auth/signup`
   - Select "Reviewer" role
   - Use same email: `test-contributor@test.com`
   - Submit

4. **You should see**:
   ```
   Error: You must complete at least 1 hour (3600 seconds) of approved 
   recordings as a contributor before you can sign up as a reviewer. 
   You currently have X minutes of approved recordings. 
   You need Y more minutes to qualify.
   ```

### Option 2: Check in Developer Tools

1. **Open Browser Console** (F12)
2. **Try to sign up as reviewer** with a contributor email
3. **Look for these logs**:
   - `hasUserCompletedRecordingTarget` calls
   - `profileDataToCopy` assignments
   - Error messages about 1-hour requirement

### Option 3: Check Database Directly

After a successful reviewer signup (with contributor account):

1. **Check the reviewer account** in database
2. **Verify**: 
   - `profile_complete` = `true` (if contributor had complete profile)
   - All profile fields are filled (name, age, gender, etc.)

---

## 🐛 Why You Might Not See It

### Issue 1: Dev Server Not Restarted
**Fix**: Stop and restart your dev server
```bash
# Press Ctrl+C to stop
# Then:
npm run dev
```

### Issue 2: Testing Wrong Scenario
**The check ONLY applies if:**
- ✅ You already have a **contributor** account
- ✅ You're trying to sign up as **reviewer** with the **same email**

**If you:**
- ❌ Sign up as reviewer with a NEW email → No check (allowed)
- ❌ Sign up as reviewer when you DON'T have contributor → No check (allowed)
- ❌ Already have a reviewer account → Error: "account already exists"

### Issue 3: Browser Cache
**Fix**: Hard refresh
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### Issue 4: Contributor Has 1+ Hour Already
**If your contributor already has 1+ hour:**
- The check will pass silently
- Profile copying will happen
- You'll see the profile data copied

---

## 📋 Test Scenarios

### Test Case 1: Contributor < 1 Hour → Reviewer Signup
1. Contributor account exists
2. Has 30 minutes of approved recordings
3. Try reviewer signup → ❌ **Should block with error**

### Test Case 2: Contributor 1+ Hour + Profile → Reviewer Signup
1. Contributor account exists
2. Has 60+ minutes of approved recordings
3. Profile is complete
4. Try reviewer signup → ✅ **Should succeed**
5. Check reviewer account → ✅ **Profile should be copied**

### Test Case 3: New User → Reviewer Signup
1. No existing accounts
2. Sign up directly as reviewer → ✅ **Should succeed** (no 1-hour check)

---

## ✅ Quick Verification

Run these commands to verify code is in place:

```bash
# Check for 1-hour check
grep -n "hasUserCompletedRecordingTarget" components/auth-provider.tsx

# Check for profile copying  
grep -n "profileDataToCopy" components/auth-provider.tsx

# Check for skip profile setup
grep -n "reviewer.*profile_complete" app/profile/setup/page.tsx
```

**All should return results if code is present!**

---

## 🎯 What You Should See

### When Testing Signup:
- **With < 1 hour**: Clear error message showing your progress
- **With 1+ hour**: Signup succeeds, profile data copied automatically

### When Testing Login (After Approval):
- **Reviewer with copied profile**: Automatically redirects to dashboard
- **Reviewer without profile**: Shows profile setup form

---

**The code is definitely there!** Make sure you're testing the right scenario and restart your dev server.

