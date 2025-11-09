# Database Design Recommendation: Separate Tables vs Single Table

## Current Situation
- **Issue**: Reviewers seeing wrong count (1910 vs 960 pending)
- **Root Cause**: Pagination and filtering bugs (now fixed)
- **Current Design**: Single `recordings` table with `status` column

## Your Proposal: Separate Tables
You suggested creating:
- `pending_recordings` table
- `approved_recordings` table  
- `rejected_recordings` table

## Analysis

### ✅ **Pros of Separate Tables**
1. **Simpler queries** - No status filtering needed
2. **Better performance** - Smaller tables = faster queries
3. **Clear separation** - Less risk of querying wrong status
4. **Easier counting** - Just COUNT from pending table
5. **Logical separation** - Matches business workflow

### ❌ **Cons of Separate Tables**
1. **Data duplication** - Violates normalization principles
2. **Complex migrations** - Need to move existing data
3. **Cross-status queries** - Harder to query "all recordings"
4. **Status changes** - Need to DELETE + INSERT (complex)
5. **Foreign keys** - Need special handling for reviews table
6. **More code** - Need to update all queries

## My Recommendation

### **Option 1: Keep Current Design (Recommended)**
**Why**: The bugs are now fixed! With proper:
- ✅ Pagination (fixed)
- ✅ Filtering (fixed)  
- ✅ Indexes (already exist: `idx_recordings_status`)
- ✅ Query optimization (fixed)

The current design should work perfectly. The separate tables approach won't solve anything we haven't already fixed.

**Action**: Test the current fixes first!

### **Option 2: Use Database Views (Best of Both Worlds)**
Create views that simulate separate tables:
```sql
CREATE VIEW pending_recordings AS 
SELECT * FROM recordings WHERE status = 'pending';

CREATE VIEW approved_recordings AS 
SELECT * FROM recordings WHERE status = 'approved';

CREATE VIEW rejected_recordings AS 
SELECT * FROM recordings WHERE status = 'rejected';
```

**Benefits**:
- Simpler queries for reviewers (just query `pending_recordings` view)
- No data duplication
- No migration needed
- Easy to implement

### **Option 3: True Partitioned Tables (Advanced)**
Use PostgreSQL partitioning (see `migration_to_partitioned_tables.sql`):
- Physical separation (performance)
- Logical unity (can query all together)
- Automatic routing

**But**: Requires significant refactoring and testing.

## What I Recommend

**Start with Option 1** - Test the current fixes:
1. Restart dev server
2. Hard refresh browser
3. Check if counts match now

**If still issues**, try **Option 2** (Views):
- Minimal code changes
- Simpler queries
- No migration needed

**Only if you need maximum performance** → Consider Option 3 (Partitioning)

## Code Changes Needed (if choosing separate tables)

If you decide to go with separate tables, here's what needs to change:

### Database Layer (`lib/database.ts`)
```typescript
// Change from:
await db.getRecordingsByStatus("pending", ...)

// To:
await db.getPendingRecordings(...)
```

### Key Functions to Update:
1. `getRecordingsByStatus()` → Split into `getPendingRecordings()`, `getApprovedRecordings()`, `getRejectedRecordings()`
2. `updateRecording()` → Use `moveRecordingToStatus()` function
3. `createReview()` → Use `moveRecordingToStatus()` after review

### Migration Complexity: **HIGH** ⚠️
- Need to migrate existing data
- Need to update all queries
- Need to handle foreign keys
- Need extensive testing

## My Final Recommendation

**Try the current fixes first!** The separate tables approach is a valid solution, but it's a lot of work for something we've already fixed. If after testing you still see issues, then we can consider the separate tables approach.

Would you like me to:
1. ✅ Help test the current fixes
2. ✅ Implement the views approach (simpler)
3. ✅ Implement true separate tables (complex but complete)

Let me know your preference!

