import { NextResponse } from 'next/server'
import { getServiceClient, getUserIdFromRequest, notFound, serverError } from '@/lib/community/auth'

// GET — single post with its comment tree
export async function GET(request, { params }) {
  const { slug } = await params
  const supabase = getServiceClient()
  const userId = getUserIdFromRequest(request)

  const { data: post, error } = await supabase
    .from('community_posts')
    .select(`
      id, slug, title, body, score, comment_count, market_tag,
      is_pinned, is_locked, created_at, updated_at,
      property_id, wholesale_deal_id, lot_id,
      author:community_profiles!community_posts_author_id_fkey(id, handle, display_name, avatar_url, equity_score, role_badge),
      lot:community_lots!community_posts_lot_id_fkey(id, slug, name, category, accent_color, post_count, member_count, description)
    `)
    .eq('slug', slug)
    .eq('is_removed', false)
    .maybeSingle()

  if (error) return serverError(error.message)
  if (!post) return notFound('Post not found.')

  // Related posts from the same lot (exclude current, prefer hot, fall back to recent)
  const { data: relatedRaw } = await supabase
    .from('community_posts')
    .select('id, slug, title, score, comment_count, created_at')
    .eq('lot_id', post.lot_id)
    .eq('is_removed', false)
    .neq('id', post.id)
    .order('hot_score', { ascending: false })
    .limit(5)
  const related = relatedRaw || []

  // Linked deal
  let deal = null
  if (post.property_id) {
    const { data } = await supabase.from('properties')
      .select('id, slug, address, price, bedrooms, bathrooms, floor_area, property_status')
      .eq('id', post.property_id).maybeSingle()
    if (data) deal = formatDeal(data, 'property')
  } else if (post.wholesale_deal_id) {
    const { data } = await supabase.from('wholesale_deals')
      .select('id, slug, address, price, bedrooms, bathrooms, sqft, property_type, status')
      .eq('id', post.wholesale_deal_id).maybeSingle()
    if (data) deal = formatDeal(data, 'wholesale_deal')
  }

  // Comments — full tree, ordered by ltree path then score
  const { data: comments } = await supabase
    .from('community_comments')
    .select(`
      id, parent_id, body, score, depth, path, created_at, is_removed,
      author:community_profiles!community_comments_author_id_fkey(id, handle, display_name, avatar_url, role_badge)
    `)
    .eq('post_id', post.id)
    .order('path', { ascending: true })

  // Viewer vote / save state
  let userVotePost = 0, isSaved = false, commentVotes = {}
  if (userId) {
    const { data: profile } = await supabase
      .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
    if (profile?.id) {
      const commentIds = (comments || []).map(c => c.id)
      const [postVoteRes, saveRes, commentVoteRes] = await Promise.all([
        supabase.from('community_votes').select('value')
          .eq('profile_id', profile.id).eq('target_type', 'post').eq('target_id', post.id).maybeSingle(),
        supabase.from('community_saves').select('post_id')
          .eq('profile_id', profile.id).eq('post_id', post.id).maybeSingle(),
        commentIds.length ? supabase.from('community_votes').select('target_id, value')
          .eq('profile_id', profile.id).eq('target_type', 'comment').in('target_id', commentIds)
          : Promise.resolve({ data: [] }),
      ])
      userVotePost = postVoteRes.data?.value || 0
      isSaved = !!saveRes.data
      commentVotes = Object.fromEntries((commentVoteRes.data || []).map(v => [v.target_id, v.value]))
    }
  }

  const hydratedComments = (comments || []).map(c => ({
    id: c.id,
    parent_id: c.parent_id,
    body: c.is_removed ? '[removed]' : c.body,
    score: c.score,
    depth: c.depth,
    created_at: c.created_at,
    is_removed: c.is_removed,
    author: c.is_removed ? null : c.author,
    user_vote: commentVotes[c.id] || 0,
  }))

  return NextResponse.json({
    post: { ...post, deal, user_vote: userVotePost, is_saved: isSaved, property_id: undefined, wholesale_deal_id: undefined, lot_id: undefined },
    comments: hydratedComments,
    related_posts: related,
  })
}

function formatDeal(d, kind) {
  return {
    kind,
    id: d.id,           // UUID fallback for /[slug] route when slug is null
    slug: d.slug,
    address: d.address,
    price: d.price ? `$${Number(d.price).toLocaleString()}` : null,
    beds: (d.bedrooms != null && d.bathrooms != null) ? `${d.bedrooms}bd/${d.bathrooms}ba` : null,
    sqft: (d.sqft || d.floor_area) ? `${(d.sqft || d.floor_area).toLocaleString()} sqft` : null,
    type: d.property_type || 'Property',
    status: d.status || d.property_status || null,
    live: (d.status || d.property_status) !== 'sold',
  }
}
