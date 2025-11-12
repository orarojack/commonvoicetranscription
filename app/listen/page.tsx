"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Play, Pause, ThumbsUp, SkipForward, HelpCircle, Volume2, ChevronLeft, ChevronRight, RotateCcw, List, Edit2, Check, X, Flag } from "lucide-react"
import { db, type Recording } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

export default function ListenPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentRecording, setCurrentRecording] = useState<Recording | null>(null)
  const [sentenceCount, setSentenceCount] = useState(1) // Current recording position (for navigation)
  const [reviewsCompleted, setReviewsCompleted] = useState(0) // Total validations completed
  const [sessionReviews, setSessionReviews] = useState(0)
  const [pendingRecordings, setPendingRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const backgroundLoadRef = useRef(false) // Prevent multiple background loads

  // Fisher-Yates shuffle algorithm to randomize recordings for reviewers
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
  const [audioLoading, setAudioLoading] = useState(false)
  const [reviewStartTime, setReviewStartTime] = useState<number>(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [showGuidelines, setShowGuidelines] = useState(false)
  const [recordingHistory, setRecordingHistory] = useState<Recording[]>([])
  const [currentRecordingIndex, setCurrentRecordingIndex] = useState(0)
  const [hasListenedToEnd, setHasListenedToEnd] = useState(false)
  const [reviewedRecordingIds, setReviewedRecordingIds] = useState<Set<string>>(new Set())
  const [skippedRecordings, setSkippedRecordings] = useState<Recording[]>([])
  const [showSkippedRecordings, setShowSkippedRecordings] = useState(false)
  const [audioLoadError, setAudioLoadError] = useState<string | null>(null)
  const [isEditingSentence, setIsEditingSentence] = useState(false)
  const [editedSentence, setEditedSentence] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const audioObjectUrlRef = useRef<string | null>(null)
  const currentRecordingRef = useRef<Recording | null>(null) // Track current recording for real-time sync

  useEffect(() => {
    loadPendingRecordings()
  }, [])

  // Keep ref in sync with currentRecording state
  useEffect(() => {
    currentRecordingRef.current = currentRecording
    // Reset editing state when recording changes
    setIsEditingSentence(false)
    setEditedSentence(currentRecording?.sentence || '')
  }, [currentRecording])

  // Real-time synchronization: Remove recordings when other reviewers validate them
  useEffect(() => {
    if (!user?.id) return

    console.log('🔔 Setting up real-time subscription for review events...')
    
    // Subscribe to INSERT events on the reviews table
    const channel = supabase
      .channel('reviews-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reviews',
        },
        (payload) => {
          const newReview = payload.new as {
            id: string
            recording_id: string
            reviewer_id: string
            decision: string
            created_at: string
          }

          // Ignore reviews created by the current user (they handle it locally)
          if (newReview.reviewer_id === user.id) {
            console.log('✅ Ignoring own review:', newReview.recording_id)
            return
          }

          console.log('🔔 New review detected by another reviewer:', {
            recordingId: newReview.recording_id,
            reviewerId: newReview.reviewer_id,
            decision: newReview.decision
          })

          // Remove the reviewed recording from pending list and handle current recording
          setPendingRecordings(prev => {
            const recordingExists = prev.some(r => r.id === newReview.recording_id)
            
            if (!recordingExists) {
              console.log('ℹ️ Recording not in pending list, skipping removal')
              return prev
            }

            console.log('🗑️ Removing reviewed recording from pending list:', newReview.recording_id)
            
            // Check if this is the current recording
            setCurrentRecording(current => {
              const isCurrentRecording = current?.id === newReview.recording_id
              
              if (isCurrentRecording) {
                console.log('⚠️ Current recording was reviewed by another reviewer, moving to next...')
                const remaining = prev.filter(r => r.id !== newReview.recording_id)
                
                if (remaining.length > 0) {
                  const nextRecording = remaining[0]
                  console.log('➡️ Moving to next recording:', nextRecording.id)
                  setReviewStartTime(Date.now())
                  setHasListenedToEnd(false)
                  return nextRecording
                } else {
                  console.log('📭 No more recordings available')
                  setReviewStartTime(Date.now())
                  setHasListenedToEnd(false)
                  return null
                }
              }
              
              return current
            })

            return prev.filter(r => r.id !== newReview.recording_id)
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time review events')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to real-time review events')
        } else {
          console.log('📡 Subscription status:', status)
        }
      })

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 Cleaning up real-time subscription...')
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  useEffect(() => {
    const loadAudio = async () => {
      // Skip loading if page is still loading or audio ref not ready
      if (loading) {
        console.log('⏳ Skipping audio load - page still loading')
        return
      }
      
      if (!currentRecording?.audio_url || !audioRef.current) {
        setAudioLoading(false)
        return
      }
      
      console.log('🎵 Loading audio for recording:', currentRecording.id)
      
      // Reset audio element first
      const audio = audioRef.current
      
      // Pause and reset WITHOUT triggering audioLoading state
      // This prevents the "play interrupted by pause" error
      try {
        audio.pause()
      } catch (e) {
        // Ignore pause errors
      }
      
      audio.currentTime = 0
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      setAudioLoadError(null) // Clear previous errors
      
      // Clean up previous object URL AFTER we're done with it
      if (audioObjectUrlRef.current) {
        const oldUrl = audioObjectUrlRef.current
        // Defer cleanup to avoid race condition
        setTimeout(() => URL.revokeObjectURL(oldUrl), 100)
        audioObjectUrlRef.current = null
      }
      
      try {
        console.log("🎵 Loading audio for recording:", currentRecording.id)
        console.log("📝 Audio URL type:", currentRecording.audio_url.substring(0, 50) + "...")
        
        setAudioLoading(true)
        
        // Handle different URL types
        if (currentRecording.audio_url.startsWith('data:')) {
          // Convert data URL to blob for better memory management
          console.log("🔄 Converting data URL to blob...")
          
          try {
            const response = await fetch(currentRecording.audio_url)
            if (!response.ok) {
              throw new Error(`Failed to fetch data URL: ${response.statusText}`)
            }
            
            const blob = await response.blob()
            console.log("✅ Blob created - Size:", blob.size, "bytes, Type:", blob.type)
            
            // Verify blob is valid
            if (blob.size === 0) {
              throw new Error("Audio blob is empty - recording may be corrupted")
            }
            
            // Create object URL and store it
            const objectUrl = URL.createObjectURL(blob)
            audioObjectUrlRef.current = objectUrl
            console.log("🔗 Object URL created:", objectUrl.substring(0, 50) + "...")
            
            // Set the source
            audio.src = objectUrl
          } catch (blobError) {
            console.warn("⚠️ Blob conversion failed, using data URL directly:", blobError)
            // Fallback to using data URL directly
            audio.src = currentRecording.audio_url
          }
        } else if (currentRecording.audio_url.startsWith('/') || currentRecording.audio_url.startsWith('http')) {
          // Direct file path or HTTP URL
          console.log("🔗 Using direct URL...")
          audio.src = currentRecording.audio_url
        } else {
          throw new Error("Unsupported audio URL format")
        }
        
        // Wait for audio to be ready with timeout
        await Promise.race([
          new Promise<void>((resolve, reject) => {
            const handleCanPlay = () => {
              console.log("✅ Audio can play - ready for playback")
              cleanup()
              setAudioLoading(false)
              resolve()
            }
            
            const handleLoadedData = () => {
              // loadeddata fires when audio is ready to play
              console.log("✅ Audio loaded data - ready for playback")
              cleanup()
              setAudioLoading(false)
              resolve()
            }
            
            const handleError = (e: Event) => {
              const target = e.target as HTMLAudioElement
              const error = target.error
              
              // Map error codes to user-friendly messages
              let errorMessage = "Unknown error"
              if (error) {
                switch (error.code) {
                  case 1: // MEDIA_ERR_ABORTED
                    errorMessage = "Audio loading was aborted"
                    break
                  case 2: // MEDIA_ERR_NETWORK
                    errorMessage = "Network error or corrupted audio data"
                    break
                  case 3: // MEDIA_ERR_DECODE
                    errorMessage = "Audio file is corrupted or in unsupported format"
                    break
                  case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                    errorMessage = "Audio format not supported by browser"
                    break
                }
              }
              
              console.error("❌ Audio loading error:", {
                code: error?.code,
                message: error?.message,
                userMessage: errorMessage,
                src: audio.src.substring(0, 100),
                recordingId: currentRecording.id
              })
              
              cleanup()
              setAudioLoading(false)
              reject(new Error(errorMessage))
            }
            
            const cleanup = () => {
              audio.removeEventListener('canplay', handleCanPlay)
              audio.removeEventListener('loadeddata', handleLoadedData)
              audio.removeEventListener('error', handleError)
            }
            
            // Check readyState BEFORE adding event listeners
            // This prevents missing events that fire during listener attachment
            if (audio.readyState >= 2) {
              console.log("✅ Audio already loaded - ready immediately")
              cleanup()
              setAudioLoading(false)
              resolve()
              return
            }
            
            // Listen to both canplay and loadeddata events
            // Whichever fires first will resolve the promise
            audio.addEventListener('canplay', handleCanPlay, { once: true })
            audio.addEventListener('loadeddata', handleLoadedData, { once: true })
            audio.addEventListener('error', handleError, { once: true })
            
            // Start loading the audio
            audio.load()
          }),
          // Timeout after 5 seconds
          new Promise<void>((resolve, reject) => 
            setTimeout(() => {
              console.warn("⏰ Audio loading timeout after 5s")
              setAudioLoading(false) // Always clear loading state
              // Don't reject - let it continue, audio might still work
              resolve()
            }, 5000)
          )
        ]).catch(err => {
          // Ensure loading state is cleared on ANY error
          console.error("Audio loading promise error:", err)
          setAudioLoading(false)
          throw err
        })
        
        console.log("✅ Audio loaded successfully")
        
        // Try to get duration immediately after loading
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          console.log("✅ Setting duration immediately after load:", audio.duration)
          setDuration(audio.duration)
          generateWaveformData(audio.duration)
        } else {
          console.log("⚠️ Duration not available immediately, readyState:", audio.readyState, "duration:", audio.duration)
          
          // For data URLs, sometimes duration needs a moment to be calculated
          // Try again after a short delay
          setTimeout(() => {
            if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
              console.log("✅ Duration available after delay:", audio.duration)
              setDuration(audio.duration)
              generateWaveformData(audio.duration)
            } else {
              console.warn("⚠️ Duration still not available after delay. Using recording.duration as fallback:", currentRecording.duration)
              // Fallback to the duration stored in the recording metadata
              setDuration(currentRecording.duration)
              generateWaveformData(currentRecording.duration)
            }
          }, 100)
        }
        
        // Notify user that audio is ready (optional feedback)
        console.log("🎵 Audio ready to play - Click the play button!")
        
      } catch (error) {
        console.error("💥 Error processing audio:", error)
        const errorMsg = error instanceof Error ? (error.message || 'Unknown error') : 'Unknown error'
        
        // Always ensure loading state is cleared
        setAudioLoading(false)
        
        // Only show error if it's not a timeout and we have a valid error message
        // Also check if currentRecording exists before showing error (prevents errors on initial load)
        // Don't show errors for expected scenarios (timeouts, empty messages, or when recording is null)
        const shouldShowError = currentRecording && 
          errorMsg && 
          errorMsg.trim() && 
          !errorMsg.includes('timeout') &&
          !errorMsg.toLowerCase().includes('network') && // Network errors might be transient
          !errorMsg.toLowerCase().includes('cors') // CORS errors are often configuration issues
          
        if (shouldShowError && errorMsg && errorMsg.trim()) {
          setAudioLoadError(errorMsg)
          setTimeout(() => {
            toast({
              title: "Audio Loading Error",
              description: `Failed to load audio file: ${errorMsg}`,
              variant: "destructive",
            })
          }, 0)
        } else {
          // For timeouts, empty messages, or network issues, just log and let user try playing
          console.log("ℹ️ Audio loading issue (timeout, network, or no recording):", errorMsg || 'No error message')
        }
      }
    }
    
    loadAudio()
    
    // Cleanup object URL on unmount or recording change
    return () => {
      if (audioObjectUrlRef.current) {
        const urlToRevoke = audioObjectUrlRef.current
        // Defer cleanup to ensure audio element is done with it
        setTimeout(() => URL.revokeObjectURL(urlToRevoke), 100)
        audioObjectUrlRef.current = null
      }
    }
  }, [currentRecording?.id, loading]) // Added 'loading' to trigger audio load when page loading completes

  // Update current time as audio plays
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => {
      setCurrentTime(audio.currentTime)
    }

    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        console.log('✅ Duration updated:', audio.duration)
        setDuration(audio.duration)
        // Also regenerate waveform when duration is known
        generateWaveformData(audio.duration)
      }
    }

    // Set initial duration if already loaded
    if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      console.log('✅ Initial duration set:', audio.duration)
      setDuration(audio.duration)
      generateWaveformData(audio.duration)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('durationchange', updateDuration)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('durationchange', updateDuration)
    }
  }, [currentRecording, audioLoading])

  const generateWaveformData = (audioDuration?: number) => {
    // Generate mock waveform data based on recording duration
    // In a real implementation, you would analyze the actual audio file
    const durationToUse = audioDuration || currentRecording?.duration || 10
    const dataPoints = Math.floor(durationToUse) * 10
    const data = Array.from({ length: dataPoints }, () => 
      Math.random() * 0.8 + 0.2
    )
    console.log('📊 Generated waveform data:', dataPoints, 'points for', durationToUse, 'seconds')
    setWaveformData(data)
  }

  const loadPendingRecordings = async () => {
    try {
      setLoading(true)
      backgroundLoadRef.current = false // Reset background load flag
      
      // INSTANT LOADING: Fetch only first 10 recordings with limit at database level
      // FIXED: Exclude recordings the reviewer has already reviewed
      console.log('⚡ Loading first batch of recordings (10)...')
      const firstBatch = user?.id 
        ? await db.getRecordingsByStatusExcludingReviewedByUser("pending", user.id, { limit: 10 })
        : await db.getRecordingsByStatus("pending", { limit: 10 })
      
      // Filter helper function
      const isValidRecording = (recording: Recording): boolean => {
        if (!recording.audio_url) {
          console.warn(`Recording ${recording.id} has no audio_url`)
          return false
        }
        
        const url = recording.audio_url.trim()
        
        // Accept data URLs (base64 encoded audio embedded inline)
        if (url.startsWith('data:')) {
          return true
        }
        
        // Accept Supabase storage URLs (https://*.supabase.co/storage/...)
        if (url.startsWith('http://') || url.startsWith('https://')) {
          // Check if it's a Supabase storage URL
          if (url.includes('supabase.co/storage') || url.includes('supabase.co/storage/v')) {
            return true
          }
          // Also accept any valid HTTP/HTTPS URL (could be other storage providers)
          try {
            new URL(url)
            return true
          } catch {
            // Invalid URL format
            return false
          }
        }
        
        // Reject file paths that don't exist (like /audio/sample3.mp3)
        if (url.startsWith('/') || !url.includes('://')) {
          console.warn(`Recording ${recording.id} has invalid URL format: ${url.substring(0, 50)}`)
          return false
        }
        
        return false
      }
      
      // Filter first batch for valid recordings only
      const validFirstBatch = firstBatch.filter(isValidRecording)
      
      // Randomize recordings for reviewers
      const shuffledFirstBatch = shuffleArray(validFirstBatch)
      
      // Show first batch immediately (INSTANT - 0 seconds!)
      if (shuffledFirstBatch.length > 0) {
        console.log(`✅ First batch ready instantly: ${shuffledFirstBatch.length} valid recordings (randomized)`)
        setPendingRecordings(shuffledFirstBatch)
        setCurrentRecording(shuffledFirstBatch[0])
        setReviewStartTime(Date.now())
        setHasListenedToEnd(false)
        setLoading(false) // INSTANT - no loading delay!
        
        // Use setTimeout to avoid calling toast during state update
        setTimeout(() => {
          toast({
            title: "Ready to Review!",
            description: `${shuffledFirstBatch.length} recordings ready (loading more in background...)`,
          })
        }, 0)
      } else if (firstBatch.length > 0) {
        // We have recordings but none are valid
        setLoading(false)
        setTimeout(() => {
        toast({
          title: "No Valid Recordings",
          description: "All pending recordings have missing or invalid audio files. Please check with the administrator.",
          variant: "destructive",
        })
        }, 0)
      } else {
        // No pending recordings in first batch - but check in background
        console.log("No pending recordings in first batch (checking for more in background...)")
        setLoading(false)
        // Keep currentRecording as null - will be set if background finds recordings
      }

      // BACKGROUND LOADING: Fetch more recordings without blocking UI
      // FIXED: Prevent multiple background loads
      if (backgroundLoadRef.current) {
        console.log('⚠️ Background load already in progress, skipping...')
        return
      }
      
      backgroundLoadRef.current = true
      console.log('🔄 Loading more recordings in background...')
      setTimeout(async () => {
        try {
          // Fetch more recordings (without limit this time, or with a larger limit)
          // FIXED: Exclude recordings the reviewer has already reviewed
          const moreRecordings = user?.id 
            ? await db.getRecordingsByStatusExcludingReviewedByUser("pending", user.id)
            : await db.getRecordingsByStatus("pending")
          
          console.log(`📊 Background load: Fetched ${moreRecordings.length} total recordings from database`)
          
          // FIXED: Use current state instead of local variable to avoid duplicates
          // Filter out recordings we already have (check against current state)
          setPendingRecordings(prev => {
            const existingIds = new Set(prev.map(r => r.id))
            console.log(`📊 Current state: ${prev.length} recordings, checking against ${moreRecordings.length} fetched`)
            
            const additionalValidRecordings = moreRecordings
              .filter(r => !existingIds.has(r.id))
              .filter(isValidRecording)
            
            console.log(`📊 After filtering: ${additionalValidRecordings.length} new valid recordings to add`)
            
            if (additionalValidRecordings.length === 0) {
              console.log('ℹ️ No new recordings to add in background load')
              return prev // No changes
            }
            
            // Randomize additional recordings
            const shuffledAdditionalRecordings = shuffleArray(additionalValidRecordings)
            
            console.log(`✅ Background load complete: ${shuffledAdditionalRecordings.length} additional recordings (randomized)`)
            console.log(`📊 Total recordings after merge: ${prev.length} + ${shuffledAdditionalRecordings.length} = ${prev.length + shuffledAdditionalRecordings.length}`)
            
            // Combine with existing recordings and shuffle
            const combined = [...prev, ...shuffledAdditionalRecordings]
            const shuffledCombined = shuffleArray(combined)
            
            // Only show toast if we already had recordings
            if (prev.length > 0) {
              setTimeout(() => {
                toast({
                  title: "More Recordings Loaded",
                  description: `Added ${shuffledAdditionalRecordings.length} more recordings to review`,
                })
              }, 0)
            }
            
            return shuffledCombined
          })
        } catch (error) {
          console.error('Background recording loading failed:', error)
          // Don't show error - user already has initial batch
        } finally {
          backgroundLoadRef.current = false // Reset flag
        }
      }, 100) // Small delay to ensure UI is responsive

      // Load reviewer's actual statistics from database (non-blocking)
      if (user?.id) {
        loadReviewerStats().catch(err => console.error('Failed to load reviewer stats:', err))
      }
    } catch (error) {
      console.error("Error loading recordings:", error)
      setLoading(false)
      
      // Only show error toast if it's a real error (not just empty result or expected scenarios)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isRealError = errorMessage && 
        !errorMessage.toLowerCase().includes('no recordings') &&
        !errorMessage.toLowerCase().includes('empty') &&
        !errorMessage.toLowerCase().includes('not found')
      
      // Only show error if it's a real error AND we haven't loaded any recordings yet
      // Also defer to avoid React state update warnings
      if (isRealError) {
        setTimeout(() => {
          toast({
            title: "Error Loading Recordings",
            description: "Unable to load recordings. Please refresh the page or try again later.",
            variant: "destructive",
          })
        }, 0)
      } else {
        // For expected scenarios (no recordings, etc.), just log and let the UI show the empty state
        console.log("ℹ️ No recordings available or expected empty result:", errorMessage || 'No error message')
      }
    }
  }

  const loadReviewerStats = async () => {
    if (!user?.id) return

    try {
      // Get all reviews by this reviewer
      const allReviews = await db.getReviewsByReviewer(user.id)
      
      // Get today's reviews for session count
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayReviews = allReviews.filter(review => {
        const reviewDate = new Date(review.created_at)
        reviewDate.setHours(0, 0, 0, 0)
        return reviewDate.getTime() === today.getTime()
      })

      // Update states with actual data
      setReviewsCompleted(allReviews.length) // Total reviews ever completed
      setSessionReviews(todayReviews.length) // Reviews completed today
      
      console.log('📊 Reviewer Stats Loaded:', {
        totalReviews: allReviews.length,
        todayReviews: todayReviews.length,
        userId: user.id
      })
    } catch (error) {
      console.error("Error loading reviewer stats:", error)
    }
  }

  const togglePlayback = async () => {
    if (!currentRecording?.audio_url) {
      // Only show error if we actually have a recording (prevents errors on initial load)
      if (currentRecording) {
        setTimeout(() => {
          toast({
            title: "Error",
            description: "No audio file available for this recording",
            variant: "destructive",
          })
        }, 0)
      }
      return
    }

    // Don't allow play/pause while audio is still loading
    if (audioLoading) {
      console.log("⏳ Audio still loading, please wait...")
      return
    }

    if (isPlaying) {
      if (audioRef.current) {
        try {
          audioRef.current.pause()
          setIsPlaying(false)
        } catch (e) {
          console.error("Pause error:", e)
        }
      }
    } else {
      try {
        if (audioRef.current) {
          // Check if audio is ready to play
          if (audioRef.current.readyState < 2) {
            console.warn("⚠️ Audio not ready yet, readyState:", audioRef.current.readyState)
            toast({
              title: "Audio Loading",
              description: "Audio is still loading, please wait a moment...",
            })
            return
          }
          
          // Simply play the audio - it's already been loaded and converted to blob in the useEffect
          await audioRef.current.play()
          setIsPlaying(true)
        }
      } catch (error) {
        let errorMessage = "Failed to play audio file"
        
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            errorMessage = "Browser blocked audio playback. Please click play again."
          } else if (error.name === 'NotSupportedError') {
            errorMessage = "Audio format not supported by your browser."
          } else if (error.name === 'AbortError') {
            errorMessage = "Audio playback was interrupted. Try again."
          } else {
            errorMessage = `Audio error: ${error.message}`
          }
        }
        
        console.error("Playback error:", error)
        // Only show toast if we have a valid error message
        if (errorMessage && errorMessage.trim()) {
          setTimeout(() => {
            toast({
              title: "Audio Playback Error",
              description: errorMessage,
              variant: "destructive",
            })
          }, 0)
        } else {
          // Log error but don't show empty toast
          console.log("ℹ️ Playback error occurred but no error message available")
        }
      }
    }
  }

  const handleWaveformClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !waveformRef.current) return

    const rect = waveformRef.current.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickPercentage = clickX / rect.width
    const newTime = clickPercentage * duration

    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setHasListenedToEnd(true)
    toast({
      title: "Audio Complete",
      description: "You can now validate this transcription.",
    })
  }

  const handleAudioError = () => {
    setIsPlaying(false)
    // Only show error if we have a current recording (prevents errors on initial load)
    if (currentRecording) {
      setTimeout(() => {
        toast({
          title: "Error",
          description: "Failed to play audio file",
          variant: "destructive",
        })
      }, 0)
    } else {
      console.log("ℹ️ Audio error occurred but no recording is loaded")
    }
  }


  const handleValidation = async (isValid: boolean) => {
    if (!currentRecording || !user) return
    
    // Ensure reviewer has listened to entire audio
    if (!hasListenedToEnd) {
      toast({
        title: "Please Listen First",
        description: "You must listen to the entire audio before submitting.",
        variant: "destructive",
      })
      return
    }

    try {
      const timeSpent = Math.floor((Date.now() - reviewStartTime) / 1000)

      // Check if sentence was edited
      const sentenceWasEdited = editedSentence.trim() !== currentRecording.sentence.trim()
      
      // Update recording with new transcription validation fields
      if (sentenceWasEdited && editedSentence.trim()) {
        try {
          await db.updateRecording(currentRecording.id, {
            original_sentence: currentRecording.sentence, // Preserve original
            sentence: editedSentence.trim(),               // Update with corrected version
            transcription_edited: true,                    // Mark as edited
            edited_by: user.id,                           // Track who edited
            edited_at: new Date().toISOString(),          // Track when edited
          })
          console.log('✅ Recording transcription updated and tracked:', editedSentence.trim())
        } catch (updateError) {
          console.error('Error updating recording transcription:', updateError)
          // Continue with review even if sentence update fails
        }
      }

      // Create review notes - include sentence edit info if applicable
      let reviewNotes = "Transcription verified as correct"
      if (sentenceWasEdited && editedSentence.trim()) {
        reviewNotes = `Transcription corrected from: "${currentRecording.sentence}" to: "${editedSentence.trim()}"`
      }

      // Create review (always approved)
      await db.createReview({
        recording_id: currentRecording.id,
        reviewer_id: user.id,
        decision: "approved",
        notes: reviewNotes,
        confidence: Math.floor(Math.random() * 20) + 80, // 80-100% confidence
        time_spent: timeSpent,
      })

      toast({
        title: sentenceWasEdited ? "Transcription Edited" : "Transcription Passed",
        description: sentenceWasEdited 
          ? "Recording submitted with edited transcription" 
          : "Recording passed - transcription is correct",
      })

      // Mark this recording as reviewed - prevent it from appearing again
      setReviewedRecordingIds(prev => new Set([...prev, currentRecording.id]))

      // Move to next recording
      const remainingRecordings = pendingRecordings.filter((r) => r.id !== currentRecording.id)
      setPendingRecordings(remainingRecordings)

      // Remove reviewed recording from history if it's there
      setRecordingHistory(prev => prev.filter(r => r.id !== currentRecording.id))

      if (remainingRecordings.length > 0) {
        setCurrentRecording(remainingRecordings[0])
        setReviewStartTime(Date.now())
        setSentenceCount((prev) => prev + 1)
        setReviewsCompleted((prev) => prev + 1) // Increment total reviews completed
        setSessionReviews((prev) => prev + 1) // Increment today's session count
        setCurrentRecordingIndex(prev => prev + 1)
        setHasListenedToEnd(false) // Reset for next recording
        setIsEditingSentence(false) // Reset editing state
        setEditedSentence('') // Clear edited sentence
      } else {
        // No more recordings to review
        setCurrentRecording(null)
        setReviewsCompleted((prev) => prev + 1) // Increment total reviews completed
        setSessionReviews((prev) => prev + 1) // Increment today's session count
        setHasListenedToEnd(false) // Reset
        toast({
          title: "All Done!",
          description: "No more recordings to review at this time.",
        })
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      const errorMessage = error instanceof Error ? (error.message || "Failed to submit review. Please try again.") : "Failed to submit review. Please try again."
      
      // Check if the error is about self-reviewing
      if (errorMessage && errorMessage.includes("cannot review your own")) {
        toast({
          title: "Cannot Review Own Recording",
          description: "You cannot review your own recordings. This recording will be skipped.",
          variant: "destructive",
        })
        // Mark as reviewed and skip this recording since it's the user's own
        if (currentRecording) {
          setReviewedRecordingIds(prev => new Set([...prev, currentRecording.id]))
          setRecordingHistory(prev => prev.filter(r => r.id !== currentRecording.id))
        }
        skipRecording()
      } else if (errorMessage && errorMessage.trim()) {
        setTimeout(() => {
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          })
        }, 0)
      } else {
        // Fallback for empty error messages - but only show if we actually tried to submit
        setTimeout(() => {
          toast({
            title: "Error",
            description: "Failed to submit review. Please try again.",
            variant: "destructive",
          })
        }, 0)
      }
    }
  }

  const skipRecording = () => {
    if (!currentRecording) return

    // Add to skipped recordings list (if not already there)
    if (!skippedRecordings.find(r => r.id === currentRecording.id)) {
      setSkippedRecordings(prev => [...prev, currentRecording])
    }

    // Remove from pending recordings
    const remainingRecordings = pendingRecordings.filter((r) => r.id !== currentRecording.id)
    setPendingRecordings(remainingRecordings)

    // Also remove from history if it's there
    setRecordingHistory(prev => prev.filter(r => r.id !== currentRecording.id))

    // Reset editing state
    setIsEditingSentence(false)
    setEditedSentence('')

    if (remainingRecordings.length > 0) {
      setCurrentRecording(remainingRecordings[0])
      setReviewStartTime(Date.now())
      setHasListenedToEnd(false) // Reset for next recording
      setAudioLoadError(null) // Clear any errors
      
      toast({
        title: "Recording Skipped",
        description: "You can return to skipped recordings anytime using the 'Skipped' button.",
      })
    } else {
      setCurrentRecording(null)
      setHasListenedToEnd(false) // Reset
      setAudioLoadError(null) // Clear any errors
    }
  }

  const restoreSkippedRecording = (recording: Recording) => {
    // Remove from skipped list
    setSkippedRecordings(prev => prev.filter(r => r.id !== recording.id))
    
    // Add back to pending recordings if not already there
    if (!pendingRecordings.find(r => r.id === recording.id)) {
      setPendingRecordings(prev => [recording, ...prev])
    }
    
    // Set as current recording
    setCurrentRecording(recording)
    setReviewStartTime(Date.now())
    setHasListenedToEnd(false)
    setAudioLoadError(null)
    
    // Close the skipped recordings dialog
    setShowSkippedRecordings(false)
    
    toast({
      title: "Recording Restored",
      description: "You can now review this recording.",
    })
  }

  const goToNextRecording = () => {
    if (pendingRecordings.length > 1) {
      const currentIndex = pendingRecordings.findIndex(r => r.id === currentRecording?.id)
      const nextIndex = (currentIndex + 1) % pendingRecordings.length
      const nextRecording = pendingRecordings[nextIndex]
      
      // Add current recording to history ONLY if it hasn't been reviewed
      if (currentRecording && !reviewedRecordingIds.has(currentRecording.id)) {
        if (!recordingHistory.find(r => r.id === currentRecording.id)) {
        setRecordingHistory(prev => [...prev, currentRecording])
        }
      }
      
      setCurrentRecording(nextRecording)
      setCurrentRecordingIndex(prev => prev + 1)
      setReviewStartTime(Date.now())
      setHasListenedToEnd(false) // Reset for next recording
      // Don't increment sentenceCount or reviewsCompleted for navigation - only for actual reviews
    }
  }

  const goToPreviousRecording = () => {
    if (recordingHistory.length > 0 && currentRecording) {
      // Find the most recent non-reviewed recording in history
      let previousRecording: Recording | null = null
      let historyIndex = recordingHistory.length - 1
      
      // Look backwards through history for a recording that hasn't been reviewed
      while (historyIndex >= 0) {
        const candidate = recordingHistory[historyIndex]
        if (!reviewedRecordingIds.has(candidate.id)) {
          previousRecording = candidate
          break
        }
        historyIndex--
      }
      
      // If no non-reviewed recording found, don't allow going back
      if (!previousRecording) {
        toast({
          title: "Cannot Go Back",
          description: "Previous recordings have already been reviewed.",
          variant: "destructive",
        })
        return
      }
      
      // Add current recording back to pending list ONLY if it hasn't been reviewed
      if (!reviewedRecordingIds.has(currentRecording.id)) {
      if (!pendingRecordings.find(r => r.id === currentRecording.id)) {
        setPendingRecordings(prev => [currentRecording, ...prev])
        }
      }
      
      setCurrentRecording(previousRecording)
      setCurrentRecordingIndex(prev => prev - 1)
      
      // Remove the selected recording and all reviewed recordings after it from history
      setRecordingHistory(prev => {
        const index = prev.findIndex(r => r.id === previousRecording.id)
        if (index >= 0) {
          return prev.slice(0, index)
        }
        return prev
      })
      
      setReviewStartTime(Date.now())
      setHasListenedToEnd(false) // Reset for previous recording
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recordings...</p>
        </div>
      </div>
    )
  }

  // Don't return early - show empty state within main layout

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mb-4 bg-white rounded-lg p-3 sm:p-4 shadow-lg border border-gray-200">
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-md">
          <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          <span className="text-xs sm:text-sm text-white font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>Validation Session</span>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 order-first sm:order-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Validate Transcriptions</h1>
        <div className="bg-blue-50 p-3 sm:p-4 rounded-xl border border-blue-200 w-full sm:max-w-xs md:max-w-md text-center sm:text-right">
          <p className="text-xs sm:text-sm text-blue-800 font-bold leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Listen, verify the transcription matches the audio, edit if needed, then submit.
        </p>
        </div>
      </div>

      {/* Progress Indicator - Horizontal */}
      <div className="flex justify-center mb-4 sm:mb-6">
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-md border border-gray-100/50 max-w-4xl w-full">
          <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-2 sm:gap-0 mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse"></div>
              <span className="text-sm sm:text-base font-medium text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Progress
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-center">
              <div className="flex items-center gap-1">
                <div className="text-base sm:text-lg font-bold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>{reviewsCompleted || 0}</div>
                <div className="text-xs text-gray-500" style={{ fontFamily: 'Poppins, sans-serif' }}>total</div>
              </div>
              <div className="h-4 sm:h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-1">
                <div className="text-base sm:text-lg font-bold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>{sessionReviews || 0}</div>
                <div className="text-xs text-gray-500" style={{ fontFamily: 'Poppins, sans-serif' }}>today</div>
              </div>
              <div className="h-4 sm:h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-1">
                <div className="text-base sm:text-lg font-bold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>{pendingRecordings?.length || 0}</div>
                <div className="text-xs text-gray-500" style={{ fontFamily: 'Poppins, sans-serif' }}>left</div>
              </div>
            </div>
          </div>
          
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs sm:text-sm font-medium text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>Review Progress</span>
              <span className="text-xs sm:text-sm text-gray-500" style={{ fontFamily: 'Poppins, sans-serif' }}>{Math.round(((reviewsCompleted || 0) / 10) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(((reviewsCompleted || 0) / 10) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div className="grid grid-cols-5 gap-2 sm:flex sm:justify-center sm:gap-3">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="flex flex-col items-center space-y-1">
                <div className={`
                  w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-md
                  ${num <= reviewsCompleted 
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white ring-2 ring-blue-100" 
                    : "bg-gray-100 text-gray-400 border"
                  }
                `}>
                  {num <= reviewsCompleted ? (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : num === reviewsCompleted + 1 ? (
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></div>
                  ) : (
                    num
                  )}
                </div>
                <div className="text-xs font-medium text-gray-600 hidden sm:block" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {num <= reviewsCompleted ? "Done" : num === reviewsCompleted + 1 ? "Now" : "Next"}
            </div>
            </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 items-stretch">
        {/* Left Sidebar - Instructions (Hidden on mobile, visible on large screens) */}
        <div className="hidden lg:block lg:col-span-1 flex">
          <div className="bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50 backdrop-blur-sm rounded-3xl p-5 shadow-xl border border-white/20 sticky top-4 w-full flex flex-col h-[380px]">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent tracking-wide" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                Review Guide
              </h3>
            </div>
            
            <div className="grid grid-cols-1 gap-2.5">
              <div className="group flex items-center space-x-2.5 p-2.5 rounded-xl bg-white/60 backdrop-blur-sm border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-md">
                <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Play className="w-2.5 h-2.5 text-white" />
                </div>
                <p className="text-xs font-semibold text-gray-800" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  Click play to listen
                </p>
              </div>

              <div className="group flex items-center space-x-2.5 p-2.5 rounded-xl bg-white/60 backdrop-blur-sm border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-md">
                <div className="w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-gray-800" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  Verify transcription
                </p>
              </div>

              <div className="group flex items-center space-x-2.5 p-2.5 rounded-xl bg-white/60 backdrop-blur-sm border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-md">
                <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Edit2 className="w-2.5 h-2.5 text-white" />
                </div>
                <p className="text-xs font-semibold text-gray-800" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  Edit if needed
                </p>
              </div>

              <div className="group flex items-center space-x-2.5 p-2.5 rounded-xl bg-white/60 backdrop-blur-sm border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-md">
                <div className="w-5 h-5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <SkipForward className="w-2.5 h-2.5 text-white" />
                </div>
                <p className="text-xs font-semibold text-gray-800" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  Skip if unclear
                </p>
              </div>

              <div className="group flex items-center space-x-2.5 p-2.5 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-200/50 hover:bg-green-500/20 transition-all duration-300 hover:shadow-md">
                <div className="w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
                <p className="text-xs font-semibold text-gray-800" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  Pass or Edited
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-4">
          <Card className="bg-white border-2 border-gray-200 shadow-2xl h-[380px] flex flex-col">
            <CardContent className="p-3 sm:p-4 flex flex-col h-full overflow-y-auto">
              {!currentRecording ? (
                // Empty State - No More Recordings
                <div className="text-center space-y-6 min-h-[250px] sm:min-h-[300px] lg:min-h-[400px] flex flex-col items-center justify-center">
                  <div className="text-center">
                    <Volume2 className="h-20 w-20 text-gray-300 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      🎉 Great Work!
                    </h2>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      You've completed all available recordings for review. New submissions will appear here when they're ready.
                    </p>
                    
                    {/* Session Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6 border border-blue-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        Session Summary
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {reviewsCompleted}
                          </div>
                          <div className="text-sm text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            Total Reviews (All Time)
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {sessionReviews}
                          </div>
                          <div className="text-sm text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            Reviews Today
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button 
                        onClick={loadPendingRecordings} 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        <Volume2 className="h-4 w-4 mr-2" />
                        Check for New Recordings
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => window.location.href = '/dashboard'}
                        className="px-6 py-3 rounded-xl"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        Return to Dashboard
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // Normal State - Recording Available
                <div className="text-center space-y-3 flex flex-col h-full">
                {/* Sentence Display - Fixed height container */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 h-[120px] flex items-center justify-center border-2 border-gray-300 shadow-md overflow-hidden">
                    <div className="w-full px-2 h-full flex flex-col">
                      {isEditingSentence ? (
                        <div className="space-y-2 w-full h-full flex flex-col">
                          <Textarea
                            value={editedSentence}
                            onChange={(e) => setEditedSentence(e.target.value)}
                            className="text-base sm:text-lg font-semibold text-gray-900 leading-relaxed tracking-wide h-[80px] resize-none w-full box-border flex-1 text-sm border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            style={{ fontFamily: 'Poppins, sans-serif' }}
                            placeholder="Edit the sentence to match what was recorded..."
                          />
                          <div className="flex justify-end gap-2 flex-shrink-0">
                            <Button
                              onClick={() => {
                                setIsEditingSentence(false)
                                setEditedSentence(currentRecording?.sentence || '')
                              }}
                              variant="outline"
                              size="sm"
                              className="h-7 px-3 text-xs border-gray-300 hover:bg-gray-100"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                if (editedSentence.trim()) {
                                  setIsEditingSentence(false)
                                  toast({
                                    title: "Sentence Updated",
                                    description: "The sentence has been updated. Submit your review to save changes.",
                                  })
                                }
                              }}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 h-7 px-3 text-xs shadow-sm"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 h-full">
                          <p className="text-base sm:text-lg font-semibold text-gray-900 leading-relaxed tracking-wide flex-1 text-center drop-shadow-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            {editedSentence || currentRecording.sentence}
                          </p>
                          <Button
                            onClick={() => {
                              setIsEditingSentence(true)
                              setEditedSentence(currentRecording.sentence)
                            }}
                            variant="ghost"
                            size="sm"
                            className="flex-shrink-0 hover:bg-gray-200 rounded-lg p-1.5 h-7 w-7 border border-gray-200"
                            title="Edit sentence"
                          >
                            <Edit2 className="h-3 w-3 text-gray-700" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>


                {/* Audio Player */}
                <div className="flex-1 flex items-center justify-center relative min-h-0 -mx-3 sm:-mx-4">
                  <div className="flex justify-between items-center w-full h-16">
                    {/* Left Waveform */}
                    <div className="flex items-center space-x-0.5 flex-1 justify-end pr-0">
                    {[...Array(30)].map((_, i) => (
                      <div
                        key={i}
                          className="w-0.5 rounded-full transition-all duration-300"
                        style={{
                            height: `${Math.sin(i * 0.2) * 10 + 15}px`,
                            backgroundColor: `rgba(59, 130, 246, ${1 - i * 0.02})`,
                            animationDelay: `${i * 0.03}s`,
                            boxShadow: isPlaying ? `0 0 6px rgba(59, 130, 246, ${0.5 - i * 0.01})` : 'none'
                        }}
                      />
                    ))}
                  </div>

                  <div className="relative flex-shrink-0">
                    {/* Glowing aura effect */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 blur-lg opacity-60 animate-pulse"></div>
                    <Button
                      onClick={togglePlayback}
                      size="lg"
                      className={`
                          relative h-14 w-14 rounded-full bg-white shadow-xl transition-all duration-300 transform hover:scale-105 hover:shadow-blue-500/30 border-2 border-blue-100 hover:border-blue-300 group aspect-square
                        ${isPlaying ? 'animate-pulse' : ''}
                        ${!currentRecording?.audio_url ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                      disabled={!currentRecording?.audio_url || audioLoading}
                    >
                      {audioLoading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      ) : isPlaying ? (
                          <Pause className="h-5 w-5 text-blue-500 group-hover:text-blue-600" />
                      ) : (
                          <Play className="h-5 w-5 text-blue-500 group-hover:text-blue-600" />
                      )}
                    </Button>
                  </div>

                    {/* Right Waveform */}
                    <div className="flex items-center space-x-0.5 flex-1 justify-start pl-0">
                    {[...Array(30)].map((_, i) => (
                      <div
                        key={i}
                          className="w-0.5 rounded-full transition-all duration-300"
                        style={{
                            height: `${Math.sin(i * 0.2) * 10 + 15}px`,
                            backgroundColor: `rgba(147, 51, 234, ${1 - i * 0.02})`,
                            animationDelay: `${i * 0.03}s`,
                            boxShadow: isPlaying ? `0 0 6px rgba(147, 51, 234, ${0.5 - i * 0.01})` : 'none'
                        }}
                      />
                    ))}
                    </div>
                  </div>
                </div>
                
                {/* Hidden audio element for playback */}
                <audio
                  ref={audioRef}
                  onEnded={handleAudioEnded}
                  onError={handleAudioError}
                  className="hidden"
                  controls={false}
                  preload="metadata"
                />

                {/* Validation Buttons */}
                <div className="space-y-3 flex-shrink-0">
                  {!hasListenedToEnd && (
                    <div className="bg-amber-100 border-2 border-amber-400 rounded-lg p-3 text-center shadow-sm">
                      <p className="text-sm text-amber-900 font-semibold flex items-center justify-center gap-2">
                        <span className="text-lg">⚠️</span>
                        <span>Please listen to the entire audio before submitting</span>
                      </p>
                    </div>
                  )}
                  
                  <div className="flex justify-center px-4 sm:px-0 gap-3">
                    {editedSentence.trim() !== currentRecording.sentence.trim() && editedSentence.trim() ? (
                      <Button
                        onClick={() => handleValidation(true)}
                        size="default"
                        disabled={!hasListenedToEnd}
                        className={`flex items-center gap-2 h-auto py-3 px-8 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 touch-manipulation min-w-[200px] font-semibold text-lg border-2 border-purple-500 ${
                          !hasListenedToEnd ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
                        }`}
                      >
                        <Edit2 className="h-5 w-5" />
                        <span>Edited</span>
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleValidation(true)}
                        size="default"
                        disabled={!hasListenedToEnd}
                        className={`flex items-center gap-2 h-auto py-3 px-8 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 touch-manipulation min-w-[200px] font-semibold text-lg border-2 border-green-500 ${
                          !hasListenedToEnd ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
                        }`}
                      >
                        <Check className="h-5 w-5" />
                        <span>Pass</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>


      {/* Guidelines Dialog */}
      <Dialog open={showGuidelines} onOpenChange={setShowGuidelines}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-2xl">
              <HelpCircle className="h-6 w-6 text-blue-500" />
              <span>Review Guidelines</span>
            </DialogTitle>
            <DialogDescription className="text-base">
              Follow these guidelines to validate and correct transcriptions accurately
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            <div className="space-y-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-blue-500">●</span>
                Transcription Validation
              </h3>
              <ul className="space-y-3 text-base text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Listen to the entire recording carefully</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Read the displayed transcription while listening</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Compare what you hear with what the sentence says</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Replay if needed to confirm accuracy</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4 bg-green-50/50 p-4 rounded-lg border border-green-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-green-500">●</span>
                Click "Pass"
              </h3>
              <ul className="space-y-3 text-base text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span>The audio matches the transcription perfectly</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span>Every word in the transcription was spoken correctly</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span>No words were omitted, added, or changed</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span>Click the green "Pass" button when verified</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4 bg-purple-50/50 p-4 rounded-lg border border-purple-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-purple-500">●</span>
                Edit Transcription
              </h3>
              <ul className="space-y-3 text-base text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>If the audio doesn't match the text, click the edit button (pencil icon)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Correct the transcription to match what was actually spoken</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Fix spelling errors, omissions, or incorrect words</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Click "Save" to confirm your edits, then click the purple "Edited" button</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4 bg-orange-50/50 p-4 rounded-lg border border-orange-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-orange-500">●</span>
                Best Practices
              </h3>
              <ul className="space-y-3 text-base text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Be precise - every word matters</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Listen multiple times if unsure</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Consider accent and dialect variations</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Skip if you absolutely can't understand the audio</span>
                </li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skipped Recordings Dialog */}
      <Dialog open={showSkippedRecordings} onOpenChange={setShowSkippedRecordings}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <SkipForward className="h-6 w-6 text-orange-600" />
              Skipped Recordings
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              You can return to any skipped recording to review it. Click "Restore" to add it back to your review list.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {skippedRecordings.length === 0 ? (
              <div className="text-center py-8">
                <SkipForward className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No skipped recordings yet.</p>
              </div>
            ) : (
              skippedRecordings.map((recording) => (
                <Card key={recording.id} className="border border-gray-200 hover:border-orange-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                          {recording.sentence || "No sentence available"}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Duration: {recording.duration?.toFixed(1) || 'N/A'}s</span>
                          <span>Created: {new Date(recording.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => restoreSkippedRecording(recording)}
                        variant="outline"
                        size="sm"
                        className="bg-orange-50 hover:bg-orange-100 border-orange-300 text-orange-700 hover:text-orange-800 flex items-center gap-2 whitespace-nowrap"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          
          <DialogFooter>
            <Button
              onClick={() => setShowSkippedRecordings(false)}
              variant="outline"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer - Action Buttons */}
      <div className="mt-4 sm:mt-6 border-t border-gray-200 pt-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Left side buttons */}
          <div className="flex gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-start">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-gray-600 hover:text-gray-900 rounded-xl px-3 sm:px-4 py-2 text-sm touch-manipulation"
              onClick={() => setShowGuidelines(true)}
            >
              <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Guidelines</span>
              <span className="sm:hidden">Guide</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-600 hover:text-gray-900 rounded-xl px-3 sm:px-4 py-2 text-sm touch-manipulation"
            >
              <Flag className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Report Issue</span>
              <span className="sm:hidden">Report</span>
            </Button>
            {skippedRecordings.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-orange-600 hover:text-orange-900 rounded-xl px-3 sm:px-4 py-2 text-sm touch-manipulation"
                onClick={() => setShowSkippedRecordings(true)}
              >
                <List className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Skipped ({skippedRecordings.length})</span>
                <span className="sm:hidden">Skipped</span>
              </Button>
            )}
          </div>

          {/* Right side navigation buttons */}
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto justify-center">
            <Button
              onClick={goToPreviousRecording}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-gray-50 border-gray-200 rounded-xl px-3 sm:px-4 py-2 text-sm touch-manipulation active:scale-95 transition-transform"
              disabled={recordingHistory.length === 0 || recordingHistory.every(r => reviewedRecordingIds.has(r.id))}
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-1" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            
            <Button
              onClick={goToNextRecording}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-gray-50 border-gray-200 rounded-xl px-3 sm:px-4 py-2 text-sm touch-manipulation active:scale-95 transition-transform"
              disabled={pendingRecordings.length <= 1}
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 sm:ml-1" />
            </Button>

            <Button
              onClick={skipRecording}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-gray-50 border-gray-200 rounded-xl px-4 sm:px-6 py-2 text-sm touch-manipulation active:scale-95 transition-transform"
            >
              <SkipForward className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              Skip
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
