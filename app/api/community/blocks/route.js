import { NextResponse } from 'next/server'
import { getServiceClient, getUserIdFromRequest, unauthorized, badRequest, serverError } from '@/lib/community/auth'

// GET — list profiles the current user has blocked
export async function GET(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ blocks: [] })

  const { data, error } = await supabase
    .from('community_blocks')
    .select(`
      created_at,
      blocked:community_profiles!community_blocks_blocked_id_fkey(id, handle, display_name, avatar_url, role_badge)
    `)
    .eq('blocker_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) return serverError(error.message)
  const blocks = (data || []).filter(r => r.blocked).map(r => ({ ...r.blocked, blocked_at: r.created_at }))
  return NextResponse.json({ blocks })
}

// POST { handle } — block a user by handle
export async function POST(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  let body
  try { body = await request.json() } catch { return badRequest('Invalid JSON.') }
  const handle = String(body?.handle || '').toLowerCase().trim()
  if (!handle) return badRequest('handle required.')

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'profile_required' }, { status: 409 })

  const { data: target } = await supabase
    .from('community_profiles').select('id, handle').eq('handle', handle).maybeSingle()
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (target.id === profile.id) return badRequest('You can\'t block yourself.')

  const { error } = await supabase
    .from('community_blocks')
    .upsert({ blocker_id: profile.id, blocked_id: target.id }, { onConflict: 'blocker_id,blocked_id' })
  if (error) return serverError(error.message)

  return NextResponse.json({ ok: true, blocked: true, handle: target.handle })
}

// DELETE ?handle=... — unblock
export async function DELETE(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()
  const handle = new URL(request.url).searchParams.get('handle')?.toLowerCase().trim()
  if (!handle) return badRequest('handle required.')

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'profile_required' }, { status: 409 })

  const { data: target } = await supabase
    .from('community_profiles').select('id').eq('handle', handle).maybeSingle()
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { error } = await supabase
    .from('community_blocks').delete()
    .eq('blocker_id', profile.id).eq('blocked_id', target.id)
  if (error) return serverError(error.message)

  return NextResponse.json({ ok: true, blocked: false })
}
