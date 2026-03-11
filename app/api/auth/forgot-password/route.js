// /app/api/auth/forgot-password/route.js
// OPTIMIZED & IMPROVED DESIGN VERSION
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase'
import { withTimeout } from '@/lib/timeout'

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

// Shared storage - in production, use Redis or database
let passwordResetStore = new Map()

if (typeof global !== 'undefined') {
  if (!global.passwordResetStore) global.passwordResetStore = new Map()
  passwordResetStore = global.passwordResetStore
}

export async function POST(request) {
  try {
    const { email, method = 'email' } = await request.json()

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 })
    }

    // Generate 6-digit OTP for password reset
    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store password reset OTP with expiration (15 minutes for password reset)
    passwordResetStore.set(email, {
      otp: resetOtp,
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      timestamp: Date.now()
    })

    console.log(`Generated password reset OTP for ${email}: ${resetOtp}`)

    // SMS delivery via AiroSofts
    if (method === 'sms') {
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('phone')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()

      if (!userRow?.phone) {
        return NextResponse.json({ message: 'No phone number on file for this account. Please use email instead.' }, { status: 400 })
      }

      const digits = userRow.phone.replace(/\D/g, '')
      const e164Phone = digits.length === 10
        ? `+1${digits}`
        : (digits.length === 11 && digits.startsWith('1') ? `+${digits}` : null)

      if (!e164Phone) {
        return NextResponse.json({ message: 'Invalid phone number on file. Please use email instead.' }, { status: 400 })
      }

      console.log(`[forgot-password] Sending SMS reset code to ${e164Phone}`)

      const smsResponse = await withTimeout(
        fetch('https://ap.airosofts.com/api/external/sms/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.AIROSOFTS_SMS_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.AIROSOFTS_SMS_FROM,
            to: e164Phone,
            message: `Your Deelmap password reset code is ${resetOtp}. Valid for 15 minutes. Do not share this code.`
          })
        }),
        10000,
        'SMS send timed out'
      )

      const smsData = await smsResponse.json()
      if (!smsResponse.ok) {
        console.error('[forgot-password] SMS send failed:', smsData)
        return NextResponse.json({ message: 'Failed to send SMS. Please use email instead.' }, { status: 500 })
      }

      console.log(`[forgot-password] SMS reset code sent to ${e164Phone}`)
      return NextResponse.json({ message: 'Password reset code sent successfully via SMS' })
    }

    // Same logo URL as signup OTP email so it loads in email clients
    const logoBase = (process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || 'https://sellerportaldeelmap-production.up.railway.app').replace(/\/$/, '')
    const logoUrl = `${logoBase}/deelmap.png`

    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 0;">
    <tr>
      <td align="center" style="padding: 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff;">

          <!-- Header - Logo (same as signup verification) -->
          <tr>
            <td style="background-color: #1e3a5f; padding: 24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="vertical-align: middle;">
                    <img src="${logoUrl}" alt="Deelmap" width="160" height="48" style="display: block; max-width: 160px; height: auto; border: 0;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content - White -->
          <tr>
            <td style="padding: 50px 40px; background-color: #ffffff;">
              
              <!-- Title -->
              <h1 style="margin: 0 0 20px 0; font-size: 32px; font-weight: 700; color: #1f2937; text-align: center;">
                Password Reset
              </h1>

              <!-- Instruction Text -->
              <p style="margin: 0 0 40px 0; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
                We received a request to reset your password for your Deelmap account. Use the following code to complete the password reset procedure. This code is valid for <strong style="color: #1f2937;">15 minutes</strong>.
              </p>

              <!-- Code - single copyable block (same format as signup verification, no extra spaces) -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 20px 32px; background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px;">
                          <p style="margin: 0; font-size: 11px; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Verification code</p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #1f2937; font-family: 'Courier New', Courier, monospace; letter-spacing: 6px; line-height: 1.2;">${resetOtp}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
                Valid for 15 minutes. Do not share this code.
              </p>

              <!-- Didn't Request Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.6;">
                      If you did not request a password reset, please ignore this email or contact our security team if you have concerns.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #ffffff; border-top: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 10px;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #374151; font-weight: 500;">
                      Thanks,<br>
                      DeelMap Team
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 5px;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      2464 Royal Ln. Mesa, New Jersey 45463
                    </p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      © 2026 DeelMap
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    // Plain text version
    const textContent = `DEELMAP

Password Reset

Hello,

We received a request to reset your password for your Deelmap account. Use the following code to complete the password reset procedure.

PASSWORD RESET CODE: ${resetOtp}

Valid for 15 minutes. Do not share this code.

If you did not request a password reset, please ignore this email or contact our security team if you have concerns.

Thanks,
DeelMap Team

---
© 2026 DeelMap. All rights reserved.`

    // Send email via Resend
    const startTime = Date.now()
    console.log(`[${new Date().toISOString()}] Sending password reset email via Resend...`)

    const { data, error } = await resend.emails.send({
      from: 'Deelmap Security <noreply@deelmap.com>',
      to: [email],
      subject: `${resetOtp} is your password reset code`,
      html: htmlTemplate,
      text: textContent,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'Priority': 'urgent'
      }
    })

    const endTime = Date.now()
    console.log(`[${new Date().toISOString()}] Password reset email sent in ${endTime - startTime}ms`)

    if (error) {
      console.error('Resend error:', error)
      throw new Error(error.message)
    }

    console.log(`Password reset email sent successfully to ${email}`, data)

    return NextResponse.json({ 
      message: 'Password reset code sent successfully',
      email,
      sendTime: endTime - startTime
    })

  } catch (error) {
    console.error('Send password reset error:', error)
    
    // Provide specific error messages
    let errorMessage = 'Failed to send password reset code'
    
    if (error.message?.includes('API key')) {
      errorMessage = 'Email service configuration error'
    } else if (error.message?.includes('rate')) {
      errorMessage = 'Too many requests - please wait and try again'
    }
    
    return NextResponse.json(
      { message: errorMessage, error: error.message },
      { status: 500 }
    )
  }
}