// /app/api/property-images/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Marketplace DB: property_photos (see ENV_CLEAN.md)
const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: 'Property ID is required' },
        { status: 400 }
      );
    }

    const { data: images, error } = await supabase
      .from('property_photos')
      .select('id, optimized_url, photo_url, original_url, alt_text, display_order')
      .eq('deal_id', propertyId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Failed to fetch images:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const normalized = (images || []).map((image) => ({
      ...image,
      image_url: image.optimized_url || image.photo_url || image.original_url || null
    }));

    return NextResponse.json({ success: true, images: normalized });
  } catch (error) {
    console.error('Error fetching property images:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}