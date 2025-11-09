/**
 * Mozilla Upload Configuration Checker
 * 
 * This script checks if your Mozilla upload setup is configured correctly
 * Run with: node check_mozilla_setup.js
 */

require('dotenv').config({ path: '.env.local' })

const checks = {
  passed: [],
  failed: [],
  warnings: []
}

console.log('🔍 Checking Mozilla Upload Configuration...\n')

// Check 1: Google Cloud Credentials
console.log('1️⃣ Checking Google Cloud Credentials...')
const hasKeyJson = !!process.env.GOOGLE_CLOUD_KEY_JSON
const hasKeyFile = !!process.env.GOOGLE_CLOUD_KEY_FILE_PATH
const hasProjectId = !!process.env.GOOGLE_CLOUD_PROJECT_ID

if (hasKeyJson || hasKeyFile) {
  checks.passed.push('✅ Google Cloud credentials configured')
  
  if (hasKeyJson) {
    try {
      JSON.parse(process.env.GOOGLE_CLOUD_KEY_JSON)
      checks.passed.push('✅ GOOGLE_CLOUD_KEY_JSON is valid JSON')
    } catch (e) {
      checks.failed.push('❌ GOOGLE_CLOUD_KEY_JSON is not valid JSON')
    }
  }
  
  if (!hasProjectId) {
    checks.warnings.push('⚠️  GOOGLE_CLOUD_PROJECT_ID not set (may use default from key)')
  } else {
    checks.passed.push('✅ GOOGLE_CLOUD_PROJECT_ID configured')
  }
} else {
  checks.failed.push('❌ No Google Cloud credentials found')
  checks.failed.push('   Missing: GOOGLE_CLOUD_KEY_JSON or GOOGLE_CLOUD_KEY_FILE_PATH')
}

// Check 2: Bucket Configuration
console.log('2️⃣ Checking Bucket Configuration...')
const hasBucketName = !!process.env.MOZILLA_BUCKET_NAME

if (hasBucketName) {
  checks.passed.push(`✅ Bucket name: ${process.env.MOZILLA_BUCKET_NAME}`)
} else {
  checks.warnings.push('⚠️  MOZILLA_BUCKET_NAME not set (will use default: common-voice-nonprod-stage-luo-project)')
}

// Check 3: Required Dependencies
console.log('3️⃣ Checking Dependencies...')
try {
  require('@google-cloud/storage')
  checks.passed.push('✅ @google-cloud/storage package installed')
} catch (e) {
  checks.failed.push('❌ @google-cloud/storage package not installed')
  checks.failed.push('   Run: pnpm install @google-cloud/storage')
}

// Check 4: Test Google Cloud Storage Connection (if credentials exist)
if (hasKeyJson || hasKeyFile) {
  console.log('4️⃣ Testing Google Cloud Storage Connection...')
  
  const { Storage } = require('@google-cloud/storage')
  
  try {
    let storage
    
    if (hasKeyJson) {
      const credentials = JSON.parse(process.env.GOOGLE_CLOUD_KEY_JSON)
      storage = new Storage({
        credentials,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || credentials.project_id,
      })
    } else {
      storage = new Storage({
        keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE_PATH,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      })
    }
    
    checks.passed.push('✅ Google Cloud Storage client initialized')
    
    // Try to access bucket (async, won't wait for it in this script)
    const bucketName = process.env.MOZILLA_BUCKET_NAME || 'common-voice-nonprod-stage-luo-project'
    const bucket = storage.bucket(bucketName)
    
    // Check bucket existence (async)
    bucket.exists().then(([exists]) => {
      if (exists) {
        console.log(`   ✅ Bucket "${bucketName}" is accessible`)
      } else {
        console.log(`   ❌ Bucket "${bucketName}" not found or not accessible`)
        console.log(`      - Check bucket name`)
        console.log(`      - Verify service account has access to this bucket`)
      }
    }).catch(error => {
      console.log(`   ❌ Error accessing bucket: ${error.message}`)
      console.log(`      - Verify service account has correct permissions`)
      console.log(`      - Check if bucket exists in Google Cloud Console`)
    })
    
  } catch (error) {
    checks.failed.push(`❌ Failed to initialize Google Cloud Storage: ${error.message}`)
  }
} else {
  console.log('4️⃣ Skipping Google Cloud Storage test (no credentials)')
}

// Print Results
console.log('\n' + '='.repeat(60))
console.log('📊 RESULTS')
console.log('='.repeat(60) + '\n')

if (checks.passed.length > 0) {
  console.log('✅ PASSED CHECKS:')
  checks.passed.forEach(check => console.log(`   ${check}`))
  console.log('')
}

if (checks.warnings.length > 0) {
  console.log('⚠️  WARNINGS:')
  checks.warnings.forEach(warning => console.log(`   ${warning}`))
  console.log('')
}

if (checks.failed.length > 0) {
  console.log('❌ FAILED CHECKS:')
  checks.failed.forEach(fail => console.log(`   ${fail}`))
  console.log('')
}

// Overall Status
console.log('='.repeat(60))
if (checks.failed.length === 0) {
  console.log('✅ All critical checks passed! Upload should work.')
  console.log('\n📝 Next Steps:')
  console.log('   1. Run database migration: scripts/011_add_mozilla_upload_tracking.sql')
  console.log('   2. Ensure you have approved recordings in database')
  console.log('   3. Restart your Next.js server')
  console.log('   4. Try uploading from Admin Dashboard → Mozilla Upload')
} else {
  console.log('❌ Configuration incomplete. Please fix the issues above.')
  console.log('\n📝 Required Actions:')
  console.log('   1. Add Google Cloud credentials to .env.local')
  console.log('   2. Install missing dependencies')
  console.log('   3. Run this script again to verify')
}
console.log('='.repeat(60))

// Environment Variables Template
if (checks.failed.length > 0 && (!hasKeyJson && !hasKeyFile)) {
  console.log('\n📋 .env.local Template:')
  console.log('─'.repeat(60))
  console.log(`
# Google Cloud Storage Configuration for Mozilla Upload
GOOGLE_CLOUD_KEY_JSON='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
GOOGLE_CLOUD_PROJECT_ID=your-project-id
MOZILLA_BUCKET_NAME=common-voice-nonprod-stage-luo-project
  `.trim())
  console.log('─'.repeat(60))
  console.log('Get the service account key from the Mozilla team\n')
}

