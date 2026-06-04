import { NextResponse } from 'next/server'
import { mapFieldValues, decorateTemplates } from '@/lib/contract-templates'

const DOCUSEAL_BASE = 'https://api.docuseal.com'

function dsHeaders() {
  return { 'X-Auth-Token': process.env.DOCUSEAL_API_KEY, 'Content-Type': 'application/json' }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const type = searchParams.get('type')

  try {
    if (type === 'templates') {
      const res = await fetch(`${DOCUSEAL_BASE}/templates?limit=50`, { headers: dsHeaders(), cache: 'no-store' })
      const json = await res.json()
      // Decorate with friendly labels + fieldMap from TEMPLATE_CONFIG so the
      // wizard can show "Purchase Contract" instead of "(A to B) Deelmap…"
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
      property, templateId,
      field_values,
    } = body || {}

    if (!sellerEmail || !templateId || !buyerEmail) {
      return NextResponse.json({ error: 'sellerEmail, buyerEmail and templateId are required' }, { status: 400 })
    }

    // The Seller is always First Party (signs first). The creator may be on
    // either side: if they're the Seller they sign inline now; if they're the
    // Buyer, the Seller (counterparty) is emailed to sign first and the creator
    // signs after. Default to seller for backward-compatibility.
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

    const submitters = [
      {
        role: 'First Party',
        email: sellerEmail,
        name: sellerName || sellerEmail,
        // When the creator is the Seller they sign inline (no email). When the
        // creator is the Buyer, email the Seller so they can sign first.
        send_email: !creatorIsSeller,
        // Tag the submission with the CREATOR's email so the portal list finds
        // contracts they created, regardless of which side they're on.
        application_key: `buyer:${creatorEmail}`,
        metadata: {
          assigneeEmail: buyerEmail,
          assigneeName: buyerName || buyerEmail,
        },
        ...(hasValues ? { values: mappedValues } : {}),
      },
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

    // PATCH metadata onto the submitter — DocuSeal ignores metadata in the
    // submission POST body, so we set it after creation.
    await fetch(`${DOCUSEAL_BASE}/submitters/${assignorSubmitter.id}`, {
      method: 'PATCH',
      headers: dsHeaders(),
      body: JSON.stringify({
        metadata: {
          assigneeEmail: buyerEmail,
          assigneeName: buyerName || buyerEmail,
        },
      }),
    })

    return NextResponse.json({
      submission_id: assignorSubmitter.submission_id,
      assignor_slug: assignorSubmitter.slug,
      // Creator signs inline only when they're the Seller (First Party). When the
      // creator is the Buyer, no embed — the Seller is emailed to sign first.
      ...(creatorIsSeller
        ? { embed_src: assignorSubmitter.embed_src }
        : { firstSignerName: sellerName || sellerEmail }),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const res = await fetch(`${DOCUSEAL_BASE}/submissions/${id}`, { method: 'DELETE', headers: dsHeaders() })
    if (!res.ok) return NextResponse.json({ error: 'Failed to delete' }, { status: res.status })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
