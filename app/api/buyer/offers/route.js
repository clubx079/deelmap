import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { Resend } from 'resend';

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

// Convert a numeric user id to a stable, valid UUID so it can be stored in UUID columns.
// e.g. "63" → "00000000-0000-0000-0000-000000000063"
function toUuid(id) {
  const hex = Number(id).toString(16).padStart(12, '0');
  return `00000000-0000-0000-0000-${hex}`;
}

function formatCurrency(amount) {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

async function sendOfferEmailToSeller(sellerEmail, sellerName, buyerName, amount, propertyAddress, conversationId) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !sellerEmail) return;
  try {
    const resend = new Resend(apiKey);
    const sellerBase = (process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || 'https://sellerportaldeelmap-production.up.railway.app').replace(/\/$/, '');
    const messagesUrl = `${sellerBase}/messages?conversation=${conversationId}`;
    const logoUrl = `${sellerBase}/deelmap.png`;
    const amountStr = formatCurrency(amount);
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1A1816;color:#fff;padding:24px;text-align:center">
      <img src="${logoUrl}" alt="Deelmap" width="160" height="48" style="display:block;max-width:160px;height:auto;border:0;margin:0 auto" />
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#1A1816">New offer received!</p>
      <p style="margin:0 0 8px;font-size:14px;color:#666">From <strong style="color:#1A1816">${(buyerName || 'A buyer').replace(/</g, '&lt;')}</strong></p>
      ${propertyAddress ? `<p style="margin:0 0 8px;font-size:14px;color:#666">Property: <strong style="color:#1A1816">${String(propertyAddress).replace(/</g, '&lt;')}</strong></p>` : ''}
      <div style="background:#FEF0EF;border-left:4px solid #D03839;padding:16px;border-radius:4px;margin:16px 0">
        <p style="margin:0;font-size:24px;font-weight:700;color:#D03839">${amountStr}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#737370">Offer amount</p>
      </div>
      <a href="${messagesUrl}" style="display:inline-block;background:#D03839;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Review Offer</a>
    </div>
    <div style="padding:16px;text-align:center;font-size:12px;color:#888;border-top:1px solid #eee">You received this because you have an active listing on Deelmap.</div>
  </div>
</body></html>`;
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Deelmap <notifications@deelmap.com>',
      to: sellerEmail,
      subject: `New offer of ${amountStr} from ${buyerName || 'a buyer'} - Deelmap`,
      html,
    });
  } catch (err) {
    console.error('[buyer/offers] Failed to send offer email to seller:', err?.message);
  }
}

async function sendAcceptCounterEmailToSeller(sellerEmail, sellerName, buyerName, amount, conversationId) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !sellerEmail) return;
  try {
    const resend = new Resend(apiKey);
    const sellerBase = (process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || 'https://sellerportaldeelmap-production.up.railway.app').replace(/\/$/, '');
    const messagesUrl = `${sellerBase}/messages?conversation=${conversationId}`;
    const logoUrl = `${sellerBase}/deelmap.png`;
    const amountStr = formatCurrency(amount);
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1A1816;color:#fff;padding:24px;text-align:center">
      <img src="${logoUrl}" alt="Deelmap" width="160" height="48" style="display:block;max-width:160px;height:auto;border:0;margin:0 auto" />
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#0F6E56">Counter offer accepted!</p>
      <p style="margin:0 0 8px;font-size:14px;color:#666"><strong>${(buyerName || 'The buyer').replace(/</g, '&lt;')}</strong> accepted your counter offer of <strong>${amountStr}</strong>.</p>
      <a href="${messagesUrl}" style="display:inline-block;background:#D03839;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:16px">View Conversation</a>
    </div>
    <div style="padding:16px;text-align:center;font-size:12px;color:#888;border-top:1px solid #eee">Deelmap</div>
  </div>
</body></html>`;
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Deelmap <notifications@deelmap.com>',
      to: sellerEmail,
      subject: `${buyerName || 'Buyer'} accepted your counter offer of ${amountStr} - Deelmap`,
      html,
    });
  } catch (err) {
    console.error('[buyer/offers] Failed to send counter-accepted email:', err?.message);
  }
}

