# Reviewer Signup Requirements and Profile Sharing

## Overview

Implemented two key features for reviewer signup:
1. **1-Hour Recording Target Requirement**: Contributors must complete at least 1 hour (3600 seconds) of approved recordings before they can sign up as reviewers
2. **Automatic Profile Sharing**: When a contributor creates a reviewer account, their profile data is automatically copied - no need to rebuild the profile

---

## 🎯 Feature 1: 1-Hour Recording Target Requirement

### Requirements
- Contributors must have **at least 3600 seconds (1 hour)** of **approved** recordings
- Only approved recordings count toward the target
- Pending or rejected recordings do not count

### Implementation
**Location**: `components/auth-provider.tsx`, `app/api/auth/google/route.ts`, `app/api/auth/github/route.ts`

**Checks:**
1. When signing up as reviewer, system checks if email has an existing contributor account
2. If contributor account exists, calculates total approved recording time
3. If less than 3600 seconds, signup is blocked with detailed error message
4. Shows current progress and remaining time needed

### User Experience

**If target NOT met:**
```
Error: You must complete at least 1 hour (3600 seconds) of approved recordings 
as a contributor before you can sign up as a reviewer. 
You currently have 45 minutes of approved recordings. 
You need 15 more minutes to qualify.
```

**If target met:**
- Signup proceeds normally
- Profile data is automatically copied (see Feature 2)

---

## 📋 Feature 2: Automatic Profile Data Sharing

### How It Works

When a contributor with a complete profile signs up as a reviewer:

1. **Profile Detection**: System checks if contributor has `profile_complete: true`
2. **Data Copying**: All profile fields are copied from contributor account:
   - Name, Age, Gender
   - Location, Constituency
   - Educational Background, Employment Status
   - Phone Number
   - Languages, Language Dialect
   - ID Number (if exists)
   - Accent Dialect, Accent Description (if exists)
3. **Profile Status**: Reviewer account is created with `profile_complete: true`
4. **Skip Setup**: Reviewer skips profile setup page and goes straight to dashboard

### Implementation Details

**Location**: `components/auth-provider.tsx` (regular signup), `app/api/auth/google/route.ts` (Google OAuth), `app/api/auth/github/route.ts` (GitHub OAuth)

**Profile Fields Copied:**
- Basic: `name`, `age`, `gender`
- Location: `location`, `constituency`
- Education/Employment: `educational_background`, `employment_status`
- Contact: `phone_number`
- Languages: `languages`, `language_dialect`
- Custom: `id_number`, `accent_dialect`, `accent_description`

**Profile Setup Bypass:**
- Location: `app/profile/setup/page.tsx`
- If reviewer has `profile_complete: true`, automatically redirects to dashboard
- No need to fill out profile form again

---

## 🔄 User Flow

### Scenario 1: Contributor → Reviewer (With Complete Profile)

1. **Contributor Account**
   - User signs up as contributor
   - Completes profile setup
   - Records audio and gets recordings approved
   - Reaches 1 hour (3600 seconds) of approved recordings ✅

2. **Reviewer Signup**
   - User signs up as reviewer with same email
   - System checks: ✅ 1 hour target met
   - System copies: ✅ Profile data from contributor
   - Account created with `profile_complete: true`
   - Status: `pending` (waits for admin approval)

3. **After Admin Approval**
   - User logs in as reviewer
   - Profile setup page detects complete profile
   - Automatically redirects to dashboard ✅
   - No profile form needed!

### Scenario 2: Contributor → Reviewer (Target Not Met)

1. **Contributor Account**
   - User signs up as contributor
   - Records audio but hasn't reached 1 hour yet
   - Current: 30 minutes of approved recordings

2. **Reviewer Signup Attempt**
   - User tries to sign up as reviewer
   - System checks: ❌ Only 30 minutes (needs 1 hour)
   - **Signup blocked** with error message
   - User must continue recording until they reach 1 hour

