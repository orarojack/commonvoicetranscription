/**
 * Script to remove duplicate reviews from the database
 * 
 * This script identifies recordings that have been reviewed multiple times
 * and removes the duplicate reviews, keeping only the first review per recording.
 * 
 * Usage:
 *   npx tsx scripts/remove_duplicate_reviews.ts
 * 
 * Or with Node.js:
 *   node --loader ts-node/esm scripts/remove_duplicate_reviews.ts
 */

import { db } from "../lib/database"

async function main() {
  try {
    console.log("=".repeat(60))
    console.log("Duplicate Review Cleanup Script")
    console.log("=".repeat(60))
    console.log()

    // Step 1: Get statistics before cleanup
    console.log("📊 Step 1: Analyzing current state...")
    const statsBefore = await db.getDuplicateReviewStats()
    
    console.log(`   Total reviews in database: ${statsBefore.totalReviews}`)
    console.log(`   Unique recordings with reviews: ${statsBefore.uniqueRecordingsWithReviews}`)
    console.log(`   Recordings with duplicate reviews: ${statsBefore.duplicateRecordings}`)
    console.log(`   Total duplicate reviews: ${statsBefore.totalDuplicateReviews}`)
    console.log()

    if (statsBefore.duplicateRecordings === 0) {
      console.log("✅ No duplicate reviews found! Database is clean.")
      return
    }

    // Step 2: Confirm before proceeding
    console.log("⚠️  WARNING: This will permanently delete duplicate reviews!")
    console.log(`   ${statsBefore.totalDuplicateReviews} duplicate reviews will be removed.`)
    console.log(`   Only the first review per recording will be kept.`)
    console.log()
    
    // In a real script, you might want to add a confirmation prompt here
    // For now, we'll proceed automatically but log the action
    
    // Step 3: Remove duplicates
    console.log("🧹 Step 2: Removing duplicate reviews...")
    const cleanupResult = await db.removeDuplicateReviews()
    
    console.log()
    console.log("=".repeat(60))
    console.log("Cleanup Results")
    console.log("=".repeat(60))
    console.log(`   Recordings with duplicates found: ${cleanupResult.duplicatesFound}`)
    console.log(`   Duplicate reviews removed: ${cleanupResult.duplicatesRemoved}`)
    console.log(`   Unique recordings with reviews (after cleanup): ${cleanupResult.uniqueRecordingsAfterCleanup}`)
    console.log()

    // Step 4: Verify cleanup
    console.log("📊 Step 3: Verifying cleanup...")
    const statsAfter = await db.getDuplicateReviewStats()
    
    console.log(`   Total reviews remaining: ${statsAfter.totalReviews}`)
    console.log(`   Unique recordings with reviews: ${statsAfter.uniqueRecordingsWithReviews}`)
    console.log(`   Recordings with duplicate reviews: ${statsAfter.duplicateRecordings}`)
    console.log(`   Total duplicate reviews: ${statsAfter.totalDuplicateReviews}`)
    console.log()

    if (statsAfter.duplicateRecordings === 0) {
      console.log("✅ SUCCESS: All duplicate reviews have been removed!")
      console.log(`   Expected: ${statsBefore.uniqueRecordingsWithReviews} unique recordings`)
      console.log(`   Actual: ${statsAfter.uniqueRecordingsWithReviews} unique recordings`)
      
      if (statsAfter.uniqueRecordingsWithReviews === statsBefore.uniqueRecordingsWithReviews) {
        console.log("✅ Count matches expected value!")
      } else {
        console.log("⚠️  Note: Count differs from expected, but duplicates are removed.")
      }
    } else {
      console.log("⚠️  WARNING: Some duplicates may still exist. Please investigate.")
    }

    console.log()
    console.log("=".repeat(60))
    console.log("Cleanup complete!")
    console.log("=".repeat(60))

  } catch (error) {
    console.error("❌ Error during cleanup:", error)
    process.exit(1)
  }
}

// Run the script
main()

