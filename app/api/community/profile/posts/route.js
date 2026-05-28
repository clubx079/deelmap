import { NextResponse } from 'next/server'
import { getServiceClient, getUserIdFromRequest, unauthorized, serverError } from '@/lib/community/auth'

// GET — the current user's own post history (newest first).
// Returns the same shape as /api/community/posts so PostCard can render directly.
export async function GET(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ posts: [] })

  const { data: posts, error } = await supabase
    .from('community_posts')
    .select(`
      id, slug, title, body, score, comment_count, market_tag,
      is_pinned, is_removed, created_at,
      property_id, wholesale_deal_id,
      author:community_profiles!community_posts_author_id_fkey(id, handle, display_name, avatar_url, equity_score, role_badge),
      lot:community_lots!community_posts_lot_id_fkey(id, slug, name, category, accent_color)
    `)
    .eq('author_id', profile.id)
    .eq('is_removed', false)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return serverError(error.message)
  if (!posts?.length) return NextResponse.json({ posts: [] })

  // Hydrate linked deals
  const postIds = posts.map(p => p.id)
  const propertyIds = posts.filter(p => p.property_id).map(p => p.property_id)
  const wholesaleIds = posts.filter(p => p.wholesale_deal_id).map(p => p.wholesale_deal_id)

  const [propsRes, wholesaleRes, votesRes, savesRes] = await Promise.all([
    propertyIds.length
      ? supabase.from('properties').select('id, slug, address, price, bedrooms, bathrooms, floor_area').in('id', propertyIds)
      : Promise.resolve({ data: [] }),
    wholesaleIds.length
      ? supabase.from('wholesale_deals').select('id, slug, address, price, bedrooms, bathrooms, sqft, property_type').in('id', wholesaleIds)
      : Promise.resolve({ data: [] }),
    supabase.from('community_votes')
      .select('target_id, value')
      .eq('profile_id', profile.id)
      .eq('target_type', 'post')
      .in('target_id', postIds),
    supabase.from('community_saves')
      .select('post_id')
      .eq('profile_id', profile.id)
      .in('post_id', postIds),
  ])

  const propMap = Object.fromEntries((propsRes.data || []).map(p => [p.id, p]))
  const wholesaleMap = Object.fromEntries((wholesaleRes.data || []).map(w => [w.id, w]))
  const voteMap = Object.fromEntries((votesRes.data || []).map(v => [v.target_id, v.value]))
  const saveSet = new Set((savesRes.data || []).map(s => s.post_id))

  const hydrated = posts.map(p => {
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
      is_saved: saveSet.has(p.id),
    }
  })

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