### Scenario 3: New Reviewer (No Contributor Account)

1. **No Existing Account**
   - User signs up directly as reviewer
   - No contributor account exists
   - No 1-hour check needed (only applies if contributor exists)
   - Account created normally
   - Must complete profile setup

---

## 📝 Technical Implementation

### Database Methods Used

```typescript
// Check if user completed 1-hour target
await db.hasUserCompletedRecordingTarget(userId): Promise<boolean>

// Get user by email and role
await db.getUserByEmailAndRole(email, role): Promise<User | null>

// Get all recordings by user (to calculate time)
await db.getRecordingsByUser(userId): Promise<Recording[]>
```

### Signup Flow (Regular Signup)

1. Validate email and password
2. Check if reviewer account already exists → Error if exists
3. **If role === "reviewer"**:
   - Check for contributor account
   - If contributor exists:
     - Check 1-hour target → Block if not met
     - Copy profile data if available
   - Create reviewer account with copied data
   - Mark `profile_complete: true` if data copied

### Signup Flow (OAuth - Google/GitHub)

Same logic as regular signup, but:
- No password required
- Uses OAuth provider's name/email
- Profile data still copied from contributor if available

---

## ✅ Benefits

1. **Quality Control**: Ensures reviewers have experience contributing first
2. **User Convenience**: No need to re-enter profile information
3. **Data Consistency**: Same profile data across both roles
4. **Time Saving**: Skip profile setup for existing contributors
5. **Clear Requirements**: Users know exactly what's needed (1 hour of recordings)

---

## 🧪 Testing

### Test Case 1: Contributor with 1 Hour → Reviewer Signup
1. Create contributor account
2. Complete profile
3. Record and get approved recordings totaling 3600+ seconds
4. Sign up as reviewer with same email
5. ✅ Should succeed and copy profile

### Test Case 2: Contributor with < 1 Hour → Reviewer Signup
1. Create contributor account
2. Complete profile
3. Record but only have 30 minutes approved
4. Try to sign up as reviewer
5. ❌ Should fail with error showing remaining time needed

### Test Case 3: New User → Reviewer Signup
1. No existing accounts
2. Sign up directly as reviewer
3. ✅ Should succeed (no 1-hour check)
4. Must complete profile setup

### Test Case 4: Profile Sharing
1. Contributor with complete profile signs up as reviewer
2. ✅ Profile data should be copied
3. Login as reviewer after approval
4. ✅ Should skip profile setup and go to dashboard

---

## 🔍 Key Files Modified

1. **components/auth-provider.tsx**
   - Added 1-hour target check
   - Added profile data copying logic

2. **app/api/auth/google/route.ts**
   - Added 1-hour target check for OAuth
   - Added profile data copying for OAuth

3. **app/api/auth/github/route.ts**
   - Added 1-hour target check for OAuth
   - Added profile data copying for OAuth

4. **app/profile/setup/page.tsx**
   - Added redirect for reviewers with complete profiles

5. **lib/database.ts**
   - Already had `hasUserCompletedRecordingTarget()` method

---

## 📊 Calculation Details

The 1-hour target calculation:
- Only counts **approved** recordings
- Sums up `duration` field from all approved recordings
- Converts to seconds for comparison
- Formula: `totalSeconds >= 3600`

Example:
- Recording 1: 120 seconds (approved) ✅
- Recording 2: 180 seconds (approved) ✅
- Recording 3: 60 seconds (pending) ❌ (doesn't count)
- Recording 4: 3300 seconds (approved) ✅
- **Total: 3600 seconds** → ✅ Qualifies!

---

## 🎉 Result

Now contributors who want to become reviewers:
1. ✅ Must prove themselves first (1 hour of approved recordings)
2. ✅ Don't need to rebuild their profile (automatic copying)
3. ✅ Skip profile setup after approval (if profile already exists)
4. ✅ Get clear feedback on progress toward the 1-hour target

This creates a quality gate while providing a seamless experience for qualified contributors!

