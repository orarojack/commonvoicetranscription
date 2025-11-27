import { supabase } from "./supabase"
import type { Database } from "./supabase"
import { withCache, queryCache } from "./cache"

export type User = Database["public"]["Tables"]["users"]["Row"]
export type Recording = Database["public"]["Tables"]["recordings"]["Row"]
export type Review = Database["public"]["Tables"]["reviews"]["Row"]

// Luo table type - compatible with Recording type for use in listen page
// Maps luo table columns (which may use 'transcription' instead of 'sentence') to Recording format
export type LuoRecording = Omit<Recording, 'sentence'> & {
  sentence: string  // Always present after mapping
  transcription?: string  // Original column name in luo table (if different)
  [key: string]: any  // Allow for other columns
}

export interface UserStats {
  userId: string
  totalRecordings: number
  approvedRecordings: number
  rejectedRecordings: number
  pendingRecordings: number
  totalReviews: number
  approvedReviews: number
  rejectedReviews: number
  averageReviewTime: number
  accuracyRate: number
  streakDays: number
  totalTimeContributed: number
  lastActivityAt: string
}

// Helper function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Helper function to convert camelCase to snake_case for database operations
function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase)
  }

  const converted: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    converted[snakeKey] = toSnakeCase(value)
  }
  return converted
}

class SupabaseDatabase {
  // OPTIMIZED: Query timeout helper to wrap database queries
  private async withTimeout<T>(
    queryPromise: Promise<{ data: T | null; error: any }>,
    timeoutMs: number = 30000
  ): Promise<{ data: T | null; error: any }> {
    const timeoutPromise = new Promise<{ data: null; error: any }>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    try {
      return await Promise.race([queryPromise, timeoutPromise])
    } catch (error) {
      console.error("Query timeout or error:", error)
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
    }
  }

  // User operations
  async createUser(userData: Database["public"]["Tables"]["users"]["Insert"]): Promise<User> {
    try {
      const { data, error } = await supabase
        .from("users")
        .insert({
          ...userData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Use the is_active value from userData, or default to true
          is_active: userData.is_active !== undefined ? userData.is_active : true,
        })
        .select()
        .single()

      if (error) {
        console.error("Database error creating user:", error)
        throw new Error(`Failed to create user: ${error.message}`)
      }

      if (!data) {
        throw new Error("No data returned from user creation")
      }

      // Invalidate user caches after creating new user
      queryCache.invalidatePattern('user:')
      
      return data
    } catch (error) {
      console.error("Error in createUser:", error)
      throw error
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      if (!email || typeof email !== "string") {
        throw new Error("Invalid email provided")
      }

      // Use cache with 5 minute TTL for user data
      return await withCache(
        `user:email:${email.toLowerCase().trim()}`,
        async () => {
          const { data, error } = await supabase.from("users").select("*").eq("email", email.toLowerCase().trim()).single()

          if (error && error.code !== "PGRST116") {
            console.error("Database error getting user by email:", error)
            throw new Error(`Failed to get user: ${error.message}`)
          }

          return data || null
        },
        5 * 60 * 1000 // 5 minutes
      )
    } catch (error) {
      console.error("Error in getUserByEmail:", error)
      if (error instanceof Error && error.message.includes("Failed to get user")) {
        throw error
      }
      return null
    }
  }

