import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const supabaseService = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null

function getUserId(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.replace('Bearer ', '').trim() || null
}

// GET: Check if deal(s) are marked not interested. ?dealId=uuid or ?dealIds=uuid1,uuid2
export async function GET(request) {
  try {
    const userId = getUserId(request)
    if (!userId) {
      return NextResponse.json({ notInterested: false, notInterestedMap: {} })
    }

    const { searchParams } = new URL(request.url)
    const dealId = searchParams.get('dealId')
    const dealIdsParam = searchParams.get('dealIds')

    const client = supabaseService || supabase

    if (dealId) {
      const { data, error } = await client
        .from('buyer_not_interested')
        .select('id')
        .eq('user_id', userId)
        .eq('deal_id', dealId)
        .maybeSingle()

      if (error) {
        console.error('[not-interested] GET error:', error)
        return NextResponse.json({ notInterested: false })
      }
      return NextResponse.json({ notInterested: !!data })
    }

    if (dealIdsParam) {
      const dealIds = dealIdsParam.split(',').map((id) => id.trim()).filter(Boolean)
      if (dealIds.length === 0) {
        return NextResponse.json({ notInterestedMap: {} })
      }
      const { data, error } = await client
        .from('buyer_not_interested')
        .select('deal_id')
        .eq('user_id', userId)
        .in('deal_id', dealIds)

      if (error) {
        console.error('[not-interested] GET batch error:', error)
        return NextResponse.json({ notInterestedMap: {} })
      }
      const notInterestedMap = {}
      ;(data || []).forEach((row) => { notInterestedMap[row.deal_id] = true })
      return NextResponse.json({ notInterestedMap })
    }

    return NextResponse.json({ notInterested: false, notInterestedMap: {} })
  } catch (error) {
    console.error('[not-interested] GET error:', error)
    return NextResponse.json({ notInterested: false, notInterestedMap: {} })
  }
}

// POST: Mark deal as not interested. Body: { dealId }
export async function POST(request) {
  try {
    const userId = getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const dealId = body.dealId || body.deal_id

    if (!dealId) {
      return NextResponse.json({ error: 'dealId is required' }, { status: 400 })
    }

    const client = supabaseService || supabase

    const { data: user } = await client
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { error } = await client
      .from('buyer_not_interested')
      .upsert(
        { user_id: userId, deal_id: dealId },
        { onConflict: 'user_id,deal_id' }
      )

    if (error) {
      console.error('[not-interested] POST error:', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({ notInterested: true })
  } catch (error) {
    console.error('[not-interested] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Undo not interested. ?dealId=uuid
export async function DELETE(request) {
  try {
    const userId = getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dealId = searchParams.get('dealId')

    if (!dealId) {
      return NextResponse.json({ error: 'dealId is required' }, { status: 400 })
    }

    const client = supabaseService || supabase

    const { error } = await client
      .from('buyer_not_interested')
      .delete()
      .eq('user_id', userId)
      .eq('deal_id', dealId)

    if (error) {
      console.error('[not-interested] DELETE error:', error)
      return NextResponse.json({ error: 'Failed to remove' }, { status: 500 })
    }

    return NextResponse.json({ notInterested: false })
  } catch (error) {
    console.error('[not-interested] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
