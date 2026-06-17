import { NextResponse } from 'next/server'
import { getServiceClient, serverError } from '@/lib/community/auth'

// GET — data for the community RightSidebar panels (global, public):
//   trending    = hottest posts right now
//   activeDeals = hottest deal-linked posts (have a property/wholesale deal)
// Kept light: one small query each, no viewer-relative filtering.
export async function GET() {
  const supabase = getServiceClient()

  try {
    const [trendingRes, dealRes] = await Promise.all([
      supabase
        .from('community_posts')
        .select('slug, title, comment_count, hot_score, lot:community_lots!community_posts_lot_id_fkey(name)')
        .eq('is_removed', false)
        .order('hot_score', { ascending: false })
        .limit(3),
      supabase
        .from('community_posts')
        .select('slug, comment_count, hot_score, property_id, wholesale_deal_id')
        .eq('is_removed', false)
        .or('property_id.not.is.null,wholesale_deal_id.not.is.null')
        .order('hot_score', { ascending: false })
        .limit(3),
    ])

    const trending = (trendingRes.data || []).map(p => ({
      slug: p.slug,
      title: p.title,
      lot_name: p.lot?.name || 'Community',
      comment_count: p.comment_count || 0,
    }))

    // Hydrate the deal-linked posts with their address + stats
    const dealPosts = dealRes.data || []
    const propertyIds = dealPosts.filter(p => p.property_id).map(p => p.property_id)
    const wholesaleIds = dealPosts.filter(p => p.wholesale_deal_id).map(p => p.wholesale_deal_id)

    const [propsRes, wholesaleRes] = await Promise.all([
      propertyIds.length
        ? supabase.from('properties').select('id, address, price, bedrooms, bathrooms').in('id', propertyIds)
        : Promise.resolve({ data: [] }),
      wholesaleIds.length
        ? supabase.from('wholesale_deals').select('id, address, price, bedrooms, bathrooms').in('id', wholesaleIds)
        : Promise.resolve({ data: [] }),
    ])
    const propMap = Object.fromEntries((propsRes.data || []).map(p => [p.id, p]))
    const wholesaleMap = Object.fromEntries((wholesaleRes.data || []).map(w => [w.id, w]))

    const activeDeals = dealPosts.map(p => {
      const d = p.property_id ? propMap[p.property_id] : wholesaleMap[p.wholesale_deal_id]
      if (!d) return null
      const price = d.price ? `$${Number(d.price).toLocaleString()}` : null
      const beds = (d.bedrooms != null && d.bathrooms != null) ? `${d.bedrooms}bd/${d.bathrooms}ba` : null
      return {
        post_slug: p.slug,
        address: d.address || 'Deal discussion',
        stats: [price, beds].filter(Boolean).join(' · '),
        live: p.comment_count || 0,
      }
    }).filter(Boolean)

    return NextResponse.json({ trending, activeDeals })
  } catch (e) {
    return serverError(e.message)
  }
}
