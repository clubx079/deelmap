// /app/api/auth/send-otp/route.js
// OPTIMIZED & IMPROVED DESIGN VERSION
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { Resend } from 'resend'
import { withTimeout } from '@/lib/timeout'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

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
    const { email, firstName, lastName, method = 'email', phone } = await request.json()

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

    // SMS delivery path
    if (method === 'sms') {
      if (!phone) {
        return NextResponse.json({ message: 'Phone number is required for SMS delivery' }, { status: 400 })
      }

      const digits = phone.replace(/\D/g, '')
      const e164Phone = digits.length === 10
        ? `+1${digits}`
        : (digits.length === 11 && digits.startsWith('1') ? `+${digits}` : null)

      if (!e164Phone) {
        return NextResponse.json({ message: 'Invalid phone number format' }, { status: 400 })
      }

      const smsStart = Date.now()
      console.log(`[send-otp] Sending SMS OTP to ${e164Phone}...`)

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
            message: `Your Deelmap verification code is ${otp}. Valid for 10 minutes. Do not share this code.`
          })
        }),
        10000,
        'SMS send timed out'
      )

      const smsData = await smsResponse.json()
      const smsEnd = Date.now()

      if (!smsResponse.ok) {
        console.error('AiroSofts SMS error:', smsData)
        throw new Error(smsData.message || 'Failed to send SMS verification code')
      }

      console.log(`SMS OTP sent to ${e164Phone} in ${smsEnd - smsStart}ms`)
      return NextResponse.json({ message: 'OTP sent via SMS', email, sendTime: smsEnd - smsStart })
    }

    const displayName = firstName && lastName
      ? `${firstName} ${lastName}` 
      : firstName || lastName || ''

    const htmlTemplate = `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff">
      <tr>
        <td style="background:#ffffff;padding:24px 40px;text-align:center;border-bottom:2px solid #D03839">
          <img src="https://sellerportaldeelmap-production.up.railway.app/deelmap.png" alt="Deelmap" height="36" style="display:inline-block;height:36px;width:auto;border:0" />
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px 32px;background:#ffffff">
          <p style="margin:0 0 6px;font-size:14px;color:#737370">Hi ${displayName || 'there'},</p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A1816;letter-spacing:-0.4px;line-height:1.25">Verify your email address</h1>
          <p style="margin:0 0 28px;font-size:14px;line-height:1.65;color:#737370">Use the code below to complete your sign-up. It expires in 10 minutes.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr><td align="center">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#FAFAF8;border:1px solid #E8E8E4;border-radius:4px;padding:20px 32px;text-align:center">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#A8A8A4">Verification code</p>
                    <p style="margin:0;font-size:36px;font-weight:700;color:#1A1816;font-family:'Courier New',monospace;letter-spacing:6px;line-height:1.2">${otp}</p>
                    <p style="margin:8px 0 0;font-size:12px;color:#A8A8A4">Expires in 10 minutes</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#A8A8A4;line-height:1.6">If you didn't request this, you can safely ignore this email.</p>
        </td>
      </tr>
      <tr>
        <td style="background:#FAFAF8;border-top:1px solid #E8E8E4;padding:20px 40px;text-align:center">
          <p style="margin:0;font-size:12px;color:#A8A8A4">© 2026 Deelmap. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </td></tr></table>
</body></html>
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