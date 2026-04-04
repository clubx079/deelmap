import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ count: 0 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ count: 0 });

    // Get all conversations for this buyer
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('buyer_id', userId);

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const convIds = conversations.map(c => c.id);

    // Count unread messages (sent by seller/lender, not read by buyer)
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .in('sender_type', ['seller', 'lender'])
      .eq('is_read', false);

    return NextResponse.json({ count: count || 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
