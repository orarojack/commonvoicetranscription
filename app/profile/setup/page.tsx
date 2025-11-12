"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/database"
import { User, AlertCircle } from "lucide-react"
import { TopNavigation } from "@/components/top-navigation"



export default function ProfileSetupPage() {
  const { user, updateProfile, isLoading } = useAuth()
  const router = useRouter()
  const DEFAULT_LANGUAGE = "Somali"
  const DEFAULT_DIALECT = "MAXATIRI"

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    idNumber: "",
    location: "",
    constituency: "",
    accentDialect: DEFAULT_DIALECT,
    educationalBackground: "",
    employmentStatus: "",
    phoneNumber: "",
    joinMailingList: false,
  })
  const [loadingUserData, setLoadingUserData] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    idNumber?: string
    phoneNumber?: string
  }>({})

  // Kenya Counties to Constituencies mapping
  const countyConstituencies: Record<string, string[]> = {
    "nairobi": ["Dagoretti North", "Dagoretti South", "Embakasi Central", "Embakasi East", "Embakasi North", "Embakasi South", "Embakasi West", "Kamukunji", "Kasarani", "Kibra", "Lang'ata", "Makadara", "Mathare", "Roysambu", "Ruaraka", "Starehe", "Westlands"],
    "mombasa": ["Changamwe", "Jomba", "Kisauni", "Likoni", "Mvita", "Nyali"],
    "kwale": ["Kinango", "Lunga Lunga", "Matuga", "Msambweni"],
    "kilifi": ["Ganze", "Kaloleni", "Kilifi North", "Kilifi South", "Magarini", "Malindi", "Rabai"],
    "tana-river": ["Bura", "Galole", "Garsen"],
    "lamu": ["Lamu East", "Lamu West"],
    "taita-taveta": ["Mwatate", "Taveta", "Voi", "Wundanyi"],
    "garissa": ["Balambala", "Dadaab", "Fafi", "Garissa Township", "Ijara", "Lagdera"],
    "wajir": ["Eldas", "Tarbaj", "Wajir East", "Wajir North", "Wajir South", "Wajir West"],
    "mandera": ["Banissa", "Lafey", "Mandera East", "Mandera North", "Mandera South", "Mandera West"],
    "marsabit": ["Laisamis", "Moyale", "North Horr", "Saku"],
    "isiolo": ["Isiolo North", "Isiolo South"],
    "meru": ["Buuri", "Igembe Central", "Igembe North", "Igembe South", "Imenti Central", "Imenti North", "Imenti South", "Tigania East", "Tigania West"],
    "tharaka-nithi": ["Chuka/Igambang'ombe", "Maara", "Tharaka"],
    "embu": ["Manyatta", "Mbeere North", "Mbeere South", "Runyenjes"],
    "kitui": ["Kitui Central", "Kitui East", "Kitui Rural", "Kitui South", "Kitui West", "Mwingi Central", "Mwingi North", "Mwingi West"],
    "machakos": ["Kathiani", "Machakos Town", "Masinga", "Matungulu", "Mavoko", "Mwala", "Yatta"],
    "makueni": ["Kaiti", "Kibwezi East", "Kibwezi West", "Kilome", "Makueni", "Mbooni"],
    "nyandarua": ["Kinangop", "Kipipiri", "Ndaragwa", "Ol Joro Oirowa", "Ol Kalou"],
    "nyeri": ["Kieni", "Mathira", "Mukurweini", "Nyeri Town", "Othaya", "Tetu"],
    "kirinyaga": ["Gichugu", "Kirinyaga Central", "Mwea", "Ndia"],
    "muranga": ["Kandara", "Kangema", "Kigumo", "Kiharu", "Mathioya"],
    "kiambu": ["Gatundu North", "Gatundu South", "Githunguri", "Juja", "Kabete", "Kiambaa", "Kiambu", "Kikuyu", "Limuru", "Ruiru", "Thika Town", "Lari"],
    "turkana": ["Loima", "Turkana Central", "Turkana East", "Turkana North", "Turkana South", "Turkana West"],
    "west-pokot": ["Kacheliba", "Kapenguria", "Pokot South", "Sigor"],
    "samburu": ["Samburu East", "Samburu North", "Samburu West"],
    "trans-nzoia": ["Cherangany", "Endebess", "Kwanza", "Saboti"],
    "uasin-gishu": ["Ainabkoi", "Kapseret", "Kesses", "Moiben", "Soy", "Turbo"],
    "elgeyo-marakwet": ["Keiyo North", "Keiyo South", "Marakwet East", "Marakwet West"],
    "nandi": ["Aldai", "Chesumei", "Emgwen", "Mosop", "Nandi Hills", "Tinderet"],
    "baringo": ["Baringo Central", "Baringo North", "Baringo South", "Eldama Ravine", "Mogotio", "Tiaty"],
    "laikipia": ["Laikipia East", "Laikipia North", "Laikipia West"],
    "nakuru": ["Bahati", "Gilgil", "Kuresoi North", "Kuresoi South", "Molo", "Naivasha", "Nakuru Town East", "Nakuru Town West", "Njoro", "Rongai", "Subukia"],
    "narok": ["Narok East", "Narok North", "Narok South", "Narok West"],
    "kajiado": ["Kajiado North", "Kajiado Central", "Kajiado East", "Kajiado South", "Kajiado West"],
    "kericho": ["Ainamoi", "Belgut", "Bureti", "Kipkelion East", "Kipkelion West", "Sigowet/Soin"],
    "bomet": ["Bomet Central", "Bomet East", "Chepalungu", "Konoin", "Sotik"],
    "kakamega": ["Butere", "Ikolomani", "Khwisero", "Likuyani", "Lugari", "Lurambi", "Malava", "Matungu", "Mumias East", "Mumias West", "Navakholo", "Shinyalu"],
    "vihiga": ["Emuhaya", "Hamisi", "Luanda", "Sabatia", "Vihiga"],
    "bungoma": ["Bumula", "Kabuchai", "Kanduyi", "Kimilili", "Mt. Elgon", "Sirisia", "Tongaren", "Webuye East", "Webuye West"],
    "busia": ["Budalangi", "Butula", "Funyula", "Nambale", "Teso North", "Teso South"],
    "siaya": ["Alego Usonga", "Bondo", "Gem", "Rarieda", "Ugenya", "Ugunja"],
    "kisumu": ["Kisumu Central", "Kisumu East", "Kisumu West", "Muhoroni", "Nyakach", "Nyando", "Seme"],
    "homa-bay": ["Homa Bay Town", "Kabondo Kasipul", "Karachuonyo", "Kasipul", "Mbita", "Ndhiwa", "Rangwe", "Suba"],
    "migori": ["Awendo", "Kuria East", "Kuria West", "Nyatike", "Rongo", "Suna East", "Suna West", "Uriri"],
    "kisii": ["Bobasi", "Bomachoge Borabu", "Bomachoge Chache", "Bonchari", "Kitutu Chache North", "Kitutu Chache South", "Nyaribari Chache", "Nyaribari Masaba", "South Mugirango"],
    "nyamira": ["Borabu", "Kitutu Masaba", "North Mugirango", "West Mugirango"]
  }


  // Get constituencies for selected county
  const getConstituencies = () => {
    return formData.location ? countyConstituencies[formData.location] || [] : []
  }

  // Handle county change - reset constituency when county changes
  const handleCountyChange = (value: string) => {
    setFormData((prev) => ({ ...prev, location: value, constituency: "" }))
  }

  // Load existing user data and handle redirects
  useEffect(() => {
    console.log("Profile setup - Auth state:", { 
      isLoading, 
      user: user ? { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        status: user.status,
        profile_complete: user.profile_complete 
      } : null 
    })
    
    if (!isLoading && !user) {
      console.log("Profile setup - No user found, redirecting to signin")
      router.push("/auth/signin")
    } else if (!isLoading && user && user.role === "reviewer" && user.status === "pending") {
      console.log("Profile setup - Reviewer not approved yet, redirecting to signin")
      router.push("/auth/signin")
    } else if (!isLoading && user && user.role === "reviewer" && user.profile_complete) {
      // Reviewer with complete profile - skip setup and go to listen page
      console.log("Profile setup - Reviewer already has complete profile, redirecting to listen")
      router.push("/listen")
    } else if (!isLoading && user) {
      // Load existing user data into form fields
      console.log("Profile setup - Loading existing user data:", user)
      
      // Fetch complete user data from database to get all demographic fields
      const loadUserData = async () => {
        setLoadingUserData(true)
        try {
          const fullUserData = await db.getUserById(user.id)
          if (fullUserData) {
            console.log("Profile setup - Full user data from database:", fullUserData)
            setFormData(prevData => ({
              ...prevData,
              name: fullUserData.name || "",
              age: fullUserData.age || "",
              gender: fullUserData.gender || "",
              idNumber: (fullUserData as any).id_number || "",
              location: fullUserData.location || "",
              constituency: (fullUserData as any).constituency || "",
              accentDialect: DEFAULT_DIALECT,
              educationalBackground: fullUserData.educational_background || "",
              employmentStatus: fullUserData.employment_status || "",
              phoneNumber: fullUserData.phone_number || "",
              joinMailingList: false,
            }))
            // If profile is complete, assume they've already accepted consent and license
            if (fullUserData.profile_complete) {
              // setConsentAccepted(true) // Removed as per edit hint
              // setLicenseAccepted(true) // Removed as per edit hint
            }
          } else {
            // Fallback to AuthProvider data if database fetch fails
            setFormData(prevData => ({
              ...prevData,
              name: user.name || "",
              age: user.age || "",
              gender: user.gender || "",
            }))
            if (user.profile_complete) {
              // setConsentAccepted(true) // Removed as per edit hint
              // setLicenseAccepted(true) // Removed as per edit hint
            }
          }
        } catch (error) {
          console.error("Error loading user data from database:", error)
          // Fallback to AuthProvider data
          setFormData(prevData => ({
            ...prevData,
            name: user.name || "",
            age: user.age || "",
            gender: user.gender || "",
          }))
          if (user.profile_complete) {
            // setConsentAccepted(true) // Removed as per edit hint
            // setLicenseAccepted(true) // Removed as per edit hint
          }
        } finally {
          setLoadingUserData(false)
        }
      }
      
      loadUserData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]) // Removed router from dependencies to prevent infinite loop

  // Show loading state while checking authentication or loading user data
  if (isLoading || loadingUserData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-20 animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">
              {isLoading ? "Setting up your workspace..." : "Loading your profile..."}
            </h3>
            <p className="text-sm text-gray-600 max-w-sm mx-auto">
              We're preparing everything for you. This will just take a moment.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show error if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-800">Authentication Required</h3>
            <p className="text-gray-600">
              Please sign in to access your profile setup.
            </p>
            <p className="text-sm text-gray-500">
              If you're a new reviewer, make sure you've been approved by an admin.
            </p>
          </div>
          <Button 
            onClick={() => router.push("/auth/signin")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Go to Sign In
          </Button>
        </div>
      </div>
    )
  }


  // Validate unique fields
  const validateUniqueFields = async (): Promise<boolean> => {
    const errors: { idNumber?: string; phoneNumber?: string } = {}

    // Check ID Number uniqueness
    if (formData.idNumber) {
      const idExists = await db.checkIdNumberExists(formData.idNumber, user?.id)
      if (idExists) {
        errors.idNumber = "This ID number is already registered by another user"
      }
    }

    // Check Phone Number uniqueness
    if (formData.phoneNumber) {
      const phoneExists = await db.checkPhoneNumberExists(formData.phoneNumber, user?.id)
      if (phoneExists) {
        errors.phoneNumber = "This phone number is already registered by another user"
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate unique fields first
    const isValid = await validateUniqueFields()
    if (!isValid) {
      return
    }

    setIsSubmitting(true)
    
    try {
      // Store the current user role before updating
      const currentUserRole = user?.role
      console.log("Current user role:", currentUserRole)
      
      await updateProfile({
        name: formData.name,
        age: formData.age,
        gender: formData.gender,
        id_number: formData.idNumber,
        location: formData.location,
        constituency: formData.constituency,
        language_dialect: DEFAULT_DIALECT,
        accent_dialect: DEFAULT_DIALECT,
        accent_description: DEFAULT_DIALECT,
        educational_background: formData.educationalBackground,
        employment_status: formData.employmentStatus,
        phone_number: formData.phoneNumber,
        profile_complete: true,
        languages: [DEFAULT_LANGUAGE],
      } as any)
      
      console.log("Profile updated successfully, redirecting to:", currentUserRole)
      
      // Small delay to show success state
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Redirect based on the stored user role
      if (currentUserRole === "reviewer") {
        console.log("Redirecting reviewer to /listen")
        router.push("/listen")
      } else if (currentUserRole === "admin") {
        console.log("Redirecting admin to /admin")
        router.push("/admin")
      } else {
        console.log("Redirecting to /dashboard")
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      setIsSubmitting(false)
    }
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <TopNavigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white border shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="font-bold text-base text-gray-900">Build Profile</span>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1 text-sm">Enhanced Accuracy</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">Complete your profile to improve speech recognition accuracy and get better results.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1 text-sm">AI Training</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">Your information helps train better AI models for improved voice recognition.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1 text-sm">Privacy First</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">All data is handled according to Africa Next Voices's privacy policy with complete transparency.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium text-gray-900">Quick Setup</span>
                  </div>
                  <p className="text-xs text-gray-600">This will only take a few minutes to complete your profile setup.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="bg-white border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Profile</CardTitle>
                <CardDescription className="text-base">
                  Thanks for confirming your account, now let's build your profile. By providing some information about
                  yourself, the audio data you submit to Africa Next Voices will be more useful to Speech Recognition engines
                  that use this data to improve their accuracy.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-bold">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="JackOraro"
                    className="h-10 rounded-lg w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visibility" className="text-sm font-bold">
                    Leaderboard Visibility
                  </Label>
                  <Select defaultValue="visible">
                    <SelectTrigger className="h-10 rounded-lg w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visible">Visible</SelectItem>
                      <SelectItem value="hidden">Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ID Number */}
              <div className="space-y-2">
                <Label htmlFor="idNumber" className="text-sm font-bold">
                  National ID Number *
                </Label>
                <Input
                  id="idNumber"
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, idNumber: e.target.value }))
                    setValidationErrors((prev) => ({ ...prev, idNumber: undefined }))
                  }}
                  placeholder="Enter your ID number"
                  className={`h-10 rounded-lg w-full ${
                    validationErrors.idNumber ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  required
                />
                {validationErrors.idNumber && (
                  <p className="text-xs text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{validationErrors.idNumber}</span>
                  </p>
                )}
                <p className="text-xs text-gray-500">Your national ID number (unique identifier)</p>
              </div>

              {/* Age and Gender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-sm font-bold">
                    Age *
                  </Label>
                  <Select value={formData.age} onValueChange={(value) => setFormData((prev) => ({ ...prev, age: value }))}>
                    <SelectTrigger className="h-10 rounded-lg w-full">
                      <SelectValue placeholder="19 - 29" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under-19">Under 19</SelectItem>
                      <SelectItem value="19-29">19 - 29</SelectItem>
                      <SelectItem value="30-39">30 - 39</SelectItem>
                      <SelectItem value="40-49">40 - 49</SelectItem>
                      <SelectItem value="50-59">50 - 59</SelectItem>
                      <SelectItem value="60+">60+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-sm font-bold">
                    Sex or Gender *
                  </Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}>
                    <SelectTrigger className="h-10 rounded-lg w-full">
                      <SelectValue placeholder="Male/Masculine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male/Masculine</SelectItem>
                      <SelectItem value="female">Female/Feminine</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Additional Demographics */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Additional Demographics</h3>
                
                {/* Location, Constituency and Phone Number */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-bold">
                      Location (Kenyan Counties) *
                    </Label>
                    <Select value={formData.location} onValueChange={handleCountyChange}>
                      <SelectTrigger className="h-10 rounded-lg w-full">
                        <SelectValue placeholder="Select your county" />
                      </SelectTrigger>
                      <SelectContent>
                            <SelectItem value="mombasa">Mombasa</SelectItem>
                            <SelectItem value="kwale">Kwale</SelectItem>
                            <SelectItem value="kilifi">Kilifi</SelectItem>
                            <SelectItem value="tana-river">Tana River</SelectItem>
                            <SelectItem value="lamu">Lamu</SelectItem>
                            <SelectItem value="taita-taveta">Taita Taveta</SelectItem>
                            <SelectItem value="garissa">Garissa</SelectItem>
                            <SelectItem value="wajir">Wajir</SelectItem>
                            <SelectItem value="mandera">Mandera</SelectItem>
                            <SelectItem value="marsabit">Marsabit</SelectItem>
                            <SelectItem value="isiolo">Isiolo</SelectItem>
                            <SelectItem value="meru">Meru</SelectItem>
                            <SelectItem value="tharaka-nithi">Tharaka Nithi</SelectItem>
                            <SelectItem value="embu">Embu</SelectItem>
                            <SelectItem value="kitui">Kitui</SelectItem>
                            <SelectItem value="machakos">Machakos</SelectItem>
                            <SelectItem value="makueni">Makueni</SelectItem>
                            <SelectItem value="nyandarua">Nyandarua</SelectItem>
                            <SelectItem value="nyeri">Nyeri</SelectItem>
                            <SelectItem value="kirinyaga">Kirinyaga</SelectItem>
                            <SelectItem value="muranga">Murang'a</SelectItem>
                            <SelectItem value="kiambu">Kiambu</SelectItem>
                            <SelectItem value="turkana">Turkana</SelectItem>
                            <SelectItem value="west-pokot">West Pokot</SelectItem>
                            <SelectItem value="samburu">Samburu</SelectItem>
                            <SelectItem value="trans-nzoia">Trans Nzoia</SelectItem>
                            <SelectItem value="uasin-gishu">Uasin Gishu</SelectItem>
                            <SelectItem value="elgeyo-marakwet">Elgeyo Marakwet</SelectItem>
                            <SelectItem value="nandi">Nandi</SelectItem>
                            <SelectItem value="baringo">Baringo</SelectItem>
                            <SelectItem value="laikipia">Laikipia</SelectItem>
                            <SelectItem value="nakuru">Nakuru</SelectItem>
                            <SelectItem value="narok">Narok</SelectItem>
                            <SelectItem value="kajiado">Kajiado</SelectItem>
                            <SelectItem value="kericho">Kericho</SelectItem>
                            <SelectItem value="bomet">Bomet</SelectItem>
                            <SelectItem value="kakamega">Kakamega</SelectItem>
                            <SelectItem value="vihiga">Vihiga</SelectItem>
                            <SelectItem value="bungoma">Bungoma</SelectItem>
                            <SelectItem value="busia">Busia</SelectItem>
                            <SelectItem value="siaya">Siaya</SelectItem>
                            <SelectItem value="kisumu">Kisumu</SelectItem>
                            <SelectItem value="homa-bay">Homa Bay</SelectItem>
                            <SelectItem value="migori">Migori</SelectItem>
                            <SelectItem value="kisii">Kisii</SelectItem>
                            <SelectItem value="nyamira">Nyamira</SelectItem>
                            <SelectItem value="nairobi">Nairobi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                  <div className="space-y-2">
                    <Label htmlFor="constituency" className="text-sm font-bold">
                      Constituency *
                    </Label>
                    <Select 
                      value={formData.constituency} 
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, constituency: value }))}
                      disabled={!formData.location}
                    >
                      <SelectTrigger className="h-10 rounded-lg w-full disabled:opacity-50">
                        <SelectValue placeholder={formData.location ? "Select constituency" : "Select county first"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {getConstituencies().map((constituency) => (
                          <SelectItem key={constituency} value={constituency.toLowerCase().replace(/\s+/g, '-')}>
                            {constituency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.location && getConstituencies().length === 0 && (
                      <p className="text-xs text-amber-600">No constituencies available for this county</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-sm font-bold">
                      M-Pesa Phone Number *
                    </Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))
                        setValidationErrors((prev) => ({ ...prev, phoneNumber: undefined }))
                      }}
                      placeholder="+254 700 000 000"
                      className={`h-10 rounded-lg w-full ${
                        validationErrors.phoneNumber ? 'border-red-500 focus:border-red-500' : ''
                      }`}
                      required
                    />
                    {validationErrors.phoneNumber && (
                      <p className="text-xs text-red-600 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{validationErrors.phoneNumber}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-500">Your M-Pesa registered phone number</p>
                  </div>
                </div>
              </div>

              {/* Educational Background */}
              <div className="space-y-2">
                <Label htmlFor="educationalBackground" className="text-sm font-bold">
                  Educational Background *
                </Label>
                <Select value={formData.educationalBackground} onValueChange={(value) => setFormData((prev) => ({ ...prev, educationalBackground: value }))}>
                  <SelectTrigger className="h-10 rounded-lg w-full">
                    <SelectValue placeholder="Select your education level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="tertiary">Tertiary</SelectItem>
                    <SelectItem value="graduate">Graduate</SelectItem>
                    <SelectItem value="postgraduate">Postgraduate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Employment Status */}
              <div className="space-y-2">
                <Label htmlFor="employmentStatus" className="text-sm font-bold">
                  Employment Status *
                </Label>
                <Select value={formData.employmentStatus} onValueChange={(value) => setFormData((prev) => ({ ...prev, employmentStatus: value }))}>
                  <SelectTrigger className="h-10 rounded-lg w-full">
                    <SelectValue placeholder="Select your employment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employed">Employed</SelectItem>
                    <SelectItem value="self-employed">Self-employed</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="unemployed">Unemployed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Languages Section */}
              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-semibold">Languages</Label>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language" className="text-sm font-bold">
                      Language
                    </Label>
                    <Input value={DEFAULT_LANGUAGE} readOnly className="h-10 rounded-lg w-full bg-gray-100" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accentDialect" className="text-sm font-bold">
                      Dialect
                    </Label>
                    <Input value={DEFAULT_DIALECT} readOnly className="h-10 rounded-lg w-full bg-gray-100 uppercase" />
                    <p className="text-xs text-gray-500">
                      Dialect is fixed for all validators in this project
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Section */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="h-10 rounded-lg bg-gray-50 w-full"
                />
              </div>

              {/* Preferences */}
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="mailing-list"
                    checked={formData.joinMailingList}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, joinMailingList: checked as boolean }))
                    }
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="mailing-list" className="text-sm font-bold">
                      Join the Africa Next Voices mailing list
                    </Label>
                    <p className="text-xs text-gray-600">
                      Receive emails such as challenge and goal reminders, progress updates, and newsletters about
                      Africa Next Voices.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-lg text-base font-medium"
                disabled={
                  isSubmitting || 
                  !formData.name ||
                  !formData.idNumber ||
                  !formData.age ||
                  !formData.gender ||
                  !formData.location ||
                  !formData.constituency ||
                  !formData.phoneNumber ||
                  !formData.educationalBackground ||
                  !formData.employmentStatus
                }
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Saving Profile...</span>
                  </div>
                ) : (
                  "Save"
                )}
              </Button>
              
              {(
                !formData.name ||
                !formData.idNumber ||
                !formData.age ||
                !formData.gender ||
                !formData.location ||
                !formData.constituency ||
                !formData.phoneNumber ||
                !formData.educationalBackground ||
                !formData.employmentStatus
              ) && (
                <p className="text-xs text-red-500 mt-2 text-center">
                  Please fill in all required fields (marked with *)
                </p>
              )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
