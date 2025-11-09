# 1-Hour Recording Limit & Completion Feature

## Overview
Contributors have a 1-hour (3600 seconds) recording target. Once they reach this milestone, they receive a congratulations message instead of seeing "no sentences available."

## Changes Made

### 1. Database Functions (`lib/database.ts`)

Added three new functions to track and enforce the 1-hour limit:

#### `hasUserCompletedRecordingTarget(userId: string): Promise<boolean>`
- Checks if a user has recorded 3600+ seconds total
- Called before loading sentences
- Returns `true` if user has completed the target

```typescript
const totalSeconds = recordings.reduce((sum, recording) => {
  const duration = typeof recording.duration === 'string' 
    ? parseFloat(recording.duration) 
    : (recording.duration || 0)
  return sum + duration
}, 0)

return totalSeconds >= 3600 // 1 hour in seconds
```

#### `getUserTotalRecordingTime(userId: string): Promise<number>`
- Returns the user's total recording time in seconds
- Used to display stats on completion screen

#### `getAvailableSentencesForUser(userId: string)` - UPDATED
- Now checks if user has completed the 1-hour target FIRST
- If completed, returns empty array (which triggers completion UI)
- Otherwise, proceeds with normal sentence filtering logic

```typescript
// Check if user has reached the 1-hour (3600 seconds) recording limit
const hasCompletedTarget = await this.hasUserCompletedRecordingTarget(userId)
if (hasCompletedTarget) {
  console.log(`User ${userId} has completed the 1-hour recording target`)
  return [] // Return empty to trigger completion message
}
```

### 2. Speak Page UI (`app/speak/page.tsx`)

#### New State Variables
```typescript
const [hasCompletedTarget, setHasCompletedTarget] = useState(false)
const [totalRecordingTime, setTotalRecordingTime] = useState(0)
```

#### Updated `loadSentences()` Function
- Checks completion status before loading sentences
- Sets appropriate state variables
- Shows completion UI instead of error message

```typescript
// Check if user has completed the 1-hour target first
const completed = await db.hasUserCompletedRecordingTarget(user.id)
const totalTime = await db.getUserTotalRecordingTime(user.id)

setHasCompletedTarget(completed)
setTotalRecordingTime(totalTime)

if (completed) {
  console.log(`🎉 User ${user.id} has completed the 1-hour recording target!`)
  setAvailableSentences([])
  setCurrentSentence("")
  setIsLoadingSentences(false)
  return // Don't show error, just show completion message
}
```

#### Completion UI
**Congratulations Header:**
```tsx
{hasCompletedTarget ? (
  <div className="text-center space-y-2 w-full px-4">
    <div className="text-4xl sm:text-5xl">🎉</div>
    <p className="text-lg sm:text-xl font-bold text-green-600">
      Congratulations!
    </p>
    <p className="text-sm sm:text-base text-gray-700">
      You've completed the 1-hour recording target
    </p>
  </div>
) : ...}
```

**Achievement Stats Card:**
Shows 3 key metrics:
1. **Total Time** - Minutes:Seconds format (e.g., "60:15")
2. **Total Recordings** - Number of recordings made
3. **100% Complete** - Completion status

**Thank You Message:**
- Personalizes the achievement with exact minutes contributed
- Explains the impact on Luo language speech recognition
- Provides "Return to Dashboard" button

### 3. User Experience Flow

#### Normal Flow (Under 1 hour):
1. User sees sentences to record
2. Can record, re-record, and submit
3. Progress shows partial completion
4. New sentences keep loading

#### Completion Flow (60+ minutes):
1. User submits their final recording
2. `loadSentences()` checks total time
3. Detects 3600+ seconds recorded
4. Shows 🎉 congratulations message
5. Displays achievement stats
6. Hides recording controls
7. Shows "Return to Dashboard" button

### 4. Technical Details

#### Time Calculation
- Accumulates `duration` field from all user recordings
- Handles both string and number duration values
- Precision: seconds with 2 decimal places

#### Threshold
- **Target:** 3600 seconds (exactly 1 hour)
- **Condition:** `>= 3600` (inclusive)
- Users who reach exactly 1 hour see completion

#### Performance
- Checks happen on sentence load (not every render)
- Database query fetches all user recordings once
- Calculations done in JavaScript (efficient)

## Testing

### Test Scenario 1: User Approaching Limit
1. Create user with 3500 seconds of recordings
2. Navigate to /speak
3. Should see normal recording interface
4. Record 100+ seconds
5. Should see completion message

### Test Scenario 2: User Already Completed
1. Create user with 3700 seconds of recordings
2. Navigate to /speak
3. Should immediately see congratulations message
4. No sentences should be available
5. Recording controls should be hidden

### Test Scenario 3: Fresh User
1. Create new user with 0 recordings
2. Navigate to /speak
3. Should see normal interface
4. Should be able to record sentences

## Console Logs

When target is completed, you'll see:
```
User <uuid> total recording time: 3600 seconds (60.00 minutes)
🎉 User <uuid> has completed the 1-hour recording target!
User <uuid> has completed the 1-hour recording target
```

When not completed:
```
User <uuid> total recording time: 1234 seconds (20.57 minutes)
Available sentences for user <uuid>: {
  totalSentences: 150,
  availableForUser: 142,
  alreadyRecorded: 8
}
```

## Future Enhancements

### Possible Improvements:
1. **Adjustable Targets** - Allow admins to set different targets per user
2. **Progress Indicators** - Show progress bar toward 1-hour goal
3. **Achievements** - Award badges at 15min, 30min, 45min, 60min milestones
4. **Leaderboard** - Show top contributors
5. **Extended Contributions** - Allow users to continue past 1 hour (optional)
6. **Email Notification** - Send congratulations email when target reached
7. **Certificate** - Generate contribution certificate

### Database Optimization:
- Add `total_recording_time` column to `users` table
- Update via trigger when recordings are added
- Eliminates need to sum on every check

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `lib/database.ts` | Added 3 new functions | +69 |
| `app/speak/page.tsx` | Added completion UI + state | +68 |

## Breaking Changes
None - this is a purely additive feature.

## Backward Compatibility
- Existing recordings continue to work
- Users with any recording time will see accurate stats
- No database migrations required

## Success Criteria
✅ Users can record up to 1 hour of audio  
✅ System detects when 1-hour target is reached  
✅ Congratulations message replaces "no sentences" error  
✅ Achievement stats display correctly  
✅ Recording controls hidden after completion  
✅ Console logs provide clear debugging info  


