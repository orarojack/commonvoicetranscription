# Progress NaN Fix - Listen & Speak Pages

## Problem

The progress percentage and stat displays showed "NaN%" instead of "0%" or actual values on both Listen and Speak pages.

## Root Cause

The progress calculation `(reviewsCompleted / 10) * 100` produces `NaN` when:
- `reviewsCompleted` is `undefined` (before data loads from database)
- `reviewsCompleted` is `null`
- Division by zero edge cases

This happens because the component renders before the `loadReviewerStats()` function completes and sets the proper values.

## Solution

Added null-coalescing operators (`|| 0`) to all numeric display values to ensure they default to `0` instead of `undefined`/`null`.

### Changes Made

**File 1:** `app/listen/page.tsx`

#### 1. Fixed progress percentage display (line 698):
```typescript
// Before:
<span>{Math.round((reviewsCompleted / 10) * 100)}%</span>

// After:
<span>{Math.round(((reviewsCompleted || 0) / 10) * 100)}%</span>
```

#### 2. Fixed progress bar width (line 703):
```typescript
// Before:
style={{ width: `${Math.min((reviewsCompleted / 10) * 100, 100)}%` }}

// After:
style={{ width: `${Math.min(((reviewsCompleted || 0) / 10) * 100, 100)}%` }}
```

#### 3. Fixed stat displays (lines 679, 684, 689):
```typescript
// Before:
{reviewsCompleted}
{sessionReviews}
{pendingRecordings.length}

// After:
{reviewsCompleted || 0}
{sessionReviews || 0}
{pendingRecordings?.length || 0}
```

## Results

✅ **Progress now shows "0%" on initial load** instead of "NaN%"  
✅ **All numeric stats default to 0** instead of undefined  
✅ **Progress bar works correctly** from 0% to 100%  
✅ **No more undefined/null display issues**

## How It Works

The `||` operator checks if the left side is falsy (`undefined`, `null`, `0`, `false`, `NaN`, `""`), and if so, uses the right side value (`0`).

```typescript
reviewsCompleted || 0
// If reviewsCompleted is undefined/null → returns 0
// If reviewsCompleted is 0 → returns 0
// If reviewsCompleted is 5 → returns 5
```

**File 2:** `app/speak/page.tsx`

#### 1. Fixed progress bar calculation (line 632):
```typescript
// Before:
style={{ width: `${(sentenceCount / 10) * 100}%` }}

// After:
style={{ width: `${((sentenceCount || 0) / 10) * 100}%` }}
```

#### 2. Fixed progress display (line 627):
```typescript
// Before:
<span>{sentenceCount}/10</span>

// After:
<span>{sentenceCount || 0}/10</span>
```

#### 3. Fixed stat displays (lines 607, 612, 617, 848):
```typescript
// Before:
{sentenceCount}
{recordingProgress}
{sessionRecordings}

// After:
{sentenceCount || 0}
{recordingProgress || 0}
{sessionRecordings || 0}
```

## Results

✅ **Progress now shows "0%" on initial load** instead of "NaN%"  
✅ **All numeric stats default to 0** instead of undefined  
✅ **Progress bars work correctly** from 0% to 100%  
✅ **No more undefined/null display issues** on both pages

## Testing

### Listen Page (`/listen`)
1. Visit as a reviewer
2. Before completing any reviews, you should see:
   - Progress: **0%** (not NaN%)
   - Total: **0** (not undefined)
   - Today: **0** (not undefined)
   - Left: **[number of pending recordings]**
3. After completing reviews, numbers update correctly

### Speak Page (`/speak`)
1. Visit as a contributor
2. On initial load, you should see:
   - Progress: **0/10** (not NaN/10)
   - Current: **0** (not undefined)
   - Total: **0** (not undefined)
   - Today: **0** (not undefined)
   - Progress bar: **0%** (not NaN%)
3. After recording, numbers update correctly

---

**Fix Date:** October 25, 2025  
**Issue:** Progress showing "NaN%" instead of "0%" on both Listen and Speak pages  
**Status:** ✅ RESOLVED

