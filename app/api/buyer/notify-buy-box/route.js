import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function dealMatchesBuyBox(deal, box) {
  if (box.min_price && deal.price < box.min_price) return false
  if (box.max_price && deal.price > box.max_price) return false
  if (box.property_types?.length && !box.property_types.includes(deal.property_type)) return false
  if (box.min_beds && (deal.bedrooms || 0) < box.min_beds) return false
  if (box.min_baths && (deal.bathrooms || 0) < box.min_baths) return false
  if (box.deal_types?.length) {
    const dealType = deal.listing_type || 'wholesale'
    if (!box.deal_types.includes(dealType)) return false
  }
  if (box.locations?.length) {
    const cityLower = (deal.city || '').toLowerCase()
    const stateLower = (deal.state || '').toLowerCase()
    const matched = box.locations.some(loc => {
      const l = loc.toLowerCase()
      return l.includes(cityLower) || cityLower.includes(l) ||
             l.includes(stateLower) || stateLower.includes(l)
    })
    if (!matched) return false
  }
  return true
}

export async function POST(req) {
  try {
    const { source, id } = await req.json()
    if (!source || !id) return NextResponse.json({ error: 'Missing source or id' }, { status: 400 })

    // Fetch the deal
    let deal = null
    if (source === 'wholesale') {
      const { data } = await supabase
        .from('wholesale_deals')
        .select('id, slug, price, property_type, city, state, bedrooms, bathrooms, listing_type, address, full_address, status')
        .eq('id', id)
        .maybeSingle()
      deal = data
    } else if (source === 'manual') {
      const { data } = await supabase
        .from('properties')
        .select('id, slug, price, property_type, city, state, bedrooms, bathrooms, address, status, property_status, floor_area')
        .eq('id', id)
        .maybeSingle()
      if (data) {
        deal = { ...data, listing_type: 'wholesale', bathrooms: data.bathrooms }
      }
    }

    if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

    // Only notify for active/available listings
    const isActive = deal.status === 'active' || deal.status === 'available' || deal.property_status === 'available'
    if (!isActive) return NextResponse.json({ sent: 0, reason: 'not active' })

    // Fetch all active buy boxes with user info
    const { data: buyBoxes } = await supabase
      .from('buyer_buy_boxes')
      .select('*, users!inner(id, email, first_name, notification_preferences)')
      .eq('is_active', true)

    if (!buyBoxes?.length) return NextResponse.json({ sent: 0 })

    const matched = buyBoxes.filter(box => {
      const prefs = box.users?.notification_preferences || {}
      if (!prefs.buyBoxMatch) return false
      return dealMatchesBuyBox(deal, box)
    })

    if (!matched.length) return NextResponse.json({ sent: 0 })

    if (!resend) return NextResponse.json({ error: 'Resend not configured' }, { status: 500 })

    const dealUrl = `https://deelmap.com/${deal.slug || deal.id}`
    const price = deal.price ? `$${Number(deal.price).toLocaleString('en-US')}` : 'Contact for price'
    const address = deal.full_address || deal.address || `${deal.city || ''}, ${deal.state || ''}`

    let sent = 0
    for (const box of matched) {
      const user = box.users
      if (!user?.email) continue
      try {
        await resend.emails.send({
          from: 'DeelMap <noreply@deelmap.com>',
          to: user.email,
          subject: `New deal matching your buy box — ${address}`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#fff;">
              <div style="background:#1A1816;padding:24px 32px;">
                <span style="color:#D03839;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Deel</span><span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Map</span>
              </div>
              <div style="padding:32px;">
                <p style="margin:0 0 8px;font-size:14px;color:#737370;">New deal alert</p>
                <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#1A1816;line-height:1.3;">${address}</h1>
                <div style="border:1px solid #E8E8E4;border-radius:8px;padding:20px;margin-bottom:24px;">
                  <p style="margin:0 0 4px;font-size:28px;font-weight:800;color:#D03839;">${price}</p>
                  ${deal.bedrooms ? `<p style="margin:8px 0 0;font-size:14px;color:#737370;">${deal.bedrooms} bed${deal.bedrooms !== 1 ? 's' : ''} &middot; ${deal.bathrooms || 0} bath${deal.bathrooms !== 1 ? 's' : ''}</p>` : ''}
                  ${deal.city ? `<p style="margin:4px 0 0;font-size:14px;color:#737370;">${deal.city}, ${deal.state}</p>` : ''}
                  ${deal.property_type ? `<p style="margin:4px 0 0;font-size:14px;color:#737370;">${deal.property_type}</p>` : ''}
                </div>
                <a href="${dealUrl}" style="display:inline-block;background:#D03839;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;">View Deal</a>
              </div>
              <div style="padding:16px 32px;border-top:1px solid #E8E8E4;">
                <p style="margin:0;font-size:12px;color:#A8A8A4;">You're receiving this because you have buy box alerts on. <a href="https://deelmap.com/profile/settings" style="color:#737370;text-decoration:underline;">Manage notifications</a></p>
              </div>
            </div>
          `
        })
        sent++
      } catch (e) {
        console.error(`[notify-buy-box] Failed to send to ${user.email}:`, e)
      }
    }

    console.log(`[notify-buy-box] source=${source} id=${id} matched=${matched.length} sent=${sent}`)
    return NextResponse.json({ sent })
  } catch (e) {
    console.error('[notify-buy-box] Error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
