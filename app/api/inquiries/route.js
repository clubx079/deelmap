// app/api/inquiries/route.js - Updated with Resend email service
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
      // Fallback to hardcoded email if no configuration found
      return ['hamza@airosofts.com']
    }

    return data.recipient_emails
  } catch (error) {
    console.error(`Error fetching email recipients for ${notificationType}:`, error)
    // Fallback to hardcoded email on error
    return ['hamza@airosofts.com']
  }
}

async function sendNotificationEmail(inquiryData, userData) {
  try {
    const fullName = `${userData.first_name} ${userData.last_name}`.trim()
    
    // Get dynamic recipient emails from database
    const recipientEmails = await getNotificationEmails('inquiry')
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 30px;">

    <!-- Header -->
    <h1 style="margin: 0 0 20px 0; color: #022b41; font-size: 24px;">New Property Inquiry</h1>

    <!-- Property Info -->
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;"><strong>Property Address:</strong></p>
      <p style="margin: 0; font-size: 16px; color: #022b41;">${inquiryData.propertyAddress}</p>
      <p style="margin: 10px 0 0 0; font-size: 13px; color: #888;">Property ID: ${inquiryData.propertyId}</p>
    </div>

    <!-- Buyer Info -->
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #022b41; font-size: 16px;">Buyer Information:</h3>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Name:</strong> ${fullName}</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${userData.email}" style="color: #022b41;">${userData.email}</a></p>
      ${userData.phone ? `<p style="margin: 5px 0; font-size: 14px;"><strong>Phone:</strong> ${userData.phone}</p>` : ''}
    </div>

    <!-- Message -->
    <div style="background-color: #fff8e1; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #f57c00; font-size: 14px;">Inquiry Message:</h3>
      <p style="margin: 0; font-size: 14px; color: #333; white-space: pre-wrap;">${inquiryData.message}</p>
    </div>

    <!-- CTA -->
    <div style="text-align: center; padding: 20px 0;">
      <a href="mailto:${userData.email}?subject=Re: Property Inquiry - ${inquiryData.propertyAddress}"
         style="display: inline-block; background-color: #022b41; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-size: 14px; font-weight: bold;">
        Reply to ${userData.first_name}
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; margin-top: 20px;">
      <p style="margin: 0; font-size: 12px; color: #888;">Submitted: ${new Date().toLocaleString()}</p>
      <p style="margin: 5px 0 0 0; font-size: 12px; color: #888;">Ableman Property Inquiry System</p>
    </div>

  </div>
</body>
</html>
    `

    const textContent = `
NEW PROPERTY INQUIRY - IMMEDIATE ACTION REQUIRED

PROPERTY DETAILS:
• Address: ${inquiryData.propertyAddress}
• Property ID: ${inquiryData.propertyId}

BUYER INFORMATION:
• Name: ${fullName}
• Email: ${userData.email}
${userData.phone ? `• Phone: ${userData.phone}` : ''}
• User ID: ${userData.id}

INQUIRY MESSAGE:
${inquiryData.message}

NEXT STEPS:
Reply to this buyer immediately at: ${userData.email}

Inquiry submitted: ${new Date().toLocaleString()}
System: Ableman Property Inquiry Management

Convert this lead - respond now!
    `

    const emailSubject = `NEW INQUIRY: ${inquiryData.propertyAddress} from ${fullName}`

    // Send to all configured recipient emails using Resend
    console.log(`📤 Attempting to send inquiry emails to ${recipientEmails.length} recipients:`, recipientEmails)

    const results = []

    // Send emails sequentially with small delay to avoid rate limiting
    for (const recipientEmail of recipientEmails) {
      try {
        console.log(`Sending to: ${recipientEmail}`)
        const result = await resend.emails.send({
          from: 'Ableman Property Inquiry <noreply@ableman.co>',
          to: recipientEmail,
          replyTo: userData.email,
          subject: emailSubject,
          html: htmlContent,
          text: textContent
        })

        console.log(`✅ Property inquiry notification sent to ${recipientEmail}. Resend response:`, JSON.stringify(result))
        results.push({ email: recipientEmail, success: true, emailId: result?.data?.id || result?.id })

        // Delay between emails to respect Resend rate limit (1 second gap)
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`❌ Failed to send email to ${recipientEmail}:`, error)
        results.push({ email: recipientEmail, success: false, error: error.message })
      }
    }
    const successCount = results.filter(r => r.success).length
    
    console.log(`📊 Email notification results: ${successCount}/${recipientEmails.length} sent successfully`)
    console.log(`📋 Property: ${inquiryData.propertyAddress}`)
    console.log(`👤 From: ${fullName} (${userData.email})`)
    
    return { 
      success: successCount > 0, 
      results,
      successCount,
      totalEmails: recipientEmails.length 
    }

  } catch (error) {
    console.error('❌ Error sending property inquiry notification:', error)
    return { success: false, error: error.message }
  }
}

export async function POST(request) {
  try {
    const { propertyId, propertyAddress, message, userId } = await request.json()
    
    // Validate required fields
    if (!propertyId || !propertyAddress || !message || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, propertyAddress, message, userId' },
        { status: 400 }
      )
    }

    console.log(`🔍 Fetching user details for user ID: ${userId}`)

    // Fetch complete user details from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.error('❌ User not found:', userError)
      return NextResponse.json(
        { error: 'User not found. Please ensure you are logged in properly.' },
        { status: 404 }
      )
    }

    console.log(`✅ User found: ${userData.first_name} ${userData.last_name} (${userData.email})`)

    // Sanitize the message
    const sanitizedMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()

    if (sanitizedMessage.length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters long.' },
        { status: 400 }
      )
    }

    // Save inquiry with complete user details
    const { data: inquiry, error: dbError } = await supabase
      .from('inquiries')
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
      console.error('❌ Database error creating inquiry:', dbError)
      return NextResponse.json(
        { error: 'Failed to save inquiry. Please try again.' },
        { status: 500 }
      )
    }

    console.log(`✅ Inquiry saved to database with ID: ${inquiry.id}`)

    // Send notification emails to configured recipients
    const emailResult = await sendNotificationEmail({
      propertyId,
      propertyAddress,
      message: sanitizedMessage
    }, userData)

    console.log(`📈 Inquiry process completed successfully`)

    return NextResponse.json({
      success: true,
      message: 'Inquiry sent successfully! A team member will contact you soon.',
      inquiry: {
        id: inquiry.id,
        property_address: inquiry.property_address,
        user_name: `${inquiry.user_first_name} ${inquiry.user_last_name}`,
        created_at: inquiry.created_at
      },
      emailNotification: {
        sent: emailResult.success,
        details: emailResult.results || null,
        successCount: emailResult.successCount || 0,
        totalEmails: emailResult.totalEmails || 0
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve inquiries with user details
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const propertyId = searchParams.get('propertyId')
    const limit = parseInt(searchParams.get('limit')) || 50

    let query = supabase
      .from('inquiries')
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

    const { data: inquiries, error: dbError } = await query

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch inquiries' },
        { status: 500 }
      )
    }

    // Format the response
    const formattedInquiries = inquiries.map(inquiry => ({
      ...inquiry,
      user_full_name: `${inquiry.user_first_name} ${inquiry.user_last_name}`.trim()
    }))

    return NextResponse.json({
      success: true,
      inquiries: formattedInquiries,
      count: inquiries.length
    }, { status: 200 })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}