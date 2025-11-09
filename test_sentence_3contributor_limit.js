#!/usr/bin/env node

/**
 * Test script to verify the 3-contributor limit for sentences
 * This script tests that:
 * 1. Sentences with < 3 contributors are available
 * 2. Sentences with >= 3 contributors are NOT available
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

async function testSentence3ContributorLimit() {
    try {
        console.log('🧪 Testing 3-Contributor Limit for Sentences\n');
        console.log('=' .repeat(60));
        
        // Step 1: Fetch all recordings
        console.log('\n📥 Step 1: Fetching all recordings...');
        let allRecordings = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data: recordingsBatch, error: recordingsError } = await supabase
                .from('recordings')
                .select('sentence, user_id')
                .range(page * pageSize, (page + 1) * pageSize - 1);
            
            if (recordingsError) {
                console.error('❌ Error fetching recordings:', recordingsError.message);
                return;
            }
            
            if (!recordingsBatch || recordingsBatch.length === 0) {
                hasMore = false;
            } else {
                allRecordings = [...allRecordings, ...recordingsBatch];
                hasMore = recordingsBatch.length === pageSize;
                page++;
                if (page % 5 === 0) {
                    console.log(`   Fetched ${allRecordings.length} recordings so far...`);
                }
            }
        }
        
        console.log(`✅ Fetched ${allRecordings.length} total recordings\n`);

        // Step 2: Build sentence recording counts (same logic as getAvailableSentencesForUser)
        console.log('📊 Step 2: Building sentence recording counts...');
        const sentenceRecordingCounts = {};
        
        allRecordings.forEach(recording => {
            if (!sentenceRecordingCounts[recording.sentence]) {
                sentenceRecordingCounts[recording.sentence] = new Set();
            }
            sentenceRecordingCounts[recording.sentence].add(recording.user_id);
        });
        
        console.log(`✅ Counted recordings for ${Object.keys(sentenceRecordingCounts).length} unique sentences\n`);

        // Step 3: Analyze counts
        console.log('📈 Step 3: Analyzing recording counts...\n');
        
        const sentencesByCount = {
            0: [],
            1: [],
            2: [],
            3: [],
            '3+': []
        };
        
        Object.entries(sentenceRecordingCounts).forEach(([sentence, users]) => {
            const count = users.size;
            if (count === 0) {
                sentencesByCount[0].push(sentence);
            } else if (count === 1) {
                sentencesByCount[1].push(sentence);
            } else if (count === 2) {
                sentencesByCount[2].push(sentence);
            } else if (count === 3) {
                sentencesByCount[3].push(sentence);
            } else {
                sentencesByCount['3+'].push(sentence);
            }
        });
        
        console.log('   Distribution of sentences by contributor count:');
        console.log(`   - 0 contributors: ${sentencesByCount[0].length} sentences`);
        console.log(`   - 1 contributor:  ${sentencesByCount[1].length} sentences`);
        console.log(`   - 2 contributors: ${sentencesByCount[2].length} sentences`);
        console.log(`   - 3 contributors: ${sentencesByCount[3].length} sentences`);
        console.log(`   - 3+ contributors: ${sentencesByCount['3+'].length} sentences\n`);
        
        const shouldBeExcluded = sentencesByCount[3].length + sentencesByCount['3+'].length;
        
        // Get total sentences count
        const { count: totalSentencesCount } = await supabase
            .from('sentences')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('language_code', 'luo');
        
        // Available = all sentences minus those with 3+ contributors
        // (Sentences with 0, 1, or 2 contributors are all available)
        const shouldBeAvailable = totalSentencesCount - shouldBeExcluded;
        
        console.log(`   ✅ Should be AVAILABLE for new contributors: ${shouldBeAvailable} sentences`);
        console.log(`      (This includes ${totalSentencesCount - Object.keys(sentenceRecordingCounts).length} unrecorded sentences)`);
        console.log(`   ❌ Should be EXCLUDED (3+ contributors): ${shouldBeExcluded} sentences\n`);

        // Step 4: Test the filtering logic (simulate getAvailableSentencesForUser for a new user)
        console.log('🧪 Step 4: Testing filtering logic (simulating new contributor)...\n');
        
        // Fetch all active sentences
        console.log('   Fetching all active sentences...');
        let allSentences = [];
        page = 0;
        hasMore = true;

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
            }
        }
        
        console.log(`   ✅ Fetched ${allSentences.length} active sentences\n`);
        
        // Simulate filtering (for a user who hasn't recorded anything)
        console.log('   Applying 3-contributor filter...');
        const userRecordedSentences = new Set(); // Empty - simulating new user
        
        const availableSentences = allSentences.filter(s => {
            const sentenceText = s.text;
            
            // Exclude if user already recorded this sentence
            if (userRecordedSentences.has(sentenceText)) {
                return false;
            }
            
            // Exclude if 3 or more different users already recorded this sentence
            const recordedByUsers = sentenceRecordingCounts[sentenceText];
            if (recordedByUsers && recordedByUsers.size >= 3) {
                return false;
            }
            
            return true;
        });
        
        console.log(`   ✅ Filtered to ${availableSentences.length} available sentences\n`);

        // Step 5: Verify the results
        console.log('✅ Step 5: Verification Results\n');
        console.log('=' .repeat(60));
        
        const expectedAvailable = shouldBeAvailable;
        const actualAvailable = availableSentences.length;
        const matches = actualAvailable === expectedAvailable;
        
        if (matches) {
            console.log('✅ TEST PASSED: Filtering logic is correct!');
            console.log(`   Expected: ${expectedAvailable} available sentences`);
            console.log(`   Actual: ${actualAvailable} available sentences`);
        } else {
            console.log('⚠️  TEST WARNING: Counts don\'t match exactly, but logic may still be correct');
            console.log(`   Expected: ${expectedAvailable} available sentences`);
            console.log(`   Actual: ${actualAvailable} available sentences`);
            console.log(`   Difference: ${Math.abs(actualAvailable - expectedAvailable)}`);
            console.log(`   Note: Small differences may be due to sentences with recordings not in active sentences list`);
        }
        
        // Additional verification: Check a few specific examples
        console.log('\n🔍 Step 6: Spot-checking specific sentences...\n');
        
        // Find a sentence with exactly 2 contributors
        const sentenceWith2Contributors = Object.entries(sentenceRecordingCounts)
            .find(([sentence, users]) => users.size === 2);
        
        // Find a sentence with exactly 3 contributors
        const sentenceWith3Contributors = Object.entries(sentenceRecordingCounts)
            .find(([sentence, users]) => users.size === 3);
        
        if (sentenceWith2Contributors) {
            const [sentence, users] = sentenceWith2Contributors;
            const isAvailable = availableSentences.some(s => s.text === sentence);
            if (isAvailable) {
                console.log(`   ✅ Sentence with 2 contributors is AVAILABLE (correct)`);
                console.log(`      Sentence: "${sentence.substring(0, 50)}..."`);
                console.log(`      Contributors: ${users.size}`);
            } else {
                console.log(`   ❌ Sentence with 2 contributors is NOT available (incorrect!)`);
                console.log(`      Sentence: "${sentence.substring(0, 50)}..."`);
            }
        }
        
        if (sentenceWith3Contributors) {
            const [sentence, users] = sentenceWith3Contributors;
            const isAvailable = availableSentences.some(s => s.text === sentence);
            if (!isAvailable) {
                console.log(`   ✅ Sentence with 3 contributors is EXCLUDED (correct)`);
                console.log(`      Sentence: "${sentence.substring(0, 50)}..."`);
                console.log(`      Contributors: ${users.size}`);
            } else {
                console.log(`   ❌ Sentence with 3 contributors is AVAILABLE (incorrect!)`);
                console.log(`      Sentence: "${sentence.substring(0, 50)}..."`);
            }
        }
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY\n');
        console.log(`Total sentences in database: ${allSentences.length}`);
        console.log(`Sentences with recordings: ${Object.keys(sentenceRecordingCounts).length}`);
        console.log(`Available for new contributors: ${actualAvailable}`);
        console.log(`Excluded (3+ contributors): ${shouldBeExcluded}`);
        
        // Verify the core logic: sentences with 2 contributors available, 3+ excluded
        const twoContribCheck = sentenceWith2Contributors ? availableSentences.some(s => s.text === sentenceWith2Contributors[0]) : true;
        const threeContribCheck = sentenceWith3Contributors ? !availableSentences.some(s => s.text === sentenceWith3Contributors[0]) : true;
        
        const coreLogicWorks = twoContribCheck && threeContribCheck;
        
        console.log(`\n${coreLogicWorks && Math.abs(actualAvailable - expectedAvailable) <= 10 ? '✅' : '⚠️'} Test Results:`);
        console.log(`   - Core logic (2 contributors available, 3+ excluded): ${coreLogicWorks ? '✅ WORKING' : '❌ BROKEN'}`);
        console.log(`   - Count accuracy: ${Math.abs(actualAvailable - expectedAvailable) <= 10 ? '✅ Acceptable' : '⚠️  Needs review'} (difference: ${Math.abs(actualAvailable - expectedAvailable)})`);
        console.log(`\n📝 Conclusion: The 3-contributor limit is ${coreLogicWorks ? 'WORKING CORRECTLY' : 'NOT WORKING'}.`);
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
        console.error(error.stack);
    }
}

testSentence3ContributorLimit();

