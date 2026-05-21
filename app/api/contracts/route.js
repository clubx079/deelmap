import { NextResponse } from 'next/server'

const DOCUSEAL_BASE = 'https://api.docuseal.com'

function headers() {
  return { 'X-Auth-Token': process.env.DOCUSEAL_API_KEY, 'Content-Type': 'application/json' }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const type = searchParams.get('type')

  try {
    if (type === 'templates') {
      const res = await fetch(`${DOCUSEAL_BASE}/templates?limit=50`, { headers: headers(), cache: 'no-store' })
      const json = await res.json()
      return NextResponse.json(json.data || [])
    }

    if (type === 'document') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const res = await fetch(`${DOCUSEAL_BASE}/submissions/${id}`, { headers: headers(), cache: 'no-store' })
      const json = await res.json()
      const url = json.documents?.[0]?.url || null
      return NextResponse.json({ url })
    }

    // Contracts where buyer is a submitter (seller sent to buyer)
    const [subRes, createdRes, allRes] = await Promise.all([
      // submitters filtered by buyer email
      fetch(`${DOCUSEAL_BASE}/submissions?limit=100`, { headers: headers(), cache: 'no-store' }),
      // submissions buyer created (application_key = "buyer:email")
      fetch(`${DOCUSEAL_BASE}/submitters?application_key=buyer:${encodeURIComponent(email)}&limit=100`, { headers: headers(), cache: 'no-store' }),
      Promise.resolve(null),
    ])

    const allJson = await subRes.json()
    const createdJson = await createdRes.json()

    const allSubmissions = allJson.data || []
    const buyerCreatedIds = new Set((createdJson.data || []).map(s => s.submission_id))

    // Combine: contracts where buyer is a submitter OR buyer created it
    const seen = new Set()
    const submissions = allSubmissions.filter(s => {
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

export async function POST(request) {
  try {
    const { sellerName, sellerEmail, property, buyerEmail, buyerName, templateId } = await request.json()

    if (!sellerEmail || !templateId || !buyerEmail) {
      return NextResponse.json({ error: 'sellerEmail, buyerEmail and templateId are required' }, { status: 400 })
    }

    const assigneePlaceholder = `pending-${Date.now()}@noreply.deelmap.com`

    const res = await fetch(`${DOCUSEAL_BASE}/submissions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        template_id: Number(templateId),
        name: property || '',
        metadata: {
          assigneeEmail: sellerEmail,
          assigneeName: sellerName || sellerEmail,
        },
        submitters: [
          {
            role: 'Assignor',
            email: buyerEmail,
            name: buyerName || buyerEmail,
            send_email: false,
            application_key: `buyer:${buyerEmail}`,
          },
          {
            role: 'Assignee',
            email: assigneePlaceholder,
            name: sellerName || sellerEmail,
            send_email: false,
          },
        ],
      }),
    })

    const json = await res.json()
    if (!Array.isArray(json) || !json[0]) return NextResponse.json({ error: 'DocuSeal error' }, { status: 500 })

    const assignorSubmitter = json.find(s => s.role === 'Assignor') || json[0]
    return NextResponse.json({ submission_id: assignorSubmitter.submission_id, assignor_slug: assignorSubmitter.slug })
  } catch {
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 })
  }
}
