# Email Notifications Setup Guide

## Overview

The system now sends automated email notifications to reviewers when an admin approves or rejects their application. The email service supports multiple providers for maximum flexibility.

## Features

✅ **Automatic Email Notifications**
- Approval emails when a reviewer is approved
- Rejection emails when a reviewer is rejected
- Beautiful HTML email templates
- Professional email design

✅ **Multiple Email Providers**
- **Gmail SMTP** (⭐ Easiest - Free, no domain verification)
- **Custom SMTP** (Any email provider)
- **Resend** (Requires domain verification)
- **Development Mode** (Console logging)

## Setup Instructions

### ⭐ Option 1: Gmail SMTP (EASIEST - Recommended for Free Domains)

**Perfect for Vercel free domains! No domain verification needed.**

See `EMAIL_SETUP_SIMPLE.md` for quick 5-minute setup guide.

**Quick steps:**
1. Get Gmail App Password (requires 2-Step Verification)
2. Add to `.env.local`: `GMAIL_USER` and `GMAIL_APP_PASSWORD`
3. Deploy!

### Option 2: Custom SMTP (Any Provider)

[Resend](https://resend.com) is a modern email API that's easy to set up and reliable.

1. **Sign up for Resend**
   - Go to https://resend.com
   - Create a free account (100 emails/day on free tier)

2. **Get your API key**
   - Navigate to API Keys in your Resend dashboard
   - Create a new API key
   - Copy the API key

3. **Configure environment variables**
   Add to your `.env.local` file:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   EMAIL_FROM=Common Voice Luo <noreply@yourdomain.com>
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

4. **Verify your domain** (for production)
   - Add your domain in Resend dashboard
   - Add DNS records as instructed
   - This ensures emails aren't marked as spam

For custom email servers (Outlook, Yahoo, SendGrid, etc.).

1. **Configure environment variables**
   Add to your `.env.local` file:
   ```env
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=587
   SMTP_USER=your-email@outlook.com
   SMTP_PASS=your-password
   EMAIL_FROM=Common Voice Luo <your-email@outlook.com>
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

2. **Common SMTP Settings**
   - Gmail: `smtp.gmail.com:587` (use GMAIL_USER/GMAIL_APP_PASSWORD instead)
   - Outlook: `smtp-mail.outlook.com:587`
   - Yahoo: `smtp.mail.yahoo.com:587`

### Option 3: Resend (Requires Domain Verification)

If no email provider is configured, emails will be logged to the console in development mode. This is perfect for testing without setting up an email service.

**No configuration needed** - just start your development server!

## Email Templates

### Approval Email
- **Subject**: "Reviewer Application Approved - Common Voice Luo"
- **Content**: 
  - Congratulatory message
  - Link to dashboard
  - Professional styling
  - Responsive design

### Rejection Email
- **Subject**: "Reviewer Application Update - Common Voice Luo"
- **Content**:
  - Polite rejection message
  - Encouragement to reapply
  - Information about contributor option
  - Professional styling

## How It Works

1. **Admin Action**: Admin clicks "Approve" or "Reject" on a reviewer application

2. **Database Update**: User status is updated in the database

3. **Email Generation**: System generates a personalized HTML email template

4. **Email Sending**: Email is sent via the configured provider (Resend/SMTP)

5. **Error Handling**: If email fails, the approval/rejection still completes (email is non-blocking)

## Testing

### Test in Development Mode
1. Start your development server
2. Approve or reject a reviewer
3. Check the console for the email content

### Test with Resend
1. Set up Resend API key
2. Use a test email address
3. Approve or reject a reviewer
4. Check the test email inbox

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `RESEND_API_KEY` | Yes (for Resend) | Resend API key | `re_xxxxx` |
| `EMAIL_FROM` | Recommended | Sender email address | `Common Voice Luo <noreply@domain.com>` |
| `NEXT_PUBLIC_APP_URL` | Recommended | Your app URL for email links | `https://yourdomain.com` |
| `SMTP_HOST` | Yes (for SMTP) | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | Yes (for SMTP) | SMTP server port | `587` |
| `SMTP_USER` | Yes (for SMTP) | SMTP username/email | `user@gmail.com` |
| `SMTP_PASS` | Yes (for SMTP) | SMTP password/app password | `xxxx xxxx xxxx xxxx` |

## Troubleshooting

### Emails not sending

1. **Check environment variables**
   - Ensure `RESEND_API_KEY` or SMTP credentials are set
   - Verify `.env.local` file is in the project root
   - Restart your development server after adding env variables

2. **Check console logs**
   - Look for email sending errors in the console
   - Check for success messages: `✅ Email notification sent to: email@example.com`

3. **Resend Issues**
   - Verify your API key is correct
   - Check Resend dashboard for send logs
   - Ensure domain is verified (for production)

4. **SMTP Issues**
   - Verify SMTP credentials are correct
   - For Gmail, use an App Password (not your regular password)
   - Check firewall/network restrictions

### Development Mode

If emails are being logged to console but not sent:
- This is expected behavior when no email provider is configured
- Set up Resend or SMTP to actually send emails

## Security Notes

- **Never commit API keys** to version control
- Use environment variables for all sensitive credentials
- Verify your domain in Resend for better deliverability
- Use App Passwords for Gmail (not your regular password)

## Production Deployment

For production:

1. **Set environment variables** in your hosting platform (Vercel, Netlify, etc.)
2. **Verify your domain** in Resend (recommended)
3. **Test email sending** with a real email address
4. **Monitor email logs** in Resend dashboard

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify environment variables are set correctly
3. Test with development mode first
4. Check Resend/SMTP provider documentation

---

**Note**: Email failures are non-blocking - the approval/rejection process will complete even if the email fails to send. This ensures the admin workflow is never interrupted by email issues.

