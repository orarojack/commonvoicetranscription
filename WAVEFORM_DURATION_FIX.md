# Waveform and Duration Display Fix - Listen Page

## Problem

When reviewers first load or refresh the `/listen` page:
- ✅ Audio loads and can be heard when playing
- ❌ Waveform doesn't animate/move during playback
- ❌ Audio duration shows as "0:00 / 0:00"
- ✅ After clicking "Next" then "Back", everything works correctly

## Root Cause

### Issue 1: Duration Not Set on Initial Load
The duration update logic was in a useEffect that only ran when `currentRecording` changed. However:

1. On initial page load, the audio element is created but the duration metadata may not be immediately available
2. The event listeners for `loadedmetadata` and `durationchange` were attached, but if the metadata was already loaded before the listeners were attached, the events wouldn't fire
3. The useEffect didn't check if the duration was already available when it first ran

### Issue 2: Waveform Generated Too Early
The `generateWaveformData()` function was called in the audio loading useEffect (line 224) immediately after the audio loading Promise resolved. However:
- The audio might be "loaded" enough to play but metadata (including duration) might not be available yet
- This resulted in waveform being generated with a fallback duration of 10 seconds instead of the actual audio duration

### Why "Next" then "Back" Worked
When clicking "Next" then "Back":
1. The `currentRecording` state changes twice
2. Each change triggers the duration useEffect to run again
3. By the time "Back" is clicked, the audio element has had time to load metadata
4. The fresh useEffect run picks up the already-loaded duration and sets it properly

## Solution

### 1. Immediate Duration Check After Audio Load
Added a check right after the audio loading completes to try setting the duration immediately:

```typescript
// Try to get duration immediately after loading
if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
  console.log("✅ Setting duration immediately after load:", audio.duration)
  setDuration(audio.duration)
  generateWaveformData(audio.duration)
}
```

### 2. Delayed Retry for Data URLs
For data URLs (base64 encoded audio), the browser sometimes needs a moment to calculate duration. Added a 100ms delayed retry:

```typescript
setTimeout(() => {
  if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
    console.log("✅ Duration available after delay:", audio.duration)
    setDuration(audio.duration)
    generateWaveformData(audio.duration)
  } else {
    // Fallback to the duration stored in the recording metadata
    setDuration(currentRecording.duration)
    generateWaveformData(currentRecording.duration)
  }
}, 100)
```

### 3. Fallback to Recording Metadata
If the audio element's duration is still not available after the delay, fall back to using the `currentRecording.duration` value stored in the database.

### 4. Check for Initial Duration on Mount
Added a check in the duration update useEffect to immediately set the duration if it's already available when the effect runs:

```typescript
// Set initial duration if already loaded
if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
  console.log('✅ Initial duration set:', audio.duration)
  setDuration(audio.duration)
  generateWaveformData(audio.duration)
}
```

### 5. Enhanced Duration Validation
Added proper validation in the `updateDuration` handler to ensure we only set valid duration values:

```typescript
const updateDuration = () => {
  if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
    console.log('✅ Duration updated:', audio.duration)
    setDuration(audio.duration)
    // Also regenerate waveform when duration is known
    generateWaveformData(audio.duration)
  }
}
```

### 6. Regenerate Waveform on Duration Change
Moved the waveform generation to happen whenever the duration is updated (either initially or via events):
- Waveform now generates with the correct duration from the audio element
- Waveform regenerates if duration changes (e.g., on new recording)

### 7. Updated generateWaveformData Function
Modified the function to accept an optional `audioDuration` parameter:

```typescript
const generateWaveformData = (audioDuration?: number) => {
  const durationToUse = audioDuration || currentRecording?.duration || 10
  const dataPoints = Math.floor(durationToUse) * 10
  // ... generate waveform
}
```

### 8. Added audioLoading to useEffect Dependencies
Added `audioLoading` to the duration update useEffect dependencies so it re-runs after audio finishes loading:

```typescript
}, [currentRecording, audioLoading])
```

## Changes Made

**File:** `app/listen/page.tsx`

1. **Lines 227-248**: Added immediate duration check after audio loads with delayed retry and fallback
2. **Lines 274-288**: Enhanced `updateDuration` handler with validation and waveform regeneration
3. **Lines 284-288**: Added initial duration check on useEffect mount
4. **Line 299**: Added `audioLoading` to dependencies
5. **Lines 301-311**: Updated `generateWaveformData` to accept optional duration parameter
6. **Added extensive console logging** for debugging duration loading issues

## How It Works Now

### Initial Load Flow:
1. **Page loads** → `loading` state is true
2. **Recordings fetched** → `loading` becomes false, `currentRecording` is set
3. **Audio loading useEffect triggers** → Audio element loads the audio file
4. **Audio loads** → `canplay` or `loadeddata` event fires, `audioLoading` becomes false
5. **Duration useEffect triggers** (due to `audioLoading` change):
   - Checks if audio.duration is already available
   - If yes: Sets duration state and generates waveform immediately
   - Event listeners are attached for future updates
6. **Result**: Duration and waveform are properly initialized on first load ✅

### During Playback:
1. **User clicks play** → Audio plays
2. **timeupdate event** → `currentTime` updates continuously
3. **Waveform displays** → Progress bar and playhead move based on `currentTime / duration`
4. **Duration displays** → Shows correct time format (e.g., "0:15 / 1:23") ✅

## Testing Checklist

- [x] Fresh page load shows correct duration
- [x] Fresh page load shows waveform with correct number of bars
- [x] Waveform animates/updates during playback
- [x] Duration displays correctly (not 0:00)
- [x] "Next" and "Back" navigation still works
- [x] Waveform regenerates correctly when navigating between recordings

## Debugging Logs Added

Added comprehensive console.log statements to help track the duration setting process:
- `✅ Setting duration immediately after load: X` - When duration is set right after audio loads
- `⚠️ Duration not available immediately` - When duration isn't ready yet
- `✅ Duration available after delay: X` - When duration becomes available after 100ms delay
- `⚠️ Duration still not available after delay. Using recording.duration as fallback` - When falling back to metadata
- `✅ Duration updated: X` - When duration changes via event
- `✅ Initial duration set: X` - When duration is set on useEffect mount
- `📊 Generated waveform data: X points for Y seconds` - When waveform is generated

These logs help diagnose timing issues with audio metadata loading and can be removed in production or kept for debugging.

## Testing Instructions

1. **Clear browser cache and refresh** the page to ensure you're using the updated code
2. **Open browser DevTools** (F12) and go to the Console tab
3. **Navigate to** `/listen` page
4. **Watch the console** for duration-related logs:
   - Look for "✅ Setting duration immediately after load" or "✅ Duration available after delay"
   - The duration should be set to the actual recording duration (e.g., 7.2)
5. **Verify in the UI**:
   - Duration display should show actual time (e.g., "0:00 / 0:07") instead of "0:00 / 0:00"
   - Waveform should have the correct number of bars
   - Waveform progress should move when playing audio
6. **Click play** and verify the waveform animates correctly

