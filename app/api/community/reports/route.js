import { NextResponse } from 'next/server'
import { getServiceClient, getUserIdFromRequest, unauthorized, badRequest, serverError } from '@/lib/community/auth'

const VALID_TARGET_TYPES = ['post', 'comment', 'profile']

// POST /api/community/reports
// Body: { target_type, target_id, reason, details? }
// Requires a community profile (the report shows up in the admin queue tied to the reporter).
export async function POST(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  let body
  try { body = await request.json() } catch { return badRequest('Invalid JSON.') }

  const targetType = String(body.target_type || '').toLowerCase()
  const targetId   = body.target_id
  const reason     = String(body.reason || '').trim()
  const details    = body.details ? String(body.details).slice(0, 1000) : null

  if (!VALID_TARGET_TYPES.includes(targetType)) return badRequest('Invalid target_type.')
  if (!targetId) return badRequest('target_id required.')
  if (reason.length < 3) return badRequest('Reason too short.')

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'profile_required' }, { status: 409 })

  // Soft-validate the target exists so we don't accumulate orphans
  const targetTable = targetType === 'post' ? 'community_posts'
                    : targetType === 'comment' ? 'community_comments'
                    : 'community_profiles'
  const { data: target } = await supabase
    .from(targetTable).select('id').eq('id', targetId).maybeSingle()
  if (!target) return badRequest('Target not found.')

  // Soft-rate-limit: drop dupes from the same reporter on the same target within last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: existing } = await supabase
    .from('community_reports')
    .select('id')
    .eq('reporter_id', profile.id)
    .eq('target_type', targetType)
    .eq('target_id',   targetId)
    .gte('created_at', oneHourAgo)
    .maybeSingle()
  if (existing) return NextResponse.json({ ok: true, deduped: true })

  const { data, error } = await supabase
    .from('community_reports')
    .insert({
      reporter_id: profile.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details,
    })
    .select('id, status, created_at')
    .single()

  if (error) return serverError(error.message)
  return NextResponse.json({ ok: true, report: data })
}
