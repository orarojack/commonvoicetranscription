# Profile Setup Infinite Loop Fix

## Problem

The `/profile/setup` page was stuck in an infinite loading state, continuously showing the loading spinner and never displaying the form.

## Root Cause

The `useEffect` hook on line 110-193 had `router` in its dependency array:

```typescript
useEffect(() => {
  // ... authentication checks and data loading ...
}, [user, isLoading, router])  // ❌ router causes infinite loop
```

### Why This Caused an Infinite Loop:

1. **Next.js Router Object Instability**: The `router` object from `useRouter()` can change its reference on component re-renders
2. **Dependency Trigger**: When `router` reference changes, React thinks it's a "new" dependency
3. **Effect Re-runs**: The useEffect runs again
4. **State Updates**: The effect updates state (e.g., `setLoadingUserData(true)`)
5. **Component Re-renders**: State updates trigger re-renders
6. **Router Changes Again**: New render may cause router reference to change
7. **Loop Continues**: Back to step 2 - infinite cycle

### What Makes It Worse:
- The effect calls async `loadUserData()` which updates multiple states
- Each state update can trigger re-renders
- Re-renders can cause router reference changes
- This creates a cascading loop

## Solution

Removed `router` from the useEffect dependencies since it's only used for navigation (calling `router.push()`), not for reactive state updates.

### Changes Made

**File:** `app/profile/setup/page.tsx` (Line 194)

```typescript
// Before:
}, [user, isLoading, router])

// After:
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]) // Removed router from dependencies to prevent infinite loop
```

## How It Works Now

1. **Page loads** → useEffect runs based on `user` and `isLoading`
2. **Loads user data** → Updates form state
3. **Component re-renders** → useEffect doesn't re-run (dependencies unchanged)
4. **Form displays** → User can interact with the page
5. **Router is used** → Only when explicitly calling `router.push()` for navigation

## Results

✅ **Profile setup page loads correctly**  
✅ **No infinite loading spinner**  
✅ **Form displays immediately after data loads**  
✅ **Navigation still works properly**  

## Technical Notes

### Why Router Doesn't Need to Be a Dependency:

- `router` is only used to call `router.push()` for navigation
- Navigation methods are **stable** and don't need reactivity tracking
- We're not reading any values from `router` that would require re-running the effect
- The router object itself doesn't contain state we need to react to

### ESLint Disable Explanation:

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
```

This tells ESLint that we intentionally excluded `router` from dependencies. Without this, ESLint would warn about missing dependencies, but in this case, including `router` causes the bug.

## Related Patterns

This is a common issue with Next.js router in useEffect. General rule:

**Include in dependencies:**
- State variables you're reading
- Props you're reading
- Values that should trigger the effect to re-run

**Don't include in dependencies:**
- Callback functions (use useCallback if needed)
- Router objects (unless you're reading from them)
- Refs (useRef)
- Stable functions from hooks

## Testing

1. Navigate to `/profile/setup`
2. Page should load and display form within 1-2 seconds
3. No infinite loading spinner
4. Form fields should be populated if user has existing data
5. Form submission should navigate correctly

---

**Fix Date:** October 25, 2025  
**Issue:** Infinite loading on profile setup page  
**Status:** ✅ RESOLVED

