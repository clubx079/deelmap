import { NextResponse } from 'next/server'
import { getServiceClient, getUserIdFromRequest, notFound, serverError, publicProfile } from '@/lib/community/auth'

// GET — public profile by handle.  Read-only.  Privacy-walled: never returns user_id.
export async function GET(request, { params }) {
  const { handle } = await params
  const supabase = getServiceClient()
  const viewerUserId = getUserIdFromRequest(request)

  const lowerHandle = String(handle || '').toLowerCase().trim()
  if (!lowerHandle) return notFound('Profile not found.')

  const { data, error } = await supabase
    .from('community_profiles')
    .select('id, handle, display_name, bio, avatar_url, equity_score, tier_id, role_badge, is_moderator, created_at')
    .eq('handle', lowerHandle)
    .eq('is_shadowbanned', false)
    .maybeSingle()

  if (error) return serverError(error.message)
  if (!data) return notFound('Profile not found.')

  // Tier
  const { data: tier } = await supabase
    .from('community_tiers')
    .select('id, slug, name, min_equity')
    .eq('id', data.tier_id || -1)
    .maybeSingle()

  // Viewer relationships: am I this user? Have I blocked them? Have they blocked me?
  let isSelf = false
  let isBlocked = false
  let isBlockedBy = false
  if (viewerUserId) {
    const { data: viewer } = await supabase
      .from('community_profiles').select('id').eq('user_id', viewerUserId).maybeSingle()
    if (viewer) {
      isSelf = viewer.id === data.id
      if (!isSelf) {
        const [{ data: bRow }, { data: byRow }] = await Promise.all([
          supabase.from('community_blocks').select('blocker_id').eq('blocker_id', viewer.id).eq('blocked_id', data.id).maybeSingle(),
          supabase.from('community_blocks').select('blocker_id').eq('blocker_id', data.id).eq('blocked_id', viewer.id).maybeSingle(),
        ])
        isBlocked = !!bRow
        isBlockedBy = !!byRow
      }
    }
  }

  // Stats: post count + comment count (in last 365 days for relevance)
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString()
  const [{ count: postCount }, { count: commentCount }] = await Promise.all([
    supabase.from('community_posts').select('id', { count: 'exact', head: true })
      .eq('author_id', data.id).eq('is_removed', false).gte('created_at', since),
    supabase.from('community_comments').select('id', { count: 'exact', head: true })
      .eq('author_id', data.id).eq('is_removed', false).gte('created_at', since),
  ])

  // Recent posts (hide from viewer if they're blocked or have blocked the user)
  let recentPosts = []
  if (!isBlocked && !isBlockedBy) {
    const { data: posts } = await supabase
      .from('community_posts')
      .select(`
        id, slug, title, body, score, comment_count, market_tag, created_at,
        property_id, wholesale_deal_id,
        author:community_profiles!community_posts_author_id_fkey(id, handle, display_name, avatar_url, equity_score, role_badge),
        lot:community_lots!community_posts_lot_id_fkey(id, slug, name, category, accent_color)
      `)
      .eq('author_id', data.id)
      .eq('is_removed', false)
      .order('created_at', { ascending: false })
      .limit(20)

    recentPosts = (posts || []).map(p => ({
      id: p.id, slug: p.slug, title: p.title, body: p.body,
      score: p.score, comment_count: p.comment_count, market_tag: p.market_tag,
      created_at: p.created_at, author: p.author, lot: p.lot,
      deal: null, // we skip deal hydration here to keep the public payload light
      user_vote: 0, is_saved: false,
    }))
  }

  return NextResponse.json({
    profile: {
      ...publicProfile(data),
      bio: data.bio || null,
      created_at: data.created_at,
    },
    tier: tier || null,
    stats: {
      post_count: postCount || 0,
      comment_count: commentCount || 0,
    },
    viewer: {
      is_self: isSelf,
      is_blocked: isBlocked,
      is_blocked_by: isBlockedBy,
    },
    recent_posts: recentPosts,
  })
}
