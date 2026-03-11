import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  normalizeWholesaleDeal,
  normalizeManualProperty,
  mergeAndSortProperties
} from '@/lib/propertyMappers';

const supabaseMarketplace = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Unified Deals API
 * Fetches and merges properties from both wholesale_deals and properties tables
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - sortBy: 'newest', 'price-low', 'price-high' (default: 'newest')
 * - searchQuery: Search term for address/city/state
 * - propertyTypes: Comma-separated property types
 * - minPrice, maxPrice: Price range
 * - minBedrooms, maxBedrooms: Bedroom range
 * - minBathrooms, maxBathrooms: Bathroom range
 * - minSqft, maxSqft: Square footage range
 * - minYield, maxYield: Gross yield range
 * - minCapRate, maxCapRate: Cap rate range
 * - cities: Comma-separated cities
 * - states: Comma-separated states
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // Sorting
    const sortBy = searchParams.get('sortBy') || 'newest';
    
    // Search
    const searchQuery = searchParams.get('searchQuery') || '';
    
    // Filters
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

    // ==================== FETCH WHOLESALE DEALS ====================
    // Select only needed columns (avoid large text fields that cause timeouts)
    const wholesaleCols = [
      'id', 'slug', 'address', 'full_address', 'city', 'state', 'zip_code',
      'address_google_lat', 'address_google_lng',
      'price', 'bedrooms', 'bathrooms', 'sqft', 'property_type', 'status',
      'gross_yield', 'cap_rate', 'cash_on_cash', 'price_per_square_foot',
      'year_built', 'lot_size', 'description',
      'created_at', 'updated_at', 'temp_seller_id',
      'estimated_rent', 'purchase_price'
    ].join(',');

    let wholesaleQuery = supabaseMarketplace
      .from('wholesale_deals')
      .select(`
        ${wholesaleCols},
        property_photos (
          id,
          photo_url,
          optimized_url,
          original_url,
          display_order
        )
      `, { count: 'exact' })
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    // Apply filters to wholesale deals
    if (propertyTypes.length > 0) {
      wholesaleQuery = wholesaleQuery.in('property_type', propertyTypes);
    }
    if (minPrice !== null) {
      wholesaleQuery = wholesaleQuery.gte('price', minPrice);
    }
    if (maxPrice !== null) {
      wholesaleQuery = wholesaleQuery.lte('price', maxPrice);
    }
    if (minBedrooms !== null) {
      wholesaleQuery = wholesaleQuery.gte('bedrooms', minBedrooms);
    }
    if (maxBedrooms !== null) {
      wholesaleQuery = wholesaleQuery.lte('bedrooms', maxBedrooms);
    }
    if (minBathrooms !== null) {
      wholesaleQuery = wholesaleQuery.gte('bathrooms', minBathrooms);
    }
    if (maxBathrooms !== null) {
      wholesaleQuery = wholesaleQuery.lte('bathrooms', maxBathrooms);
    }
    if (minSqft !== null) {
      wholesaleQuery = wholesaleQuery.gte('sqft', minSqft);
    }
    if (maxSqft !== null) {
      wholesaleQuery = wholesaleQuery.lte('sqft', maxSqft);
    }
    if (minYield !== null) {
      wholesaleQuery = wholesaleQuery.gte('gross_yield', minYield);
    }
    if (maxYield !== null) {
      wholesaleQuery = wholesaleQuery.lte('gross_yield', maxYield);
    }
    if (minCapRate !== null) {
      wholesaleQuery = wholesaleQuery.gte('cap_rate', minCapRate);
    }
    if (maxCapRate !== null) {
      wholesaleQuery = wholesaleQuery.lte('cap_rate', maxCapRate);
    }
    if (cities.length > 0) {
      wholesaleQuery = wholesaleQuery.in('city', cities);
    }
    if (states.length > 0) {
      wholesaleQuery = wholesaleQuery.in('state', states);
    }
    // Push search to DB level
    if (searchQuery) {
      const q = `%${searchQuery}%`;
      wholesaleQuery = wholesaleQuery.or(`address.ilike.${q},full_address.ilike.${q},city.ilike.${q},state.ilike.${q},zip_code.ilike.${q}`);
    }
    // Cap results to prevent statement timeout
    wholesaleQuery = wholesaleQuery.limit(500);

    const { data: wholesaleDeals, count: wholesaleCount, error: wholesaleError } = await wholesaleQuery;

    if (wholesaleError) {
      console.error('Error fetching wholesale deals:', wholesaleError);
      throw wholesaleError;
    }

    // ==================== FETCH MANUAL PROPERTIES ====================
    const manualCols = [
      'id', 'slug', 'address', 'city', 'state', 'zip_code', 'postal_code',
      'latitude', 'longitude',
      'price', 'bedrooms', 'bathrooms', 'floor_area', 'property_type', 'status', 'property_status',
      'gross_yield', 'cap_rate', 'cash_on_cash', 'price_per_square_foot',
      'year_built', 'lot_size', 'description',
      'created_at', 'updated_at', 'seller_id',
      'estimated_rent', 'monthly_rent', 'purchase_price'
    ].join(',');

    let manualQuery = supabaseMarketplace
      .from('properties')
      .select(`
        ${manualCols},
        property_images (
          id,
          image_url,
          image_key,
          sort_order
        )
      `, { count: 'exact' })
      .in('status', ['active', 'published'])
      .not('status', 'is', null)
      .order('created_at', { ascending: false });

    // Apply filters to manual properties
    if (propertyTypes.length > 0) {
      manualQuery = manualQuery.in('property_type', propertyTypes);
    }
    if (minPrice !== null) {
      manualQuery = manualQuery.gte('price', minPrice);
    }
    if (maxPrice !== null) {
      manualQuery = manualQuery.lte('price', maxPrice);
    }
    if (minBedrooms !== null) {
      manualQuery = manualQuery.gte('bedrooms', minBedrooms);
    }
    if (maxBedrooms !== null) {
      manualQuery = manualQuery.lte('bedrooms', maxBedrooms);
    }
    if (minBathrooms !== null) {
      manualQuery = manualQuery.gte('bathrooms', minBathrooms);
    }
    if (maxBathrooms !== null) {
      manualQuery = manualQuery.lte('bathrooms', maxBathrooms);
    }
    if (minSqft !== null) {
      manualQuery = manualQuery.gte('floor_area', minSqft);
    }
    if (maxSqft !== null) {
      manualQuery = manualQuery.lte('floor_area', maxSqft);
    }
    if (minYield !== null) {
      manualQuery = manualQuery.gte('gross_yield', minYield);
    }
    if (maxYield !== null) {
      manualQuery = manualQuery.lte('gross_yield', maxYield);
    }
    if (minCapRate !== null) {
      manualQuery = manualQuery.gte('cap_rate', minCapRate);
    }
    if (maxCapRate !== null) {
      manualQuery = manualQuery.lte('cap_rate', maxCapRate);
    }
    if (cities.length > 0) {
      manualQuery = manualQuery.in('city', cities);
    }
    if (states.length > 0) {
      manualQuery = manualQuery.in('state', states);
    }
    if (searchQuery) {
      const q = `%${searchQuery}%`;
      manualQuery = manualQuery.or(`address.ilike.${q},city.ilike.${q},state.ilike.${q},zip_code.ilike.${q}`);
    }
    manualQuery = manualQuery.limit(500);

    const { data: manualProperties, count: manualCount, error: manualError } = await manualQuery;

    if (manualError) {
      console.error('Error fetching manual properties:', manualError);
      throw manualError;
    }

    // ==================== NORMALIZE DATA ====================
    const normalizedWholesale = (wholesaleDeals || []).map(normalizeWholesaleDeal);
    
    const normalizedManual = (manualProperties || []).map(property => 
      normalizeManualProperty(property, property.property_images || [])
    );

    // ==================== MERGE & SORT ====================
    const allProperties = mergeAndSortProperties(normalizedWholesale, normalizedManual, sortBy);

    // Total count from DB (search already applied at DB level)
    const totalCount = (wholesaleCount || 0) + (manualCount || 0);
    const hasMore = totalCount > offset + limit;

    // Apply pagination
    const paginatedProperties = allProperties.slice(offset, offset + limit);

    // ==================== RETURN RESPONSE ====================
    return NextResponse.json({
      success: true,
      properties: paginatedProperties,
      totalCount,
      page,
      limit,
      hasMore,
      metadata: {
        wholesaleCount: wholesaleCount || 0,
        manualCount: manualCount || 0,
        totalBeforeSearch: (wholesaleCount || 0) + (manualCount || 0),
        searchApplied: !!searchQuery,
        sortBy
      }
    });

  } catch (error) {
    console.error('Error in unified deals API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch properties',
        properties: [],
        totalCount: 0,
        hasMore: false
      },
      { status: 500 }
    );
  }
}
