import { NextResponse } from 'next/server'
import { createClient } from '@airostack/client'
import { normalizeManualProperty } from '@/lib/propertyMappers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    const { data } = await supabase
      .from('properties')
      .select('id, slug, address, city, state, zipcode, latitude, longitude, price, bedrooms, bathrooms, floor_area, property_type, status, is_homepage_featured, created_at, posted_by, property_images(image_url, image_key, sort_order)')
      .eq('status', 'active')
      .eq('is_homepage_featured', true)
      .order('created_at', { ascending: false })
      .limit(4)

    const properties = (data || []).map(p => normalizeManualProperty(p, p.property_images || [])).filter(Boolean)
    return NextResponse.json({ properties })
  } catch {
    return NextResponse.json({ properties: [] })
  }
}
