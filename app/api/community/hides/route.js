import { NextResponse } from 'next/server'
import { getServiceClient, getUserIdFromRequest, unauthorized, badRequest, serverError } from '@/lib/community/auth'

// POST { post_id } — hide post from your feed
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
    .from('community_post_hides')
    .upsert({ profile_id: profile.id, post_id: postId }, { onConflict: 'profile_id,post_id' })
  if (error) return serverError(error.message)

  return NextResponse.json({ ok: true, hidden: true })
}

// DELETE ?post_id=... — unhide
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
    .from('community_post_hides')
    .delete()
    .eq('profile_id', profile.id)
    .eq('post_id', postId)
  if (error) return serverError(error.message)

  return NextResponse.json({ ok: true, hidden: false })
}
