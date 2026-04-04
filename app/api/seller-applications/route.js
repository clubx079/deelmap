import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

// Use seller-specific Supabase instance for seller applications
const supabaseUrl = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Generate random password (same logic as approval API)
function generatePassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

export async function POST(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const body = await request.json()

    const {
      businessName,
      contactPersonName,
      email,
      phone,
      businessType,
      dealsPerMonth,
      primaryMarkets,
      propertyTypes,
      website,
      linkedin,
      description
    } = body

    // Validation
    if (!businessName || !contactPersonName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!propertyTypes || propertyTypes.length === 0) {
      return NextResponse.json(
        { error: 'At least one property type is required' },
        { status: 400 }
      )
    }

    if (description && description.length > 300) {
      return NextResponse.json(
        { error: 'Description must be 300 characters or less' },
        { status: 400 }
      )
    }

    // Check if email already has a pending or approved application
    const { data: existing, error: checkError } = await supabase
      .from('seller_applications')
      .select('id, status')
      .eq('email', email)
      .in('status', ['pending', 'approved'])
      .single()

    if (existing) {
      const statusMessage = existing.status === 'approved'
        ? 'You already have an approved seller account'
        : 'You already have a pending application under review'

      return NextResponse.json(
        { error: statusMessage },
        { status: 400 }
      )
    }

    // Insert seller application
    const { data: application, error: insertError } = await supabase
      .from('seller_applications')
      .insert({
        business_name: businessName,
        contact_person_name: contactPersonName,
        email: email,
        phone: phone,
        business_type: businessType,
        deals_per_month: dealsPerMonth,
        primary_markets: primaryMarkets,
        property_types: propertyTypes,
        website: website || null,
        linkedin: linkedin || null,
        description: description || null,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database error:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit application. Please try again.' },
        { status: 500 }
      )
    }

    // Check if auto-approve is enabled (check if any settings record has it enabled)
    let autoApproveEnabled = false
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('auto_approve_sellers')
        .eq('auto_approve_sellers', true)
        .limit(1)
        .maybeSingle()

      // If query succeeded and found a record with auto_approve_sellers = true
      if (!settingsError && settings && settings.auto_approve_sellers) {
        autoApproveEnabled = true
      }
    } catch (settingsCheckError) {
      // If settings table doesn't exist or other error, log but continue normally
      console.warn('Could not check auto-approve settings:', settingsCheckError)
    }

    // If auto-approve is enabled, automatically approve the application
    if (autoApproveEnabled) {
      try {
        // Generate password
        const password = generatePassword()

        // Update application status to approved and save password
        const { error: updateError } = await supabase
          .from('seller_applications')
          .update({
            status: 'approved',
            password: password,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', application.id)

        if (updateError) {
          console.error('Error updating application status:', updateError)
          // Continue with normal flow even if update fails
        } else {
          // Send approval email with credentials
          const { error: emailError } = await resend.emails.send({
            from: 'Deelmap <noreply@deelmap.com>',
            to: [email],
            subject: 'Your Deelmap Seller Account Has Been Approved',
            html: `
              <!DOCTYPE html>
              <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    * {
                      margin: 0;
                      padding: 0;
                      box-sizing: border-box;
                    }
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                      line-height: 1.6;
                      color: #1f2937;
                      background-color: #f3f4f6;
                      padding: 40px 20px;
                    }
                    .email-container {
                      max-width: 550px;
                      margin: 0 auto;
                      background-color: #ffffff;
                      border-radius: 8px;
                      overflow: hidden;
                      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                      background-color: #1e3a5f;
                      padding: 20px 40px;
                      text-align: center;
                    }
                    .content {
                      padding: 40px 32px;
                    }
                    .greeting {
                      font-size: 16px;
                      color: #1f2937;
                      margin-bottom: 20px;
                    }
                    .message {
                      font-size: 15px;
                      color: #4b5563;
                      margin-bottom: 16px;
                      line-height: 1.7;
                    }
                    .message strong {
                      color: #1f2937;
                      font-weight: 600;
                    }
                    .credentials-card {
                      background-color: #f9fafb;
                      border: 1px solid #e5e7eb;
                      border-radius: 6px;
                      padding: 24px;
                      margin: 32px 0;
                    }
                    .credentials-title {
                      font-size: 14px;
                      font-weight: 600;
                      color: #112F58;
                      text-transform: uppercase;
                      letter-spacing: 0.5px;
                      margin-bottom: 20px;
                    }
                    .credential-item {
                      display: flex;
                      flex-direction: column;
                      margin-bottom: 16px;
                      align-items: flex-start;
                    }
                    .credential-item:last-child {
                      margin-bottom: 0;
                    }
                    .credential-label {
                      font-size: 12px;
                      font-weight: 600;
                      color: #6b7280;
                      text-transform: uppercase;
                      letter-spacing: 0.5px;
                      margin-bottom: 6px;
                      line-height: 1.2;
                      vertical-align: top;
                    }
                    .credential-value {
                      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                      font-size: 15px;
                      color: #1f2937;
                      background-color: #ffffff;
                      padding: 12px 16px;
                      border-radius: 6px;
                      border: 1px solid #e5e7eb;
                      word-break: break-all;
                      line-height: 1.5;
                      vertical-align: top;
                      width: 100%;
                      box-sizing: border-box;
                    }
                    .credential-value.password {
                      letter-spacing: 1px;
                    }
                    .security-notice {
                      background-color: #fef3c7;
                      border-left: 3px solid #f59e0b;
                      padding: 16px;
                      margin: 32px 0;
                      border-radius: 4px;
                    }
                    .security-notice strong {
                      font-size: 13px;
                      color: #92400e;
                      display: block;
                      margin-bottom: 4px;
                    }
                    .security-notice p {
                      font-size: 13px;
                      color: #78350f;
                      margin: 0;
                      line-height: 1.6;
                    }
                    .button-container {
                      text-align: center;
                      margin: 32px 0;
                    }
                    .button {
                      display: inline-block;
                      background-color: #112F58;
                      color: #ffffff;
                      padding: 14px 32px;
                      text-decoration: none;
                      border-radius: 6px;
                      font-weight: 600;
                      font-size: 15px;
                      transition: background-color 0.2s;
                    }
                    .button:hover {
                      background-color: #0d243f;
                    }
                    .closing {
                      font-size: 15px;
                      color: #4b5563;
                      margin-top: 32px;
                      line-height: 1.7;
                    }
                    .signature {
                      margin-top: 16px;
                      font-size: 15px;
                      color: #1f2937;
                    }
                    .signature strong {
                      font-weight: 600;
                    }
                    .footer {
                      background-color: #f9fafb;
                      padding: 24px 32px;
                      text-align: center;
                      border-top: 1px solid #e5e7eb;
                    }
                    .footer p {
                      font-size: 12px;
                      color: #6b7280;
                      margin: 4px 0;
                      line-height: 1.5;
                    }
                    @media only screen and (max-width: 600px) {
                      body {
                        padding: 20px 12px;
                      }
                      .header {
                        padding: 32px 24px;
                      }
                      .content {
                        padding: 32px 24px;
                      }
                      .footer {
                        padding: 20px 24px;
                      }
                    }
                  </style>
                </head>
                <body>
                  <div class="email-container">
                    <div class="header" style="background-color: #1e3a5f; padding: 24px 40px; text-align: center;">
                      <div style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                        Deelmap
                      </div>
                    </div>
                    <div class="content">
                      <h1 style="margin: 0 0 20px 0; font-size: 32px; font-weight: 700; color: #1f2937; text-align: center;">
                        Welcome to Deelmap
                      </h1>
                      
                      <div class="greeting">Dear ${contactPersonName},</div>
                      
                      <p class="message">
                        Congratulations! Your seller application for <strong>${businessName}</strong> has been approved.
                      </p>
                      
                      <p class="message">
                        You can now access your seller dashboard and start listing your properties on Deelmap.
                      </p>

                      <div class="credentials-card">
                        <div class="credentials-title">Login Credentials</div>
                        <div class="credential-item">
                          <div class="credential-label">Email Address</div>
                          <div class="credential-value">${email}</div>
                        </div>
                        <div class="credential-item">
                          <div class="credential-label">Password</div>
                          <div class="credential-value password">${password}</div>
                        </div>
                      </div>

                      <div class="security-notice">
                        <strong>Important Security Notice</strong>
                        <p>Please change your password immediately after your first login to ensure your account security.</p>
                      </div>

                      <div class="button-container">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/login" class="button">Login to Your Dashboard</a>
                      </div>

                      <div class="closing">
                        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                        <div class="signature">
                          Best regards,<br>
                          <strong>The Deelmap Team</strong>
                        </div>
                      </div>
                    </div>
                    <div class="footer">
                      <p>&copy; ${new Date().getFullYear()} Deelmap. All rights reserved.</p>
                    </div>
                  </div>
                </body>
              </html>
            `
          })

          if (emailError) {
            console.error('Error sending auto-approval email:', emailError)
            // Application is still approved even if email fails
          } else {
            console.log('Auto-approval email sent successfully to:', email)
          }
        }
      } catch (autoApproveError) {
        console.error('Error in auto-approve process:', autoApproveError)
        // Continue with normal flow even if auto-approve fails
      }
    }

    // TODO: Send notification email to applicant (if not auto-approved)
    // TODO: Send notification email to admin team

    return NextResponse.json({
      success: true,
      message: autoApproveEnabled
        ? 'Application submitted and automatically approved. Check your email for login credentials.'
        : 'Application submitted successfully',
      applicationId: application.id,
      autoApproved: autoApproveEnabled
    })

  } catch (error) {
    console.error('Seller application error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
