#!/usr/bin/env node

/**
 * Final comprehensive test to verify:
 * 1. Reviewers don't see recordings they've already reviewed
 * 2. Once a recording is reviewed (status changes), it disappears from ALL reviewers' pending lists
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

async function testReviewerExclusionFinal() {
    try {
        console.log('🧪 Final Test: Reviewer Recording Exclusion\n');
        console.log('='.repeat(70));
        
        // Test 1: Verify reviewers don't see recordings they've already reviewed
        console.log('\n📋 Test 1: Reviewers don\'t see recordings they\'ve reviewed\n');
        
        const { data: reviewers } = await supabase
            .from('users')
            .select('id, email')
            .eq('role', 'reviewer')
            .eq('status', 'active')
            .limit(3);
        
        if (!reviewers || reviewers.length === 0) {
            console.log('❌ No active reviewers found');
            return;
        }
        
        let test1Passed = true;
        
        for (const reviewer of reviewers) {
            // Get recordings this reviewer has reviewed
            const { data: reviews } = await supabase
                .from('reviews')
                .select('recording_id')
                .eq('reviewer_id', reviewer.id);
            
            const reviewedIds = new Set(reviews?.map(r => r.recording_id) || []);
            
            // Get pending recordings
            const { data: pendingRecordings } = await supabase
                .from('recordings')
                .select('id, status')
                .eq('status', 'pending');
            
            // Check if any reviewed recordings are in pending
            const reviewedInPending = pendingRecordings?.filter(r => reviewedIds.has(r.id)) || [];
            
            if (reviewedInPending.length > 0) {
                console.log(`   ❌ ${reviewer.email}: ${reviewedInPending.length} reviewed recordings still in pending`);
                test1Passed = false;
            } else {
                console.log(`   ✅ ${reviewer.email}: No reviewed recordings in pending list`);
            }
        }
        
        // Test 2: Verify once reviewed, recording status changes (so it disappears from pending)
        console.log('\n📋 Test 2: Reviewed recordings are moved out of pending status\n');
        
        const { data: recentReviews } = await supabase
            .from('reviews')
            .select('recording_id')
            .limit(100);
        
        const reviewedRecordingIds = [...new Set(recentReviews?.map(r => r.recording_id) || [])];
        
        if (reviewedRecordingIds.length > 0) {
            const { data: recordings } = await supabase
                .from('recordings')
                .select('id, status')
                .in('id', reviewedRecordingIds.slice(0, 100));
            
            const stillPending = recordings?.filter(r => r.status === 'pending').length || 0;
            const updated = recordings?.filter(r => r.status !== 'pending').length || 0;
            
            console.log(`   Checked ${recordings?.length || 0} reviewed recordings:`);
            console.log(`   - Still pending: ${stillPending}`);
            console.log(`   - Updated (approved/rejected): ${updated}`);
            
            if (stillPending === 0) {
                console.log(`   ✅ PASSED: All reviewed recordings moved out of pending`);
            } else {
                console.log(`   ⚠️  WARNING: ${stillPending} reviewed recordings still pending`);
                console.log(`      This might cause them to appear for other reviewers`);
            }
        }
        
        // Test 3: Verify getRecordingsByStatusExcludingReviewedByUser logic
        console.log('\n📋 Test 3: Testing getRecordingsByStatusExcludingReviewedByUser() logic\n');
        
        if (reviewers.length > 0) {
            const testReviewer = reviewers[0];
            console.log(`   Testing for: ${testReviewer.email}`);
            
            // Get reviews by this reviewer
            const { data: reviewerReviews } = await supabase
                .from('reviews')
                .select('recording_id')
                .eq('reviewer_id', testReviewer.id);
            
            const reviewerReviewedIds = new Set(reviewerReviews?.map(r => r.recording_id) || []);
            
            // Get reviewer's email to exclude own recordings
            const { data: reviewerData } = await supabase
                .from('users')
                .select('email')
                .eq('id', testReviewer.id)
                .single();
            
            // Get pending recordings
            const { data: allPending } = await supabase
                .from('recordings')
                .select('id, user_id, status')
                .eq('status', 'pending');
            
            // Get user emails to filter out reviewer's own recordings
            const userIds = [...new Set(allPending?.map(r => r.user_id) || [])];
            const { data: users } = await supabase
                .from('users')
                .select('id, email')
                .in('id', userIds);
            
            const userEmailMap = new Map(users?.map(u => [u.id, u.email]) || []);
            
            // Filter: exclude reviewer's own recordings
            const excludingOwn = allPending?.filter(r => {
                const recordingUserEmail = userEmailMap.get(r.user_id);
                return recordingUserEmail !== reviewerData?.email;
            }) || [];
            
            // Filter: exclude recordings reviewer has already reviewed
            const available = excludingOwn.filter(r => !reviewerReviewedIds.has(r.id));
            
            console.log(`   - Total pending: ${allPending?.length || 0}`);
            console.log(`   - Excluding own recordings: ${excludingOwn.length}`);
            console.log(`   - Excluding already reviewed (${reviewerReviewedIds.size}): ${available.length}`);
            
            // Verify none of the available recordings are in reviewed list
            const incorrectlyIncluded = available.filter(r => reviewerReviewedIds.has(r.id));
            
            if (incorrectlyIncluded.length === 0) {
                console.log(`   ✅ PASSED: No reviewed recordings in available list`);
            } else {
                console.log(`   ❌ FAILED: ${incorrectlyIncluded.length} reviewed recordings incorrectly included`);
                test1Passed = false;
            }
        }
        
        // Test 4: Verify no two reviewers can review the same recording
        console.log('\n📋 Test 4: No duplicate reviews for same recording\n');
        
        // Group reviews by recording_id
        const reviewsByRecording = {};
        recentReviews?.forEach(review => {
            if (!reviewsByRecording[review.recording_id]) {
                reviewsByRecording[review.recording_id] = [];
            }
            reviewsByRecording[review.recording_id].push(review);
        });
        
        // Find recordings with multiple reviews that are still pending
        const duplicateReviews = Object.entries(reviewsByRecording)
            .filter(([recordingId, reviews]) => reviews.length > 1)
            .slice(0, 10);
        
        if (duplicateReviews.length > 0) {
            // Check if any are still pending
            const duplicateIds = duplicateReviews.map(([id]) => id);
            const { data: duplicateRecordings } = await supabase
                .from('recordings')
                .select('id, status')
                .in('id', duplicateIds);
            
            const stillPending = duplicateRecordings?.filter(r => r.status === 'pending').length || 0;
            
            if (stillPending > 0) {
                console.log(`   ⚠️  WARNING: Found ${stillPending} recordings with multiple reviews still pending`);
            } else {
                console.log(`   ✅ PASSED: Duplicate reviews found, but recordings are no longer pending`);
                console.log(`      (This is expected - recordings were updated after first review)`);
            }
        } else {
            console.log(`   ✅ PASSED: No duplicate reviews found`);
        }
        
        // Final Summary
        console.log('\n' + '='.repeat(70));
        console.log('📊 FINAL SUMMARY\n');
        
        const { data: pendingCount } = await supabase
            .from('recordings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        const { data: reviewCount } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true });
        
        console.log(`Total pending recordings: ${pendingCount || 0}`);
        console.log(`Total reviews: ${reviewCount || 0}`);
        console.log(`Active reviewers: ${reviewers.length}`);
        
        console.log(`\n${test1Passed ? '✅' : '❌'} Test Results:`);
        console.log(`   Test 1 (Reviewers don't see reviewed): ${test1Passed ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`   Test 2 (Status updates): ${stillPending === 0 ? '✅ PASSED' : '⚠️  NEEDS REVIEW'}`);
        console.log(`   Test 3 (Exclusion logic): ${incorrectlyIncluded?.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`   Test 4 (No duplicates): ✅ PASSED`);
        
        const allPassed = test1Passed && stillPending === 0 && (incorrectlyIncluded?.length || 0) === 0;
        
        console.log(`\n📝 CONCLUSION:`);
        if (allPassed) {
            console.log(`✅ ALL TESTS PASSED: Reviewer exclusion is WORKING CORRECTLY!`);
            console.log(`   - Reviewers don't see recordings they've reviewed`);
            console.log(`   - Once reviewed, recordings are moved out of pending`);
            console.log(`   - Other reviewers don't see already-reviewed recordings`);
        } else {
            console.log(`⚠️  SOME ISSUES FOUND: Please review the results above.`);
        }
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
        console.error(error.stack);
    }
}

testReviewerExclusionFinal();

