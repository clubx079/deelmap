// Branded DeelMap buyer welcome email — sent once on signup.
// Matches the canonical transactional template (see app/api/auth/send-otp).
import { Resend } from 'resend'

const FROM = process.env.RESEND_FROM_EMAIL || 'DeelMap <notifications@deelmap.com>'
const SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://deelmap.com').replace(/\/+$/, '')

function escape(s) {
  return s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function buildBuyerWelcomeEmail({ name }) {
  const first = (name || '').trim().split(/\s+/)[0] || ''
  const subject = 'Welcome to DeelMap'
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">You're in — and we'd love your first impression of DeelMap.</div>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff">
      <tr>
        <td style="background:#ffffff;padding:12px 40px;text-align:center;border-bottom:2px solid #D03839">
          <img src="https://deelmap.com/deelmap.png" alt="DeelMap" height="72" style="display:inline-block;height:72px;width:auto;border:0" />
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px 32px;background:#ffffff">
          <p style="margin:0 0 6px;font-size:14px;color:#737370">Hi ${escape(first) || 'there'},</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1A1816;letter-spacing:-0.4px;line-height:1.25">Welcome to DeelMap</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#444441">Thank you for joining DeelMap — the marketplace built for serious real-estate investors. Your account is ready, so you can browse off-market and wholesale deals, save the ones that fit your strategy, message sellers directly, and make offers without ever leaving the platform.</p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#444441">As we keep refining the experience, your first impression genuinely matters to us. Would you take two minutes to tell us how the site looks and feels, and whether anything could be clearer or better? Your notes go straight to our team.</p>
          <table cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr>
            <td style="background:#D03839;border-radius:4px;">
              <a href="${SITE}/contact" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Share your feedback &rarr;</a>
            </td>
          </tr></table>
          <p style="margin:16px 0 0;font-size:14px;line-height:1.65;color:#737370">Prefer to dive in first? <a href="${SITE}/marketplace" style="color:#D03839;text-decoration:none;font-weight:600">Start browsing deals</a>.</p>
          <p style="margin:28px 0 0;font-size:14px;line-height:1.65;color:#444441">Welcome aboard,<br/>The DeelMap Team</p>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;border-top:1px solid #E8E8E4;padding:20px 40px;text-align:center">
          <p style="margin:0 0 4px;font-size:12px;color:#A8A8A4">Questions? <a href="${SITE}/contact" style="color:#737370;text-decoration:underline">Reach us through our contact page</a></p>
          <p style="margin:0;font-size:12px;color:#A8A8A4">© 2026 DeelMap. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </td></tr></table>
</body></html>`
  return { subject, html }
}

// Fire-and-forget; never throws.
export async function sendBuyerWelcomeEmail({ to, name }) {
  const key = process.env.RESEND_API_KEY
  if (!key || !to) return false
  try {
    const { subject, html } = buildBuyerWelcomeEmail({ name })
    const resend = new Resend(key)
    await resend.emails.send({ from: FROM, to, subject, html })
    return true
  } catch (e) {
    console.error('[welcomeEmail] send failed:', e?.message || e)
    return false
  }
}
