"use client"

import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        if (!isLoading) {
          if (!user) {
            // Redirect non-authenticated users to signin
            router.push("/auth/signin")
            return
          }

          console.log("User state:", user)
          console.log("Profile complete:", user?.profile_complete)
          
          if (!user.profile_complete) {
            console.log("Profile not complete, redirecting to setup")
            router.push("/profile/setup")
          } else {
            // Redirect based on user role
            console.log("Profile complete, redirecting based on role:", user.role)
            if (user.role === "reviewer") {
              router.push("/listen")
            } else if (user.role === "admin") {
              router.push("/admin")
            } else {
              router.push("/dashboard")
            }
          }
        }
      } catch (error) {
        console.error("Navigation error:", error)
        // Redirect to signin on error
        router.push("/auth/signin")
      }
    }

    handleRedirect()
  }, [user, isLoading, router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}
