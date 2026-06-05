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
  // property_types check intentionally omitted — scraper data is not reliable enough
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
          from: 'DeelMap <notifications@deelmap.com>',
          to: user.email,
          subject: `New deal matching your buy box — ${address}`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;">
      <tr>
        <td style="background:#ffffff;padding:12px 40px;text-align:center;border-bottom:2px solid #D03839;">
          <img src="https://deelmap.com/deelmap.png" alt="DeelMap" height="72" style="display:inline-block;height:72px;width:auto;border:0;" />
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px 32px;background:#ffffff;">
          <p style="margin:0 0 6px;font-size:14px;color:#737370;">Hi${user.first_name ? ` ${user.first_name}` : ' there'},</p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A1816;letter-spacing:-0.4px;line-height:1.25;">A new deal matches your buy box</h1>
          <p style="margin:0 0 28px;font-size:14px;line-height:1.65;color:#737370;">We found a listing that fits your preferred buying criteria.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background:#FAFAF8;border:1px solid #E8E8E4;border-radius:4px;padding:20px;">
              <p style="margin:0 0 4px;font-size:24px;font-weight:800;color:#D03839;">${price}</p>
              <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#1A1816;">${address}</p>
              ${deal.bedrooms || deal.bathrooms ? `<p style="margin:0 0 4px;font-size:13px;color:#737370;">${[deal.bedrooms ? `${deal.bedrooms} bed${deal.bedrooms !== 1 ? 's' : ''}` : null, deal.bathrooms ? `${deal.bathrooms} bath${deal.bathrooms !== 1 ? 's' : ''}` : null].filter(Boolean).join(' &middot; ')}</p>` : ''}
              ${deal.city ? `<p style="margin:0;font-size:13px;color:#737370;">${deal.city}, ${deal.state}</p>` : ''}
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background:#D03839;border-radius:4px;">
              <a href="${dealUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View Deal →</a>
            </td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;border-top:1px solid #E8E8E4;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#A8A8A4;">You're receiving this because you have buy box alerts enabled. <a href="https://deelmap.com/profile" style="color:#737370;text-decoration:underline;">Manage notifications</a></p>
          <p style="margin:4px 0 0;font-size:12px;color:#A8A8A4;">© 2026 DeelMap. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </td></tr></table>
</body>
</html>
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
