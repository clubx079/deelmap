// /app/api/auth/send-otp/route.js
// OPTIMIZED & IMPROVED DESIGN VERSION
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { withTimeout } from '@/lib/timeout'

const resend = new Resend(process.env.RESEND_API_KEY)

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

          <!-- Header - Dark Blue with Logo Text -->
          <tr>
            <td style="background-color: #1e3a5f; padding: 24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="vertical-align: middle;">
                    <div style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                      Deelmap
                    </div>
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
                Confirm Verification Code
              </h1>

              <!-- Instruction Text -->
              <p style="margin: 0 0 40px 0; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
                We have emailed you a 6-digit code to <strong style="color: #dc2626;">${email}</strong>. Please check your email & enter the code here to complete the verification.
              </p>

              <!-- Code Display -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; text-align: center; margin-bottom: 15px;">Enter Code</label>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                            <tr>
                              ${otp.split('').map((digit) => `
                                <td style="padding: 0 6px;">
                                  <table width="50" height="60" cellpadding="0" cellspacing="0" style="width: 50px; height: 60px; border: 2px solid #d1d5db; border-radius: 8px; background-color: #f9fafb;">
                                    <tr>
                                      <td align="center" valign="middle" style="font-size: 28px; font-weight: 700; color: #A73636; font-family: 'Courier New', monospace; line-height: 1; text-align: center;">
                                        ${digit}
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              `).join('')}
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
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
                  <td style="padding-bottom: 15px;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #374151; font-weight: 500;">
                      Thanks,<br>
                      DeelMap Team
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px;">
                    <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
                      Questions or faq? Contact us at <a href="mailto:faq@deelmap.com" style="color: #dc2626; text-decoration: none;">faq@deelmap.com</a>.
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
                      © 2016 DeelMap
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

Your OTP

Hey${displayName ? ` ${displayName}` : ''},

Thank you for choosing Deelmap Company. Use the following OTP to complete the procedure to verify your email address.

YOUR VERIFICATION CODE:
${otp}

⏱ Valid for 5 minutes

IMPORTANT:
• Do not share this code with anyone
• Deelmap will never ask for your code
• If you didn't request this, please ignore this email

If you did not request this code, please ignore this email or contact our support team if you have concerns about your account security.

---
© ${new Date().getFullYear()} Deelmap. All rights reserved.`

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