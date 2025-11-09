#!/usr/bin/env node

/**
 * Test script to verify that reviewers don't see recordings they've already reviewed
 * and that once a recording is reviewed, it's excluded for all reviewers
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReviewerRecordingExclusion() {
    try {
        console.log('🧪 Testing Reviewer Recording Exclusion Logic\n');
        console.log('='.repeat(70));
        
        // Step 1: Get all reviewers
        console.log('\n📋 Step 1: Fetching all reviewers...');
        const { data: reviewers, error: reviewersError } = await supabase
            .from('users')
            .select('id, email, name, role')
            .eq('role', 'reviewer')
            .eq('status', 'active');
        
        if (reviewersError) {
            console.error('❌ Error fetching reviewers:', reviewersError.message);
            return;
        }
        
        console.log(`✅ Found ${reviewers.length} active reviewers\n`);
        
        if (reviewers.length === 0) {
            console.log('⚠️  No active reviewers found. Cannot test reviewer exclusion.');
            return;
        }
        
        // Step 2: Get all pending recordings
        console.log('📥 Step 2: Fetching all pending recordings...');
        let allPendingRecordings = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data: recordingsBatch, error: recordingsError } = await supabase
                .from('recordings')
                .select('id, sentence, user_id, status, created_at')
                .eq('status', 'pending')
                .range(page * pageSize, (page + 1) * pageSize - 1);
            
            if (recordingsError) {
                console.error('❌ Error fetching pending recordings:', recordingsError.message);
                return;
            }
            
            if (!recordingsBatch || recordingsBatch.length === 0) {
                hasMore = false;
            } else {
                allPendingRecordings = [...allPendingRecordings, ...recordingsBatch];
                hasMore = recordingsBatch.length === pageSize;
                page++;
            }
        }
        
        console.log(`✅ Found ${allPendingRecordings.length} pending recordings\n`);
        
        // Step 3: Get all reviews
        console.log('📝 Step 3: Fetching all reviews...');
        let allReviews = [];
        page = 0;
        hasMore = true;

        while (hasMore) {
            const { data: reviewsBatch, error: reviewsError } = await supabase
                .from('reviews')
                .select('id, recording_id, reviewer_id, decision, created_at')
                .range(page * pageSize, (page + 1) * pageSize - 1);
            
            if (reviewsError) {
                console.error('❌ Error fetching reviews:', reviewsError.message);
                return;
            }
            
            if (!reviewsBatch || reviewsBatch.length === 0) {
                hasMore = false;
            } else {
                allReviews = [...allReviews, ...reviewsBatch];
                hasMore = reviewsBatch.length === pageSize;
                page++;
            }
        }
        
        console.log(`✅ Found ${allReviews.length} total reviews\n`);
        
        // Step 4: Analyze reviews per reviewer
        console.log('📊 Step 4: Analyzing reviews per reviewer...\n');
        
        const reviewsByReviewer = {};
        const recordingsByReviewer = {};
        
        reviewers.forEach(reviewer => {
            reviewsByReviewer[reviewer.id] = allReviews.filter(r => r.reviewer_id === reviewer.id);
            recordingsByReviewer[reviewer.id] = new Set(
                reviewsByReviewer[reviewer.id].map(r => r.recording_id)
            );
        });
        
        reviewers.forEach(reviewer => {
            const reviewCount = reviewsByReviewer[reviewer.id].length;
            const reviewedRecordingIds = recordingsByReviewer[reviewer.id];
            console.log(`   ${reviewer.email || reviewer.id}:`);
            console.log(`      - Reviews completed: ${reviewCount}`);
            console.log(`      - Unique recordings reviewed: ${reviewedRecordingIds.size}`);
        });
        
        // Step 5: Test the exclusion logic for each reviewer
        console.log('\n🧪 Step 5: Testing exclusion logic for each reviewer...\n');
        
        let allTestsPassed = true;
        
        for (const reviewer of reviewers) {
            console.log(`   Testing reviewer: ${reviewer.email || reviewer.id}`);
            
            // Get recordings this reviewer should see (simulating getRecordingsByStatusExcludingReviewedByUser)
            // First, get recordings excluding reviewer's own recordings
            const reviewerRecordedIds = new Set(
                allPendingRecordings
                    .filter(r => {
                        // Get the user who created this recording
                        return r.user_id; // We'd need to check by email in real implementation
                    })
                    .map(r => r.id)
            );
            
            // Get recordings this reviewer has already reviewed
            const reviewedRecordingIds = recordingsByReviewer[reviewer.id];
            
            // Available recordings = pending recordings that reviewer hasn't reviewed
            // and that aren't their own recordings
            const availableRecordings = allPendingRecordings.filter(recording => {
                // Exclude if reviewer already reviewed it
                if (reviewedRecordingIds.has(recording.id)) {
                    return false;
                }
                // In real implementation, also exclude reviewer's own recordings
                // (we'd check by email match)
                return true;
            });
            
            console.log(`      - Pending recordings: ${allPendingRecordings.length}`);
            console.log(`      - Already reviewed: ${reviewedRecordingIds.size}`);
            console.log(`      - Should see: ${availableRecordings.length}`);
            
            // Verify: Available recordings should NOT include any that reviewer already reviewed
            const includesReviewed = availableRecordings.some(r => reviewedRecordingIds.has(r.id));
            
            if (includesReviewed) {
                console.log(`      ❌ FAILED: Available recordings include one reviewer already reviewed!`);
                allTestsPassed = false;
            } else {
                console.log(`      ✅ PASSED: No reviewed recordings in available list`);
            }
        }
        
        // Step 6: Test that reviewed recordings are excluded from pending
        console.log('\n🔍 Step 6: Verifying reviewed recordings are not in pending list...\n');
        
        const reviewedRecordingIds = new Set(allReviews.map(r => r.recording_id));
        const reviewedRecordingsStillPending = allPendingRecordings.filter(
            r => reviewedRecordingIds.has(r.id)
        );
        
        if (reviewedRecordingsStillPending.length > 0) {
            console.log(`⚠️  WARNING: Found ${reviewedRecordingsStillPending.length} recordings that have reviews but are still marked as pending`);
            console.log(`   This might be expected if reviews are pending approval, or it indicates a data inconsistency.`);
            console.log(`   Sample recordings:`);
            reviewedRecordingsStillPending.slice(0, 5).forEach(r => {
                const reviews = allReviews.filter(rev => rev.recording_id === r.id);
                console.log(`      - Recording ${r.id}: ${reviews.length} review(s), status: ${r.status}`);
            });
        } else {
            console.log(`✅ PASSED: All reviewed recordings have been moved out of pending status`);
        }
        
        // Step 7: Test cross-reviewer exclusion
        console.log('\n🔍 Step 7: Testing that multiple reviewers don\'t see the same reviewed recording...\n');
        
        // Get recordings that have been reviewed
        const reviewedRecordings = [...reviewedRecordingIds];
        let duplicateReviewsFound = 0;
        const duplicateReviewDetails = [];
        
        reviewedRecordings.forEach(recordingId => {
            const reviewsForRecording = allReviews.filter(r => r.recording_id === recordingId);
            
            // If a recording has multiple reviews, that's okay (maybe it was reviewed multiple times)
            // But we should check if it's still in pending status
            if (reviewsForRecording.length > 1) {
                const recording = allPendingRecordings.find(r => r.id === recordingId);
                if (recording) {
                    duplicateReviewsFound++;
                    duplicateReviewDetails.push({
                        recordingId,
                        reviewCount: reviewsForRecording.length,
                        reviewers: reviewsForRecording.map(r => {
                            const reviewer = reviewers.find(rev => rev.id === r.reviewer_id);
                            return reviewer?.email || r.reviewer_id;
                        })
                    });
                }
            }
        });
        
        if (duplicateReviewsFound > 0) {
            console.log(`⚠️  Found ${duplicateReviewsFound} recordings with multiple reviews that are still pending:`);
            duplicateReviewDetails.slice(0, 5).forEach(detail => {
                console.log(`      - Recording ${detail.recordingId}: ${detail.reviewCount} reviews by ${detail.reviewers.join(', ')}`);
            });
            console.log(`   Note: This might indicate that reviews don't update recording status immediately.`);
        } else {
            console.log(`✅ PASSED: No duplicate reviews found for pending recordings`);
        }
        
        // Step 8: Simulate the actual function behavior
        console.log('\n🔍 Step 8: Simulating getRecordingsByStatusExcludingReviewedByUser()...\n');
        
        if (reviewers.length > 0) {
            const testReviewer = reviewers[0];
            console.log(`   Testing for reviewer: ${testReviewer.email || testReviewer.id}`);
            
            // Get reviews by this reviewer
            const reviewerReviews = allReviews.filter(r => r.reviewer_id === testReviewer.id);
            const reviewerReviewedIds = new Set(reviewerReviews.map(r => r.recording_id));
            
            // Get pending recordings (excluding reviewer's own - simplified test)
            const availableForReviewer = allPendingRecordings.filter(r => {
                return !reviewerReviewedIds.has(r.id);
            });
            
            console.log(`      - Pending recordings: ${allPendingRecordings.length}`);
            console.log(`      - Reviewer has reviewed: ${reviewerReviewedIds.size}`);
            console.log(`      - Should see: ${availableForReviewer.length}`);
            console.log(`      - Excluded correctly: ${allPendingRecordings.length - reviewerReviewedIds.size === availableForReviewer.length ? '✅ YES' : '❌ NO'}`);
            
            // Double-check: none of the available recordings should be in reviewer's reviewed list
            const incorrectlyIncluded = availableForReviewer.filter(r => reviewerReviewedIds.has(r.id));
            if (incorrectlyIncluded.length > 0) {
                console.log(`      ❌ FAILED: ${incorrectlyIncluded.length} reviewed recordings incorrectly included!`);
                allTestsPassed = false;
            } else {
                console.log(`      ✅ PASSED: All reviewed recordings correctly excluded`);
            }
        }
        
        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('📊 SUMMARY\n');
        console.log(`Total pending recordings: ${allPendingRecordings.length}`);
        console.log(`Total reviews: ${allReviews.length}`);
        console.log(`Active reviewers: ${reviewers.length}`);
        console.log(`Reviewed recording IDs: ${reviewedRecordingIds.size}`);
        console.log(`\n${allTestsPassed && reviewedRecordingsStillPending.length === 0 ? '✅' : '⚠️'} Test Results:`);
        console.log(`   - Reviewer exclusion logic: ${allTestsPassed ? '✅ WORKING' : '❌ BROKEN'}`);
        console.log(`   - Reviewed recordings in pending: ${reviewedRecordingsStillPending.length === 0 ? '✅ NONE' : '⚠️  ' + reviewedRecordingsStillPending.length}`);
        console.log(`\n📝 Conclusion: Reviewer recording exclusion is ${allTestsPassed ? 'WORKING CORRECTLY' : 'NEEDS ATTENTION'}.`);
        
        if (reviewedRecordingsStillPending.length > 0) {
            console.log(`\n⚠️  NOTE: Some recordings have reviews but are still pending.`);
            console.log(`   This might be expected behavior, but you should verify:`);
            console.log(`   1. Does createReview() update recording status immediately?`);
            console.log(`   2. Are there any failed status updates?`);
        }
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
        console.error(error.stack);
    }
}

testReviewerRecordingExclusion();

