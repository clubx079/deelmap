import { NextResponse } from 'next/server'
import { signDownload } from '@/lib/contractDownload'

const DOCUSEAL_BASE = 'https://api.docuseal.com'

// GET /api/contracts/download?id=<submissionId>&t=<token>
// A DeelMap-branded link that streams the executed contract PDF — the email
// links here instead of exposing a raw DocuSeal/S3 URL. The token gates access.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const t = searchParams.get('t')
  if (!id || !t || t !== signDownload(id)) {
    return new NextResponse('This download link is invalid or has expired.', { status: 403 })
  }
  try {
    const res = await fetch(`${DOCUSEAL_BASE}/submissions/${id}`, {
      headers: { 'X-Auth-Token': process.env.DOCUSEAL_API_KEY },
      cache: 'no-store',
    })
    const json = await res.json()
    const url = json.combined_document_url || json.documents?.[0]?.url || null
    if (!url) return new NextResponse('The signed document is not ready yet — please try again in a moment.', { status: 404 })

    const pdf = await fetch(url, { cache: 'no-store' })
    if (!pdf.ok) return new NextResponse('Could not retrieve the document.', { status: 502 })
    const buf = await pdf.arrayBuffer()
    const name = (json.name || 'contract').replace(/[^a-z0-9\-_ ]/gi, '').trim().slice(0, 80) || 'contract'

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${name}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return new NextResponse('Something went wrong fetching the document.', { status: 500 })
  }
}
