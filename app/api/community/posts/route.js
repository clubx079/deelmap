import { NextResponse } from 'next/server'
import {
  getServiceClient,
  getUserIdFromRequest,
  unauthorized,
  badRequest,
  serverError,
  slugifyTitle,
} from '@/lib/community/auth'
import { emailNewLotPost } from '@/lib/community/emailNotify'

const PAGE_SIZE = 20

// GET — feed. Query params:
//   sort   = hot | new | top | rising (rising = new with score > 0)
//   lot    = lot slug (filter to one lot)
//   deal   = '1' to only show posts that link to a deal
//   cursor = ISO timestamp for keyset pagination (created_at < cursor)
export async function GET(request) {
  const supabase = getServiceClient()
  const url = new URL(request.url)
  const sort = url.searchParams.get('sort') || 'hot'
  const lotSlug = url.searchParams.get('lot')
  const dealOnly = url.searchParams.get('deal') === '1'
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0)
  const userId = getUserIdFromRequest(request)

  // Viewer-relative filters: hidden posts + blocked authors
  let hiddenPostIds = []
  let blockedAuthorIds = []
  if (userId) {
    const { data: viewerProfile } = await supabase
      .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
    if (viewerProfile?.id) {
      const [hidesRes, blocksRes, blockedByRes] = await Promise.all([
        supabase.from('community_post_hides').select('post_id').eq('profile_id', viewerProfile.id),
        supabase.from('community_blocks').select('blocked_id').eq('blocker_id', viewerProfile.id),
        supabase.from('community_blocks').select('blocker_id').eq('blocked_id', viewerProfile.id),
      ])
      hiddenPostIds = (hidesRes.data || []).map(h => h.post_id)
      // Symmetric: hide content from anyone I've blocked OR who has blocked me
      blockedAuthorIds = [
        ...(blocksRes.data || []).map(b => b.blocked_id),
        ...(blockedByRes.data || []).map(b => b.blocker_id),
      ]
    }
  }

  let q = supabase
    .from('community_posts')
    .select(`
      id, slug, title, body, score, hot_score, comment_count, market_tag,
      is_pinned, created_at,
      property_id, wholesale_deal_id,
      author:community_profiles!community_posts_author_id_fkey(id, handle, display_name, avatar_url, equity_score, role_badge),
      lot:community_lots!community_posts_lot_id_fkey(id, slug, name, category, accent_color)
    `)
    .eq('is_removed', false)
    .range(offset, offset + PAGE_SIZE - 1)

  if (hiddenPostIds.length) {
    q = q.not('id', 'in', `(${hiddenPostIds.map(id => `"${id}"`).join(',')})`)
  }
  if (blockedAuthorIds.length) {
    q = q.not('author_id', 'in', `(${blockedAuthorIds.map(id => `"${id}"`).join(',')})`)
  }

  if (lotSlug) {
    const { data: lotRow } = await supabase
      .from('community_lots').select('id').eq('slug', lotSlug).maybeSingle()
    if (lotRow?.id) q = q.eq('lot_id', lotRow.id)
  }
  if (dealOnly) {
    q = q.or('property_id.not.is.null,wholesale_deal_id.not.is.null')
  }

  switch (sort) {
    case 'new':    q = q.order('is_pinned', { ascending: false }).order('created_at', { ascending: false }); break
    case 'top':    q = q.order('is_pinned', { ascending: false }).order('score',      { ascending: false }); break
    case 'rising': q = q.order('is_pinned', { ascending: false }).order('hot_score',  { ascending: false }).gt('score', 0); break
    default:       q = q.order('is_pinned', { ascending: false }).order('hot_score',  { ascending: false })
  }

  const { data: posts, error } = await q
  if (error) return serverError(error.message)

  // Hydrate linked deals + top comments + viewer's votes
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

  // Top comment per post (highest-scored, depth 0)
  const postIds = posts.map(p => p.id)
  let topComments = []
  if (postIds.length) {
    const { data } = await supabase
      .from('community_comments')
      .select(`
        post_id, id, body, score, created_at,
        author:community_profiles!community_comments_author_id_fkey(handle, role_badge)
      `)
      .in('post_id', postIds)
      .eq('depth', 0)
      .eq('is_removed', false)
      .order('score', { ascending: false })
    // pick first per post_id
    const seen = new Set()
    topComments = (data || []).filter(c => seen.has(c.post_id) ? false : (seen.add(c.post_id), true))
  }
  const topByPost = Object.fromEntries(topComments.map(c => [c.post_id, c]))

  // Viewer votes + saves
  let voteMap = {}, saveSet = new Set()
  if (userId && postIds.length) {
    const { data: profile } = await supabase
      .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
    if (profile?.id) {
      const [votesRes, savesRes] = await Promise.all([
        supabase.from('community_votes').select('target_id, value')
          .eq('profile_id', profile.id).eq('target_type', 'post').in('target_id', postIds),
        supabase.from('community_saves').select('post_id')
          .eq('profile_id', profile.id).in('post_id', postIds),
      ])
      voteMap = Object.fromEntries((votesRes.data || []).map(v => [v.target_id, v.value]))
      saveSet = new Set((savesRes.data || []).map(s => s.post_id))
    }
  }

  const hydrated = posts.map(p => {
    const deal = p.property_id ? propMap[p.property_id] : p.wholesale_deal_id ? wholesaleMap[p.wholesale_deal_id] : null
    return {
      id: p.id, slug: p.slug, title: p.title, body: p.body,
      score: p.score, comment_count: p.comment_count, market_tag: p.market_tag,
      is_pinned: p.is_pinned, created_at: p.created_at,
      author: p.author,
      lot: p.lot,
      deal: deal ? formatDeal(deal, p.property_id ? 'property' : 'wholesale_deal') : null,
      top_comment: topByPost[p.id] ? {
        body: topByPost[p.id].body,
        author: topByPost[p.id].author,
      } : null,
      user_vote: voteMap[p.id] || 0,
      is_saved: saveSet.has(p.id),
    }
  })

  return NextResponse.json({ posts: hydrated, has_more: posts.length === PAGE_SIZE })
}

