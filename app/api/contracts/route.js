import { NextResponse } from 'next/server'
import { mapFieldValues, decorateTemplates } from '@/lib/contract-templates'
import { sendSigningEmail } from '@/lib/contract-emails'

const DOCUSEAL_BASE = 'https://api.docuseal.com'
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://deelmap.com').replace(/\/+$/, '')

function dsHeaders() {
  return { 'X-Auth-Token': process.env.DOCUSEAL_API_KEY, 'Content-Type': 'application/json' }
}

// Fetch the templates list with an 8s timeout + one retry on timeout/5xx. The
// list is effectively static (IDs hardcoded in TEMPLATE_CONFIG) so it's cached
// for 5 minutes — a transient DocuSeal hiccup shouldn't dead-end the wizard.
async function fetchTemplates() {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    try {
      const res = await fetch(`${DOCUSEAL_BASE}/templates?limit=50`, {
        headers: dsHeaders(),
        signal: controller.signal,
        next: { revalidate: 300 },
      })
      clearTimeout(timer)
      if (res.status >= 500) { if (attempt === 0) continue; throw new Error(`DocuSeal ${res.status}`) }
      if (!res.ok) throw new Error(`DocuSeal ${res.status}`)
      return res
    } catch (e) {
      clearTimeout(timer)
      if (attempt === 0) continue
      throw e
    }
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const type = searchParams.get('type')

  try {
    if (type === 'templates') {
      // Timeout + one retry so a transient DocuSeal failure surfaces as a real
      // error (non-200) the client can retry — not a permanent "no templates".
      let res
      try {
        res = await fetchTemplates()
      } catch {
        return NextResponse.json({ error: 'templates_unavailable' }, { status: 502 })
      }
      const json = await res.json()
      // Decorate with friendly labels + fieldMap from TEMPLATE_CONFIG so the
      // wizard can show "Purchase Contract" instead of "(A to B) DeelMap…"
      return NextResponse.json(decorateTemplates(json.data || []))
    }

    if (type === 'document') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const res = await fetch(`${DOCUSEAL_BASE}/submissions/${id}`, { headers: dsHeaders(), cache: 'no-store' })
      const json = await res.json()
      const url = json.documents?.[0]?.url || null
      return NextResponse.json({ url })
    }

    // Contracts where buyer is a submitter (seller sent to buyer) OR buyer created (acting as seller)
    const [subRes, createdRes] = await Promise.all([
      fetch(`${DOCUSEAL_BASE}/submissions?limit=100`, { headers: dsHeaders(), cache: 'no-store' }),
      fetch(`${DOCUSEAL_BASE}/submitters?application_key=buyer:${encodeURIComponent(email)}&limit=100`, { headers: dsHeaders(), cache: 'no-store' }),
    ])

    const allJson = await subRes.json()
    const createdJson = await createdRes.json()

    const allSubmissions = allJson.data || []
    const buyerCreatedIds = new Set((createdJson.data || []).map(s => s.submission_id))

    const seen = new Set()
    const submissions = allSubmissions.filter(s => {
      if (s.archived_at) return false
      const isBuyerSubmitter = s.submitters?.some(sub => sub.email?.toLowerCase() === email?.toLowerCase())
      const isBuyerCreated = buyerCreatedIds.has(s.id)
      if ((isBuyerSubmitter || isBuyerCreated) && !seen.has(s.id)) {
        seen.add(s.id)
        return true
      }
      return false
    })

    return NextResponse.json(submissions)
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}

