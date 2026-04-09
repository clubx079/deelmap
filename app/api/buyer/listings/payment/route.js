import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// POST — create a Stripe PaymentIntent for $20 listing fee
export async function POST(request) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 2000, // $20.00 in cents
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId,
        listingTitle: body.title || '',
        formData: JSON.stringify(body.formData || {}),
      },
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('[STRIPE] PaymentIntent creation failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
