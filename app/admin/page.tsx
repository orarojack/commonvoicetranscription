"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Search,
  UserCheck,
  UserX,
  Mail,
  Users,
  Clock,
  Mic,
  Headphones,
  TrendingUp,
  Activity,
  Trash2,
  Eye,
  Play,
  Pause,
  Volume2,
  Download,
  RefreshCw,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { db, type User, type UserStats, type Recording, type Review } from "@/lib/database"
import { sendEmailNotification, generateApprovalEmail, generateRejectionEmail } from "@/lib/email"
import { useToast } from "@/hooks/use-toast"
import { mozillaApi } from "@/lib/mozilla-api"

// Utility function to format time in hours, minutes, and seconds
const formatTime = (totalSeconds: number): string => {
  if (totalSeconds < 1) {
    return "0h 0m 0s"
  }
  
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  
  // Always show the full format: hours, minutes, seconds
  return `${hours}h ${minutes}m ${seconds}s`
}

// Smart pagination component
const renderPaginationButtons = (
  currentPage: number,
  totalPages: number,
  onPageChange: (page: number) => void
) => {
  const maxVisiblePages = 7
  const pages = []
  
  if (totalPages <= maxVisiblePages) {
    // Show all pages if total is small
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(i)}
          className="w-8 h-8 p-0"
        >
          {i}
        </Button>
      )
    }
  } else {
    // Smart pagination with ellipsis
    const current = currentPage
    const total = totalPages
    
    // Always show first page
    pages.push(
      <Button
        key={1}
        variant={current === 1 ? "default" : "outline"}
        size="sm"
        onClick={() => onPageChange(1)}
        className="w-8 h-8 p-0"
      >
        1
      </Button>
    )
    
    // Show ellipsis if current page is far from start
    if (current > 4) {
      pages.push(
        <span key="ellipsis1" className="px-2 text-gray-500">...</span>
      )
    }
    
    // Show pages around current page
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== total) {
        pages.push(
          <Button
            key={i}
            variant={current === i ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(i)}
            className="w-8 h-8 p-0"
          >
            {i}
          </Button>
        )
      }
    }
    
    // Show ellipsis if current page is far from end
    if (current < total - 3) {
      pages.push(
        <span key="ellipsis2" className="px-2 text-gray-500">...</span>
      )
    }
    
    // Always show last page
    if (total > 1) {
      pages.push(
        <Button
          key={total}
          variant={current === total ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(total)}
          className="w-8 h-8 p-0"
        >
          {total}
        </Button>
      )
    }
  }
  
  return pages
}

