import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const userId = searchParams.get('userId')
    const period = searchParams.get('period') || 'all'

    if (!propertyId || !userId) {
      return NextResponse.json({ error: 'Missing propertyId or userId' }, { status: 400 })
    }

    // Verify property belongs to this user
    const { data: property } = await supabase
      .from('properties')
      .select('id, address, state')
      .eq('id', propertyId)
      .eq('posted_by', userId)
      .maybeSingle()

    if (!property) {
      return NextResponse.json({ error: 'Property not found or access denied' }, { status: 403 })
    }

    const now = Date.now()
    const day = 24 * 60 * 60 * 1000
    const periodStart =
      period === 'last7days' ? new Date(now - 7 * day).toISOString()
      : period === 'last30days' ? new Date(now - 30 * day).toISOString()
      : null

    const { data: analyticsRows, error } = await supabase
      .from('property_analytics')
      .select(`
        session_id,
        user_id,
        user_email,
        user_first_name,
        user_last_name,
        view_start_time,
        view_end_time,
        created_at
      `)
      .eq('property_id', propertyId)
      .order('view_start_time', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

    let list = analyticsRows || []
    if (periodStart) {
      list = list.filter(r => {
        const t = r.view_start_time || r.created_at
        return t && t >= periodStart
      })
    }

    // Merge by unique buyer
    const byBuyer = new Map()
    for (const row of list) {
      const key = (row.user_email || '').trim().toLowerCase() || `guest_${row.session_id}`
      const end = row.view_end_time ? new Date(row.view_end_time).getTime() : (row.created_at ? new Date(row.created_at).getTime() : null)
      const existing = byBuyer.get(key)
      if (!existing) {
        byBuyer.set(key, {
          user_email: row.user_email || null,
          user_first_name: row.user_first_name,
          user_last_name: row.user_last_name,
          view_end_time: row.view_end_time,
          created_at: row.created_at,
          _maxEnd: end
        })
      } else {
        if (end != null && (existing._maxEnd == null || end > existing._maxEnd)) {
          existing._maxEnd = end
          existing.view_end_time = row.view_end_time
          existing.created_at = row.created_at
        }
        if (!existing.user_first_name && row.user_first_name) existing.user_first_name = row.user_first_name
        if (!existing.user_last_name && row.user_last_name) existing.user_last_name = row.user_last_name
      }
    }

    const viewerSessions = Array.from(byBuyer.values())
      .map(({ _maxEnd, ...rest }) => rest)
      .sort((a, b) => {
        const tA = a.view_end_time ? new Date(a.view_end_time).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0)
        const tB = b.view_end_time ? new Date(b.view_end_time).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0)
        return tB - tA
      })

    return NextResponse.json({
      uniqueViewers: byBuyer.size,
      viewerSessions
    })
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
