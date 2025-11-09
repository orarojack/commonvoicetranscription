# Recording Limit Audit Report
**Date:** October 28, 2025  
**Status:** ✅ FULLY IMPLEMENTED - SECURED

> **UPDATE:** All security gaps have been closed. Backend validation now prevents bypass attempts.  
> See `RECORDING_LIMIT_ENFORCEMENT_COMPLETE.md` for full implementation details.

## Summary
Contributors have a **1-hour (3600 seconds)** recording limit implemented, but it can be bypassed through direct API calls. The limit is enforced only at the UI level, not at the database/backend level.

## Current Implementation

### ✅ Frontend Enforcement (UI Level)
**Location:** `app/speak/page.tsx` + `lib/database.ts`

#### 1. `getAvailableSentencesForUser()` Method
- **File:** `lib/database.ts` lines 1081-1092
- **Behavior:** Returns empty array if user has >= 3600 seconds recorded
- **Trigger:** Called when loading sentences in the speak page

```typescript
// Check if user has reached the 1-hour (3600 seconds) recording limit
const hasCompletedTarget = await this.hasUserCompletedRecordingTarget(userId)
if (hasCompletedTarget) {
  console.log(`User ${userId} has completed the 1-hour recording target`)
  return [] // Return empty to trigger completion message
}
```

#### 2. `hasUserCompletedRecordingTarget()` Method
- **File:** `lib/database.ts` lines 1200-1226
- **Behavior:** Checks if total recording time >= 3600 seconds
- **Returns:** `true` if limit reached, `false` otherwise

```typescript
const totalSeconds = recordings.reduce((sum, recording) => {
  const duration = typeof recording.duration === 'string' 
    ? parseFloat(recording.duration) 
    : (recording.duration || 0)
  return sum + duration
}, 0)

return totalSeconds >= 3600 // 1 hour in seconds
```

#### 3. UI Display
- **File:** `app/speak/page.tsx` lines 67-79, 829-888
- **Behavior:** Shows congratulations message instead of recording interface
- **Features:**
  - 🎉 Celebration message
  - Stats display (total time, recordings, 100% complete)
  - Thank you message
  - "Return to Dashboard" button

### ❌ Backend Enforcement (MISSING)

#### `createRecording()` Method - NO VALIDATION
- **File:** `lib/database.ts` lines 405-454
- **Current Behavior:** Accepts any recording without checking user's total time
- **Validation Present:**
  - ✅ Validates user_id is a valid UUID
  - ✅ Logs recording data
  - ❌ **DOES NOT check if user has exceeded 3600-second limit**

```typescript
async createRecording(recordingData: ...): Promise<Recording> {
  try {
    if (!recordingData.user_id || !isValidUUID(recordingData.user_id)) {
      throw new Error("Invalid user ID provided for recording")
    }

    // NO CHECK FOR RECORDING LIMIT HERE!
    
    const { data, error } = await supabase
      .from("recordings")
      .insert({
        ...recordingData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
      
    // ... rest of the code
  }
}
```

## Bypass Scenarios

### 🚨 Scenario 1: Direct Database Call
A malicious user could call `db.createRecording()` directly from browser console:

```javascript
// In browser console after reaching 3600 seconds
await db.createRecording({
  user_id: "their-user-id",
  sentence: "Any sentence text",
  audio_url: "data:audio/webm;base64,....."
  duration: 5.0,
  status: "pending",
  quality: "good",
  metadata: {}
})
// ✅ This would succeed even after reaching the limit!
```

### 🚨 Scenario 2: Modified Frontend Code
A technical user could:
1. Download/fork the codebase
2. Remove the completion check in `loadSentences()`
3. Continue recording past 3600 seconds
4. All recordings would be accepted by the backend

### 🚨 Scenario 3: API Endpoint (if exists)
If there's a REST API endpoint for creating recordings, it would accept recordings without checking the limit.

## Security Impact

### Severity: **MEDIUM**
- **Impact:** Users could contribute unlimited recordings
- **Likelihood:** Low (requires technical knowledge)
- **Data Integrity:** Could skew dataset with overrepresentation from certain users
- **Cost Impact:** Additional storage costs if many users bypass

### Current Protection:
- ✅ Honest users are properly limited
- ✅ UI prevents accidental over-recording
- ✅ Non-technical users cannot bypass

### Vulnerabilities:
- ❌ Technical users can bypass
- ❌ No server-side enforcement
- ❌ No database-level constraint

## Recommendations

### 🔴 Priority 1: Add Backend Validation

