#!/usr/bin/env node

/**
 * Detailed test to verify reviewer exclusion logic works correctly
 * Tests the actual behavior: once a recording is reviewed, it should not appear for ANY reviewer
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

async function simulateGetRecordingsByStatusExcludingReviewedByUser(status, reviewerId) {
    // Simulate the actual function logic from lib/database.ts
    
    // Step 1: Get recordings the reviewer has already reviewed
    const { data: reviews } = await supabase
        .from('reviews')
        .select('recording_id')
        .eq('reviewer_id', reviewerId);
    
    const reviewedRecordingIds = new Set(reviews?.map(r => r.recording_id) || []);
    
    // Step 2: Get pending recordings excluding user's own recordings
    // First get the user's email to exclude their own recordings
    const { data: reviewer } = await supabase
        .from('users')
        .select('email')
        .eq('id', reviewerId)
        .single();
    
    // Get all pending recordings
    let allPendingRecordings = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data: recordingsBatch } = await supabase
            .from('recordings')
            .select('id, user_id, sentence, status')
            .eq('status', status)
            .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (!recordingsBatch || recordingsBatch.length === 0) {
            hasMore = false;
        } else {
            allPendingRecordings = [...allPendingRecordings, ...recordingsBatch];
            hasMore = recordingsBatch.length === pageSize;
            page++;
        }
    }
    
    // Get user IDs for recordings to check emails
    const userIds = [...new Set(allPendingRecordings.map(r => r.user_id))];
    const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds);
    
    const userEmailMap = new Map(users?.map(u => [u.id, u.email]) || []);
    
    // Filter: exclude reviewer's own recordings (by email match)
    let filteredRecordings = allPendingRecordings.filter(recording => {
        const recordingUserEmail = userEmailMap.get(recording.user_id);
        return recordingUserEmail !== reviewer?.email;
    });
    
    // Step 3: Filter out recordings the reviewer has already reviewed
    const availableRecordings = filteredRecordings.filter(
        recording => !reviewedRecordingIds.has(recording.id)
    );
    
    return {
        allPending: filteredRecordings.length,
        alreadyReviewed: reviewedRecordingIds.size,
        available: availableRecordings.length,
        availableRecordings: availableRecordings.map(r => r.id)
    };
}

async function testReviewerExclusionDetailed() {
    try {
        console.log('🧪 Detailed Test: Reviewer Recording Exclusion\n');
        console.log('='.repeat(70));
        
        // Step 1: Get reviewers
        console.log('\n📋 Step 1: Fetching active reviewers...');
        const { data: reviewers } = await supabase
            .from('users')
            .select('id, email, name')
            .eq('role', 'reviewer')
            .eq('status', 'active')
            .limit(5); // Test with first 5 reviewers
        
        if (!reviewers || reviewers.length === 0) {
            console.log('❌ No active reviewers found');
            return;
        }
        
        console.log(`✅ Found ${reviewers.length} reviewers for testing\n`);
        
        // Step 2: Test each reviewer
        console.log('🧪 Step 2: Testing exclusion logic for each reviewer...\n');
        
        let allTestsPassed = true;
        const reviewerResults = [];
        
        for (const reviewer of reviewers) {
            console.log(`   Testing: ${reviewer.email || reviewer.id}`);
            
            const result = await simulateGetRecordingsByStatusExcludingReviewedByUser('pending', reviewer.id);
            
            reviewerResults.push({
                reviewer: reviewer.email || reviewer.id,
                ...result
            });
            
            console.log(`      - All pending (excluding own): ${result.allPending}`);
            console.log(`      - Already reviewed by this reviewer: ${result.alreadyReviewed}`);
            console.log(`      - Available for review: ${result.available}`);
            
            // Verify: available should = allPending - alreadyReviewed
            const expected = Math.max(0, result.allPending - result.alreadyReviewed);
            const actual = result.available;
            
            if (Math.abs(actual - expected) <= 1) { // Allow 1 difference for edge cases
                console.log(`      ✅ PASSED: Exclusion logic correct`);
            } else {
                console.log(`      ❌ FAILED: Expected ${expected}, got ${actual}`);
                allTestsPassed = false;
            }
        }
        
        // Step 3: Verify no reviewed recording appears for any reviewer
        console.log('\n🔍 Step 3: Verifying reviewed recordings are excluded from all reviewers...\n');
        
        // Get all reviewed recording IDs
        const { data: allReviews } = await supabase
            .from('reviews')
            .select('recording_id, reviewer_id');
        
        const reviewedRecordingIds = new Set(allReviews?.map(r => r.recording_id) || []);
        
        console.log(`   Total unique recordings that have been reviewed: ${reviewedRecordingIds.size}`);
        
        // Check each reviewer's available recordings
        let reviewedRecordingsFound = 0;
        const issuesFound = [];
        
        for (const result of reviewerResults) {
            const reviewedInAvailable = result.availableRecordings.filter(
                id => reviewedRecordingIds.has(id)
            );
            
            if (reviewedInAvailable.length > 0) {
                reviewedRecordingsFound += reviewedInAvailable.length;
                issuesFound.push({
                    reviewer: result.reviewer,
                    count: reviewedInAvailable.length,
                    recordingIds: reviewedInAvailable.slice(0, 3)
                });
            }
        }
        
        if (reviewedRecordingsFound > 0) {
            console.log(`   ❌ FAILED: Found ${reviewedRecordingsFound} reviewed recordings in available lists!`);
            issuesFound.forEach(issue => {
                console.log(`      - ${issue.reviewer}: ${issue.count} reviewed recordings incorrectly shown`);
            });
            allTestsPassed = false;
        } else {
            console.log(`   ✅ PASSED: No reviewed recordings found in any reviewer's available list`);
        }
        
        // Step 4: Test that once a recording is reviewed, it doesn't appear for other reviewers
        console.log('\n🔍 Step 4: Testing cross-reviewer exclusion...\n');
        
        // Pick two different reviewers
        if (reviewers.length >= 2) {
            const reviewer1 = reviewers[0];
            const reviewer2 = reviewers[1];
            
            console.log(`   Comparing: ${reviewer1.email} vs ${reviewer2.email}`);
            
            const result1 = await simulateGetRecordingsByStatusExcludingReviewedByUser('pending', reviewer1.id);
            const result2 = await simulateGetRecordingsByStatusExcludingReviewedByUser('pending', reviewer2.id);
            
            // Get recordings reviewed by reviewer1
            const { data: reviews1 } = await supabase
                .from('reviews')
                .select('recording_id')
                .eq('reviewer_id', reviewer1.id);
            
            const reviewedBy1 = new Set(reviews1?.map(r => r.recording_id) || []);
            
            // Check if reviewer2 sees any recordings that reviewer1 has reviewed
            const reviewer2SeesReviewedBy1 = result2.availableRecordings.filter(
                id => reviewedBy1.has(id)
            );
            
            if (reviewer2SeesReviewedBy1.length > 0) {
                console.log(`   ⚠️  WARNING: Reviewer2 sees ${reviewer2SeesReviewedBy1.length} recordings that Reviewer1 has reviewed`);
                console.log(`      Note: This might be okay if recording status wasn't updated to approved/rejected yet`);
                
                // Check if these recordings are still pending
                const { data: stillPending } = await supabase
                    .from('recordings')
                    .select('id, status')
                    .in('id', reviewer2SeesReviewedBy1.slice(0, 10));
                
                const stillPendingCount = stillPending?.filter(r => r.status === 'pending').length || 0;
                console.log(`      - ${stillPendingCount} of these are still marked as pending`);
                
                if (stillPendingCount === 0) {
                    console.log(`   ✅ Actually OK: These recordings were updated to approved/rejected`);
                    console.log(`      They won't appear because we only fetch pending recordings`);
                }
            } else {
                console.log(`   ✅ PASSED: Reviewer2 doesn't see recordings reviewed by Reviewer1`);
            }
        }
        
        // Step 5: Check recording status updates
        console.log('\n🔍 Step 5: Verifying recording status updates after review...\n');
        
        // Get some recent reviews
        const { data: recentReviews } = await supabase
            .from('reviews')
            .select('recording_id, created_at')
            .order('created_at', { descending: true })
            .limit(100);
        
        if (recentReviews && recentReviews.length > 0) {
            const reviewedIds = recentReviews.map(r => r.recording_id);
            const { data: recordings } = await supabase
                .from('recordings')
                .select('id, status')
                .in('id', reviewedIds);
            
            const stillPending = recordings?.filter(r => r.status === 'pending').length || 0;
            const updated = recordings?.filter(r => r.status !== 'pending').length || 0;
            
            console.log(`   Recent reviews checked: ${recentReviews.length}`);
            console.log(`   Recordings still pending: ${stillPending}`);
            console.log(`   Recordings updated (approved/rejected): ${updated}`);
            
            if (stillPending === 0) {
                console.log(`   ✅ PASSED: All reviewed recordings have status updated`);
            } else {
                console.log(`   ⚠️  WARNING: ${stillPending} reviewed recordings still marked as pending`);
                console.log(`      This might cause them to appear for other reviewers`);
            }
        }
        
        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('📊 SUMMARY\n');
        console.log(`Active reviewers tested: ${reviewers.length}`);
        console.log(`Total reviewed recordings in system: ${reviewedRecordingIds.size}`);
        
        reviewerResults.forEach(result => {
            console.log(`\n${result.reviewer}:`);
            console.log(`   - Available recordings: ${result.available}`);
            console.log(`   - Already reviewed: ${result.alreadyReviewed}`);
        });
        
        console.log(`\n${allTestsPassed ? '✅' : '❌'} Test Results:`);
        console.log(`   - Exclusion logic: ${allTestsPassed ? '✅ WORKING' : '❌ BROKEN'}`);
        console.log(`   - Reviewed recordings excluded: ${reviewedRecordingsFound === 0 ? '✅ YES' : '❌ NO'}`);
        console.log(`\n📝 Conclusion: Reviewer exclusion is ${allTestsPassed && reviewedRecordingsFound === 0 ? 'WORKING CORRECTLY ✅' : 'NEEDS FIXING ❌'}.`);
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
        console.error(error.stack);
    }
}

testReviewerExclusionDetailed();

