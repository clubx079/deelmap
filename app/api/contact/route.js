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
      from: 'Deelmap <notifications@deelmap.com>',
      to: CONTACT_RECIPIENT_EMAIL,
      replyTo: email,
      subject: `New contact message from ${name}`,
      html: `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff">
      <tr>
        <td style="background:#ffffff;padding:12px 40px;text-align:center;border-bottom:2px solid #D03839">
          <img src="https://deelmap.com/deelmap.png" alt="DeelMap" height="72" style="display:inline-block;height:72px;width:auto;border:0" />
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px 32px;background:#ffffff">
          <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#1A1816;letter-spacing:-0.4px">New contact message</h1>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E8E4;border-radius:4px;overflow:hidden">
            <tr style="border-bottom:1px solid #E8E8E4">
              <td style="padding:12px 16px;background:#FAFAF8;font-size:12px;font-weight:600;color:#737370;width:100px;border-bottom:1px solid #E8E8E4">Name</td>
              <td style="padding:12px 16px;font-size:14px;color:#1A1816;font-weight:600;border-bottom:1px solid #E8E8E4">${name}</td>
            </tr>
            <tr style="border-bottom:1px solid #E8E8E4">
              <td style="padding:12px 16px;background:#FAFAF8;font-size:12px;font-weight:600;color:#737370;border-bottom:1px solid #E8E8E4">Email</td>
              <td style="padding:12px 16px;font-size:14px;border-bottom:1px solid #E8E8E4"><a href="mailto:${email}" style="color:#D03839;text-decoration:none">${email}</a></td>
            </tr>
            <tr>
              <td style="padding:12px 16px;background:#FAFAF8;font-size:12px;font-weight:600;color:#737370;vertical-align:top">Message</td>
              <td style="padding:12px 16px;font-size:14px;color:#1A1816;line-height:1.65">${message.replace(/\n/g, '<br/>')}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;border-top:1px solid #E8E8E4;padding:20px 40px;text-align:center">
          <p style="margin:0;font-size:12px;color:#A8A8A4">© 2026 DeelMap. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </td></tr></table>
</body></html>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Contact email error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
