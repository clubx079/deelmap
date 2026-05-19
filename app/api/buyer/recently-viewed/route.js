import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
);

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.replace('Bearer ', '');
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

  return NextResponse.json({ properties: (data || []).map(r => r.property_data) });
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
