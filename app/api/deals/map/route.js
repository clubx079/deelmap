import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { excludeOffMainland } from '@/lib/mainland';

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
);

// Fetch all rows past Supabase's 1000-row hard limit by paginating internally
async function fetchAllPages(buildQuery) {
  const results = [];
  let offset = 0;
  while (true) {
    const { data: page, error } = await buildQuery().range(offset, offset + 999);
    if (error) throw error;
    if (!page || page.length === 0) break;
    results.push(...page);
    if (page.length < 1000) break;
    offset += 1000;
  }
  return results;
}

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

    const applySearchQuery = (q, rawTerm, cityField = 'city', stateField = 'state', addressFields = ['address', 'full_address', 'city', 'state', 'zip_code']) => {
      const commaIdx = rawTerm.indexOf(',');
      if (commaIdx > 0) {
        const cityPart = rawTerm.substring(0, commaIdx).trim();
        const statePart = rawTerm.substring(commaIdx + 1).trim();
        const stateAbbrFromName = stateNameToAbbr[statePart.toLowerCase()];
        const stateAbbrFinal = stateAbbrFromName || (statePart.length === 2 ? statePart.toUpperCase() : null);
        const cq = `%${cityPart}%`;
        if (stateAbbrFinal) {
          return q.ilike(cityField, cq).eq(stateField, stateAbbrFinal);
        } else {
          return q.or(`${addressFields[0]}.ilike.${cq},${addressFields[2]}.ilike.${cq}`);
        }
      } else {
        const stateAbbr = stateNameToAbbr[rawTerm.toLowerCase()];
        const q2 = `%${rawTerm}%`;
        if (stateAbbr) {
          return q.or(`${addressFields[0]}.ilike.${q2},${addressFields[1] ? addressFields[1] + '.ilike.' + q2 + ',' : ''}${addressFields[2]}.ilike.${q2},${stateField}.eq.${stateAbbr}${addressFields[4] ? ',' + addressFields[4] + '.ilike.' + q2 : ''}`);
        } else {
          return q.or(`${addressFields[0]}.ilike.${q2},${addressFields[1] ? addressFields[1] + '.ilike.' + q2 + ',' : ''}${addressFields[2]}.ilike.${q2},${stateField}.ilike.${q2}${addressFields[4] ? ',' + addressFields[4] + '.ilike.' + q2 : ''}`);
        }
      }
    };

    // Build the wholesale_deals base query (no photo join — fetched separately to avoid LEFT JOIN exclusion)
    const buildWholesaleQuery = () => {
      let q = supabase
        .from('wholesale_deals')
        .select('id, slug, city, state, zip_code, price, arv, bedrooms, bathrooms, sqft, listing_type, address_google_lat, address_google_lng')
        .eq('status', 'active')
        .eq('is_incomplete', false)
        .not('address_google_lat', 'is', null)
        .not('address_google_lng', 'is', null);

      if (minPrice !== null) q = q.gte('price', minPrice);
      if (maxPrice !== null) q = q.lte('price', maxPrice);
      if (minBedrooms !== null) q = q.gte('bedrooms', minBedrooms);
      if (maxBedrooms !== null) q = q.lte('bedrooms', maxBedrooms);
      if (minBathrooms !== null) q = q.gte('bathrooms', minBathrooms);
      if (maxBathrooms !== null) q = q.lte('bathrooms', maxBathrooms);
      if (minSqft !== null) q = q.gte('sqft', minSqft);
      if (maxSqft !== null) q = q.lte('sqft', maxSqft);
      if (minYield !== null) q = q.gte('gross_yield', minYield);
      if (maxYield !== null) q = q.lte('gross_yield', maxYield);
      if (minCapRate !== null) q = q.gte('cap_rate', minCapRate);
      if (maxCapRate !== null) q = q.lte('cap_rate', maxCapRate);
      if (minCashOnCash !== null) q = q.gte('cash_on_cash', minCashOnCash);
      if (maxCashOnCash !== null) q = q.lte('cash_on_cash', maxCashOnCash);
      if (propertyTypes.length > 0) q = q.in('property_type', propertyTypes);
      if (states.length > 0) q = q.in('state', states);
      if (listingType === 'auction') {
        q = q.eq('listing_type', 'auction');
      } else if (listingType === 'wholesale') {
        q = q.or('listing_type.is.null,listing_type.neq.auction');
      }
      if (searchQuery) {
        q = applySearchQuery(q, searchQuery.trim(), 'city', 'state', ['address', 'full_address', 'city', 'state', 'zip_code']);
      }
      q = excludeOffMainland(q);
      return q;
    };

    // Fetch all deal coordinates (paginated to bypass 1000-row limit)
    const dealData = await fetchAllPages(buildWholesaleQuery);

    // Fetch all featured photos in one separate query (avoids LEFT JOIN exclusion bug)
    const photoData = await fetchAllPages(() =>
      supabase
        .from('property_photos')
        .select('deal_id, photo_url, optimized_url')
        .eq('is_featured', true)
    );

    // Build photo lookup map
    const photoMap = {};
    for (const ph of photoData) {
      if (!photoMap[ph.deal_id]) photoMap[ph.deal_id] = ph;
    }

    const pins = dealData.map(d => {
      const photo = photoMap[d.id];
      return {
        id: d.id,
        slug: d.slug,
        address: null,        // exact address hidden until login (UI shows "Login to view full address")
        full_address: null,
        city: d.city,
        state: d.state,
        zip_code: d.zip_code,
        price: d.price,
        arv: d.arv,
        bedrooms: d.bedrooms,
        bathrooms: d.bathrooms,
        sqft: d.sqft,
        listing_type: d.listing_type,
        property_photos: photo ? [{ photo_url: photo.photo_url, optimized_url: photo.optimized_url }] : [],
        latitude: d.address_google_lat,
        longitude: d.address_google_lng,
        address_google_lat: d.address_google_lat,
        address_google_lng: d.address_google_lng,
      };
    });

    // Also include manual seller properties (skip when listing type filter active)
    if (!listingType) try {
      const buildManualQuery = () => {
        let q = supabase
          .from('properties')
          .select('id, slug, city, state, latitude, longitude, price, bedrooms, bathrooms, floor_area, property_type')
          .in('status', ['active', 'published'])
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (states.length > 0) q = q.in('state', states);
        if (minPrice !== null) q = q.gte('price', minPrice);
        if (maxPrice !== null) q = q.lte('price', maxPrice);
        if (minBedrooms !== null) q = q.gte('bedrooms', minBedrooms);
        if (maxBedrooms !== null) q = q.lte('bedrooms', maxBedrooms);
        if (minBathrooms !== null) q = q.gte('bathrooms', minBathrooms);
        if (maxBathrooms !== null) q = q.lte('bathrooms', maxBathrooms);
        if (minSqft !== null) q = q.gte('floor_area', minSqft);
        if (maxSqft !== null) q = q.lte('floor_area', maxSqft);
        if (propertyTypes.length > 0) q = q.in('property_type', propertyTypes);
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
              q = q.ilike('city', cq).eq('state', stateAbbrFinal);
            } else {
              q = q.or(`city.ilike.${cq},address.ilike.${cq}`);
            }
          } else {
            const qt = `%${rawTerm}%`;
            q = q.or(`city.ilike.${qt},address.ilike.${qt},state.ilike.${qt}`);
          }
        }
        q = excludeOffMainland(q);
        return q;
      };

      const manualData = await fetchAllPages(buildManualQuery);

      // Fetch images for manual properties separately
      const manualIds = manualData.map(p => p.id);
      let manualPhotoMap = {};
      if (manualIds.length > 0) {
        const { data: manualPhotos } = await supabase
          .from('property_images')
          .select('property_id, image_url')
          .in('property_id', manualIds)
          .eq('sort_order', 0);
        for (const img of (manualPhotos || [])) {
          manualPhotoMap[img.property_id] = img;
        }
      }

      for (const p of manualData) {
        const img = manualPhotoMap[p.id];
        pins.push({
          id: p.id,
          slug: p.slug,
          address: null,        // exact address hidden until login
          city: p.city || null,
          state: p.state,
          price: p.price,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          sqft: p.floor_area,
          property_photos: img ? [{ photo_url: img.image_url, optimized_url: null }] : [],
          latitude: p.latitude,
          longitude: p.longitude,
          address_google_lat: p.latitude,
          address_google_lng: p.longitude,
        });
      }
    } catch {
      // Silently skip — manual properties are optional
    }

    return NextResponse.json({ success: true, pins, total: pins.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
