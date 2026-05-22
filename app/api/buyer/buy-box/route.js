import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('buyer_buy_boxes')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || null)
}

export async function POST(request) {
  const body = await request.json()
  const { user_id, min_price, max_price, property_types, locations, min_beds, min_baths, deal_types } = body
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { error } = await supabase
    .from('buyer_buy_boxes')
    .upsert({
      user_id,
      min_price: min_price ?? null,
      max_price: max_price ?? null,
      property_types: property_types || [],
      locations: locations || [],
      min_beds: min_beds ?? null,
      min_baths: min_baths ?? null,
      deal_types: deal_types || [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
