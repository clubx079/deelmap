import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@airostack/client'

function getClients() {
  return {
    stripe: new Stripe(process.env.STRIPE_SECRET_KEY),
    supabase: createClient(process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL, process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY),
  }
}

// POST — create Stripe Connect account + return onboarding URL
export async function POST(request) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { stripe, supabase } = getClients()

    const { data: referral } = await supabase
      .from('referrals')
      .select('id, stripe_account_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!referral) return NextResponse.json({ error: 'No referral code found. Generate one first.' }, { status: 404 })

    let accountId = referral.stripe_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'express' })
      accountId = account.id
      await supabase.from('referrals').update({ stripe_account_id: accountId }).eq('id', referral.id)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/buyer/referral?connect=refresh`,
      return_url: `${baseUrl}/buyer/referral?connect=success`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    console.error('[referral connect POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET — check if onboarding is complete
export async function GET(request) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { stripe, supabase } = getClients()

    const { data: referral } = await supabase
      .from('referrals')
      .select('id, stripe_account_id, stripe_onboarding_complete')
      .eq('user_id', userId)
      .maybeSingle()

    if (!referral?.stripe_account_id) return NextResponse.json({ connected: false })

    if (referral.stripe_onboarding_complete) return NextResponse.json({ connected: true })

    const account = await stripe.accounts.retrieve(referral.stripe_account_id)
    if (account.details_submitted) {
      await supabase.from('referrals').update({ stripe_onboarding_complete: true }).eq('id', referral.id)
      return NextResponse.json({ connected: true })
    }

    return NextResponse.json({ connected: false })
  } catch (err) {
    console.error('[referral connect GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
