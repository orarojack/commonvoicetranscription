"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useAuth } from "@/components/auth-provider"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { AlertCircle, CheckCircle, Loader2, Mail, Clock, Home, LogIn } from "lucide-react"
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthTextColor } from "@/lib/password-validation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

function SignUpPageContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<"reviewer">("reviewer")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showReviewerApprovalModal, setShowReviewerApprovalModal] = useState(false)
  const [googleOAuthAvailable, setGoogleOAuthAvailable] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: "",
    isValid: false,
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    }
  })
  const { signup, signInWithGoogle, signInWithGitHub } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if we should show the reviewer approval modal (e.g., from OAuth callback)
  useEffect(() => {
    const showModal = searchParams?.get('reviewer-pending')
    if (showModal === 'true') {
      setShowReviewerApprovalModal(true)
      // Clean up the URL
      router.replace('/auth/signup', { scroll: false })
    }
  }, [searchParams, router])

  // Auto-close modal and redirect after 5 seconds
  useEffect(() => {
    if (showReviewerApprovalModal) {
      const timer = setTimeout(() => {
        setShowReviewerApprovalModal(false)
        router.push("/auth/signin")
      }, 5000) // 5 seconds

      // Cleanup timer if component unmounts or modal is closed manually
      return () => clearTimeout(timer)
    }
  }, [showReviewerApprovalModal, router])

  const validateForm = () => {
    if (!email.trim()) {
      setError("Email is required")
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      return false
    }

    if (!password) {
      setError("Password is required")
      return false
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      setError(`Password requirements not met: ${passwordValidation.feedback}`)
      return false
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return false
    }

    return true
  }

  // Handle password change and update strength
  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword)
    const validation = validatePassword(newPassword)
    setPasswordStrength(validation)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      // Use AuthProvider's signup function to ensure proper state management
      await signup(email.toLowerCase().trim(), password, role)
      
      if (role === "reviewer") {
        // Reviewer needs approval - show modal instead of auto-redirect
        setShowReviewerApprovalModal(true)
        // Clear form after successful signup
        setEmail("")
        setPassword("")
        setConfirmPassword("")
        setPasswordStrength({
          score: 0,
          feedback: "",
          isValid: false,
          requirements: {
            length: false,
            uppercase: false,
            lowercase: false,
            number: false,
            special: false
          }
        })
      } else {
        // Reviewer account created successfully, redirect will happen automatically
        setSuccess("Account created successfully! Redirecting to profile setup...")
        
        // Redirect to home page, which will automatically redirect to profile setup
        setTimeout(() => {
          router.push("/")
        }, 2000)
      }
    } catch (error: any) {
      console.error("Signup error:", error)
      
      // Check if this is the expected reviewer approval error
      // The signup function throws an error for reviewers (by design) - account is created but needs approval
      if (role === "reviewer" && (
        error.message?.includes("Reviewer account created successfully") || 
        error.message?.includes("admin approval")
      )) {
        // This is the expected error - account was created, just needs approval
        setShowReviewerApprovalModal(true)
        // Clear form after successful signup
        setEmail("")
        setPassword("")
        setConfirmPassword("")
        setPasswordStrength({
          score: 0,
          feedback: "",
          isValid: false,
          requirements: {
            length: false,
            uppercase: false,
            lowercase: false,
            number: false,
            special: false
          }
        })
      } else {
        // Actual error occurred
        setError(error.message || "Failed to create account. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true)
      setError("")
      setSuccess("")

      // Redirect to Google OAuth
      const googleAuthUrl = `https://accounts.google.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/google/callback')}&response_type=code&scope=openid email profile&state=${encodeURIComponent(JSON.stringify({ role, type: 'signup' }))}`
      
      window.location.href = googleAuthUrl
    } catch (error: any) {
      console.error("Google OAuth error:", error)
      setError("Google authentication is not available. Please use email/password signup.")
      setIsLoading(false)
    }
  }

  const handleGitHubSignUp = async () => {
    try {
      setIsLoading(true)
      setError("")
      setSuccess("")

      // Redirect to GitHub OAuth
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}&scope=user:email&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/github/callback')}&state=${encodeURIComponent(JSON.stringify({ role, type: 'signup' }))}`
      
      window.location.href = githubAuthUrl
    } catch (error: any) {
      console.error("GitHub OAuth error:", error)
      setError("GitHub authentication is not available. Please use email/password signup.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Africa Next Voices
          </h1>
          <p className="text-gray-600 mt-2">Join the voice data revolution</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm animate-slide-up">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-gray-900">Create Account</CardTitle>
            <CardDescription className="text-gray-600">Join the Africa Next Voices community and help build the future of voice technology</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full h-12 px-4 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="role" className="text-sm font-medium text-gray-700">Account Type</Label>
                <div className="w-full h-14 px-4 border border-gray-200 rounded-xl bg-purple-50 flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Reviewer</div>
                    <div className="text-xs text-gray-500">Validate recordings</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">You will be signing up as a reviewer. Admin approval is required.</p>
              </div>

              {role === "reviewer" && (
                <Alert className="border-amber-200 bg-amber-50/50 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>Reviewer accounts require admin approval.</strong> After signing up, you'll need to wait for an admin to approve your account before you can access the system. You'll receive an email notification when your account is approved.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                <PasswordInput
                  id="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={8}
                  className="w-full h-12 px-4 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                {password && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${getPasswordStrengthTextColor(passwordStrength.score)}`}>
                        {passwordStrength.feedback}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <p className="font-medium mb-1">Password must contain:</p>
                      <ul className="space-y-1">
                        <li className={`flex items-center ${passwordStrength.requirements?.length ? 'text-green-600' : 'text-gray-500'}`}>
                          <span className="mr-2">{passwordStrength.requirements?.length ? '✓' : '○'}</span>
                          At least 8 characters
                        </li>
                        <li className={`flex items-center ${passwordStrength.requirements?.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                          <span className="mr-2">{passwordStrength.requirements?.uppercase ? '✓' : '○'}</span>
                          One uppercase letter (A-Z)
                        </li>
                        <li className={`flex items-center ${passwordStrength.requirements?.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                          <span className="mr-2">{passwordStrength.requirements?.lowercase ? '✓' : '○'}</span>
                          One lowercase letter (a-z)
                        </li>
                        <li className={`flex items-center ${passwordStrength.requirements?.number ? 'text-green-600' : 'text-gray-500'}`}>
                          <span className="mr-2">{passwordStrength.requirements?.number ? '✓' : '○'}</span>
                          One number (0-9)
                        </li>
                        <li className={`flex items-center ${passwordStrength.requirements?.special ? 'text-green-600' : 'text-gray-500'}`}>
                          <span className="mr-2">{passwordStrength.requirements?.special ? '✓' : '○'}</span>
                          One special character (!@#$%^&*)
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full h-12 px-4 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <Separator className="bg-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-gray-500 font-medium">or continue with</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-12 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 hover:text-gray-900 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
              >
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <Button
                variant="outline"
                className="w-full h-12 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 hover:text-gray-900 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                onClick={handleGitHubSignUp}
                disabled={isLoading}
              >
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Continue with GitHub
              </Button>
            </div>



            <div className="text-center pt-4">
              <Link href="/auth/signin" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200">
                Already have an account? <span className="underline">Sign in</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviewer Approval Pending Modal */}
      <Dialog open={showReviewerApprovalModal} onOpenChange={setShowReviewerApprovalModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4">
              <Mail className="w-8 h-8 text-purple-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-gray-900">
              Account Created Successfully!
            </DialogTitle>
            <DialogDescription className="text-center pt-4 space-y-3">
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-purple-900 mb-2">
                      Your reviewer account is pending admin approval
                    </p>
                    <p className="text-sm text-purple-700 leading-relaxed">
                      Please keep checking your email inbox. You will receive a notification when an admin approves your account. 
                      This usually takes 24-48 hours.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      What to expect:
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                      <li>Email notification when your account is approved</li>
                      <li>Email notification if your account needs changes</li>
                      <li>You can sign in once approved</li>
                    </ul>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowReviewerApprovalModal(false)
                router.push("/")
              }}
              className="w-full sm:w-auto flex items-center justify-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span>Go to Homepage</span>
            </Button>
            <Button
              onClick={() => {
                setShowReviewerApprovalModal(false)
                router.push("/auth/signin")
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center justify-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SignUpPage() {
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
      <SignUpPageContent />
    </Suspense>
  )
}
