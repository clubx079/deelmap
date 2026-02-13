// /app/api/auth/send-contact-email/route.js
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

// Gmail API OAuth2 Configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
)

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN
})

const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

// Function to create email in RFC 2822 format
function createEmailMessage(to, replyTo, subject, htmlContent, textContent) {
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`
  const messageParts = [
    `From: Ableman Group Contact Form <noreply@ableman.co>`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="boundary"',
    '',
    '--boundary',
    'Content-Type: text/plain; charset=utf-8',
    '',
    textContent,
    '',
    '--boundary',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlContent,
    '',
    '--boundary--'
  ]

  const message = messageParts.join('\n')
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function POST(request) {
  try {
    const { name, email, phone, subject, propertyAddress, message, recaptchaToken } = await request.json()

    // Verify reCAPTCHA
    if (!recaptchaToken) {
      return NextResponse.json(
        { error: 'reCAPTCHA token is required' },
        { status: 400 }
      )
    }

    const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
    })

    const recaptchaData = await recaptchaResponse.json()

    if (!recaptchaData.success) {
      return NextResponse.json(
        { error: 'reCAPTCHA verification failed' },
        { status: 400 }
      )
    }

    // Email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #022b41; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Contact Form Submission</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #022b41; margin-top: 0;">Contact Details</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 150px;">Name:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #eee;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #eee;">${email}</td>
            </tr>
            ${phone ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #eee;">${phone}</td>
            </tr>
            ` : ''}
            ${subject ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: bold;">Subject:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #eee;">${subject}</td>
            </tr>
            ` : ''}
            ${propertyAddress ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-weight: bold;">Property Address:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #eee;">${propertyAddress}</td>
            </tr>
            ` : ''}
          </table>
          
          ${message ? `
          <h3 style="color: #022b41; margin-top: 30px; margin-bottom: 15px;">Message:</h3>
          <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #b29578; border-radius: 4px;">
            <p style="margin: 0; line-height: 1.6; color: #333;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
            <p>This email was sent from the Ableman Group contact form.</p>
            <p>Submitted on: ${new Date().toLocaleString()}</p>
            <p style="color: #28a745; font-weight: bold;">✓ reCAPTCHA verified</p>
          </div>
        </div>
      </div>
    `

    const textContent = `
New Contact Form Submission

Name: ${name}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}
${subject ? `Subject: ${subject}` : ''}
${propertyAddress ? `Property Address: ${propertyAddress}` : ''}

${message ? `Message:\n${message}` : ''}

Submitted on: ${new Date().toLocaleString()}
✓ reCAPTCHA verified
    `

    // Create and send email using Gmail API
    const emailSubject = `New Contact Form Submission${subject ? ` - ${subject}` : ''} from ${name}`
    const encodedMessage = createEmailMessage(
      'office@ableman.co',
      email,
      emailSubject,
      htmlContent,
      textContent
    )

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    })

    console.log(`Contact email sent successfully from ${email}`)

    return NextResponse.json(
      { message: 'Email sent successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Email sending error:', error)
    
    // Return different error messages based on error type
    let errorMessage = 'Failed to send email'
    
    if (error.message?.includes('invalid_grant')) {
      errorMessage = 'Email authentication failed'
    } else if (error.message?.includes('quota')) {
      errorMessage = 'Email quota exceeded'
    }

    return NextResponse.json(
      { error: errorMessage, details: error.message },
      { status: 500 }
    )
  }
}