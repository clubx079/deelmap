import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    // Get or create Stripe Customer for this buyer
    const { data: userRow } = await supabase
      .from('users')
      .select('email, first_name, last_name, stripe_customer_id')
      .eq('id', userId)
      .maybeSingle()

    let customerId = userRow?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userRow?.email || undefined,
        name: [userRow?.first_name, userRow?.last_name].filter(Boolean).join(' ') || undefined,
        metadata: { userId },
      })
      customerId = customer.id
      await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', userId)
    }

    const f = body.formData || {}
    const essentialData = JSON.stringify({
      title: f.title || '',
      address: f.address || '',
      state: f.state || '',
      latitude: f.latitude || null,
      longitude: f.longitude || null,
      price: f.price || '',
      property_type: f.property_type || '',
      bedrooms: f.bedrooms || '',
      bathrooms: f.bathrooms || '',
      floor_area: f.floor_area || '',
      inspection_report_url: f.inspection_report_url || null,
    })

    const amount = typeof body.amount === 'number' && body.amount > 0 ? body.amount : 2900

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: customerId,
      setup_future_usage: 'off_session',
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId,
        listingTitle: (f.title || '').slice(0, 100),
        formData: essentialData,
      },
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('[STRIPE] PaymentIntent creation failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
