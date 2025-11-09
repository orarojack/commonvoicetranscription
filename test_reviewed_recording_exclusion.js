#!/usr/bin/env node

/**
 * Test script to verify that once a recording is reviewed,
 * it no longer appears in the pending list for other reviewers
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

async function testReviewedRecordingExclusion() {
    try {
        console.log('🧪 Testing Reviewed Recording Exclusion\n');
        console.log('='.repeat(60));
        
        // Step 1: Find test reviewers
        console.log('\n📋 Step 1: Finding test reviewers...');
        const { data: reviewers, error: reviewersError } = await supabase
            .from('users')
            .select('id, email, name, role')
            .eq('role', 'reviewer')
            .eq('status', 'active')
            .limit(3);
        
        if (reviewersError || !reviewers || reviewers.length < 2) {
            console.error('❌ Need at least 2 active reviewers for this test');
            return;
        }
        
        console.log(`✅ Found ${reviewers.length} reviewers`);
        const reviewer1 = reviewers[0];
        const reviewer2 = reviewers[1];
        const reviewer3 = reviewers[2] || reviewers[0]; // Use reviewer1 if only 2 available
        console.log(`   Reviewer 1: ${reviewer1.email}`);
        console.log(`   Reviewer 2: ${reviewer2.email}`);
        if (reviewers.length >= 3) {
            console.log(`   Reviewer 3: ${reviewer3.email}`);
        }
        console.log('');
        
        // Step 2: Get initial state - recordings available to each reviewer
        console.log('📊 Step 2: Getting initial state...\n');
        
        const getAvailableRecordings = async (reviewerId) => {
            // Get recordings reviewer has already reviewed
            const { data: reviews } = await supabase
                .from('reviews')
                .select('recording_id')
                .eq('reviewer_id', reviewerId);
            const reviewedIds = new Set(reviews?.map(r => r.recording_id) || []);
            
            // Get pending recordings excluding reviewer's own
            const { data: pendingRecordings } = await supabase
                .from('recordings')
                .select('id, sentence, user_id, status')
                .eq('status', 'pending');
            
            // Get reviewer's own recordings to exclude
            const { data: reviewerUser } = await supabase
                .from('users')
                .select('email')
                .eq('id', reviewerId)
                .single();
            
            const { data: allUsers } = await supabase
                .from('users')
                .select('id, email');
            const userEmailMap = new Map(allUsers?.map(u => [u.id, u.email]) || []);
            
            const available = pendingRecordings?.filter(recording => {
                // Exclude if reviewer already reviewed it
                if (reviewedIds.has(recording.id)) return false;
                
                // Exclude if it's reviewer's own recording (by email match)
                const recordingUserEmail = userEmailMap.get(recording.user_id);
                if (recordingUserEmail === reviewerUser?.email) return false;
                
                return true;
            }) || [];
            
            return { available, reviewedIds };
        };
        
        const state1 = await getAvailableRecordings(reviewer1.id);
        const state2 = await getAvailableRecordings(reviewer2.id);
        
        console.log(`   Reviewer 1 available recordings: ${state1.available.length}`);
        console.log(`   Reviewer 2 available recordings: ${state2.available.length}`);
        console.log(`   Reviewer 1 already reviewed: ${state1.reviewedIds.size}`);
        console.log(`   Reviewer 2 already reviewed: ${state2.reviewedIds.size}\n`);
        
        // Step 3: Find a recording that both reviewers can see
        console.log('🔍 Step 3: Finding common recording...\n');
        
        const commonRecordings = state1.available.filter(r1 => 
            state2.available.some(r2 => r2.id === r1.id)
        );
        
        if (commonRecordings.length === 0) {
            console.log('⚠️  No common recordings found (both reviewers see different sets)');
            console.log('   This might be expected if reviewers have already reviewed many recordings');
            console.log('   Testing with a fresh recording...\n');
            
            // Try to find any pending recording
            const { data: anyPending } = await supabase
                .from('recordings')
                .select('id, sentence, user_id, status')
                .eq('status', 'pending')
                .limit(1);
            
            if (!anyPending || anyPending.length === 0) {
                console.log('❌ No pending recordings available for testing');
                return;
            }
            
            console.log(`   Using recording: ${anyPending[0].id}`);
            console.log(`   Sentence: "${anyPending[0].sentence.substring(0, 50)}..."\n`);
            
            // Step 4: Reviewer 1 reviews the recording
            console.log('📝 Step 4: Reviewer 1 reviewing recording...\n');
            
            const testRecording = anyPending[0];
            
            // Check if recording is still pending
            const { data: recBefore } = await supabase
                .from('recordings')
                .select('status')
                .eq('id', testRecording.id)
                .single();
            
            if (recBefore?.status !== 'pending') {
                console.log(`⚠️  Recording is already ${recBefore?.status}, cannot test`);
                return;
            }
            
            // Create review
            const { data: review, error: reviewError } = await supabase
                .from('reviews')
                .insert({
                    recording_id: testRecording.id,
                    reviewer_id: reviewer1.id,
                    decision: 'approved',
                    notes: 'Test review',
                    confidence: 90,
                    time_spent: 10
                })
                .select()
                .single();
            
            if (reviewError) {
                console.error(`❌ Failed to create review: ${reviewError.message}`);
                return;
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
                console.error(`❌ Failed to update recording: ${updateError.message}`);
                return;
            }
            
            console.log(`✅ Reviewer 1 successfully reviewed recording ${testRecording.id}\n`);
            
            // Step 5: Check if recording is still available to Reviewer 2
            console.log('🔍 Step 5: Checking if recording is excluded from Reviewer 2...\n');
            
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
            
            const state2After = await getAvailableRecordings(reviewer2.id);
            const stillAvailable = state2After.available.some(r => r.id === testRecording.id);
            
            console.log(`   Recording still in Reviewer 2's list: ${stillAvailable ? '❌ YES (BUG!)' : '✅ NO (Correct!)'}`);
            console.log(`   Reviewer 2 available recordings: ${state2After.available.length} (was ${state2.available.length})`);
            
            // Step 6: Verify recording status
            console.log('\n🔍 Step 6: Verifying recording status...\n');
            
            const { data: finalRecording } = await supabase
                .from('recordings')
                .select('status, reviewed_by')
                .eq('id', testRecording.id)
                .single();
            
            console.log(`   Final status: ${finalRecording?.status}`);
            console.log(`   Reviewed by: ${finalRecording?.reviewed_by}`);
            
            // Step 7: Check if Reviewer 3 (or another reviewer) can see it
            console.log('\n🔍 Step 7: Checking Reviewer 3...\n');
            
            const state3 = await getAvailableRecordings(reviewer3.id);
            const availableToReviewer3 = state3.available.some(r => r.id === testRecording.id);
            
            console.log(`   Recording available to Reviewer 3: ${availableToReviewer3 ? '❌ YES (BUG!)' : '✅ NO (Correct!)'}`);
            console.log(`   Reviewer 3 available recordings: ${state3.available.length}`);
            
            // Summary
            console.log('\n' + '='.repeat(60));
            console.log('📊 TEST RESULTS\n');
            
            const testPassed = 
                finalRecording?.status === 'approved' &&
                !stillAvailable &&
                !availableToReviewer3;
            
            if (testPassed) {
                console.log('✅ TEST PASSED: Reviewed recording exclusion is working correctly!');
                console.log('   - Recording status updated to approved');
                console.log('   - Recording excluded from Reviewer 2\'s pending list');
                console.log('   - Recording excluded from Reviewer 3\'s pending list');
            } else {
                console.log('❌ TEST FAILED: Issues detected');
                if (finalRecording?.status !== 'approved') {
                    console.log('   - Recording status not updated correctly');
                }
                if (stillAvailable) {
                    console.log('   - Recording still available to Reviewer 2');
                }
                if (availableToReviewer3) {
                    console.log('   - Recording still available to Reviewer 3');
                }
            }
            
            // Cleanup - remove test review if needed
            console.log('\n🧹 Cleaning up test review...');
            await supabase.from('reviews').delete().eq('id', review.id);
            await supabase
                .from('recordings')
                .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
                .eq('id', testRecording.id);
            console.log('✅ Cleanup complete\n');
            
        } else {
            console.log(`✅ Found ${commonRecordings.length} common recordings`);
            console.log(`   Using first common recording: ${commonRecordings[0].id}`);
            console.log(`   Sentence: "${commonRecordings[0].sentence.substring(0, 50)}..."\n`);
            
            // Similar test logic for common recordings
            console.log('📝 Step 4: Reviewer 1 reviewing common recording...\n');
            
            const testRecording = commonRecordings[0];
            
            // Create review
            const { data: review, error: reviewError } = await supabase
                .from('reviews')
                .insert({
                    recording_id: testRecording.id,
                    reviewer_id: reviewer1.id,
                    decision: 'approved',
                    notes: 'Test review',
                    confidence: 90,
                    time_spent: 10
                })
                .select()
                .single();
            
            if (reviewError) {
                console.error(`❌ Failed to create review: ${reviewError.message}`);
                return;
            }
            
            // Update recording status
            await supabase
                .from('recordings')
                .update({
                    status: 'approved',
                    reviewed_by: reviewer1.id,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', testRecording.id);
            
            console.log(`✅ Reviewer 1 reviewed recording\n`);
            
            // Check Reviewer 2
            await new Promise(resolve => setTimeout(resolve, 500));
            const state2After = await getAvailableRecordings(reviewer2.id);
            const stillAvailable = state2After.available.some(r => r.id === testRecording.id);
            
            console.log('📊 RESULTS:\n');
            console.log(`   Recording still available to Reviewer 2: ${stillAvailable ? '❌ YES (BUG!)' : '✅ NO (Correct!)'}`);
            
            if (!stillAvailable) {
                console.log('\n✅ TEST PASSED: Reviewed recording correctly excluded!');
            } else {
                console.log('\n❌ TEST FAILED: Reviewed recording still showing!');
            }
            
            // Cleanup
            await supabase.from('reviews').delete().eq('id', review.id);
            await supabase
                .from('recordings')
                .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
                .eq('id', testRecording.id);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📝 Test completed!\n');
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
        console.error(error.stack);
    }
}

testReviewedRecordingExclusion();






