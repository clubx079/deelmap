import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// TODO: Update CONTACT_RECIPIENT_EMAIL with the actual recipient email
const CONTACT_RECIPIENT_EMAIL = process.env.CONTACT_RECIPIENT_EMAIL || 'office@deelmap.co'

export async function POST(request) {
  try {
    const { name, email, message } = await request.json()

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    await resend.emails.send({
      from: 'DeelMap Contact <onboarding@resend.dev>',
      to: CONTACT_RECIPIENT_EMAIL,
      replyTo: email,
      subject: `New contact message from ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1A1816; border-bottom: 2px solid #D03839; padding-bottom: 12px;">
            New Contact Message — DeelMap
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr>
              <td style="padding: 10px 0; color: #737370; font-size: 13px; width: 120px;">Name</td>
              <td style="padding: 10px 0; color: #1A1816; font-weight: 600;">${name}</td>
            </tr>
            <tr style="border-top: 1px solid #E8E8E4;">
              <td style="padding: 10px 0; color: #737370; font-size: 13px;">Email</td>
              <td style="padding: 10px 0; color: #1A1816; font-weight: 600;">
                <a href="mailto:${email}" style="color: #D03839;">${email}</a>
              </td>
            </tr>
            <tr style="border-top: 1px solid #E8E8E4;">
              <td style="padding: 10px 0; color: #737370; font-size: 13px; vertical-align: top;">Message</td>
              <td style="padding: 10px 0; color: #444441; line-height: 1.6;">${message.replace(/\n/g, '<br/>')}</td>
            </tr>
          </table>
          <p style="margin-top: 24px; font-size: 12px; color: #A8A8A4;">
            Sent via the DeelMap contact form. Reply directly to this email to respond to ${name}.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Contact email error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
