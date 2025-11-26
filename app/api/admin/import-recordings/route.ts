import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { supabase } from '@/lib/supabase'

// CSV format expected:
// audio_url,transcription,language,duration
// https://bucket.example.com/audio1.mp3,Hello world,Somali,5.2
// https://bucket.example.com/audio2.mp3,How are you,Luo,3.8

export async function POST(request: NextRequest) {
  try {
    // Check authentication (you may want to add admin check here)
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read CSV file
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    // Parse CSV (simple parser - you may want to use a CSV library)
    const headers = lines[0].split(',').map(h => h.trim())
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const record: any = {}
      headers.forEach((header, index) => {
        record[header] = values[index] || ''
      })
      return record
    })

    // Validate required fields
    const requiredFields = ['audio_url', 'transcription', 'language']
    const missingFields = requiredFields.filter(field => !headers.includes(field))
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}`,
        required: requiredFields,
        found: headers
      }, { status: 400 })
    }

    // Get or create a system user for imported recordings
    // You may want to create a dedicated system user for this
    const systemUserEmail = 'system@africanextvoices.org'
    let systemUser = await db.getUserByEmail(systemUserEmail)
    
    if (!systemUser) {
      // Create system user if it doesn't exist
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: systemUserEmail,
          password: 'system_user_no_login', // This user won't be able to login
          role: 'contributor',
          status: 'active',
          profile_complete: true,
          name: 'System Import User',
        })
        .select()
        .single()

      if (createError || !newUser) {
        return NextResponse.json({ 
          error: 'Failed to create system user',
          details: createError?.message 
        }, { status: 500 })
      }
      
      systemUser = newUser
    }

    // Import recordings
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const record of data) {
      try {
        // Validate language
        const validLanguages = ['Somali', 'Luo', 'Maasai', 'Kalenjin', 'Kikuyu']
        if (!validLanguages.includes(record.language)) {
          results.failed++
          results.errors.push(`Invalid language "${record.language}" for recording with audio URL: ${record.audio_url}`)
          continue
        }

        // Parse duration (default to 0 if not provided)
        const duration = parseFloat(record.duration) || 0

        // Create recording
        await db.createRecording({
          user_id: systemUser.id,
          sentence: record.transcription,
          audio_url: record.audio_url,
          duration: duration,
          status: 'pending',
          language: record.language,
          metadata: {
            imported: true,
            imported_at: new Date().toISOString(),
            source: 'csv_import'
          }
        })

        results.success++
      } catch (error) {
        results.failed++
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.errors.push(`Failed to import recording ${record.audio_url}: ${errorMsg}`)
      }
    }

    return NextResponse.json({
      message: 'Import completed',
      total: data.length,
      success: results.success,
      failed: results.failed,
      errors: results.errors.slice(0, 10) // Return first 10 errors to avoid huge response
    })

  } catch (error) {
    console.error('Error importing recordings:', error)
    return NextResponse.json({ 
      error: 'Failed to import recordings',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}


