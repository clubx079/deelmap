import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@airostack/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ default_payment_method: null })

    const { data: userRow } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .maybeSingle()

    const customerId = userRow?.stripe_customer_id
    if (!customerId) return NextResponse.json({ default_payment_method: null })

    const customer = await stripe.customers.retrieve(customerId)
    const defaultPmId = customer.invoice_settings?.default_payment_method

    if (!defaultPmId) {
      // Fall back to most recently used payment method on the customer
      const paymentMethods = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 })
      const pm = paymentMethods.data[0]
      if (!pm) return NextResponse.json({ default_payment_method: null })
      return NextResponse.json({
        default_payment_method: {
          id: pm.id,
          brand: pm.card?.brand || 'card',
          last4: pm.card?.last4 || '****',
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year,
        }
      })
    }

    const pm = await stripe.paymentMethods.retrieve(defaultPmId)
    return NextResponse.json({
      default_payment_method: {
        id: pm.id,
        brand: pm.card?.brand || 'card',
        last4: pm.card?.last4 || '****',
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year,
      }
    })
  } catch (err) {
    console.error('[buyer/billing/payment-methods]', err)
    return NextResponse.json({ default_payment_method: null })
  }
}
