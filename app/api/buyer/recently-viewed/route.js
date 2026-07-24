import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
);

function getUser(request) {
  return request.headers.get('x-user-id') || null;
}

export async function GET(request) {
  const userId = getUser(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('buyer_recently_viewed')
    .select('property_id, property_data, viewed_at')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(8);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = data || [];

  // Re-validate against live data: a deal that has since gone inactive or been
  // flagged incomplete (or a manual listing no longer published) must not keep
  // showing here just because we stored a snapshot at view-time. Mirror the
  // marketplace's active filter (wholesale_deals: active + not incomplete;
  // properties: admin_status active + published/active).
  const allIds = rows.map(r => r.property_id).filter(Boolean);
  if (allIds.length > 0) {
    const [wd, mp] = await Promise.all([
      supabase.from('wholesale_deals').select('id, status, is_incomplete').in('id', allIds),
      supabase.from('properties').select('id, status, admin_status').in('id', allIds),
    ]);
    const valid = new Set();
    for (const d of wd.data || []) if (d.status === 'active' && d.is_incomplete === false) valid.add(d.id);
    for (const p of mp.data || []) if (p.admin_status === 'active' && ['published', 'active'].includes(p.status)) valid.add(p.id);
    rows = rows.filter(r => valid.has(r.property_id));
  }

  // The stored property_data is a snapshot taken at view-time, which can carry a
  // stale or incomplete photo set (e.g. a single non-featured photo). Overlay the
  // LIVE featured photo so the card matches what the marketplace shows.
  const ids = rows.map(r => r.property_id).filter(Boolean);
  if (ids.length > 0) {
    const { data: featured } = await supabase
      .from('property_photos')
      .select('deal_id, photo_url, optimized_url, is_featured')
      .in('deal_id', ids)
      .eq('is_featured', true);

    const featuredByDeal = {};
    for (const p of featured || []) {
      if (!featuredByDeal[p.deal_id]) featuredByDeal[p.deal_id] = p;
    }

    for (const r of rows) {
      const live = featuredByDeal[r.property_id];
      if (live && r.property_data) {
        // Front-load the live featured photo so `photos.find(is_featured) || photos[0]`
        // resolves to the correct image.
        const existing = Array.isArray(r.property_data.property_photos) ? r.property_data.property_photos : [];
        r.property_data.property_photos = [
          live,
          ...existing.filter(p => p?.photo_url !== live.photo_url),
        ];
      }
    }
  }

  return NextResponse.json({ properties: rows.map(r => r.property_data) });
}

export async function POST(request) {
  const userId = getUser(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { property_id, property_data } = await request.json();
  if (!property_id || !property_data) return NextResponse.json({ error: 'property_id and property_data required' }, { status: 400 });

  const { error } = await supabase
    .from('buyer_recently_viewed')
    .upsert(
      { user_id: userId, property_id, property_data, viewed_at: new Date().toISOString() },
      { onConflict: 'user_id,property_id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
