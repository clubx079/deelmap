import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const RECIPIENT = process.env.CASHOFFER_RECIPIENT_EMAIL || 'support@deelmap.com'
const FROM = process.env.RESEND_FROM_EMAIL || 'Deelmap <notifications@deelmap.com>'

function field(label, value) {
  if (value == null || value === '') return ''
  const safe = String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<tr><td style="padding:6px 12px 6px 0;font-size:13px;color:#737370;vertical-align:top;white-space:nowrap"><strong>${label}</strong></td><td style="padding:6px 0;font-size:14px;color:#1A1816">${safe}</td></tr>`
}

export async function POST(request) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'Cash-offer intake is not configured.' }, { status: 500 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const {
    firstName = '',
    lastName = '',
    email = '',
    phoneNumber = '',
    propertyType = '',
    fullAddress = '',
    state = '',
    closingTime = '',
    askingPrice = '',
    negotiable = '',
    contactDate = '',
    condition = '',
  } = body || {}

  if (!firstName || !lastName || !email || !phoneNumber || !fullAddress) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const subject = `New Cash Offer Request — ${firstName} ${lastName}`
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff">
        <tr><td style="background:#fff;padding:12px 40px;text-align:center;border-bottom:2px solid #D03839">
          <img src="https://deelmap.com/deelmap.png" alt="Deelmap" height="56" style="display:inline-block;height:56px;width:auto;border:0" />
        </td></tr>
        <tr><td style="padding:32px 40px 24px;background:#fff">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#A8A8A4">New Lead</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1A1816">Cash Offer Request</h1>
          <table cellpadding="0" cellspacing="0" style="width:100%">
            ${field('Name', `${firstName} ${lastName}`)}
            ${field('Email', email)}
            ${field('Phone', phoneNumber)}
            ${field('Property Type', propertyType)}
            ${field('Address', fullAddress)}
            ${field('State', state)}
            ${field('Closing (days)', closingTime)}
            ${field('Asking Price', askingPrice)}
            ${field('Negotiable', negotiable)}
            ${field('Best Contact Date', contactDate)}
            ${field('Notes', condition)}
          </table>
        </td></tr>
        <tr><td style="background:#fff;border-top:1px solid #E8E8E4;padding:18px 40px;text-align:center">
          <p style="margin:0;font-size:12px;color:#A8A8A4">Submitted via deelmap.com/cashoffer</p>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`

  try {
    const resend = new Resend(key)
    await resend.emails.send({
      from: FROM,
      to: RECIPIENT,
      reply_to: email,
      subject,
      html,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Cash-offer email failed:', err)
    return NextResponse.json({ error: 'Could not submit your request. Please try again.' }, { status: 500 })
  }
}
