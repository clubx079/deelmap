// app/api/inspection-reports/route.js - Updated with new inspection report flow
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

async function getNotificationEmails(notificationType) {
  try {
    const { data, error } = await supabase
      .from('email_notifications')
      .select('recipient_emails, is_active')
      .eq('notification_type', notificationType)
      .eq('is_active', true)
      .single()

    if (error || !data || !data.recipient_emails || data.recipient_emails.length === 0) {
      console.warn(`No active email recipients found for ${notificationType}, using fallback`)
      return ['hamza@airosofts.com']
    }

    return data.recipient_emails
  } catch (error) {
    console.error(`Error fetching email recipients for ${notificationType}:`, error)
    return ['hamza@airosofts.com']
  }
}

async function sendClientEmail(userData, propertyAddress, inspectionReportUrl) {
  try {
    const fullName = `${userData.first_name} ${userData.last_name}`.trim()
    const hasReport = !!inspectionReportUrl

    if (hasReport) {
      // Client email: Report available with download link
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 30px;">

    <h1 style="margin: 0 0 20px 0; color: #022b41; font-size: 24px;">Your Inspection Report</h1>

    <p style="margin: 0 0 15px 0; font-size: 16px; color: #333;">Dear ${fullName},</p>

    <p style="margin: 0 0 15px 0; font-size: 14px; color: #333; line-height: 1.6;">
      Thank you for your interest in the property located at <strong>${propertyAddress}</strong>.
    </p>

    <p style="margin: 0 0 15px 0; font-size: 14px; color: #333; line-height: 1.6;">
      The inspection report for this property is ready for you to review. Please download it using the button below and review it carefully.
    </p>

    <div style="text-align: center; padding: 25px 0;">
      <a href="${inspectionReportUrl}"
         style="display: inline-block; background-color: #022b41; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        Download Inspection Report
      </a>
    </div>

    <p style="margin: 15px 0; font-size: 13px; color: #666; text-align: center;">
      Or copy this link: <a href="${inspectionReportUrl}" style="color: #022b41; word-break: break-all;">${inspectionReportUrl}</a>
    </p>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0;">
      <h3 style="margin: 0 0 15px 0; color: #022b41; font-size: 16px;">Contact Our Team</h3>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #333;">
        For any questions or to schedule a property viewing, please contact our disposition team:
      </p>
      <p style="margin: 0; font-size: 14px; color: #333;">
        <strong>Disposition Line:</strong> <a href="tel:8594076245" style="color: #022b41; text-decoration: none;">(859) 407-6245</a>
      </p>
    </div>

    <p style="margin: 25px 0 0 0; font-size: 14px; color: #333; line-height: 1.6;">
      We look forward to assisting you with your real estate investment.
    </p>

    <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; margin-top: 30px;">
      <p style="margin: 0; font-size: 14px; color: #333; font-weight: 600;">Best regards,</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #333;">The Ableman Team</p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #888;">Ableman REI</p>
    </div>

  </div>
</body>
</html>
      `

      const textContent = `
YOUR INSPECTION REPORT

Dear ${fullName},

Thank you for your interest in the property located at ${propertyAddress}.

The inspection report for this property is ready for you to review. Please download it using the link below:

${inspectionReportUrl}

CONTACT OUR TEAM:
For any questions or to schedule a property viewing, please contact our disposition team:
Disposition Line: (859) 407-6245

We look forward to assisting you with your real estate investment.

Best regards,
The Ableman Team
Ableman REI
      `

      const result = await resend.emails.send({
        from: 'Ableman REI <noreply@ableman.co>',
        to: userData.email,
        subject: `Inspection Report - ${propertyAddress}`,
        html: htmlContent,
        text: textContent
      })

      console.log(`Inspection report download link sent to client: ${userData.email}`)
      return { success: true, emailId: result?.data?.id || result?.id, reportSent: true }

    } else {
      // Client email: Report not available
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 30px;">

    <h1 style="margin: 0 0 20px 0; color: #022b41; font-size: 24px;">Inspection Report Request Received</h1>

    <p style="margin: 0 0 15px 0; font-size: 16px; color: #333;">Dear ${fullName},</p>

    <p style="margin: 0 0 15px 0; font-size: 14px; color: #333; line-height: 1.6;">
      Thank you for your interest in the property located at <strong>${propertyAddress}</strong>.
    </p>

    <p style="margin: 0 0 15px 0; font-size: 14px; color: #333; line-height: 1.6;">
      The inspection report for this property is currently not available in our system. However, our disposition team can provide you with detailed information about the property and answer any questions you may have.
    </p>

    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 4px; margin: 25px 0;">
      <h3 style="margin: 0 0 15px 0; color: #856404; font-size: 16px;">Please Contact Our Team</h3>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #856404;">
        For the inspection report and property details, please reach out to our disposition team:
      </p>
      <p style="margin: 0; font-size: 16px; color: #856404; font-weight: 600;">
        <strong>Disposition Line:</strong> <a href="tel:8594076245" style="color: #856404; text-decoration: none;">(859) 407-6245</a>
      </p>
    </div>

    <p style="margin: 25px 0 0 0; font-size: 14px; color: #333; line-height: 1.6;">
      Our team is ready to assist you with comprehensive property information and guide you through your investment decision.
    </p>

    <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; margin-top: 30px;">
      <p style="margin: 0; font-size: 14px; color: #333; font-weight: 600;">Best regards,</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #333;">The Ableman Team</p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #888;">Ableman REI</p>
    </div>

  </div>
</body>
</html>
      `

      const textContent = `
INSPECTION REPORT REQUEST RECEIVED

Dear ${fullName},

Thank you for your interest in the property located at ${propertyAddress}.

The inspection report for this property is currently not available in our system. However, our disposition team can provide you with detailed information about the property and answer any questions you may have.

PLEASE CONTACT OUR TEAM:
For the inspection report and property details, please reach out to our disposition team:
Disposition Line: (859) 407-6245

Our team is ready to assist you with comprehensive property information and guide you through your investment decision.

Best regards,
The Ableman Team
Ableman REI
      `

      const result = await resend.emails.send({
        from: 'Ableman REI <noreply@ableman.co>',
        to: userData.email,
        subject: `Inspection Report Request - ${propertyAddress}`,
        html: htmlContent,
        text: textContent
      })

      console.log(`Report unavailable notification sent to client: ${userData.email}`)
      return { success: true, emailId: result?.data?.id || result?.id, reportSent: false }
    }

  } catch (error) {
    console.error('Error sending client email:', error)
    throw error
  }
}

