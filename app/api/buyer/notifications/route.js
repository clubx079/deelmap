import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function getBuyerIdFromRequest(request) {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  return null;
}

// GET — fetch notifications for buyer
export async function GET(request) {
  try {
    const buyerId = getBuyerIdFromRequest(request);
    if (!buyerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', buyerId)
      .eq('recipient_type', 'buyer')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });

    const unreadCount = (notifications || []).filter(n => !n.is_read).length;
    return NextResponse.json({ notifications: notifications || [], unreadCount });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — mark_read / mark_all_read
export async function POST(request) {
  try {
    const buyerId = getBuyerIdFromRequest(request);
    if (!buyerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });

    const body = await request.json();
    const { action, notification_id } = body;

    if (action === 'mark_read' && notification_id) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification_id)
        .eq('recipient_id', buyerId);
      return NextResponse.json({ success: true });
    }

    if (action === 'mark_all_read') {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', buyerId)
        .eq('recipient_type', 'buyer')
        .eq('is_read', false);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
