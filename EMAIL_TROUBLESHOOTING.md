# Email Troubleshooting Guide

## Email Not Arriving Even Though API Shows Success

If you see `✅ Email sent via Gmail` but the email doesn't arrive, here are the most common causes:

### 1. Check Spam/Junk Folder 📬

**Most common issue!** Gmail often filters automated emails to spam, especially:
- First few emails from a new sender
- Emails with HTML content
- Emails from apps/automated systems

**Solution:**
- Ask the reviewer to check their **Spam/Junk folder**
- Ask them to mark it as "Not Spam" if found
- Future emails should go to inbox

### 2. Verify Email Address is Correct ✅

The email might be sent to the wrong address. Check:

**In Admin Dashboard:**
1. Click "Details" button next to the reviewer
2. Verify the email address shown matches the reviewer's actual email
3. Check for typos (missing letters, wrong domain, etc.)

**Common issues:**
- Email stored in database with typos
- Email address changed but not updated in system
- Multiple accounts with similar emails

**Solution:**
- Manually verify the email address in the user details
- Update if incorrect in the database

### 3. Email Delivery Delay ⏱️

Sometimes emails take a few minutes to arrive.

**Solution:**
- Wait 5-10 minutes
- Check spam folder after waiting
- If still not received after 10 minutes, likely spam or wrong address

### 4. Gmail Sending Limits 🚫

Gmail has sending limits:
- **Free Gmail**: 500 emails/day
- **Google Workspace**: 2000 emails/day

**Check if you hit the limit:**
- Check Gmail account settings
- Wait 24 hours if limit reached
- Consider using multiple Gmail accounts for higher volume

### 5. Gmail Account Issues 🔒

**Issues to check:**
- App Password might be expired or revoked
- Gmail account might be locked/suspended
- 2-Step Verification might be disabled

**Solution:**
1. Go to https://myaccount.google.com/apppasswords
2. Generate a new app password
3. Update `GMAIL_APP_PASSWORD` in Vercel environment variables
4. Redeploy

### 6. Verify Email Was Actually Sent 🔍

**Check Vercel Function Logs:**
1. Go to Vercel Dashboard → Your Project → Functions
2. Click on `/api/email` function
3. Check the logs for:
   - Actual recipient email address
   - Any error messages
   - Gmail response details

**What to look for:**
```
📧 Attempting to send email:
   From: Common Voice Luo <your-email@gmail.com>
   To: reviewer@example.com  ← Verify this is correct
   Subject: Reviewer Application Approved - Common Voice Luo
✅ Email sent via Gmail: <message-id>
```

### 7. Email Address Format Issues 📧

**Common format problems:**
- Email has extra spaces: `reviewer@email.com ` (trailing space)
- Email has special characters that need encoding
- Email is empty or null

**Solution:**
- Check the logs for the exact email address being used
- Ensure email is trimmed: `email.trim()`
- Verify email format matches: `user@domain.com`

## Debugging Steps

### Step 1: Check the Logs

In your terminal or Vercel logs, you should see:
```
📧 Preparing to send approval email to: reviewer@example.com
   Reviewer name: John Doe
   Reviewer ID: uuid-here
```

Verify:
- ✅ Email address looks correct
- ✅ No obvious typos
- ✅ Domain looks valid

### Step 2: Test Email Sending Directly

Create a test API call to verify Gmail SMTP works:

```bash
curl -X POST https://your-domain.vercel.app/api/email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-test-email@gmail.com",
    "subject": "Test Email",
    "html": "<h1>Test</h1>",
    "type": "approval"
  }'
```

### Step 3: Check Gmail Sent Items

1. Log into the Gmail account used for sending (`GMAIL_USER`)
2. Check "Sent" folder
3. Verify:
   - Email appears in sent folder
   - Correct recipient address
   - Email was sent successfully

**If email is NOT in sent folder:**
- Gmail blocked the send
- Check Gmail for security alerts
- App password might be invalid

### Step 4: Verify Environment Variables

In Vercel:
1. Settings → Environment Variables
2. Verify:
   - `GMAIL_USER` = correct Gmail address
   - `GMAIL_APP_PASSWORD` = valid 16-character app password
   - No extra spaces or quotes

### Step 5: Check Email in Database

Verify the email stored in database matches what reviewer expects:

```sql
SELECT id, email, name, role, status 
FROM users 
WHERE role = 'reviewer' AND status = 'pending';
```

## Quick Fixes

### Fix 1: Resend Email (If Wrong Address)
1. Update email in database if incorrect
2. Re-approve the reviewer (or create a resend function)

### Fix 2: Check Spam Folder
Ask reviewer to:
1. Check Spam/Junk folder
2. Mark as "Not Spam"
3. Add sender to contacts (optional)

### Fix 3: Verify App Password
1. Generate new app password
2. Update in Vercel
3. Redeploy

### Fix 4: Use Different Gmail Account
If current Gmail has issues:
1. Use a different Gmail account
2. Generate new app password
3. Update `GMAIL_USER` and `GMAIL_APP_PASSWORD`
4. Redeploy

## Still Not Working?

If emails still don't arrive after checking all above:

1. **Check Gmail Account Status**
   - Log into sending Gmail account
   - Check for security alerts
   - Verify account isn't locked

2. **Try Manual Test**
   - Send a test email from the Gmail account manually
   - If manual email works, issue is with API
   - If manual email fails, Gmail account has issues

3. **Check Vercel Logs**
   - Look for any error messages
   - Check function execution time
   - Verify environment variables are loaded

4. **Alternative: Use Different Email Provider**
   - Try Outlook SMTP
   - Use SendGrid or Mailgun
   - Configure in environment variables

## Prevention

To avoid issues:
- ✅ Always verify email addresses when users register
- ✅ Send test emails before production use
- ✅ Monitor Gmail sending limits
- ✅ Keep app passwords updated
- ✅ Use a dedicated Gmail account for sending

---

**Remember**: If API shows success but email doesn't arrive, it's almost always:
1. **In spam folder** (90% of cases)
2. **Wrong email address** (8% of cases)
3. **Gmail blocking/filtering** (2% of cases)

