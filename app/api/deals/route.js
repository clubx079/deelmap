import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { normalizeWholesaleDeal, normalizeManualProperty } from '@/lib/propertyMappers';
import { excludeOffMainland } from '@/lib/mainland';

const supabaseMarketplace = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
);

// Public marketplace grid projection — city/state (no exact street), price, beds/baths,
// sqft, thumbnail image, coordinates, and the investment/listing metadata the card renders.
// Deliberately excludes: contract_url, seller phone/email, temp_seller_id / seller_id,
// posted_by, rejection_reason, and exact street address (address / full_address).
const DEAL_COLS = [
  'id', 'slug', 'city', 'state', 'zip_code',
  'address_google_lat', 'address_google_lng',
  'price', 'bedrooms', 'bathrooms', 'sqft', 'property_type', 'status',
  'listing_type', 'auction_date', 'auction_time', 'auction_location',
  'gross_yield', 'cap_rate', 'cash_on_cash', 'price_per_square_foot',
  'year_built', 'lot_size',
  'created_at', 'updated_at',
  'estimated_rent', 'purchase_price'
].join(',');
// NOTE: plain embed (default left join). AiroBase's PostgREST rejects the `!left`
// join-type modifier ("no foreign key matching hint 'left'") — a plain embed gives
// the same left-join behavior and works on both Supabase and AiroBase.
const DEAL_SELECT = `${DEAL_COLS}, property_photos(photo_url, optimized_url, is_featured)`;
const MANUAL_SELECT = `
  id, slug, city, state, zipcode, latitude, longitude,
  price, bedrooms, bathrooms, floor_area, property_type, status, property_status,
  is_homepage_featured, is_highlighted, is_boosted, created_at, updated_at,
  property_images!left (image_url, image_key, sort_order)
`;

