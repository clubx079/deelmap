import { createClient } from '@airostack/client'
import { NextResponse } from 'next/server'

export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
    process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

export function getUserIdFromRequest(request) {
  // Trust only the x-user-id injected by middleware after verifying dm_session.
  // Client-supplied x-user-id is stripped in middleware, so this is safe.
  return request.headers.get('x-user-id') || null
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function serverError(message = 'Server error') {
  return NextResponse.json({ error: message }, { status: 500 })
}

// Resolves an authenticated user to their community profile.
// Returns { profile, supabase } on success, or a NextResponse on failure.
// `requireProfile=false` returns { profile: null, supabase } when no profile exists yet
// (used by the handle-picker flow where the profile is about to be created).
export async function requireCommunityProfile(request, { requireProfile = true } = {}) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()

  const supabase = getServiceClient()
  const { data: profile, error } = await supabase
    .from('community_profiles')
    .select('id, handle, display_name, avatar_url, equity_score, tier_id, role_badge, is_moderator, is_shadowbanned')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return serverError(error.message)
  if (!profile && requireProfile) {
    return NextResponse.json({ error: 'profile_required' }, { status: 409 })
  }
  return { profile, supabase, userId }
}

// Strip any privacy-walled columns from a profile payload before returning to client.
// Belt-and-suspenders alongside the column-grant REVOKE in the migration.
export function publicProfile(p) {
  if (!p) return null
  return {
    id: p.id,
    handle: p.handle,
    display_name: p.display_name || null,
    avatar_url: p.avatar_url || null,
    equity_score: p.equity_score || 0,
    tier_id: p.tier_id || null,
    role_badge: p.role_badge || null,
    is_moderator: !!p.is_moderator,
  }
}

// Slug a title for /community/p/[slug]
export function slugifyTitle(title) {
  const base = title.toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  const rand = Math.random().toString(36).slice(2, 8)
  return base ? `${base}-${rand}` : rand
}

// Validate handle against the same rules the DB enforces, but give friendly messages.
const RESERVED = new Set([
  'admin','deelmap','staff','mod','moderator','system','support','root','official','help','team',
])
export function validateHandle(raw) {
  if (typeof raw !== 'string') return 'Handle is required.'
  const h = raw.trim().toLowerCase()
  if (h.length < 3) return 'Handle must be at least 3 characters.'
  if (h.length > 24) return 'Handle must be 24 characters or fewer.'
  if (!/^[a-z0-9_]+$/.test(h)) return 'Use only lowercase letters, numbers, and underscores.'
  if (RESERVED.has(h)) return 'That handle is reserved.'
  return null
}
