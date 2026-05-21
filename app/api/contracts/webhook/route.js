import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'DeelMap Contracts <noreply@deelmap.com>'
const DOCUSEAL_BASE = 'https://api.docuseal.com'

function dsHeaders() {
  return { 'X-Auth-Token': process.env.DOCUSEAL_API_KEY, 'Content-Type': 'application/json' }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { event_type, data } = body

    console.log('[webhook] received event_type:', event_type, '| role:', data?.role)

    if (event_type !== 'form.completed') return NextResponse.json({ ok: true })
    if (data?.role !== 'First Party') {
      console.log('[webhook] skipping — role is not First Party, got:', data?.role)
      return NextResponse.json({ ok: true })
    }
    console.log('[webhook] full data keys:', Object.keys(data || {}))
    console.log('[webhook] submission:', JSON.stringify(data?.submission))
    if (!data?.submission?.submitters) {
      console.log('[webhook] no submitters in payload')
      return NextResponse.json({ ok: true })
    }

    const metadata = data.submission.metadata || {}
    const assigneeEmail = metadata.assigneeEmail
    const assigneeName = metadata.assigneeName

    console.log('[webhook] assigneeEmail from metadata:', assigneeEmail)

    if (!assigneeEmail) {
      console.log('[webhook] no assigneeEmail in metadata — aborting')
      return NextResponse.json({ ok: true })
    }

    const assigneeSubmitter = data.submission.submitters.find(s => s.role === 'Second Party')
    if (!assigneeSubmitter?.id) {
      console.log('[webhook] no Assignee submitter found')
      return NextResponse.json({ ok: true })
    }

    console.log('[webhook] patching assignee submitter id:', assigneeSubmitter.id, 'with email:', assigneeEmail)
    const patchRes = await fetch(`${DOCUSEAL_BASE}/submitters/${assigneeSubmitter.id}`, {
      method: 'PATCH',
      headers: dsHeaders(),
      body: JSON.stringify({ email: assigneeEmail, name: assigneeName }),
    })
    console.log('[webhook] patch status:', patchRes.status)

    const assignorName = data.name || data.email || 'The Buyer'
    const property = data.submission.name || ''
    const signingUrl = `https://docuseal.com/s/${assigneeSubmitter.slug}`

    console.log('[webhook] sending email to:', assigneeEmail)
    const emailResult = await resend.emails.send({
      from: FROM,
      to: assigneeEmail,
      subject: property
        ? `Action Required: Contract Ready to Sign — ${property}`
        : 'Action Required: A Contract is Ready for Your Signature',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F3;padding:40px 16px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #E8E8E4;">
                <tr>
                  <td style="background:#D03839;padding:24px 32px;">
                    <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">DeelMap</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 8px;font-size:13px;color:#737370;">Hello${assigneeName ? ` ${assigneeName}` : ''},</p>
                    <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#1A1816;line-height:1.3;">
                      A contract is ready for your signature
                    </h1>
                    ${property ? `
                    <div style="background:#FAFAF8;border:1px solid #E8E8E4;border-radius:6px;padding:14px 16px;margin-bottom:20px;">
                      <p style="margin:0;font-size:11px;font-weight:600;color:#737370;text-transform:uppercase;letter-spacing:0.5px;">Property</p>
                      <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1A1816;">${property}</p>
                    </div>` : ''}
                    <p style="margin:0 0 24px;font-size:14px;color:#444441;line-height:1.6;">
                      <strong>${assignorName}</strong> has completed their portion of the contract and is waiting for your signature.
                    </p>
                    <a href="${signingUrl}" style="display:inline-block;background:#D03839;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:6px;">
                      Review &amp; Sign Contract →
                    </a>
                    <p style="margin:24px 0 0;font-size:12px;color:#A8A8A4;line-height:1.6;">
                      Or copy this link:<br>
                      <span style="color:#737370;word-break:break-all;">${signingUrl}</span>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 32px;border-top:1px solid #E8E8E4;">
                    <p style="margin:0;font-size:11px;color:#A8A8A4;">Powered by DeelMap · Secure, legally binding e-signatures</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
      text: `Hello${assigneeName ? ` ${assigneeName}` : ''},\n\n${assignorName} has completed their portion of the contract${property ? ` for ${property}` : ''}.\n\nSign here: ${signingUrl}\n\n— DeelMap`,
    })

    console.log('[webhook] email result:', JSON.stringify(emailResult))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook] error:', err?.message || err)
    return NextResponse.json({ ok: true })
  }
}