// POST — create a new offer
export async function POST(request) {
  try {
    const buyerUuid = getBuyerIdFromRequest(request);
    if (!buyerUuid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });

    const body = await request.json();
    const { conversation_id, property_id, amount, closing_timeline, financing_type, earnest_money, inspection_period, notes } = body;

    if (!conversation_id) return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 });
    if (!amount) return NextResponse.json({ error: 'offer price is required' }, { status: 400 });

    // Validate buyer owns this conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id, seller_id, buyer_uuid, property_id')
      .eq('id', conversation_id)
      .maybeSingle();

    if (convErr || !conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    if (String(conv.buyer_uuid) !== String(buyerUuid)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const sellerId = conv.seller_id;
    const propId = property_id || conv.property_id;

    // Insert offer — conversation_id is numeric in conversations table but UUID in offers table
    const offerConvId = toUuid(conversation_id);
    const { data: offer, error: offerErr } = await supabase
      .from('offers')
      .insert({
        conversation_id: offerConvId,
        property_id: propId,
        buyer_id: buyerUuid,
        seller_id: sellerId,
        offer_price: Number(amount),
        closing_timeline: closing_timeline || '30 days',
        financing_type: financing_type || 'Cash',
        earnest_money: earnest_money ? Number(earnest_money) : null,
        inspection_period: inspection_period || null,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (offerErr) {
      console.error('[buyer/offers] Insert error:', offerErr);
      return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
    }

    // Insert offer as a message so it appears in both buyer and seller chat threads
    const offerMsgText = [
      `Offer submitted: ${formatCurrency(Number(amount))}`,
      [financing_type || 'Cash', closing_timeline ? `Close in ${closing_timeline}` : null, inspection_period ? `${inspection_period} inspection` : null].filter(Boolean).join(' · ')
    ].join('\n');
    supabase.from('messages').insert({
      conversation_id: Number(conversation_id),
      sender_type: 'user',
      sender_id: buyerUuid,
      message_text: offerMsgText,
      has_attachment: false,
      is_read: false,
    }).then(() => {
      supabase.from('conversations').update({
        last_message_preview: `Offer submitted: ${formatCurrency(Number(amount))}`,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', conversation_id).then(() => {}).catch(() => {});
    }).catch(() => {});

    // Lookup buyer name and seller email async (non-blocking)
    Promise.all([
      supabase.from('users').select('first_name, last_name, email').eq('id', buyerUuid).maybeSingle(),
      supabase.from('seller_applications').select('email, contact_person_name, business_name').eq('id', sellerId).maybeSingle(),
    ]).then(async ([buyerRes, sellerRes]) => {
      const buyer = buyerRes.data;
      const seller = sellerRes.data;
      const buyerName = buyer ? `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim() || buyer.email : 'A buyer';
      const sellerEmail = seller?.email;
      const sellerName = seller?.contact_person_name || seller?.business_name || 'Seller';

      // Get property address
      let propertyAddress = null;
      if (propId) {
        const { data: wd } = await supabase.from('wholesale_deals').select('full_address, display_address').eq('id', propId).maybeSingle();
        propertyAddress = wd?.full_address || wd?.display_address;
        if (!propertyAddress) {
          const { data: p } = await supabase.from('properties').select('address, city, state').eq('id', propId).maybeSingle();
          if (p) propertyAddress = [p.address, p.city, p.state].filter(Boolean).join(', ');
        }
      }

      // Insert notification for seller
      await supabase.from('notifications').insert({
        recipient_id: sellerId,
        recipient_type: 'seller',
        type: 'new_offer',
        title: `New offer from ${buyerName}`,
        body: `${buyerName} submitted an offer of ${formatCurrency(amount)}`,
        is_read: false,
        related_conversation_id: conversation_id,
        related_offer_id: offer.id,
      });

      // Send email to seller
      await sendOfferEmailToSeller(sellerEmail, sellerName, buyerName, amount, propertyAddress, conversation_id);
    }).catch(err => console.error('[buyer/offers] Post-insert async error:', err?.message));

    return NextResponse.json({ offer });
  } catch (err) {
    console.error('[buyer/offers] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET — fetch offer(s) for a conversation
export async function GET(request) {
  try {
    const buyerUuid = getBuyerIdFromRequest(request);
    if (!buyerUuid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');

    if (!conversationId) {
      // Fetch all offers for this buyer
      const { data: offers, error } = await supabase
        .from('offers')
        .select('*')
        .eq('buyer_id', buyerUuid)
        .order('created_at', { ascending: false });
      if (error) return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
      // Enrich each offer with property details + thumbnail from both tables
      const enriched = await Promise.all((offers || []).map(async (o) => {
        if (!o.property_id) return o;
        const pid = String(o.property_id);
        let property_address = null, property_price = null, property_bedrooms = null,
            property_bathrooms = null, property_sqft = null, property_thumbnail_url = null, property_slug = null;

        // Query both tables in parallel
        const [wdRes, pRes] = await Promise.all([
          supabase
            .from('wholesale_deals')
            .select('full_address, display_address, address, city, state, zip_code, price, bedrooms, bathrooms, sqft, slug')
            .eq('id', pid)
            .maybeSingle(),
          supabase
            .from('properties')
            .select('address, city, state, zip_code, postal_code, price, bedrooms, bathrooms, floor_area, slug')
            .eq('id', pid)
            .maybeSingle(),
        ]);

        const wd = wdRes.data;
        const p = pRes.data;

        console.log('[offers enrich] pid:', pid, '| wd:', !!wd, '| p:', !!p,
          '| wd_addr:', wd?.full_address || wd?.display_address || wd?.address,
          '| wd_beds:', wd?.bedrooms, '| p_addr:', p?.address, '| p_beds:', p?.bedrooms);

        if (wd) {
          property_address = (wd.full_address || wd.display_address || '').trim() ||
            [wd.address, wd.city, wd.state, wd.zip_code].filter(Boolean).join(', ') || null;
          property_price = wd.price ?? null;
          property_bedrooms = wd.bedrooms ?? null;
          property_bathrooms = wd.bathrooms ?? null;
          property_sqft = wd.sqft ?? null;
          property_slug = wd.slug ?? null;
        }

        if (p) {
          if (!property_address) {
            property_address = (p.address || '').trim() ||
              [p.address, p.city, p.state, p.zip_code || p.postal_code].filter(Boolean).join(', ') || null;
          }
          if (property_price == null) property_price = p.price ?? null;
          if (property_bedrooms == null) property_bedrooms = p.bedrooms ?? null;
          if (property_bathrooms == null) property_bathrooms = p.bathrooms ?? null;
          if (property_sqft == null) property_sqft = p.floor_area ?? null;
          if (!property_slug) property_slug = p.slug ?? null;
        }

        // Thumbnail: property_photos (featured → any) then property_images
        const [featuredRes, anyPhotoRes, imgRes] = await Promise.all([
          supabase.from('property_photos').select('photo_url').eq('deal_id', pid).eq('is_featured', true).order('display_order', { ascending: true }).limit(1).maybeSingle(),
          supabase.from('property_photos').select('photo_url').eq('deal_id', pid).order('display_order', { ascending: true }).limit(1).maybeSingle(),
          supabase.from('property_images').select('image_url').eq('property_id', pid).order('sort_order', { ascending: true }).limit(1).maybeSingle(),
        ]);
        property_thumbnail_url = featuredRes.data?.photo_url || anyPhotoRes.data?.photo_url || imgRes.data?.image_url || null;

        console.log('[offers enrich] result — addr:', property_address, '| price:', property_price, '| thumb:', !!property_thumbnail_url);

        return { ...o, property_address, property_price, property_bedrooms, property_bathrooms, property_sqft, property_slug, property_thumbnail_url };
      }));
      return NextResponse.json({ offers: enriched });
    }

    const { data: offers, error } = await supabase
      .from('offers')
      .select('*')
      .eq('conversation_id', toUuid(conversationId))
      .eq('buyer_id', buyerUuid)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
    return NextResponse.json({ offers: offers || [] });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — buyer accepts a counter offer
export async function PATCH(request) {
  try {
    const buyerUuid = getBuyerIdFromRequest(request);
    if (!buyerUuid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });

    const body = await request.json();
    const { offer_id, action } = body;

    if (!offer_id || !['accept_counter', 'withdraw'].includes(action)) {
      return NextResponse.json({ error: 'offer_id and valid action required' }, { status: 400 });
    }

    // Validate buyer owns this offer
    const { data: offer, error: offerErr } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offer_id)
      .eq('buyer_id', buyerUuid)
      .maybeSingle();

    if (offerErr || !offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });

    if (action === 'withdraw') {
      const { error: updateErr } = await supabase
        .from('offers')
        .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
        .eq('id', offer_id);
      if (updateErr) return NextResponse.json({ error: 'Failed to withdraw offer' }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    const { error: updateErr } = await supabase
      .from('offers')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', offer_id);

    if (updateErr) return NextResponse.json({ error: 'Failed to accept counter' }, { status: 500 });

    // Async: notify seller + email
    Promise.all([
      supabase.from('users').select('first_name, last_name, email').eq('id', buyerUuid).maybeSingle(),
      supabase.from('seller_applications').select('email, contact_person_name').eq('id', offer.seller_id).maybeSingle(),
    ]).then(async ([buyerRes, sellerRes]) => {
      const buyer = buyerRes.data;
      const seller = sellerRes.data;
      const buyerName = buyer ? `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim() || buyer.email : 'Buyer';
      const sellerEmail = seller?.email;

      await supabase.from('notifications').insert({
        recipient_id: offer.seller_id,
        recipient_type: 'seller',
        type: 'counter_accepted',
        title: `${buyerName} accepted your counter offer`,
        body: `${buyerName} accepted your counter offer of ${formatCurrency(offer.offer_price)}`,
        is_read: false,
        related_conversation_id: offer.conversation_id,
        related_offer_id: offer_id,
      });

      if (sellerEmail) {
        await sendAcceptCounterEmailToSeller(sellerEmail, seller?.contact_person_name, buyerName, offer.offer_price, offer.conversation_id);
      }
    }).catch(err => console.error('[buyer/offers] PATCH async error:', err?.message));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
