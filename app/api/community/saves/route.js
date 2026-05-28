import { NextResponse } from 'next/server'
import { getServiceClient, getUserIdFromRequest, unauthorized, badRequest, serverError } from '@/lib/community/auth'

// GET — list of posts the current user has saved (most recent first).
// Returns the same shape as /api/community/posts so PostCard can render directly.
export async function GET(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'profile_required' }, { status: 409 })

  const { data: saves, error: savesErr } = await supabase
    .from('community_saves')
    .select('post_id, saved_at')
    .eq('profile_id', profile.id)
    .order('saved_at', { ascending: false })
    .limit(200)
  if (savesErr) return serverError(savesErr.message)
  if (!saves?.length) return NextResponse.json({ posts: [] })

  const postIds = saves.map(s => s.post_id)

  const { data: posts, error: postsErr } = await supabase
    .from('community_posts')
    .select(`
      id, slug, title, body, score, comment_count, market_tag,
      is_pinned, created_at,
      property_id, wholesale_deal_id,
      author:community_profiles!community_posts_author_id_fkey(id, handle, display_name, avatar_url, equity_score, role_badge),
      lot:community_lots!community_posts_lot_id_fkey(id, slug, name, category, accent_color)
    `)
    .eq('is_removed', false)
    .in('id', postIds)
  if (postsErr) return serverError(postsErr.message)

  // Hydrate linked deals (polymorphic: property vs wholesale_deal)
  const propertyIds = posts.filter(p => p.property_id).map(p => p.property_id)
  const wholesaleIds = posts.filter(p => p.wholesale_deal_id).map(p => p.wholesale_deal_id)

  const [propsRes, wholesaleRes] = await Promise.all([
    propertyIds.length
      ? supabase.from('properties').select('id, slug, address, price, bedrooms, bathrooms, floor_area').in('id', propertyIds)
      : Promise.resolve({ data: [] }),
    wholesaleIds.length
      ? supabase.from('wholesale_deals').select('id, slug, address, price, bedrooms, bathrooms, sqft, property_type').in('id', wholesaleIds)
      : Promise.resolve({ data: [] }),
  ])

  const propMap = Object.fromEntries((propsRes.data || []).map(p => [p.id, p]))
  const wholesaleMap = Object.fromEntries((wholesaleRes.data || []).map(w => [w.id, w]))

  // User's votes on these posts
  const { data: votes } = await supabase
    .from('community_votes')
    .select('target_id, value')
    .eq('profile_id', profile.id)
    .eq('target_type', 'post')
    .in('target_id', postIds)
  const voteMap = Object.fromEntries((votes || []).map(v => [v.target_id, v.value]))

  // Preserve save order (newest first)
  const saveOrder = new Map(saves.map((s, i) => [s.post_id, i]))

  const hydrated = (posts || [])
    .map(p => {
      const deal = p.property_id ? propMap[p.property_id]
                 : p.wholesale_deal_id ? wholesaleMap[p.wholesale_deal_id]
                 : null
      return {
        id: p.id, slug: p.slug, title: p.title, body: p.body,
        score: p.score, comment_count: p.comment_count, market_tag: p.market_tag,
        is_pinned: p.is_pinned, created_at: p.created_at,
        author: p.author,
        lot: p.lot,
        deal: deal ? formatDeal(deal, p.property_id ? 'property' : 'wholesale_deal') : null,
        user_vote: voteMap[p.id] || 0,
        is_saved: true,
        saved_at: saves.find(s => s.post_id === p.id)?.saved_at,
      }
    })
    .sort((a, b) => (saveOrder.get(a.id) ?? 0) - (saveOrder.get(b.id) ?? 0))

  return NextResponse.json({ posts: hydrated })
}

function formatDeal(d, kind) {
  if (!d) return null
  return {
    kind, id: d.id, slug: d.slug, address: d.address,
    price: d.price ? `$${Number(d.price).toLocaleString()}` : null,
    beds: (d.bedrooms != null && d.bathrooms != null) ? `${d.bedrooms}bd/${d.bathrooms}ba` : null,
    sqft: (d.sqft || d.floor_area) ? `${(d.sqft || d.floor_area).toLocaleString()} sqft` : null,
    type: d.property_type || 'Property',
    live: true,
  }
}

// POST { post_id } — bookmark a post
export async function POST(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  let body
  try { body = await request.json() } catch { return badRequest('Invalid JSON.') }
  const postId = body?.post_id
  if (!postId) return badRequest('post_id required.')

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'profile_required' }, { status: 409 })

  const { error } = await supabase
    .from('community_saves')
    .upsert({ profile_id: profile.id, post_id: postId }, { onConflict: 'profile_id,post_id' })
  if (error) return serverError(error.message)

  return NextResponse.json({ ok: true, saved: true })
}

// DELETE ?post_id=... — remove bookmark
export async function DELETE(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()
  const postId = new URL(request.url).searchParams.get('post_id')
  if (!postId) return badRequest('post_id required.')

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'profile_required' }, { status: 409 })

  const { error } = await supabase
    .from('community_saves')
    .delete()
    .eq('profile_id', profile.id)
    .eq('post_id', postId)
  if (error) return serverError(error.message)

  return NextResponse.json({ ok: true, saved: false })
}
