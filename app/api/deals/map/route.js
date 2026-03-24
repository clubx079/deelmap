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

    return NextResponse.json({ success: true, pins, total: pins.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
