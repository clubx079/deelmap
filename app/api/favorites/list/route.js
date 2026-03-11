import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeWholesaleDeal, normalizeManualProperty } from '@/lib/propertyMappers';

// Use service role so we can read user_favorites, wholesale_deals, and properties regardless of RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
);

/**
 * GET /api/favorites/list
 * Returns full property details for the authenticated user's saved properties.
 * Fetches from both wholesale_deals and properties (manual), merges and sorts by save date.
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.replace('Bearer ', '');

    const { data: favorites, error: favError } = await supabase
      .from('user_favorites')
      .select('property_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (favError) {
      console.error('Error fetching favorites:', favError);
      return NextResponse.json({ error: 'Failed to load favorites' }, { status: 500 });
    }

    const list = favorites || [];
    const propertyIds = list.map((f) => f.property_id);
    const favoritesMap = new Map(list.map((f) => [f.property_id, f.created_at]));

    if (propertyIds.length === 0) {
      return NextResponse.json({ properties: [], count: 0 });
    }

    const { data: wholesaleRows, error: wholesaleError } = await supabase
      .from('wholesale_deals')
      .select(
        `
        *,
        property_photos (
          id,
          photo_url,
          optimized_url,
          display_order,
          is_featured
        )
      `
      )
      .in('id', propertyIds);

    if (wholesaleError) {
      console.error('Error fetching wholesale deals:', wholesaleError);
    }

    const { data: manualRows, error: manualError } = await supabase
      .from('properties')
      .select(
        `
        *,
        property_images (
          id,
          image_url,
          image_key,
          sort_order
        )
      `
      )
      .in('id', propertyIds);

    if (manualError) {
      console.error('Error fetching manual properties:', manualError);
    }

    const wholesaleList = (wholesaleRows || []).map(normalizeWholesaleDeal).filter(Boolean);
    const manualList = (manualRows || []).map((p) => normalizeManualProperty(p, p.property_images || [])).filter(Boolean);

    const byId = new Map();
    wholesaleList.forEach((p) => byId.set(p.id, p));
    manualList.forEach((p) => byId.set(p.id, p));

    const sorted = propertyIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .sort((a, b) => {
        const aDate = favoritesMap.get(a.id) || 0;
        const bDate = favoritesMap.get(b.id) || 0;
        return new Date(bDate) - new Date(aDate);
      });

    return NextResponse.json({ properties: sorted, count: sorted.length });
  } catch (err) {
    console.error('Favorites list error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
