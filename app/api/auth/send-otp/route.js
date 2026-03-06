// /app/api/auth/send-otp/route.js
// OPTIMIZED & IMPROVED DESIGN VERSION
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withTimeout } from '@/lib/timeout'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseUrl = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL
const supabaseKey = process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

let otpStore = new Map()
if (typeof global !== 'undefined') {
  if (!global.otpStore) global.otpStore = new Map()
  otpStore = global.otpStore
}

// Cleanup expired OTPs periodically to prevent memory leaks
function cleanupExpiredOTPs() {
  const now = Date.now()
  let cleanedCount = 0

  for (const [email, data] of otpStore.entries()) {
    if (data.expires < now) {
      otpStore.delete(email)
      cleanedCount++
    }
  }

  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} expired OTPs. Current store size: ${otpStore.size}`)
  }
}

// Run cleanup every 5 minutes
if (typeof global !== 'undefined' && !global.otpCleanupInterval) {
  global.otpCleanupInterval = setInterval(cleanupExpiredOTPs, 5 * 60 * 1000)
}

export async function POST(request) {
  try {
    const { email, firstName, lastName } = await request.json()

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 })
    }

    // Reject signup if email is already registered
    if (supabase) {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle()

      if (checkError) {
        console.error('[send-otp] Error checking existing user:', checkError)
      }
      if (existingUser) {
        return NextResponse.json(
          { message: 'This email is already registered. Please sign in.' },
          { status: 409 }
        )
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    otpStore.set(email, {
      otp,
      expires: Date.now() + 10 * 60 * 1000,
      firstName,
      lastName
    })

    console.log(`Generated OTP for ${email}: ${otp}`)

    const displayName = firstName && lastName 
      ? `${firstName} ${lastName}` 
      : firstName || lastName || ''

    // Use same logo URL as messages notification email (seller portal) so it loads in email clients
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

          <!-- Header - Logo -->
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
              <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #1f2937; text-align: center;">
                Your verification code
              </h1>

              <!-- Instruction Text -->
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
                This is your verification for <strong style="color: #1f2937;">${email}</strong>. Copy this code and paste it to get verified.
              </p>

              <!-- Code - single copyable block (no extra spaces) -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 20px 32px; background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px;">
                          <p style="margin: 0; font-size: 11px; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Verification code</p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #1f2937; font-family: 'Courier New', Courier, monospace; letter-spacing: 6px; line-height: 1.2;">${otp}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
                Valid for 10 minutes. Do not share this code.
              </p>

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

Your verification code

Hey${displayName ? ` ${displayName}` : ''},

This is your verification for ${email}. Copy this code and paste it to get verified.

VERIFICATION CODE: ${otp}

Valid for 10 minutes. Do not share this code.

Thanks,
DeelMap Team

---
© 2026 DeelMap. All rights reserved.`

    const startTime = Date.now()
    console.log(`[${new Date().toISOString()}] Sending email via Resend...`)

    const { data, error } = await withTimeout(
      resend.emails.send({
        from: 'Deelmap <noreply@deelmap.com>',
        to: [email],
        subject: `${otp} is your Deelmap verification code`,
        html: htmlTemplate,
        text: textContent,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
          'Priority': 'urgent'
        }
      }),
      15000, // 15 second timeout
      'OTP email send timed out'
    )

    const endTime = Date.now()
    console.log(`[${new Date().toISOString()}] Email sent in ${endTime - startTime}ms`)

    if (error) {
      console.error('Resend error:', error)
      throw new Error(error.message)
    }

    console.log(`Email sent successfully to ${email}`, data)

    return NextResponse.json({ 
      message: 'OTP sent successfully',
      email,
      sendTime: endTime - startTime
    })

  } catch (error) {
    console.error('Send OTP error:', error)
    
    let errorMessage = 'Failed to send verification code'
    
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