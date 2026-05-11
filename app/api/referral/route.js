import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const REFERRAL_COUPON_ID = 'huzBZPT2'

function getClients() {
  return {
    stripe: new Stripe(process.env.STRIPE_SECRET_KEY),
    supabase: createClient(
      process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
      process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
    ),
  }
}

// GET — fetch current user's referral code + usage stats
export async function GET(request) {
  try {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { supabase, stripe } = getClients()

  const { data: referral } = await supabase
    .from('referrals')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!referral) return NextResponse.json({ referral: null })

  // Get live usage count from Stripe
  let timesRedeemed = 0
  try {
    const promoCode = await stripe.promotionCodes.retrieve(referral.promo_code_id)
    timesRedeemed = promoCode.times_redeemed || 0
  } catch {}

  // Get usage records to estimate earnings (20% of original_amount per use)
  const { data: usages } = await supabase
    .from('promo_code_usages')
    .select('stripe_payment_intent_id, portal')
    .eq('promo_code_id', referral.promo_code_id)

  // Calculate estimated earnings: 20% of original price per transaction
  let estimatedEarnings = 0
  if (usages && usages.length > 0) {
    const piIds = usages.map(u => u.stripe_payment_intent_id).filter(Boolean)
    if (piIds.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, description, stripe_payment_intent_id')
        .in('stripe_payment_intent_id', piIds)

      for (const p of (payments || [])) {
        let originalAmount = p.amount
        try {
          const desc = JSON.parse(p.description)
          const base = desc.base?.amount || 0
          const addons = (desc.addons || []).reduce((s, a) => s + (a.amount || 0), 0)
          if (base + addons > 0) originalAmount = base + addons
        } catch {}
        estimatedEarnings += Math.round(originalAmount * 0.20)
      }
    }
  }

  return NextResponse.json({
    referral: {
      ...referral,
      times_redeemed: timesRedeemed,
      estimated_earnings: estimatedEarnings,
    }
  })
  } catch (err) {
    console.error('[referral GET]', err)
    return NextResponse.json({ error: err.message || 'Failed to load referral' }, { status: 500 })
  }
}

// POST — generate a referral code for the user
export async function POST(request) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { user_type = 'buyer' } = await request.json().catch(() => ({}))
    const { supabase, stripe } = getClients()

    // Return existing referral if already created
    const { data: existing } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) return NextResponse.json({ referral: { ...existing, times_redeemed: 0, estimated_earnings: 0 } })

    // Fetch user name to build a readable code
    const { data: user } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .maybeSingle()

    const firstName = (user?.first_name || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6)
    const suffix = Math.floor(1000 + Math.random() * 9000)
    const code = firstName ? `${firstName}${suffix}` : `DEEL${suffix}`

    // Create promotion code in Stripe under the referral coupon
    const promoCode = await stripe.promotionCodes.create({
      promotion: { type: 'coupon', coupon: REFERRAL_COUPON_ID },
      code,
      metadata: { user_id: userId, user_type },
    })

    const { data: referral, error } = await supabase
      .from('referrals')
      .insert({
        user_id: userId,
        user_type,
        promo_code_id: promoCode.id,
        promo_code: code,
        stripe_coupon_id: REFERRAL_COUPON_ID,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ referral: { ...referral, times_redeemed: 0, estimated_earnings: 0 } })
  } catch (err) {
    console.error('[referral POST]', err)
    return NextResponse.json({ error: err.message || 'Failed to generate referral code' }, { status: 500 })
  }
}
