import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Buyers (acting as sellers) ALWAYS pay the per-contract fee — there is no free
// quota on the buyer side. Env-overridable so the price can change without a deploy.
const CONTRACT_FEE_CENTS = parseInt(process.env.CONTRACT_FEE_CENTS || '299', 10)

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

async function getOrCreateCustomer(userId) {
  const { data: u } = await supabase
    .from('users')
    .select('email, first_name, last_name, stripe_customer_id')
    .eq('id', userId)
    .maybeSingle()
  if (u?.stripe_customer_id) return u.stripe_customer_id
  const customer = await stripe.customers.create({
    email: u?.email,
    name: [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim() || u?.email,
    metadata: { user_id: userId, source: 'deelmap_buyer_contract' },
  })
  await supabase.from('users').update({ stripe_customer_id: customer.id }).eq('id', userId)
  return customer.id
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const userId = body.user_id
    const draftId = body.draft_id || null
    if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    const customerId = await getOrCreateCustomer(userId)

    // Idempotency keyed to the draft + amount so a retry (e.g. payment succeeded
    // but the send failed) reuses the same intent instead of charging twice.
    const idemKey = draftId ? `buyer-contract-pay-${draftId}-${CONTRACT_FEE_CENTS}` : undefined
    const pi = await stripe.paymentIntents.create(
      {
        amount: CONTRACT_FEE_CENTS,
        currency: 'usd',
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        setup_future_usage: 'off_session',
        metadata: { user_id: userId, purpose: 'contract', draft_id: draftId || '' },
      },
      idemKey ? { idempotencyKey: idemKey } : undefined,
    )

    const live = await stripe.paymentIntents.retrieve(pi.id)
    if (live.status === 'succeeded') return NextResponse.json({ paid: true })
    return NextResponse.json({ clientSecret: live.client_secret, amount: CONTRACT_FEE_CENTS })
  } catch (e) {
    console.error('[buyer contracts/pay] error:', e?.message || e)
    return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: 500 })
  }
}
