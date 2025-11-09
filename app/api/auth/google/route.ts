import { NextRequest, NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { db } from '@/lib/database'

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NODE_ENV === 'production' 
    ? 'https://yourdomain.com/auth/google/callback'
    : 'http://localhost:3000/auth/google/callback'
)

export async function POST(request: NextRequest) {
  try {
    const { code, role } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 })
    }

    if (!role || role !== 'reviewer') {
      return NextResponse.json({ error: 'Invalid role provided' }, { status: 400 })
    }

    // Exchange authorization code for tokens
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    // Get user info from Google
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const { email, name, picture } = payload

    if (!email) {
      return NextResponse.json({ error: 'No email found in Google account' }, { status: 400 })
    }

    // Check if user already exists with the same email AND role
    // Users can have the same email for different roles (reviewer + admin)
    const existingUser = await db.getUserByEmailAndRole(email.toLowerCase().trim(), role)

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
          language_dialect: existingUser.language_dialect,
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
        email: email.toLowerCase().trim(),
        password: "", // OAuth users don't have passwords
        role: role,
        status: role === "reviewer" ? "pending" : "active",
        profile_complete: profileDataToCopy ? true : false,
        name: profileDataToCopy?.name || name || email.split('@')[0],
        age: profileDataToCopy?.age || null,
        gender: profileDataToCopy?.gender || null,
        languages: profileDataToCopy?.languages || null,
        location: profileDataToCopy?.location || null,
        constituency: profileDataToCopy?.constituency || null,
        language_dialect: profileDataToCopy?.language_dialect || null,
        educational_background: profileDataToCopy?.educational_background || null,
        employment_status: profileDataToCopy?.employment_status || null,
        phone_number: profileDataToCopy?.phone_number || null,
        id_number: (profileDataToCopy as any)?.id_number || null,
        accent_dialect: (profileDataToCopy as any)?.accent_dialect || null,
        accent_description: (profileDataToCopy as any)?.accent_description || null,
        is_active: true,
      } as any)

      // If profile data was copied, also copy custom fields via updateUser
      // This is a backup in case some fields weren't included in createUser
      if (profileDataToCopy && role === "reviewer") {
        try {
          const customFields: any = {}
          if (profileDataToCopy.id_number) customFields.id_number = profileDataToCopy.id_number
          if (profileDataToCopy.accent_dialect) customFields.accent_dialect = profileDataToCopy.accent_dialect
          if (profileDataToCopy.accent_description) customFields.accent_description = profileDataToCopy.accent_description
          
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
          language_dialect: newUser.language_dialect,
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
    console.error('Google OAuth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
