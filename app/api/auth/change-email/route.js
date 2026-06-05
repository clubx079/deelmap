// Change a logged-in user's email with verification of the NEW address.
// POST { action:'send', userId, newEmail }   -> emails a 6-digit code to newEmail
// POST { action:'verify', userId, newEmail, otp } -> updates the user's email
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { Resend } from 'resend'
import { withTimeout } from '@/lib/timeout'
import { saveOtp, verifyOtp } from '@/lib/otpStore'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function codeEmailHtml(code) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff">
      <tr><td style="padding:36px 40px 32px">
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A1816;letter-spacing:-0.4px">Confirm your new email</h1>
        <p style="margin:0 0 28px;font-size:14px;line-height:1.65;color:#737370">Use the code below to confirm this address for your DeelMap account. It expires in 10 minutes.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px"><tr><td align="center">
          <table cellpadding="0" cellspacing="0"><tr><td style="background:#FAFAF8;border:1px solid #E8E8E4;border-radius:4px;padding:20px 32px;text-align:center">
            <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#A8A8A4">Verification code</p>
            <p style="margin:0;font-size:36px;font-weight:700;color:#1A1816;font-family:'Courier New',monospace;letter-spacing:6px">${code}</p>
          </td></tr></table>
        </td></tr></table>
        <p style="margin:0;font-size:12px;color:#A8A8A4;line-height:1.6">If you didn't request this change, you can safely ignore this email.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

export async function POST(request) {
  try {
    const { action, userId, newEmail, otp } = await request.json()
    if (!userId || !newEmail) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }
    const email = String(newEmail).trim().toLowerCase()
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ message: 'Please enter a valid email address' }, { status: 400 })
    }

    if (action === 'send') {
      const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
      if (existing && existing.id !== userId) {
        return NextResponse.json({ message: 'That email is already in use.' }, { status: 409 })
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const saved = await saveOtp(email, 'email_change', code, 10, { userId })
      if (!saved.ok) {
        const limited = saved.error === 'cooldown' || saved.error === 'rate_limited'
        return NextResponse.json(
          { message: limited ? 'Too many requests — please wait a moment and try again.' : 'Could not send the code. Please try again.' },
          { status: limited ? 429 : 500 }
        )
      }

      if (!resend) return NextResponse.json({ message: 'Email service is not configured.' }, { status: 500 })
      const { error } = await withTimeout(
        resend.emails.send({
          from: 'DeelMap <notifications@deelmap.com>',
          to: [email],
          subject: `${code} is your DeelMap email-change code`,
          html: codeEmailHtml(code),
          text: `Your DeelMap email change code is ${code}. Valid for 10 minutes. If you didn't request this, ignore this email.`,
        }),
        15000,
        'Email send timed out'
      )
      if (error) return NextResponse.json({ message: 'Failed to send the verification code.' }, { status: 500 })
      return NextResponse.json({ message: 'Verification code sent', email })
    }

    if (action === 'verify') {
      if (!otp) return NextResponse.json({ message: 'Verification code is required' }, { status: 400 })

      const result = await verifyOtp(email, 'email_change', otp)
      if (!result.valid) {
        const messages = {
          not_found: 'Code not found or expired. Please request a new one.',
          expired: 'This code has expired. Please request a new one.',
          too_many_attempts: 'Too many incorrect attempts. Please request a new code.',
          config: 'Verification is temporarily unavailable. Please try again.',
        }
        return NextResponse.json({ message: messages[result.reason] || 'Invalid code' }, { status: 400 })
      }

      // The code must have been issued for this same user
      if (result.meta?.userId && result.meta.userId !== userId) {
        return NextResponse.json({ message: 'Verification mismatch. Please try again.' }, { status: 400 })
      }

      // Re-check uniqueness right before committing
      const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
      if (existing && existing.id !== userId) {
        return NextResponse.json({ message: 'That email is already in use.' }, { status: 409 })
      }

      const { error: updErr } = await supabase
        .from('users')
        .update({ email, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (updErr) return NextResponse.json({ message: 'Could not update your email. Please try again.' }, { status: 500 })

      return NextResponse.json({ message: 'Email updated successfully', email })
    }

    return NextResponse.json({ message: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[change-email] error:', e?.message)
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
