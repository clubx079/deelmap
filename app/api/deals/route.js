import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { normalizeWholesaleDeal, normalizeManualProperty } from '@/lib/propertyMappers';

const supabaseMarketplace = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
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

    // Query 1: Get deals with ONLY featured photo (using Supabase transform for speed)
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
      .select(`${dealCols}, property_photos(photo_url, optimized_url, is_featured)`, { count: 'exact' })
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
      console.error('[DEALS-API] Error:', dealError);
      throw dealError;
    }

    // Process: pick featured photo, count photos
    const properties = (deals || []).map(deal => {
      const allPhotos = deal.property_photos || [];
      const featured = allPhotos.find(p => p.is_featured) || allPhotos[0];

      // Replace full photo array with just the featured one for the card
      deal.photo_count = allPhotos.length;
      deal.property_photos = featured ? [{
        photo_url: featured.optimized_url || featured.photo_url,
        optimized_url: featured.optimized_url || null,
        is_featured: true
      }] : [];

      return normalizeWholesaleDeal(deal);
    }).filter(Boolean);

    // Also fetch manual seller properties (safe — won't crash if table empty or missing)
    let manualProperties = [];
    let manualCount = 0;
    try {
      const { data: manualData, count: mCount } = await supabaseMarketplace
        .from('properties')
        .select(`
          id, slug, address, state, latitude, longitude,
          price, bedrooms, bathrooms, floor_area, property_type, status,
          created_at, updated_at, seller_id,
          property_images (image_url, image_key, sort_order)
        `, { count: 'exact' })
        .in('status', ['active', 'published'])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      manualCount = mCount || 0;
      if (manualData && manualData.length > 0) {
        manualProperties = manualData.map(p => normalizeManualProperty(p, p.property_images || [])).filter(Boolean);
      }
    } catch {
      // Silently skip — manual properties are optional
    }

    const allProperties = [...properties, ...manualProperties];
    const combinedTotal = (totalCount || 0) + manualCount;
    const hasMore = combinedTotal > offset + limit;

    return NextResponse.json({
      success: true,
      properties: allProperties,
      totalCount: combinedTotal,
      page,
      limit,
      hasMore,
      metadata: {
        wholesaleCount: totalCount || 0,
        manualCount,
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
