// Community email notifications. Uses Resend with the same DeelMap-branded
// HTML template family as the OTP email.
//
// All sends are fire-and-forget — the caller never awaits failure.

import { Resend } from 'resend'
import { fireAndForget } from '@/lib/timeout'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM = 'DeelMap <notifications@deelmap.com>'
const LOGO_URL = 'https://deelmap.com/deelmap.png'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://deelmap.com'

// Brand colors / fonts mirror the OTP template
function shell({ title, preview, intro, ctaLabel, ctaHref, body, footerHint }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title>
<style>@media (max-width:600px){.col{padding:24px 22px !important}}</style>
</head>
<body style="margin:0;padding:0;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:0;line-height:0;mso-hide:all">${escape(preview || title)}</span>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff">
      <tr>
        <td style="background:#ffffff;padding:12px 40px;text-align:center;border-bottom:2px solid #D03839">
          <img src="${LOGO_URL}" alt="DeelMap" height="72" style="display:inline-block;height:72px;width:auto;border:0" />
        </td>
      </tr>
      <tr>
        <td class="col" style="padding:36px 40px 28px;background:#ffffff">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#D03839">Community</p>
          <h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#1A1816;letter-spacing:-0.4px;line-height:1.3">${escape(title)}</h1>
          ${intro ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.65;color:#444441">${escape(intro)}</p>` : ''}
          ${body || ''}
          ${ctaLabel && ctaHref ? `
          <table cellpadding="0" cellspacing="0" style="margin:24px 0 4px">
            <tr><td style="background:#D03839;border-radius:4px">
              <a href="${escapeAttr(ctaHref)}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.2px">${escape(ctaLabel)} →</a>
            </td></tr>
          </table>
          ` : ''}
          ${footerHint ? `<p style="margin:18px 0 0;font-size:12px;color:#A8A8A4;line-height:1.6">${footerHint}</p>` : ''}
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;border-top:1px solid #E8E8E4;padding:18px 40px;text-align:center">
          <p style="margin:0 0 4px;font-size:11px;color:#A8A8A4">© 2026 DeelMap. All rights reserved.</p>
          <p style="margin:0;font-size:11px;color:#A8A8A4">
            <a href="${APP_URL}/community/me" style="color:#A8A8A4;text-decoration:underline">Manage notification preferences</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr></table>
</body></html>`
}

function escape(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
function escapeAttr(s) {
  return escape(s).replace(/\n/g, '')
}

// Quote block — used to surface the reply/comment body in the email
function quote(text) {
  if (!text) return ''
  const trimmed = String(text).slice(0, 600)
  return `<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 12px"><tr><td style="background:#FAFAF8;border-left:3px solid #0F6E56;padding:14px 16px;border-radius:0 4px 4px 0">
    <p style="margin:0;font-size:14px;line-height:1.65;color:#1A1816">${escape(trimmed)}</p>
  </td></tr></table>`
}

// ─── Public API ─────────────────────────────────────────────────────────

export function isEmailReady() { return !!resend }

// Generic send wrapped in fire-and-forget. Won't throw to the caller.
export function sendCommunityEmail({ to, subject, html, text }) {
  if (!resend || !to) return
  fireAndForget(
    resend.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || stripHtml(html),
    }),
    'communityEmail'
  )
}

// ── Templates ─────

export function emailCommentReply({ to, replierHandle, postTitle, postSlug, commentBody }) {
  const href = `${APP_URL}/community/p/${postSlug}`
  sendCommunityEmail({
    to,
    subject: `@${replierHandle} replied to your comment`,
    html: shell({
      title: `@${replierHandle} replied to your comment`,
      preview: commentBody?.slice(0, 100) || '',
      intro: `On the thread "${postTitle}"`,
      body: quote(commentBody),
      ctaLabel: 'View the reply',
      ctaHref: href,
      footerHint: 'You\'re getting this because someone replied to your comment in the DeelMap community.',
    }),
  })
}

export function emailPostReply({ to, replierHandle, postTitle, postSlug, commentBody }) {
  const href = `${APP_URL}/community/p/${postSlug}`
  sendCommunityEmail({
    to,
    subject: `@${replierHandle} commented on your post`,
    html: shell({
      title: `@${replierHandle} commented on your post`,
      preview: commentBody?.slice(0, 100) || '',
      intro: `On "${postTitle}"`,
      body: quote(commentBody),
      ctaLabel: 'View the comment',
      ctaHref: href,
      footerHint: 'You\'re getting this because someone commented on your post in the DeelMap community.',
    }),
  })
}

export function emailMention({ to, mentionerHandle, postTitle, postSlug, commentBody }) {
  const href = `${APP_URL}/community/p/${postSlug}`
  sendCommunityEmail({
    to,
    subject: `@${mentionerHandle} mentioned you`,
    html: shell({
      title: `@${mentionerHandle} mentioned you in a thread`,
      preview: commentBody?.slice(0, 100) || '',
      intro: `On "${postTitle}"`,
      body: quote(commentBody),
      ctaLabel: 'Jump to the mention',
      ctaHref: href,
      footerHint: 'You\'re getting this because someone @-mentioned your handle in the DeelMap community.',
    }),
  })
}

export function emailVerificationApproved({ to, role }) {
  const href = `${APP_URL}/community/me`
  sendCommunityEmail({
    to,
    subject: `Verified ✓ — Your ${cap(role)} role is live`,
    html: shell({
      title: `You\'re verified as ${cap(role)}`,
      preview: 'Your role badge is live across the community. +50 Equity awarded.',
      intro: 'A moderator reviewed your submission and approved it. Your role badge now appears on every post and comment you make.',
      body: `<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px"><tr><td style="background:#ECFDF5;border:1px solid #BBF7D0;padding:18px 18px;border-radius:4px">
        <p style="margin:0;font-size:14px;line-height:1.6;color:#065F46"><strong style="color:#0F6E56;font-weight:700">+50 Equity</strong> awarded for completing verification. The badge unlocks DMs, restricted Lots, and 3× Equity on every reply.</p>
      </td></tr></table>`,
      ctaLabel: 'See your profile',
      ctaHref: href,
      footerHint: 'You\'re getting this because your community verification was reviewed.',
    }),
  })
}

