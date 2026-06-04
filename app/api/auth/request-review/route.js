import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const ADMIN_PORTAL_URL = process.env.ADMIN_PORTAL_URL || 'https://admin.deelmap.com'

function getClientIP(request) {
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  const vercelIP = request.headers.get('x-vercel-forwarded-for')
  if (vercelIP) return vercelIP.split(',')[0].trim()
  return null
}

const LOCALHOST_IPS = ['127.0.0.1', '::1', '::ffff:127.0.0.1']

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getNotificationEmails() {
  try {
    const { data } = await supabaseAdmin
      .from('email_notifications')
      .select('recipient_emails, is_active')
      .eq('notification_type', 'ip_review')
      .eq('is_active', true)
      .single()

    if (data?.recipient_emails?.length) return data.recipient_emails
    return ['support@deelmap.com']
  } catch {
    return ['support@deelmap.com']
  }
}

async function sendIPReviewNotification(user, message, clientIP) {
  if (!resend) return

  const recipients = await getNotificationEmails()
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
  const ipReviewsUrl = `${ADMIN_PORTAL_URL}/settings/ip-reviews`

  const html = `
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
        <td style="padding:36px 40px 8px;background:#ffffff">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#D03839">Account Review</p>
          <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#1A1816;letter-spacing:-0.4px;line-height:1.25">New Suspension Appeal</h1>
          <p style="margin:0 0 28px;font-size:14px;line-height:1.65;color:#737370">A suspended buyer has submitted an appeal requesting account reinstatement. Please review and take action in the admin portal.</p>
        </td>
      </tr>

      <tr>
        <td style="padding:0 40px 24px;background:#ffffff">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#FAFAF8;border:1px solid #E8E8E4;border-radius:4px;padding:20px">
                <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#A8A8A4">User Details</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:4px 0;font-size:13px;color:#737370;width:90px">Name</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1A1816">${fullName || '—'}</td></tr>
                  <tr><td style="padding:4px 0;font-size:13px;color:#737370">Email</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1A1816">${user.email}</td></tr>
                  <tr><td style="padding:4px 0;font-size:13px;color:#737370">IP Address</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#1A1816;font-family:'Courier New',monospace">${clientIP || 'Unknown'}</td></tr>
                  <tr><td style="padding:4px 0;font-size:13px;color:#737370">Submitted</td><td style="padding:4px 0;font-size:13px;color:#737370">${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${message ? `
      <tr>
        <td style="padding:0 40px 24px;background:#ffffff">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#FEF0EF;border:1px solid #F5C4C0;border-radius:4px;padding:20px">
                <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#D03839">Appeal Message</p>
                <p style="margin:0;font-size:14px;line-height:1.65;color:#1A1816;white-space:pre-wrap">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ` : ''}

      <tr>
        <td style="padding:0 40px 36px;background:#ffffff;text-align:center">
          <a href="${ipReviewsUrl}" style="display:inline-block;background:#D03839;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:4px;font-size:14px;font-weight:600;letter-spacing:0.2px">
            Review Appeal in Admin Portal
          </a>
        </td>
      </tr>

      <tr>
        <td style="background:#ffffff;border-top:1px solid #E8E8E4;padding:20px 40px;text-align:center">
          <p style="margin:0;font-size:12px;color:#A8A8A4">© 2026 DeelMap. All rights reserved.</p>
        </td>
      </tr>

    </table>
  </td></tr></table>
</body></html>`

  for (const to of recipients) {
    try {
      await resend.emails.send({
        from: 'Deelmap <notifications@deelmap.com>',
        to,
        subject: `IP Review Request — ${fullName} (${user.email})`,
        html,
      })
    } catch (err) {
      console.error(`Failed to send IP review notification to ${to}:`, err)
    }
  }
}

export async function POST(request) {
  try {
    const { message, email } = await request.json()

    const clientIP = getClientIP(request)
    const isLocalhost = !clientIP || LOCALHOST_IPS.includes(clientIP)

    let user = null

    // Try IP lookup first (only on real/deployed environments)
    if (!isLocalhost) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name, suspended')
        .eq('registration_ip', clientIP)
        .eq('suspended', true)
        .maybeSingle()
      user = data
    }

    // Fall back to email lookup (covers localhost dev + IP changes/VPN)
    if (!user && email) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name, suspended')
        .eq('email', email)
        .eq('suspended', true)
        .maybeSingle()
      user = data
    }

    if (!user) {
      return NextResponse.json({ error: 'No suspended account found' }, { status: 404 })
    }

    // Check if there's already a pending request
    const { data: existing } = await supabaseAdmin
      .from('ip_review_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You already have a pending review request. Please wait for it to be reviewed.' }, { status: 400 })
    }

    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()

    const { error: insertError } = await supabaseAdmin
      .from('ip_review_requests')
      .insert({
        user_email: user.email,
        user_name: fullName || null,
        user_id: user.id,
        ip_address: clientIP || 'localhost',
        message: message || '',
        status: 'pending'
      })

    if (insertError) {
      console.error('Error inserting review request:', insertError)
      return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
    }

    // Fire email notification (non-blocking — don't fail the request if email fails)
    sendIPReviewNotification(user, message, clientIP).catch(err =>
      console.error('IP review email notification failed:', err)
    )

    return NextResponse.json({ success: true, message: 'Review request submitted successfully' })
  } catch (err) {
    console.error('Request review error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
