import { NextResponse } from 'next/server'
import { getServiceClient, getUserIdFromRequest, unauthorized, badRequest, notFound, serverError } from '@/lib/community/auth'

// POST { value: -1 | 0 | 1 } — apply or clear vote on a comment
export async function POST(request, { params }) {
  const { id } = await params
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  let body
  try { body = await request.json() } catch { return badRequest('Invalid JSON.') }
  const value = body?.value
  if (![-1, 0, 1].includes(value)) return badRequest('value must be -1, 0, or 1.')

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'profile_required' }, { status: 409 })

  const { data: comment } = await supabase
    .from('community_comments').select('id').eq('id', id).maybeSingle()
  if (!comment) return notFound('Comment not found.')

  const { error: rpcErr } = await supabase.rpc('community_apply_vote', {
    p_profile_id: profile.id,
    p_target_type: 'comment',
    p_target_id: comment.id,
    p_value: value,
  })
  if (rpcErr) return serverError(rpcErr.message)

  const { data: fresh } = await supabase
    .from('community_comments').select('score').eq('id', comment.id).maybeSingle()

  return NextResponse.json({ score: fresh?.score ?? 0, user_vote: value })
}