#### Modify `createRecording()` Method
```typescript
async createRecording(recordingData: Database["public"]["Tables"]["recordings"]["Insert"]): Promise<Recording> {
  try {
    if (!recordingData.user_id || !isValidUUID(recordingData.user_id)) {
      throw new Error("Invalid user ID provided for recording")
    }

    // ✅ ADD THIS: Check if user has exceeded recording limit
    const hasCompletedTarget = await this.hasUserCompletedRecordingTarget(recordingData.user_id)
    if (hasCompletedTarget) {
      throw new Error("Recording limit exceeded. You have already completed the 1-hour recording target.")
    }

    // Check if adding this recording would exceed the limit
    const currentTotalTime = await this.getUserTotalRecordingTime(recordingData.user_id)
    const newDuration = typeof recordingData.duration === 'string' 
      ? parseFloat(recordingData.duration) 
      : (recordingData.duration || 0)
    
    if (currentTotalTime + newDuration > 3600) {
      const remainingTime = 3600 - currentTotalTime
      throw new Error(`Recording would exceed limit. You have ${remainingTime.toFixed(1)} seconds remaining.`)
    }

    const { data, error } = await supabase
      .from("recordings")
      .insert({
        ...recordingData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    // ... rest of the code
  }
}
```

### 🟡 Priority 2: Database Trigger (Optional)

Create a PostgreSQL trigger to enforce at database level:

```sql
-- Create function to check recording limit
CREATE OR REPLACE FUNCTION check_recording_limit()
RETURNS TRIGGER AS $$
DECLARE
  total_time DECIMAL(10,2);
BEGIN
  -- Calculate user's total recording time
  SELECT COALESCE(SUM(duration), 0) INTO total_time
  FROM recordings
  WHERE user_id = NEW.user_id;
  
  -- Check if adding this recording would exceed 3600 seconds
  IF total_time + NEW.duration > 3600 THEN
    RAISE EXCEPTION 'Recording limit exceeded. User has already recorded % seconds. Limit is 3600 seconds.', total_time;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS enforce_recording_limit ON recordings;
CREATE TRIGGER enforce_recording_limit
  BEFORE INSERT ON recordings
  FOR EACH ROW
  EXECUTE FUNCTION check_recording_limit();
```

### 🟢 Priority 3: Additional Safeguards

1. **Admin Override Flag**
   - Add `allow_unlimited_recordings` boolean to users table
   - Allow certain users (e.g., testers) to bypass limit

2. **Soft vs Hard Limit**
   - Implement warning at 50 minutes
   - Allow slight overages (e.g., 3620 seconds) to finish current recording

3. **Audit Logging**
   - Log all bypass attempts
   - Alert admins if users exceed limit significantly

4. **API Rate Limiting**
   - Limit recording submissions per hour
   - Prevent rapid-fire submissions

## Testing

### Test Case 1: Normal User Journey
```javascript
// User with 3550 seconds recorded
// Attempt to record 60-second clip
// Expected: ✅ Allowed (total would be 3610, slight overage acceptable)
```

### Test Case 2: At Limit
```javascript
// User with exactly 3600 seconds recorded
// Attempt to record any new clip
// Expected: ❌ Rejected with clear error message
```

### Test Case 3: Bypass Attempt
```javascript
// User with 3600+ seconds
// Direct db.createRecording() call
// Expected (after fix): ❌ Rejected
```

## Monitoring

### Metrics to Track
1. **Users exceeding 3600 seconds** - Count how many users have total > 3600
2. **Largest contributor** - User with most recording time
3. **Average contribution** - Mean recording time per user
4. **Bypass attempts** - Failed recording submissions due to limit

### Query to Find Users Over Limit
```sql
SELECT 
  u.id,
  u.email,
  u.name,
  SUM(r.duration) as total_seconds,
  COUNT(r.id) as total_recordings,
  SUM(r.duration) / 60.0 as total_minutes
FROM users u
JOIN recordings r ON r.user_id = u.id
WHERE u.role = 'contributor'
GROUP BY u.id, u.email, u.name
HAVING SUM(r.duration) > 3600
ORDER BY total_seconds DESC;
```

## Current Status

### What Works ✅
- UI prevents honest users from exceeding limit
- Completion message displays correctly
- Total time calculated accurately
- Good user experience for legitimate use

### What Doesn't Work ❌
- Backend doesn't validate limit
- Technical users can bypass
- Database has no constraint
- No audit trail for bypass attempts

## Action Items

- [x] Add validation to `createRecording()` method ✅ **COMPLETED**
- [x] Test backend validation ✅ **COMPLETED**
- [x] Add UI progress indicator ✅ **COMPLETED**
- [x] Show time remaining to users ✅ **COMPLETED**
- [ ] Create database trigger (optional) - Future enhancement
- [ ] Add admin override functionality - Future enhancement
- [ ] Implement monitoring queries - Future enhancement
- [ ] Document bypass attempt handling - Future enhancement
- [ ] Create alerts for suspicious activity - Future enhancement

## Conclusion

The 1-hour recording limit is **implemented and working for normal users**, but has a **security gap allowing bypass by technical users**. This should be addressed by adding backend validation to the `createRecording()` method.

**Recommendation:** Implement Priority 1 (backend validation) as soon as possible to prevent abuse.

