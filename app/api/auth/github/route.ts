import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'
import { db } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { code, role } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }

    if (!role || role !== 'reviewer') {
      return NextResponse.json({ error: 'Invalid role provided' }, { status: 400 })
    }

    // Build redirect_uri to match the authorize request exactly
    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://yourdomain.com/auth/github/callback'
      : 'http://localhost:3000/auth/github/callback'

    const clientId = process.env.GITHUB_CLIENT_ID || process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET

    if (!clientId) {
      return NextResponse.json({ error: 'Server missing GITHUB_CLIENT_ID/NEXT_PUBLIC_GITHUB_CLIENT_ID' }, { status: 500 })
    }
    if (!clientSecret) {
      return NextResponse.json({ error: 'Server missing GITHUB_CLIENT_SECRET' }, { status: 500 })
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      // Surface GitHub's error payload for easier debugging
      return NextResponse.json({ 
        error: 'GitHub token endpoint error', 
        details: tokenData 
      }, { status: 400 })
    }

    if (!tokenData.access_token) {
      return NextResponse.json({ error: 'Failed to get access token', details: tokenData }, { status: 400 })
    }

    // Get user info from GitHub
    const octokit = new Octokit({
      auth: tokenData.access_token,
    })

    const { data: userData } = await octokit.users.getAuthenticated()

    // GitHub may not return public email on the user object when it's private
    let userEmail = userData.email || null
    if (!userEmail) {
      try {
        // Requires scope: user:email (we request this in the authorize URL)
        const { data: emails } = await octokit.request('GET /user/emails')
        // Prefer primary and verified email, fall back to first verified, then first available
        const primaryVerified = emails.find((e: any) => e.primary && e.verified)
        const firstVerified = emails.find((e: any) => e.verified)
        const anyEmail = emails[0]
        userEmail = (primaryVerified?.email || firstVerified?.email || anyEmail?.email) ?? null
      } catch (e) {
        // ignore and handle below if still null
      }
    }

    if (!userEmail) {
      return NextResponse.json({ error: 'No email found in GitHub account. Please add an email to your GitHub account or make one available to applications.' }, { status: 400 })
    }

    // Check if user already exists with the same email AND role
    // Users can have the same email for different roles (reviewer + admin)
    const existingUser = await db.getUserByEmailAndRole(userEmail.toLowerCase().trim(), role)

    if (existingUser) {
      // Existing user with same role - sign them in
      if (existingUser.role === "admin") {
        return NextResponse.json({ error: "Admin users must use admin login" }, { status: 403 })
      }

      if (existingUser.role === "reviewer" && existingUser.status === "pending") {
        return NextResponse.json({ error: "Your reviewer account is pending approval. Please wait for admin approval." }, { status: 403 })
      }

      if (existingUser.role === "reviewer" && existingUser.status === "rejected") {
        return NextResponse.json({ error: "Your reviewer application has been rejected." }, { status: 403 })
      }

      if (!existingUser.is_active) {
        return NextResponse.json({ error: "Your account has been deactivated. Please contact support." }, { status: 403 })
      }

      // Update last login
      await db.updateUser(existingUser.id, {
        last_login_at: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          role: existingUser.role,
          status: existingUser.status,
          profile_complete: existingUser.profile_complete,
          name: existingUser.name,
          age: existingUser.age,
          gender: existingUser.gender,
          languages: existingUser.languages,
          location: existingUser.location,
          constituency: existingUser.constituency,
          educational_background: existingUser.educational_background,
          employment_status: existingUser.employment_status,
          phone_number: existingUser.phone_number,
          created_at: existingUser.created_at,
          updated_at: existingUser.updated_at,
          last_login_at: new Date().toISOString(),
          is_active: existingUser.is_active,
        },
        isNewUser: false
      })
    } else {
      // No existing user with this email+role combination
      // Check for existing account with different role to copy profile data
      let profileDataToCopy: any = null
      // Only reviewer role is supported now
      if (role === "reviewer") {
        // Reviewer creating account - no need to copy from contributor anymore
        profileDataToCopy = null
      }

      // Create new account (even if the email exists with a different role)
      const newUser = await db.createUser({
        email: userEmail.toLowerCase().trim(),
        password: "", // OAuth users don't have passwords
        role: role,
        status: role === "reviewer" ? "pending" : "active",
        profile_complete: profileDataToCopy ? true : false,
        name: profileDataToCopy?.name || userData.name || userData.login || userEmail.split('@')[0],
        age: profileDataToCopy?.age || null,
        gender: profileDataToCopy?.gender || null,
        languages: profileDataToCopy?.languages || null,
        location: profileDataToCopy?.location || null,
        constituency: profileDataToCopy?.constituency || null,
        educational_background: profileDataToCopy?.educational_background || null,
        employment_status: profileDataToCopy?.employment_status || null,
        phone_number: profileDataToCopy?.phone_number || null,
        id_number: (profileDataToCopy as any)?.id_number || null,
        is_active: true,
      } as any)

      // If profile data was copied, also copy custom fields via updateUser
      // This is a backup in case some fields weren't included in createUser
      if (profileDataToCopy && role === "reviewer") {
        try {
          const customFields: any = {}
          if (profileDataToCopy.id_number) customFields.id_number = profileDataToCopy.id_number
          
          if (Object.keys(customFields).length > 0) {
            await db.updateUser(newUser.id, customFields)
          }
        } catch (error) {
          console.warn("Could not copy all profile fields for OAuth user, but account was created:", error)
        }
      }

      return NextResponse.json({
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          profile_complete: newUser.profile_complete,
          name: newUser.name,
          age: newUser.age,
          gender: newUser.gender,
          languages: newUser.languages,
          location: newUser.location,
          constituency: newUser.constituency,
          educational_background: newUser.educational_background,
          employment_status: newUser.employment_status,
          phone_number: newUser.phone_number,
          created_at: newUser.created_at,
          updated_at: newUser.updated_at,
          last_login_at: newUser.last_login_at,
          is_active: newUser.is_active,
        },
        isNewUser: true
      })
    }
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
