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
    const limit = parseInt(searchParams.get('limit') || '5000');
    const offset = (page - 1) * limit;
    const sortBy = searchParams.get('sortBy') || 'newest';
    const searchQuery = searchParams.get('searchQuery') || '';

    const rawPropertyTypes = searchParams.get('propertyTypes')?.split(',').filter(Boolean) || [];
    // Expand each type to cover both hyphenated and spaced variants (e.g. "Multi-Family" ↔ "Multi Family")
    const propertyTypes = rawPropertyTypes.length > 0
      ? [...new Set(rawPropertyTypes.flatMap(t => {
          const variants = [t]
          if (/multi.?family/i.test(t)) variants.push('Multi Family', 'Multi-Family', 'Multifamily')
          if (/single.?family/i.test(t)) variants.push('Single Family', 'Single-Family')
          if (/mobile.?home/i.test(t)) variants.push('Mobile Home', 'Mobile-Home', 'Manufactured Home')
          return variants
        }))]
      : [];
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
    const isHighlighted = searchParams.get('isHighlighted') === 'true';
    const isBoosted = searchParams.get('isBoosted') === 'true';
    const isHomepageFeatured = searchParams.get('isHomepageFeatured') === 'true';
    const listingType = searchParams.get('listingType') || null; // 'wholesale' | 'auction' | null=all
    const listingStatus = searchParams.get('listingStatus') || 'active'; // 'active' | 'pending' | 'sold'

    // Query 1: Get deals with ONLY featured photo (using Supabase transform for speed)
    const dealCols = [
      'id', 'slug', 'address', 'full_address', 'city', 'state', 'zip_code',
      'address_google_lat', 'address_google_lng',
      'price', 'bedrooms', 'bathrooms', 'sqft', 'property_type', 'status',
      'listing_type', 'auction_date', 'auction_time', 'auction_location',
      'gross_yield', 'cap_rate', 'cash_on_cash', 'price_per_square_foot',
      'year_built', 'lot_size',
      'created_at', 'updated_at', 'temp_seller_id',
      'estimated_rent', 'purchase_price'
    ].join(',');

    const validStatuses = ['active', 'pending', 'sold'];
    const statusToFilter = validStatuses.includes(listingStatus) ? listingStatus : 'active';

    let query = supabaseMarketplace
      .from('wholesale_deals')
      .select(`${dealCols}, property_photos!left(photo_url, optimized_url, is_featured), temp_seller_logins!temp_seller_id(seller_name)`, { count: 'exact' })
      .eq('status', statusToFilter)
      .eq('is_incomplete', false)
      .eq('property_photos.is_featured', true);

    // Sorting
    if (sortBy === 'price-low') {
      query = query.order('price', { ascending: true, nullsFirst: false });
    } else if (sortBy === 'price-high') {
      query = query.order('price', { ascending: false, nullsFirst: false });
    } else if (sortBy === 'roi') {
      query = query.order('cash_on_cash', { ascending: false, nullsFirst: false });
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
    const minCashOnCash = parseFloat(searchParams.get('minCashOnCash')) || null;
    const maxCashOnCash = parseFloat(searchParams.get('maxCashOnCash')) || null;
    if (minCashOnCash !== null) query = query.gte('cash_on_cash', minCashOnCash);
    if (maxCashOnCash !== null) query = query.lte('cash_on_cash', maxCashOnCash);
    if (cities.length > 0) query = query.in('city', cities);
    if (states.length > 0) query = query.in('state', states);
    if (listingType === 'auction') {
      query = query.eq('listing_type', 'auction');
    } else if (listingType === 'wholesale') {
      query = query.or('listing_type.is.null,listing_type.neq.auction');
    }

    const stateNameToAbbr = {
      'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
      'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
      'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
      'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
      'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
      'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
      'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
      'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
      'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
      'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
    };

    if (searchQuery) {
      const rawTerm = searchQuery.trim();

      // Handle "City, State" format from Google Places autocomplete (e.g. "Lexington, Kentucky")
      const commaIdx = rawTerm.indexOf(',');
      if (commaIdx > 0) {
        const cityPart = rawTerm.substring(0, commaIdx).trim();
        const statePart = rawTerm.substring(commaIdx + 1).trim();
        const stateAbbrFromName = stateNameToAbbr[statePart.toLowerCase()];
        // State could be full name ("Kentucky") or abbreviation ("KY")
        const stateAbbrFinal = stateAbbrFromName || (statePart.length === 2 ? statePart.toUpperCase() : null);
        const cq = `%${cityPart}%`;
        if (stateAbbrFinal) {
          query = query.ilike('city', cq).eq('state', stateAbbrFinal);
        } else {
          query = query.or(`address.ilike.${cq},full_address.ilike.${cq},city.ilike.${cq}`);
        }
      } else {
        let searchTerm = rawTerm.replace(/[(),%]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!searchTerm) searchTerm = rawTerm;
        const stateAbbr = stateNameToAbbr[searchTerm.toLowerCase()];
        const q = `%${searchTerm}%`;
        if (stateAbbr) {
          query = query.or(`address.ilike.${q},full_address.ilike.${q},city.ilike.${q},state.eq.${stateAbbr},zip_code.ilike.${q}`);
        } else {
          query = query.or(`address.ilike.${q},full_address.ilike.${q},city.ilike.${q},state.ilike.${q},zip_code.ilike.${q}`);
        }
      }
    }

    query = query.range(offset, offset + limit - 1);

    // Build manual properties query
    let manualQuery = supabaseMarketplace
      .from('properties')
      .select(`
        id, slug, address, city, state, zipcode, latitude, longitude,
        price, bedrooms, bathrooms, floor_area, property_type, status,
        is_homepage_featured, is_highlighted, is_boosted, created_at, updated_at, seller_id, posted_by,
        property_images!left (image_url, image_key, sort_order)
      `, { count: 'exact' })
      .in('status', ['active', 'published'])
      .eq('property_images.sort_order', 0);

    if (sortBy === 'price-low') {
      manualQuery = manualQuery.order('price', { ascending: true, nullsFirst: false });
    } else if (sortBy === 'price-high') {
      manualQuery = manualQuery.order('price', { ascending: false, nullsFirst: false });
    } else {
      manualQuery = manualQuery.order('created_at', { ascending: false });
    }
    if (minPrice !== null) manualQuery = manualQuery.gte('price', minPrice);
    if (maxPrice !== null) manualQuery = manualQuery.lte('price', maxPrice);
    if (minBedrooms !== null) manualQuery = manualQuery.gte('bedrooms', minBedrooms);
    if (maxBedrooms !== null) manualQuery = manualQuery.lte('bedrooms', maxBedrooms);
    if (minBathrooms !== null) manualQuery = manualQuery.gte('bathrooms', minBathrooms);
    if (maxBathrooms !== null) manualQuery = manualQuery.lte('bathrooms', maxBathrooms);
    if (minSqft !== null) manualQuery = manualQuery.gte('floor_area', minSqft);
    if (maxSqft !== null) manualQuery = manualQuery.lte('floor_area', maxSqft);
    if (propertyTypes.length > 0) manualQuery = manualQuery.in('property_type', propertyTypes);
    if (states.length > 0) manualQuery = manualQuery.in('state', states);
    if (searchQuery) {
      const rawTerm = searchQuery.trim();
      const commaIdx = rawTerm.indexOf(',');
      if (commaIdx > 0) {
        const cityPart = rawTerm.substring(0, commaIdx).trim();
        const remainder = rawTerm.substring(commaIdx + 1);
        // Scan each segment after the city for a recognisable state name or 2-letter abbreviation
        // Google Places returns formats like "O'Fallon, St. Clair County, IL, USA"
        let stateAbbrFinal = null;
        for (const seg of remainder.split(',')) {
          const s = seg.trim();
          const fromName = stateNameToAbbr[s.toLowerCase()];
          if (fromName) { stateAbbrFinal = fromName; break; }
          if (s.length === 2 && /^[A-Za-z]{2}$/.test(s)) { stateAbbrFinal = s.toUpperCase(); break; }
        }
        const cq = `%${cityPart}%`;
        if (stateAbbrFinal) {
          manualQuery = manualQuery.ilike('city', cq).eq('state', stateAbbrFinal);
        } else {
          manualQuery = manualQuery.or(`city.ilike.${cq},address.ilike.${cq}`);
        }
      } else {
        const q = `%${rawTerm}%`;
        manualQuery = manualQuery.or(`city.ilike.${q},address.ilike.${q},state.ilike.${q}`);
      }
    }
    if (isHighlighted) manualQuery = manualQuery.eq('is_highlighted', true);
    if (isBoosted) manualQuery = manualQuery.eq('is_boosted', true);
    if (isHomepageFeatured) manualQuery = manualQuery.eq('is_homepage_featured', true);
    manualQuery = manualQuery.range(offset, offset + limit - 1);

    // Skip manual properties when a listing type filter is active — that table has no listing_type
    const runManualQuery = !listingType;

    // Run both queries in parallel — each fails independently
    const [dealsResult, manualResult] = await Promise.allSettled([query, runManualQuery ? manualQuery : Promise.resolve({ data: [], count: 0 })]);

    if (dealsResult.status === 'rejected' || dealsResult.value?.error) {
      const err = dealsResult.value?.error || dealsResult.reason;
      console.error('[DEALS-API] Error:', err);
      throw err;
    }

    const { data: deals, count: totalCount } = dealsResult.value;

    // Fallback: for deals with no featured photo, fetch their first photo by display_order
    const dealsNeedingFallback = (deals || []).filter(d => !d.property_photos?.length).map(d => d.id);
    if (dealsNeedingFallback.length > 0) {
      const { data: fallbackPhotos } = await supabaseMarketplace
        .from('property_photos')
        .select('deal_id, photo_url, optimized_url')
        .in('deal_id', dealsNeedingFallback)
        .order('display_order', { ascending: true });

      const fallbackMap = {};
      for (const p of (fallbackPhotos || [])) {
        if (!fallbackMap[p.deal_id]) fallbackMap[p.deal_id] = p;
      }
      (deals || []).forEach(deal => {
        if (!deal.property_photos?.length && fallbackMap[deal.id]) {
          deal.property_photos = [{ ...fallbackMap[deal.id], is_featured: false }];
        }
      });
    }

    // Process: format featured photo for card
    const properties = (deals || []).map(deal => {
      const photo = deal.property_photos?.[0];
      deal.property_photos = photo ? [{
        photo_url: photo.optimized_url || photo.photo_url,
        optimized_url: photo.optimized_url || null,
        is_featured: true
      }] : [];
      return normalizeWholesaleDeal(deal);
    }).filter(Boolean);

    // Process manual properties result — if it failed, silently skip (same as before)
    let manualProperties = [];
    let manualCount = 0;
    try {
      if (manualResult.status === 'fulfilled' && !manualResult.value?.error) {
        const { data: manualData, count: mCount } = manualResult.value;
        manualCount = mCount || 0;
        if (manualData && manualData.length > 0) {
          manualProperties = manualData.map(p => normalizeManualProperty(p, p.property_images || [])).filter(Boolean);
        }
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
