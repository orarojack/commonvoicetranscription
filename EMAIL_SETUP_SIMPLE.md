# Simple Email Setup - Gmail (Easiest Method) 📧

## Quick Setup (5 minutes)

Since Resend requires domain verification, we'll use **Gmail SMTP** instead - it's free and works with any domain, including free Vercel domains!

### Step 1: Get Gmail App Password

1. **Enable 2-Step Verification** (if not already enabled)
   - Go to your Google Account: https://myaccount.google.com/
   - Click "Security" → Enable "2-Step Verification"

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Or: Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Name it: "Common Voice Luo"
   - Copy the 16-character password (looks like: `abcd efgh ijkl mnop`)

### Step 2: Add to Environment Variables

Add these to your `.env.local` file:

```env
# Gmail SMTP (EASIEST - Free, works with any domain)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop

# Optional: Customize sender name
EMAIL_FROM=Common Voice Luo <your-email@gmail.com>
NEXT_PUBLIC_APP_URL=https://commonvoicedataluo.vercel.app
```

**Important**: Remove any spaces from the app password (or it will work with spaces too)

### Step 3: Deploy to Vercel

1. **Add Environment Variables in Vercel**
   - Go to your project on Vercel
   - Settings → Environment Variables
   - Add:
     - `GMAIL_USER` = your Gmail address
     - `GMAIL_APP_PASSWORD` = the 16-character app password
     - `EMAIL_FROM` = `Common Voice Luo <your-email@gmail.com>`
     - `NEXT_PUBLIC_APP_URL` = `https://commonvoicedataluo.vercel.app`

2. **Redeploy**
   - Click "Deployments" → "Redeploy" (or push new code)

### Step 4: Test It!

1. Go to your admin dashboard
2. Approve or reject a reviewer
3. Check the reviewer's email inbox!

---

## Why Gmail SMTP?

✅ **Free** - No cost at all  
✅ **Works with any domain** - No domain verification needed  
✅ **Easy setup** - Just get an app password  
✅ **Reliable** - Gmail's infrastructure  
✅ **Production ready** - Used by millions of apps  

## Limits

- **500 emails/day** per Gmail account (plenty for most use cases)
- For higher limits, you can use multiple Gmail accounts or upgrade to Google Workspace

## Troubleshooting

### "Invalid login" error
- Make sure you're using an **App Password**, not your regular Gmail password
- Ensure 2-Step Verification is enabled
- Copy the app password exactly (spaces are okay)

### Emails going to spam
- This is normal for new senders
- Emails will go to inbox after a few successful sends
- Recipients can mark as "Not Spam" to improve deliverability

### Not receiving emails
1. Check spam folder
2. Verify environment variables are set in Vercel
3. Check Vercel function logs for errors
4. Make sure you redeployed after adding env variables

---

## Alternative: Custom SMTP (Outlook, Yahoo, etc.)

If you prefer a different email provider:

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
EMAIL_FROM=Common Voice Luo <your-email@outlook.com>
```

Common SMTP settings:
- **Gmail**: `smtp.gmail.com:587`
- **Outlook**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`

---

That's it! You're all set! 🎉

