import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
);

// Lightweight endpoint — returns only coordinates + minimal info for map pins
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('wholesale_deals')
      .select('id, slug, address, city, state, price, address_google_lat, address_google_lng')
      .eq('status', 'active')
      .eq('is_incomplete', false)
      .not('address_google_lat', 'is', null)
      .not('address_google_lng', 'is', null);

    if (error) throw error;

    const pins = (data || []).map(d => ({
      id: d.id,
      slug: d.slug,
      address: d.address,
      city: d.city,
      state: d.state,
      price: d.price,
      latitude: d.address_google_lat,
      longitude: d.address_google_lng,
      address_google_lat: d.address_google_lat,
      address_google_lng: d.address_google_lng,
    }));

    // Also include manual seller properties on the map
    try {
      const { data: manualData } = await supabase
        .from('properties')
        .select('id, slug, address, state, latitude, longitude, price')
        .in('status', ['active', 'published'])
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (manualData && manualData.length > 0) {
        for (const p of manualData) {
          pins.push({
            id: p.id,
            slug: p.slug,
            address: p.address,
            city: null,
            state: p.state,
            price: p.price,
            latitude: p.latitude,
            longitude: p.longitude,
            address_google_lat: p.latitude,
            address_google_lng: p.longitude,
          });
        }
      }
    } catch {
      // Silently skip — manual properties are optional
    }

    return NextResponse.json({ success: true, pins, total: pins.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
