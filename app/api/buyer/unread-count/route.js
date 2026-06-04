import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Conversations key the buyer by `buyer_uuid` (the users.id) OR the numeric
// `user_id` derived by hashing the email — never a `buyer_id` column. Mirror the
// chat route's matching so the unread badge is accurate.
function hashEmail(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export async function GET(request) {
  try {
    const userUuid = request.headers.get('x-user-id');
    if (!userUuid) return NextResponse.json({ count: 0 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ count: 0 });

    // Resolve the buyer's email -> numeric user_id used in the conversations table
    const { data: user } = await supabase.from('users').select('id, email').eq('id', userUuid).single();
    if (!user) return NextResponse.json({ count: 0 });
    const numericUserId = hashEmail(user.email);

    const convIds = new Set();

    // 1) Seller conversations (buyer matched via buyer_uuid OR numeric user_id)
    const { data: sellerConvs } = await supabase
      .from('conversations')
      .select('id')
      .not('seller_id', 'is', null)
      .eq('is_active', true)
      .or(`buyer_uuid.eq.${userUuid},user_id.eq.${numericUserId}`);
    (sellerConvs || []).forEach(c => convIds.add(c.id));

    // 2) Lender (financing) conversations for this buyer's requests
    const { data: frs } = await supabase.from('financing_requests').select('id').eq('user_id', userUuid);
    const frIds = (frs || []).map(f => f.id);
    if (frIds.length) {
      const { data: lenderConvs } = await supabase
        .from('conversations')
        .select('id')
        .in('financing_request_id', frIds)
        .eq('is_active', true)
        .not('lender_id', 'is', null);
      (lenderConvs || []).forEach(c => convIds.add(c.id));
    }

    if (convIds.size === 0) return NextResponse.json({ count: 0 });

    // Count unread messages (sent by seller/lender, not read by buyer)
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', [...convIds])
      .in('sender_type', ['seller', 'lender'])
      .eq('is_read', false);

    return NextResponse.json({ count: count || 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
