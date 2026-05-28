import { NextResponse } from 'next/server'
import { getServiceClient, getUserIdFromRequest, unauthorized, badRequest, serverError } from '@/lib/community/auth'

// GET — list of lots the current user is subscribed to (with full lot info)
export async function GET(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ subscriptions: [] })

  const { data, error } = await supabase
    .from('community_lot_subscriptions')
    .select(`
      subscribed_at,
      lot:community_lots(id, slug, name, category, accent_color, post_count, member_count, description)
    `)
    .eq('profile_id', profile.id)
    .order('subscribed_at', { ascending: false })

  if (error) return serverError(error.message)

  const subscriptions = (data || [])
    .filter(row => row.lot)
    .map(row => ({ ...row.lot, subscribed_at: row.subscribed_at }))

  return NextResponse.json({ subscriptions })
}

// POST { lot_slug } — subscribe to a lot
export async function POST(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  let body
  try { body = await request.json() } catch { return badRequest('Invalid JSON.') }
  const lotSlug = body?.lot_slug
  if (!lotSlug) return badRequest('lot_slug required.')

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'profile_required' }, { status: 409 })

  const { data: lot } = await supabase
    .from('community_lots').select('id, is_active').eq('slug', lotSlug).maybeSingle()
  if (!lot || !lot.is_active) return badRequest('Lot not found.')

  const { error } = await supabase
    .from('community_lot_subscriptions')
    .upsert({ profile_id: profile.id, lot_id: lot.id }, { onConflict: 'profile_id,lot_id' })

  if (error) return serverError(error.message)
  return NextResponse.json({ ok: true, subscribed: true })
}

// DELETE ?lot_slug=... — unsubscribe
export async function DELETE(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()
  const lotSlug = new URL(request.url).searchParams.get('lot_slug')
  if (!lotSlug) return badRequest('lot_slug required.')

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'profile_required' }, { status: 409 })

  const { data: lot } = await supabase
    .from('community_lots').select('id').eq('slug', lotSlug).maybeSingle()
  if (!lot) return badRequest('Lot not found.')

  const { error } = await supabase
    .from('community_lot_subscriptions')
    .delete()
    .eq('profile_id', profile.id)
    .eq('lot_id', lot.id)

  if (error) return serverError(error.message)
  return NextResponse.json({ ok: true, subscribed: false })
}
