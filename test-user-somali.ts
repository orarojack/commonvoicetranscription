/**
 * Test script to check if user jackoraro.me@gmail.com
 * has Somali as selected language and can see cleaned_transcript
 */

// Load environment variables first
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import { db, getLanguageTableName } from './lib/database'
import { supabase } from './lib/supabase'

async function testUserSomali() {
  const email = 'jackoraro.me@gmail.com'
  const password = 'Ochi123.com'

  console.log('='.repeat(60))
  console.log('Testing User: Somali Language & cleaned_transcript Visibility')
  console.log('='.repeat(60))
  console.log()

  try {
    // Step 1: Get user by email
    console.log('📧 Step 1: Finding user by email...')
    const allUsers = await db.getAllUsersByEmail(email)
    
    if (!allUsers || allUsers.length === 0) {
      console.error('❌ User not found with email:', email)
      return
    }

    // Filter users that match the password
    const matchingUsers = allUsers.filter(
      user => user.password === password && user.role !== "admin"
    )

    if (matchingUsers.length === 0) {
      console.error('❌ No user found with matching password')
      return
    }

    const user = matchingUsers[0]
    console.log('✅ User found!')
    console.log('   ID:', user.id)
    console.log('   Email:', user.email)
    console.log('   Role:', user.role)
    console.log('   Name:', user.name || 'N/A')
    console.log()

    // Step 2: Check selected language
    console.log('🌍 Step 2: Checking selected language...')
    const selectedLanguage = user.languages && user.languages.length > 0 
      ? user.languages[0] 
      : null
    
    if (!selectedLanguage) {
      console.error('❌ User has no language selected!')
      console.log('   Languages array:', user.languages)
      return
    }

    console.log('✅ Selected language:', selectedLanguage)
    console.log('   All languages:', user.languages)
    console.log('   Language dialect:', (user as any).language_dialect || 'N/A')
    console.log('   Accent dialect:', (user as any).accent_dialect || 'N/A')
    console.log()

    // Step 3: Check if language is Somali
    const isSomali = selectedLanguage === 'Somali'
    if (!isSomali) {
      console.warn('⚠️  User is NOT using Somali as selected language!')
      console.log('   Current language:', selectedLanguage)
      console.log('   Expected: Somali')
      console.log()
    } else {
      console.log('✅ User IS using Somali as selected language!')
      console.log()
    }

    // Step 4: Get language table name
    const languageTable = getLanguageTableName(selectedLanguage)
    console.log('📊 Step 3: Language table mapping...')
    console.log('   Language:', selectedLanguage)
    console.log('   Table name:', languageTable)
    console.log()

    // Step 5: Get user's recordings
    console.log('🎤 Step 4: Fetching user recordings...')
    
    // Try to get recordings from the language-specific table
    let recordings: any[] = []
    
    if (isSomali) {
      // For Somali, check the somali table
      try {
        const { data, error } = await (await import('./lib/supabase')).supabase
          .from('somali')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          console.warn('⚠️  Error fetching from somali table:', error.message)
        } else {
          recordings = data || []
          console.log(`✅ Found ${recordings.length} recordings in somali table`)
        }
      } catch (err: any) {
        console.warn('⚠️  Could not fetch from somali table:', err.message)
      }
    }

    // Also check the generic recordings table
    try {
      const genericRecordings = await db.getRecordingsByUser(user.id, { limit: 10 })
      if (genericRecordings.length > 0) {
        console.log(`✅ Found ${genericRecordings.length} recordings in recordings table`)
        // Merge with language-specific recordings
        recordings = [...recordings, ...genericRecordings]
      }
    } catch (err: any) {
      console.warn('⚠️  Could not fetch from recordings table:', err.message)
    }

    if (recordings.length === 0) {
      console.warn('⚠️  No recordings found for this user')
      console.log()
    } else {
      console.log(`✅ Total recordings found: ${recordings.length}`)
      console.log()
    }

    // Step 6: Check cleaned_transcript visibility
    console.log('📝 Step 5: Checking cleaned_transcript visibility...')
    console.log()
    
    if (recordings.length > 0) {
      console.log('Sample recordings with cleaned_transcript:')
      console.log('-'.repeat(60))
      
      recordings.slice(0, 5).forEach((rec, index) => {
        console.log(`\nRecording ${index + 1}:`)
        console.log('   ID:', rec.id)
        console.log('   Status:', rec.status || 'N/A')
        console.log('   cleaned_transcript:', rec.cleaned_transcript || '❌ NOT FOUND')
        console.log('   actualSentence:', rec.actualSentence || 'N/A')
        console.log('   sentence:', rec.sentence || 'N/A')
        console.log('   translatedText:', rec.translatedText || 'N/A')
        console.log('   audio_transcript:', rec.audio_transcript || 'N/A')
        
        // Check if cleaned_transcript is visible (mapped to sentence)
        const visibleTranscript = rec.cleaned_transcript || rec.actualSentence || rec.sentence || rec.translatedText || rec.audio_transcript || ''
        if (visibleTranscript) {
          console.log('   ✅ Visible transcript:', visibleTranscript.substring(0, 100) + (visibleTranscript.length > 100 ? '...' : ''))
        } else {
          console.log('   ❌ No transcript visible!')
        }
      })
      
      console.log()
      console.log('-'.repeat(60))
    }

    // Step 7: Summary
    console.log()
    console.log('='.repeat(60))
    console.log('SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ User found: ${user.email}`)
    console.log(`✅ Selected language: ${selectedLanguage} ${isSomali ? '✅' : '❌ (Expected: Somali)'}`)
    console.log(`✅ Recordings found: ${recordings.length}`)
    
    const recordingsWithCleanedTranscript = recordings.filter(r => r.cleaned_transcript).length
    console.log(`✅ Recordings with cleaned_transcript: ${recordingsWithCleanedTranscript}/${recordings.length}`)
    
    const recordingsWithVisibleTranscript = recordings.filter(r => 
      r.cleaned_transcript || r.actualSentence || r.sentence || r.translatedText || r.audio_transcript
    ).length
    console.log(`✅ Recordings with visible transcript: ${recordingsWithVisibleTranscript}/${recordings.length}`)
    
    console.log()
    
    if (isSomali && recordingsWithVisibleTranscript > 0) {
      console.log('✅ TEST PASSED: User can see cleaned_transcript!')
    } else if (!isSomali) {
      console.log('❌ TEST FAILED: User is not using Somali as selected language')
    } else {
      console.log('⚠️  TEST INCONCLUSIVE: No recordings with visible transcript found')
    }
    
    console.log('='.repeat(60))

  } catch (error: any) {
    console.error('❌ Error during test:', error)
    console.error('Stack:', error.stack)
  }
}

// Run the test
testUserSomali()
  .then(() => {
    console.log('\n✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