// Mozilla Upload Section Component
function MozillaUploadSection() {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [batchUploading, setBatchUploading] = useState(false)
  const [mozillaStats, setMozillaStats] = useState({
    totalApproved: 0,
    uploadedToMozilla: 0,
    pendingUpload: 0,
    uploadPercentage: 0,
  })
  const [uploadResults, setUploadResults] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [pendingRecordings, setPendingRecordings] = useState<any[]>([])
  const [uploadedRecordings, setUploadedRecordings] = useState<any[]>([])
  const [loadingPending, setLoadingPending] = useState(false)
  const [loadingUploaded, setLoadingUploaded] = useState(false)
  const [activeView, setActiveView] = useState<'pending' | 'uploaded'>('pending')

  // Helper function to convert age to Mozilla format
  const convertAgeToMozillaFormat = (age: string | number): string => {
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
    return age.toString()
  }

  // Helper function to convert gender to Mozilla format
  const convertGenderToMozillaFormat = (gender: string): string => {
    if (!gender) return ''
    
    const lowerGender = gender.toLowerCase()
    
    if (lowerGender.includes('male') && !lowerGender.includes('female')) {
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
    
    return gender
  }

  // Load Mozilla upload stats
  const loadMozillaStats = async () => {
    try {
      const stats = await db.getMozillaUploadStats()
      setMozillaStats(stats)
    } catch (error) {
      console.error("Error loading Mozilla stats:", error)
      toast({
        title: "Error",
        description: "Failed to load Mozilla upload statistics",
        variant: "destructive",
      })
    }
  }

  // Load pending recordings with user metadata
  const loadPendingRecordings = async () => {
    setLoadingPending(true)
    try {
      const recordings = await db.getApprovedRecordingsNotUploadedToMozilla(50)
      
      // Fetch user data for each recording
      const recordingsWithUsers = await Promise.all(
        recordings.map(async (recording) => {
          const user = await db.getUserById(recording.user_id)
          return {
            ...recording,
            user,
          }
        })
      )
      
      setPendingRecordings(recordingsWithUsers)
    } catch (error) {
      console.error("Error loading pending recordings:", error)
      toast({
        title: "Error",
        description: "Failed to load pending recordings",
        variant: "destructive",
      })
    } finally {
      setLoadingPending(false)
    }
  }

  // Load uploaded recordings
  const loadUploadedRecordings = async () => {
    setLoadingUploaded(true)
    try {
      const recordings = await db.getRecordingsUploadedToMozilla(50, 0)
      
      // Fetch user data for each recording
      const recordingsWithUsers = await Promise.all(
        recordings.map(async (recording) => {
          const user = await db.getUserById(recording.user_id)
          return {
            ...recording,
            user,
          }
        })
      )
      
      setUploadedRecordings(recordingsWithUsers)
    } catch (error) {
      console.error("Error loading uploaded recordings:", error)
      toast({
        title: "Error",
        description: "Failed to load uploaded recordings",
        variant: "destructive",
      })
    } finally {
      setLoadingUploaded(false)
    }
  }

  useEffect(() => {
    loadMozillaStats()
    loadPendingRecordings()
    loadUploadedRecordings()
  }, [])

  // Refresh stats
  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      loadMozillaStats(),
      loadPendingRecordings(),
      loadUploadedRecordings()
    ])
    setRefreshing(false)
    toast({
      title: "Refreshed",
      description: "Mozilla upload data refreshed successfully",
    })
  }

  // Upload all approved recordings to Mozilla (batch)
  const handleBatchUpload = async (limit: number = 100) => {
    setBatchUploading(true)
    setUploadResults([])

    try {
      const response = await fetch("/api/mozilla/upload", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload recordings")
      }

      setUploadResults(data.results || [])
      
      toast({
        title: "Batch Upload Complete",
        description: `${data.successCount} recordings uploaded successfully, ${data.failCount} failed`,
      })

      // Refresh stats and recordings lists after upload
      await Promise.all([
        loadMozillaStats(),
        loadPendingRecordings(),
        loadUploadedRecordings()
      ])
    } catch (error) {
      console.error("Error uploading to Mozilla:", error)
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Failed to upload recordings",
        variant: "destructive",
      })
    } finally {
      setBatchUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Mozilla Upload Statistics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mozillaStats.totalApproved}</div>
            <p className="text-xs text-gray-500 mt-1">Approved recordings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Uploaded to Mozilla</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{mozillaStats.uploadedToMozilla}</div>
            <p className="text-xs text-gray-500 mt-1">Successfully uploaded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{mozillaStats.pendingUpload}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting upload</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Upload Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{mozillaStats.uploadPercentage}%</div>
            <Progress value={mozillaStats.uploadPercentage} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Upload Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mozilla Common Voice Upload</CardTitle>
              <CardDescription>
                Upload approved recordings to Mozilla's Common Voice bucket on Google Cloud Storage
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Batch Upload Section */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold">Batch Upload</h3>
              <p className="text-sm text-gray-600">
                Upload all approved recordings that haven't been sent to Mozilla yet
              </p>
              {mozillaStats.pendingUpload > 0 && (
                <p className="text-sm text-orange-600 mt-1">
                  {mozillaStats.pendingUpload} recordings ready to upload
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleBatchUpload(50)}
                disabled={batchUploading || mozillaStats.pendingUpload === 0}
              >
                {batchUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Upload Next 50
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleBatchUpload(100)}
                disabled={batchUploading || mozillaStats.pendingUpload === 0}
                variant="default"
              >
                {batchUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Upload Next 100
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Configuration Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Configuration</h3>
            <div className="space-y-1 text-sm">
              <p className="text-blue-800">
                <strong>Bucket:</strong> {process.env.NEXT_PUBLIC_MOZILLA_BUCKET || 'common-voice-nonprod-stage-luo-project'}
              </p>
              <p className="text-blue-800">
                <strong>Language:</strong> Luo (luo)
              </p>
              <p className="text-blue-800">
                <strong>Metadata:</strong> Age, Gender, Accent Dialect included
              </p>
            </div>
          </div>

          {/* Upload Results */}
          {uploadResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Upload Results</h3>
              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recording ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">
                          {result.recordingId.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {result.success ? (
                            <Badge variant="default" className="bg-green-600">Success</Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {result.success ? (
                            <span className="text-green-600 text-xs break-all">
                              {result.mozillaUrl}
                            </span>
                          ) : (
                            <span className="text-red-600 text-xs">
                              {result.error}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Important Notes */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important Notes</h3>
            <ul className="space-y-1 text-sm text-yellow-800 list-disc list-inside">
              <li>Only approved recordings will be uploaded to Mozilla</li>
              <li>Recordings are uploaded with contributor metadata (age, gender, accent)</li>
              <li>Each recording can only be uploaded once</li>
              <li>Ensure your Google Cloud credentials are configured correctly</li>
              <li>Monitor the upload results for any failures</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Recordings Tables */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recordings & Metadata</CardTitle>
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'pending' | 'uploaded')}>
              <TabsList>
                <TabsTrigger value="pending">
                  Pending Upload ({pendingRecordings.length})
                </TabsTrigger>
                <TabsTrigger value="uploaded">
                  Uploaded ({uploadedRecordings.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CardDescription>
            View recordings with their Mozilla metadata (age, gender, accent dialect)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeView === 'pending' && (
            <div className="space-y-4">
              {loadingPending ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading pending recordings...</span>
                </div>
              ) : pendingRecordings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg font-medium">No pending recordings</p>
                  <p className="text-sm mt-1">All approved recordings have been uploaded to Mozilla</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recording ID</TableHead>
                        <TableHead>Sentence</TableHead>
                        <TableHead>Contributor</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Language Dialect</TableHead>
                        <TableHead>Accent Dialect</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRecordings.map((recording) => (
                        <TableRow key={recording.id}>
                          <TableCell className="font-mono text-xs">
                            {recording.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="truncate" title={recording.sentence}>
                              {recording.sentence}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {recording.user?.name || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {recording.user?.age ? convertAgeToMozillaFormat(recording.user.age) : 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {recording.user?.gender ? convertGenderToMozillaFormat(recording.user.gender) : 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {recording.user?.language_dialect || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {(recording.user as any)?.accent_dialect || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {new Date(recording.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {activeView === 'uploaded' && (
            <div className="space-y-4">
              {loadingUploaded ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading uploaded recordings...</span>
                </div>
              ) : uploadedRecordings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg font-medium">No uploaded recordings yet</p>
                  <p className="text-sm mt-1">Start uploading approved recordings to Mozilla</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recording ID</TableHead>
                        <TableHead>Sentence</TableHead>
                        <TableHead>Contributor</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Language Dialect</TableHead>
                        <TableHead>Accent Dialect</TableHead>
                        <TableHead>Mozilla URL</TableHead>
                        <TableHead>Uploaded At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadedRecordings.map((recording) => (
                        <TableRow key={recording.id}>
                          <TableCell className="font-mono text-xs">
                            {recording.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="truncate" title={recording.sentence}>
                              {recording.sentence}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {recording.user?.name || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {recording.user?.age ? convertAgeToMozillaFormat(recording.user.age) : 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {recording.user?.gender ? convertGenderToMozillaFormat(recording.user.gender) : 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {recording.user?.language_dialect || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {(recording.user as any)?.accent_dialect || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-green-600 font-mono truncate max-w-[200px]" title={(recording as any).mozilla_url}>
                                {(recording as any).mozilla_url?.substring(0, 30)}...
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  navigator.clipboard.writeText((recording as any).mozilla_url || '')
                                  toast({
                                    title: "Copied!",
                                    description: "Mozilla URL copied to clipboard",
                                  })
                                }}
                              >
                                <Activity className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {(recording as any).mozilla_uploaded_at 
                              ? new Date((recording as any).mozilla_uploaded_at).toLocaleString()
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // State management
  const [searchTerm, setSearchTerm] = useState("")
  const [recordingSearchTerm, setRecordingSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  
  // OPTIMIZED: Debounce search terms to reduce unnecessary filtering operations
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const debouncedRecordingSearchTerm = useDebounce(recordingSearchTerm, 300)
  const [users, setUsers] = useState<User[]>([])
  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    contributors: 0,
    reviewers: 0,
    pendingReviewers: 0,
    totalRecordings: 0,
    pendingRecordings: 0,
    validatedRecordings: 0, // Changed from approvedRecordings
    editedRecordings: 0, // Track edited transcriptions
    totalValidations: 0, // Changed from totalReviews
    activeUsers: 0,
    averageRecordingDuration: 0,
    averageValidationTime: 0, // Changed from averageReviewTime
    totalRecordingTime: 0,
    totalValidatedRecordingTime: 0, // Changed from totalApprovedRecordingTime
    totalPendingRecordingTime: 0,
    totalValidationTime: 0, // Changed from totalReviewTime
    totalSystemTime: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  
  // Pagination state
  const [currentUserPage, setCurrentUserPage] = useState(1)
  const [currentRecordingPage, setCurrentRecordingPage] = useState(1)
  const [currentStatementPage, setCurrentStatementPage] = useState(1)
  const [currentContributorPage, setCurrentContributorPage] = useState(1)
  const usersPerPage = 10
  const recordingsPerPage = 10
  const statementsPerPage = 10
  const contributorsPerPage = 10

  // Statements state
  const [statements, setStatements] = useState<string[]>([])
  const [loadingStatements, setLoadingStatements] = useState(false)
  const [statementsError, setStatementsError] = useState<string | null>(null)

  // Audio playback state
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioObjectUrlRef = useRef<string | null>(null)

  // Reviewer information modal state
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)

  // User details modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false)

  useEffect(() => {
    if (user?.role !== "admin") {
      router.push("/dashboard")
      return
    }
    loadAllData()
  }, [user, router])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentUserPage(1)
  }, [searchTerm, filterRole, filterStatus])

  useEffect(() => {
    setCurrentRecordingPage(1)
  }, [recordingSearchTerm, filterStatus])

  // Load statements when statements tab is accessed
  useEffect(() => {
    if (activeTab === "statements" && statements.length === 0 && !loadingStatements) {
      loadStatements()
    }
  }, [activeTab])

  // FIXED: Load audio when modal opens with a recording (similar to listen page pattern)
  useEffect(() => {
    const loadAudio = async () => {
      // Skip if no recording or modal not open
      if (!selectedRecording?.audio_url || !isAudioModalOpen) {
        return
      }

      // Skip if audio ref not ready
      if (!audioRef.current) {
        console.log("⏳ Audio ref not ready yet")
        return
      }

      const audio = audioRef.current
      console.log("🔄 Loading audio for recording:", selectedRecording.id)

      // Check if audio URL is valid
      if (!selectedRecording.audio_url || selectedRecording.audio_url.trim() === '') {
        setAudioLoading(false)
        setAudioError("No audio URL available")
        return
      }

      setAudioLoading(true)
      setAudioError(null)

      try {
        let audioUrl = selectedRecording.audio_url

        // Convert data URL to blob and create object URL for better performance
        if (selectedRecording.audio_url.startsWith('data:')) {
          console.log("Converting data URL to blob...")
          try {
            const response = await fetch(selectedRecording.audio_url)
            const blob = await response.blob()
            console.log("Blob created, size:", blob.size)
            const objectUrl = URL.createObjectURL(blob)
            // Clean up previous object URL if any
            if (audioObjectUrlRef.current) {
              URL.revokeObjectURL(audioObjectUrlRef.current)
            }
            audioObjectUrlRef.current = objectUrl
            audioUrl = objectUrl
          } catch (error) {
            console.error("Error converting data URL:", error)
            setAudioLoading(false)
            setAudioError("Failed to process audio file")
            return
          }
        }

        // Set audio source
        audio.src = audioUrl

        // Wait for audio to be ready with timeout
        await Promise.race([
          new Promise<void>((resolve, reject) => {
            const handleCanPlay = () => {
              console.log("✅ Audio can play event fired")
              cleanup()
              setAudioLoading(false)
              resolve()
            }

            const handleLoadedData = () => {
              console.log("✅ Audio loadeddata event fired")
              cleanup()
              setAudioLoading(false)
              resolve()
            }

            const handleError = (e: Event) => {
              const target = e.target as HTMLAudioElement
              const error = target.error
              let errorMessage = "Failed to load audio file"
              
              if (error) {
                switch (error.code) {
                  case error.MEDIA_ERR_ABORTED:
                    errorMessage = "Audio loading was aborted"
                    break
                  case error.MEDIA_ERR_NETWORK:
                    errorMessage = "Network error loading audio"
                    break
                  case error.MEDIA_ERR_DECODE:
                    errorMessage = "Audio file could not be decoded"
                    break
                  case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = "Audio format not supported"
                    break
                }
              }
              
              console.error("❌ Audio error:", errorMessage)
              cleanup()
              setAudioLoading(false)
              setAudioError(errorMessage)
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
          // Timeout after 30 seconds (increased for large files or slow connections)
          new Promise<void>((resolve, reject) =>
            setTimeout(() => {
              console.warn("⏰ Audio loading timeout after 30s")
              setAudioLoading(false)
              setAudioError("Audio loading timed out. The file may be large or your connection is slow. Please try again.")
              reject(new Error("Audio loading timeout"))
            }, 30000)
          )
        ]).catch(err => {
          // Ensure loading state is cleared on ANY error
          console.error("Audio loading promise error:", err)
          setAudioLoading(false)
          if (!audioError) {
            setAudioError(err.message || "Failed to load audio")
          }
        })

        console.log("✅ Audio loaded successfully")
      } catch (error) {
        console.error("Error processing audio:", error)
        setAudioLoading(false)
        setAudioError("Failed to process audio file")
      }
    }

    // Load audio when modal opens with a recording
    if (isAudioModalOpen && selectedRecording) {
      // Small delay to ensure audio element is mounted
      // Retry up to 5 times if audio ref not ready (handles React rendering delay)
      let attempts = 0
      const maxAttempts = 5
      
      const tryLoadAudio = () => {
        if (audioRef.current) {
          loadAudio()
        } else if (attempts < maxAttempts) {
          attempts++
          setTimeout(tryLoadAudio, 100)
        } else {
          console.warn("Audio ref not available after retries")
          setAudioLoading(false)
          setAudioError("Audio player not ready. Please try again.")
        }
      }
      
      const timer = setTimeout(tryLoadAudio, 100)
      return () => clearTimeout(timer)
    }
  }, [isAudioModalOpen, selectedRecording?.id])

  const loadAllData = async () => {
    try {
      setLoading(true)
      
      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error("Supabase environment variables not configured")
        toast({
          title: "Configuration Error",
          description: "Supabase is not properly configured. Please check your environment variables.",
          variant: "destructive",
        })
        return
      }
      
      // PRIORITY 1: Load system stats first (fast, critical for overview)
      console.log("⚡ Loading system stats...")
      const stats = await db.getSystemStats()
      setSystemStats(stats)
      
      // PRIORITY 2: Load first batch of users (50) for instant display
      console.log("⚡ Loading first batch of users (50)...")
      const firstUsers = await db.getAllUsers({ limit: 50 })
      setUsers(firstUsers)
      
      // PRIORITY 3: Load first batch of recordings (100) for instant display
      console.log("⚡ Loading first batch of recordings (100)...")
      const firstRecordings = await db.getAllRecordings({ limit: 100 })
      setRecordings(firstRecordings)
      
      // PRIORITY 4: Load first batch of reviews (100) for instant display
      console.log("⚡ Loading first batch of reviews (100)...")
      const firstReviews = await db.getAllReviews({ limit: 100 })
      setReviews(firstReviews)
      
      // Show UI immediately with first batches
      setLoading(false)
      console.log("✅ Admin dashboard ready with initial data")
      
      // BACKGROUND LOADING: Load remaining data without blocking UI
      setTimeout(async () => {
        try {
          console.log("🔄 Loading remaining users in background...")
          const allUsers = await db.getAllUsers()
          if (allUsers.length > firstUsers.length) {
            console.log(`✅ Background load complete: ${allUsers.length} total users`)
            setUsers(allUsers)
          }
        } catch (error) {
          console.error('Background users load failed:', error)
        }
      }, 100)
      
      setTimeout(async () => {
        try {
          console.log("🔄 Loading remaining recordings in background...")
          const allRecordings = await db.getAllRecordings()
          if (allRecordings.length > firstRecordings.length) {
            console.log(`✅ Background load complete: ${allRecordings.length} total recordings`)
            setRecordings(allRecordings)
          }
        } catch (error) {
          console.error('Background recordings load failed:', error)
        }
      }, 200)
      
      setTimeout(async () => {
        try {
          console.log("🔄 Loading remaining reviews in background...")
          const allReviews = await db.getAllReviews()
          if (allReviews.length > firstReviews.length) {
            console.log(`✅ Background load complete: ${allReviews.length} total reviews`)
            setReviews(allReviews)
          }
        } catch (error) {
          console.error('Background reviews load failed:', error)
        }
      }, 300)
      
      // BACKGROUND: Load user stats (optimized with batching, load last)
      setTimeout(async () => {
        try {
          console.log("🔄 Loading user stats in background (batched for efficiency)...")
          // Load stats for first 100 users (most active), rest loads later if needed
          const initialUserStats = await db.getAllUserStats({ limit: 100 })
          console.log(`✅ Initial user stats loaded: ${initialUserStats.length} users`)
          setUserStats(initialUserStats)
          
          // Load remaining user stats in smaller batches
          setTimeout(async () => {
            try {
              const allUserStats = await db.getAllUserStats()
              if (allUserStats.length > initialUserStats.length) {
                console.log(`✅ All user stats loaded: ${allUserStats.length} total users`)
                setUserStats(allUserStats)
              }
            } catch (error) {
              console.error('Background full user stats load failed:', error)
            }
          }, 2000)
        } catch (error) {
          console.error('Background user stats load failed:', error)
        }
      }, 500)
      
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const refreshData = async () => {
    try {
      setRefreshing(true)
      
      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error("Supabase environment variables not configured")
        toast({
          title: "Configuration Error",
          description: "Supabase is not properly configured. Please check your environment variables.",
          variant: "destructive",
        })
        return
      }
      
      console.log("Refreshing admin data...")
      const [allUsers, allUserStats, allRecordings, allReviews, stats] = await Promise.all([
        db.getAllUsers(),
        db.getAllUserStats(),
        db.getAllRecordings(),
        db.getAllReviews(),
        db.getSystemStats(),
      ])

      console.log("Refreshed users:", allUsers.length)
      console.log("Refreshed user stats:", allUserStats.length)
      console.log("Refreshed recordings:", allRecordings.length)
      console.log("Refreshed reviews:", allReviews.length)
      
      setUsers(allUsers)
      setUserStats(allUserStats)
      setRecordings(allRecordings)
      setReviews(allReviews)
      setSystemStats(stats)
      
      toast({
        title: "Data Refreshed",
        description: "All statistics have been updated successfully.",
      })
    } catch (error) {
      console.error("Error refreshing data:", error)
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const loadStatements = async () => {
    try {
      setLoadingStatements(true)
      setStatementsError(null)
      
      // Use the imported mozillaApi
      
      // Fetch ALL statements by making multiple requests
      const allStatements: string[] = []
      let offset = 0
      const batchSize = 50 // API limit per request
      let hasMore = true
      
      toast({
        title: "Loading Statements",
        description: "Fetching all statements from Mozilla Common Voice API...",
      })
      
      while (hasMore) {
        try {
          // Fetch batch of statements
          const batch = await mozillaApi.getSentences({
            languageCode: 'luo',
            limit: batchSize,
            offset: offset,
            taxonomy: { Licence: 'NOODL' }
          })
          
          if (batch.length === 0) {
            hasMore = false
          } else {
            // Extract text from sentences and add to our collection
            const batchTexts = batch.map(sentence => sentence.text)
            allStatements.push(...batchTexts)
            offset += batchSize
            
            // Update progress
            toast({
              title: "Loading Statements",
              description: `Loaded ${allStatements.length} statements so far...`,
            })
          }
        } catch (batchError) {
          console.error(`Error fetching batch at offset ${offset}:`, batchError)
          // If we get an error, we might have reached the end or hit a limit
          hasMore = false
        }
      }
      
      setStatements(allStatements)
      
      toast({
        title: "All Statements Loaded",
        description: `Successfully loaded ${allStatements.length} statements from Mozilla Common Voice API`,
      })
    } catch (error) {
      console.error('Failed to load statements from Mozilla API:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Clean up error message if it's already wrapped
      const cleanErrorMessage = errorMessage.replace(/^Mozilla API error: /i, '').replace(/^Mozilla API Error: /i, '')
      setStatementsError(cleanErrorMessage)
      
      toast({
        title: "Mozilla API Error",
        description: `Failed to load statements: ${cleanErrorMessage}`,
        variant: "destructive",
      })
    } finally {
      setLoadingStatements(false)
    }
  }

  // OPTIMIZED: Memoize filtered users with debounced search term
  const filteredUsers = useMemo(() => {
    if (!debouncedSearchTerm && filterRole === "all" && filterStatus === "all") {
      return users // Return all if no filters
    }
    
    const searchLower = debouncedSearchTerm.toLowerCase()
    return users.filter((user) => {
      const matchesSearch = !debouncedSearchTerm ||
        user.name?.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      const matchesRole = filterRole === "all" || user.role === filterRole
      const matchesStatus = filterStatus === "all" || user.status === filterStatus
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, debouncedSearchTerm, filterRole, filterStatus])

  // Pagination for users
  const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage)
  const startUserIndex = (currentUserPage - 1) * usersPerPage
  const endUserIndex = startUserIndex + usersPerPage
  const paginatedUsers = filteredUsers.slice(startUserIndex, endUserIndex)

  // OPTIMIZED: Create user lookup map for O(1) access instead of O(n) find operations
  const userMap = useMemo(() => {
    const map = new Map<string, User>()
    users.forEach(user => map.set(user.id, user))
    return map
  }, [users])

  // OPTIMIZED: Memoize filtered recordings with debounced search term
  const filteredRecordings = useMemo(() => {
    const searchLower = debouncedRecordingSearchTerm.toLowerCase()
    
    return recordings.filter(recording => {
      let matchesStatus;
      if (filterStatus === "all") {
        matchesStatus = true;
      } else if (filterStatus === "reviewed") {
        matchesStatus = recording.status === "approved"; // Validated recordings
      } else {
        matchesStatus = recording.status === filterStatus;
      }
      
      if (!matchesStatus) return false
      
      // OPTIMIZED: Use Map lookup instead of array.find (O(1) vs O(n))
      const recordingUser = userMap.get(recording.user_id)
      const matchesSearch = !debouncedRecordingSearchTerm || 
        recording.sentence.toLowerCase().includes(searchLower) ||
        recordingUser?.name?.toLowerCase().includes(searchLower) ||
        recordingUser?.email.toLowerCase().includes(searchLower);
      
      return matchesSearch;
    })
  }, [recordings, debouncedRecordingSearchTerm, filterStatus, userMap]);

  // Pagination for recordings
  const totalRecordingPages = Math.ceil(filteredRecordings.length / recordingsPerPage)
  const startRecordingIndex = (currentRecordingPage - 1) * recordingsPerPage
  const endRecordingIndex = startRecordingIndex + recordingsPerPage
  const paginatedRecordings = filteredRecordings.slice(startRecordingIndex, endRecordingIndex)

  // Pagination for statements
  const totalStatementPages = Math.ceil(statements.length / statementsPerPage)
  const startStatementIndex = (currentStatementPage - 1) * statementsPerPage
  const endStatementIndex = startStatementIndex + statementsPerPage
  const paginatedStatements = statements.slice(startStatementIndex, endStatementIndex)

  const handleApproveReviewer = async (userId: string) => {
    try {
      console.log("Approving reviewer with ID:", userId)
      
      // Get user details before updating
      const userToApprove = users.find(u => u.id === userId)
      if (!userToApprove) {
        throw new Error("User not found")
      }
      
      const result = await db.updateUser(userId, { status: "active", is_active: true })
      console.log("Update result:", result)
      
      // Update local state instead of reloading all data
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, status: "active", is_active: true }
            : user
        )
      )
      
      // Update system stats
      setSystemStats(prevStats => ({
        ...prevStats,
        pendingReviewers: prevStats.pendingReviewers - 1,
        activeUsers: prevStats.activeUsers + 1
      }))
      
      // Toast notification will be shown after email attempt (with email status)
      
      // Send email notification to the approved reviewer
      try {
        // Validate email address before sending
        if (!userToApprove.email || !userToApprove.email.includes('@')) {
          console.warn(`⚠️ Invalid email address for user ${userToApprove.id}: ${userToApprove.email}`)
          toast({
            title: "Email Warning",
            description: `Reviewer approved, but email notification could not be sent (invalid email address: ${userToApprove.email})`,
            variant: "default",
          })
        } else {
          console.log(`📧 Preparing to send approval email to: ${userToApprove.email}`)
          console.log(`   Reviewer name: ${userToApprove.name || 'N/A'}`)
          console.log(`   Reviewer ID: ${userToApprove.id}`)
          
          const { subject, html } = generateApprovalEmail(userToApprove.name, userToApprove.email)
          const emailResult = await sendEmailNotification({
            to: userToApprove.email,
            subject,
            html,
            type: 'approval',
          })
          
          if (emailResult.success) {
            console.log(`✅ Email notification sent successfully to: ${userToApprove.email}`)
            toast({
              title: "Reviewer Approved",
              description: `${userToApprove.email} has been approved. Email notification sent!`,
            })
          } else {
            console.warn(`⚠️ Failed to send email notification: ${emailResult.error}`)
            toast({
              title: "Reviewer Approved",
              description: `${userToApprove.email} has been approved. Email notification failed: ${emailResult.error}`,
              variant: "default",
            })
          }
        }
      } catch (emailError) {
        console.error("Error sending approval email:", emailError)
        toast({
          title: "Reviewer Approved",
          description: `${userToApprove.email} has been approved, but email notification encountered an error.`,
          variant: "default",
        })
      }
      
    } catch (error) {
      console.error("Error approving reviewer:", error)
      toast({
        title: "Error",
        description: "Failed to approve reviewer",
        variant: "destructive",
      })
    }
  }

  const handleRejectReviewer = async (userId: string) => {
    try {
      console.log("Rejecting reviewer with ID:", userId)
      
      // Get user details before updating
      const userToReject = users.find(u => u.id === userId)
      if (!userToReject) {
        throw new Error("User not found")
      }
      
      const result = await db.updateUser(userId, { status: "rejected", is_active: false })
      console.log("Reject result:", result)
      
      // Update local state instead of reloading all data
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, status: "rejected", is_active: false }
            : user
        )
      )
      
      // Update system stats
      setSystemStats(prevStats => ({
        ...prevStats,
        pendingReviewers: prevStats.pendingReviewers - 1
      }))
      
      // Toast notification will be shown after email attempt (with email status)
      
      // Send email notification to the rejected reviewer
      try {
        // Validate email address before sending
        if (!userToReject.email || !userToReject.email.includes('@')) {
          console.warn(`⚠️ Invalid email address for user ${userToReject.id}: ${userToReject.email}`)
          toast({
            title: "Reviewer Rejected",
            description: `Reviewer rejected, but email notification could not be sent (invalid email address: ${userToReject.email})`,
            variant: "default",
          })
        } else {
          console.log(`📧 Preparing to send rejection email to: ${userToReject.email}`)
          console.log(`   Reviewer name: ${userToReject.name || 'N/A'}`)
          console.log(`   Reviewer ID: ${userToReject.id}`)
          
          const { subject, html } = generateRejectionEmail(userToReject.name, userToReject.email)
          const emailResult = await sendEmailNotification({
            to: userToReject.email,
            subject,
            html,
            type: 'rejection',
          })
          
          if (emailResult.success) {
            console.log(`✅ Email notification sent successfully to: ${userToReject.email}`)
            toast({
              title: "Reviewer Rejected",
              description: `${userToReject.email} has been rejected. Email notification sent!`,
            })
          } else {
            console.warn(`⚠️ Failed to send email notification: ${emailResult.error}`)
            toast({
              title: "Reviewer Rejected",
              description: `${userToReject.email} has been rejected. Email notification failed: ${emailResult.error}`,
              variant: "default",
            })
          }
        }
      } catch (emailError) {
        console.error("Error sending rejection email:", emailError)
        toast({
          title: "Reviewer Rejected",
          description: `${userToReject.email} has been rejected, but email notification encountered an error.`,
          variant: "default",
        })
      }
      
    } catch (error) {
      console.error("Error rejecting reviewer:", error)
      toast({
        title: "Error",
        description: "Failed to reject reviewer",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        // Get user details before deleting
        const userToDelete = users.find(u => u.id === userId)
        if (!userToDelete) {
          throw new Error("User not found")
        }
        
        await db.deleteUser(userId)
        
        // Update local state instead of reloading all data
        setUsers(prevUsers => prevUsers.filter(user => user.id !== userId))
        
        // Update system stats based on user role and status
        setSystemStats(prevStats => {
          const newStats = { ...prevStats }
          newStats.totalUsers = newStats.totalUsers - 1
          
          if (userToDelete.role === "contributor") {
            newStats.contributors = newStats.contributors - 1
          } else if (userToDelete.role === "reviewer") {
            newStats.reviewers = newStats.reviewers - 1
            if (userToDelete.status === "pending") {
              newStats.pendingReviewers = newStats.pendingReviewers - 1
            }
          }
          
          if (userToDelete.status === "active") {
            newStats.activeUsers = newStats.activeUsers - 1
          }
          
          return newStats
        })
        
        // Remove user's recordings from local state
        setRecordings(prevRecordings => 
          prevRecordings.filter(recording => recording.user_id !== userId)
        )
        
        // Remove user's reviews from local state
        setReviews(prevReviews => 
          prevReviews.filter(review => review.reviewer_id !== userId)
        )
        
        toast({
          title: "Success",
          description: "User deleted successfully",
        })
      } catch (error) {
        console.error("Error deleting user:", error)
        toast({
          title: "Error",
          description: "Failed to delete user",
          variant: "destructive",
        })
      }
    }
  }

  const handleSendEmail = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId)
    
    if (!targetUser?.email) {
      toast({
        title: "Error",
        description: "No email address found for this user",
        variant: "destructive",
      })
      return
    }

    try {
      // Open default email client with the user's email address
      const mailtoLink = `mailto:${targetUser.email}`
      window.open(mailtoLink, '_blank')
      
      toast({
        title: "Email Client Opened",
        description: `Opening email client for ${targetUser.email}`,
      })
    } catch (error) {
      console.error("Error opening email client:", error)
      toast({
        title: "Error",
        description: "Failed to open email client. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getUserStatsById = (userId: string): UserStats | undefined => {
    return userStats.find((stats) => stats.userId === userId)
  }

  const getRecordingsByUser = (userId: string): Recording[] => {
    return recordings.filter((recording) => recording.user_id === userId)
  }

  const getReviewsByReviewer = (reviewerId: string): Review[] => {
    return reviews.filter((review) => review.reviewer_id === reviewerId)
  }

  // Audio playback functions
  const handlePlayRecording = (recording: Recording) => {
    setSelectedRecording(recording)
    setIsAudioModalOpen(true)
    setIsPlaying(false)
    setAudioError(null)
    // Audio loading will be handled by useEffect
  }

  const togglePlayback = async () => {
    if (!selectedRecording?.audio_url) {
      toast({
        title: "Error",
        description: "No audio file available for this recording",
        variant: "destructive",
      })
      return
    }

    if (audioError) {
      toast({
        title: "Error",
        description: audioError,
        variant: "destructive",
      })
      return
    }

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setIsPlaying(false)
    } else {
      setAudioLoading(true)
      try {
        if (audioRef.current) {
          await audioRef.current.play()
          setIsPlaying(true)
        }
      } catch (error) {
        console.error("Error playing audio:", error)
        setAudioError("Failed to play audio file")
        toast({
          title: "Error",
          description: "Failed to play audio file",
          variant: "destructive",
        })
      } finally {
        setAudioLoading(false)
      }
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  const handleAudioError = () => {
    setIsPlaying(false)
    setAudioLoading(false)
    setAudioError("Failed to load audio file")
    toast({
      title: "Error",
      description: "Failed to load audio file",
      variant: "destructive",
    })
  }

  const closeAudioModal = () => {
    setIsAudioModalOpen(false)
    setIsPlaying(false)
    setAudioLoading(false)
    setAudioError(null)
    
    // Pause audio if playing
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    
    // Clean up object URL to prevent memory leaks
    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current)
      audioObjectUrlRef.current = null
    }
    
    // Clear selected recording after a small delay to allow cleanup
    setTimeout(() => {
      setSelectedRecording(null)
      if (audioRef.current) {
        audioRef.current.src = ""
      }
    }, 100)
  }

  const handleViewReviewerInfo = async (recording: Recording) => {
    if (!recording.reviewed_by) {
      toast({
        title: "No Review",
        description: "This recording has not been reviewed yet.",
        variant: "destructive",
      })
      return
    }

    try {
      setReviewLoading(true)
      setIsReviewModalOpen(true)
      
      // Get the review details from the reviews table
      const reviews = await db.getReviewsByRecording(recording.id)
      const review = reviews.find(r => r.reviewer_id === recording.reviewed_by)
      
      if (review) {
        setSelectedReview(review)
      } else {
        toast({
          title: "Review Not Found",
          description: "Review details could not be found.",
          variant: "destructive",
        })
        setIsReviewModalOpen(false)
      }
    } catch (error) {
      console.error("Error fetching review details:", error)
      toast({
        title: "Error",
        description: "Failed to load review information.",
        variant: "destructive",
      })
      setIsReviewModalOpen(false)
    } finally {
      setReviewLoading(false)
    }
  }

  const closeReviewModal = () => {
    setIsReviewModalOpen(false)
    setSelectedReview(null)
    setReviewLoading(false)
  }

  const handleViewUserDetails = async (user: User) => {
    try {
      // Fetch full user data from database to ensure all fields including id_number are loaded
      const fullUserData = await db.getUserById(user.id)
      if (fullUserData) {
        setSelectedUser(fullUserData)
      } else {
        // Fallback to the user from state if database fetch fails
        setSelectedUser(user)
      }
    } catch (error) {
      console.error("Error loading user details:", error)
      // Fallback to the user from state if there's an error
      setSelectedUser(user)
    }
    setIsUserDetailsModalOpen(true)
  }

  const closeUserDetailsModal = () => {
    setIsUserDetailsModalOpen(false)
    setSelectedUser(null)
  }

  const handleExportUsers = () => {
    try {
      // Get filtered users
      const filteredUsers = users.filter((user) => {
        const matchesSearch =
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesRole = filterRole === "all" || user.role === filterRole
        const matchesStatus = filterStatus === "all" || user.status === filterStatus
        return matchesSearch && matchesRole && matchesStatus
      })

      // Prepare CSV data
      const csvData = [
        // Header row
        ['Name', 'Email', 'Role', 'Status', 'Join Date', 'Profile Complete', 'Age', 'Gender', 'Phone Number', 'Location', 'Educational Background', 'Employment Status', 'Language Dialect', 'Languages', 'Total Recordings', 'Validated Recordings', 'Edited Transcriptions', 'Total Validations', 'Passed', 'Edited', 'Avg Confidence'],
        // Data rows
        ...filteredUsers.map(user => {
          const stats = getUserStatsById(user.id)
          
          return [
            user.name || 'N/A',
            user.email,
            user.role,
            user.status,
            new Date(user.created_at).toLocaleDateString(),
            user.profile_complete ? 'Yes' : 'No',
            user.age || 'N/A',
            user.gender || 'N/A',
            user.phone_number || 'N/A',
            user.location || 'N/A',
            user.educational_background || 'N/A',
            user.employment_status || 'N/A',
            user.language_dialect || 'N/A',
            user.languages && user.languages.length > 0 ? user.languages.join('; ') : 'N/A',
            stats?.totalRecordings || 0,
            (stats?.approvedRecordings || 0), // Validated recordings
            0, // Edited transcriptions (will be calculated from db)
            stats?.totalReviews || 0, // Total validations
            (stats?.approvedReviews || 0), // Passed
            0, // Edited (will be calculated from db)
            stats?.accuracyRate?.toFixed(1) + '%' || 'N/A'
          ];
        })
      ];

      // Convert to CSV string
      const csvContent = csvData.map(row => 
        row.map(field => 
          typeof field === 'string' && field.includes(',') 
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(',')
      ).join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Exported ${filteredUsers.length} users to CSV file`,
      });
    } catch (error) {
      console.error("Error exporting users:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export users. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportRecordings = () => {
    try {
      // Get filtered recordings
      const filteredRecordings = recordings.filter(recording => {
        let matchesStatus;
        if (filterStatus === "all") {
          matchesStatus = true;
        } else if (filterStatus === "reviewed") {
          matchesStatus = recording.status === "approved"; // Validated recordings
        } else {
          matchesStatus = recording.status === filterStatus;
        }
        
        const matchesSearch = !recordingSearchTerm || 
          recording.sentence.toLowerCase().includes(recordingSearchTerm.toLowerCase()) ||
          users.find(u => u.id === recording.user_id)?.name?.toLowerCase().includes(recordingSearchTerm.toLowerCase()) ||
          users.find(u => u.id === recording.user_id)?.email.toLowerCase().includes(recordingSearchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
      });

      // Prepare CSV data
      const csvData = [
        // Header row
        ['Contributor', 'Contributor Email', 'Sentence', 'Duration (s)', 'Status', 'Reviewer', 'Review Date', 'Created Date', 'Quality', 'Audio URL'],
        // Data rows
        ...filteredRecordings.map(recording => {
          const contributor = users.find((u) => u.id === recording.user_id);
          const reviewer = recording.reviewed_by ? users.find((u) => u.id === recording.reviewed_by) : null;
          
          return [
            contributor?.name || 'N/A',
            contributor?.email || 'N/A',
            `"${recording.sentence.replace(/"/g, '""')}"`, // Escape quotes in CSV
            recording.duration.toFixed(1),
            recording.status,
            reviewer?.name || reviewer?.email || 'Not reviewed',
            recording.reviewed_at ? new Date(recording.reviewed_at).toLocaleDateString() : 'N/A',
            new Date(recording.created_at).toLocaleDateString(),
            recording.quality || 'N/A',
            recording.audio_url ? 'Yes' : 'No'
          ];
        })
      ];

      // Convert to CSV string
      const csvContent = csvData.map(row => row.join(',')).join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `recordings_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Exported ${filteredRecordings.length} recordings to CSV file`,
      });
    } catch (error) {
      console.error("Error exporting recordings:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export recordings. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (user?.role !== "admin") {
    return null
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive system management and analytics</p>
          </div>
          <Button
            onClick={refreshData}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </Button>
        </div>
      </div>

      {/* System Stats Grid */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 mb-8">
        <Card 
          className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105"
          onClick={() => {
            setActiveTab("users")
            setFilterRole("all")
            setFilterStatus("all")
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-blue-800">Total Users</CardTitle>
            <div className="p-1 bg-blue-500 rounded">
              <Users className="h-3 w-3 text-white" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold text-blue-900">{systemStats.totalUsers}</div>
            <p className="text-xs text-blue-600">{systemStats.activeUsers} active</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105"
          onClick={() => {
            setActiveTab("recordings")
            setRecordingSearchTerm("")
            // Reset filter to show all recordings
            setFilterStatus("all")
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-green-800">Total Recordings</CardTitle>
            <div className="p-1 bg-green-500 rounded">
              <Mic className="h-3 w-3 text-white" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold text-green-900">{systemStats.totalRecordings}</div>
            <p className="text-xs text-green-600">
              Avg: {systemStats.averageValidationTime?.toFixed(1) || 0}s
            </p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105"
          onClick={() => {
            setActiveTab("recordings")
            setRecordingSearchTerm("")
            // Set filter to show only validated recordings
            setFilterStatus("reviewed")
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-purple-800">Validated Recordings</CardTitle>
            <div className="p-1 bg-purple-500 rounded">
              <Headphones className="h-3 w-3 text-white" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold text-purple-900">{systemStats.totalValidations}</div>
            <p className="text-xs text-purple-600">
              {recordings.filter(r => r.status === 'approved' && !r.transcription_edited).length} passed, {recordings.filter(r => r.status === 'approved' && r.transcription_edited).length} edited
            </p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105"
          onClick={() => {
            setActiveTab("recordings")
            setRecordingSearchTerm("")
            // Set filter to show only pending recordings
            setFilterStatus("pending")
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-yellow-800">Pending Reviews</CardTitle>
            <div className="p-1 bg-yellow-500 rounded">
              <Clock className="h-3 w-3 text-white" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold text-yellow-900">{systemStats.pendingRecordings}</div>
            <p className="text-xs text-yellow-600">{systemStats.pendingReviewers} reviewers pending</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-orange-50 to-orange-100 border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105"
          onClick={() => {
            setActiveTab("users")
            setFilterRole("reviewer")
            setFilterStatus("pending")
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-orange-800">Pending Reviewers</CardTitle>
            <div className="p-1 bg-orange-500 rounded">
              <Users className="h-3 w-3 text-white" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold text-orange-900">{systemStats.pendingReviewers}</div>
            <p className="text-xs text-orange-600">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105"
          onClick={() => {
            setActiveTab("analytics")
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-indigo-800">Total Time</CardTitle>
            <div className="p-1 bg-indigo-500 rounded">
              <TrendingUp className="h-3 w-3 text-white" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold text-indigo-900">{formatTime(systemStats.totalValidatedRecordingTime || 0)}</div>
            <p className="text-xs text-indigo-600">Total Approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="recordings">Recordings</TabsTrigger>
          <TabsTrigger value="contributors">Contributors</TabsTrigger>
          <TabsTrigger value="statements">API Statements</TabsTrigger>
          <TabsTrigger value="mozilla">Mozilla Upload</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Activity */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200"
              onClick={() => {
                setActiveTab("recordings")
                setRecordingSearchTerm("")
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Recent Activity</span>
                </CardTitle>
                <p className="text-xs text-gray-500">Click to view all recordings</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recordings.slice(0, 5).map((recording) => {
                    const recordingUser = users.find((u) => u.id === recording.user_id)
                    return (
                      <div key={recording.id} className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Mic className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{recordingUser?.name || recordingUser?.email}</p>
                          <p className="text-xs text-gray-500">
                            Submitted recording • {new Date(recording.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            recording.status === "approved"
                              ? "default"
                              : recording.status === "rejected"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {recording.status}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top Contributors */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200"
              onClick={() => {
                setActiveTab("users")
                setFilterRole("contributor")
                setFilterStatus("all")
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Top Contributors</span>
                </CardTitle>
                <p className="text-xs text-gray-500">Click to view all contributors</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users
                    .filter((u) => u.role === "contributor")
                    .map((user) => {
                      const stats = getUserStatsById(user.id)
                      return { user, stats }
                    })
                    .sort((a, b) => (b.stats?.totalRecordings || 0) - (a.stats?.totalRecordings || 0))
                    .slice(0, 5)
                    .map(({ user, stats }) => (
                      <div key={user.id} className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Users className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{user.name || user.email}</p>
                          <p className="text-xs text-gray-500">
                            {stats?.totalRecordings || 0} recordings • {stats?.approvedRecordings || 0} validated
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{stats?.totalRecordings || 0}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts and reviewer applications ({systemStats.totalUsers.toLocaleString()} total users)
                {users.length !== systemStats.totalUsers && (
                  <span className="text-yellow-600 ml-2">
                    ({users.length.toLocaleString()} loaded)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button
                  onClick={handleExportUsers}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Users</span>
                </Button>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="contributor">Contributors</SelectItem>
                    <SelectItem value="reviewer">Reviewers</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contributions</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => {
                    const stats = getUserStatsById(user.id)
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name || "No name"}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "reviewer" ? "secondary" : user.role === "admin" ? "default" : "outline"
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.status === "active"
                                ? "default"
                                : user.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className={
                              user.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : user.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : ""
                            }
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {user.role === "contributor" && (
                              <>
                                <p>{stats?.totalRecordings || 0} recordings</p>
                                <p className="text-xs text-gray-500">
                                  {stats?.approvedRecordings || 0} validated, {stats?.pendingRecordings || 0} pending
                                </p>
                              </>
                            )}
                            {user.role === "reviewer" && (
                              <>
                                <p>{stats?.totalReviews || 0} validations</p>
                                <p className="text-xs text-gray-500">
                                  {stats?.approvedReviews || 0} passed
                                </p>
                              </>
                            )}
                            {user.role === "admin" && <p className="text-xs text-gray-500">System administrator</p>}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {user.role === "reviewer" && user.status === "pending" && (
                              <>
                                {console.log("Rendering approval buttons for user:", user.id, user.email)}
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveReviewer(user.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectReviewer(user.id)}>
                                  <UserX className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleViewUserDetails(user)}
                              className="flex items-center space-x-1"
                            >
                              <Eye className="h-4 w-4" />
                              <span>Details</span>
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleSendEmail(user.id)}>
                              <Mail className="h-4 w-4" />
                            </Button>
                            {user.role !== "admin" && (
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              
              {/* Users Pagination */}
              {totalUserPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {startUserIndex + 1} to {Math.min(endUserIndex, filteredUsers.length)} of {filteredUsers.length} filtered
                    {filteredUsers.length !== systemStats.totalUsers && (
                      <span className="text-gray-400"> (of {systemStats.totalUsers.toLocaleString()} total in database)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentUserPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentUserPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {renderPaginationButtons(currentUserPage, totalUserPages, setCurrentUserPage)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentUserPage(prev => Math.min(prev + 1, totalUserPages))}
                      disabled={currentUserPage === totalUserPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recordings Tab */}
        <TabsContent value="recordings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recording Management</CardTitle>
              <CardDescription>
                View and manage all voice recordings ({systemStats.totalRecordings.toLocaleString()} total in database)
                {recordings.length !== systemStats.totalRecordings && (
                  <span className="text-yellow-600 ml-2">
                    ({recordings.length.toLocaleString()} loaded)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search recordings by sentence or contributor..."
                    value={recordingSearchTerm}
                    onChange={(e) => setRecordingSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="reviewed">Validated</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleExportRecordings}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export to Excel</span>
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contributor</TableHead>
                    <TableHead>Sentence</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecordings.map((recording) => {
                    const contributor = users.find((u) => u.id === recording.user_id)
                    const reviewer = recording.reviewed_by ? users.find((u) => u.id === recording.reviewed_by) : null
                    return (
                      <TableRow key={recording.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{contributor?.name || contributor?.email}</p>
                            <p className="text-xs text-gray-500">{contributor?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm max-w-xs truncate">{recording.sentence}</p>
                        </TableCell>
                        <TableCell>{recording.duration.toFixed(1)}s</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              recording.status === "approved"
                                ? "default"
                                : recording.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {recording.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {reviewer ? (
                            <div>
                              <p className="text-sm">{reviewer.name || reviewer.email}</p>
                              {recording.reviewed_at && (
                                <p className="text-xs text-gray-500">
                                  {new Date(recording.reviewed_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">Not reviewed</span>
                          )}
                        </TableCell>
                        <TableCell>{new Date(recording.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handlePlayRecording(recording)}
                              disabled={!recording.audio_url}
                            >
                              <Volume2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewReviewerInfo(recording)}
                              disabled={!recording.reviewed_by}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              
              {/* Recordings Pagination */}
              {totalRecordingPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {startRecordingIndex + 1} to {Math.min(endRecordingIndex, filteredRecordings.length)} of {filteredRecordings.length} filtered
                    {filteredRecordings.length !== systemStats.totalRecordings && (
                      <span className="text-gray-400"> (of {systemStats.totalRecordings.toLocaleString()} total in database)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentRecordingPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentRecordingPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {renderPaginationButtons(currentRecordingPage, totalRecordingPages, setCurrentRecordingPage)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentRecordingPage(prev => Math.min(prev + 1, totalRecordingPages))}
                      disabled={currentRecordingPage === totalRecordingPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contributors Tab */}
        <TabsContent value="contributors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Contributors Performance</span>
              </CardTitle>
              <CardDescription>
                View all contributors with their validated and pending recording times
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-blue-800">
                    <span className="font-semibold">Green indicator:</span> Contributors who have reached 1 hour or more of approved recording time
                  </span>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contributor</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Recordings</TableHead>
                    <TableHead>Validated Time</TableHead>
                    <TableHead>Pending Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Prepare and sort contributors
                    const contributorsData = users
                      .filter((u) => u.role === "contributor")
                      .map((contributor) => {
                        const stats = getUserStatsById(contributor.id)
                        const contributorRecordings = recordings.filter(r => r.user_id === contributor.id)
                        
                        // Calculate validated time (sum of durations for validated recordings)
                        const validatedTime = contributorRecordings
                          .filter(r => r.status === "approved")
                          .reduce((sum, r) => sum + (Number(r.duration) || 0), 0)
                        
                        // Calculate pending time (sum of durations for pending recordings)
                        const pendingTime = contributorRecordings
                          .filter(r => r.status === "pending")
                          .reduce((sum, r) => sum + (Number(r.duration) || 0), 0)
                        
                        const hasReachedOneHour = validatedTime >= 3600
                        
                        return { contributor, stats, validatedTime, pendingTime, hasReachedOneHour }
                      })
                      // Sort: First prioritize those with 1h+ validated (green indicator), then by validated time
                      .sort((a, b) => {
                        if (a.hasReachedOneHour && !b.hasReachedOneHour) return -1
                        if (!a.hasReachedOneHour && b.hasReachedOneHour) return 1
                        return b.validatedTime - a.validatedTime
                      })

                    // Pagination
                    const totalContributorPages = Math.ceil(contributorsData.length / contributorsPerPage)
                    const startContributorIndex = (currentContributorPage - 1) * contributorsPerPage
                    const endContributorIndex = startContributorIndex + contributorsPerPage
                    const paginatedContributors = contributorsData.slice(startContributorIndex, endContributorIndex)

                    return (
                      <>
                        {paginatedContributors.map(({ contributor, stats, validatedTime, pendingTime, hasReachedOneHour }) => {
                      return (
                        <TableRow key={contributor.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {hasReachedOneHour && (
                                <div className="w-3 h-3 bg-green-500 rounded-full" title="Reached 1 hour of approved recording time"></div>
                              )}
                              <span className="font-medium">{contributor.name || "N/A"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{contributor.email}</p>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{stats?.totalRecordings || 0}</p>
                              <p className="text-xs text-gray-500">
                                {stats?.approvedRecordings || 0} validated
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium text-green-600">{formatTime(validatedTime)}</p>
                              <p className="text-xs text-gray-500">
                                {stats?.approvedRecordings || 0} validated
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium text-yellow-600">{formatTime(pendingTime)}</p>
                              <p className="text-xs text-gray-500">
                                {recordings.filter(r => r.user_id === contributor.id && r.status === 'pending').length} pending
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant={
                                  contributor.status === "active"
                                    ? "default"
                                    : contributor.status === "pending"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {contributor.status}
                              </Badge>
                              {hasReachedOneHour && (
                                <Badge variant="outline" className="border-green-500 text-green-700">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                                  1h+ Approved
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(contributor)
                                setIsUserDetailsModalOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        )
                      })}
                      </>
                    )
                  })()}
                </TableBody>
              </Table>

              {/* Contributors Pagination */}
              {(() => {
                const contributorsCount = users.filter((u) => u.role === "contributor").length
                const totalContributorPages = Math.ceil(contributorsCount / contributorsPerPage)
                const startContributorIndex = (currentContributorPage - 1) * contributorsPerPage
                const endContributorIndex = Math.min(startContributorIndex + contributorsPerPage, contributorsCount)

                if (totalContributorPages > 1) {
                  return (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Showing {startContributorIndex + 1} to {endContributorIndex} of {contributorsCount} contributors
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentContributorPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentContributorPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center space-x-1">
                          {renderPaginationButtons(currentContributorPage, totalContributorPages, setCurrentContributorPage)}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentContributorPage(prev => Math.min(prev + 1, totalContributorPages))}
                          disabled={currentContributorPage === totalContributorPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              {users.filter((u) => u.role === "contributor").length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No contributors found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statements Tab */}
        <TabsContent value="statements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mic className="h-5 w-5" />
                <span>Mozilla API Statements</span>
              </CardTitle>
              <CardDescription>
                View all statements being fetched from Mozilla Common Voice API for contributors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500">
                  {statements.length > 0 ? (
                    <div className="flex items-center space-x-2">
                      <span>{statements.length.toLocaleString()} statements loaded</span>
                      {loadingStatements && (
                        <div className="flex items-center space-x-1 text-blue-600">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                          <span className="text-xs">Loading more...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    "No statements loaded yet"
                  )}
                </div>
                <Button
                  onClick={loadStatements}
                  disabled={loadingStatements}
                  className="flex items-center space-x-2"
                >
                  {loadingStatements ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Loading All...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Load All Statements</span>
                    </>
                  )}
                </Button>
              </div>

              {statementsError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-red-700 font-medium">Error loading statements</p>
                  </div>
                  <p className="text-red-600 text-sm mt-1">{statementsError}</p>
                </div>
              )}

              {loadingStatements && statements.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading statements from Mozilla Common Voice API...</p>
                  </div>
                </div>
              ) : statements.length === 0 ? (
                <div className="text-center py-12">
                  <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No statements loaded yet. Click "Load Statements" to fetch from Mozilla API.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginatedStatements.map((statement, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {startStatementIndex + index + 1}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-900 leading-relaxed">
                              {statement}
                            </p>
                            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                              <span>Language: Luo</span>
                              <span>Length: {statement.length} characters</span>
                              <span>Words: {statement.split(' ').length}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Statements Pagination */}
                  {totalStatementPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-gray-500">
                        Showing {startStatementIndex + 1} to {Math.min(endStatementIndex, statements.length)} of {statements.length.toLocaleString()} statements
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentStatementPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentStatementPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center space-x-1">
                          {renderPaginationButtons(currentStatementPage, totalStatementPages, setCurrentStatementPage)}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentStatementPage(prev => Math.min(prev + 1, totalStatementPages))}
                          disabled={currentStatementPage === totalStatementPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mozilla Upload Tab */}
        <TabsContent value="mozilla" className="space-y-6">
          <MozillaUploadSection />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Reviewer Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Reviewer Performance</CardTitle>
                <CardDescription>Top performers & statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users
                    .filter((u) => u.role === "reviewer" && u.status === "active")
                    .map((reviewer) => {
                      const stats = getUserStatsById(reviewer.id)
                      return { reviewer, stats }
                    })
                    .filter(({ stats }) => stats !== undefined) // Only show reviewers with loaded stats
                    .sort((a, b) => (b.stats?.totalReviews || 0) - (a.stats?.totalReviews || 0))
                    .slice(0, 2) // Show only top 2
                    .map(({ reviewer, stats }) => (
                      <div key={reviewer.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{reviewer.name || reviewer.email}</h4>
                          <Badge variant="outline">
                            {stats?.accuracyRate !== undefined ? `${stats.accuracyRate.toFixed(1)}% confidence` : 'N/A'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Total Validations</p>
                            <p className="font-bold">{stats?.totalReviews || 0}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Avg Review Time</p>
                            <p className="font-bold">{stats?.averageReviewTime.toFixed(1)}s</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Approved</p>
                            <p className="font-bold text-green-600">{stats?.approvedReviews || 0}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Edited</p>
                            <p className="font-bold text-purple-600">0</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Pass Rate</span>
                            <span>
                              {stats?.totalReviews
                                ? ((stats.approvedReviews / stats.totalReviews) * 100).toFixed(1)
                                : 0}
                              %
                            </span>
                          </div>
                          <Progress
                            value={stats?.totalReviews ? (stats.approvedReviews / stats.totalReviews) * 100 : 0}
                            className="h-2"
                          />
                        </div>
                      </div>
                    ))}
                  {users.filter((u) => u.role === "reviewer" && u.status === "active").length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No active reviewers found</p>
                    </div>
                  )}
                  {users.filter((u) => u.role === "reviewer" && u.status === "active").length > 0 && 
                   users.filter((u) => u.role === "reviewer" && u.status === "active").filter((u) => getUserStatsById(u.id) !== undefined).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>Loading reviewer statistics...</p>
                    </div>
                  )}
                  
                  {/* Show remaining reviewers in scrollable section */}
                  {users
                    .filter((u) => u.role === "reviewer" && u.status === "active")
                    .map((reviewer) => {
                      const stats = getUserStatsById(reviewer.id)
                      return { reviewer, stats }
                    })
                    .filter(({ stats }) => stats !== undefined)
                    .sort((a, b) => (b.stats?.totalReviews || 0) - (a.stats?.totalReviews || 0))
                    .slice(2) // Skip top 2
                    .length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-semibold mb-3 text-gray-700">Other Reviewers</h4>
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {users
                          .filter((u) => u.role === "reviewer" && u.status === "active")
                          .map((reviewer) => {
                            const stats = getUserStatsById(reviewer.id)
                            return { reviewer, stats }
                          })
                          .filter(({ stats }) => stats !== undefined)
                          .sort((a, b) => (b.stats?.totalReviews || 0) - (a.stats?.totalReviews || 0))
                          .slice(2) // Skip top 2
                          .map(({ reviewer, stats }) => (
                            <div key={reviewer.id} className="border rounded-lg p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-sm">{reviewer.name || reviewer.email}</h5>
                                <Badge variant="outline" className="text-xs">
                                  {stats?.accuracyRate !== undefined ? `${stats.accuracyRate.toFixed(1)}%` : 'N/A'}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <p className="text-gray-500">Validations</p>
                                  <p className="font-bold">{stats?.totalReviews || 0}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Passed</p>
                                  <p className="font-bold text-green-600">{stats?.approvedReviews || 0}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Edited</p>
                                  <p className="font-bold text-purple-600">0</p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Overall platform metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Recording Validation Rate</span>
                      <span>
                        {systemStats.totalRecordings
                          ? ((systemStats.validatedRecordings / systemStats.totalRecordings) * 100).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        systemStats.totalRecordings
                          ? (systemStats.validatedRecordings / systemStats.totalRecordings) * 100
                          : 0
                      }
                      className="h-3"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>User Activation Rate</span>
                      <span>
                        {systemStats.totalUsers
                          ? ((systemStats.activeUsers / systemStats.totalUsers) * 100).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={systemStats.totalUsers ? (systemStats.activeUsers / systemStats.totalUsers) * 100 : 0}
                      className="h-3"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {systemStats.averageRecordingDuration.toFixed(1)}s
                      </p>
                      <p className="text-xs text-gray-500">Avg Recording Duration</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{systemStats.averageValidationTime?.toFixed(1) || 0}s</p>
                      <p className="text-xs text-gray-500">Avg Validation Time</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {formatTime(systemStats.totalPendingRecordingTime)}
                      </p>
                      <p className="text-xs text-gray-500">Pending Recordings Time</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {formatTime(0)} {/* No rejected recordings */}
                      </p>
                      <p className="text-xs text-gray-500">Edited Transcriptions Time</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatTime(systemStats.totalValidatedRecordingTime || 0)}
                      </p>
                      <p className="text-xs text-gray-500">Validated Recordings Time</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {formatTime(systemStats.totalRecordingTime)}
                      </p>
                      <p className="text-xs text-gray-500">Total Recordings Time</p>
                    </div>
                  </div>

                  {/* Contributors List */}
                  <div className="pt-6 border-t">
                    <h4 className="text-sm font-semibold mb-3 text-gray-700">Top Contributors</h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                      {users
                        .filter((u) => u.role === "contributor")
                        .map((contributor) => {
                          const stats = getUserStatsById(contributor.id)
                          return { contributor, stats }
                        })
                        .filter(({ stats }) => stats !== undefined && stats.totalRecordings > 0)
                        .sort((a, b) => (b.stats?.totalRecordings || 0) - (a.stats?.totalRecordings || 0))
                        .map(({ contributor, stats }) => (
                          <div key={contributor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {contributor.name || contributor.email}
                              </p>
                              <p className="text-xs text-gray-500">
                                {contributor.email !== contributor.name && contributor.name ? contributor.email : ''}
                              </p>
                            </div>
                            <div className="flex items-center space-x-4 ml-4">
                              <div className="text-right">
                                <p className="text-lg font-bold text-blue-600">{stats?.totalRecordings || 0}</p>
                                <p className="text-xs text-gray-500">Recordings</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-green-600">{stats?.approvedRecordings || 0}</p>
                                <p className="text-xs text-gray-500">Validated</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-yellow-600">{stats?.pendingRecordings || 0}</p>
                                <p className="text-xs text-gray-500">Pending</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      {users.filter((u) => u.role === "contributor").length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>No contributors found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Audio Playback Modal */}
      <Dialog open={isAudioModalOpen} onOpenChange={setIsAudioModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Listen to Recording</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                {selectedRecording && (
                  <>
                    <p className="text-sm text-gray-600">
                      <strong>Contributor:</strong> {users.find(u => u.id === selectedRecording.user_id)?.name || users.find(u => u.id === selectedRecording.user_id)?.email}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Sentence:</strong> {selectedRecording.sentence}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Duration:</strong> {selectedRecording.duration.toFixed(1)}s
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Status:</strong> 
                      <Badge
                        variant={
                          selectedRecording.status === "approved"
                            ? "default"
                            : selectedRecording.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                        className="ml-2"
                      >
                        {selectedRecording.status}
                      </Badge>
                    </p>
                    {selectedRecording.reviewed_by && (
                      <p className="text-sm text-gray-600">
                        <strong>Reviewed by:</strong> {users.find(u => u.id === selectedRecording.reviewed_by)?.name || users.find(u => u.id === selectedRecording.reviewed_by)?.email}
                      </p>
                    )}
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="text-center mb-2">
              <p className="text-lg font-semibold text-gray-900">
                {selectedRecording?.duration.toFixed(1)}s
              </p>
              <p className="text-sm text-gray-500">Duration</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={togglePlayback}
                disabled={audioLoading || !selectedRecording?.audio_url || !!audioError}
                size="lg"
                className="w-16 h-16 rounded-full"
              >
                {audioLoading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>
            </div>
            
            {audioError && (
              <div className="text-center">
                <p className="text-sm text-red-500 mb-2">{audioError}</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setAudioError(null)
                    setAudioLoading(true)
                    if (audioRef.current && selectedRecording) {
                      audioRef.current.src = selectedRecording.audio_url
                      audioRef.current.load()
                    }
                  }}
                >
                  Retry
                </Button>
              </div>
            )}
            
            {selectedRecording?.audio_url && (
              <audio
                ref={audioRef}
                onEnded={handleAudioEnded}
                onError={handleAudioError}
                className="hidden"
              />
            )}
            
            <div className="text-center">
              <p className="text-sm text-gray-500">
                {audioLoading ? "Loading audio..." : isPlaying ? "Playing..." : "Click to play recording"}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reviewer Information Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reviewer Information</DialogTitle>
            <DialogDescription>
              Detailed information about the reviewer and their decision
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {reviewLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Loading review details...</span>
              </div>
            ) : selectedReview ? (
              <>
                {/* Recording Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">Recording Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Contributor:</strong> {users.find(u => u.id === selectedRecording?.user_id)?.name || users.find(u => u.id === selectedRecording?.user_id)?.email}</p>
                    <p><strong>Sentence:</strong> {selectedRecording?.sentence}</p>
                    <p><strong>Duration:</strong> {selectedRecording?.duration.toFixed(1)}s</p>
                    <p><strong>Status:</strong> 
                      <Badge
                        variant={
                          selectedReview.decision === "approved"
                            ? "default"
                            : "destructive"
                        }
                        className="ml-2"
                      >
                        {selectedReview.decision}
                      </Badge>
                    </p>
                  </div>
                </div>

                {/* Reviewer Information */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-blue-900 mb-2">Reviewer Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {users.find(u => u.id === selectedReview.reviewer_id)?.name || "Not provided"}</p>
                    <p><strong>Email:</strong> {users.find(u => u.id === selectedReview.reviewer_id)?.email}</p>
                    <p><strong>Role:</strong> {users.find(u => u.id === selectedReview.reviewer_id)?.role}</p>
                    <p><strong>Review Date:</strong> {new Date(selectedReview.created_at).toLocaleDateString()}</p>
                    <p><strong>Review Time:</strong> {new Date(selectedReview.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>

                {/* Review Decision */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-green-900 mb-2">Review Decision</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span><strong>Decision:</strong></span>
                      <Badge
                        variant={
                          selectedReview.decision === "approved"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {selectedReview.decision}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span><strong>Confidence:</strong></span>
                      <span className="font-medium">{selectedReview.confidence}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span><strong>Time Spent:</strong></span>
                      <span className="font-medium">{selectedReview.time_spent}s</span>
                    </div>
                    {selectedReview.notes && (
                      <div className={`${
                        selectedReview.decision === 'rejected' ? 'col-span-2' : ''
                      }`}>
                        <span><strong>{selectedReview.decision === 'rejected' ? 'Rejection Reason' : 'Notes'}:</strong></span>
                        <p className={`mt-1 text-gray-700 rounded p-3 border ${
                          selectedReview.decision === 'rejected' 
                            ? 'bg-red-50 border-red-200 font-medium' 
                            : 'bg-white'
                        }`}>
                          {selectedReview.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-purple-900 mb-2">Reviewer Performance</h4>
                  <div className="space-y-1 text-sm">
                    {(() => {
                      const reviewerStats = getUserStatsById(selectedReview.reviewer_id)
                      return (
                        <>
                          <p><strong>Total Validations:</strong> {reviewerStats?.totalReviews || 0}</p>
                          <p><strong>Pass Rate:</strong> {reviewerStats?.totalReviews ? ((reviewerStats.approvedReviews / reviewerStats.totalReviews) * 100).toFixed(1) : 0}%</p>
                          <p><strong>Average Validation Time:</strong> {reviewerStats?.averageReviewTime.toFixed(1) || 0}s</p>
                          <p><strong>Average Confidence:</strong> {reviewerStats?.accuracyRate.toFixed(1) || 0}%</p>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No review information available</p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={closeReviewModal}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      <Dialog open={isUserDetailsModalOpen} onOpenChange={setIsUserDetailsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete information about the selected user
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {selectedUser && (
              <>
                {/* Basic Information */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-blue-900 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600"><strong>Name:</strong></p>
                      <p className="text-gray-900">{selectedUser.name || "Not provided"}</p>
    </div>
                    <div>
                      <p className="text-gray-600"><strong>Email:</strong></p>
                      <p className="text-gray-900">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Role:</strong></p>
                      <Badge
                        variant={
                          selectedUser.role === "reviewer" ? "secondary" : selectedUser.role === "admin" ? "default" : "outline"
                        }
                      >
                        {selectedUser.role}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Status:</strong></p>
                      <Badge
                        variant={
                          selectedUser.status === "active"
                            ? "default"
                            : selectedUser.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className={
                          selectedUser.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : selectedUser.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : ""
                        }
                      >
                        {selectedUser.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Join Date:</strong></p>
                      <p className="text-gray-900">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Profile Complete:</strong></p>
                      <p className="text-gray-900">{selectedUser.profile_complete ? "Yes" : "No"}</p>
                    </div>
                  </div>
                </div>

                {/* Demographics & Contact */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-green-900 mb-3">Demographics & Contact Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600"><strong>ID Number:</strong></p>
                      <p className="text-gray-900">{(selectedUser as any).id_number || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Age:</strong></p>
                      <p className="text-gray-900">{selectedUser.age || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Gender:</strong></p>
                      <p className="text-gray-900">{selectedUser.gender || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Phone Number:</strong></p>
                      <p className="text-gray-900">{selectedUser.phone_number || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Location:</strong></p>
                      <p className="text-gray-900">{selectedUser.location || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Constituency:</strong></p>
                      <p className="text-gray-900">{(selectedUser as any).constituency || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Educational Background:</strong></p>
                      <p className="text-gray-900">{selectedUser.educational_background || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Employment Status:</strong></p>
                      <p className="text-gray-900">{selectedUser.employment_status || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Language Dialect:</strong></p>
                      <p className="text-gray-900">{selectedUser.language_dialect || (selectedUser as any).accent_dialect || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Accent Dialect:</strong></p>
                      <p className="text-gray-900">{(selectedUser as any).accent_dialect || selectedUser.language_dialect || "Not provided"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-600"><strong>Accent Description:</strong></p>
                      <p className="text-gray-900">{(selectedUser as any).accent_description || "Not provided"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-600"><strong>Languages:</strong></p>
                      <p className="text-gray-900">
                        {selectedUser.languages && selectedUser.languages.length > 0 
                          ? selectedUser.languages.join(", ") 
                          : "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance Statistics */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-purple-900 mb-3">Performance Statistics</h4>
                  <div className="space-y-4">
                    {(() => {
                      const stats = getUserStatsById(selectedUser.id)
                      return (
                        <>
                          {selectedUser.role === "contributor" && (
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="text-center p-3 bg-white rounded border">
                                <p className="text-2xl font-bold text-blue-600">{stats?.totalRecordings || 0}</p>
                                <p className="text-xs text-gray-600">Total Recordings</p>
                              </div>
                              <div className="text-center p-3 bg-white rounded border">
                                <p className="text-2xl font-bold text-green-600">{stats?.approvedRecordings || 0}</p>
                                <p className="text-xs text-gray-600">Approved</p>
                              </div>
                              <div className="text-center p-3 bg-white rounded border">
                                <p className="text-2xl font-bold text-red-600">{stats?.rejectedRecordings || 0}</p>
                                <p className="text-xs text-gray-600">Rejected</p>
                              </div>
                            </div>
                          )}
                          
                          {selectedUser.role === "reviewer" && (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="text-center p-3 bg-white rounded border">
                                <p className="text-2xl font-bold text-blue-600">{stats?.totalReviews || 0}</p>
                                <p className="text-xs text-gray-600">Total Validations</p>
                              </div>
                              <div className="text-center p-3 bg-white rounded border">
                                <p className="text-2xl font-bold text-purple-600">{stats?.accuracyRate?.toFixed(1) || 0}%</p>
                                <p className="text-xs text-gray-600">Avg Confidence</p>
                              </div>
                              <div className="text-center p-3 bg-white rounded border">
                                <p className="text-2xl font-bold text-green-600">{stats?.approvedReviews || 0}</p>
                                <p className="text-xs text-gray-600">Passed (Correct)</p>
                              </div>
                              <div className="text-center p-3 bg-white rounded border">
                                <p className="text-2xl font-bold text-orange-600">{stats?.averageReviewTime?.toFixed(1) || 0}s</p>
                                <p className="text-xs text-gray-600">Avg Validation Time</p>
                              </div>
                            </div>
                          )}

                          {selectedUser.role === "admin" && (
                            <div className="text-center p-4 bg-white rounded border">
                              <p className="text-lg font-semibold text-gray-700">System Administrator</p>
                              <p className="text-sm text-gray-500">Full system access and management privileges</p>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Recent Activity */}
                {selectedUser.role === "contributor" && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-orange-900 mb-3">Recent Recordings</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {getRecordingsByUser(selectedUser.id).slice(0, 5).map((recording) => (
                        <div key={recording.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                          <div className="flex-1">
                            <p className="font-medium truncate max-w-xs">{recording.sentence}</p>
                            <p className="text-xs text-gray-500">{new Date(recording.created_at).toLocaleDateString()}</p>
                          </div>
                          <Badge
                            variant={
                              recording.status === "approved"
                                ? "default"
                                : recording.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {recording.status}
                          </Badge>
                        </div>
                      ))}
                      {getRecordingsByUser(selectedUser.id).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No recordings yet</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedUser.role === "reviewer" && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-orange-900 mb-3">Recent Reviews</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {getReviewsByReviewer(selectedUser.id).slice(0, 5).map((review) => {
                        const recording = recordings.find(r => r.id === review.recording_id)
                        return (
                          <div key={review.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                            <div className="flex-1">
                              <p className="font-medium truncate max-w-xs">{recording?.sentence || "Recording not found"}</p>
                              <p className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>
                            </div>
                            <Badge
                              variant={
                                review.decision === "approved"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {review.decision}
                            </Badge>
                          </div>
                        )
                      })}
                      {getReviewsByReviewer(selectedUser.id).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No reviews yet</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={closeUserDetailsModal}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