  async getUserByEmailAndRole(email: string, role: User["role"]): Promise<User | null> {
    try {
      if (!email || typeof email !== "string") {
        throw new Error("Invalid email provided")
      }

      if (!role) {
        throw new Error("Invalid role provided")
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .eq("role", role)
        .single()

      if (error) {
        // PGRST116 = no rows returned (not an error, just no match)
        if (error.code === "PGRST116") {
          return null
        }
        
        // Check if table doesn't exist (common error codes)
        if (error.code === "42P01" || error.message?.includes("does not exist") || error.message?.includes("relation") || error.message?.includes("table")) {
          console.error("❌ Database schema not set up! The 'users' table does not exist.")
          console.error("📋 Please run the database setup script:")
          console.error("   1. Go to your Supabase Dashboard → SQL Editor")
          console.error("   2. Run the SQL from: scripts/001_create_tables.sql")
          console.error("   3. Then run: scripts/010_allow_role_based_email_uniqueness.sql")
          console.error("   Or use: complete_database_setup.sql for complete setup")
          throw new Error("Database schema not initialized. Please run the database setup scripts first.")
        }
        
        console.error("Database error getting user by email and role:", error)
        throw new Error(`Failed to get user: ${error.message || JSON.stringify(error)}`)
      }

      return data || null
    } catch (error) {
      console.error("Error in getUserByEmailAndRole:", error)
      if (error instanceof Error && (error.message.includes("Failed to get user") || error.message.includes("Database schema not initialized"))) {
        throw error
      }
      return null
    }
  }

  async getAllUsersByEmail(email: string): Promise<User[]> {
    try {
      if (!email || typeof email !== "string") {
        return []
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Database error getting all users by email:", error)
        throw new Error(`Failed to get users: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error("Error in getAllUsersByEmail:", error)
      return []
    }
  }

  async getUserByIdNumber(idNumber: string): Promise<User | null> {
    try {
      if (!idNumber || typeof idNumber !== "string") {
        return null
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id_number", idNumber.trim())
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("Database error getting user by ID number:", error)
        return null
      }

      return data || null
    } catch (error) {
      console.error("Error in getUserByIdNumber:", error)
      return null
    }
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<User | null> {
    try {
      if (!phoneNumber || typeof phoneNumber !== "string") {
        return null
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("phone_number", phoneNumber.trim())
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("Database error getting user by phone number:", error)
        return null
      }

      return data || null
    } catch (error) {
      console.error("Error in getUserByPhoneNumber:", error)
      return null
    }
  }

  async checkIdNumberExists(idNumber: string, excludeUserId?: string): Promise<boolean> {
    try {
      if (!idNumber || typeof idNumber !== "string") {
        return false
      }

      let query = supabase.from("users").select("id").eq("id_number", idNumber.trim())

      if (excludeUserId && isValidUUID(excludeUserId)) {
        query = query.neq("id", excludeUserId)
      }

      const { data, error } = await query.limit(1)

      if (error) {
        console.error("Database error checking ID number:", error)
        return false
      }

      return (data && data.length > 0) || false
    } catch (error) {
      console.error("Error in checkIdNumberExists:", error)
      return false
    }
  }

  async checkPhoneNumberExists(phoneNumber: string, excludeUserId?: string): Promise<boolean> {
    try {
      if (!phoneNumber || typeof phoneNumber !== "string") {
        return false
      }

      let query = supabase.from("users").select("id").eq("phone_number", phoneNumber.trim())

      if (excludeUserId && isValidUUID(excludeUserId)) {
        query = query.neq("id", excludeUserId)
      }

      const { data, error } = await query.limit(1)

      if (error) {
        console.error("Database error checking phone number:", error)
        return false
      }

      return (data && data.length > 0) || false
    } catch (error) {
      console.error("Error in checkPhoneNumberExists:", error)
      return false
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      if (!id || typeof id !== "string") {
        console.error("Invalid user ID provided:", id)
        return null
      }

      // Validate UUID format
      if (!isValidUUID(id)) {
        console.error("Invalid UUID format:", id)
        return null
      }

      const { data, error } = await supabase.from("users").select("*").eq("id", id).single()

      if (error && error.code !== "PGRST116") {
        console.error("Database error getting user by id:", error)
        throw new Error(`Failed to get user: ${error.message}`)
      }

      return data || null
    } catch (error) {
      console.error("Error in getUserById:", error)
      return null
    }
  }

  async updateUser(id: string, updates: any): Promise<User | null> {
    try {
      if (!id || !isValidUUID(id)) {
        throw new Error("Invalid user ID provided")
      }

      // Prepare updates - already in snake_case format from auth provider
      const dbUpdates = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      console.log("Updating user with data:", dbUpdates)
      console.log("Updating user with ID:", id)

      // First check if user exists
      const { data: existingUser, error: checkError } = await supabase.from("users").select("*").eq("id", id).single()
      console.log("User exists check:", existingUser ? "Found" : "Not found", checkError ? `Error: ${checkError.message}` : "")

      if (!existingUser && checkError?.code === "PGRST116") {
        throw new Error(`User with ID ${id} not found in database`)
      }

      const { data, error } = await supabase.from("users").update(dbUpdates).eq("id", id).select().single()

      if (error) {
        console.error("Database error updating user:", error)
        throw new Error(`Failed to update user: ${error.message}`)
      }

      if (!data) {
        throw new Error(`No data returned after updating user with ID ${id}`)
      }

      console.log("User updated successfully:", data)
      return data
    } catch (error) {
      console.error("Error in updateUser:", error)
      throw error
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      if (!id || !isValidUUID(id)) {
        throw new Error("Invalid user ID provided")
      }

      const { error } = await supabase.from("users").delete().eq("id", id)

      if (error) {
        console.error("Database error deleting user:", error)
        throw new Error(`Failed to delete user: ${error.message}`)
      }

      return true
    } catch (error) {
      console.error("Error in deleteUser:", error)
      throw error
    }
  }

  async getAllUsers(options?: { limit?: number }): Promise<User[]> {
    try {
      // If limit is specified, use it directly (for performance when only need a few records)
      if (options?.limit) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(options.limit)

        if (error) {
          console.error("Database error getting all users:", error)
          throw new Error(`Failed to get users: ${error.message}`)
        }

        return data || []
      }

      // FIXED: Use pagination to fetch ALL users (not limited to 1000 rows)
      console.log("🔄 Fetching all users with pagination...")
      let allUsers: User[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: usersBatch, error: batchError } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (batchError) {
          console.error("Database error getting users batch:", batchError)
          throw new Error(`Failed to get all users: ${batchError.message}`)
        }

        if (!usersBatch || usersBatch.length === 0) {
          hasMore = false
        } else {
          allUsers = [...allUsers, ...usersBatch]
          hasMore = usersBatch.length === pageSize
          page++
        }
      }

      console.log(`✅ Fetched ${allUsers.length} total users`)
      return allUsers
    } catch (error) {
      console.error("Error in getAllUsers:", error)
      return []
    }
  }

  async getUsersByRole(role: "contributor" | "reviewer" | "admin"): Promise<User[]> {
    try {
      // FIXED: Use pagination to fetch ALL users by role (not limited to 1000 rows)
      console.log(`🔄 Fetching all users with role "${role}" with pagination...`)
      let allUsers: User[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: usersBatch, error: batchError } = await supabase
          .from("users")
          .select("*")
          .eq("role", role)
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (batchError) {
          console.error("Database error getting users by role batch:", batchError)
          throw new Error(`Failed to get users by role: ${batchError.message}`)
        }

        if (!usersBatch || usersBatch.length === 0) {
          hasMore = false
        } else {
          allUsers = [...allUsers, ...usersBatch]
          hasMore = usersBatch.length === pageSize
          page++
          console.log(`   Loaded page ${page}: ${usersBatch.length} users (total so far: ${allUsers.length})`)
        }
      }

      console.log(`✅ Fetched ${allUsers.length} total users with role "${role}"`)
      return allUsers
    } catch (error) {
      console.error("Error in getUsersByRole:", error)
      return []
    }
  }

  async getUsersByStatus(status: User["status"]): Promise<User[]> {
    try {
      // FIXED: Use pagination to fetch ALL users by status (not limited to 1000 rows)
      let allUsers: User[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: usersBatch, error: batchError } = await supabase
          .from("users")
          .select("*")
          .eq("status", status)
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (batchError) {
          console.error("Database error getting users by status batch:", batchError)
          throw new Error(`Failed to get users by status: ${batchError.message}`)
        }

        if (!usersBatch || usersBatch.length === 0) {
          hasMore = false
        } else {
          allUsers = [...allUsers, ...usersBatch]
          hasMore = usersBatch.length === pageSize
          page++
        }
      }

      return allUsers
    } catch (error) {
      console.error("Error in getUsersByStatus:", error)
      return []
    }
  }

  // Recording operations
  async createRecording(recordingData: Database["public"]["Tables"]["recordings"]["Insert"]): Promise<Recording> {
    try {
      if (!recordingData.user_id || !isValidUUID(recordingData.user_id)) {
        throw new Error("Invalid user ID provided for recording")
      }

      // Check if adding this recording would exceed the limit (3600 seconds / 1 hour)
      const currentTotalTime = await this.getUserTotalRecordingTime(recordingData.user_id)
      const newDuration = typeof recordingData.duration === 'string' 
        ? parseFloat(recordingData.duration) 
        : (recordingData.duration || 0)
      
      if (currentTotalTime >= 3600) {
        throw new Error("Recording limit reached. You have completed the 1-hour (3600 seconds) recording target. Thank you for your contribution!")
      }
      
      if (currentTotalTime + newDuration > 3600) {
        const remainingTime = 3600 - currentTotalTime
        throw new Error(`Recording would exceed the 1-hour limit. You have ${remainingTime.toFixed(1)} seconds (${(remainingTime / 60).toFixed(1)} minutes) remaining.`)
      }

      // Log the data being inserted for debugging
      console.log("Creating recording with data:", {
        user_id: recordingData.user_id,
        sentence: recordingData.sentence?.substring(0, 100) + "...",
        audio_url_length: recordingData.audio_url?.length || 0,
        duration: recordingData.duration,
        status: recordingData.status,
        quality: recordingData.quality,
        metadata: recordingData.metadata,
        currentTotal: currentTotalTime,
        newTotal: currentTotalTime + newDuration
      })

      // Note: audio_url field is now TEXT, so it can handle long data URLs

      const { data, error } = await supabase
        .from("recordings")
        .insert({
          ...recordingData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Database error creating recording:", error)
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw new Error(`Failed to create recording: ${error.message}`)
      }

      if (!data) {
        throw new Error("No data returned from recording creation")
      }

      return data
    } catch (error) {
      console.error("Error in createRecording:", error)
      throw error
    }
  }

  async getRecordingById(id: string): Promise<Recording | null> {
    try {
      if (!id || !isValidUUID(id)) {
        return null
      }

      const { data, error } = await supabase.from("recordings").select("*").eq("id", id).single()

      if (error && error.code !== "PGRST116") {
        console.error("Database error getting recording:", error)
        throw new Error(`Failed to get recording: ${error.message}`)
      }

      return data || null
    } catch (error) {
      console.error("Error in getRecordingById:", error)
      return null
    }
  }

  async getRecordingsByUser(userId: string, options?: { limit?: number }): Promise<Recording[]> {
    try {
      if (!userId || !isValidUUID(userId)) {
        return []
      }

      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn("Supabase not configured, returning empty recordings array")
        return []
      }

      let query = supabase
        .from("recordings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) {
        console.error("Database error getting recordings by user:", error)
        throw new Error(`Failed to get recordings by user: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error("Error in getRecordingsByUser:", error)
      return []
    }
  }

  async getRecordingsByStatus(status: Recording["status"], options?: { limit?: number; language?: string }): Promise<Recording[]> {
    try {
      // If limit is specified, use it directly (for performance when only need a few records)
      if (options?.limit) {
        let query = supabase
          .from("recordings")
          .select("*")
          .eq("status", status)
        
        // Filter by language at database level if specified
        if (options?.language) {
          query = query.eq("language", options.language)
        }
        
        const { data, error } = await query
          .order("created_at", { ascending: false })
          .limit(options.limit)

        if (error) {
          console.error("Database error getting recordings by status:", error)
          throw new Error(`Failed to get recordings by status: ${error.message}`)
        }

        return data || []
      }

      // FIXED: Use pagination to fetch ALL recordings by status (not limited to 1000 rows)
      console.log(`🔄 Fetching all ${status} recordings with pagination...`)
      let allRecordings: Recording[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from("recordings")
          .select("*")
          .eq("status", status)
        
        // Filter by language at database level if specified
        if (options?.language) {
          query = query.eq("language", options.language)
        }
        
        const { data: recordingsBatch, error: batchError } = await query
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (batchError) {
          console.error("Database error getting recordings by status batch:", batchError)
          throw new Error(`Failed to get recordings by status: ${batchError.message}`)
        }

        if (!recordingsBatch || recordingsBatch.length === 0) {
          hasMore = false
        } else {
          allRecordings = [...allRecordings, ...recordingsBatch]
          hasMore = recordingsBatch.length === pageSize
          page++
        }
      }

      return allRecordings
    } catch (error) {
      console.error("Error in getRecordingsByStatus:", error)
      return []
    }
  }

  async getRecordingsByStatusExcludingUser(
    status: Recording["status"], 
    userId: string,
    options?: { limit?: number; language?: string }
  ): Promise<Recording[]> {
    // Use optimized batch-fetch method directly (more reliable than JOIN)
    return await this.getRecordingsByStatusExcludingUserLegacy(status, userId, options)
  }

  // Helper: Map luo table records to LuoRecording format
  // luo table columns: id, status, language, sentence, actualSentence, translatedText, audio_url, user_id, duration, etc.
  private async mapLuoRecordings(data: any[]): Promise<LuoRecording[]> {
    // Fetch user dialects for all unique user_ids in batch
    const userIds = [...new Set(data.map(rec => rec.user_id).filter(Boolean))]
    const userDialects: Record<string, string> = {}
    
    if (userIds.length > 0) {
      try {
        const { data: users, error } = await supabase
          .from("users")
          .select("id, accent_dialect, language_dialect")
          .in("id", userIds)
        
        if (!error && users) {
          users.forEach(user => {
            // Prefer accent_dialect, fallback to language_dialect
            const dialect = user.accent_dialect || user.language_dialect
            if (dialect) {
              userDialects[user.id] = dialect
            }
          })
        }
      } catch (error) {
        console.warn("⚠️ Could not fetch user dialects:", error)
      }
    }
    
    const mapped = data.map((rec: any) => {
      const mapped: any = {
        ...rec,
        // Map to sentence field - prioritize cleaned_transcript first, then fallback to others
        sentence: rec.cleaned_transcript || rec.actualSentence || rec.sentence || rec.translatedText || rec.audio_transcript || '', 
        // Ensure we have the required fields for Recording type
        user_id: rec.user_id || '', // luo table has user_id as text
        duration: rec.duration || 0,
        status: rec.status || 'pending', // Default to pending if null
        // Get dialect from luo table if available, otherwise from user
        dialect: rec.dialect || rec.accent_dialect || rec.language_dialect || userDialects[rec.user_id] || null,
      }
      // Handle audio_url - luo table has audio_url and mediaPathId columns
      // Prefer audio_url, fallback to mediaPathId
      let audioPath = rec.audio_url || rec.mediaPathId || ''
      
      if (audioPath) {
        // If it's already a full URL, use it as-is
        if (audioPath.startsWith('http://') || audioPath.startsWith('https://') || audioPath.startsWith('data:')) {
          mapped.audio_url = audioPath
          console.log(`🔊 Using existing full URL: ${audioPath.substring(0, 100)}...`)
        } else {
          // It's a filename - construct full URL to luo bucket
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          if (supabaseUrl) {
            // Clean filename (remove trailing underscores/spaces)
            let filename = audioPath.trim().replace(/[_\s]+$/, '')
            
            // Check if filename already has an extension
            const hasExtension = filename.match(/\.(wav|mp3|ogg|webm|m4a|flac|aac|opus)$/i)
            
            if (!hasExtension) {
              // No extension found - store original for potential retry with different extensions
              mapped._originalFilename = filename
              // Try .wav first (most common for this project based on user's mention)
              filename = `${filename}.wav`
              console.log(`🔊 No extension found, adding .wav: ${filename}`)
              // Store alternative extensions to try if .wav fails
              mapped._alternativeExtensions = ['.mp3', '.ogg', '.webm', '.m4a']
            } else {
              console.log(`🔊 Filename has extension: ${filename}`)
            }
            
            mapped.audio_url = `${supabaseUrl}/storage/v1/object/public/luo/${encodeURIComponent(filename)}`
            console.log(`🔊 Constructed audio URL: ${mapped.audio_url}`)
          } else {
            mapped.audio_url = audioPath
            console.warn(`⚠️ No Supabase URL configured, using raw path: ${audioPath}`)
          }
        }
      } else {
        console.warn(`⚠️ No audio_url or mediaPathId found for recording ${rec.id}`)
      }
      return mapped as LuoRecording
    })
    
    console.log(`📦 Mapped ${mapped.length} luo recordings. Sample:`, mapped[0] ? {
      id: mapped[0].id,
      sentence: mapped[0].sentence?.substring(0, 50),
      audio_url: mapped[0].audio_url?.substring(0, 100),
      status: mapped[0].status,
      language: mapped[0].language
    } : 'none')
    
    return mapped
  }

  // Helper: Inspect luo table structure to understand actual schema
  // Based on actual luo table: id, mediaPathId, recorder_uuid, domain, translatedText, 
  // actualSentence, duration, languageId, language, promptType, audio_transcript, review,
  // type, cleaned_transcript, word_count, ratio, split, status, sentence, audio_url, 
  // user_id, created_at, updated_at
  private async inspectLuoTableStructure(): Promise<{
    hasStatusColumn: boolean
    statusValues: string[]
    hasLanguageColumn: boolean
    languageValues: string[]
    hasSentenceColumn: boolean
    hasActualSentenceColumn: boolean
    hasTranslatedTextColumn: boolean
    hasAudioUrlColumn: boolean
    sampleRow: any
  }> {
    try {
      // Get a sample row to understand structure
      const { data: sample, error } = await supabase
        .from("luo")
        .select("*")
        .limit(1)
      
      if (error || !sample || sample.length === 0) {
        console.warn("⚠️ Could not inspect luo table structure:", error)
        return {
          hasStatusColumn: false,
          statusValues: [],
          hasLanguageColumn: false,
          languageValues: [],
        hasSentenceColumn: false,
        hasActualSentenceColumn: false,
        hasTranslatedTextColumn: false,
        hasAudioUrlColumn: false,
        sampleRow: null
        }
      }
      
      const row = sample[0]
      const columns = Object.keys(row)
      
      // Check what status values exist
      const { data: statusData } = await supabase
        .from("luo")
        .select("status")
        .limit(100)
      
      const statusValues = statusData ? [...new Set(statusData.map(r => r?.status).filter(Boolean))] : []
      
      // Check language values
      const { data: langData } = await supabase
        .from("luo")
        .select("language")
        .limit(100)
      
      const languageValues = langData ? [...new Set(langData.map(r => r?.language).filter(Boolean))] : []
      
      return {
        hasStatusColumn: columns.includes('status'),
        statusValues: statusValues as string[],
        hasLanguageColumn: columns.includes('language'),
        languageValues: languageValues as string[],
        hasSentenceColumn: columns.includes('sentence'),
        hasActualSentenceColumn: columns.includes('actualSentence'),
        hasTranslatedTextColumn: columns.includes('translatedText'),
        hasAudioUrlColumn: columns.includes('audio_url'),
        sampleRow: row
      }
    } catch (error) {
      console.error("Error inspecting luo table:", error)
      return {
        hasStatusColumn: false,
        statusValues: [],
        hasLanguageColumn: false,
        languageValues: [],
        hasSentenceColumn: false,
        hasActualSentenceColumn: false,
        hasTranslatedTextColumn: false,
        hasAudioUrlColumn: false,
        sampleRow: null
      }
    }
  }

  // NEW: Get recordings from luo table by status (for direct CSV imports)
  async getLuoRecordingsByStatus(
    status: "pending" | "approved", 
    options?: { limit?: number; language?: string }
  ): Promise<LuoRecording[]> {
    try {
      console.log(`🔍 Querying luo table: status="${status}", language="${options?.language || 'all'}", limit=${options?.limit || 'none'}`)
      
      // First, inspect the table structure to understand what we're working with
      const structure = await this.inspectLuoTableStructure()
      console.log(`📋 Luo table structure:`, {
        hasStatus: structure.hasStatusColumn,
        statusValues: structure.statusValues.slice(0, 5),
        hasLanguage: structure.hasLanguageColumn,
        hasSentence: structure.hasSentenceColumn,
        hasTranscription: structure.hasTranslatedTextColumn,
        hasAudioUrl: structure.hasAudioUrlColumn,
        sampleColumns: structure.sampleRow ? Object.keys(structure.sampleRow) : []
      })
      
      // If limit is specified, use it directly (for performance when only need a few records)
      if (options?.limit) {
        let query = supabase
          .from("luo")
          .select("*")
        
        // Simple direct query - luo table has status column with default 'pending'
        query = query.eq("status", "pending")
        console.log(`✅ Querying luo table for status='pending'`)
        
        // Filter by language at database level if specified
        if (options?.language) {
          query = query.ilike("language", `%${options.language}%`)
          console.log(`🌍 Filtering by language: "${options.language}"`)
        }
        
        const { data, error } = await query
          .order("created_at", { ascending: false })
          .limit(options.limit)

        if (error) {
          console.error("❌ Database error:", error)
          // Try without filters to check if table is accessible
          const { data: testData, error: testError } = await supabase
            .from("luo")
            .select("id, status, language")
            .limit(5)
          
          if (testError) {
            console.error("❌ Table access error:", testError)
            console.error("⚠️ This is likely an RLS (Row Level Security) issue!")
            console.error("💡 Check Supabase dashboard > Authentication > Policies for 'luo' table")
          } else {
            console.log(`📋 Test query successful. Found ${testData?.length || 0} rows`)
            if (testData && testData.length > 0) {
              console.log(`📋 Status values found:`, [...new Set(testData.map(r => r.status))])
            }
          }
          throw new Error(`Failed to get luo recordings: ${error.message}`)
        }

        console.log(`✅ Found ${data?.length || 0} luo recordings`)
        
        // If no results, debug by checking what's actually in the table
        if (!data || data.length === 0) {
          console.warn(`⚠️ No results. Checking table contents...`)
          const { data: allData, error: allError } = await supabase
            .from("luo")
            .select("id, status, language")
            .limit(10)
          
          if (!allError && allData) {
            console.log(`📋 Total rows accessible: ${allData.length}`)
            if (allData.length > 0) {
              const statuses = [...new Set(allData.map(r => r.status))]
              console.log(`📋 Status values in table:`, statuses)
              console.log(`📋 Sample row:`, allData[0])
            } else {
              console.warn(`⚠️ Table is accessible but has 0 rows, or RLS is blocking all rows`)
            }
          }
        }

        return await this.mapLuoRecordings(data || [])
      }

      // Use pagination to fetch ALL recordings by status
      console.log(`🔄 Fetching all ${status} luo recordings with pagination...`)
      
      // Reuse structure info from earlier inspection (or inspect again if not available)
      const structureForPagination = structure || await this.inspectLuoTableStructure()
      
      let allRecordings: LuoRecording[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from("luo")
          .select("*")
        
        // Handle status filtering - simple direct query
        query = query.eq("status", status === "pending" ? "pending" : status)
        
        // Filter by language at database level if specified
        // Use case-insensitive matching
        if (options?.language) {
          query = query.ilike("language", `%${options.language}%`)
        }
        
        const { data: recordingsBatch, error: batchError } = await query
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (batchError) {
          console.error("Database error getting luo recordings by status batch:", batchError)
          throw new Error(`Failed to get luo recordings by status: ${batchError.message}`)
        }

        if (!recordingsBatch || recordingsBatch.length === 0) {
          hasMore = false
        } else {
          // Map luo table columns to Recording format
          const mappedBatch = await this.mapLuoRecordings(recordingsBatch)
          allRecordings = [...allRecordings, ...mappedBatch]
          hasMore = recordingsBatch.length === pageSize
          page++
        }
      }

      return allRecordings
    } catch (error) {
      console.error("Error in getLuoRecordingsByStatus:", error)
      return []
    }
  }

  // NEW: Get luo recordings excluding those already reviewed by the reviewer
  // Filters by validator's selected language
  async getLuoRecordingsExcludingReviewedByUser(
    status: "pending" | "approved", 
    reviewerId: string,
    options?: { limit?: number; language?: string }
  ): Promise<LuoRecording[]> {
    try {
      if (!reviewerId || !isValidUUID(reviewerId)) {
        return await this.getLuoRecordingsByStatus(status, options)
      }

      // Get reviewer's language from their profile
      let reviewerLanguage: string | null = null
      if (options?.language) {
        reviewerLanguage = options.language
      } else {
        try {
          const reviewer = await this.getUserById(reviewerId)
          if (reviewer && reviewer.languages && reviewer.languages.length > 0) {
            reviewerLanguage = reviewer.languages[0]
          }
        } catch (userError) {
          console.warn("Could not fetch reviewer language, will show all languages:", userError)
        }
      }

      // First, get recordings the reviewer has already reviewed
      // Note: reviews table references recordings.id, so we need to check if luo.id matches
      let reviews: Review[] = []
      try {
        reviews = await this.getReviewsByReviewer(reviewerId)
      } catch (reviewError) {
        console.error("🚨 CRITICAL: Failed to fetch reviewer's reviews. Cannot prevent duplicate reviews!", reviewError)
        throw new Error("Failed to load reviewer data. Please try again. This prevents duplicate reviews.")
      }
      
      const reviewedRecordingIds = new Set(reviews.map(r => r.recording_id))

      // Fetch pending recordings from luo table
      const fetchOptions = { ...options, language: reviewerLanguage || undefined }
      let allRecordings = await this.getLuoRecordingsByStatus(status, fetchOptions)

      // If language filtering returns no results, try without language filter (fallback)
      if (reviewerLanguage && allRecordings.length === 0) {
        console.warn(`⚠️ No recordings found with language "${reviewerLanguage}", falling back to all languages`)
        const fallbackOptions = { ...options, language: undefined }
        allRecordings = await this.getLuoRecordingsByStatus(status, fallbackOptions)
      }

      // Language filtering is done at database level, but log for debugging
      if (reviewerLanguage) {
        console.log(`🌍 Filtered luo recordings by language "${reviewerLanguage}" at database level: ${allRecordings.length} recordings match`)
      }

      // Filter out recordings the reviewer has already reviewed
      const availableRecordings = allRecordings.filter(
        recording => !reviewedRecordingIds.has(recording.id)
      )

      console.log(`📊 Reviewer ${reviewerId} (${reviewerLanguage || 'all languages'}): ${allRecordings.length} pending luo recordings, ${reviewedRecordingIds.size} already reviewed, ${availableRecordings.length} available`)
      
      return availableRecordings
    } catch (error) {
      console.error("Error in getLuoRecordingsExcludingReviewedByUser:", error)
      throw error
    }
  }

  // FIXED: Get pending recordings excluding those already reviewed by the reviewer
  // NEW: Also filters by validator's selected language
  async getRecordingsByStatusExcludingReviewedByUser(
    status: Recording["status"], 
    reviewerId: string,
    options?: { limit?: number; language?: string }
  ): Promise<Recording[]> {
    try {
      if (!reviewerId || !isValidUUID(reviewerId)) {
        return await this.getRecordingsByStatus(status, options)
      }

      // Get reviewer's language from their profile
      let reviewerLanguage: string | null = null
      if (options?.language) {
        reviewerLanguage = options.language
      } else {
        try {
          const reviewer = await this.getUserById(reviewerId)
          if (reviewer && reviewer.languages && reviewer.languages.length > 0) {
            reviewerLanguage = reviewer.languages[0]
          }
        } catch (userError) {
          console.warn("Could not fetch reviewer language, will show all languages:", userError)
        }
      }

      // First, get recordings the reviewer has already reviewed
      let reviews: Review[] = []
      try {
        reviews = await this.getReviewsByReviewer(reviewerId)
      } catch (reviewError) {
        console.error("🚨 CRITICAL: Failed to fetch reviewer's reviews. Cannot prevent duplicate reviews!", reviewError)
        // CRITICAL: If we can't get the reviews, we MUST fail rather than silently allow duplicates
        throw new Error("Failed to load reviewer data. Please try again. This prevents duplicate reviews.")
      }
      
      const reviewedRecordingIds = new Set(reviews.map(r => r.recording_id))

      // Fetch pending recordings excluding user's own recordings
      // Language filtering is now done at database level for better performance
      const fetchOptions = { ...options, language: reviewerLanguage || undefined }
      let allRecordings = await this.getRecordingsByStatusExcludingUser(status, reviewerId, fetchOptions)

      // Language filtering is now done at database level, but log for debugging
      if (reviewerLanguage) {
        console.log(`🌍 Filtered by language "${reviewerLanguage}" at database level: ${allRecordings.length} recordings match`)
      }

      // Filter out recordings the reviewer has already reviewed
      const availableRecordings = allRecordings.filter(
        recording => !reviewedRecordingIds.has(recording.id)
      )

      console.log(`📊 Reviewer ${reviewerId} (${reviewerLanguage || 'all languages'}): ${allRecordings.length} pending recordings, ${reviewedRecordingIds.size} already reviewed, ${availableRecordings.length} available`)
      
      return availableRecordings
    } catch (error) {
      console.error("Error in getRecordingsByStatusExcludingReviewedByUser:", error)
      // Don't fall back to weaker filtering - this could cause duplicate reviews!
      // Propagate the error so the caller can handle it appropriately
      throw error
    }
  }

  // Legacy method as fallback (keeps old N+1 query behavior but with limit support)
  // NEW: Supports language filtering at database level
  async getRecordingsByStatusExcludingUserLegacy(
    status: Recording["status"], 
    userId: string,
    options?: { limit?: number; language?: string }
  ): Promise<Recording[]> {
    try {
      if (!userId || !isValidUUID(userId)) {
        return await this.getRecordingsByStatus(status, options)
      }

      const user = await this.getUserById(userId)
      if (!user) {
        return await this.getRecordingsByStatus(status, options)
      }

      // If limit is specified, use optimized path
      if (options?.limit) {
        let query = supabase
          .from("recordings")
          .select("*")
          .eq("status", status)
        
        // Filter by language at database level if specified
        if (options?.language) {
          query = query.eq("language", options.language)
          console.log(`🌍 Filtering by language "${options.language}" at database level`)
        }
        
        const { data: allRecordings, error } = await query
          .order("created_at", { ascending: false })
          .limit(options.limit * 3) // Fetch 3x to account for filtering

        if (error) {
          console.error("Database error getting recordings by status:", error)
          throw new Error(`Failed to get recordings by status: ${error.message}`)
        }

        if (!allRecordings || allRecordings.length === 0) {
          return []
        }

        // OPTIMIZED: Batch fetch all unique user IDs in a single query to avoid N+1 queries
        const uniqueUserIds = [...new Set(allRecordings.map(r => r.user_id))]
        const usersMap = new Map<string, User | null>()
        
        if (uniqueUserIds.length > 0) {
          // Fetch all users in one query instead of N queries
          const { data: users, error: usersError } = await supabase
            .from("users")
            .select("id, email")
            .in("id", uniqueUserIds)
          
          if (!usersError && users) {
            users.forEach(u => usersMap.set(u.id, u as User))
          } else {
            // Fallback to individual queries if batch fails
            await Promise.all(
              uniqueUserIds.map(async (uid) => {
                const u = await this.getUserById(uid)
                if (u) usersMap.set(uid, u)
              })
            )
          }
        }

        // Filter recordings using cached user data
        let filteredRecordings = allRecordings
          .filter(recording => {
            const recordingUser = usersMap.get(recording.user_id)
            return recordingUser && recordingUser.email !== user.email
          })

        return filteredRecordings.slice(0, options.limit)
      }

      // FIXED: Use pagination to fetch ALL recordings when no limit specified (not limited to 1000 rows)
      console.log(`🔄 Fetching all ${status} recordings excluding user ${userId} with pagination${status === "pending" ? " (using view)" : ""}...`)
      let allFilteredRecordings: Recording[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true
      const usersMap = new Map<string, User | null>()

      while (hasMore) {
        let query = supabase
          .from("recordings")
          .select("*")
          .eq("status", status)
        
        // Filter by language at database level if specified
        if (options?.language) {
          query = query.eq("language", options.language)
        }
        
        const { data: recordingsBatch, error: batchError } = await query
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (batchError) {
          console.error("Database error getting recordings by status batch:", batchError)
          throw new Error(`Failed to get recordings by status: ${batchError.message}`)
        }

        if (!recordingsBatch || recordingsBatch.length === 0) {
          hasMore = false
          break
        }

        // Batch fetch user emails for this batch if not already cached
        const batchUserIds = [...new Set(recordingsBatch.map(r => r.user_id))].filter(id => !usersMap.has(id))
        if (batchUserIds.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from("users")
            .select("id, email")
            .in("id", batchUserIds)
          
          if (!usersError && users) {
            users.forEach(u => usersMap.set(u.id, u as User))
          }
        }

        // Filter recordings using cached user data
        const filteredBatch = recordingsBatch.filter(recording => {
          const recordingUser = usersMap.get(recording.user_id)
          return recordingUser && recordingUser.email !== user.email
        })
        
        allFilteredRecordings = [...allFilteredRecordings, ...filteredBatch]
        hasMore = recordingsBatch.length === pageSize
        page++
      }

      console.log(`✅ Fetched ${allFilteredRecordings.length} total ${status} recordings excluding user ${userId}`)
      return allFilteredRecordings
    } catch (error) {
      console.error("Error in getRecordingsByStatusExcludingUserLegacy:", error)
      return []
    }
  }

  async getRecordingsByReviewer(reviewerId: string): Promise<Recording[]> {
    try {
      if (!reviewerId || !isValidUUID(reviewerId)) {
        return []
      }

      // FIXED: Use pagination to fetch ALL recordings by reviewer (not limited to 1000 rows)
      let allRecordings: Recording[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: recordingsBatch, error: batchError } = await supabase
          .from("recordings")
          .select("*")
          .eq("reviewed_by", reviewerId)
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (batchError) {
          console.error("Database error getting recordings by reviewer batch:", batchError)
          throw new Error(`Failed to get recordings by reviewer: ${batchError.message}`)
        }

        if (!recordingsBatch || recordingsBatch.length === 0) {
          hasMore = false
        } else {
          allRecordings = [...allRecordings, ...recordingsBatch]
          hasMore = recordingsBatch.length === pageSize
          page++
        }
      }

      return allRecordings
    } catch (error) {
      console.error("Error in getRecordingsByReviewer:", error)
      return []
    }
  }

  async updateRecording(
    id: string,
    updates: Database["public"]["Tables"]["recordings"]["Update"],
  ): Promise<Recording | null> {
    try {
      if (!id || !isValidUUID(id)) {
        throw new Error("Invalid recording ID provided")
      }

      const { data, error } = await supabase
        .from("recordings")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("Database error updating recording:", error)
        throw new Error(`Failed to update recording: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error("Error in updateRecording:", error)
      throw error
    }
  }

  // NEW: Update recording in luo table
  async updateLuoRecording(
    id: string,
    updates: Partial<LuoRecording>,
  ): Promise<LuoRecording | null> {
    try {
      if (!id || !id.trim()) {
        throw new Error("Invalid recording ID provided")
      }

      const { data, error } = await supabase
        .from("luo")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("Database error updating luo recording:", error)
        throw new Error(`Failed to update luo recording: ${error.message}`)
      }

      // Map the result to LuoRecording format
      if (data) {
        const mapped = await this.mapLuoRecordings([data])
        return mapped[0] || null
      }

      return null
    } catch (error) {
      console.error("Error in updateLuoRecording:", error)
      throw error
    }
  }

  async getAllRecordings(options?: { limit?: number }): Promise<Recording[]> {
    try {
      // If limit is specified, use it directly (for performance when only need a few records)
      if (options?.limit) {
        const { data, error } = await supabase
          .from("recordings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(options.limit)

        if (error) {
          console.error("Database error getting all recordings:", error)
          throw new Error(`Failed to get all recordings: ${error.message}`)
        }

        return data || []
      }

      // FIXED: Use pagination to fetch ALL recordings (not limited to 1000 rows)
      console.log("🔄 Fetching all recordings with pagination...")
      let allRecordings: Recording[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: recordingsBatch, error: batchError } = await supabase
          .from("recordings")
          .select("*")
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (batchError) {
          console.error("Database error getting recordings batch:", batchError)
          throw new Error(`Failed to get all recordings: ${batchError.message}`)
        }

        if (!recordingsBatch || recordingsBatch.length === 0) {
          hasMore = false
        } else {
          allRecordings = [...allRecordings, ...recordingsBatch]
          hasMore = recordingsBatch.length === pageSize
          page++
        }
      }

      console.log(`✅ Fetched ${allRecordings.length} total recordings`)
      return allRecordings
    } catch (error) {
      console.error("Error in getAllRecordings:", error)
      return []
    }
  }

  // Review operations
  async createReview(reviewData: Database["public"]["Tables"]["reviews"]["Insert"]): Promise<Review> {
    try {
      if (!reviewData.recording_id || !isValidUUID(reviewData.recording_id)) {
        throw new Error("Invalid recording ID provided for review")
      }

      if (!reviewData.reviewer_id || !isValidUUID(reviewData.reviewer_id)) {
        throw new Error("Invalid reviewer ID provided for review")
      }

      // ENHANCED: Use a single query to check both recording status and existing reviews
      // This reduces race conditions by checking both conditions atomically
      const { data: recording, error: recordingError } = await supabase
        .from("recordings")
        .select("id, user_id, status")
        .eq("id", reviewData.recording_id)
        .single()

      if (recordingError || !recording) {
        throw new Error("Recording not found")
      }

      // FIXED: Prevent reviewing recordings that have already been reviewed
      if (recording.status !== "pending") {
        throw new Error(`This recording has already been ${recording.status}. Only pending recordings can be reviewed.`)
      }

      // ENHANCED: Check for existing reviews using a direct count query (more efficient)
      const { count: existingReviewCount, error: countError } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("recording_id", reviewData.recording_id)

      if (countError) {
        console.error("Error checking existing reviews:", countError)
        throw new Error(`Failed to check for existing reviews: ${countError.message}`)
      }

      if (existingReviewCount && existingReviewCount > 0) {
        throw new Error("This recording has already been reviewed. Each recording can only be reviewed once.")
      }

      // Prevent users from reviewing their own recordings (check by EMAIL, not just user_id)
      // Users can have both contributor and reviewer accounts with same email
      const recordingUser = await this.getUserById(recording.user_id)
      const reviewer = await this.getUserById(reviewData.reviewer_id)
      
      if (recordingUser && reviewer && recordingUser.email === reviewer.email) {
        throw new Error("You cannot review your own recordings")
      }

      // ENHANCED: Insert review and update recording status in a transaction-like approach
      // First insert the review
      const { data, error } = await supabase
        .from("reviews")
        .insert({
          ...reviewData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Database error creating review:", error)
        // Check if error is due to duplicate (shouldn't happen with our checks, but be safe)
        if (error.code === "23505" || error.message.includes("duplicate") || error.message.includes("unique")) {
          throw new Error("This recording has already been reviewed. Each recording can only be reviewed once.")
        }
        throw new Error(`Failed to create review: ${error.message}`)
      }

      if (!data) {
        throw new Error("No data returned from review creation")
      }

      // Update recording status
      await this.updateRecording(reviewData.recording_id, {
        status: reviewData.decision,
        reviewed_by: reviewData.reviewer_id,
        reviewed_at: new Date().toISOString(),
      })

      return data
    } catch (error) {
      console.error("Error in createReview:", error)
      throw error
    }
  }

  // NEW: Create review for luo table recordings
  async createLuoReview(reviewData: {
    recording_id: string
    reviewer_id: string
    decision: "approved" | "rejected"
    notes?: string | null
    confidence: number
    time_spent: number
  }): Promise<any> {
    try {
      if (!reviewData.recording_id || !reviewData.recording_id.trim()) {
        throw new Error("Invalid recording ID provided for review")
      }

      if (!reviewData.reviewer_id || !isValidUUID(reviewData.reviewer_id)) {
        throw new Error("Invalid reviewer ID provided for review")
      }

      // Check if recording exists in luo table
      const { data: recording, error: recordingError } = await supabase
        .from("luo")
        .select("id, status")
        .eq("id", reviewData.recording_id)
        .single()

      if (recordingError || !recording) {
        console.error("❌ Recording not found in luo table:", recordingError)
        throw new Error("Recording not found in luo table")
      }

      // Check for existing reviews
      const { count: existingReviewCount, error: countError } = await supabase
        .from("luo_reviews")
        .select("*", { count: "exact", head: true })
        .eq("recording_id", reviewData.recording_id)
        .eq("reviewer_id", reviewData.reviewer_id)

      if (countError) {
        console.error("Error checking existing luo reviews:", countError)
        throw new Error(`Failed to check for existing reviews: ${countError.message}`)
      }

      if (existingReviewCount && existingReviewCount > 0) {
        throw new Error("This recording has already been reviewed by you. Each recording can only be reviewed once per reviewer.")
      }

      // Insert review into luo_reviews table
      const { data, error } = await supabase
        .from("luo_reviews")
        .insert({
          recording_id: reviewData.recording_id,
          reviewer_id: reviewData.reviewer_id,
          decision: reviewData.decision,
          notes: reviewData.notes || null,
          confidence: reviewData.confidence,
          time_spent: reviewData.time_spent,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Database error creating luo review:", error)
        // Check if error is due to duplicate (unique constraint violation)
        if (error.code === "23505" || error.message.includes("duplicate") || error.message.includes("unique") || error.message.includes("unique_luo_reviewer_recording")) {
          throw new Error("This recording has already been reviewed by you. Each recording can only be reviewed once per reviewer.")
        }
        throw new Error(`Failed to create review: ${error.message}`)
      }

      if (!data) {
        throw new Error("No data returned from review creation")
      }

      console.log("✅ Luo review created successfully:", data.id)
      return data
    } catch (error) {
      console.error("Error in createLuoReview:", error)
      throw error
    }
  }

  async getReviewsByReviewer(reviewerId: string, options?: { limit?: number }): Promise<Review[]> {
    try {
      if (!reviewerId || !isValidUUID(reviewerId)) {
        return []
      }

      // If limit is specified, use it directly (for performance when only need a few records)
      if (options?.limit) {
        const { data, error } = await supabase
          .from("reviews")
          .select("*")
          .eq("reviewer_id", reviewerId)
          .order("created_at", { ascending: false })
          .limit(options.limit)

        if (error) {
          console.error("Database error getting reviews by reviewer:", error)
          throw new Error(`Failed to get reviews by reviewer: ${error.message}`)
        }

        return data || []
      }

      // FIXED: Use pagination to fetch ALL reviews by reviewer (not limited to 1000 rows)
      console.log(`🔄 Fetching all reviews for reviewer ${reviewerId} with pagination...`)
      let allReviews: Review[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: reviewsBatch, error: batchError } = await supabase
          .from("reviews")
          .select("*")
          .eq("reviewer_id", reviewerId)
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (batchError) {
          console.error("Database error getting reviews by reviewer batch:", batchError)
          throw new Error(`Failed to get reviews by reviewer: ${batchError.message}`)
        }

        if (!reviewsBatch || reviewsBatch.length === 0) {
          hasMore = false
        } else {
          allReviews = [...allReviews, ...reviewsBatch]
          hasMore = reviewsBatch.length === pageSize
          page++
        }
      }

      console.log(`✅ Fetched ${allReviews.length} total reviews for reviewer ${reviewerId}`)
      return allReviews
    } catch (error) {
      console.error("Error in getReviewsByReviewer:", error)
      // CRITICAL: Don't return empty array on error - this would break duplicate prevention
      throw error
    }
  }

  async getReviewsByRecording(recordingId: string): Promise<Review[]> {
    try {
      if (!recordingId || !isValidUUID(recordingId)) {
        return []
      }

      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("recording_id", recordingId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Database error getting reviews by recording:", error)
        throw new Error(`Failed to get reviews by recording: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error("Error in getReviewsByRecording:", error)
      return []
    }
  }

  async getAllReviews(options?: { limit?: number }): Promise<Review[]> {
    try {
      // If limit is specified, use it directly (for performance when only need a few records)
      if (options?.limit) {
        const { data, error } = await supabase
          .from("reviews")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(options.limit)

        if (error) {
          console.error("Database error getting all reviews:", error)
          throw new Error(`Failed to get all reviews: ${error.message}`)
        }

        return data || []
      }

      // FIXED: Use pagination to fetch ALL reviews (not limited to 1000 rows)
      console.log("🔄 Fetching all reviews with pagination...")
      let allReviews: Review[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: reviewsBatch, error: batchError } = await supabase
          .from("reviews")
          .select("*")
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (batchError) {
          console.error("Database error getting reviews batch:", batchError)
          throw new Error(`Failed to get all reviews: ${batchError.message}`)
        }

        if (!reviewsBatch || reviewsBatch.length === 0) {
          hasMore = false
        } else {
          allReviews = [...allReviews, ...reviewsBatch]
          hasMore = reviewsBatch.length === pageSize
          page++
        }
      }

      console.log(`✅ Fetched ${allReviews.length} total reviews`)
      return allReviews
    } catch (error) {
      console.error("Error in getAllReviews:", error)
      return []
    }
  }

  // Statistics operations - OPTIMIZED with SQL aggregations
  async getSystemStats() {
    try {
      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn("Supabase not configured, returning default stats")
        return this.getDefaultSystemStats()
      }

      // FIXED: Use COUNT queries for accurate counts (not limited by PostgREST 1000 row limit)
      console.log("📊 Calculating system stats with accurate counts...")
      
      // Get user counts using COUNT queries
      const { count: totalUsers, error: totalUsersError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
      
      const { count: contributors, error: contributorsError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "contributor")
      
      const { count: reviewers, error: reviewersError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "reviewer")
        .eq("status", "active")
      
      const { count: pendingReviewers, error: pendingReviewersError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "reviewer")
        .eq("status", "pending")
      
      const { count: activeUsers, error: activeUsersError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)

      // Get recording counts using COUNT queries (FIXED: No longer limited to 1000)
      const { count: totalRecordings, error: totalRecordingsError } = await supabase
        .from("recordings")
        .select("*", { count: "exact", head: true })
      
      // Count pending recordings
      const { count: pendingRecordings, error: pendingRecordingsError } = await supabase
        .from("recordings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
      
      const { count: validatedRecordings, error: validatedRecordingsError } = await supabase
        .from("recordings")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved")
      
      // Count edited transcriptions (recordings where transcription_edited = true)
      const { count: editedRecordings, error: editedRecordingsError } = await supabase
        .from("recordings")
        .select("*", { count: "exact", head: true })
        .eq("transcription_edited", true)

      // Check for count errors
      if (totalUsersError || contributorsError || reviewersError || pendingReviewersError || 
          activeUsersError || totalRecordingsError || pendingRecordingsError || 
          validatedRecordingsError || editedRecordingsError) {
        console.error("Database count errors:", { 
          totalUsersError, contributorsError, reviewersError, pendingReviewersError,
          activeUsersError, totalRecordingsError, pendingRecordingsError,
          validatedRecordingsError, editedRecordingsError
        })
        throw new Error("Failed to get system stats counts")
      }

      // Count actual validations from reviews table
      const { count: totalValidations, error: totalValidationsError } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
      
      // All validations result in approval (no rejection)
      const uniqueRecordingsValidated = (validatedRecordings || 0)
      
      let totalValidationsCount: number
      if (totalValidationsError) {
        console.error("Error counting validations:", totalValidationsError)
        // Fallback to calculation if count fails
        totalValidationsCount = uniqueRecordingsValidated
        console.warn("Using fallback calculation for totalValidations:", totalValidationsCount)
      } else {
        // Use actual count from reviews table
        totalValidationsCount = totalValidations || 0
        
        // Log discrepancy if found (indicates duplicate validations)
        if (totalValidationsCount !== uniqueRecordingsValidated) {
          console.warn(`⚠️ Validation count discrepancy detected:`)
          console.warn(`   Total validation records: ${totalValidationsCount}`)
          console.warn(`   Unique recordings validated: ${uniqueRecordingsValidated}`)
          console.warn(`   Difference (duplicates): ${totalValidationsCount - uniqueRecordingsValidated}`)
          console.warn(`   This indicates duplicate validations exist in the database.`)
          console.warn(`   Run the cleanup script to remove duplicates.`)
        }
      }

      // FIXED: Use pagination to fetch ALL recordings for duration calculations (not limited to 1000)
      console.log("🔄 Fetching all recordings for duration calculations (pagination)...")
      let allRecordings: Array<{ status: string; duration: number | string }> = []
      let recordingsPage = 0
      const recordingsPageSize = 1000
      let hasMoreRecordings = true

      while (hasMoreRecordings) {
        const { data: recordingsBatch, error: recordingsBatchError } = await supabase
          .from("recordings")
          .select("status, duration")
          .range(recordingsPage * recordingsPageSize, (recordingsPage + 1) * recordingsPageSize - 1)
        
        if (recordingsBatchError) {
          console.error("Error fetching recordings batch:", recordingsBatchError)
          throw new Error("Failed to fetch recordings for duration calculations")
        }
        
        if (!recordingsBatch || recordingsBatch.length === 0) {
          hasMoreRecordings = false
        } else {
          allRecordings = [...allRecordings, ...recordingsBatch]
          hasMoreRecordings = recordingsBatch.length === recordingsPageSize
          recordingsPage++
        }
      }
      console.log(`✅ Fetched ${allRecordings.length} recordings for duration calculations`)

      // FIXED: Use pagination to fetch ALL reviews for time calculations (not limited to 1000)
      console.log("🔄 Fetching all reviews for time calculations (pagination)...")
      let allReviews: Array<{ time_spent: number }> = []
      let reviewsPage = 0
      const reviewsPageSize = 1000
      let hasMoreReviews = true

      while (hasMoreReviews) {
        const { data: reviewsBatch, error: reviewsBatchError } = await supabase
          .from("reviews")
          .select("time_spent")
          .range(reviewsPage * reviewsPageSize, (reviewsPage + 1) * reviewsPageSize - 1)
        
        if (reviewsBatchError) {
          console.error("Error fetching reviews batch:", reviewsBatchError)
          throw new Error("Failed to fetch reviews for time calculations")
        }
        
        if (!reviewsBatch || reviewsBatch.length === 0) {
          hasMoreReviews = false
        } else {
          allReviews = [...allReviews, ...reviewsBatch]
          hasMoreReviews = reviewsBatch.length === reviewsPageSize
          reviewsPage++
        }
      }
      console.log(`✅ Fetched ${allReviews.length} reviews for time calculations`)
      
      // Calculate aggregates efficiently
      const durations = allRecordings.map(r => parseFloat(String(r.duration || 0)))
      const totalRecordingTime = durations.reduce((sum, d) => sum + d, 0)
      const averageRecordingDuration = durations.length > 0 ? totalRecordingTime / durations.length : 0
      
      // Calculate total time for validated recordings only
      const validatedDurations = allRecordings
        .filter(r => r.status === "approved")
        .map(r => parseFloat(String(r.duration || 0)))
      const totalValidatedRecordingTime = validatedDurations.reduce((sum, d) => sum + d, 0)
      
      // Calculate total time for pending recordings only
      const pendingDurations = allRecordings
        .filter(r => r.status === "pending")
        .map(r => parseFloat(String(r.duration || 0)))
      const totalPendingRecordingTime = pendingDurations.reduce((sum, d) => sum + d, 0)
      
      const validationTimes = allReviews.map(r => r.time_spent || 0)
      const totalValidationTime = validationTimes.reduce((sum, t) => sum + t, 0)
      const averageValidationTime = validationTimes.length > 0 ? totalValidationTime / validationTimes.length : 0

      console.log(`✅ System stats calculated: ${totalRecordings || 0} total recordings, ${totalValidationsCount || 0} total validations (${validatedRecordings || 0} validated, ${editedRecordings || 0} edited)`)

      return {
        totalUsers: totalUsers || 0,
        contributors: contributors || 0,
        reviewers: reviewers || 0,
        pendingReviewers: pendingReviewers || 0,
        totalRecordings: totalRecordings || 0,
        pendingRecordings: pendingRecordings || 0,
        validatedRecordings: validatedRecordings || 0,
        editedRecordings: editedRecordings || 0,
        totalValidations: totalValidationsCount || 0,
        activeUsers: activeUsers || 0,
        averageRecordingDuration,
        averageValidationTime,
        totalRecordingTime,
        totalValidatedRecordingTime,
        totalPendingRecordingTime,
        totalValidationTime,
        totalSystemTime: totalRecordingTime + totalValidationTime,
      }
    } catch (error) {
      console.error("Error getting system stats:", error)
      return this.getDefaultSystemStats()
    }
  }

  private getDefaultSystemStats() {
    return {
      totalUsers: 0,
      contributors: 0,
      reviewers: 0,
      pendingReviewers: 0,
      totalRecordings: 0,
      pendingRecordings: 0,
      validatedRecordings: 0,
      editedRecordings: 0,
      totalValidations: 0,
      activeUsers: 0,
      averageRecordingDuration: 0,
      averageValidationTime: 0,
      totalRecordingTime: 0,
      totalValidatedRecordingTime: 0,
      totalPendingRecordingTime: 0,
      totalValidationTime: 0,
      totalSystemTime: 0,
    }
  }

  // OPTIMIZED: Use efficient queries with limits for stats calculation
  async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      if (!userId || !isValidUUID(userId)) {
        return null
      }

      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn("Supabase not configured, returning default user stats")
        return this.getDefaultUserStats(userId)
      }

      // OPTIMIZED: Fetch only necessary fields and use efficient queries
      // For recordings: we need status, duration, created_at (for streak calculation)
      // For reviews: we need decision, confidence, time_spent
      // FIXED: Use pagination to fetch ALL recordings and reviews (not limited to 1000 rows)
      
      // Fetch recordings and reviews with pagination in parallel
      const [allRecordings, allReviews] = await Promise.all([
        (async () => {
          let recordings: Recording[] = []
          let page = 0
          const pageSize = 1000
          let hasMore = true

          while (hasMore) {
            const { data: batch, error } = await supabase
              .from("recordings")
              .select("id, status, duration, created_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .range(page * pageSize, (page + 1) * pageSize - 1)
            
            if (error) {
              console.error("Database error fetching recordings batch:", error)
              throw new Error("Failed to get user stats")
            }
            
            if (!batch || batch.length === 0) {
              hasMore = false
            } else {
              recordings = [...recordings, ...(batch as Recording[])]
              hasMore = batch.length === pageSize
              page++
            }
          }
          return recordings
        })(),
        (async () => {
          let reviews: Review[] = []
          let page = 0
          const pageSize = 1000
          let hasMore = true

          while (hasMore) {
            const { data: batch, error } = await supabase
              .from("reviews")
              .select("id, decision, confidence, time_spent")
              .eq("reviewer_id", userId)
              .order("created_at", { ascending: false })
              .range(page * pageSize, (page + 1) * pageSize - 1)
            
            if (error) {
              console.error("Database error fetching reviews batch:", error)
              throw new Error("Failed to get user stats")
            }
            
            if (!batch || batch.length === 0) {
              hasMore = false
            } else {
              reviews = [...reviews, ...(batch as Review[])]
              hasMore = batch.length === pageSize
              page++
            }
          }
          return reviews
        })()
      ])

      const recordings = allRecordings
      const reviews = allReviews

      // Efficient in-memory aggregations
      const totalRecordings = recordings.length
      const approvedRecordings = recordings.filter((r) => r.status === "approved").length
      const rejectedRecordings = recordings.filter((r) => (r.status as string) === "rejected").length
      const pendingRecordings = recordings.filter((r) => r.status === "pending").length
      
      const totalReviews = reviews.length
      const approvedReviews = reviews.filter((r) => r.decision === "approved").length
      const rejectedReviews = reviews.filter((r) => (r.decision as string) === "rejected").length
      
      const reviewTimes = reviews.map(r => r.time_spent || 0)
      const averageReviewTime = reviewTimes.length > 0 ? reviewTimes.reduce((sum, t) => sum + t, 0) / reviewTimes.length : 0
      
      // Calculate average confidence (not true accuracy, but shows reviewer confidence level)
      // Note: True accuracy would require comparing reviewer decisions against ground truth, which we don't have
      const confidenceScores = reviews.map(r => r.confidence || 0).filter(c => c > 0)
      const accuracyRate = confidenceScores.length > 0 
        ? confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length 
        : 0
      
      const durations = recordings.map(r => parseFloat(String(r.duration || 0)))
      const totalTimeContributed = durations.reduce((sum, d) => sum + d, 0) / 60 // Convert to minutes

      const stats: UserStats = {
        userId,
        totalRecordings,
        approvedRecordings,
        rejectedRecordings,
        pendingRecordings,
        totalReviews,
        approvedReviews,
        rejectedReviews,
        averageReviewTime,
        accuracyRate,
        streakDays: this.calculateStreakDays(recordings),
        totalTimeContributed,
        lastActivityAt: recordings.length > 0 
          ? recordings[0].created_at 
          : new Date().toISOString(),
      }

      return stats
    } catch (error) {
      console.error("Error getting user stats:", error)
      return null
    }
  }

  private getDefaultUserStats(userId: string): UserStats {
    return {
      userId,
      totalRecordings: 0,
      approvedRecordings: 0,
      rejectedRecordings: 0,
      pendingRecordings: 0,
      totalReviews: 0,
      approvedReviews: 0,
      rejectedReviews: 0,
      averageReviewTime: 0,
      accuracyRate: 0,
      streakDays: 0,
      totalTimeContributed: 0,
      lastActivityAt: new Date().toISOString(),
    }
  }

  // OPTIMIZED: Batch load user stats efficiently
  async getAllUserStats(options?: { limit?: number }): Promise<UserStats[]> {
    try {
      // Load users with optional limit
      const users = await this.getAllUsers(options)
      
      // OPTIMIZED: Load stats in parallel batches (avoid overwhelming database)
      const batchSize = 10 // Process 10 users at a time
      const stats: UserStats[] = []
      
      for (let i = 0; i < users.length; i += batchSize) {
        const userBatch = users.slice(i, i + batchSize)
        const batchStats = await Promise.all(
          userBatch.map(user => this.getUserStats(user.id))
        )
        stats.push(...batchStats.filter((stat): stat is UserStats => stat !== null))
        
        // Small delay between batches to avoid overwhelming database
        if (i + batchSize < users.length) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }
      
      return stats
    } catch (error) {
      console.error("Error getting all user stats:", error)
      return []
    }
  }

  // Calculate streak days based on user's recording activity
  private calculateStreakDays(recordings: Recording[]): number {
    if (recordings.length === 0) return 0
    
    // Sort recordings by date (newest first)
    const sortedRecordings = recordings.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let streakDays = 0
    let currentDate = new Date(today)
    
    // Check consecutive days backwards from today
    while (true) {
      const recordingsOnDate = sortedRecordings.filter(recording => {
        const recordingDate = new Date(recording.created_at)
        recordingDate.setHours(0, 0, 0, 0)
        return recordingDate.getTime() === currentDate.getTime()
      })
      
      if (recordingsOnDate.length > 0) {
        streakDays++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }
    
    return streakDays
  }

  // Advanced queries for admin dashboard
  async getTopContributors(limit = 10): Promise<Array<User & { stats: UserStats }>> {
    try {
      const contributors = await this.getUsersByRole("contributor")
      const contributorsWithStats = await Promise.all(
        contributors.map(async (user) => {
          const stats = await this.getUserStats(user.id)
          return { ...user, stats: stats! }
        }),
      )

      return contributorsWithStats
        .filter((user) => user.stats)
        .sort((a, b) => b.stats.totalRecordings - a.stats.totalRecordings)
        .slice(0, limit)
    } catch (error) {
      console.error("Error getting top contributors:", error)
      return []
    }
  }

  async getTopReviewers(limit = 10): Promise<Array<User & { stats: UserStats }>> {
    try {
      const reviewers = await this.getUsersByRole("reviewer")
      const activeReviewers = reviewers.filter((r) => r.status === "active")

      const reviewersWithStats = await Promise.all(
        activeReviewers.map(async (user) => {
          const stats = await this.getUserStats(user.id)
          return { ...user, stats: stats! }
        }),
      )

      return reviewersWithStats
        .filter((user) => user.stats)
        .sort((a, b) => b.stats.totalReviews - a.stats.totalReviews)
        .slice(0, limit)
    } catch (error) {
      console.error("Error getting top reviewers:", error)
      return []
    }
  }

  async getRecentActivity(limit = 20): Promise<
    Array<{
      type: "recording" | "review" | "user_joined"
      user: User
      data: Recording | Review | User
      timestamp: string
    }>
  > {
    try {
      const activities: Array<{
        type: "recording" | "review" | "user_joined"
        user: User
        data: Recording | Review | User
        timestamp: string
      }> = []

      // Get recent recordings
      const recordings = await this.getAllRecordings()
      for (const recording of recordings.slice(0, 10)) {
        const user = await this.getUserById(recording.user_id)
        if (user) {
          activities.push({
            type: "recording",
            user,
            data: recording,
            timestamp: recording.created_at,
          })
        }
      }

      // Get recent reviews
      const reviews = await this.getAllReviews()
      for (const review of reviews.slice(0, 10)) {
        const user = await this.getUserById(review.reviewer_id)
        if (user) {
          activities.push({
            type: "review",
            user,
            data: review,
            timestamp: review.created_at,
          })
        }
      }

      // Get recent users
      const users = await this.getAllUsers()
      for (const user of users.slice(0, 10)) {
        if (user.role !== "admin") {
          activities.push({
            type: "user_joined",
            user,
            data: user,
            timestamp: user.created_at,
          })
        }
      }

      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)
    } catch (error) {
      console.error("Error getting recent activity:", error)
      return []
    }
  }

  // Get available sentences for a specific user (excluding already recorded + those with 3 recordings)
  // PROGRESSIVE LOADING: Returns first batch quickly, loads rest in background
  // Set initialBatchSize to control how many sentences to return immediately
  async getAvailableSentencesForUser(
    userId: string, 
    options?: { 
      initialBatchSize?: number,  // Return this many sentences immediately (default: 200)
      returnAll?: boolean          // If true, load all sentences (used for background loading)
    }
  ): Promise<string[]> {
    try {
      if (!userId || !isValidUUID(userId)) {
        return []
      }

      const initialBatchSize = options?.initialBatchSize || 200
      const returnAll = options?.returnAll || false

      // Check if user has reached the 1-hour (3600 seconds) recording limit
      const hasCompletedTarget = await this.hasUserCompletedRecordingTarget(userId)
      if (hasCompletedTarget) {
        console.log(`User ${userId} has completed the 1-hour recording target`)
        return [] // Return empty to trigger completion message
      }

      // OPTIMIZATION 1: Fetch user's recordings first (smallest dataset)
      const { data: userRecordings, error: userRecordingsError } = await supabase
        .from('recordings')
        .select('sentence')
        .eq('user_id', userId)

      if (userRecordingsError) {
        console.error("Error fetching user recordings:", userRecordingsError)
        throw new Error(`Failed to fetch user recordings: ${userRecordingsError.message}`)
      }

      const userRecordedSentences = new Set(userRecordings?.map(r => r.sentence) || [])

      // OPTIMIZATION 2: Build sentence recording counts (cache this - it changes slowly)
      const sentenceRecordingCounts: Record<string, Set<string>> = await withCache(
        'sentence:recording:counts',
        async () => {
          const counts: Record<string, Set<string>> = {}
          const { data: recordingsData } = await supabase
            .from('recordings')
            .select('sentence, user_id')

          recordingsData?.forEach(recording => {
            if (!counts[recording.sentence]) {
              counts[recording.sentence] = new Set()
            }
            counts[recording.sentence].add(recording.user_id)
          })
          
          console.log(`📊 Built recording counts for ${Object.keys(counts).length} sentences`)
          return counts
        },
        5 * 60 * 1000 // 5 minutes cache (recording counts change slowly)
      )

      // OPTIMIZATION 3: Progressive sentence loading
      // Load sentences in chunks and filter as we go
      let availableSentences: string[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true
      const targetSize = returnAll ? Infinity : initialBatchSize

      console.log(`🔄 Loading sentences for user ${userId} (target: ${returnAll ? 'ALL' : initialBatchSize})`)

      while (hasMore && availableSentences.length < targetSize) {
        // Check cache first for this page
        const cacheKey = `sentences:page:${page}:luo`
        const sentencesPage = await withCache(
          cacheKey,
          async () => {
            const { data, error } = await supabase
              .from('sentences')
              .select('text')
              .eq('is_active', true)
              .eq('language_code', 'luo')
              .range(page * pageSize, (page + 1) * pageSize - 1)

            if (error) {
              console.error("Error fetching sentences:", error)
              throw new Error(`Failed to fetch sentences: ${error.message}`)
            }

            return data || []
          },
          10 * 60 * 1000 // 10 minutes cache per page
        )

        if (!sentencesPage || sentencesPage.length === 0) {
          hasMore = false
          break
        }

        // Filter sentences from this page
        const filteredFromPage = sentencesPage
          .map(s => s.text)
          .filter(sentence => {
            // Exclude if user already recorded this sentence
            if (userRecordedSentences.has(sentence)) {
              return false
            }
            
            // Exclude if 3 or more different users already recorded this sentence
            const recordedByUsers = sentenceRecordingCounts[sentence]
            if (recordedByUsers && recordedByUsers.size >= 3) {
              return false
            }
            
            return true
          })

        availableSentences = [...availableSentences, ...filteredFromPage]

        // If we have enough sentences for initial batch, return early
        if (!returnAll && availableSentences.length >= initialBatchSize) {
          console.log(`✅ Quick return: ${availableSentences.length} sentences loaded (page ${page + 1})`)
          return availableSentences.slice(0, initialBatchSize)
        }

        hasMore = sentencesPage.length === pageSize
        page++
      }

      console.log(`✅ Loaded ${availableSentences.length} available sentences for user ${userId} (${page} pages)`)
      console.log(`📊 Stats: ${userRecordedSentences.size} already recorded by user, ${Object.values(sentenceRecordingCounts).filter(s => s.size >= 3).length} fully recorded`)

      return availableSentences
    } catch (error) {
      console.error("Error in getAvailableSentencesForUser:", error)
      return []
    }
  }

  // Check if user has completed the 1-hour (3600 seconds) recording target
  async hasUserCompletedRecordingTarget(userId: string): Promise<boolean> {
    try {
      if (!userId || !isValidUUID(userId)) {
        return false
      }

      // Get all recordings by the user
      const recordings = await this.getRecordingsByUser(userId)
      
      // Filter for approved recordings only
      const approvedRecordings = recordings.filter(recording => recording.status === 'approved')
      
      // Calculate total recording time for approved recordings only
      const totalSeconds = approvedRecordings.reduce((sum, recording) => {
        const duration = typeof recording.duration === 'string' 
          ? parseFloat(recording.duration) 
          : (recording.duration || 0)
        return sum + duration
      }, 0)

      console.log(`User ${userId} total approved recording time: ${totalSeconds} seconds (${(totalSeconds / 60).toFixed(2)} minutes)`)
      
      // Check if they've reached or exceeded 3600 seconds (1 hour)
      return totalSeconds >= 3600
    } catch (error) {
      console.error("Error checking user recording target:", error)
      return false
    }
  }

  // Get user's total recording time in seconds (approved recordings only)
  async getUserTotalRecordingTime(userId: string): Promise<number> {
    try {
      if (!userId || !isValidUUID(userId)) {
        return 0
      }

      const recordings = await this.getRecordingsByUser(userId)
      
      // Filter for approved recordings only
      const approvedRecordings = recordings.filter(recording => recording.status === 'approved')
      
      const totalSeconds = approvedRecordings.reduce((sum, recording) => {
        const duration = typeof recording.duration === 'string' 
          ? parseFloat(recording.duration) 
          : (recording.duration || 0)
        return sum + duration
      }, 0)

      return totalSeconds
    } catch (error) {
      console.error("Error getting user total recording time:", error)
      return 0
    }
  }

  // Check if a user can record a specific sentence
  async canUserRecordSentence(userId: string, sentence: string): Promise<boolean> {
    try {
      if (!userId || !isValidUUID(userId)) {
        return false
      }

      // Check if user already recorded this sentence
      const { data: userRecording, error: userError } = await supabase
        .from('recordings')
        .select('id')
        .eq('user_id', userId)
        .eq('sentence', sentence)
        .limit(1)

      if (userError) {
        console.error("Error checking user recording:", userError)
        return false
      }

      // If user already recorded this sentence, return false
      if (userRecording && userRecording.length > 0) {
        return false
      }

      // Check total number of unique users who recorded this sentence
      const { data: allRecordings, error: recordingsError } = await supabase
        .from('recordings')
        .select('user_id')
        .eq('sentence', sentence)

      if (recordingsError) {
        console.error("Error checking sentence recordings:", recordingsError)
        return false
      }

      // Count unique users
      const uniqueUsers = new Set(allRecordings?.map(r => r.user_id) || [])
      
      // Allow if less than 3 unique users have recorded this sentence
      return uniqueUsers.size < 3
    } catch (error) {
      console.error("Error in canUserRecordSentence:", error)
      return false
    }
  }

  // Get sentence recording statistics
  async getSentenceStats(sentence: string): Promise<{ totalRecordings: number, uniqueContributors: number }> {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('user_id')
        .eq('sentence', sentence)

      if (error) {
        console.error("Error getting sentence stats:", error)
        return { totalRecordings: 0, uniqueContributors: 0 }
      }

      const recordings = data || []
      const uniqueUsers = new Set(recordings.map(r => r.user_id))

      return {
        totalRecordings: recordings.length,
        uniqueContributors: uniqueUsers.size
      }
    } catch (error) {
      console.error("Error in getSentenceStats:", error)
      return { totalRecordings: 0, uniqueContributors: 0 }
    }
  }

  // ============================================
  // Mozilla Common Voice Integration Functions
  // ============================================

  // Mark a recording as uploaded to Mozilla
  async markRecordingAsUploadedToMozilla(recordingId: string, mozillaUrl: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('recordings')
        .update({
          mozilla_uploaded: true,
          mozilla_url: mozillaUrl,
          mozilla_uploaded_at: new Date().toISOString(),
        })
        .eq('id', recordingId)

      if (error) {
        console.error("Error marking recording as uploaded to Mozilla:", error)
        throw new Error(`Failed to update recording: ${error.message}`)
      }

      console.log(`Recording ${recordingId} marked as uploaded to Mozilla`)
    } catch (error) {
      console.error("Error in markRecordingAsUploadedToMozilla:", error)
      throw error
    }
  }

  // Get approved recordings that haven't been uploaded to Mozilla yet
  async getApprovedRecordingsNotUploadedToMozilla(limit: number = 100): Promise<Recording[]> {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('status', 'approved')
        .eq('mozilla_uploaded', false)
        .limit(limit)
        .order('created_at', { ascending: true })

      if (error) {
        console.error("Error getting approved recordings not uploaded to Mozilla:", error)
        throw new Error(`Failed to fetch recordings: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error("Error in getApprovedRecordingsNotUploadedToMozilla:", error)
      throw error
    }
  }

  // Get count of approved recordings not uploaded to Mozilla
  async countApprovedRecordingsNotUploadedToMozilla(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('recordings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .eq('mozilla_uploaded', false)

      if (error) {
        console.error("Error counting approved recordings not uploaded to Mozilla:", error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error("Error in countApprovedRecordingsNotUploadedToMozilla:", error)
      return 0
    }
  }

  // Get Mozilla upload statistics
  async getMozillaUploadStats(): Promise<{
    totalApproved: number
    uploadedToMozilla: number
    pendingUpload: number
    uploadPercentage: number
  }> {
    try {
      // Get total approved recordings
      const { count: totalApproved, error: approvedError } = await supabase
        .from('recordings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')

      if (approvedError) {
        console.error("Error counting approved recordings:", approvedError)
        throw new Error(`Failed to count approved recordings: ${approvedError.message}`)
      }

      // Get uploaded recordings
      const { count: uploadedToMozilla, error: uploadedError } = await supabase
        .from('recordings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .eq('mozilla_uploaded', true)

      if (uploadedError) {
        console.error("Error counting uploaded recordings:", uploadedError)
        throw new Error(`Failed to count uploaded recordings: ${uploadedError.message}`)
      }

      const total = totalApproved || 0
      const uploaded = uploadedToMozilla || 0
      const pending = total - uploaded
      const uploadPercentage = total > 0 ? Math.round((uploaded / total) * 100) : 0

      return {
        totalApproved: total,
        uploadedToMozilla: uploaded,
        pendingUpload: pending,
        uploadPercentage,
      }
    } catch (error) {
      console.error("Error in getMozillaUploadStats:", error)
      return {
        totalApproved: 0,
        uploadedToMozilla: 0,
        pendingUpload: 0,
        uploadPercentage: 0,
      }
    }
  }

  // Get recordings uploaded to Mozilla (for verification/audit)
  async getRecordingsUploadedToMozilla(limit: number = 100, offset: number = 0): Promise<Recording[]> {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('mozilla_uploaded', true)
        .order('mozilla_uploaded_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error("Error getting recordings uploaded to Mozilla:", error)
        throw new Error(`Failed to fetch recordings: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error("Error in getRecordingsUploadedToMozilla:", error)
      throw error
    }
  }

  // ============================================
  // Duplicate Review Management Functions
  // ============================================

  /**
   * Find duplicate reviews (multiple reviews for the same recording)
   * Returns a map of recording_id -> array of review IDs (sorted by created_at)
   */
  async findDuplicateReviews(): Promise<Map<string, string[]>> {
    try {
      console.log("🔍 Finding duplicate reviews...")
      
      // Get all reviews grouped by recording_id
      const { data: reviews, error } = await supabase
        .from("reviews")
        .select("id, recording_id, created_at")
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching reviews:", error)
        throw new Error(`Failed to fetch reviews: ${error.message}`)
      }

      if (!reviews || reviews.length === 0) {
        console.log("✅ No reviews found")
        return new Map()
      }

      // Group reviews by recording_id
      const reviewsByRecording = new Map<string, Array<{ id: string; created_at: string }>>()
      
      for (const review of reviews) {
        if (!reviewsByRecording.has(review.recording_id)) {
          reviewsByRecording.set(review.recording_id, [])
        }
        reviewsByRecording.get(review.recording_id)!.push({
          id: review.id,
          created_at: review.created_at
        })
      }

      // Find recordings with multiple reviews
      const duplicates = new Map<string, string[]>()
      let totalDuplicates = 0
      let uniqueRecordingsWithReviews = 0

      for (const [recordingId, reviewList] of reviewsByRecording.entries()) {
        if (reviewList.length > 1) {
          // Sort by created_at to keep the first one
          reviewList.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          // Keep first review, mark others for deletion
          const duplicateIds = reviewList.slice(1).map(r => r.id)
          duplicates.set(recordingId, duplicateIds)
          totalDuplicates += duplicateIds.length
        } else {
          uniqueRecordingsWithReviews++
        }
      }

      console.log(`📊 Found ${duplicates.size} recordings with duplicate reviews`)
      console.log(`📊 Total duplicate reviews to remove: ${totalDuplicates}`)
      console.log(`📊 Unique recordings with single review: ${uniqueRecordingsWithReviews}`)

      return duplicates
    } catch (error) {
      console.error("Error in findDuplicateReviews:", error)
      throw error
    }
  }

  /**
   * Remove duplicate reviews, keeping only the first review per recording
   * Returns statistics about the cleanup
   */
  async removeDuplicateReviews(): Promise<{
    duplicatesFound: number
    duplicatesRemoved: number
    uniqueRecordingsAfterCleanup: number
  }> {
    try {
      console.log("🧹 Starting duplicate review cleanup...")
      
      const duplicates = await this.findDuplicateReviews()
      
      if (duplicates.size === 0) {
        console.log("✅ No duplicate reviews found")
        return {
          duplicatesFound: 0,
          duplicatesRemoved: 0,
          uniqueRecordingsAfterCleanup: 0
        }
      }

      // Collect all review IDs to delete
      const reviewIdsToDelete: string[] = []
      for (const duplicateIds of duplicates.values()) {
        reviewIdsToDelete.push(...duplicateIds)
      }

      console.log(`🗑️  Deleting ${reviewIdsToDelete.length} duplicate reviews...`)

      // Delete duplicates in batches to avoid overwhelming the database
      const batchSize = 100
      let deletedCount = 0

      for (let i = 0; i < reviewIdsToDelete.length; i += batchSize) {
        const batch = reviewIdsToDelete.slice(i, i + batchSize)
        const { error } = await supabase
          .from("reviews")
          .delete()
          .in("id", batch)

        if (error) {
          console.error(`Error deleting batch ${i / batchSize + 1}:`, error)
          throw new Error(`Failed to delete duplicate reviews: ${error.message}`)
        }

        deletedCount += batch.length
        console.log(`✅ Deleted batch ${Math.floor(i / batchSize) + 1}: ${deletedCount}/${reviewIdsToDelete.length} reviews`)
      }

      // Verify cleanup - count unique recordings with reviews
      const { count: uniqueRecordingsCount, error: countError } = await supabase
        .from("reviews")
        .select("recording_id", { count: "exact", head: true })

      if (countError) {
        console.warn("Warning: Could not verify cleanup:", countError)
      }

      // Get actual unique count using a query
      const { data: allReviews, error: fetchError } = await supabase
        .from("reviews")
        .select("recording_id")

      let uniqueRecordingsAfterCleanup = 0
      if (!fetchError && allReviews) {
        uniqueRecordingsAfterCleanup = new Set(allReviews.map(r => r.recording_id)).size
      }

      console.log(`✅ Cleanup complete!`)
      console.log(`   - Duplicate recordings found: ${duplicates.size}`)
      console.log(`   - Duplicate reviews removed: ${deletedCount}`)
      console.log(`   - Unique recordings with reviews: ${uniqueRecordingsAfterCleanup}`)

      return {
        duplicatesFound: duplicates.size,
        duplicatesRemoved: deletedCount,
        uniqueRecordingsAfterCleanup
      }
    } catch (error) {
      console.error("Error in removeDuplicateReviews:", error)
      throw error
    }
  }

  /**
   * Get statistics about duplicate reviews
   */
  async getDuplicateReviewStats(): Promise<{
    totalReviews: number
    uniqueRecordingsWithReviews: number
    duplicateRecordings: number
    totalDuplicateReviews: number
  }> {
    try {
      const { count: totalReviews, error: totalError } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })

      if (totalError) {
        throw new Error(`Failed to count reviews: ${totalError.message}`)
      }

      const { data: allReviews, error: fetchError } = await supabase
        .from("reviews")
        .select("recording_id")

      if (fetchError) {
        throw new Error(`Failed to fetch reviews: ${fetchError.message}`)
      }

      if (!allReviews || allReviews.length === 0) {
        return {
          totalReviews: 0,
          uniqueRecordingsWithReviews: 0,
          duplicateRecordings: 0,
          totalDuplicateReviews: 0
        }
      }

      // Count occurrences of each recording_id
      const recordingCounts = new Map<string, number>()
      for (const review of allReviews) {
        const count = recordingCounts.get(review.recording_id) || 0
        recordingCounts.set(review.recording_id, count + 1)
      }

      const uniqueRecordingsWithReviews = recordingCounts.size
      let duplicateRecordings = 0
      let totalDuplicateReviews = 0

      for (const count of recordingCounts.values()) {
        if (count > 1) {
          duplicateRecordings++
          totalDuplicateReviews += count - 1 // Subtract 1 because we keep the first review
        }
      }

      return {
        totalReviews: totalReviews || 0,
        uniqueRecordingsWithReviews,
        duplicateRecordings,
        totalDuplicateReviews
      }
    } catch (error) {
      console.error("Error in getDuplicateReviewStats:", error)
      throw error
    }
  }
}

export const db = new SupabaseDatabase()