function formatDeal(d, kind) {
  if (!d) return null
  return {
    kind,
    id: d.id,           // UUID fallback for /[slug] route when slug is null
    slug: d.slug,
    address: d.address,
    price: d.price ? `$${Number(d.price).toLocaleString()}` : null,
    beds: (d.bedrooms != null && d.bathrooms != null) ? `${d.bedrooms}bd/${d.bathrooms}ba` : null,
    sqft: (d.sqft || d.floor_area) ? `${(d.sqft || d.floor_area).toLocaleString()} sqft` : null,
    type: d.property_type || 'Property',
    live: true,
  }
}

// POST — create a new post
export async function POST(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  let body
  try { body = await request.json() } catch { return badRequest('Invalid JSON.') }

  const title = String(body.title || '').trim()
  const bodyText = body.body ? String(body.body).trim() : null
  const lotSlug = String(body.lot_slug || '').trim()
  const propertyId = body.property_id || null
  const wholesaleDealId = body.wholesale_deal_id || null
  const marketTag = body.market_tag ? String(body.market_tag).slice(0, 80) : null

  if (title.length < 8 || title.length > 200) return badRequest('Title must be 8–200 characters.')
  if (bodyText && bodyText.length > 30000) return badRequest('Body too long.')
  if (!lotSlug) return badRequest('Lot is required.')
  if (propertyId && wholesaleDealId) return badRequest('Pick only one deal to link.')

  // Resolve profile
  const { data: profile } = await supabase
    .from('community_profiles').select('id, handle, equity_score, is_shadowbanned')
    .eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'profile_required' }, { status: 409 })
  if (profile.is_shadowbanned) {
    // Shadowbanned users can submit, but their posts are auto-removed
    // (keeping them unaware per standard moderation pattern)
  }

  // Resolve lot
  const { data: lot } = await supabase
    .from('community_lots').select('id, name, slug, min_equity_to_post, is_active')
    .eq('slug', lotSlug).maybeSingle()
  if (!lot || !lot.is_active) return badRequest('Lot not found.')
  if (profile.equity_score < (lot.min_equity_to_post || 0)) {
    return badRequest(`This Lot requires ${lot.min_equity_to_post} Equity to post.`)
  }

  // Validate deal FKs exist if provided
  if (propertyId) {
    const { data: prop } = await supabase.from('properties').select('id').eq('id', propertyId).maybeSingle()
    if (!prop) return badRequest('Linked property not found.')
  }
  if (wholesaleDealId) {
    const { data: wd } = await supabase.from('wholesale_deals').select('id').eq('id', wholesaleDealId).maybeSingle()
    if (!wd) return badRequest('Linked deal not found.')
  }

  const insert = {
    slug: slugifyTitle(title),
    lot_id: lot.id,
    author_id: profile.id,
    title,
    body: bodyText,
    property_id: propertyId,
    wholesale_deal_id: wholesaleDealId,
    market_tag: marketTag,
    is_removed: profile.is_shadowbanned, // shadowban: invisible to others
  }

  const { data, error } = await supabase
    .from('community_posts')
    .insert(insert)
    .select('id, slug, title, lot_id, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return badRequest('Slug collision — try again.')
    return serverError(error.message)
  }

  // ── Fire-and-forget: notify subscribers of this Lot.
  // Shadowbanned posts are invisible, so they don't notify.
  if (!profile.is_shadowbanned) {
    notifyLotSubscribers({ supabase, lot, post: data, author: profile }).catch(() => {})
  }

  return NextResponse.json({ post: data })
}

// Notify everyone subscribed to the Lot (except the author): an in-app
// notification for all, plus an email for those who keep email_subscriptions on.
async function notifyLotSubscribers({ supabase, lot, post, author }) {
  const { data: subs } = await supabase
    .from('community_lot_subscriptions')
    .select('profile_id')
    .eq('lot_id', lot.id)
  if (!subs?.length) return

  const subscriberIds = subs.map(s => s.profile_id).filter(id => id !== author.id)
  if (!subscriberIds.length) return

  const { data: recipients } = await supabase
    .from('community_profiles')
    .select('id, user_id, email_subscriptions')
    .in('id', subscriberIds)
  if (!recipients?.length) return

  // In-app notifications for all subscribers (batched)
  const rows = recipients.map(r => ({
    profile_id: r.id,
    type: 'lot_post',
    title: `New post in ${lot.name}`,
    body: post.title.slice(0, 280),
    ref_post_id: post.id,
  }))
  await supabase.from('community_notifications').insert(rows)

  // Emails — only those who haven't turned the preference off
  const emailRecipients = recipients.filter(r => r.email_subscriptions !== false)
  const userIds = emailRecipients.map(r => r.user_id).filter(Boolean)
  if (!userIds.length) return

  const { data: users } = await supabase.from('users').select('id, email').in('id', userIds)
  const emailById = Object.fromEntries((users || []).map(u => [u.id, u.email]))

  for (const r of emailRecipients) {
    const email = emailById[r.user_id]
    if (email) {
      emailNewLotPost({
        to: email,
        authorHandle: author.handle,
        lotName: lot.name,
        postTitle: post.title,
        postSlug: post.slug,
      })
    }
  }
}
