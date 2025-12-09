/**
 * Diagnostic script to check language-related database issues
 * This script will:
 * 1. Check what tables exist in the database
 * 2. Check what languages users have selected
 * 3. Check what language tables exist (luo, somali, maasai, etc.)
 * 4. Check if recordings exist in those tables
 * 5. Identify the mismatch between user selections and available data
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local file manually (no dotenv dependency needed)
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        process.env[key] = value
      }
    })
  }
}

// Try to load from .env.local
loadEnvFile()

// Also check for .env file
const envPath2 = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath2)) {
  const envContent = fs.readFileSync(envPath2, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  console.error('   Either in .env.local file or as environment variables')
  console.error('')
  console.error('   You can also set them directly:')
  console.error('   $env:NEXT_PUBLIC_SUPABASE_URL="your-url"')
  console.error('   $env:NEXT_PUBLIC_SUPABASE_ANON_KEY="your-key"')
  console.error('   node scripts/check_language_issue.js')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkLanguageIssue() {
  console.log('🔍 Checking language-related database issues...\n')

  // 1. Check users table structure and language data
  console.log('1️⃣ Checking users table...')
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, languages, language_dialect, accent_dialect, profile_complete')
      .limit(50)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
    } else {
      console.log(`✅ Found ${users.length} users`)
      
      // Count languages selected by users
      const languageCounts = {}
      const usersWithLanguages = users.filter(u => u.languages && u.languages.length > 0)
      
      usersWithLanguages.forEach(user => {
        user.languages.forEach(lang => {
          languageCounts[lang] = (languageCounts[lang] || 0) + 1
        })
      })
      
      console.log('\n   Languages selected by users:')
      Object.entries(languageCounts).forEach(([lang, count]) => {
        console.log(`   - ${lang}: ${count} user(s)`)
      })
      
      console.log(`\n   Users with languages: ${usersWithLanguages.length}/${users.length}`)
      console.log(`   Users without languages: ${users.length - usersWithLanguages.length}`)
      
      // Show sample users with their languages
      console.log('\n   Sample users with languages:')
      usersWithLanguages.slice(0, 5).forEach(user => {
        console.log(`   - ${user.email}: ${user.languages?.join(', ') || 'none'} (dialect: ${user.language_dialect || user.accent_dialect || 'none'})`)
      })
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }

  // 2. Check what language tables exist
  console.log('\n2️⃣ Checking language-specific tables...')
  const languageTables = ['luo', 'somali', 'maasai', 'kalenjin', 'kikuyu']
  const tableStatus = {}

  for (const tableName of languageTables) {
    try {
      // Try to query the table
      const { data, error } = await supabase
        .from(tableName)
        .select('id, language, status')
        .limit(1)

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          tableStatus[tableName] = { exists: false, error: 'Table does not exist' }
        } else {
          tableStatus[tableName] = { exists: true, error: error.message }
        }
      } else {
        // Table exists, check structure
        const { data: sample, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        const columns = sample && sample.length > 0 ? Object.keys(sample[0]) : []
        const hasLanguageColumn = columns.includes('language')
        const hasStatusColumn = columns.includes('status')

        // Count total records
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        // Count by status if status column exists
        let pendingCount = 0
        if (hasStatusColumn) {
          const { count: pending } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
          pendingCount = pending || 0
        }

        // Check language values if language column exists
        let languageValues = []
        if (hasLanguageColumn) {
          const { data: langData } = await supabase
            .from(tableName)
            .select('language')
            .limit(100)
          languageValues = langData ? [...new Set(langData.map(r => r?.language).filter(Boolean))] : []
        }

        tableStatus[tableName] = {
          exists: true,
          totalRecords: count || 0,
          pendingRecords: pendingCount,
          hasLanguageColumn,
          hasStatusColumn,
          languageValues: languageValues.slice(0, 10), // Show first 10 unique values
          columns: columns.slice(0, 15) // Show first 15 columns
        }
      }
    } catch (error) {
      tableStatus[tableName] = { exists: false, error: error.message }
    }
  }

  // Display table status
  console.log('\n   Language table status:')
  Object.entries(tableStatus).forEach(([table, status]) => {
    if (status.exists) {
      console.log(`   ✅ ${table}:`)
      console.log(`      - Total records: ${status.totalRecords}`)
      console.log(`      - Pending records: ${status.pendingRecords}`)
      console.log(`      - Has language column: ${status.hasLanguageColumn ? '✅' : '❌'}`)
      console.log(`      - Has status column: ${status.hasStatusColumn ? '✅' : '❌'}`)
      if (status.languageValues && status.languageValues.length > 0) {
        console.log(`      - Language values found: ${status.languageValues.join(', ')}`)
      }
      console.log(`      - Columns: ${status.columns?.join(', ') || 'unknown'}`)
    } else {
      console.log(`   ❌ ${table}: ${status.error || 'Does not exist'}`)
    }
  })

  // 3. Check recordings table (if it exists)
  console.log('\n3️⃣ Checking recordings table...')
  try {
    const { data: recordings, error: recordingsError } = await supabase
      .from('recordings')
      .select('id, language, status')
      .limit(10)

    if (recordingsError) {
      if (recordingsError.message?.includes('does not exist')) {
        console.log('   ⚠️ Recordings table does not exist')
      } else {
        console.error('   ❌ Error:', recordingsError.message)
      }
    } else {
      const { count } = await supabase
        .from('recordings')
        .select('*', { count: 'exact', head: true })

      const languageCounts = {}
      if (recordings) {
        recordings.forEach(rec => {
          if (rec.language) {
            languageCounts[rec.language] = (languageCounts[rec.language] || 0) + 1
          }
        })
      }

      console.log(`   ✅ Recordings table exists with ${count || 0} total records`)
      if (Object.keys(languageCounts).length > 0) {
        console.log('   Language distribution in recordings:')
        Object.entries(languageCounts).forEach(([lang, count]) => {
          console.log(`      - ${lang}: ${count}`)
        })
      }
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message)
  }

  // 4. Summary and recommendations
  console.log('\n4️⃣ Summary and Recommendations:')
  console.log('\n   Issues found:')
  
  const missingTables = Object.entries(tableStatus)
    .filter(([_, status]) => !status.exists)
    .map(([table, _]) => table)

  if (missingTables.length > 0) {
    console.log(`   ❌ Missing tables: ${missingTables.join(', ')}`)
    console.log(`      → Users have selected these languages but tables don't exist`)
  }

  const tablesWithoutLanguageColumn = Object.entries(tableStatus)
    .filter(([_, status]) => status.exists && !status.hasLanguageColumn)
    .map(([table, _]) => table)

  if (tablesWithoutLanguageColumn.length > 0) {
    console.log(`   ⚠️ Tables without language column: ${tablesWithoutLanguageColumn.join(', ')}`)
    console.log(`      → These tables exist but don't have a language column for filtering`)
  }

  const emptyTables = Object.entries(tableStatus)
    .filter(([_, status]) => status.exists && status.totalRecords === 0)
    .map(([table, _]) => table)

  if (emptyTables.length > 0) {
    console.log(`   ⚠️ Empty tables: ${emptyTables.join(', ')}`)
    console.log(`      → These tables exist but have no recordings`)
  }

  console.log('\n   ✅ Check complete!')
}

checkLanguageIssue().catch(console.error)

