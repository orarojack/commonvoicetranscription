# OAuth Setup Guide

This guide explains how to set up Google and GitHub OAuth authentication for the Common Voice Luo platform.

## Required Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Existing Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# GitHub OAuth Configuration
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

## Google OAuth Setup

### 1. Create Google OAuth Application

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
7. Copy the **Client ID**

### 2. Configure Environment Variables

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_ID=your_google_client_id_here
```

## GitHub OAuth Setup

### 1. Create GitHub OAuth Application

1. Go to GitHub → **Settings** → **Developer settings** → **OAuth Apps**
2. Click **New OAuth App**
3. Fill in the application details:
   - **Application name**: Common Voice Luo
   - **Homepage URL**: `https://yourdomain.com`
   - **Authorization callback URL**: `https://yourdomain.com/auth/github/callback`
4. Click **Register application**
5. Copy the **Client ID** and generate a **Client Secret**

### 2. Configure Environment Variables

```env
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

## OAuth Flow

### For New Users (Signup)

1. **Contributor**: 
   - Creates account immediately
   - Redirected to profile setup
   - After profile completion → `/speak`

2. **Reviewer**: 
   - Creates account with "pending" status
   - Needs admin approval before access
   - Redirected to signin page with pending message

### For Existing Users (Signin)

1. **Contributor**: 
   - If profile incomplete → `/profile/setup`
   - If profile complete → `/speak`

2. **Reviewer**: 
   - If profile incomplete → `/profile/setup`
   - If profile complete → `/listen`
   - If pending → Error message

3. **Admin**: 
   - Redirected to `/admin`

## Security Notes

- **Never commit** your `.env.local` file to version control
- Use different OAuth applications for development and production
- Regularly rotate your OAuth client secrets
- Monitor OAuth usage in your Google Cloud Console and GitHub settings

## Testing

1. Start the development server: `npm run dev`
2. Go to `/auth/signup` or `/auth/signin`
3. Click "Continue with Google" or "Continue with GitHub"
4. Complete the OAuth flow
5. Verify the redirect behavior based on user type and profile status

## Troubleshooting

### Common Issues

1. **"OAuth client not found"**
   - Check that your Client ID is correct
   - Ensure the OAuth application is properly configured

2. **"Redirect URI mismatch"**
   - Verify the redirect URIs in your OAuth application settings
   - Check that the callback URL matches exactly

3. **"Invalid client secret"**
   - Regenerate the client secret in your OAuth application
   - Update the environment variable

4. **"Email not found"**
   - For GitHub: Ensure the user's email is public or add it to their profile
   - For Google: This shouldn't happen with proper setup

### Debug Mode

Enable debug logging by adding to your `.env.local`:

```env
NODE_ENV=development
```

This will show detailed OAuth flow information in the browser console.
