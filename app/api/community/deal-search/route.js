import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/community/auth'

// GET ?q=... — search across properties + wholesale_deals for the post composer
// Returns up to 10 results, each tagged with its kind so the FK gets routed correctly.
export async function GET(request) {
  const q = (new URL(request.url).searchParams.get('q') || '').trim()
  if (q.length < 3) return NextResponse.json({ results: [] })

  const supabase = getServiceClient()
  const like = `%${q.replace(/[%_]/g, m => '\\' + m)}%`

  const [propsRes, wholesaleRes] = await Promise.all([
    supabase.from('properties')
      .select('id, slug, address, price, bedrooms, bathrooms, floor_area, property_status')
      .or(`address.ilike.${like},slug.ilike.${like}`)
      .eq('status', 'published')
      .limit(5),
    supabase.from('wholesale_deals')
      .select('id, slug, address, city, state, zip_code, price, bedrooms, bathrooms, sqft')
      .or(`address.ilike.${like},city.ilike.${like},zip_code.ilike.${like},slug.ilike.${like}`)
      .eq('status', 'active')
      .limit(5),
  ])

  const results = [
    ...(propsRes.data || []).map(p => ({
      kind: 'property',
      id: p.id, slug: p.slug,
      address: p.address,
      price: p.price ? `$${Number(p.price).toLocaleString()}` : null,
      beds: (p.bedrooms != null && p.bathrooms != null) ? `${p.bedrooms}bd/${p.bathrooms}ba` : null,
      sqft: p.floor_area ? `${p.floor_area.toLocaleString()} sqft` : null,
    })),
    ...(wholesaleRes.data || []).map(w => ({
      kind: 'wholesale_deal',
      id: w.id, slug: w.slug,
      address: [w.address, w.city, w.state, w.zip_code].filter(Boolean).join(', '),
      price: w.price ? `$${Number(w.price).toLocaleString()}` : null,
      beds: (w.bedrooms != null && w.bathrooms != null) ? `${w.bedrooms}bd/${w.bathrooms}ba` : null,
      sqft: w.sqft ? `${w.sqft.toLocaleString()} sqft` : null,
    })),
  ]

  return NextResponse.json({ results })
}
