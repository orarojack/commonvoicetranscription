# Audio Initial Load Fix - Listen Page

## Problem

When reviewers first load the `/listen` page, the audio doesn't load automatically. Users have to:
1. Click "Next" to go to the next recording
2. Click "Back" to return to the first recording
3. Only then can they play the audio

This creates a poor user experience as the audio should be ready to play immediately on page load.

## Root Cause

### The Issue Flow:

1. **Page loads** → Component shows loading spinner (lines 630-638)
2. **During loading** → `loadPendingRecordings()` sets `currentRecording` to first recording
3. **Loading completes** → Component re-renders with audio element
4. **Problem**: The audio loading `useEffect` depends only on `currentRecording?.id`
5. **Result**: Since `currentRecording.id` was already set during loading and hasn't changed, the useEffect doesn't re-trigger
6. **Audio element is now in DOM** but the loading logic never ran

### Why "Next" then "Back" worked:
- Clicking "Next" changes `currentRecording.id` → triggers useEffect → audio loads
- Clicking "Back" changes `currentRecording.id` again → triggers useEffect → audio loads

## Solution

Added `loading` state to the audio loading useEffect dependencies and added a check to skip audio loading while the page is still loading.

### Changes Made

**File:** `app/listen/page.tsx`

#### 1. Added loading check in audio loading logic (lines 46-50):
```typescript
// Skip loading if page is still loading or audio ref not ready
if (loading) {
  console.log('⏳ Skipping audio load - page still loading')
  return
}
```

#### 2. Updated useEffect dependencies (line 263):
```typescript
}, [currentRecording?.id, loading]) // Added 'loading' to trigger audio load when page loading completes
```

## How It Works Now

1. **Page loads** → Component shows loading spinner
2. **During loading** → `loadPendingRecordings()` sets `currentRecording`
   - Audio loading useEffect runs but **skips** because `loading === true`
3. **Loading completes** → `loading` changes to `false`
4. **useEffect re-triggers** because `loading` is in dependencies
5. **Audio loads properly** → Ready to play immediately!

## Results

✅ **Audio now loads automatically on initial page load**  
✅ **No need to click Next/Back to trigger audio loading**  
✅ **Better user experience for reviewers**  
✅ **Consistent behavior across all navigation**

## Testing

1. Visit `/listen` page as a reviewer
2. Wait for page to load completely
3. The audio should be ready to play immediately (play button active)
4. Click play → Audio should play without errors

## Technical Details

### Before Fix:
- **useEffect dependencies**: `[currentRecording?.id]`
- **Behavior**: Only triggers when recording ID changes
- **Issue**: Doesn't trigger when loading completes with same recording

### After Fix:
- **useEffect dependencies**: `[currentRecording?.id, loading]`
- **Behavior**: Triggers when recording ID changes OR when loading state changes
- **Result**: Properly loads audio after initial page load completes

## Related Files

- `app/listen/page.tsx` - Main file with audio loading logic

---

**Fix Date:** October 25, 2025  
**Issue:** Audio not loading on initial page load  
**Status:** ✅ RESOLVED