async function sendTeamNotification(userData, propertyAddress, propertyId, message, reportWasSent) {
  try {
    const fullName = `${userData.first_name} ${userData.last_name}`.trim()
    const recipientEmails = await getNotificationEmails('inspection_report')

    if (reportWasSent) {
      // Team notification: Report was sent to client
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 30px;">

    <h1 style="margin: 0 0 20px 0; color: #022b41; font-size: 24px;">Inspection Report Sent to Client</h1>

    <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 14px; color: #155724; font-weight: 600;">
        The inspection report has been successfully delivered to the client. Please follow up to answer any questions.
      </p>
    </div>

    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #022b41; font-size: 16px;">Property Details:</h3>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Address:</strong> ${propertyAddress}</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Property ID:</strong> ${propertyId}</p>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #022b41; font-size: 16px;">Client Information:</h3>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Name:</strong> ${fullName}</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${userData.email}" style="color: #022b41;">${userData.email}</a></p>
      ${userData.phone ? `<p style="margin: 5px 0; font-size: 14px;"><strong>Phone:</strong> ${userData.phone}</p>` : ''}
    </div>

    <div style="background-color: #fff8e1; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #f57c00; font-size: 14px;">Client Message:</h3>
      <p style="margin: 0; font-size: 14px; color: #333; white-space: pre-wrap;">${message}</p>
    </div>

    <div style="text-align: center; padding: 20px 0;">
      <a href="mailto:${userData.email}?subject=Re: Inspection Report - ${propertyAddress}"
         style="display: inline-block; background-color: #022b41; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-size: 14px; font-weight: bold;">
        Follow Up with ${userData.first_name}
      </a>
    </div>

    <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; margin-top: 20px;">
      <p style="margin: 0; font-size: 12px; color: #888;">Request processed: ${new Date().toLocaleString()}</p>
      <p style="margin: 5px 0 0 0; font-size: 12px; color: #888;">Ableman Inspection Report System</p>
    </div>

  </div>
</body>
</html>
      `

      const textContent = `
INSPECTION REPORT SENT TO CLIENT - FOLLOW UP REQUIRED

The inspection report has been successfully delivered to the client. Please follow up to answer any questions.

PROPERTY DETAILS:
• Address: ${propertyAddress}
• Property ID: ${propertyId}

CLIENT INFORMATION:
• Name: ${fullName}
• Email: ${userData.email}
${userData.phone ? `• Phone: ${userData.phone}` : ''}
• User ID: ${userData.id}

CLIENT MESSAGE:
${message}

ACTION REQUIRED:
Follow up with the client at ${userData.email} to assist with their property inquiry and answer any questions about the inspection report.

Request processed: ${new Date().toLocaleString()}
Ableman Inspection Report System
      `

      const results = []
      for (const recipientEmail of recipientEmails) {
        try {
          const result = await resend.emails.send({
            from: 'Ableman Team Notification <noreply@ableman.co>',
            to: recipientEmail,
            replyTo: userData.email,
            subject: `FOLLOW UP: Inspection Report Sent - ${propertyAddress}`,
            html: htmlContent,
            text: textContent
          })

          console.log(`Team notification sent to ${recipientEmail}`)
          results.push({ email: recipientEmail, success: true, emailId: result?.data?.id || result?.id })

          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          console.error(`Failed to send team notification to ${recipientEmail}:`, error)
          results.push({ email: recipientEmail, success: false, error: error.message })
        }
      }

      return { success: results.some(r => r.success), results }

    } else {
      // Team notification: Report was missing
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 30px;">

    <h1 style="margin: 0 0 20px 0; color: #022b41; font-size: 24px;">Inspection Report Missing - Urgent Follow Up</h1>

    <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 14px; color: #721c24; font-weight: 600;">
        Inspection report was not available for this property. Client has been notified to contact the dispo team directly. Please follow up immediately.
      </p>
    </div>

    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #022b41; font-size: 16px;">Property Details:</h3>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Address:</strong> ${propertyAddress}</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Property ID:</strong> ${propertyId}</p>
      <p style="margin: 5px 0; font-size: 14px; color: #dc3545;"><strong>Status:</strong> Inspection Report Missing</p>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #022b41; font-size: 16px;">Client Information:</h3>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Name:</strong> ${fullName}</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${userData.email}" style="color: #022b41;">${userData.email}</a></p>
      ${userData.phone ? `<p style="margin: 5px 0; font-size: 14px;"><strong>Phone:</strong> ${userData.phone}</p>` : ''}
    </div>

    <div style="background-color: #fff8e1; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #f57c00; font-size: 14px;">Client Message:</h3>
      <p style="margin: 0; font-size: 14px; color: #333; white-space: pre-wrap;">${message}</p>
    </div>

    <div style="background-color: #cce5ff; padding: 15px; border-left: 4px solid #004085; border-radius: 4px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #004085; font-size: 14px;">Action Required:</h3>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #004085;">
        1. Upload the inspection report for this property if available
      </p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #004085;">
        2. Contact the client directly to provide property information
      </p>
      <p style="margin: 0; font-size: 14px; color: #004085;">
        3. Guide the buyer through the property evaluation process
      </p>
    </div>

    <div style="text-align: center; padding: 20px 0;">
      <a href="mailto:${userData.email}?subject=Property Information - ${propertyAddress}"
         style="display: inline-block; background-color: #dc3545; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-size: 14px; font-weight: bold;">
        Contact ${userData.first_name} Now
      </a>
    </div>

    <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; margin-top: 20px;">
      <p style="margin: 0; font-size: 12px; color: #888;">Request received: ${new Date().toLocaleString()}</p>
      <p style="margin: 5px 0 0 0; font-size: 12px; color: #888;">Ableman Inspection Report System</p>
    </div>

  </div>
</body>
</html>
      `

      const textContent = `
INSPECTION REPORT MISSING - URGENT FOLLOW UP REQUIRED

Inspection report was not available for this property. Client has been notified to contact the dispo team directly. Please follow up immediately.

PROPERTY DETAILS:
• Address: ${propertyAddress}
• Property ID: ${propertyId}
• Status: Inspection Report Missing

CLIENT INFORMATION:
• Name: ${fullName}
• Email: ${userData.email}
${userData.phone ? `• Phone: ${userData.phone}` : ''}
• User ID: ${userData.id}

CLIENT MESSAGE:
${message}

ACTION REQUIRED:
1. Upload the inspection report for this property if available
2. Contact the client directly to provide property information
3. Guide the buyer through the property evaluation process

Client has been directed to call: (859) 407-6245

Request received: ${new Date().toLocaleString()}
Ableman Inspection Report System
      `

      const results = []
      for (const recipientEmail of recipientEmails) {
        try {
          const result = await resend.emails.send({
            from: 'Ableman Team Notification <noreply@ableman.co>',
            to: recipientEmail,
            replyTo: userData.email,
            subject: `URGENT: Missing Report - ${propertyAddress}`,
            html: htmlContent,
            text: textContent
          })

          console.log(`Team notification (missing report) sent to ${recipientEmail}`)
          results.push({ email: recipientEmail, success: true, emailId: result?.data?.id || result?.id })

          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          console.error(`Failed to send team notification to ${recipientEmail}:`, error)
          results.push({ email: recipientEmail, success: false, error: error.message })
        }
      }

      return { success: results.some(r => r.success), results }
    }

  } catch (error) {
    console.error('Error sending team notification:', error)
    return { success: false, error: error.message }
  }
}

