// Server-side only Mozilla upload functionality
// This file should only be imported in API routes, not client components
import { Storage } from '@google-cloud/storage'
import type { MozillaRecordingMetadata, RecordingUploadData } from './mozilla-api'

export class MozillaUploadService {
  private storage: Storage | null = null

  constructor() {
    this.initializeStorage()
  }

  // Initialize Google Cloud Storage with service account credentials
  private initializeStorage() {
    try {
      const keyFilePath = process.env.GOOGLE_CLOUD_KEY_FILE_PATH
      const keyJson = process.env.GOOGLE_CLOUD_KEY_JSON

      if (keyJson) {
        // Use JSON string from environment variable
        const credentials = JSON.parse(keyJson)
        // Use project_id from the credentials JSON, or fallback to env variable
        const projectId = credentials.project_id || process.env.GOOGLE_CLOUD_PROJECT_ID
        this.storage = new Storage({
          credentials,
          projectId,
        })
      } else if (keyFilePath) {
        // Use key file path
        this.storage = new Storage({
          keyFilename: keyFilePath,
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        })
      } else {
        console.warn('No Google Cloud credentials configured. Recording uploads to Mozilla will not work.')
      }
    } catch (error) {
      console.error('Failed to initialize Google Cloud Storage:', error)
    }
  }

  // Upload audio file to Mozilla's Google Cloud Storage bucket
  async uploadToMozillaBucket(data: RecordingUploadData): Promise<string> {
    if (!this.storage) {
      throw new Error('Google Cloud Storage not initialized. Please configure credentials.')
    }

    const bucketName = process.env.MOZILLA_BUCKET_NAME || 'common-voice-nonprod-stage-luo-project'
    const bucket = this.storage.bucket(bucketName)

    try {
      // Generate unique filename with timestamp
      const timestamp = Date.now()
      const fileName = `luo/${data.languageCode}/${timestamp}_${data.audioFileName}`
      const file = bucket.file(fileName)

      // Upload the audio buffer
      await file.save(data.audioBuffer, {
        metadata: {
          contentType: 'audio/webm', // or 'audio/wav' depending on your format
          metadata: {
            sentenceText: data.sentenceText,
            sentenceId: data.sentenceId,
            languageCode: data.languageCode,
            age: data.metadata.age || '',
            gender: data.metadata.gender || '',
            accent: data.metadata.accent || '',
            sentenceDomain: data.metadata.sentenceDomain || '',
            uploadedAt: new Date().toISOString(),
          },
        },
      })

      // Get the public URL (if bucket is public) or signed URL
      const publicUrl = `gs://${bucketName}/${fileName}`
      
      console.log(`Successfully uploaded recording to Mozilla bucket: ${publicUrl}`)
      return publicUrl
    } catch (error) {
      console.error('Error uploading to Mozilla bucket:', error)
      throw new Error(`Failed to upload to Mozilla bucket: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Helper function to convert age from your database to Mozilla format
  convertAgeToMozillaFormat(age: string | number): MozillaRecordingMetadata['age'] {
    const ageNum = typeof age === 'string' ? parseInt(age, 10) : age
    
    if (isNaN(ageNum)) return ''
    if (ageNum >= 18 && ageNum < 20) return 'teens'
    if (ageNum >= 20 && ageNum < 30) return 'twenties'
    if (ageNum >= 30 && ageNum < 40) return 'thirties'
    if (ageNum >= 40 && ageNum < 50) return 'forties'
    if (ageNum >= 50 && ageNum < 60) return 'fifties'
    if (ageNum >= 60 && ageNum < 70) return 'sixties'
    if (ageNum >= 70 && ageNum < 80) return 'seventies'
    if (ageNum >= 80 && ageNum < 90) return 'eighties'
    if (ageNum >= 90) return 'nineties'
    return ''
  }

  // Helper function to convert gender from your database to Mozilla format
  convertGenderToMozillaFormat(gender: string): MozillaRecordingMetadata['gender'] {
    const lowerGender = gender.toLowerCase()
    
    if (lowerGender.includes('male') || lowerGender.includes('man') || lowerGender.includes('masculine')) {
      return 'male_masculine'
    }
    if (lowerGender.includes('female') || lowerGender.includes('woman') || lowerGender.includes('feminine')) {
      return 'female_feminine'
    }
    if (lowerGender.includes('non-binary') || lowerGender.includes('nonbinary')) {
      return "'non-binary'"
    }
    if (lowerGender.includes('not') || lowerGender.includes('prefer not')) {
      return 'do_not_wish_to_say'
    }
    
    return ''
  }
}

// Export singleton instance
export const mozillaUpload = new MozillaUploadService()

