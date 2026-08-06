import { NextResponse } from 'next/server'
import { createClient } from '@airostack/client'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL, process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY)
}

export async function GET(request) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabase()

    const { data: referral } = await supabase
      .from('referrals')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!referral) return NextResponse.json({ payouts: [] })

    const { data: payouts } = await supabase
      .from('referral_payouts')
      .select('*')
      .eq('referral_id', referral.id)
      .order('paid_at', { ascending: false })

    return NextResponse.json({ payouts: payouts || [] })
  } catch (err) {
    console.error('[referral payouts GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
