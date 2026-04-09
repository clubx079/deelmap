import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// POST — create a Stripe PaymentIntent for $20 listing fee
export async function POST(request) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    // Only store essential fields in metadata (Stripe limit: 500 chars per value)
    // description/repairs are omitted — listing can be edited after if webhook fallback triggers
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

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1999, // $19.99 in cents
      currency: 'usd',
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