export function emailVerificationRejected({ to, role, notes }) {
  const href = `${APP_URL}/community/verify`
  sendCommunityEmail({
    to,
    subject: `Verification update — ${cap(role)}`,
    html: shell({
      title: `Verification update — ${cap(role)}`,
      preview: notes || 'A moderator reviewed your submission.',
      intro: 'A moderator reviewed your submission. You can resubmit with additional documentation any time.',
      body: notes ? quote(notes) : '',
      ctaLabel: 'Submit again',
      ctaHref: href,
      footerHint: `Have questions about the review? <a href="${APP_URL}/contact" style="color:#A8A8A4;text-decoration:underline">Reach us through our contact page</a>.`,
    }),
  })
}

export function emailCommunityWelcome({ to, handle }) {
  const href = `${APP_URL}/community`
  sendCommunityEmail({
    to,
    subject: `Welcome to the DeelMap community, @${handle}`,
    html: shell({
      title: `Welcome, @${handle}`,
      preview: 'Your community handle is live. Start posting, voting, and saving.',
      intro: 'Your handle is live across the community. Three things to try first:',
      body: `
<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px">
  <tr><td style="padding:12px 14px;border:1px solid #E8E8E4;border-radius:4px;background:#FAFAF8">
    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1A1816">1. Anchor your first post to a deal</p>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#737370">Link any active listing or off-market deal. Comments stay attached for life.</p>
  </td></tr>
</table>
<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px">
  <tr><td style="padding:12px 14px;border:1px solid #E8E8E4;border-radius:4px;background:#FAFAF8">
    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1A1816">2. Get your role verified</p>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#737370">Lender, Contractor, Agent, Principal, or Wholesaler. The badge does the trust work — and earns you 3× Equity on replies.</p>
  </td></tr>
</table>
<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 4px">
  <tr><td style="padding:12px 14px;border:1px solid #E8E8E4;border-radius:4px;background:#FAFAF8">
    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1A1816">3. Subscribe to the Lots you care about</p>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#737370">Rates, comps, contractors, off-market deals. Your feed gets sharper the more you commit.</p>
  </td></tr>
</table>`,
      ctaLabel: 'Open the community',
      ctaHref: href,
      footerHint: 'You\'re getting this because you just picked your community handle.',
    }),
  })
}

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000)
}
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : '' }
