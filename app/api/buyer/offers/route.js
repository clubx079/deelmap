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

// Convert a numeric user/conversation id to stable UUID for UUID columns.
function toUuid(id) {
  const hex = Number(id).toString(16).padStart(12, '0');
  return `00000000-0000-0000-0000-${hex}`;
}

// Convert UUID back to numeric (for URL params, users.id lookups)
function uuidToNumeric(uuid) {
  if (!uuid) return null;
  const match = String(uuid).match(/00000000-0000-0000-0000-([0-9a-f]{12})$/i);
  if (match) return parseInt(match[1], 16);
  return null;
}

function formatCurrency(amount) {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

async function fetchPropertyDetails(supabase, propId) {
  if (!propId) return {};
  const pid = String(propId);
  const [wdRes, pRes] = await Promise.all([
    supabase.from('wholesale_deals').select('full_address, display_address, address, city, state, price, bedrooms, bathrooms, sqft').eq('id', pid).maybeSingle(),
    supabase.from('properties').select('address, state, price, bedrooms, bathrooms, floor_area').eq('id', pid).maybeSingle(),
  ]);
  const wd = wdRes.data;
  const p = pRes.data;
  let address = null, price = null, bedrooms = null, bathrooms = null, sqft = null;
  if (wd) {
    address = (wd.full_address || wd.display_address || '').trim() || [wd.address, wd.city, wd.state].filter(Boolean).join(', ') || null;
    price = wd.price ?? null;
    bedrooms = wd.bedrooms ?? null;
    bathrooms = wd.bathrooms ?? null;
    sqft = wd.sqft ?? null;
  }
  if (p) {
    if (!address) address = [p.address, p.state].filter(Boolean).join(', ') || null;
    if (price == null) price = p.price ?? null;
    if (bedrooms == null) bedrooms = p.bedrooms ?? null;
    if (bathrooms == null) bathrooms = p.bathrooms ?? null;
    if (sqft == null) sqft = p.floor_area ?? null;
  }
  const [feat, any, img] = await Promise.all([
    supabase.from('property_photos').select('photo_url').eq('deal_id', pid).eq('is_featured', true).limit(1).maybeSingle(),
    supabase.from('property_photos').select('photo_url').eq('deal_id', pid).order('display_order', { ascending: true }).limit(1).maybeSingle(),
    supabase.from('property_images').select('image_url').eq('property_id', pid).order('sort_order', { ascending: true }).limit(1).maybeSingle(),
  ]);
  const thumbnail = feat.data?.photo_url || any.data?.photo_url || img.data?.image_url || null;
  return { address, price, bedrooms, bathrooms, sqft, thumbnail };
}

function buildPropertyBlock({ address, price, bedrooms, bathrooms, sqft, thumbnail } = {}) {
  if (!address && !thumbnail) return '';
  const details = [
    bedrooms ? `${bedrooms} bd` : null,
    bathrooms ? `${bathrooms} ba` : null,
    sqft ? `${Number(sqft).toLocaleString()} sqft` : null,
  ].filter(Boolean).join(' · ');
  return `
    ${thumbnail ? `<img src="${thumbnail}" alt="Property" style="width:100%;max-height:200px;object-fit:cover;display:block;border-radius:8px;margin-bottom:12px" />` : ''}
    <div style="background:#F9F9F7;border-radius:8px;padding:14px 16px;margin:0 0 16px">
      ${address ? `<p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1A1816">${String(address).replace(/</g, '&lt;')}</p>` : ''}
      ${details ? `<p style="margin:0;font-size:13px;color:#737370">${details}</p>` : ''}
      ${price ? `<p style="margin:4px 0 0;font-size:13px;color:#737370">Asking: <strong style="color:#1A1816">${formatCurrency(price)}</strong></p>` : ''}
    </div>`;
}

function buildEmailHtml(logoUrl, title, titleColor, propertyBlock, bodyHtml, ctaUrl, ctaLabel) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff">
      <tr>
        <td style="background:#ffffff;padding:12px 40px;text-align:center;border-bottom:2px solid #D03839">
          <img src="${logoUrl}" alt="DeelMap" height="72" style="display:inline-block;height:72px;width:auto;border:0" />
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px 32px;background:#ffffff">
          <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:${titleColor || '#1A1816'};letter-spacing:-0.4px;line-height:1.25">${title}</p>
          ${propertyBlock}
          ${bodyHtml}
          <table cellpadding="0" cellspacing="0" style="margin-top:20px">
            <tr><td style="background:#D03839;border-radius:4px">
              <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600">${ctaLabel}</a>
            </td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;border-top:1px solid #E8E8E4;padding:20px 40px;text-align:center">
          <p style="margin:0;font-size:12px;color:#A8A8A4">© 2026 DeelMap. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </td></tr></table>
</body></html>`;
}

async function sendEmailToSeller(sellerEmail, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !sellerEmail) return;
  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Deelmap <notifications@deelmap.com>',
      to: sellerEmail,
      subject,
      html,
    });
  } catch (err) {
    console.error('[buyer/offers] Email error:', err?.message);
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

    // Auto-withdraw any previous pending offers from this buyer in this conversation
    const offerConvId = toUuid(conversation_id);
    await supabase
      .from('offers')
      .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
      .eq('conversation_id', offerConvId)
      .eq('buyer_id', buyerUuid)
      .eq('status', 'pending');

    // Insert new offer
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

    // Async: notify seller + email with full property details
    Promise.all([
      supabase.from('users').select('first_name, last_name, email').eq('id', buyerUuid).maybeSingle(),
      supabase.from('seller_applications').select('email, contact_person_name, business_name').eq('id', sellerId).maybeSingle(),
      fetchPropertyDetails(supabase, propId),
    ]).then(async ([buyerRes, sellerRes, propDetails]) => {
      const buyer = buyerRes.data;
      const seller = sellerRes.data;
      const buyerName = buyer ? `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim() || buyer.email : 'A buyer';
      const sellerEmail = seller?.email;
      const sellerBase = (process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || 'https://sell.deelmap.com').replace(/\/$/, '');
      const logoUrl = `${sellerBase}/deelmap.png`;
      const messagesUrl = `${sellerBase}/messages?conversation=${conversation_id}`;
      const amountStr = formatCurrency(amount);

      await supabase.from('notifications').insert({
        recipient_id: sellerId,
        recipient_type: 'seller',
        type: 'new_offer',
        title: `New offer from ${buyerName}`,
        body: `${buyerName} submitted an offer of ${amountStr}`,
        is_read: false,
        related_conversation_id: toUuid(conversation_id),
      });

      const propertyBlock = buildPropertyBlock(propDetails);
      const html = buildEmailHtml(
        logoUrl,
        'New offer received!',
        '#1A1816',
        propertyBlock,
        `<p style="margin:0 0 8px;font-size:14px;color:#666">From <strong style="color:#1A1816">${(buyerName).replace(/</g, '&lt;')}</strong></p>
         <div style="background:#FEF0EF;border-left:4px solid #D03839;padding:16px;border-radius:4px;margin:0 0 8px">
           <p style="margin:0;font-size:24px;font-weight:700;color:#D03839">${amountStr}</p>
           <p style="margin:4px 0 0;font-size:13px;color:#737370">Offer amount</p>
         </div>`,
        messagesUrl,
        'Review Offer'
      );

      await sendEmailToSeller(sellerEmail, `New offer of ${amountStr} from ${buyerName} - DeelMap`, html);
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

        const [wdRes, pRes] = await Promise.all([
          supabase
            .from('wholesale_deals')
            .select('full_address, display_address, address, city, state, zip_code, price, bedrooms, bathrooms, sqft, slug')
            .eq('id', pid)
            .maybeSingle(),
          supabase
            .from('properties')
            .select('address, state, price, bedrooms, bathrooms, floor_area, slug')
            .eq('id', pid)
            .maybeSingle(),
        ]);

        const wd = wdRes.data;
        const p = pRes.data;

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
            property_address = [p.address, p.state].filter(Boolean).join(', ') || null;
          }
          if (property_price == null) property_price = p.price ?? null;
          if (property_bedrooms == null) property_bedrooms = p.bedrooms ?? null;
          if (property_bathrooms == null) property_bathrooms = p.bathrooms ?? null;
          if (property_sqft == null) property_sqft = p.floor_area ?? null;
          if (!property_slug) property_slug = p.slug ?? null;
        }

        const [featuredRes, anyPhotoRes, imgRes] = await Promise.all([
          supabase.from('property_photos').select('photo_url').eq('deal_id', pid).eq('is_featured', true).order('display_order', { ascending: true }).limit(1).maybeSingle(),
          supabase.from('property_photos').select('photo_url').eq('deal_id', pid).order('display_order', { ascending: true }).limit(1).maybeSingle(),
          supabase.from('property_images').select('image_url').eq('property_id', pid).order('sort_order', { ascending: true }).limit(1).maybeSingle(),
        ]);
        property_thumbnail_url = featuredRes.data?.photo_url || anyPhotoRes.data?.photo_url || imgRes.data?.image_url || null;

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

// PATCH — buyer accepts/rejects a counter offer, or withdraws their own offer
export async function PATCH(request) {
  try {
    const buyerUuid = getBuyerIdFromRequest(request);
    if (!buyerUuid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });

    const body = await request.json();
    const { offer_id, action } = body;

    if (!offer_id || !['accept_counter', 'reject_counter', 'withdraw'].includes(action)) {
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

    const sellerBase = (process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || 'https://sell.deelmap.com').replace(/\/$/, '');
    const logoUrl = `${sellerBase}/deelmap.png`;
    // offer.conversation_id is UUID — convert back to numeric for URL
    const convNumeric = uuidToNumeric(offer.conversation_id) ?? offer.conversation_id;
    const messagesUrl = `${sellerBase}/messages?conversation=${convNumeric}`;

    if (action === 'withdraw') {
      const { error: updateErr } = await supabase
        .from('offers')
        .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
        .eq('id', offer_id);
      if (updateErr) return NextResponse.json({ error: 'Failed to withdraw offer' }, { status: 500 });

      // Async: notify seller + email
      Promise.all([
        supabase.from('users').select('first_name, last_name, email').eq('id', buyerUuid).maybeSingle(),
        supabase.from('seller_applications').select('email, contact_person_name, business_name').eq('id', offer.seller_id).maybeSingle(),
        fetchPropertyDetails(supabase, offer.property_id),
      ]).then(async ([buyerRes, sellerRes, propDetails]) => {
        const buyer = buyerRes.data;
        const seller = sellerRes.data;
        const buyerName = buyer ? `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim() || buyer.email : 'Buyer';
        const sellerEmail = seller?.email;
        const amountStr = formatCurrency(offer.offer_price);

        await supabase.from('notifications').insert({
          recipient_id: offer.seller_id,
          recipient_type: 'seller',
          type: 'offer_withdrawn',
          title: `${buyerName} withdrew their offer`,
          body: `${buyerName} withdrew their offer of ${amountStr}`,
          is_read: false,
          related_conversation_id: offer.conversation_id,
        });

        const propertyBlock = buildPropertyBlock(propDetails);
        const html = buildEmailHtml(
          logoUrl,
          'Offer withdrawn',
          '#737370',
          propertyBlock,
          `<p style="font-size:14px;color:#444">${(buyerName).replace(/</g, '&lt;')} has withdrawn their offer of <strong>${amountStr}</strong>.</p>`,
          messagesUrl,
          'View Conversation'
        );
        await sendEmailToSeller(sellerEmail, `${buyerName} withdrew their offer of ${amountStr} - DeelMap`, html);
      }).catch(err => console.error('[buyer/offers] withdraw async error:', err?.message));

      return NextResponse.json({ success: true });
    }

    if (action === 'reject_counter') {
      const { error: updateErr } = await supabase
        .from('offers')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', offer_id);
      if (updateErr) return NextResponse.json({ error: 'Failed to reject counter offer' }, { status: 500 });

      // Async: notify seller + email
      Promise.all([
        supabase.from('users').select('first_name, last_name, email').eq('id', buyerUuid).maybeSingle(),
        supabase.from('seller_applications').select('email, contact_person_name, business_name').eq('id', offer.seller_id).maybeSingle(),
        fetchPropertyDetails(supabase, offer.property_id),
      ]).then(async ([buyerRes, sellerRes, propDetails]) => {
        const buyer = buyerRes.data;
        const seller = sellerRes.data;
        const buyerName = buyer ? `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim() || buyer.email : 'Buyer';
        const sellerEmail = seller?.email;
        const amountStr = formatCurrency(offer.offer_price);

        await supabase.from('notifications').insert({
          recipient_id: offer.seller_id,
          recipient_type: 'seller',
          type: 'counter_rejected',
          title: `${buyerName} declined your counter offer`,
          body: `${buyerName} declined your counter offer of ${amountStr}`,
          is_read: false,
          related_conversation_id: offer.conversation_id,
        });

        const propertyBlock = buildPropertyBlock(propDetails);
        const html = buildEmailHtml(
          logoUrl,
          'Counter offer declined',
          '#D03839',
          propertyBlock,
          `<p style="font-size:14px;color:#444">${(buyerName).replace(/</g, '&lt;')} declined your counter offer of <strong>${amountStr}</strong>. You can continue the conversation to negotiate further.</p>`,
          messagesUrl,
          'View Conversation'
        );
        await sendEmailToSeller(sellerEmail, `${buyerName} declined your counter offer of ${amountStr} - DeelMap`, html);
      }).catch(err => console.error('[buyer/offers] reject_counter async error:', err?.message));

      return NextResponse.json({ success: true });
    }

    // accept_counter
    const { error: updateErr } = await supabase
      .from('offers')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', offer_id);

    if (updateErr) return NextResponse.json({ error: 'Failed to accept counter' }, { status: 500 });

    // Async: notify seller + email
    Promise.all([
      supabase.from('users').select('first_name, last_name, email').eq('id', buyerUuid).maybeSingle(),
      supabase.from('seller_applications').select('email, contact_person_name, business_name').eq('id', offer.seller_id).maybeSingle(),
      fetchPropertyDetails(supabase, offer.property_id),
    ]).then(async ([buyerRes, sellerRes, propDetails]) => {
      const buyer = buyerRes.data;
      const seller = sellerRes.data;
      const buyerName = buyer ? `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim() || buyer.email : 'Buyer';
      const sellerEmail = seller?.email;
      const amountStr = formatCurrency(offer.offer_price);

      await supabase.from('notifications').insert({
        recipient_id: offer.seller_id,
        recipient_type: 'seller',
        type: 'counter_accepted',
        title: `${buyerName} accepted your counter offer`,
        body: `${buyerName} accepted your counter offer of ${amountStr}`,
        is_read: false,
        related_conversation_id: offer.conversation_id,
      });

      const propertyBlock = buildPropertyBlock(propDetails);
      const html = buildEmailHtml(
        logoUrl,
        'Counter offer accepted!',
        '#0F6E56',
        propertyBlock,
        `<p style="font-size:14px;color:#444"><strong>${(buyerName).replace(/</g, '&lt;')}</strong> accepted your counter offer of <strong>${amountStr}</strong>. Next steps will begin shortly.</p>`,
        messagesUrl,
        'View Conversation'
      );
      await sendEmailToSeller(sellerEmail, `${buyerName} accepted your counter offer of ${amountStr} - DeelMap`, html);
    }).catch(err => console.error('[buyer/offers] accept_counter async error:', err?.message));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
