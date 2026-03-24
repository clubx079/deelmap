import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import {
  normalizeWholesaleDeal,
  mergeAndSortProperties
} from '@/lib/propertyMappers';

const supabaseMarketplace = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100); // Cap at 100
    const offset = (page - 1) * limit;
    const sortBy = searchParams.get('sortBy') || 'newest';
    const searchQuery = searchParams.get('searchQuery') || '';

    const propertyTypes = searchParams.get('propertyTypes')?.split(',').filter(Boolean) || [];
    const minPrice = parseFloat(searchParams.get('minPrice')) || null;
    const maxPrice = parseFloat(searchParams.get('maxPrice')) || null;
    const minBedrooms = parseInt(searchParams.get('minBedrooms')) || null;
    const maxBedrooms = parseInt(searchParams.get('maxBedrooms')) || null;
    const minBathrooms = parseInt(searchParams.get('minBathrooms')) || null;
    const maxBathrooms = parseInt(searchParams.get('maxBathrooms')) || null;
    const minSqft = parseInt(searchParams.get('minSqft')) || null;
    const maxSqft = parseInt(searchParams.get('maxSqft')) || null;
    const minYield = parseFloat(searchParams.get('minYield')) || null;
    const maxYield = parseFloat(searchParams.get('maxYield')) || null;
    const minCapRate = parseFloat(searchParams.get('minCapRate')) || null;
    const maxCapRate = parseFloat(searchParams.get('maxCapRate')) || null;
    const cities = searchParams.get('cities')?.split(',').filter(Boolean) || [];
    const states = searchParams.get('states')?.split(',').filter(Boolean) || [];

    // Step 1: Get deal IDs + data (no photos — fast query)
    const dealCols = [
      'id', 'slug', 'address', 'full_address', 'city', 'state', 'zip_code',
      'address_google_lat', 'address_google_lng',
      'price', 'bedrooms', 'bathrooms', 'sqft', 'property_type', 'status',
      'gross_yield', 'cap_rate', 'cash_on_cash', 'price_per_square_foot',
      'year_built', 'lot_size',
      'created_at', 'updated_at', 'temp_seller_id',
      'estimated_rent', 'purchase_price'
    ].join(',');

    let query = supabaseMarketplace
      .from('wholesale_deals')
      .select(dealCols, { count: 'exact' })
      .eq('status', 'active')
      .eq('is_incomplete', false);

    // Sorting
    if (sortBy === 'price-low') {
      query = query.order('price', { ascending: true, nullsFirst: false });
    } else if (sortBy === 'price-high') {
      query = query.order('price', { ascending: false, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Filters
    if (propertyTypes.length > 0) query = query.in('property_type', propertyTypes);
    if (minPrice !== null) query = query.gte('price', minPrice);
    if (maxPrice !== null) query = query.lte('price', maxPrice);
    if (minBedrooms !== null) query = query.gte('bedrooms', minBedrooms);
    if (maxBedrooms !== null) query = query.lte('bedrooms', maxBedrooms);
    if (minBathrooms !== null) query = query.gte('bathrooms', minBathrooms);
    if (maxBathrooms !== null) query = query.lte('bathrooms', maxBathrooms);
    if (minSqft !== null) query = query.gte('sqft', minSqft);
    if (maxSqft !== null) query = query.lte('sqft', maxSqft);
    if (minYield !== null) query = query.gte('gross_yield', minYield);
    if (maxYield !== null) query = query.lte('gross_yield', maxYield);
    if (minCapRate !== null) query = query.gte('cap_rate', minCapRate);
    if (maxCapRate !== null) query = query.lte('cap_rate', maxCapRate);
    if (cities.length > 0) query = query.in('city', cities);
    if (states.length > 0) query = query.in('state', states);
    if (searchQuery) {
      const q = `%${searchQuery}%`;
      query = query.or(`address.ilike.${q},full_address.ilike.${q},city.ilike.${q},state.ilike.${q},zip_code.ilike.${q}`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: deals, count: totalCount, error: dealError } = await query;

    if (dealError) {
      console.error('[DEALS-API] Query error:', dealError);
      throw dealError;
    }

    // Step 2: Get featured photos for these deals (one query, only featured)
    const dealIds = (deals || []).map(d => d.id);
    let photosMap = {};

    if (dealIds.length > 0) {
      const { data: photos } = await supabaseMarketplace
        .from('property_photos')
        .select('deal_id, photo_url, optimized_url, is_featured')
        .in('deal_id', dealIds)
        .eq('is_featured', true);

      // Map featured photos by deal_id
      for (const p of (photos || [])) {
        photosMap[p.deal_id] = [p];
      }

      // For deals without a featured photo, get their first photo
      const missingIds = dealIds.filter(id => !photosMap[id]);
      if (missingIds.length > 0) {
        const { data: fallbackPhotos } = await supabaseMarketplace
          .from('property_photos')
          .select('deal_id, photo_url, optimized_url')
          .in('deal_id', missingIds)
          .order('display_order', { ascending: true })
          .limit(missingIds.length); // ~1 per deal

        // Group by deal_id, take first
        for (const p of (fallbackPhotos || [])) {
          if (!photosMap[p.deal_id]) {
            photosMap[p.deal_id] = [{ ...p, is_featured: true }];
          }
        }
      }

      // Get photo counts per deal
      const { data: counts } = await supabaseMarketplace
        .from('property_photos')
        .select('deal_id')
        .in('deal_id', dealIds);

      const countMap = {};
      for (const c of (counts || [])) {
        countMap[c.deal_id] = (countMap[c.deal_id] || 0) + 1;
      }

      // Attach photos and counts to deals
      for (const deal of (deals || [])) {
        deal.property_photos = photosMap[deal.id] || [];
        deal.photo_count = countMap[deal.id] || 0;
      }
    }

    // Normalize
    const properties = (deals || []).map(normalizeWholesaleDeal).filter(Boolean);
    const hasMore = (totalCount || 0) > offset + limit;

    return NextResponse.json({
      success: true,
      properties,
      totalCount: totalCount || 0,
      page,
      limit,
      hasMore,
      metadata: {
        wholesaleCount: totalCount || 0,
        manualCount: 0,
        searchApplied: !!searchQuery,
        sortBy
      }
    });

  } catch (error) {
    console.error('[DEALS-API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch properties',
      properties: [],
      totalCount: 0,
      hasMore: false
    }, { status: 500 });
  }
}
