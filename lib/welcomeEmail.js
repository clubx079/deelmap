// Branded Deelmap buyer welcome email — sent once on signup.
import { Resend } from 'resend'

const FROM = process.env.RESEND_FROM_EMAIL || 'Deelmap <notifications@deelmap.com>'
const LOGO = 'https://deelmap.com/deelmap.png'
const SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://deelmap.com').replace(/\/+$/, '')

function escape(s) {
  return s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function buildBuyerWelcomeEmail({ name }) {
  const first = (name || '').trim().split(/\s+/)[0] || 'there'
  const subject = 'Welcome to Deelmap'
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <div style="display:none;font-size:1px;color:#F5F5F3;max-height:0;max-width:0;opacity:0;overflow:hidden">Your Deelmap account is ready — start finding off-market deals.</div>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff">
      <tr>
        <td style="background:#ffffff;padding:14px 40px;text-align:center;border-bottom:2px solid #D03839">
          <img src="${LOGO}" alt="Deelmap" height="56" style="display:inline-block;height:56px;width:auto;border:0" />
        </td>
      </tr>
      <tr><td style="padding:32px 40px 24px;background:#ffffff">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#A8A8A4">Welcome</p>
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A1816">Welcome to Deelmap, ${escape(first)}.</h1>
        <p style="margin:0 0 8px;font-size:15px;color:#444441;line-height:1.5">You're in. Deelmap is where investors find off-market and wholesale deals — browse the marketplace, save the ones you like, message sellers, and make offers right inside the platform.</p>
        <p style="margin:0 0 8px;font-size:14px;color:#737370;line-height:1.5">A good first step: set your buy box (the criteria for deals you want) so we can point you at the right properties.</p>
        <p style="margin:16px 0 6px;font-size:13px;font-weight:700;color:#1A1816">Coming soon to Deelmap</p>
        <p style="margin:0 0 8px;font-size:14px;color:#737370;line-height:1.5">We're building a personalized deal feed that surfaces properties matched to your activity, instant alerts when a new deal fits your buy box, and a sharper investor community. We'll let you know as these roll out.</p>
        <table cellpadding="0" cellspacing="0" style="margin-top:24px"><tr><td style="background:#D03839;border-radius:4px">
          <a href="${SITE}/marketplace" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600">Browse deals</a>
        </td></tr></table>
      </td></tr>
      <tr>
        <td style="background:#ffffff;border-top:1px solid #E8E8E4;padding:18px 40px;text-align:center">
          <p style="margin:0 0 4px;font-size:12px;color:#737370">Questions? Reach us at <a href="mailto:support@deelmap.com" style="color:#1A1816">support@deelmap.com</a></p>
          <p style="margin:0;font-size:12px;color:#A8A8A4">&copy; ${new Date().getFullYear()} Deelmap. All rights reserved.</p>
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
