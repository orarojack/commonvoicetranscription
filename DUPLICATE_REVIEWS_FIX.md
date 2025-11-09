# Fix Duplicate Reviews Issue

## Problem
You have **3,209 review records** in your database, but you should only have **1,309 unique reviewed recordings**. This means some recordings have been reviewed multiple times, creating duplicate review entries.

## Solution
I've implemented a comprehensive solution to:
1. ✅ Identify and remove existing duplicate reviews
2. ✅ Prevent future duplicate reviews
3. ✅ Provide statistics and monitoring tools

## Files Changed

### 1. `lib/database.ts`
Added three new functions:
- `findDuplicateReviews()` - Identifies duplicate reviews
- `removeDuplicateReviews()` - Removes duplicates (keeps first review per recording)
- `getDuplicateReviewStats()` - Provides statistics about duplicates

Enhanced `createReview()` function with better duplicate prevention.

### 2. `scripts/remove_duplicate_reviews.ts` / `.js`
Script to run the cleanup process.

### 3. `scripts/add_unique_constraint_reviews.sql`
SQL script to add a unique constraint preventing future duplicates.

### 4. `app/api/admin/cleanup-duplicates/route.ts`
API endpoint for admin dashboard integration.

## How to Fix the Issue

### Option 1: Using the Admin Dashboard (Recommended)

1. **Check current status:**
   - Open your admin dashboard
   - Navigate to the database management section
   - Or call: `GET /api/admin/cleanup-duplicates`

2. **Remove duplicates:**
   - Call: `POST /api/admin/cleanup-duplicates`
   - Or add a button in your admin UI that calls this endpoint

### Option 2: Using SQL Scripts

1. **First, remove existing duplicates:**
   
   Run this in your Supabase SQL Editor or via psql:
   
   ```sql
   -- Find duplicates
   SELECT 
       recording_id, 
       COUNT(*) as review_count,
       array_agg(id ORDER BY created_at) as review_ids
   FROM reviews
   GROUP BY recording_id
   HAVING COUNT(*) > 1;
   ```
   
   Then delete duplicates (keeping the first review):
   
   ```sql
   -- Delete duplicate reviews, keeping only the first one per recording
   DELETE FROM reviews
   WHERE id IN (
       SELECT id
       FROM (
           SELECT id,
                  ROW_NUMBER() OVER (PARTITION BY recording_id ORDER BY created_at) as rn
           FROM reviews
       ) t
       WHERE rn > 1
   );
   ```

2. **Add unique constraint to prevent future duplicates:**
   
   Run `scripts/add_unique_constraint_reviews.sql` in your Supabase SQL Editor:
   
   ```sql
   ALTER TABLE reviews 
   ADD CONSTRAINT reviews_recording_id_unique 
   UNIQUE (recording_id);
   ```

### Option 3: Using Node.js Script

If you have Node.js set up with TypeScript support:

```bash
# Using tsx
npx tsx scripts/remove_duplicate_reviews.ts

# Or using ts-node
node --loader ts-node/esm scripts/remove_duplicate_reviews.ts
```

## Expected Results

After running the cleanup:

- **Before:** 3,209 total review records
- **After:** ~1,309 unique review records (one per recording)
- **Removed:** ~1,900 duplicate reviews

## Verification

After cleanup, verify the results:

```sql
-- Should return 0 rows (no duplicates)
SELECT 
    recording_id, 
    COUNT(*) as review_count
FROM reviews
GROUP BY recording_id
HAVING COUNT(*) > 1;

-- Should return ~1,309 (unique recordings)
SELECT COUNT(DISTINCT recording_id) FROM reviews;

-- Should return ~1,309 (total reviews after cleanup)
SELECT COUNT(*) FROM reviews;
```

## Prevention

The enhanced `createReview()` function now:
1. Checks recording status before allowing review
2. Verifies no existing reviews exist for the recording
3. Uses efficient count queries to check for duplicates
4. Provides better error messages

After adding the unique constraint, the database will also enforce uniqueness at the database level, providing an additional safety net.

## Important Notes

- ⚠️ **Backup your database** before running cleanup scripts
- ✅ The cleanup keeps the **first review** per recording (based on `created_at`)
- ✅ After cleanup, `totalReviews` should equal unique recordings reviewed
- ✅ The unique constraint prevents future duplicates but requires duplicates to be removed first

## Testing

After applying the fix, test by:
1. Trying to review a recording that's already been reviewed
2. Checking that the error message appears correctly
3. Verifying that duplicate reviews cannot be created

## Support

If you encounter any issues:
1. Check the console logs for detailed error messages
2. Verify your Supabase connection is working
3. Ensure you have proper database permissions
4. Check that the `reviews` table structure matches expectations

