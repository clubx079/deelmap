import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'DeelMap Community'

async function getPost(slug) {
  try {
    const url = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL
    const key = process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    const q = `${url}/rest/v1/community_posts?slug=eq.${encodeURIComponent(slug)}&is_removed=eq.false` +
      `&select=title,score,comment_count,author:community_profiles!community_posts_author_id_fkey(handle),lot:community_lots!community_posts_lot_id_fkey(name)&limit=1`
    const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    if (!res.ok) return null
    const rows = await res.json()
    return rows?.[0] || null
  } catch { return null }
}

export default async function Image({ params }) {
  const { slug } = await params
  const post = await getPost(slug)

  const title = post?.title || 'DeelMap Community'
  const handle = post?.author?.handle ? `@${post.author.handle}` : null
  const lot = post?.lot?.name || null
  const sub = [handle, lot].filter(Boolean).join('  ·  ')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', backgroundColor: '#1A1816', padding: '70px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#D03839', marginRight: 18 }} />
          <div style={{ color: '#FFFFFF', fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }}>DeelMap</div>
          <div style={{ color: '#8A8A86', fontSize: 26, fontWeight: 600, marginLeft: 14 }}>Community</div>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex', color: '#FFFFFF', fontSize: title.length > 80 ? 56 : 68,
            fontWeight: 800, lineHeight: 1.12, letterSpacing: -1.5, maxHeight: 340, overflow: 'hidden',
          }}
        >
          {title.length > 150 ? `${title.slice(0, 149)}…` : title}
        </div>

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', color: '#C9C9C5', fontSize: 30, fontWeight: 600 }}>
            {sub || 'Wholesale real-estate discussions'}
          </div>
          {post && (
            <div style={{ display: 'flex', color: '#8A8A86', fontSize: 26, fontWeight: 600 }}>
              {(post.score ?? 0)} Equity  ·  {(post.comment_count ?? 0)} replies
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  )
}
