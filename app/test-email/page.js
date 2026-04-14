'use client'
import { useState } from 'react'

export default function TestEmailPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('otp-verification')

  // Static values for templates
  const staticValues = {
    email: 'john.doe@example.com',
    otp: '448686',
    resetOtp: '123456',
    businessName: 'ABC Real Estate Group',
    contactName: 'John Doe',
    password: 'TempPass123!',
    propertyAddress: '123 Main Street, Los Angeles, CA 90001',
    buyerName: 'Jane Smith',
    inquiryMessage: 'I am very interested in this property. Could you please provide more details about the property condition and any recent renovations? I would like to schedule a viewing as soon as possible.'
  }

  // OTP Verification Email Template
  const otpTemplate = `
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
                We have emailed you a 6-digit code to <strong style="color: #dc2626;">${staticValues.email}</strong>. Please check your email & enter the code here to complete the verification.
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
                              ${staticValues.otp.split('').map((digit) => `
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

              <!-- Verify Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; text-align: center;">
                      Verify Code
                    </div>
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

  // Password Reset Email Template
  const passwordResetTemplate = `
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
                              ${staticValues.resetOtp.split('').map((digit) => `
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

  // Seller Application Approval Template
  const sellerApprovalTemplate = `
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
                Welcome to Deelmap
              </h1>

              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: left;">
                Dear ${staticValues.contactName},
              </p>

              <!-- Message -->
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #4b5563; text-align: left;">
                Congratulations! Your seller application for <strong style="color: #1f2937;">${staticValues.businessName}</strong> has been approved.
              </p>
              
              <p style="margin: 0 0 32px 0; font-size: 15px; line-height: 1.7; color: #4b5563; text-align: left;">
                You can now access your seller dashboard and start listing your properties on Deelmap.
              </p>

              <!-- Credentials Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 0 0 32px 0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 20px 0; font-size: 14px; font-weight: 600; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px;">
                      Login Credentials
                    </p>
                    
                    <!-- Email -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                            Email Address
                          </p>
                          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; font-size: 15px; color: #1f2937; font-family: 'Inter', -apple-system, sans-serif; word-break: break-all;">
                            ${staticValues.email}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Password -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                            Password
                          </p>
                          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; font-size: 15px; color: #1f2937; font-family: 'Inter', -apple-system, sans-serif; word-break: break-all; letter-spacing: 1px;">
                            ${staticValues.password}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
                <tr>
                  <td style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400E;">
                      Important Security Notice
                    </p>
                    <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #78350F;">
                      Please change your password immediately after your first login to ensure your account security.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/login" style="display: inline-block; background-color: #1e3a5f; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; text-align: center;">
                      Login to Your Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Closing -->
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #4b5563; text-align: left;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
              
              <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #1f2937; text-align: left;">
                Best regards,<br>
                <strong>The Deelmap Team</strong>
              </p>

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

  // Property Inquiry Template
  const propertyInquiryTemplate = `
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
                New Property Inquiry
              </h1>

              <!-- Property Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                      Property Address
                    </p>
                    <p style="margin: 0; font-size: 16px; color: #1f2937; font-weight: 500;">
                      ${staticValues.propertyAddress}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Buyer Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
                      Buyer Information
                    </p>
                    <p style="margin: 0 0 8px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
                      <strong style="color: #1f2937;">Name:</strong> ${staticValues.buyerName}
                    </p>
                    <p style="margin: 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
                      <strong style="color: #1f2937;">Email:</strong> <a href="mailto:${staticValues.email}" style="color: #dc2626; text-decoration: none;">${staticValues.email}</a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Message -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 16px 20px; margin: 0 0 32px 0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #92400E;">
                      Inquiry Message
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #78350F; line-height: 1.7; white-space: pre-wrap;">
                      ${staticValues.inquiryMessage}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
                <tr>
                  <td align="center">
                    <a href="mailto:${staticValues.email}?subject=Re: Property Inquiry - ${staticValues.propertyAddress}"
                       style="display: inline-block; background-color: #1e3a5f; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; text-align: center;">
                      Reply to ${staticValues.buyerName.split(' ')[0]}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Submitted Info -->
              <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.6;">
                Submitted: ${new Date().toLocaleString()}
              </p>

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

  const templates = {
    'otp-verification': {
      name: 'OTP Verification',
      html: otpTemplate
    },
    'password-reset': {
      name: 'Password Reset',
      html: passwordResetTemplate
    },
    'seller-approval': {
      name: 'Seller Application Approval',
      html: sellerApprovalTemplate
    },
    'property-inquiry': {
      name: 'Property Inquiry',
      html: propertyInquiryTemplate
    }
  }

  const currentTemplate = templates[selectedTemplate]

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white p-6 flex-shrink-0">
        <h2 className="text-xl font-bold mb-6">Email Templates</h2>
        <nav className="space-y-2">
          {Object.entries(templates).map(([key, template]) => (
            <button
              key={key}
              onClick={() => setSelectedTemplate(key)}
              className={`w-full text-left px-4 py-2 rounded transition-all ${
                selectedTemplate === key
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {template.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{currentTemplate.name}</h1>
          <p className="text-sm text-slate-600">Preview and test email templates</p>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-full mx-auto">
            {/* Preview */}
            <div className="bg-white rounded shadow-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Preview</h2>
              <div className="border-2 border-slate-200 rounded overflow-hidden">
                <iframe
                  srcDoc={currentTemplate.html}
                  className="w-full"
                  style={{ height: 'calc(100vh - 250px)', border: 'none', minHeight: '800px' }}
                  title="Email Template Preview"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