const STATE_NAME_TO_ABBR = {
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

// Fallback featured photo + format a single card photo. Mutates the deal rows in place.
async function processDealPhotos(deals) {
  const needFallback = (deals || []).filter(d => !d.property_photos?.length).map(d => d.id);
  if (needFallback.length > 0) {
    const { data: fallbackPhotos } = await supabaseMarketplace
      .from('property_photos')
      .select('deal_id, photo_url, optimized_url')
      .in('deal_id', needFallback)
      .order('display_order', { ascending: true });
    const map = {};
    for (const p of (fallbackPhotos || [])) if (!map[p.deal_id]) map[p.deal_id] = p;
    (deals || []).forEach(d => {
      if (!d.property_photos?.length && map[d.id]) d.property_photos = [{ ...map[d.id], is_featured: false }];
    });
  }
  (deals || []).forEach(d => {
    const photo = d.property_photos?.[0];
    d.property_photos = photo ? [{
      photo_url: photo.optimized_url || photo.photo_url,
      optimized_url: photo.optimized_url || null,
      is_featured: true,
    }] : [];
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');

    const swLat = parseFloat(searchParams.get('swLat'));
    const swLng = parseFloat(searchParams.get('swLng'));
    const neLat = parseFloat(searchParams.get('neLat'));
    const neLng = parseFloat(searchParams.get('neLng'));
    const hasBounds = Number.isFinite(swLat) && Number.isFinite(swLng) && Number.isFinite(neLat) && Number.isFinite(neLng);
    const offset = (page - 1) * limit;
    const sortBy = searchParams.get('sortBy') || 'newest';
    const searchQuery = searchParams.get('searchQuery') || '';

    const rawPropertyTypes = searchParams.get('propertyTypes')?.split(',').filter(Boolean) || [];
    const propertyTypes = rawPropertyTypes.length > 0
      ? [...new Set(rawPropertyTypes.flatMap(t => {
          const variants = [t];
          if (/multi.?family/i.test(t)) variants.push('Multi Family', 'Multi-Family', 'Multifamily');
          if (/single.?family/i.test(t)) variants.push('Single Family', 'Single-Family');
          if (/mobile.?home/i.test(t)) variants.push('Mobile Home', 'Mobile-Home', 'Manufactured Home');
          return variants;
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
    const minCashOnCash = parseFloat(searchParams.get('minCashOnCash')) || null;
    const maxCashOnCash = parseFloat(searchParams.get('maxCashOnCash')) || null;
    const cities = searchParams.get('cities')?.split(',').filter(Boolean) || [];
    const states = searchParams.get('states')?.split(',').filter(Boolean) || [];
    const isHighlighted = searchParams.get('isHighlighted') === 'true';
    const isBoosted = searchParams.get('isBoosted') === 'true';
    const isHomepageFeatured = searchParams.get('isHomepageFeatured') === 'true';
    const listingType = searchParams.get('listingType') || null; // 'wholesale' | 'auction' | null=all
    const listingStatus = searchParams.get('listingStatus') || 'active';

    const validStatuses = ['active', 'pending', 'sold'];
    const statusToFilter = validStatuses.includes(listingStatus) ? listingStatus : 'active';

    // ---- shared filter application (wholesale_deals) ----
    const applyDealFilters = (q) => {
      if (propertyTypes.length > 0) q = q.in('property_type', propertyTypes);
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
      if (cities.length > 0) q = q.in('city', cities);
      if (states.length > 0) q = q.in('state', states);
      if (hasBounds) {
        q = q.gte('address_google_lat', swLat).lte('address_google_lat', neLat)
             .gte('address_google_lng', swLng).lte('address_google_lng', neLng);
      }
      if (searchQuery) {
        const rawTerm = searchQuery.trim();
        const commaIdx = rawTerm.indexOf(',');
        if (commaIdx > 0) {
          const cityPart = rawTerm.substring(0, commaIdx).trim();
          const statePart = rawTerm.substring(commaIdx + 1).trim();
          const stateAbbrFromName = STATE_NAME_TO_ABBR[statePart.toLowerCase()];
          const stateAbbrFinal = stateAbbrFromName || (statePart.length === 2 ? statePart.toUpperCase() : null);
          const cq = `%${cityPart}%`;
          if (stateAbbrFinal) q = q.ilike('city', cq).eq('state', stateAbbrFinal);
          else q = q.or(`address.ilike.${cq},full_address.ilike.${cq},city.ilike.${cq}`);
        } else {
          let searchTerm = rawTerm.replace(/[(),%]/g, ' ').replace(/\s+/g, ' ').trim();
          if (!searchTerm) searchTerm = rawTerm;
          const stateAbbr = STATE_NAME_TO_ABBR[searchTerm.toLowerCase()];
          const qq = `%${searchTerm}%`;
          if (stateAbbr) q = q.or(`address.ilike.${qq},full_address.ilike.${qq},city.ilike.${qq},state.eq.${stateAbbr},zip_code.ilike.${qq}`);
          else q = q.or(`address.ilike.${qq},full_address.ilike.${qq},city.ilike.${qq},state.ilike.${qq},zip_code.ilike.${qq}`);
        }
      }
      q = excludeOffMainland(q);
      return q;
    };

    const applyManualFilters = (q) => {
      if (minPrice !== null) q = q.gte('price', minPrice);
      if (maxPrice !== null) q = q.lte('price', maxPrice);
      if (minBedrooms !== null) q = q.gte('bedrooms', minBedrooms);
      if (maxBedrooms !== null) q = q.lte('bedrooms', maxBedrooms);
      if (minBathrooms !== null) q = q.gte('bathrooms', minBathrooms);
      if (maxBathrooms !== null) q = q.lte('bathrooms', maxBathrooms);
      if (minSqft !== null) q = q.gte('floor_area', minSqft);
      if (maxSqft !== null) q = q.lte('floor_area', maxSqft);
      if (propertyTypes.length > 0) q = q.in('property_type', propertyTypes);
      if (states.length > 0) q = q.in('state', states);
      if (isHighlighted) q = q.eq('is_highlighted', true);
      if (isBoosted) q = q.eq('is_boosted', true);
      if (isHomepageFeatured) q = q.eq('is_homepage_featured', true);
      if (hasBounds) {
        q = q.gte('latitude', swLat).lte('latitude', neLat)
             .gte('longitude', swLng).lte('longitude', neLng);
      }
      if (searchQuery) {
        const rawTerm = searchQuery.trim();
        const commaIdx = rawTerm.indexOf(',');
        if (commaIdx > 0) {
          const cityPart = rawTerm.substring(0, commaIdx).trim();
          const remainder = rawTerm.substring(commaIdx + 1);
          let stateAbbrFinal = null;
          for (const seg of remainder.split(',')) {
            const s = seg.trim();
            const fromName = STATE_NAME_TO_ABBR[s.toLowerCase()];
            if (fromName) { stateAbbrFinal = fromName; break; }
            if (s.length === 2 && /^[A-Za-z]{2}$/.test(s)) { stateAbbrFinal = s.toUpperCase(); break; }
          }
          const cq = `%${cityPart}%`;
          if (stateAbbrFinal) q = q.ilike('city', cq).eq('state', stateAbbrFinal);
          else q = q.or(`city.ilike.${cq},address.ilike.${cq}`);
        } else {
          const qq = `%${rawTerm}%`;
          q = q.or(`city.ilike.${qq},address.ilike.${qq},state.ilike.${qq}`);
        }
      }
      q = excludeOffMainland(q);
      return q;
    };

    // Query-time auction expiry guard (Issue #1): never serve an auction whose date has
    // already passed, independent of the once-a-day expire-listings cron. "Today" is taken
    // in ET because auctions are stored/quoted in Eastern Time. Wholesale deals always pass
    // (null / non-auction listing_type, or null auction_date); only past-dated auctions drop.
    const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const auctionLiveOr = `listing_type.is.null,listing_type.neq.auction,auction_date.is.null,auction_date.gte.${todayET}`;

    const baseDeal = () => supabaseMarketplace
      .from('wholesale_deals')
      .select(DEAL_SELECT, { count: 'exact' })
      .eq('status', statusToFilter)
      .eq('is_incomplete', false)
      .eq('property_photos.is_featured', true)
      .or(auctionLiveOr);

    const dealSort = (q) => {
      if (sortBy === 'price-low') return q.order('price', { ascending: true, nullsFirst: false });
      if (sortBy === 'price-high') return q.order('price', { ascending: false, nullsFirst: false });
      if (sortBy === 'roi') return q.order('cash_on_cash', { ascending: false, nullsFirst: false });
      return q.order('created_at', { ascending: false });
    };

    const baseManual = () => supabaseMarketplace
      .from('properties')
      .select(MANUAL_SELECT, { count: 'exact' })
      .in('status', ['active', 'published'])
      .eq('property_images.sort_order', 0);

    const manualSort = (q) => {
      if (sortBy === 'price-low') return q.order('price', { ascending: true, nullsFirst: false });
      if (sortBy === 'price-high') return q.order('price', { ascending: false, nullsFirst: false });
      return q.order('created_at', { ascending: false });
    };

    // count helper (no photo join — counts the deals themselves).
    // Auctions use an estimated count (thousands of rows; exact is slow and
    // hasMore/total only need a ballpark). Wholesale is small, so exact is fine.
    const dealCount = (which, mode = 'exact') => {
      let q = supabaseMarketplace.from('wholesale_deals')
        .select('id', { count: mode, head: true })
        .eq('status', statusToFilter).eq('is_incomplete', false)
        .or(auctionLiveOr);
      q = applyDealFilters(q);
      if (which === 'auction') q = q.eq('listing_type', 'auction');
      else if (which === 'wholesale') q = q.or('listing_type.is.null,listing_type.neq.auction');
      return q;
    };

    // =========================================================================
    // RECOMMENDED: server-side W,W,A interleave (wholesale+manual : auction)
    // The W stream (wholesale_deals non-auction + manual properties) is a small
    // minority, so all of it is loaded for the interleave "head"; auctions stay
    // paginated. Deep pages (past the head) are pure-auction and as fast as before.
    // =========================================================================
    if (sortBy === 'recommended' && !listingType) {
      const [acR, whR, mcR] = await Promise.all([
        dealCount('auction', 'estimated'),
        dealCount('wholesale'),
        applyManualFilters(supabaseMarketplace.from('properties').select('id', { count: 'exact', head: true }).in('status', ['active', 'published'])),
      ]);
      const An = acR.count || 0;
      const wholesaleCount = whR.count || 0;
      const manualCount = mcR.count || 0;
      const Wn = wholesaleCount + manualCount;
      const headA = Math.min(Math.ceil(Wn / 2), An);
      const headLen = Wn + headA;
      const total = Wn + An;

      let pageItems = [];

      if (offset >= headLen) {
        // Pure-auction tail (fast path — same shape as a normal auction page)
        const aStart = headA + (offset - headLen);
        const { data: aRows } = await dealSort(applyDealFilters(baseDeal().eq('listing_type', 'auction'))).range(aStart, aStart + limit - 1);
        await processDealPhotos(aRows || []);
        pageItems = (aRows || []).map(normalizeWholesaleDeal).filter(Boolean);
      } else {
        // Build the interleave head: all wholesale + manual, plus the first headA auctions
        const [whRows, mRows, haRows] = await Promise.all([
          wholesaleCount > 0
            ? dealSort(applyDealFilters(baseDeal().or('listing_type.is.null,listing_type.neq.auction'))).range(0, wholesaleCount - 1)
            : Promise.resolve({ data: [] }),
          manualCount > 0
            ? manualSort(applyManualFilters(baseManual())).range(0, manualCount - 1)
            : Promise.resolve({ data: [] }),
          headA > 0
            ? dealSort(applyDealFilters(baseDeal().eq('listing_type', 'auction'))).range(0, headA - 1)
            : Promise.resolve({ data: [] }),
        ]);

        const whData = whRows.data || [];
        const haData = haRows.data || [];
        await processDealPhotos(whData);
        await processDealPhotos(haData);

        const wNorm = whData.map(normalizeWholesaleDeal).filter(Boolean);
        const mNorm = (mRows.data || []).map(p => normalizeManualProperty(p, p.property_images || [])).filter(Boolean);
        const W = [...wNorm, ...mNorm].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        const headAuctions = haData.map(normalizeWholesaleDeal).filter(Boolean);

        // Interleave: W, W, A, W, W, A, ...  (matches the prior client-side pattern)
        const head = [];
        let wi = 0, ai = 0;
        while (wi < W.length || ai < headAuctions.length) {
          if (wi < W.length) head.push(W[wi++]);
          if (wi < W.length) head.push(W[wi++]);
          if (ai < headAuctions.length) head.push(headAuctions[ai++]);
        }

        pageItems = head.slice(offset, Math.min(offset + limit, head.length));

        // If the page extends past the mixed head, append pure-auction tail
        if (offset + limit > head.length) {
          const need = (offset + limit) - head.length;
          const tailStart = headA; // head consumed auctions [0, headA)
          const { data: tRows } = await dealSort(applyDealFilters(baseDeal().eq('listing_type', 'auction'))).range(tailStart, tailStart + need - 1);
          await processDealPhotos(tRows || []);
          pageItems.push(...(tRows || []).map(normalizeWholesaleDeal).filter(Boolean));
        }
      }

      return NextResponse.json({
        success: true,
        properties: pageItems,
        totalCount: total,
        page,
        limit,
        hasMore: offset + limit < total,
        metadata: { interleaved: true, auctionCount: An, wholesaleCount, manualCount, sortBy },
      });
    }

    // =========================================================================
    // All other sorts / filtered views — single-stream behavior (unchanged)
    // =========================================================================
    let query = dealSort(applyDealFilters(baseDeal()));
    if (listingType === 'auction') query = query.eq('listing_type', 'auction');
    else if (listingType === 'wholesale') query = query.or('listing_type.is.null,listing_type.neq.auction');
    query = query.range(offset, offset + limit - 1);

    let manualQuery = manualSort(applyManualFilters(baseManual())).range(offset, offset + limit - 1);

    // Skip manual properties when a listing type filter is active — that table has no listing_type
    const runManualQuery = !listingType;

    const [dealsResult, manualResult] = await Promise.allSettled([
      query,
      runManualQuery ? manualQuery : Promise.resolve({ data: [], count: 0 }),
    ]);

    if (dealsResult.status === 'rejected' || dealsResult.value?.error) {
      const err = dealsResult.value?.error || dealsResult.reason;
      console.error('[DEALS-API] Error:', err);
      throw err;
    }

    const { data: deals, count: totalCount } = dealsResult.value;
    await processDealPhotos(deals || []);
    const properties = (deals || []).map(normalizeWholesaleDeal).filter(Boolean);

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
        sortBy,
      },
    });

  } catch (error) {
    console.error('[DEALS-API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch properties',
      properties: [],
      totalCount: 0,
      hasMore: false,
    }, { status: 500 });
  }
}
