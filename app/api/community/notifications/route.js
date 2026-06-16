import { NextResponse } from 'next/server'
import { getServiceClient, getUserIdFromRequest, unauthorized, badRequest, serverError } from '@/lib/community/auth'

// GET — list current user's notifications (newest first).
// Query:  ?unread=1 to only return unread.  ?limit=30 default 30, max 100.
export async function GET(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  const url = new URL(request.url)
  const unreadOnly = url.searchParams.get('unread') === '1'
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '30', 10)))
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0)

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ notifications: [], unread_count: 0, has_profile: false })

  let q = supabase
    .from('community_notifications')
    .select(`
      id, type, title, body, is_read, created_at,
      ref_post_id, ref_comment_id
    `)
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (unreadOnly) q = q.eq('is_read', false)

  const { data: notifs, error } = await q
  if (error) return serverError(error.message)

  // Hydrate post slugs for navigation
  const postIds = [...new Set((notifs || []).map(n => n.ref_post_id).filter(Boolean))]
  const slugMap = {}
  if (postIds.length) {
    const { data: posts } = await supabase
      .from('community_posts').select('id, slug').in('id', postIds)
    for (const p of posts || []) slugMap[p.id] = p.slug
  }

  const hydrated = (notifs || []).map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    is_read: n.is_read,
    created_at: n.created_at,
    post_slug: n.ref_post_id ? slugMap[n.ref_post_id] || null : null,
    href: buildHref(n.type, slugMap[n.ref_post_id], n.ref_comment_id),
  }))

  // Unread count (independent of the limit window)
  const { count: unreadCount } = await supabase
    .from('community_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profile.id)
    .eq('is_read', false)

  return NextResponse.json({ notifications: hydrated, unread_count: unreadCount || 0, has_profile: true, has_more: (notifs || []).length === limit })
}

// POST { action: 'mark_read' | 'mark_all_read', notification_id? }
export async function POST(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  let body
  try { body = await request.json() } catch { return badRequest('Invalid JSON.') }
  const action = body?.action

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'profile_required' }, { status: 409 })

  if (action === 'mark_read') {
    const id = body?.notification_id
    if (!id) return badRequest('notification_id required.')
    const { error } = await supabase
      .from('community_notifications')
      .update({ is_read: true })
      .eq('profile_id', profile.id)
      .eq('id', id)
    if (error) return serverError(error.message)
    return NextResponse.json({ ok: true })
  }

  if (action === 'mark_all_read') {
    const { error } = await supabase
      .from('community_notifications')
      .update({ is_read: true })
      .eq('profile_id', profile.id)
      .eq('is_read', false)
    if (error) return serverError(error.message)
    return NextResponse.json({ ok: true })
  }

  return badRequest('Unknown action.')
}

function buildHref(type, slug, commentId) {
  if (type === 'verification_status') return '/community/me'
  if (slug && commentId) return `/community/p/${slug}#c-${commentId}`
  if (slug) return `/community/p/${slug}`
  return '/community'
}
