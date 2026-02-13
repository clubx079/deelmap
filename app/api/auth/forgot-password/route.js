// /app/api/auth/forgot-password/route.js
// OPTIMIZED & IMPROVED DESIGN VERSION
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

// Shared storage - in production, use Redis or database
let passwordResetStore = new Map()

if (typeof global !== 'undefined') {
  if (!global.passwordResetStore) global.passwordResetStore = new Map()
  passwordResetStore = global.passwordResetStore
}

export async function POST(request) {
  try {
    const { email } = await request.json()

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
                Password Reset
              </h1>

              <!-- Instruction Text -->
              <p style="margin: 0 0 40px 0; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
                We received a request to reset your password for your Deelmap account. Use the following code to complete the password reset procedure. This code is valid for <strong style="color: #1f2937;">15 minutes</strong>.
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
                              ${resetOtp.split('').map((digit) => `
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

              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
                <tr>
                  <td style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400E;">
                      🔒 Security Tips
                    </p>
                    <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #78350F;">
                      This code will only work once. Never share it with anyone. Deelmap will never ask for your code.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Didn't Request Notice -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.6;">
                      If you did not request a password reset, please ignore this email or contact our security team immediately if you have concerns about your account security.
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

Password Reset

Hello,

We received a request to reset your password for your Deelmap account. Use the following OTP to complete the password reset procedure.

YOUR PASSWORD RESET CODE:
${resetOtp}

⏱ Valid for 15 minutes

SECURITY TIPS:
• This code will only work once
• Never share this code with anyone
• Deelmap will never ask for your code

DIDN'T REQUEST THIS?
If you didn't request a password reset, please ignore this email or contact our security team immediately if you have concerns about your account security. Your account remains secure and no changes will be made.

---
© ${new Date().getFullYear()} Deelmap. All rights reserved.`

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