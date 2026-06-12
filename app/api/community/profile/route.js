import { NextResponse } from 'next/server'
import {
  getServiceClient,
  getUserIdFromRequest,
  unauthorized,
  badRequest,
  serverError,
  publicProfile,
  validateHandle,
} from '@/lib/community/auth'
import { emailCommunityWelcome } from '@/lib/community/emailNotify'

const HANDLE_CHANGE_COOLDOWN_DAYS = 90

// GET — current user's community profile (returns null if none yet)
export async function GET(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('community_profiles')
    .select('id, handle, display_name, bio, avatar_url, equity_score, tier_id, role_badge, is_moderator, handle_changed_at, email_replies, email_mentions, email_verification_status, email_subscriptions')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return serverError(error.message)

  if (!data) return NextResponse.json({ profile: null })

  // Tier lookup
  const { data: tier } = await supabase
    .from('community_tiers')
    .select('id, slug, name, min_equity')
    .eq('id', data.tier_id || -1)
    .maybeSingle()

  const { data: nextTier } = await supabase
    .from('community_tiers')
    .select('id, slug, name, min_equity')
    .gt('min_equity', data.equity_score)
    .order('min_equity', { ascending: true })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    profile: {
      ...publicProfile(data),
      bio: data.bio || null,
      handle_changed_at: data.handle_changed_at,
      email_replies: data.email_replies !== false,
      email_mentions: data.email_mentions !== false,
      email_verification_status: data.email_verification_status !== false,
      email_subscriptions: data.email_subscriptions !== false,
    },
    tier: tier || null,
    next_tier: nextTier || null,
  })
}

// POST — create profile (first-time handle picker)
export async function POST(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  let body
  try { body = await request.json() } catch { return badRequest('Invalid JSON.') }

  const handleErr = validateHandle(body?.handle)
  if (handleErr) return badRequest(handleErr)

  // One profile per user
  const { data: existing } = await supabase
    .from('community_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (existing) return badRequest('Profile already exists.')

  // Confirm the user row exists + grab email for welcome message
  const { data: u } = await supabase.from('users').select('id, email').eq('id', userId).maybeSingle()
  if (!u) return badRequest('User not found.')

  const insert = {
    user_id: userId,
    handle: body.handle.trim().toLowerCase(),
    display_name: body.display_name ? String(body.display_name).slice(0, 60) : null,
  }

  const { data, error } = await supabase
    .from('community_profiles')
    .insert(insert)
    .select('id, handle, display_name, avatar_url, equity_score, tier_id, role_badge, is_moderator')
    .single()

  if (error) {
    if (error.code === '23505') return badRequest('That handle is taken.')
    return serverError(error.message)
  }

  // Fire-and-forget welcome email
  if (u.email) {
    try { emailCommunityWelcome({ to: u.email, handle: data.handle }) } catch {}
  }

  return NextResponse.json({ profile: publicProfile(data) })
}

// PATCH — update display_name / bio / avatar_url, or rotate handle (cooldown enforced)
export async function PATCH(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  let body
  try { body = await request.json() } catch { return badRequest('Invalid JSON.') }

  const { data: current, error: cerr } = await supabase
    .from('community_profiles')
    .select('id, handle, handle_changed_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (cerr) return serverError(cerr.message)
  if (!current) return badRequest('No profile to update.')

  const patch = {}
  if (typeof body.display_name === 'string') patch.display_name = body.display_name.slice(0, 60)
  if (typeof body.bio === 'string') patch.bio = body.bio.slice(0, 500)
  if (typeof body.avatar_url === 'string') patch.avatar_url = body.avatar_url.slice(0, 500)
  if (typeof body.email_replies === 'boolean')             patch.email_replies = body.email_replies
  if (typeof body.email_mentions === 'boolean')            patch.email_mentions = body.email_mentions
  if (typeof body.email_verification_status === 'boolean') patch.email_verification_status = body.email_verification_status
  if (typeof body.email_subscriptions === 'boolean')       patch.email_subscriptions = body.email_subscriptions

  if (body.handle && body.handle !== current.handle) {
    const handleErr = validateHandle(body.handle)
    if (handleErr) return badRequest(handleErr)
    if (current.handle_changed_at) {
      const daysSince = (Date.now() - new Date(current.handle_changed_at).getTime()) / 86_400_000
      if (daysSince < HANDLE_CHANGE_COOLDOWN_DAYS) {
        return badRequest(`Handle can be changed once every ${HANDLE_CHANGE_COOLDOWN_DAYS} days. Try again in ${Math.ceil(HANDLE_CHANGE_COOLDOWN_DAYS - daysSince)} days.`)
      }
    }
    patch.handle = body.handle.trim().toLowerCase()
    patch.handle_changed_at = new Date().toISOString()
  }

  if (!Object.keys(patch).length) return badRequest('No changes.')

  const { data, error } = await supabase
    .from('community_profiles')
    .update(patch)
    .eq('id', current.id)
    .select('id, handle, display_name, bio, avatar_url, equity_score, tier_id, role_badge, is_moderator, handle_changed_at, email_replies, email_mentions, email_verification_status, email_subscriptions')
    .single()

  if (error) {
    if (error.code === '23505') return badRequest('That handle is taken.')
    return serverError(error.message)
  }

  return NextResponse.json({ profile: publicProfile(data) })
}
