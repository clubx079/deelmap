import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
);

// Lightweight endpoint — returns only coordinates + minimal info for map pins
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

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
    const minCashOnCash = parseFloat(searchParams.get('minCashOnCash')) || null;
    const maxCashOnCash = parseFloat(searchParams.get('maxCashOnCash')) || null;
    const states = searchParams.get('states')?.split(',').filter(Boolean) || [];
    const rawPropertyTypes = searchParams.get('propertyTypes')?.split(',').filter(Boolean) || [];
    const propertyTypes = rawPropertyTypes.length > 0
      ? [...new Set(rawPropertyTypes.flatMap(t => {
          const variants = [t]
          if (/multi.?family/i.test(t)) variants.push('Multi Family', 'Multi-Family', 'Multifamily')
          if (/single.?family/i.test(t)) variants.push('Single Family', 'Single-Family')
          if (/mobile.?home/i.test(t)) variants.push('Mobile Home', 'Mobile-Home', 'Manufactured Home')
          return variants
        }))]
      : [];
    const searchQuery = searchParams.get('searchQuery') || '';
    const listingType = searchParams.get('listingType') || '';

    let query = supabase
      .from('wholesale_deals')
      .select('id, slug, address, full_address, city, state, zip_code, price, arv, bedrooms, bathrooms, sqft, listing_type, address_google_lat, address_google_lng, property_photos(photo_url, optimized_url, is_featured, display_order)')
      .eq('status', 'active')
      .eq('is_incomplete', false)
      .neq('state', 'HI')
      .not('address_google_lat', 'is', null)
      .not('address_google_lng', 'is', null);

    // Apply filters
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
    if (minCashOnCash !== null) query = query.gte('cash_on_cash', minCashOnCash);
    if (maxCashOnCash !== null) query = query.lte('cash_on_cash', maxCashOnCash);
    if (propertyTypes.length > 0) query = query.in('property_type', propertyTypes);
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
      const commaIdx = rawTerm.indexOf(',');
      if (commaIdx > 0) {
        const cityPart = rawTerm.substring(0, commaIdx).trim();
        const statePart = rawTerm.substring(commaIdx + 1).trim();
        const stateAbbrFromName = stateNameToAbbr[statePart.toLowerCase()];
        const stateAbbrFinal = stateAbbrFromName || (statePart.length === 2 ? statePart.toUpperCase() : null);
        const cq = `%${cityPart}%`;
        if (stateAbbrFinal) {
          query = query.ilike('city', cq).eq('state', stateAbbrFinal);
        } else {
          query = query.or(`address.ilike.${cq},full_address.ilike.${cq},city.ilike.${cq}`);
        }
      } else {
        const stateAbbr = stateNameToAbbr[rawTerm.toLowerCase()];
        const q = `%${rawTerm}%`;
        if (stateAbbr) {
          query = query.or(`address.ilike.${q},full_address.ilike.${q},city.ilike.${q},state.eq.${stateAbbr},zip_code.ilike.${q}`);
        } else {
          query = query.or(`address.ilike.${q},full_address.ilike.${q},city.ilike.${q},state.ilike.${q},zip_code.ilike.${q}`);
        }
      }
    }

    const { data, error } = await query.range(0, 9999);

    if (error) throw error;

    const pins = (data || []).map(d => ({
      id: d.id,
      slug: d.slug,
      address: d.address,
      full_address: d.full_address,
      city: d.city,
      state: d.state,
      zip_code: d.zip_code,
      price: d.price,
      arv: d.arv,
      bedrooms: d.bedrooms,
      bathrooms: d.bathrooms,
      sqft: d.sqft,
      property_photos: d.property_photos,
      latitude: d.address_google_lat,
      longitude: d.address_google_lng,
      address_google_lat: d.address_google_lat,
      address_google_lng: d.address_google_lng,
    }));

    // Also include manual seller properties on the map with same filters (skip when listing type filter active)
    if (!listingType) try {
      let manualQuery = supabase
        .from('properties')
        .select('id, slug, address, state, latitude, longitude, price, bedrooms, bathrooms, floor_area, property_type, property_images(image_url, sort_order)')
        .in('status', ['active', 'published'])
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (states.length > 0) manualQuery = manualQuery.in('state', states);
      if (minPrice !== null) manualQuery = manualQuery.gte('price', minPrice);
      if (maxPrice !== null) manualQuery = manualQuery.lte('price', maxPrice);
      if (minBedrooms !== null) manualQuery = manualQuery.gte('bedrooms', minBedrooms);
      if (maxBedrooms !== null) manualQuery = manualQuery.lte('bedrooms', maxBedrooms);
      if (minBathrooms !== null) manualQuery = manualQuery.gte('bathrooms', minBathrooms);
      if (maxBathrooms !== null) manualQuery = manualQuery.lte('bathrooms', maxBathrooms);
      if (minSqft !== null) manualQuery = manualQuery.gte('floor_area', minSqft);
      if (maxSqft !== null) manualQuery = manualQuery.lte('floor_area', maxSqft);
      if (propertyTypes.length > 0) manualQuery = manualQuery.in('property_type', propertyTypes);
      if (searchQuery) {
        const rawTerm = searchQuery.trim();
        const commaIdx = rawTerm.indexOf(',');
        if (commaIdx > 0) {
          const cityPart = rawTerm.substring(0, commaIdx).trim();
          const remainder = rawTerm.substring(commaIdx + 1);
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

      const { data: manualData } = await manualQuery.range(0, 9999);

      if (manualData && manualData.length > 0) {
        for (const p of manualData) {
          const imgs = Array.isArray(p.property_images) ? p.property_images : [];
          const sortedImgs = [...imgs].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          const propertyPhotos = sortedImgs.map(img => ({
            photo_url: img.image_url,
            optimized_url: null,
            is_featured: false,
            display_order: img.sort_order || 0,
          }));
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
            property_photos: propertyPhotos,
          });
        }
      }
    } catch {
      // Silently skip — manual properties are optional
    } // end if (!listingType)

    return NextResponse.json({ success: true, pins, total: pins.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