export async function POST(req) {
  try {
    const { propertyId, propertyAddress, message, userId } = await req.json()

    // Validate required fields
    if (!propertyId || !propertyAddress || !message || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, propertyAddress, message, userId' },
        { status: 400 }
      )
    }

    console.log(`Processing inspection report request for user ID: ${userId}`)

    // Fetch complete user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.error('User not found:', userError)
      return NextResponse.json(
        { error: 'User not found. Please ensure you are logged in properly.' },
        { status: 404 }
      )
    }

    console.log(`User found: ${userData.first_name} ${userData.last_name} (${userData.email})`)

    // Fetch property details including inspection report
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('id, address, inspection_report_url, inspection_report_key')
      .eq('id', propertyId)
      .single()

    if (propertyError || !propertyData) {
      console.error('Property not found:', propertyError)
      return NextResponse.json(
        { error: 'Property not found.' },
        { status: 404 }
      )
    }

    console.log(`Property found: ${propertyData.address}`)
    console.log(`Inspection report URL: ${propertyData.inspection_report_url || 'Not available'}`)

    // Sanitize the message
    const sanitizedMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()

    if (sanitizedMessage.length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters long.' },
        { status: 400 }
      )
    }

    // Check for recent duplicate requests (optional - can be removed if you want to allow multiple requests)
    const { data: existingRequest } = await supabase
      .from('inspection_report_requests')
      .select('id, created_at')
      .eq('property_id', propertyId)
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You have already requested an inspection report for this property in the last 24 hours.' },
        { status: 429 }
      )
    }

    // Save the request to database
    const { data: request, error: dbError } = await supabase
      .from('inspection_report_requests')
      .insert([
        {
          property_id: propertyId,
          property_address: propertyAddress,
          user_id: userData.id,
          user_email: userData.email,
          user_first_name: userData.first_name,
          user_last_name: userData.last_name,
          user_phone: userData.phone || '',
          message: sanitizedMessage,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (dbError) {
      console.error('Database error creating inspection request:', dbError)
      return NextResponse.json(
        { error: 'Failed to save inspection report request. Please try again.' },
        { status: 500 }
      )
    }

    console.log(`Inspection request saved to database with ID: ${request.id}`)

    // Send email to client (with or without report)
    const clientEmailResult = await sendClientEmail(
      userData,
      propertyAddress,
      propertyData.inspection_report_url
    )

    console.log(`Client email sent. Report was ${clientEmailResult.reportSent ? 'attached' : 'not available'}`)

    // Send notification to team
    const teamEmailResult = await sendTeamNotification(
      userData,
      propertyAddress,
      propertyId,
      sanitizedMessage,
      clientEmailResult.reportSent
    )

    console.log('Inspection report request process completed')

    return NextResponse.json({
      success: true,
      message: clientEmailResult.reportSent
        ? 'Inspection report has been sent to your email. Please check your inbox.'
        : 'Your request has been received. Our team will contact you shortly with the inspection report details.',
      request: {
        id: request.id,
        property_address: request.property_address,
        user_name: `${request.user_first_name} ${request.user_last_name}`,
        created_at: request.created_at,
        report_sent: clientEmailResult.reportSent
      },
      emailNotification: {
        clientEmailSent: clientEmailResult.success,
        teamEmailSent: teamEmailResult.success,
        reportAttached: clientEmailResult.reportSent
      }
    }, { status: 201 })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve inspection report requests
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const propertyId = searchParams.get('propertyId')
    const limit = parseInt(searchParams.get('limit')) || 50

    let query = supabase
      .from('inspection_report_requests')
      .select(`
        id,
        property_id,
        property_address,
        user_id,
        user_email,
        user_first_name,
        user_last_name,
        user_phone,
        message,
        status,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
    } else if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    const { data: requests, error: dbError } = await query

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch inspection report requests' },
        { status: 500 }
      )
    }

    const formattedRequests = requests.map(request => ({
      ...request,
      user_full_name: `${request.user_first_name} ${request.user_last_name}`.trim()
    }))

    return NextResponse.json({
      success: true,
      requests: formattedRequests,
      count: requests.length
    }, { status: 200 })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
