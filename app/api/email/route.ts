import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

interface EmailRequest {
  to: string
  subject: string
  html: string
  type: 'approval' | 'rejection'
}

/**
 * Send email notification to reviewer
 * EASIEST OPTION: Gmail SMTP (Free, no domain verification needed)
 * - Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables
 * 
 * Alternative providers:
 * - Resend: Set RESEND_API_KEY env variable
 * - Custom SMTP: Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * - Development: Logs to console if no provider configured
 */
export async function POST(request: NextRequest) {
  try {
    const body: EmailRequest = await request.json()
    const { to, subject, html, type } = body

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    let emailSent = false
    let error: string | null = null
    let provider = 'none'

    // EASIEST OPTION: Gmail SMTP (Free, no domain verification needed)
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        })

        const mailOptions = {
          from: process.env.EMAIL_FROM || `Common Voice Luo <${process.env.GMAIL_USER}>`,
          to,
          subject,
          html,
        }

        // Log email details for debugging
        console.log('📧 Attempting to send email:')
        console.log('   From:', mailOptions.from)
        console.log('   To:', mailOptions.to)
        console.log('   Subject:', mailOptions.subject)
        
        const info = await transporter.sendMail(mailOptions)
        console.log('✅ Email sent via Gmail:', info.messageId)
        console.log('   Response:', JSON.stringify(info, null, 2))
        emailSent = true
        provider = 'gmail'
      } catch (err) {
        error = `Gmail SMTP error: ${err instanceof Error ? err.message : String(err)}`
        console.error('Gmail SMTP error:', err)
      }
    }

    // Option 2: Custom SMTP (any email provider)
    if (!emailSent && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        })

        const mailOptions = {
          from: process.env.EMAIL_FROM || `Common Voice Luo <${process.env.SMTP_USER}>`,
          to,
          subject,
          html,
        }

        const info = await transporter.sendMail(mailOptions)
        console.log('✅ Email sent via SMTP:', info.messageId)
        emailSent = true
        provider = 'smtp'
      } catch (err) {
        error = `SMTP error: ${err instanceof Error ? err.message : String(err)}`
        console.error('SMTP error:', err)
      }
    }

    // Option 3: Resend (requires domain verification)
    if (!emailSent && process.env.RESEND_API_KEY) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'Common Voice Luo <noreply@commonvoiceluo.org>',
            to: [to],
            subject,
            html,
          }),
        })

        if (resendResponse.ok) {
          emailSent = true
          provider = 'resend'
        } else {
          const errorData = await resendResponse.json()
          error = `Resend error: ${JSON.stringify(errorData)}`
        }
      } catch (err) {
        error = `Resend request failed: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    // Development mode: Log email if no provider is configured
    if (!emailSent && process.env.NODE_ENV === 'development') {
      console.log('📧 Email Notification (Development Mode)')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`To: ${to}`)
      console.log(`Subject: ${subject}`)
      console.log(`Type: ${type}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('HTML Content:')
      console.log(html)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      // In development, we'll return success even though email wasn't actually sent
      return NextResponse.json({
        success: true,
        message: 'Email logged to console (development mode)',
        type,
        to,
        provider: 'console',
      })
    }

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        type,
        to,
        provider,
      })
    }

    // If we reach here, no email provider was configured
    return NextResponse.json(
      {
        success: false,
        error: error || 'No email provider configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD for easiest setup.',
        message: 'Email not sent - no provider configured',
      },
      { status: 500 }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

