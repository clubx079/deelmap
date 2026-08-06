import { NextResponse } from 'next/server'
import { createClient } from '@airostack/client'
import { verifyFeedbackToken } from '@/lib/feedbackToken'

// Public feedback intake → `feedback` table (shown in the admin portal).
// Two shapes:
//   { rating?, message?, source?, token? }  → create a new feedback row (returns id)
//   { feedbackId, message }                 → append a comment to a star-tap row
// Separate from the Monday.com /contact flow — do not merge them.
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

const SOURCES = new Set(['welcome', 'week1', 'listing', 'plan_nudge', 'cancellation', 'general'])
const TYPES = new Set(['buyer', 'seller', 'anon'])
const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

export async function POST(request) {
  try {
    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
    const body = await request.json().catch(() => ({}))

    // ── append a comment to an existing (star-tap) row ──
    if (body.feedbackId) {
      const id = String(body.feedbackId)
      const message = typeof body.message === 'string' ? body.message.trim().slice(0, 4000) : ''
      if (!isUuid(id)) return NextResponse.json({ error: 'Invalid reference.' }, { status: 400 })
      if (!message) return NextResponse.json({ error: 'Comment is empty.' }, { status: 400 })
      const { error } = await supabase.from('feedback').update({ message }).eq('id', id)
      if (error) {
        console.error('[feedback] append error:', error.message)
        return NextResponse.json({ error: 'Could not save your comment.' }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    // ── create a new feedback row ──
    const rating = body.rating == null || body.rating === '' ? null : Number(body.rating)
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 4000) : null
    if ((rating == null || !Number.isFinite(rating)) && !message) {
      return NextResponse.json({ error: 'Please add a rating or a comment.' }, { status: 400 })
    }
    if (rating != null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 })
    }

    const tok = verifyFeedbackToken(body.token)
    let user_id = null
    let user_type = 'anon'
    let source = SOURCES.has(body.source) ? body.source : 'general'
    if (tok) {
      // Explicit attribution via the signed email link token.
      user_id = tok.uid
      user_type = TYPES.has(tok.type) ? tok.type : 'anon'
      source = SOURCES.has(tok.source) ? tok.source : source
    } else {
      // No token → fall back to the logged-in session. Middleware verifies the
      // dm_session cookie and injects a trusted x-user-id (= users.id) on this
      // route, so a signed-in buyer's feedback is attributed to their account
      // instead of showing as Anonymous in the admin portal.
      const sessionUserId = request.headers.get('x-user-id')
      if (sessionUserId) {
        user_id = sessionUserId
        user_type = 'buyer'
      }
    }

    const { data, error } = await supabase
      .from('feedback')
      .insert({ user_id, user_type, source, rating: rating ?? null, message: message || null })
      .select('id')
      .single()
    if (error) {
      console.error('[feedback] insert error:', error.message)
      return NextResponse.json({ error: 'Could not save your feedback.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id: data.id })
  } catch (err) {
    console.error('[feedback] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
