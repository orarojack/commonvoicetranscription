import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"

/**
 * API Route to remove duplicate reviews
 * 
 * GET /api/admin/cleanup-duplicates - Get statistics about duplicates
 * POST /api/admin/cleanup-duplicates - Remove duplicate reviews
 * 
 * This endpoint allows admins to:
 * 1. Check for duplicate reviews (GET)
 * 2. Remove duplicate reviews (POST)
 */

export async function GET(request: NextRequest) {
  try {
    const stats = await db.getDuplicateReviewStats()
    
    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error("Error getting duplicate review stats:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get stats before cleanup
    const statsBefore = await db.getDuplicateReviewStats()
    
    // Perform cleanup
    const cleanupResult = await db.removeDuplicateReviews()
    
    // Get stats after cleanup
    const statsAfter = await db.getDuplicateReviewStats()
    
    return NextResponse.json({
      success: true,
      message: "Duplicate reviews removed successfully",
      before: statsBefore,
      after: statsAfter,
      cleanup: cleanupResult
    })
  } catch (error) {
    console.error("Error removing duplicate reviews:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

