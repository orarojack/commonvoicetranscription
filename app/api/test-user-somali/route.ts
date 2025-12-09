import { NextRequest, NextResponse } from 'next/server'
import { db, getLanguageTableName } from '@/lib/database'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const email = 'jackoraro.me@gmail.com'
  const password = 'Ochi123.com'

  const results: any = {
    success: false,
    steps: [],
    summary: {},
    error: null
  }

  try {
    // Step 1: Get user by email
    results.steps.push({ step: 1, action: 'Finding user by email', status: 'in_progress' })
    const allUsers = await db.getAllUsersByEmail(email)
    
    if (!allUsers || allUsers.length === 0) {
      results.error = 'User not found with email: ' + email
      results.steps[results.steps.length - 1].status = 'failed'
      return NextResponse.json(results, { status: 404 })
    }

    // Filter users that match the password
    const matchingUsers = allUsers.filter(
      user => user.password === password && user.role !== "admin"
    )

    if (matchingUsers.length === 0) {
      results.error = 'No user found with matching password'
      results.steps[results.steps.length - 1].status = 'failed'
      return NextResponse.json(results, { status: 401 })
    }

    const user = matchingUsers[0]
    results.steps[results.steps.length - 1].status = 'success'
    results.steps[results.steps.length - 1].data = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name || 'N/A'
    }

    // Step 2: Check selected language
    results.steps.push({ step: 2, action: 'Checking selected language', status: 'in_progress' })
    const selectedLanguage = user.languages && user.languages.length > 0 
      ? user.languages[0] 
      : null
    
    if (!selectedLanguage) {
      results.error = 'User has no language selected!'
      results.steps[results.steps.length - 1].status = 'failed'
      results.steps[results.steps.length - 1].data = { languages: user.languages }
      return NextResponse.json(results, { status: 400 })
    }

    const isSomali = selectedLanguage === 'Somali'
    results.steps[results.steps.length - 1].status = 'success'
    results.steps[results.steps.length - 1].data = {
      selectedLanguage,
      allLanguages: user.languages,
      languageDialect: (user as any).language_dialect || 'N/A',
      accentDialect: (user as any).accent_dialect || 'N/A',
      isSomali
    }

    // Step 3: Get language table name
    results.steps.push({ step: 3, action: 'Getting language table name', status: 'in_progress' })
    const languageTable = getLanguageTableName(selectedLanguage)
    results.steps[results.steps.length - 1].status = 'success'
    results.steps[results.steps.length - 1].data = {
      language: selectedLanguage,
      tableName: languageTable
    }

    // Step 4: Get user's recordings
    results.steps.push({ step: 4, action: 'Fetching user recordings', status: 'in_progress' })
    let recordings: any[] = []
    
    // Try to get recordings from the language-specific table (somali)
    if (isSomali) {
      try {
        const { data, error } = await supabase
          .from('somali')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          results.steps[results.steps.length - 1].warnings = [
            `Error fetching from somali table: ${error.message}`
          ]
        } else {
          recordings = data || []
        }
      } catch (err: any) {
        results.steps[results.steps.length - 1].warnings = [
          `Could not fetch from somali table: ${err.message}`
        ]
      }
    }

    // Also check the generic recordings table
    try {
      const genericRecordings = await db.getRecordingsByUser(user.id, { limit: 10 })
      if (genericRecordings.length > 0) {
        recordings = [...recordings, ...genericRecordings]
      }
    } catch (err: any) {
      results.steps[results.steps.length - 1].warnings = [
        ...(results.steps[results.steps.length - 1].warnings || []),
        `Could not fetch from recordings table: ${err.message}`
      ]
    }

    results.steps[results.steps.length - 1].status = 'success'
    results.steps[results.steps.length - 1].data = {
      totalRecordings: recordings.length,
      recordings: recordings.slice(0, 5).map(rec => ({
        id: rec.id,
        status: rec.status || 'N/A',
        cleaned_transcript: rec.cleaned_transcript || null,
        actualSentence: rec.actualSentence || null,
        sentence: rec.sentence || null,
        translatedText: rec.translatedText || null,
        audio_transcript: rec.audio_transcript || null,
        visibleTranscript: rec.cleaned_transcript || rec.actualSentence || rec.sentence || rec.translatedText || rec.audio_transcript || null
      }))
    }

    // Step 5: Check cleaned_transcript visibility
    results.steps.push({ step: 5, action: 'Checking cleaned_transcript visibility', status: 'in_progress' })
    
    const recordingsWithCleanedTranscript = recordings.filter(r => r.cleaned_transcript).length
    const recordingsWithVisibleTranscript = recordings.filter(r => 
      r.cleaned_transcript || r.actualSentence || r.sentence || r.translatedText || r.audio_transcript
    ).length

    results.steps[results.steps.length - 1].status = 'success'
    results.steps[results.steps.length - 1].data = {
      recordingsWithCleanedTranscript,
      recordingsWithVisibleTranscript,
      totalRecordings: recordings.length
    }

    // Summary
    results.summary = {
      userFound: true,
      userEmail: user.email,
      selectedLanguage,
      isSomali,
      totalRecordings: recordings.length,
      recordingsWithCleanedTranscript,
      recordingsWithVisibleTranscript,
      testPassed: isSomali && recordingsWithVisibleTranscript > 0,
      testFailed: !isSomali,
      testInconclusive: isSomali && recordingsWithVisibleTranscript === 0
    }

    results.success = true
    return NextResponse.json(results, { status: 200 })

  } catch (error: any) {
    results.error = error.message
    results.steps.push({
      step: 'error',
      action: 'Error occurred',
      status: 'failed',
      error: error.message,
      stack: error.stack
    })
    return NextResponse.json(results, { status: 500 })
  }
}
