#!/usr/bin/env node

/**
 * Script to find and fix duplicate reviews (multiple reviews for the same recording)
 * This should not happen, but we need to clean it up before adding the unique constraint
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

async function fixDuplicateReviews() {
    try {
        console.log('🔍 Finding duplicate reviews...\n');
        
        // Step 1: Find all reviews
        console.log('📥 Fetching all reviews...');
        let allReviews = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data: reviewsBatch, error: reviewsError } = await supabase
                .from('reviews')
                .select('id, recording_id, reviewer_id, decision, created_at')
                .order('created_at', { ascending: true })
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
        
        console.log(`✅ Fetched ${allReviews.length} total reviews\n`);
        
        // Step 2: Find duplicates
        console.log('🔍 Analyzing for duplicates...\n');
        
        const recordingReviewMap = new Map();
        const duplicates = [];
        
        allReviews.forEach(review => {
            if (!recordingReviewMap.has(review.recording_id)) {
                recordingReviewMap.set(review.recording_id, []);
            }
            recordingReviewMap.get(review.recording_id).push(review);
        });
        
        // Find recordings with multiple reviews
        recordingReviewMap.forEach((reviews, recordingId) => {
            if (reviews.length > 1) {
                duplicates.push({
                    recording_id: recordingId,
                    reviews: reviews.sort((a, b) => 
                        new Date(a.created_at) - new Date(b.created_at)
                    ) // Sort by created_at to keep the first one
                });
            }
        });
        
        if (duplicates.length === 0) {
            console.log('✅ No duplicate reviews found! The database is clean.\n');
            return;
        }
        
        console.log(`❌ Found ${duplicates.length} recordings with duplicate reviews:\n`);
        
        duplicates.forEach((dup, idx) => {
            console.log(`${idx + 1}. Recording: ${dup.recording_id}`);
            console.log(`   Reviews: ${dup.reviews.length}`);
            dup.reviews.forEach((review, rIdx) => {
                console.log(`     ${rIdx + 1}. Review ID: ${review.id}`);
                console.log(`        Reviewer: ${review.reviewer_id}`);
                console.log(`        Decision: ${review.decision}`);
                console.log(`        Created: ${review.created_at}`);
            });
            console.log('');
        });
        
        // Step 3: Fix duplicates - keep the first review, delete the rest
        console.log('🔧 Fixing duplicates...\n');
        console.log('   Strategy: Keep the FIRST review (oldest created_at), delete the rest\n');
        
        let deletedCount = 0;
        let fixedRecordings = [];
        
        for (const dup of duplicates) {
            // Keep the first review (already sorted by created_at)
            const keepReview = dup.reviews[0];
            const deleteReviews = dup.reviews.slice(1);
            
            console.log(`   Recording ${dup.recording_id}:`);
            console.log(`     Keeping: Review ${keepReview.id} (${keepReview.created_at})`);
            console.log(`     Deleting: ${deleteReviews.length} duplicate review(s)`);
            
            // Delete duplicate reviews
            for (const reviewToDelete of deleteReviews) {
                const { error: deleteError } = await supabase
                    .from('reviews')
                    .delete()
                    .eq('id', reviewToDelete.id);
                
                if (deleteError) {
                    console.error(`     ❌ Error deleting review ${reviewToDelete.id}: ${deleteError.message}`);
                } else {
                    deletedCount++;
                    console.log(`     ✅ Deleted review ${reviewToDelete.id}`);
                }
            }
            
            // Verify recording status matches the kept review
            const { data: recording } = await supabase
                .from('recordings')
                .select('status, reviewed_by')
                .eq('id', dup.recording_id)
                .single();
            
            if (recording) {
                // Ensure recording status matches the kept review
                const expectedStatus = keepReview.decision;
                if (recording.status !== expectedStatus || recording.reviewed_by !== keepReview.reviewer_id) {
                    console.log(`     ⚠️  Updating recording status to match kept review...`);
                    const { error: updateError } = await supabase
                        .from('recordings')
                        .update({
                            status: expectedStatus,
                            reviewed_by: keepReview.reviewer_id,
                            reviewed_at: keepReview.created_at
                        })
                        .eq('id', dup.recording_id);
                    
                    if (updateError) {
                        console.error(`     ❌ Error updating recording: ${updateError.message}`);
                    } else {
                        console.log(`     ✅ Recording status updated`);
                    }
                }
            }
            
            fixedRecordings.push(dup.recording_id);
            console.log('');
        }
        
        // Step 4: Verify no duplicates remain
        console.log('🔍 Verifying fix...\n');
        
        const { data: verificationReviews } = await supabase
            .from('reviews')
            .select('recording_id');
        
        const verificationMap = new Map();
        verificationReviews?.forEach(review => {
            const count = verificationMap.get(review.recording_id) || 0;
            verificationMap.set(review.recording_id, count + 1);
        });
        
        const remainingDuplicates = Array.from(verificationMap.entries())
            .filter(([_, count]) => count > 1);
        
        if (remainingDuplicates.length === 0) {
            console.log('✅ SUCCESS: No duplicates remain!\n');
            console.log(`📊 Summary:`);
            console.log(`   - Fixed ${fixedRecordings.length} recordings`);
            console.log(`   - Deleted ${deletedCount} duplicate reviews`);
            console.log(`   - Each recording now has exactly 1 review\n`);
            console.log('✅ You can now add the unique constraint:\n');
            console.log('   ALTER TABLE reviews ADD CONSTRAINT unique_recording_review UNIQUE (recording_id);\n');
        } else {
            console.log(`❌ WARNING: ${remainingDuplicates.length} duplicates still exist`);
            remainingDuplicates.forEach(([recordingId, count]) => {
                console.log(`   Recording ${recordingId}: ${count} reviews`);
            });
        }
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
        console.error(error.stack);
    }
}

// Ask for confirmation before proceeding
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

readline.question('⚠️  This will delete duplicate reviews. Continue? (yes/no): ', async (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        await fixDuplicateReviews();
    } else {
        console.log('❌ Operation cancelled');
    }
    readline.close();
});






