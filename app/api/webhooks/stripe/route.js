import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { moderateProperty } from '@/lib/moderateProperty'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabaseMarketplace = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

function generateSlug() {
  const alpha = 'abcdefghjkmnpqrstuvwxyz'
  const nums = '23456789'
  const p1 = Array.from({ length: 7 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join('')
  const p2 = Array.from({ length: 2 }, () => nums[Math.floor(Math.random() * nums.length)]).join('')
  return p1 + p2
}

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object
    await supabaseMarketplace
      .from('payments')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent_id', paymentIntent.id)
    return NextResponse.json({ received: true })
  }

  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object
    await supabaseMarketplace
      .from('payments')
      .update({ status: 'disputed' })
      .eq('stripe_payment_intent_id', dispute.payment_intent)
    return NextResponse.json({ received: true })
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object
    await supabaseMarketplace
      .from('payments')
      .update({ status: 'refunded' })
      .eq('stripe_payment_intent_id', charge.payment_intent)
    return NextResponse.json({ received: true })
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object
    const { userId, formData: formDataRaw } = paymentIntent.metadata

    if (!userId || !formDataRaw) {
      // Not a listing payment or missing data — ignore
      return NextResponse.json({ received: true })
    }

    // Idempotency check — skip if listing already created for this PaymentIntent
    const { data: existing } = await supabaseMarketplace
      .from('payments')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle()

    if (existing) {
      // Already processed by the client — nothing to do
      return NextResponse.json({ received: true })
    }

    // Client failed to create the listing — do it here as fallback
    let formData
    try {
      formData = JSON.parse(formDataRaw)
    } catch {
      console.error('[Stripe Webhook] Could not parse formData metadata')
      return NextResponse.json({ received: true })
    }

    const slug = generateSlug()
    const { data: property, error: propError } = await supabaseMarketplace
      .from('properties')
      .insert({
        slug,
        seo_title: formData.title || null,
        address: formData.address,
        state: formData.state,
        latitude: formData.latitude,
        longitude: formData.longitude,
        price: formData.price,
        property_type: formData.property_type,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        floor_area: formData.floor_area,
        description: formData.description,
        repairs: formData.repairs,
        inspection_report_url: formData.inspection_report_url || null,
        status: 'under_review',
        posted_by: userId,
      })
      .select('id, slug')
      .single()

    if (propError) {
      console.error('[Stripe Webhook] Failed to create listing:', propError.message)
      return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
    }

    // Record payment
    await supabaseMarketplace.from('payments').insert({
      user_id: userId,
      user_type: 'buyer',
      payment_type: 'listing_fee',
      property_id: property.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'succeeded',
      description: `Listing fee for property: ${formData.title || property.slug}`,
    })

    console.log('[Stripe Webhook] Fallback listing created:', property.id)

    // Kick off AI moderation in background
    setTimeout(() => moderateProperty(property.id).catch(console.error), 0)
  }

  return NextResponse.json({ received: true })
}
