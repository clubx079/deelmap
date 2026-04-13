import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

// ─── Groq helpers ────────────────────────────────────────────────────────────

async function groqChat(messages, model) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: 80, temperature: 0 }),
  })
  if (!res.ok) throw new Error(`Groq API error: ${res.status}`)
  const data = await res.json()
  return data.choices[0].message.content.trim()
}

// Returns { pass: true } or { pass: false, reason: '...' }
async function checkText(text) {
  if (!text?.trim()) return { pass: true }
  try {
    const reply = await groqChat([{
      role: 'user',
      content: `You are moderating a real estate marketplace listing. Does the following text contain profanity, hate speech, scam content, or anything clearly inappropriate for a property listing? Reply with exactly "PASS" if clean, or "FAIL: <brief reason>" if not.\n\n${text.slice(0, 1200)}`
    }], 'llama-3.3-70b-versatile')
    if (reply.toUpperCase().startsWith('PASS')) return { pass: true }
    return { pass: false, reason: reply.replace(/^FAIL:\s*/i, '').slice(0, 200) }
  } catch {
    return { pass: true } // Don't block on Groq errors
  }
}

// Returns { pass: true } or { pass: false, reason: '...' }
async function checkImage(url) {
  if (!url) return { pass: true }
  try {
    const reply = await groqChat([{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url } },
        { type: 'text', text: 'You are moderating a real estate marketplace. Is this image appropriate for a property listing? It should show property-related content (interior, exterior, yard, rooms, etc.). Reply with exactly "PASS" if appropriate, or "FAIL: <brief reason>" if it contains nudity, violence, graphic content, or is clearly not a property photo.' }
      ]
    }], 'llama-3.2-11b-vision-preview')
    if (reply.toUpperCase().startsWith('PASS')) return { pass: true }
    return { pass: false, reason: reply.replace(/^FAIL:\s*/i, '').slice(0, 200) }
  } catch {
    return { pass: true } // Don't block listing if vision check errors
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function moderateProperty(propertyId) {
  try {
    const { data: property } = await supabase
      .from('properties')
      .select('id, slug, seo_title, address, city, state, description, repairs, status, posted_by, property_images(image_url, sort_order)')
      .eq('id', propertyId)
      .single()

    if (!property || property.status !== 'under_review') return

    const failures = []

    // 1. Text checks
    const descResult = await checkText(property.description)
    if (!descResult.pass) failures.push(`Description: ${descResult.reason}`)

    const repairsResult = await checkText(property.repairs)
    if (!repairsResult.pass) failures.push(`Repairs: ${repairsResult.reason}`)

    // 2. Image checks — all photos
    const images = (property.property_images || [])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    for (const img of images) {
      const imgResult = await checkImage(img.image_url)
      if (!imgResult.pass) {
        failures.push(`Photo: ${imgResult.reason}`)
      }
    }

    if (failures.length > 0) {
      await supabase
        .from('properties')
        .update({ status: 'draft', rejection_reason: failures.join('. ') })
        .eq('id', propertyId)
      console.log(`[moderation] Property ${propertyId} rejected:`, failures.join('; '))
      return
    }

    // All checks passed — go live
    await supabase
      .from('properties')
      .update({ status: 'active', rejection_reason: null })
      .eq('id', propertyId)

    console.log(`[moderation] Property ${propertyId} approved and set to active`)

    // Fetch buyer info and send approval email
    if (property.posted_by) {
      const { data: user } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', property.posted_by)
        .single()

      if (user?.email) {
        await sendApprovalEmail(user, property)
      }
    }
  } catch (err) {
    console.error('[moderation] Unexpected error for property', propertyId, err)
  }
}

// ─── Approval email ───────────────────────────────────────────────────────────

async function sendApprovalEmail(user, property) {
  try {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'there'
    const title = property.seo_title || property.address || 'Your listing'
    const location = [property.city, property.state].filter(Boolean).join(', ')
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://deelmap.com'
    const listingUrl = `${baseUrl}/${property.slug || property.id}`

    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff">

      <!-- Header -->
      <tr>
        <td style="background:#ffffff;padding:12px 40px;text-align:center;border-bottom:2px solid #D03839">
          <img src="https://sellerportaldeelmap-production-bea8.up.railway.app/deelmap.png" alt="Deelmap" height="72" style="display:inline-block;height:72px;width:auto;border:0" />
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 40px 32px;background:#ffffff">

          <p style="margin:0 0 6px;font-size:14px;color:#737370">Hi ${name},</p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A1816;letter-spacing:-0.4px;line-height:1.25">Your listing is now live</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.65;color:#737370">
            Great news — your deal has passed our review and is now live on the Deelmap marketplace. Verified buyers can find and contact you about it.
          </p>

          <!-- Listing card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr>
              <td style="background:#FAFAF8;border:1px solid #E8E8E4;border-radius:4px;padding:20px 24px">
                <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:1.1px;text-transform:uppercase;color:#A8A8A4">Your listing</p>
                <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#1A1816;line-height:1.3">${title}</p>
                ${location ? `<p style="margin:0;font-size:13px;color:#737370">${location}</p>` : ''}
              </td>
            </tr>
          </table>

          <!-- Status badge -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr>
              <td style="background:#E4F5EC;border:1px solid #9FDBB8;border-radius:4px;padding:10px 16px">
                <p style="margin:0;font-size:13px;font-weight:600;color:#0F6E56">&#10003;&nbsp; Active — visible to all buyers on Deelmap</p>
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#D03839;border-radius:4px">
                <a href="${listingUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.1px">View your listing &rarr;</a>
              </td>
            </tr>
          </table>

          <p style="margin:28px 0 0;font-size:12px;color:#A8A8A4;line-height:1.6">
            You'll be notified when buyers reach out. Manage your listing any time from your <a href="${baseUrl}/buyer/listings" style="color:#D03839;text-decoration:none">dashboard</a>.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#ffffff;border-top:1px solid #E8E8E4;padding:20px 40px;text-align:center">
          <p style="margin:0;font-size:12px;color:#A8A8A4">© 2026 Deelmap. All rights reserved.</p>
        </td>
      </tr>

    </table>
  </td></tr></table>
</body></html>`

    const text = `Hi ${name},

Your listing is now live on Deelmap.

${title}${location ? ` · ${location}` : ''}

Your deal has passed our review and is now live on the marketplace. Verified buyers can find and contact you about it.

View your listing: ${listingUrl}

Manage your listings at: ${baseUrl}/buyer/listings

Thanks,
The Deelmap Team

© 2026 Deelmap. All rights reserved.`

    await resend.emails.send({
      from: 'Deelmap <noreply@deelmap.com>',
      to: [user.email],
      subject: 'Your listing is live on Deelmap',
      html,
      text,
    })

    console.log(`[moderation] Approval email sent to ${user.email}`)
  } catch (err) {
    console.error('[moderation] Failed to send approval email:', err)
  }
}
