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

    // ── All parties have signed → email both with the completed document ──
    if (event_type === 'submission.completed') {
      const submissionId = data.submission_id || data.id
      if (!submissionId) { console.log('[webhook] submission.completed — no id'); return NextResponse.json({ ok: true }) }

      // Always fetch the full submission — webhook payload may have stale placeholder email for the Assignee
      const fullRes = await fetch(`${DOCUSEAL_BASE}/submissions/${submissionId}`, { headers: dsHeaders() })
      const full = await fullRes.json()

      const property = full.name || data.name || ''
      const documents = full.documents || []
      const docUrl = documents[0]?.url || null
      const submitters = full.submitters || []

      await Promise.all(
        submitters
          .filter(s => s.email && !s.email.includes('noreply.deelmap.com'))
          .map(s =>
            resend.emails.send({
              from: FROM,
              to: s.email,
              subject: property
                ? `Contract Fully Executed — ${property}`
                : 'Your Contract Has Been Fully Signed',
              html: `
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="margin:0;padding:0;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
                    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;">
                      <tr>
                        <td style="background:#ffffff;padding:12px 40px;text-align:center;border-bottom:2px solid #D03839;">
                          <img src="https://sellerportaldeelmap-production-bea8.up.railway.app/deelmap.png" alt="DeelMap" height="72" style="display:inline-block;height:72px;width:auto;border:0;" />
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:36px 40px 32px;background:#ffffff;">
                          <p style="margin:0 0 6px;font-size:14px;color:#737370;">Hi${s.name ? ` ${s.name}` : ' there'},</p>
                          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A1816;letter-spacing:-0.4px;line-height:1.25;">Your contract is fully executed</h1>
                          <p style="margin:0 0 28px;font-size:14px;line-height:1.65;color:#737370;">
                            All parties have signed${property ? ` the contract for <strong style="color:#1A1816;">${property}</strong>` : ''}. A copy is available for your records below.
                          </p>
                          ${property ? `
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                            <tr><td style="background:#FAFAF8;border:1px solid #E8E8E4;border-radius:4px;padding:14px 16px;">
                              <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#A8A8A4;">Property</p>
                              <p style="margin:0;font-size:14px;font-weight:600;color:#1A1816;">${property}</p>
                            </td></tr>
                          </table>` : ''}
                          ${docUrl ? `
                          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                            <tr><td style="background:#D03839;border-radius:4px;">
                              <a href="${docUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Download Signed Contract →</a>
                            </td></tr>
                          </table>
                          <p style="margin:0;font-size:12px;color:#A8A8A4;line-height:1.6;">
                            Or copy this link:<br>
                            <span style="color:#737370;word-break:break-all;">${docUrl}</span>
                          </p>` : '<p style="margin:0;font-size:13px;color:#737370;">You can log in to DeelMap to view and download your signed contract.</p>'}
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#ffffff;border-top:1px solid #E8E8E4;padding:20px 40px;text-align:center;">
                          <p style="margin:0;font-size:12px;color:#A8A8A4;">© 2026 DeelMap. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
                  </td></tr></table>
                </body>
                </html>
              `,
              text: `Hi${s.name ? ` ${s.name}` : ''},\n\nAll parties have signed the contract${property ? ` for ${property}` : ''}.\n\n${docUrl ? `Download: ${docUrl}` : 'Log in to DeelMap to view your signed contract.'}\n\n— DeelMap`,
            })
          )
      )

      console.log('[webhook] submission.completed — notified', (full.submitters || []).filter(s => s.email && !s.email.includes('noreply.deelmap.com')).length, 'parties')
      return NextResponse.json({ ok: true })
    }

    if (event_type !== 'form.completed') return NextResponse.json({ ok: true })
    if (data?.role !== 'First Party') {
      console.log('[webhook] skipping — role is not First Party, got:', data?.role)
      return NextResponse.json({ ok: true })
    }
    const submissionId = data.submission_id || data.submission?.id
    if (!submissionId) {
      console.log('[webhook] no submission_id in payload')
      return NextResponse.json({ ok: true })
    }

    console.log('[webhook] fetching full submission:', submissionId)
    const submissionRes = await fetch(`${DOCUSEAL_BASE}/submissions/${submissionId}`, {
      headers: dsHeaders(),
    })
    const fullSubmission = await submissionRes.json()
    console.log('[webhook] submitter metadata:', JSON.stringify(data.metadata))
    console.log('[webhook] full submission submitters:', JSON.stringify(fullSubmission.submitters?.map(s => ({ id: s.id, role: s.role, slug: s.slug, email: s.email }))))

    const metadata = data.metadata || {}
    const assigneeEmail = metadata.assigneeEmail
    const assigneeName = metadata.assigneeName

    console.log('[webhook] assigneeEmail from metadata:', assigneeEmail)

    if (!assigneeEmail) {
      console.log('[webhook] no assigneeEmail in metadata — aborting')
      return NextResponse.json({ ok: true })
    }

    const assigneeSubmitter = fullSubmission.submitters?.find(s => s.role === 'Second Party')
    if (!assigneeSubmitter?.id) {
      console.log('[webhook] no Second Party submitter found')
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
    const property = fullSubmission.name || ''
    const signingUrl = `https://deelmap.com/sign/${assigneeSubmitter.slug}`

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
        <body style="margin:0;padding:0;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;">
              <tr>
                <td style="background:#ffffff;padding:12px 40px;text-align:center;border-bottom:2px solid #D03839;">
                  <img src="https://sellerportaldeelmap-production-bea8.up.railway.app/deelmap.png" alt="DeelMap" height="72" style="display:inline-block;height:72px;width:auto;border:0;" />
                </td>
              </tr>
              <tr>
                <td style="padding:36px 40px 32px;background:#ffffff;">
                  <p style="margin:0 0 6px;font-size:14px;color:#737370;">Hi${assigneeName ? ` ${assigneeName}` : ' there'},</p>
                  <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A1816;letter-spacing:-0.4px;line-height:1.25;">A contract is ready for your signature</h1>
                  <p style="margin:0 0 28px;font-size:14px;line-height:1.65;color:#737370;">
                    <strong style="color:#1A1816;">${assignorName}</strong> has completed their portion of the contract and is waiting for your signature.
                  </p>
                  ${property ? `
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr><td style="background:#FAFAF8;border:1px solid #E8E8E4;border-radius:4px;padding:14px 16px;">
                      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#A8A8A4;">Property</p>
                      <p style="margin:0;font-size:14px;font-weight:600;color:#1A1816;">${property}</p>
                    </td></tr>
                  </table>` : ''}
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr><td style="background:#D03839;border-radius:4px;">
                      <a href="${signingUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Review &amp; Sign Contract →</a>
                    </td></tr>
                  </table>
                  <p style="margin:0;font-size:12px;color:#A8A8A4;line-height:1.6;">
                    Or copy this link:<br>
                    <span style="color:#737370;word-break:break-all;">${signingUrl}</span>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#ffffff;border-top:1px solid #E8E8E4;padding:20px 40px;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#A8A8A4;">© 2026 DeelMap. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td></tr></table>
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
