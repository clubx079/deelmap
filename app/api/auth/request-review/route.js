import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const ADMIN_PORTAL_URL = process.env.ADMIN_PORTAL_URL || 'https://admindashboarddeelmap-production.up.railway.app'

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
    return ['hamza@airosofts.com']
  } catch {
    return ['hamza@airosofts.com']
  }
}

async function sendIPReviewNotification(user, message, clientIP) {
  if (!resend) return

  const recipients = await getNotificationEmails()
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
  const ipReviewsUrl = `${ADMIN_PORTAL_URL}/settings/ip-reviews`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:30px;">
    <div style="border-left:4px solid #D03839;padding-left:16px;margin-bottom:24px;">
      <h1 style="margin:0 0 4px 0;font-size:20px;color:#1A1816;">New IP Review Request</h1>
      <p style="margin:0;font-size:13px;color:#737370;">A suspended user is requesting account reinstatement</p>
    </div>

    <div style="background:#FAFAF8;border:1px solid #E8E8E4;border-radius:4px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;color:#737370;text-transform:uppercase;letter-spacing:0.05em;">User Details</p>
      <p style="margin:4px 0;font-size:14px;color:#1A1816;"><strong>Name:</strong> ${fullName}</p>
      <p style="margin:4px 0;font-size:14px;color:#1A1816;"><strong>Email:</strong> ${user.email}</p>
      <p style="margin:4px 0;font-size:14px;color:#1A1816;"><strong>IP Address:</strong> ${clientIP || 'Unknown'}</p>
    </div>

    ${message ? `
    <div style="background:#FEF0EF;border:1px solid #F5C4C0;border-radius:4px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;color:#D03839;text-transform:uppercase;letter-spacing:0.05em;">Appeal Message</p>
      <p style="margin:0;font-size:14px;color:#1A1816;white-space:pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </div>
    ` : '<p style="font-size:13px;color:#737370;margin-bottom:20px;">No message provided.</p>'}

    <div style="text-align:center;padding:16px 0;">
      <a href="${ipReviewsUrl}"
         style="display:inline-block;background:#D03839;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-size:14px;font-weight:600;">
        Review Request in Admin Portal
      </a>
    </div>

    <div style="border-top:1px solid #E8E8E4;padding-top:12px;margin-top:8px;">
      <p style="margin:0;font-size:11px;color:#A8A8A4;">Submitted: ${new Date().toLocaleString()}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#A8A8A4;">DeelMap IP Review System</p>
    </div>
  </div>
</body>
</html>`

  for (const to of recipients) {
    try {
      await resend.emails.send({
        from: 'DeelMap Admin <noreply@deelmap.com>',
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