/**
 * POST /api/contracts
 *
 * Creates a DocuSeal submission for a buyer-portal user acting as the
 * Seller/Assignor in a contract (e.g. they posted a deal to sell and got an
 * offer, now they're sending the contract to the counterparty).
 *
 * Payload mirrors the seller-portal API so the same wizard logic works in
 * both apps:
 *   sellerEmail / sellerName  → the logged-in user (First Party / Assignor)
 *   buyerEmail / buyerName    → the counterparty (Second Party / Assignee)
 *   property                  → property address (becomes submission name)
 *   templateId                → DocuSeal template id
 *   field_values              → wizard form fields; mapped via TEMPLATE_CONFIG
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      contractRole,
      sellerName, sellerEmail,
      buyerName, buyerEmail,
      coSellerEmail,
      property, templateId,
      field_values,
    } = body || {}
    // Optional co-seller: only a real (conditional) signer when both a name and
    // email are present. The name comes through field_values → seller2_print_name.
    const coSellerName = (field_values && field_values.co_seller_name) || ''
    const hasCoSeller = !!(coSellerName && coSellerEmail)

    if (!sellerEmail || !templateId || !buyerEmail) {
      return NextResponse.json({ error: 'sellerEmail, buyerEmail and templateId are required' }, { status: 400 })
    }

    // The Seller is always First Party and signs first. Nobody signs inline on
    // the portal — every party (seller → co-seller → buyer) receives an emailed
    // signing link, in order. The creator side just tags the submission.
    const creatorIsSeller = contractRole !== 'buyer'
    const creatorEmail = creatorIsSeller ? sellerEmail : buyerEmail

    // Map wizard field keys → DocuSeal field names (sale_price, assignment_fee, etc.)
    // and apply autoFields (today's date, seller name auto-fill).
    const today = new Date()
    const ctx = {
      sellerName: sellerName || sellerEmail,
      sellerEmail,
      buyerName: buyerName || buyerEmail,
      buyerEmail,
      today,
      todayISO: today.toISOString().slice(0, 10),
    }
    // Inject buyer_name from Step 3 so it lands in the contract's buyer/assignee field.
    const enrichedFieldValues = {
      ...(field_values || {}),
      buyer_name: (field_values && field_values.buyer_name) || buyerName || '',
    }
    const mappedValues = mapFieldValues(templateId, enrichedFieldValues, ctx)
    const hasValues = !!mappedValues && Object.keys(mappedValues).length > 0

    const assigneePlaceholder = `pending-${Date.now()}@noreply.deelmap.com`
    const coSellerPlaceholder = `pending-co-${Date.now()}@noreply.deelmap.com`

    const submitters = [
      {
        role: 'First Party',
        email: sellerEmail,
        name: sellerName || sellerEmail,
        // The seller always signs first. Suppress DocuSeal's own email — we send
        // our branded signing email below instead (no inline signing). The
        // co-seller and buyer are activated by the webhook in turn.
        send_email: false,
        // Tag the submission with the CREATOR's email so the portal list finds
        // contracts they created, regardless of which side they're on.
        application_key: `buyer:${creatorEmail}`,
        // assignee* = the buyer (activated after the sell side signs). coSeller*
        // = the optional second seller, activated right after First Party signs.
        metadata: {
          assigneeEmail: buyerEmail,
          assigneeName: buyerName || buyerEmail,
          ...(hasCoSeller ? { coSellerEmail, coSellerName } : {}),
        },
        ...(hasValues ? { values: mappedValues } : {}),
      },
      // Co-Seller signs second (Seller → Co-Seller → Buyer). Placeholder email +
      // send_email:false so they're not emailed until the webhook activates them
      // once First Party completes. Carries the buyer's email so the chain can
      // continue to the buyer after the co-seller signs.
      ...(hasCoSeller ? [{
        role: 'Co-Seller',
        email: coSellerPlaceholder,
        name: coSellerName,
        send_email: false,
        metadata: {
          assigneeEmail: buyerEmail,
          assigneeName: buyerName || buyerEmail,
        },
        ...(hasValues ? { values: mappedValues } : {}),
      }] : []),
      {
        role: 'Second Party',
        email: assigneePlaceholder,
        name: buyerName || buyerEmail,
        send_email: false,
        ...(hasValues ? { values: mappedValues } : {}),
      },
    ]

    const res = await fetch(`${DOCUSEAL_BASE}/submissions`, {
      method: 'POST',
      headers: dsHeaders(),
      body: JSON.stringify({
        template_id: Number(templateId),
        name: property || '',
        submitters,
      }),
    })

    const json = await res.json()
    if (!Array.isArray(json) || !json[0]) return NextResponse.json({ error: 'DocuSeal error' }, { status: 500 })

    const assignorSubmitter = json.find(s => s.role === 'First Party') || json[0]
    const coSellerSubmitter = json.find(s => s.role === 'Co-Seller')

    // PATCH metadata onto the submitters — DocuSeal ignores metadata in the
    // submission POST body, so we set it after creation. First Party carries the
    // co-seller (next) + buyer (final) info; the Co-Seller carries the buyer info.
    await fetch(`${DOCUSEAL_BASE}/submitters/${assignorSubmitter.id}`, {
      method: 'PATCH',
      headers: dsHeaders(),
      body: JSON.stringify({
        metadata: {
          assigneeEmail: buyerEmail,
          assigneeName: buyerName || buyerEmail,
          ...(hasCoSeller ? { coSellerEmail, coSellerName } : {}),
        },
      }),
    })
    if (coSellerSubmitter?.id) {
      await fetch(`${DOCUSEAL_BASE}/submitters/${coSellerSubmitter.id}`, {
        method: 'PATCH',
        headers: dsHeaders(),
        body: JSON.stringify({
          metadata: {
            assigneeEmail: buyerEmail,
            assigneeName: buyerName || buyerEmail,
          },
        }),
      })
    }

    // Email the seller our branded signing link (DocuSeal's own email is
    // suppressed). The co-seller and buyer get the same branded email from the
    // webhook as the chain advances.
    try {
      await sendSigningEmail({
        to: sellerEmail,
        signerName: sellerName || sellerEmail,
        property: property || '',
        signingUrl: `${APP_URL}/sign/${assignorSubmitter.slug}`,
        leadLine: 'A contract is ready for your signature. Please review and sign below — once you sign, it moves to the next party automatically.',
      })
    } catch (e) {
      console.error('[contracts] first-signer email failed:', e?.message || e)
    }

    return NextResponse.json({
      submission_id: assignorSubmitter.submission_id,
      assignor_slug: assignorSubmitter.slug,
      // No inline signing — the seller is emailed the signing link, then the
      // co-seller and buyer in turn via the webhook chain.
      firstSignerName: sellerName || sellerEmail,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { id, email } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Ownership check (mirrors GET): the caller may only delete a contract they are
    // a submitter on OR that they created. Without this, anyone could delete any
    // contract — including signed legal docs — just by guessing the id.
    const [subRes, createdRes] = await Promise.all([
      fetch(`${DOCUSEAL_BASE}/submissions/${id}`, { headers: dsHeaders(), cache: 'no-store' }),
      fetch(`${DOCUSEAL_BASE}/submitters?application_key=buyer:${encodeURIComponent(email)}&limit=100`, { headers: dsHeaders(), cache: 'no-store' }),
    ])
    if (!subRes.ok) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    const submission = await subRes.json()
    const createdJson = await createdRes.json()

    const isSubmitter = submission.submitters?.some(s => s.email?.toLowerCase() === email.toLowerCase())
    const createdIds = new Set((createdJson.data || []).map(s => String(s.submission_id)))
    const isCreator = createdIds.has(String(id))
    if (!isSubmitter && !isCreator) {
      return NextResponse.json({ error: 'Not authorized to delete this contract' }, { status: 403 })
    }

    const res = await fetch(`${DOCUSEAL_BASE}/submissions/${id}`, { method: 'DELETE', headers: dsHeaders() })
    if (!res.ok) return NextResponse.json({ error: 'Failed to delete' }, { status: res.status })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
