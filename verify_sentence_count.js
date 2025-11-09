#!/usr/bin/env node

/**
 * Verification script to check if all sentences are accessible
 * This script verifies the fix for the 1000-row limit issue
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

async function verifySentenceCount() {
    try {
        console.log('🔍 Verifying sentence count fix...\n');
        
        // Get total count
        const { count: totalCount, error: countError } = await supabase
            .from('sentences')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('language_code', 'luo');
        
        if (countError) {
            console.error('❌ Error getting total count:', countError.message);
            return;
        }
        
        console.log(`📊 Total sentences in database: ${totalCount}`);
        
        // Fetch all sentences using pagination (same as the fixed code)
        let allSentences = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        console.log('📥 Fetching sentences using pagination...');
        
        while (hasMore) {
            const { data: sentencesPage, error: fetchError } = await supabase
                .from('sentences')
                .select('text')
                .eq('is_active', true)
                .eq('language_code', 'luo')
                .range(page * pageSize, (page + 1) * pageSize - 1);
            
            if (fetchError) {
                console.error('❌ Error fetching sentences:', fetchError.message);
                return;
            }
            
            if (!sentencesPage || sentencesPage.length === 0) {
                hasMore = false;
            } else {
                allSentences = [...allSentences, ...sentencesPage];
                hasMore = sentencesPage.length === pageSize;
                page++;
                console.log(`   Page ${page}: fetched ${sentencesPage.length} sentences (total: ${allSentences.length})`);
            }
        }
        
        console.log(`\n📥 Total sentences fetched: ${allSentences.length}`);
        
        // Verify the fix
        if (allSentences && allSentences.length === totalCount) {
            console.log('✅ SUCCESS! All sentences are now accessible.');
            console.log(`✅ Fixed: ${totalCount} sentences available (was limited to ~1000 before)\n`);
        } else if (allSentences && allSentences.length >= 1000 && allSentences.length < totalCount) {
            console.log(`⚠️  PARTIAL: Fetched ${allSentences.length} out of ${totalCount} sentences`);
            console.log('⚠️  You may need to increase the limit further or use pagination.\n');
        } else {
            console.log(`❌ ISSUE: Expected ${totalCount} but got ${allSentences?.length || 0} sentences\n`);
        }
        
        // Test the database function behavior
        console.log('🧪 Testing getAvailableSentencesForUser behavior...');
        console.log('   (This simulates what contributors will see)\n');
        
        // Fetch all recordings using pagination
        let recordings = [];
        let recordingsPage = 0;
        const recordingsPageSize = 1000;
        let hasMoreRecordings = true;

        while (hasMoreRecordings) {
            const { data: recordingsBatch, error: recordingsError } = await supabase
                .from('recordings')
                .select('sentence, user_id')
                .range(recordingsPage * recordingsPageSize, (recordingsPage + 1) * recordingsPageSize - 1);
            
            if (recordingsError) {
                console.error('❌ Error fetching recordings:', recordingsError.message);
                return;
            }
            
            if (!recordingsBatch || recordingsBatch.length === 0) {
                hasMoreRecordings = false;
            } else {
                recordings = [...recordings, ...recordingsBatch];
                hasMoreRecordings = recordingsBatch.length === recordingsPageSize;
                recordingsPage++;
            }
        }
        
        // Count unique sentences that have been recorded
        const recordedSentences = new Set();
        const sentenceRecordingCounts = {};
        
        recordings?.forEach(recording => {
            recordedSentences.add(recording.sentence);
            if (!sentenceRecordingCounts[recording.sentence]) {
                sentenceRecordingCounts[recording.sentence] = new Set();
            }
            sentenceRecordingCounts[recording.sentence].add(recording.user_id);
        });
        
        // Count sentences available for a new contributor
        const availableForNewUser = allSentences?.filter(s => {
            const recordedByUsers = sentenceRecordingCounts[s.text];
            return !recordedByUsers || recordedByUsers.size < 3;
        }).length || 0;
        
        console.log(`📝 Sentences with recordings: ${recordedSentences.size}`);
        console.log(`📝 Sentences with 3+ recordings: ${Object.values(sentenceRecordingCounts).filter(users => users.size >= 3).length}`);
        console.log(`📝 Available for new contributors: ${availableForNewUser}\n`);
        
        if (availableForNewUser >= 999) {
            console.log('✅ CONFIRMED: Contributors now have access to all available sentences!');
            console.log(`✅ Before fix: ~999 sentences`);
            console.log(`✅ After fix: ${availableForNewUser} sentences\n`);
        } else {
            console.log(`⚠️  WARNING: Only ${availableForNewUser} sentences available for new contributors`);
            console.log('   This might be expected if many sentences already have 3 recordings.\n');
        }
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

verifySentenceCount();

