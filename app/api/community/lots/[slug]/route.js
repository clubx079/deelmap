import { NextResponse } from 'next/server'
import { getServiceClient, getUserIdFromRequest, notFound, serverError } from '@/lib/community/auth'

// GET — single lot detail (with subscription state + top contributors)
export async function GET(request, { params }) {
  const { slug } = await params
  const supabase = getServiceClient()
  const userId = getUserIdFromRequest(request)

  const { data: lot, error } = await supabase
    .from('community_lots')
    .select('id, slug, name, category, accent_color, description, post_count, member_count, min_equity_to_post, created_at')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) return serverError(error.message)
  if (!lot) return notFound('Lot not found.')

  // Top contributors in this lot (top 5 by post count, last 90 days)
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString()
  const { data: postRows } = await supabase
    .from('community_posts')
    .select('author_id')
    .eq('lot_id', lot.id)
    .eq('is_removed', false)
    .gte('created_at', since)
    .limit(500)

  const tally = {}
  for (const r of postRows || []) {
    if (r.author_id) tally[r.author_id] = (tally[r.author_id] || 0) + 1
  }
  const topIds = Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  let topContributors = []
  if (topIds.length) {
    const { data: profs } = await supabase
      .from('community_profiles')
      .select('id, handle, display_name, avatar_url, equity_score, role_badge')
      .in('id', topIds)
    topContributors = (profs || []).map(p => ({
      ...p,
      post_count: tally[p.id] || 0,
    })).sort((a, b) => b.post_count - a.post_count)
  }

  // Is current user subscribed?
  let isSubscribed = false
  let canPost = true
  let userEquity = null
  if (userId) {
    const { data: profile } = await supabase
      .from('community_profiles').select('id, equity_score').eq('user_id', userId).maybeSingle()
    if (profile) {
      userEquity = profile.equity_score || 0
      canPost = (profile.equity_score || 0) >= (lot.min_equity_to_post || 0)
      const { data: sub } = await supabase
        .from('community_lot_subscriptions')
        .select('lot_id')
        .eq('profile_id', profile.id)
        .eq('lot_id', lot.id)
        .maybeSingle()
      isSubscribed = !!sub
    }
  }

  return NextResponse.json({
    lot: {
      ...lot,
      is_subscribed: isSubscribed,
      can_post: canPost,
      user_equity: userEquity,
    },
    top_contributors: topContributors,
  })
}
