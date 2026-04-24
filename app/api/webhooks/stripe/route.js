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

  // Track promo code usage on any successful PaymentIntent that had a promo applied
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object
    const promo_code_id = pi.metadata?.promo_code_id
    if (promo_code_id) {
      try {
        await supabaseMarketplace.from('promo_code_usages').upsert(
          { promo_code_id, stripe_payment_intent_id: pi.id, portal: 'buyer' },
          { onConflict: 'stripe_payment_intent_id' }
        )
      } catch {}
    }
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

    const draftId = paymentIntent.metadata.draft_id || null

    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const in7Days  = new Date(Date.now() +  7 * 24 * 60 * 60 * 1000).toISOString()
    const addonFlags = {}
    if (addOns.includes('highlight') || addOns.includes('bundle')) { addonFlags.is_highlighted = true; addonFlags.highlight_ends_at = in30Days }
    if (addOns.includes('boost') || addOns.includes('bundle')) { addonFlags.is_boosted = true; addonFlags.boost_ends_at = in7Days }
    if (addOns.includes('homepage')) { addonFlags.is_homepage_featured = true; addonFlags.homepage_feature_ends_at = in7Days }

    let property, propError

    if (draftId) {
      // Resume from draft — update existing record
      ;({ data: property, error: propError } = await supabaseMarketplace
        .from('properties')
        .update({
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
          inspection_report_url: formData.inspection_report_url || null,
          status: 'under_review',
          ...addonFlags,
        })
        .eq('id', draftId)
        .eq('posted_by', userId)
        .select('id, slug')
        .single())
    } else {
      const slug = generateSlug()
      ;({ data: property, error: propError } = await supabaseMarketplace
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
          inspection_report_url: formData.inspection_report_url || null,
          status: 'under_review',
          posted_by: userId,
          ...addonFlags,
        })
        .select('id, slug')
        .single())
    }

    if (propError) {
      console.error('[Stripe Webhook] Failed to create listing:', propError.message)
      return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
    }

    // Build itemized breakdown for billing display
    const ADD_ON_PRICES = {
      highlight: { label: 'Highlight Listing',                      amount: 999  },
      homepage:  { label: 'Feature on Homepage',                    amount: 2900 },
      boost:     { label: 'Boost Listing',                          amount: 1499 },
      bundle:    { label: 'Full Visibility Bundle (Highlight + Boost)', amount: 2200 },
    }
    const addOns = paymentIntent.metadata.add_ons ? paymentIntent.metadata.add_ons.split(',').filter(Boolean) : []
    const addOnItems = addOns.map(id => ({ id, label: ADD_ON_PRICES[id]?.label || id, amount: ADD_ON_PRICES[id]?.amount || 0 }))
    const breakdown = JSON.stringify({
      title: formData.title || '',
      address: formData.address || '',
      base: { label: 'Listing Fee', amount: 2900 },
      addons: addOnItems,
    })

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
      description: breakdown,
    })

    console.log('[Stripe Webhook] Fallback listing created:', property.id)

    // Kick off AI moderation in background
    setTimeout(() => moderateProperty(property.id).catch(console.error), 0)
  }

  return NextResponse.json({ received: true })
}
