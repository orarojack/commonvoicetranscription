"use client"

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { Loader2 } from 'lucide-react'

function GoogleCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signInWithGoogle, user } = useAuth()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')

        if (error) {
          console.error('Google authentication was cancelled or failed')
          router.replace('/auth/signup')
          return
        }

        // If already authenticated (e.g., page refresh), route immediately
        if (user) {
          if (!user.profile_complete) {
            router.push('/profile/setup')
          } else if (user.role === 'reviewer') {
            router.push('/listen')
          } else if (user.role === 'reviewer') {
            router.push('/listen')
          } else if (user.role === 'admin') {
            router.push('/admin')
          } else {
            router.push('/dashboard')
          }
          return
        }

        if (!code || !state) {
          console.error('Invalid Google callback parameters')
          router.replace('/auth/signup')
          return
        }

        let parsedState
        try {
          parsedState = JSON.parse(decodeURIComponent(state))
        } catch (e) {
          console.error('Invalid Google state parameter')
          router.replace('/auth/signup')
          return
        }

        const { role } = parsedState

        if (!role || role !== 'reviewer') {
          console.error('Invalid role specified')
          router.replace('/auth/signup')
          return
        }

        // Authenticate with Google (retry once if it fails)
        let result
        try {
          result = await signInWithGoogle(code, role)
        } catch (firstErr: any) {
          await new Promise(r => setTimeout(r, 600))
          result = await signInWithGoogle(code, role)
        }

        if (result.isNewUser) {
          if (result.user.role === "reviewer" && result.user.status === "pending") {
            // Reviewer needs approval - redirect to signup with modal flag
            router.push('/auth/signup?reviewer-pending=true')
          } else if (result.user.profile_complete) {
            // New user with complete profile (copied from other role) - skip setup
            if (result.user.role === "reviewer") {
              router.push('/listen')
            } else if (result.user.role === "admin") {
              router.push('/admin')
            } else {
              router.push('/dashboard')
            }
          } else {
            // New reviewer without complete profile - redirect to profile setup
            router.push('/profile/setup')
          }
        } else {
          // Existing user - redirect based on profile completion
          if (!result.user.profile_complete) {
            router.push('/profile/setup')
          } else {
            if (result.user.role === "reviewer") {
              router.push('/listen')
            } else if (result.user.role === "admin") {
              router.push('/admin')
            } else {
              router.push('/dashboard')
            }
          }
        }
      } catch (error: any) {
        console.error('Google OAuth callback error:', error)
        // As a final fallback, check if a session exists locally and route
        try {
          const raw = localStorage.getItem('cv_current_user')
          if (raw) {
            const u = JSON.parse(raw)
            if (!u.profile_complete) {
              router.push('/profile/setup')
            } else if (u.role === 'reviewer') {
              router.push('/listen')
            } else if (u.role === 'admin') {
              router.push('/admin')
            } else {
              router.push('/dashboard')
            }
            return
          }
        } catch {}
        router.replace('/auth/signup')
      }
    }

    handleCallback()
  }, [searchParams, signInWithGoogle, router, user])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Completing Google Authentication</h1>
        <p className="text-gray-600">Please wait while we sign you in...</p>
      </div>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h1>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  )
}
