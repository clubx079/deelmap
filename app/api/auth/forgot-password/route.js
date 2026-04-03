// /app/api/auth/forgot-password/route.js
// OPTIMIZED & IMPROVED DESIGN VERSION
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase'
import { withTimeout } from '@/lib/timeout'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

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

    const htmlTemplate = `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff">
      <tr>
        <td style="background:#ffffff;padding:12px 40px;text-align:center;border-bottom:2px solid #D03839">
          <img src="https://sellerportaldeelmap-production-bea8.up.railway.app/deelmap.png" alt="Deelmap" height="72" style="display:inline-block;height:72px;width:auto;border:0" />
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px 32px;background:#ffffff">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A1816;letter-spacing:-0.4px;line-height:1.25">Reset your password</h1>
          <p style="margin:0 0 28px;font-size:14px;line-height:1.65;color:#737370">We received a request to reset your Deelmap password. Use the code below to continue. This code expires in 15 minutes.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr><td align="center">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#FAFAF8;border:1px solid #E8E8E4;border-radius:4px;padding:20px 32px;text-align:center">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#A8A8A4">Password reset code</p>
                    <p style="margin:0;font-size:36px;font-weight:700;color:#1A1816;font-family:'Courier New',monospace;letter-spacing:6px;line-height:1.2">${resetOtp}</p>
                    <p style="margin:8px 0 0;font-size:12px;color:#A8A8A4">Expires in 15 minutes</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#A8A8A4;line-height:1.6">If you didn't request a password reset, your account is safe — no changes have been made.</p>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;border-top:1px solid #E8E8E4;padding:20px 40px;text-align:center">
          <p style="margin:0;font-size:12px;color:#A8A8A4">© 2026 Deelmap. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </td></tr></table>
</body></html>
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