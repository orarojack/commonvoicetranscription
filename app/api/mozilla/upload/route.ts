import { NextRequest, NextResponse } from 'next/server'
import { RecordingUploadData, MozillaRecordingMetadata } from '@/lib/mozilla-api'
import { mozillaUpload } from '@/lib/mozilla-upload-server'
import { db } from '@/lib/database'

const DEFAULT_ACCENT = 'MAXATIRI'

// POST /api/mozilla/upload - Upload approved recording to Mozilla bucket
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json()
    const { recordingId } = body

    if (!recordingId) {
      return NextResponse.json(
        { error: 'Recording ID is required' },
        { status: 400 }
      )
    }

    // Fetch the recording from database
    const recording = await db.getRecordingById(recordingId)
    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      )
    }

    // Check if recording is approved
    if (recording.status !== 'approved') {
      return NextResponse.json(
        { error: 'Only approved recordings can be uploaded to Mozilla' },
        { status: 400 }
      )
    }

    // Check if already uploaded to Mozilla
    if (recording.mozilla_uploaded) {
      return NextResponse.json(
        { error: 'Recording already uploaded to Mozilla', mozillaUrl: recording.mozilla_url },
        { status: 400 }
      )
    }

    // Get user data for metadata
    const user = await db.getUserById(recording.user_id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found for recording' },
        { status: 404 }
      )
    }

    // Fetch audio file from Supabase storage
    const audioResponse = await fetch(recording.audio_url)
    if (!audioResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch audio file from storage' },
        { status: 500 }
      )
    }

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())

    // Prepare metadata in Mozilla format
    const metadata: MozillaRecordingMetadata = {
      age: user.age ? mozillaUpload.convertAgeToMozillaFormat(user.age) : '',
      gender: user.gender ? mozillaUpload.convertGenderToMozillaFormat(user.gender) : '',
      accent: DEFAULT_ACCENT,
      sentenceDomain: 'general', // Default domain - you can customize this
    }

    // Prepare upload data
    // Use the Mozilla sentence ID (from Mozilla API) not the recording ID
    const mozillaSentenceId = (recording as any).sentence_mozilla_id || recording.id
    const uploadData: RecordingUploadData = {
      audioBuffer,
      audioFileName: `${recordingId}.webm`,
      sentenceText: recording.sentence,
      sentenceId: mozillaSentenceId, // Use Mozilla sentence ID, not recording ID
      metadata,
      languageCode: 'luo',
    }

    // Upload to Mozilla's Google Cloud Storage bucket
    const mozillaUrl = await mozillaUpload.uploadToMozillaBucket(uploadData)

    // Update database to mark as uploaded
    await db.markRecordingAsUploadedToMozilla(recordingId, mozillaUrl)

    return NextResponse.json({
      success: true,
      message: 'Recording successfully uploaded to Mozilla',
      mozillaUrl,
    })
  } catch (error) {
    console.error('Error uploading to Mozilla:', error)
    return NextResponse.json(
      {
        error: 'Failed to upload recording to Mozilla',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST /api/mozilla/upload/batch - Upload multiple approved recordings to Mozilla bucket
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { recordingIds, limit } = body

    if (!recordingIds || !Array.isArray(recordingIds) || recordingIds.length === 0) {
      // If no specific IDs provided, fetch all approved recordings not yet uploaded
      const approvedRecordings = await db.getApprovedRecordingsNotUploadedToMozilla(limit || 100)
      
      const results = []
      let successCount = 0
      let failCount = 0

      for (const recording of approvedRecordings) {
        try {
          // Get user data
          const user = await db.getUserById(recording.user_id)
          if (!user) {
            results.push({ recordingId: recording.id, success: false, error: 'User not found' })
            failCount++
            continue
          }

          // Fetch audio
          const audioResponse = await fetch(recording.audio_url)
          if (!audioResponse.ok) {
            results.push({ recordingId: recording.id, success: false, error: 'Failed to fetch audio' })
            failCount++
            continue
          }

          const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())

          // Prepare metadata
          const metadata: MozillaRecordingMetadata = {
            age: user.age ? mozillaUpload.convertAgeToMozillaFormat(user.age) : '',
            gender: user.gender ? mozillaUpload.convertGenderToMozillaFormat(user.gender) : '',
            accent: DEFAULT_ACCENT,
            sentenceDomain: 'general',
          }

          // Prepare upload data
          // Use the Mozilla sentence ID (from Mozilla API) not the recording ID
          const mozillaSentenceId = (recording as any).sentence_mozilla_id || recording.id
          const uploadData: RecordingUploadData = {
            audioBuffer,
            audioFileName: `${recording.id}.webm`,
            sentenceText: recording.sentence,
            sentenceId: mozillaSentenceId, // Use Mozilla sentence ID, not recording ID
            metadata,
            languageCode: 'luo',
          }

          // Upload to Mozilla
          const mozillaUrl = await mozillaUpload.uploadToMozillaBucket(uploadData)

          // Update database
          await db.markRecordingAsUploadedToMozilla(recording.id, mozillaUrl)

          results.push({ recordingId: recording.id, success: true, mozillaUrl })
          successCount++
        } catch (error) {
          results.push({
            recordingId: recording.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          failCount++
        }
      }

      return NextResponse.json({
        success: true,
        message: `Batch upload completed: ${successCount} successful, ${failCount} failed`,
        successCount,
        failCount,
        results,
      })
    }

    // Upload specific recordings by ID
    const results = []
    let successCount = 0
    let failCount = 0

    for (const recordingId of recordingIds) {
      try {
        // Fetch recording
        const recording = await db.getRecordingById(recordingId)
        if (!recording) {
          results.push({ recordingId, success: false, error: 'Recording not found' })
          failCount++
          continue
        }

        if (recording.status !== 'approved') {
          results.push({ recordingId, success: false, error: 'Recording not approved' })
          failCount++
          continue
        }

        if (recording.mozilla_uploaded) {
          results.push({ recordingId, success: false, error: 'Already uploaded', mozillaUrl: recording.mozilla_url })
          failCount++
          continue
        }

        // Get user data
        const user = await db.getUserById(recording.user_id)
        if (!user) {
          results.push({ recordingId, success: false, error: 'User not found' })
          failCount++
          continue
        }

        // Fetch audio
        const audioResponse = await fetch(recording.audio_url)
        if (!audioResponse.ok) {
          results.push({ recordingId, success: false, error: 'Failed to fetch audio' })
          failCount++
          continue
        }

        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())

        // Prepare metadata
        const metadata: MozillaRecordingMetadata = {
          age: user.age ? mozillaUpload.convertAgeToMozillaFormat(user.age) : '',
          gender: user.gender ? mozillaUpload.convertGenderToMozillaFormat(user.gender) : '',
          accent: DEFAULT_ACCENT,
          sentenceDomain: 'general',
        }

        // Prepare upload data
        // Use the Mozilla sentence ID (from Mozilla API) not the recording ID
        const mozillaSentenceId = (recording as any).sentence_mozilla_id || recording.id
        const uploadData: RecordingUploadData = {
          audioBuffer,
          audioFileName: `${recording.id}.webm`,
          sentenceText: recording.sentence,
          sentenceId: mozillaSentenceId, // Use Mozilla sentence ID, not recording ID
          metadata,
          languageCode: 'luo',
        }

        // Upload to Mozilla
        const mozillaUrl = await mozillaUpload.uploadToMozillaBucket(uploadData)

        // Update database
        await db.markRecordingAsUploadedToMozilla(recording.id, mozillaUrl)

        results.push({ recordingId, success: true, mozillaUrl })
        successCount++
      } catch (error) {
        results.push({
          recordingId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        failCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Batch upload completed: ${successCount} successful, ${failCount} failed`,
      successCount,
      failCount,
      results,
    })
  } catch (error) {
    console.error('Error in batch upload to Mozilla:', error)
    return NextResponse.json(
      {
        error: 'Failed to process batch upload',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

