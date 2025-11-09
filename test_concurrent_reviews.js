#!/usr/bin/env node

/**
 * Test script to verify concurrent review prevention
 * This script tests that:
 * 1. Multiple reviewers cannot review the same recording simultaneously
 * 2. Once a recording is reviewed, it's no longer available to other reviewers
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

async function testConcurrentReviews() {
    try {
        console.log('🧪 Testing Concurrent Review Prevention\n');
        console.log('='.repeat(60));
        
        // Step 1: Find test reviewers
        console.log('\n📋 Step 1: Finding test reviewers...');
        const { data: reviewers, error: reviewersError } = await supabase
            .from('users')
            .select('id, email, name, role')
            .eq('role', 'reviewer')
            .eq('status', 'active')
            .limit(5);
        
        if (reviewersError || !reviewers || reviewers.length < 2) {
            console.error('❌ Need at least 2 active reviewers for this test');
            console.error('   Error:', reviewersError?.message);
            return;
        }
        
        console.log(`✅ Found ${reviewers.length} reviewers`);
        const reviewer1 = reviewers[0];
        const reviewer2 = reviewers[1];
        console.log(`   Reviewer 1: ${reviewer1.email} (${reviewer1.id})`);
        console.log(`   Reviewer 2: ${reviewer2.email} (${reviewer2.id})\n`);
        
        // Step 2: Find a pending recording
        console.log('📋 Step 2: Finding a pending recording...');
        const { data: pendingRecordings, error: pendingError } = await supabase
            .from('recordings')
            .select('id, sentence, user_id, status')
            .eq('status', 'pending')
            .limit(1);
        
        if (pendingError || !pendingRecordings || pendingRecordings.length === 0) {
            console.error('❌ No pending recordings found for testing');
            console.error('   Error:', pendingError?.message);
            return;
        }
        
        const testRecording = pendingRecordings[0];
        console.log(`✅ Found test recording: ${testRecording.id}`);
        console.log(`   Sentence: "${testRecording.sentence.substring(0, 50)}..."`);
        console.log(`   Status: ${testRecording.status}\n`);
        
        // Step 3: Verify recording is available to both reviewers
        console.log('🔍 Step 3: Checking if recording is available to both reviewers...');
        
        // Get recordings available to reviewer 1
        const { data: reviews1 } = await supabase
            .from('reviews')
            .select('recording_id')
            .eq('reviewer_id', reviewer1.id);
        const reviewedIds1 = new Set(reviews1?.map(r => r.recording_id) || []);
        
        // Get recordings available to reviewer 2
        const { data: reviews2 } = await supabase
            .from('reviews')
            .select('recording_id')
            .eq('reviewer_id', reviewer2.id);
        const reviewedIds2 = new Set(reviews2?.map(r => r.recording_id) || []);
        
        const availableToReviewer1 = !reviewedIds1.has(testRecording.id) && testRecording.status === 'pending';
        const availableToReviewer2 = !reviewedIds2.has(testRecording.id) && testRecording.status === 'pending';
        
        console.log(`   Available to Reviewer 1: ${availableToReviewer1 ? '✅ Yes' : '❌ No'}`);
        console.log(`   Available to Reviewer 2: ${availableToReviewer2 ? '✅ Yes' : '❌ No'}\n`);
        
        if (!availableToReviewer1 || !availableToReviewer2) {
            console.log('⚠️  Recording is not available to both reviewers. This is expected if it was already reviewed.\n');
        }
        
        // Step 4: Simulate concurrent review attempts
        console.log('⚡ Step 4: Simulating concurrent review attempts...\n');
        console.log('   Attempting to have both reviewers review the same recording simultaneously...\n');
        
        // Check if recording is still pending before attempts
        const { data: recordingBefore } = await supabase
            .from('recordings')
            .select('status')
            .eq('id', testRecording.id)
            .single();
        
        if (recordingBefore?.status !== 'pending') {
            console.log(`⚠️  Recording status is already "${recordingBefore?.status}", cannot test concurrent reviews`);
            console.log('   (This recording may have been reviewed by another reviewer)\n');
            return;
        }
        
        // Simulate concurrent attempts (both try to review at the same time)
        const reviewAttempt1 = async () => {
            try {
                // Check status first (simulating the check in createReview)
                const { data: rec } = await supabase
                    .from('recordings')
                    .select('status')
                    .eq('id', testRecording.id)
                    .single();
                
                if (rec?.status !== 'pending') {
                    return { success: false, error: `Recording already ${rec?.status}` };
                }
                
                // Check for existing reviews
                const { data: existingReviews } = await supabase
                    .from('reviews')
                    .select('id')
                    .eq('recording_id', testRecording.id);
                
                if (existingReviews && existingReviews.length > 0) {
                    return { success: false, error: 'Recording already reviewed' };
                }
                
                // Create review
                const { data: review, error: reviewError } = await supabase
                    .from('reviews')
                    .insert({
                        recording_id: testRecording.id,
                        reviewer_id: reviewer1.id,
                        decision: 'approved',
                        notes: 'Test review from Reviewer 1',
                        confidence: 90,
                        time_spent: 10
                    })
                    .select()
                    .single();
                
                if (reviewError) {
                    return { success: false, error: reviewError.message };
                }
                
                // Update recording status
                const { error: updateError } = await supabase
                    .from('recordings')
                    .update({
                        status: 'approved',
                        reviewed_by: reviewer1.id,
                        reviewed_at: new Date().toISOString()
                    })
                    .eq('id', testRecording.id);
                
                if (updateError) {
                    return { success: false, error: updateError.message };
                }
                
                return { success: true, review };
            } catch (error) {
                return { success: false, error: error.message };
            }
        };
        
        const reviewAttempt2 = async () => {
            try {
                // Small delay to simulate near-simultaneous attempt
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Check status first
                const { data: rec } = await supabase
                    .from('recordings')
                    .select('status')
                    .eq('id', testRecording.id)
                    .single();
                
                if (rec?.status !== 'pending') {
                    return { success: false, error: `Recording already ${rec?.status}` };
                }
                
                // Check for existing reviews
                const { data: existingReviews } = await supabase
                    .from('reviews')
                    .select('id')
                    .eq('recording_id', testRecording.id);
                
                if (existingReviews && existingReviews.length > 0) {
                    return { success: false, error: 'Recording already reviewed' };
                }
                
                // Create review
                const { data: review, error: reviewError } = await supabase
                    .from('reviews')
                    .insert({
                        recording_id: testRecording.id,
                        reviewer_id: reviewer2.id,
                        decision: 'approved',
                        notes: 'Test review from Reviewer 2',
                        confidence: 90,
                        time_spent: 10
                    })
                    .select()
                    .single();
                
                if (reviewError) {
                    return { success: false, error: reviewError.message };
                }
                
                // Update recording status
                const { error: updateError } = await supabase
                    .from('recordings')
                    .update({
                        status: 'approved',
                        reviewed_by: reviewer2.id,
                        reviewed_at: new Date().toISOString()
                    })
                    .eq('id', testRecording.id);
                
                if (updateError) {
                    return { success: false, error: updateError.message };
                }
                
                return { success: true, review };
            } catch (error) {
                return { success: false, error: error.message };
            }
        };
        
        // Execute both attempts concurrently
        const [result1, result2] = await Promise.all([
            reviewAttempt1(),
            reviewAttempt2()
        ]);
        
        console.log('   Reviewer 1 attempt:', result1.success ? '✅ SUCCESS' : `❌ FAILED (${result1.error})`);
        console.log('   Reviewer 2 attempt:', result2.success ? '✅ SUCCESS' : `❌ FAILED (${result2.error})\n`);
        
        // Step 5: Verify final state
        console.log('🔍 Step 5: Verifying final state...\n');
        
        const { data: finalRecording } = await supabase
            .from('recordings')
            .select('status, reviewed_by')
            .eq('id', testRecording.id)
            .single();
        
        const { data: allReviews } = await supabase
            .from('reviews')
            .select('id, reviewer_id, decision')
            .eq('recording_id', testRecording.id);
        
        console.log(`   Final recording status: ${finalRecording?.status}`);
        console.log(`   Reviewed by: ${finalRecording?.reviewed_by || 'N/A'}`);
        console.log(`   Total reviews created: ${allReviews?.length || 0}`);
        
        if (allReviews && allReviews.length > 0) {
            console.log('   Reviews:');
            allReviews.forEach((review, idx) => {
                console.log(`     ${idx + 1}. Reviewer: ${review.reviewer_id}, Decision: ${review.decision}`);
            });
        }
        console.log('');
        
        // Step 6: Analysis
        console.log('📊 Step 6: Analysis\n');
        console.log('='.repeat(60));
        
        const onlyOneSucceeded = (result1.success && !result2.success) || (!result1.success && result2.success);
        const bothSucceeded = result1.success && result2.success;
        const bothFailed = !result1.success && !result2.success;
        const exactlyOneReview = allReviews?.length === 1;
        const multipleReviews = (allReviews?.length || 0) > 1;
        const statusIsApprovedOrRejected = finalRecording?.status === 'approved' || finalRecording?.status === 'rejected';
        
        if (onlyOneSucceeded && exactlyOneReview && statusIsApprovedOrRejected) {
            console.log('✅ TEST PASSED: Concurrent review prevention is working!');
            console.log('   - Only one reviewer succeeded');
            console.log('   - Only one review was created');
            console.log('   - Recording status was updated correctly');
        } else if (bothSucceeded && multipleReviews) {
            console.log('❌ TEST FAILED: Both reviewers were able to review the same recording!');
            console.log('   - This indicates a race condition vulnerability');
            console.log('   - Recommendation: Add database-level unique constraint or locking');
        } else if (bothFailed) {
            console.log('⚠️  TEST INCONCLUSIVE: Both attempts failed');
            console.log('   - This might be expected if database constraints prevent duplicates');
            console.log('   - Or if there was a timing issue');
        } else {
            console.log('⚠️  TEST PARTIAL: Unexpected result');
            console.log('   - Review count:', allReviews?.length || 0);
            console.log('   - Final status:', finalRecording?.status);
        }
        
        // Step 7: Check if reviewed recording is excluded from pending list
        console.log('\n🔍 Step 7: Verifying reviewed recording exclusion...\n');
        
        const { data: pendingForReviewer1 } = await supabase
            .from('recordings')
            .select('id')
            .eq('status', 'pending')
            .neq('user_id', reviewer1.id);
        
        const { data: reviewsForReviewer1 } = await supabase
            .from('reviews')
            .select('recording_id')
            .eq('reviewer_id', reviewer1.id);
        
        const reviewedIds1Final = new Set(reviewsForReviewer1?.map(r => r.recording_id) || []);
        const availablePending1 = pendingForReviewer1?.filter(r => !reviewedIds1Final.has(r.id)) || [];
        
        const stillInPending = availablePending1.some(r => r.id === testRecording.id);
        
        if (statusIsApprovedOrRejected && !stillInPending) {
            console.log('✅ Reviewed recording is correctly excluded from pending list');
        } else if (statusIsApprovedOrRejected && stillInPending) {
            console.log('❌ Reviewed recording is still showing in pending list (BUG!)');
        } else {
            console.log('⚠️  Cannot verify exclusion (recording status is still pending)');
        }
        
        // Cleanup: Remove test reviews if both succeeded (for testing purposes)
        if (bothSucceeded && multipleReviews) {
            console.log('\n🧹 Cleaning up duplicate test reviews...');
            const testReviewIds = allReviews?.map(r => r.id) || [];
            for (const reviewId of testReviewIds) {
                await supabase.from('reviews').delete().eq('id', reviewId);
            }
            // Reset recording status if needed
            if (finalRecording?.status !== 'pending') {
                await supabase
                    .from('recordings')
                    .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
                    .eq('id', testRecording.id);
            }
            console.log('✅ Cleanup complete\n');
        }
        
        console.log('='.repeat(60));
        console.log('📝 Test completed!\n');
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
        console.error(error.stack);
    }
}

testConcurrentReviews();






