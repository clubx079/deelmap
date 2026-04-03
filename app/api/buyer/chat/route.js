import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { Resend } from 'resend';
import { generateReplyToAddress } from '@/lib/emailReplyUtils';
import { generateAMPEmail, generateHTMLFallback } from '@/lib/ampEmailTemplate';
import { withTimeout, fireAndForget } from '@/lib/timeout';

// Marketplace (Deelmap) Supabase: conversations & messages – same DB as rest of site
function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function getSupabaseConfigError() {
  const url =
    process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) return 'Set NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) in Railway env.';
  if (!key) return 'Set MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY) in Railway env.';
  return null;
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const PRESENCE_TTL_MS = 60_000; // 60 seconds

/** Check if recipient was recently active on messages tab (skip email if true) */
async function isRecipientActiveOnMessages(supabase, recipientUserId, recipientType) {
  if (!recipientUserId) return false;
  try {
    const { data } = await supabase
      .from('message_presence')
      .select('last_seen')
      .eq('user_id', recipientUserId)
      .eq('user_type', recipientType)
      .maybeSingle();
    if (!data?.last_seen) return false;
    const lastSeen = new Date(data.last_seen).getTime();
    return (Date.now() - lastSeen) < PRESENCE_TTL_MS;
  } catch {
    return false;
  }
}

// Helper function to send email notification to lender
async function sendEmailToLender(lenderEmail, lenderName, buyerName, messageText, conversationId, propertyType, loanAmount) {
  const resend = getResend();
  if (!resend) {
    console.warn('[Buyer chat] RESEND_API_KEY not set; cannot send email to lender');
    return;
  }
  try {
    const chatLink = `${process.env.NEXT_PUBLIC_LENDER_URL || 'https://admin.ableman.co'}/lender/conversations/${conversationId}`;
    const formattedLoanAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(loanAmount || 0);

    // Generate unique reply-to address for this conversation
    const replyToAddress = generateReplyToAddress(conversationId);

    // Generate AMP email with inline reply box
    const ampHtml = generateAMPEmail({
      conversationId,
      senderName: buyerName,
      messageText: messageText || '[Attachment sent]',
      propertyType,
      loanAmount: formattedLoanAmount,
      recipientType: 'lender',
      conversationUrl: chatLink
    });

    // Generate HTML fallback for non-AMP clients
    const htmlFallback = generateHTMLFallback({
      conversationId,
      senderName: buyerName,
      messageText: messageText || '[Attachment sent]',
      propertyType,
      loanAmount: formattedLoanAmount,
      conversationUrl: chatLink
    });

    await withTimeout(
      resend.emails.send({
        from: 'Ableman Rei <notifications@ableman.co>',
        to: lenderEmail,
        reply_to: replyToAddress,
        subject: `New message from ${buyerName} - Ableman`,
        html: htmlFallback,
        amp: ampHtml
      }),
      15000, // 15 second timeout for email send
      'Email send timed out'
    );

    console.log('Email sent to lender with AMP:', lenderEmail);
  } catch (error) {
    console.error('Failed to send email to lender:', error);
  }
}

// Helper: resolve deal/property address and slug by id – check both properties (manual) and wholesale_deals
async function getDealAddressAndSlug(supabase, dealId) {
  if (!dealId) return { address: null, slug: null, source: null };
  const idStr = String(dealId).trim();
  if (!idStr) return { address: null, slug: null, source: null };

  // 1) Try properties table first (seller-added manual listings – "address" column)
  const { data: prop, error: propErr } = await supabase
    .from('properties')
    .select('address, city, state, zip_code, postal_code, slug')
    .eq('id', idStr)
    .maybeSingle();
  if (propErr) {
    console.warn('[getDealAddressAndSlug] properties query error for id', idStr, ':', propErr.message);
  }
  if (!propErr && prop) {
    const address = (prop.address != null && String(prop.address).trim() !== '')
      ? String(prop.address).trim()
      : [prop.address, prop.city, prop.state, prop.zip_code || prop.postal_code].filter(Boolean).join(', ') || null;
    return { address: address || null, slug: prop.slug || null, source: 'properties' };
  }

  // 1b) If properties failed on column error, try minimal columns (address only)
  if (propErr && /column|does not exist/i.test(String(propErr.message))) {
    const { data: propMin } = await supabase
      .from('properties')
      .select('address')
      .eq('id', idStr)
      .maybeSingle();
    if (propMin && (propMin.address != null && String(propMin.address).trim() !== '')) {
      return { address: String(propMin.address).trim(), slug: null, source: 'properties' };
    }
  }

  // 2) Try wholesale_deals (scraped deals)
  const { data: wholesale, error: wholesaleErr } = await supabase
    .from('wholesale_deals')
    .select('full_address, display_address, address, city, state, zip_code, slug')
    .eq('id', idStr)
    .maybeSingle();
  if (wholesaleErr) {
    console.warn('[getDealAddressAndSlug] wholesale_deals query error for id', idStr, ':', wholesaleErr.message);
  }
  if (!wholesaleErr && wholesale) {
    const address = (wholesale.full_address || wholesale.display_address || '').trim() ||
      [wholesale.address, wholesale.city, wholesale.state, wholesale.zip_code].filter(Boolean).join(', ') || null;
    return { address: address || null, slug: wholesale.slug || null, source: 'wholesale_deals' };
  }

  return { address: null, slug: null, source: null };
}

// Helper: resolve property price, beds, baths, sqft by id
async function getPropertyDetails(supabase, propertyId) {
  if (!propertyId) return {};
  const idStr = String(propertyId).trim();
  const { data: wd } = await supabase
    .from('wholesale_deals')
    .select('price, bedrooms, bathrooms, sqft')
    .eq('id', idStr)
    .maybeSingle();
  if (wd) return {
    property_price: wd.price || null,
    property_bedrooms: wd.bedrooms || null,
    property_bathrooms: wd.bathrooms || null,
    property_sqft: wd.sqft || null,
  };
  const { data: p } = await supabase
    .from('properties')
    .select('price, bedrooms, bathrooms, floor_area')
    .eq('id', idStr)
    .maybeSingle();
  if (p) return {
    property_price: p.price || null,
    property_bedrooms: p.bedrooms || null,
    property_bathrooms: p.bathrooms || null,
    property_sqft: p.floor_area || null,
  };
  return {};
}

// Helper: resolve agent/seller details for logging (source, name, email masked)
async function getAgentDetailsForLog(supabase, sellerId) {
  if (!sellerId) return { source: null, name: null, email: null };
  const { data: sellerApp } = await supabase
    .from('seller_applications')
    .select('contact_person_name, business_name, email')
    .eq('id', sellerId)
    .maybeSingle();
  if (sellerApp) {
    const name = (sellerApp.contact_person_name || sellerApp.business_name || '').trim() || null;
    const email = sellerApp.email ? `${sellerApp.email.slice(0, 3)}***@${(sellerApp.email.split('@')[1] || '')}` : null;
    return { source: 'seller_applications', name, email };
  }
  const { data: tempSeller } = await supabase
    .from('temp_seller_logins')
    .select('seller_name, sender_email')
    .eq('id', sellerId)
    .maybeSingle();
  if (tempSeller) {
    const name = (tempSeller.seller_name || '').trim() || null;
    const email = tempSeller.sender_email ? `${tempSeller.sender_email.slice(0, 3)}***@${(tempSeller.sender_email.split('@')[1] || '')}` : null;
    return { source: 'temp_seller_logins', name, email };
  }
  const { data: user } = await supabase
    .from('users')
    .select('first_name, last_name, full_name, email')
    .eq('id', sellerId)
    .maybeSingle();
  if (user) {
    const name = (user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ')).trim() || null;
    const email = user.email ? `${user.email.slice(0, 3)}***@${(user.email.split('@')[1] || '')}` : null;
    return { source: 'users', name, email };
  }
  return { source: null, name: null, email: null };
}

// Helper: get property thumbnail URL for conversation list
async function getPropertyThumbnail(supabase, propertyId) {
  if (!propertyId) return null;
  const { data: photo } = await supabase
    .from('property_photos')
    .select('photo_url')
    .eq('deal_id', propertyId)
    .eq('is_featured', true)
    .order('display_order', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (photo?.photo_url) return photo.photo_url;
  const { data: first } = await supabase
    .from('property_photos')
    .select('photo_url')
    .eq('deal_id', propertyId)
    .order('display_order', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (first?.photo_url) return first.photo_url;
  const { data: img } = await supabase
    .from('property_images')
    .select('image_url')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();
  return img?.image_url || null;
}

// Helper function to send email notification to seller (buyer sent message)
async function sendEmailToSeller(sellerEmail, sellerName, buyerName, messageText, conversationId, propertyAddress = '') {
  if (!sellerEmail) return;
  const resend = getResend();
  if (!resend) {
    console.warn('[Buyer chat] RESEND_API_KEY not set; cannot send email to seller');
    return;
  }
  try {
    const sellerBase = (process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || '').replace(/\/$/, '') || 'https://sellerportaldeelmap-production.up.railway.app';
    const messagesUrl = `${sellerBase}/messages?conversation=${conversationId}`;
    const preview = (messageText || '[Attachment]').slice(0, 200);
    const propertyText = String(propertyAddress || '').trim();
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff">
      <tr>
        <td style="background:#ffffff;padding:24px 40px;text-align:center;border-bottom:2px solid #D03839">
          <img src="https://sellerportaldeelmap-production.up.railway.app/deelmap-new.png" alt="Deelmap" height="36" style="display:inline-block;height:36px;width:auto;border:0" />
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px 32px;background:#ffffff">
          <p style="margin:0 0 6px;font-size:14px;color:#737370">Hi ${(sellerName || 'there').replace(/</g, '&lt;')},</p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1A1816;letter-spacing:-0.4px;line-height:1.25">${(buyerName || 'A buyer').replace(/</g, '&lt;')} sent you a message</h1>
          ${propertyText ? `<p style="margin:0 0 20px;font-size:14px;color:#737370">Re: <strong style="color:#1A1816">${propertyText.replace(/</g, '&lt;')}</strong></p>` : ''}
          <div style="background:#FAFAF8;border-left:3px solid #D03839;padding:12px 16px;border-radius:0 4px 4px 0;margin-bottom:24px;font-size:14px;line-height:1.5;color:#1A1816">${(preview || '').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</div>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:#D03839;border-radius:4px">
              <a href="${messagesUrl}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600">Reply to Message</a>
            </td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#FAFAF8;border-top:1px solid #E8E8E4;padding:20px 40px;text-align:center">
          <p style="margin:0;font-size:12px;color:#A8A8A4">© 2026 Deelmap. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </td></tr></table>
</body></html>`;
    await withTimeout(
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Deelmap <notifications@deelmap.com>',
        to: sellerEmail,
        subject: `New message from ${(buyerName || 'A buyer').slice(0, 50)}${propertyText ? ` • ${propertyText.slice(0, 50)}` : ''} - Deelmap`,
        html
      }),
      15000,
      'Email send timed out'
    );
    console.log('[Buyer chat] Email sent to seller:', sellerEmail);
  } catch (error) {
    console.error('[Buyer chat] Failed to send email to seller:', error?.message || error);
  }
}

// Helper function to hash email to numeric ID (matches lender portal logic)
function hashEmail(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

async function getBuyerConversationPref(supabase, conversationId, buyerUuid) {
  const { data } = await supabase
    .from('chat_user_preferences')
    .select('is_done, is_pinned, is_blocked, mark_unread, last_outbound_at')
    .eq('conversation_id', conversationId)
    .eq('actor_type', 'buyer')
    .eq('actor_id', buyerUuid)
    .maybeSingle();
  return data || null;
}

async function upsertBuyerConversationPref(supabase, conversationId, buyerUuid, patch = {}) {
  return supabase.from('chat_user_preferences').upsert(
    {
      conversation_id: conversationId,
      actor_type: 'buyer',
      actor_id: buyerUuid,
      ...patch,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'conversation_id,actor_type,actor_id' }
  );
}

// Helper function to check buyer authentication
async function checkBuyerAuth(request, supabase) {
  if (!supabase) return { authenticated: false, error: 'Database not configured' };
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Not authenticated' };
  }

  const userUuid = authHeader.replace('Bearer ', '');

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userUuid)
      .single();

    if (error || !user) {
      return { authenticated: false, error: 'Invalid or inactive session' };
    }

    // Hash the email to get numeric user_id used in conversations table
    const numericUserId = hashEmail(user.email);

    return {
      authenticated: true,
      userId: numericUserId,  // Numeric ID for conversations table
      userUuid: user.id,       // UUID for users table
      email: user.email
    };
  } catch (err) {
    return { authenticated: false, error: 'Invalid session' };
  }
}

// GET: Fetch conversations or messages
export async function GET(request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
        { success: false, error: 'Database not configured', hint: getSupabaseConfigError() },
        { status: 503 }
      );
  }
  try {
    const authCheck = await checkBuyerAuth(request, supabase);

    if (!authCheck.authenticated) {
      return NextResponse.json({
        success: false,
        error: authCheck.error
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const conversationId = searchParams.get('conversation_id');
    const sellerIdParam = searchParams.get('seller_id');
    const dealIdParam = searchParams.get('deal_id');

    if (action === 'get_blocked_users') {
      const { data: prefs } = await supabase
        .from('chat_user_preferences')
        .select('conversation_id, updated_at')
        .eq('actor_type', 'buyer')
        .eq('actor_id', authCheck.userUuid)
        .eq('is_blocked', true)
        .order('updated_at', { ascending: false });

      const conversationIds = (prefs || []).map((p) => p.conversation_id);
      if (conversationIds.length === 0) return NextResponse.json({ success: true, blocked: [] });

      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, seller_id, lender_id, last_message_at')
        .in('id', conversationIds);

      const blocked = await Promise.all(
        (conversations || []).map(async (conv) => {
          let name = 'User';
          if (conv.seller_id) {
            const { data: sellerApp } = await supabase
              .from('seller_applications')
              .select('contact_person_name, business_name')
              .eq('id', conv.seller_id)
              .maybeSingle();
            if (sellerApp) {
              name = (sellerApp.contact_person_name || '').trim() || (sellerApp.business_name || '').trim() || 'Seller';
            } else {
              const { data: tempSeller } = await supabase
                .from('temp_seller_logins')
                .select('seller_name')
                .eq('id', conv.seller_id)
                .maybeSingle();
              name = (tempSeller?.seller_name || '').trim() || 'Seller';
            }
          } else if (conv.lender_id) {
            const { data: lender } = await supabase
              .from('lenders')
              .select('business_name')
              .eq('id', conv.lender_id)
              .maybeSingle();
            name = lender?.business_name || 'Lender';
          }
          return {
            conversation_id: conv.id,
            name,
            blocked_at: (prefs || []).find((p) => p.conversation_id === conv.id)?.updated_at || null,
            last_message_at: conv.last_message_at || null
          };
        })
      );
      return NextResponse.json({ success: true, blocked });
    }

    // Fetch all conversations for this buyer (lender + seller)
    if (action === 'get_conversations') {
      const allConversations = [];
      let openConversationId = null;

      // 1) Lender conversations (via financing_requests)
      let financingRequestIds = [];
      const { data: financingRequests } = await supabase
        .from('financing_requests')
        .select('id')
        .eq('user_id', authCheck.userUuid);
      if (financingRequests?.length) {
        financingRequestIds = financingRequests.map(fr => fr.id);
      }
      if (financingRequestIds.length > 0) {
        const { data: lenderConvs } = await supabase
          .from('conversations')
          .select('*')
          .in('financing_request_id', financingRequestIds)
          .eq('is_active', true)
          .not('lender_id', 'is', null);
        (lenderConvs || []).forEach(c => allConversations.push({ ...c, _type: 'lender' }));
      }

      // 2) Seller conversations (seller_id set, buyer is this user via buyer_uuid or user_id)
      const { data: sellerConvsRaw } = await supabase
        .from('conversations')
        .select('*')
        .not('seller_id', 'is', null)
        .eq('is_active', true);
      const sellerConvs = (sellerConvsRaw || []).filter(
        c => c.buyer_uuid === authCheck.userUuid || Number(c.user_id) === Number(authCheck.userId)
      );
      sellerConvs.forEach(c => allConversations.push({ ...c, _type: 'seller' }));

      // 3) If seller_id in URL: get or create that seller conversation (one thread per deal when deal_id provided)
      if (sellerIdParam) {
        const matchByDeal = dealIdParam != null && String(dealIdParam).trim() !== '';
        let conv = null;

        // Log property and agent details when user came from "Contact agent"
        try {
          const [propertyForLog, agentForLog] = await Promise.all([
            matchByDeal ? getDealAddressAndSlug(supabase, dealIdParam) : Promise.resolve({ address: null, slug: null, source: null }),
            getAgentDetailsForLog(supabase, sellerIdParam)
          ]);
          console.log('[Contact agent] URL params:', { seller_id: sellerIdParam, deal_id: dealIdParam || null });
          if (matchByDeal) {
            console.log('[Contact agent] Property:', {
              deal_id: dealIdParam,
              address: propertyForLog.address || '(none)',
              slug: propertyForLog.slug || '(none)',
              source: propertyForLog.source || '(not found)'
            });
          }
          console.log('[Contact agent] Agent:', {
            seller_id: sellerIdParam,
            source: agentForLog.source || '(not found)',
            name: agentForLog.name || '(none)',
            email: agentForLog.email || '(none)'
          });
        } catch (logErr) {
          console.warn('[Contact agent] Log resolution failed:', logErr?.message || logErr);
        }

        if (matchByDeal) {
          const { data: existingByDeal, error: existingErr } = await supabase
            .from('conversations')
            .select('*')
            .eq('seller_id', sellerIdParam)
            .eq('buyer_uuid', authCheck.userUuid)
            .eq('property_id', String(dealIdParam))
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!existingErr && existingByDeal) conv = existingByDeal;
          if (existingErr && /property_id|column/i.test(String(existingErr.message || ''))) {
            const fallback = (sellerConvs || []).filter(c => c.seller_id === sellerIdParam)
              .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
            if (fallback) conv = fallback;
          }
        }

        if (!conv) {
          conv = (sellerConvs || []).find(c => {
            if (c.seller_id !== sellerIdParam) return false;
            if (matchByDeal) return String(c.property_id || '') === String(dealIdParam);
            return true;
          });
        }

        if (!conv) {
          let insertPayload = {
            seller_id: sellerIdParam,
            buyer_uuid: authCheck.userUuid,
            user_id: authCheck.userId,
            is_active: true,
            last_message_at: new Date().toISOString(),
            last_message_preview: null,
            updated_at: new Date().toISOString()
          };
          if (matchByDeal) {
            const { address, slug } = await getDealAddressAndSlug(supabase, dealIdParam);
            insertPayload.property_id = String(dealIdParam);
            insertPayload.property_address = (address && String(address).trim()) || null;
          }
          const { data: created, error: insertErr } = await supabase
            .from('conversations')
            .insert(insertPayload)
            .select('*')
            .single();
          if (insertErr && String(insertErr.message || '').toLowerCase().includes('property_')) {
            const { data: createdFallback } = await supabase
              .from('conversations')
              .insert({
                seller_id: sellerIdParam,
                buyer_uuid: authCheck.userUuid,
                user_id: authCheck.userId,
                is_active: true,
                last_message_at: new Date().toISOString(),
                last_message_preview: null,
                updated_at: new Date().toISOString()
              })
              .select('*')
              .single();
            if (createdFallback) {
              const { address } = await getDealAddressAndSlug(supabase, dealIdParam);
              const addr = (address && String(address).trim()) || null;
              await supabase
                .from('conversations')
                .update({
                  property_id: String(dealIdParam),
                  property_address: addr,
                  updated_at: new Date().toISOString()
                })
                .eq('id', createdFallback.id);
              conv = {
                ...createdFallback,
                property_id: String(dealIdParam),
                property_address: addr
              };
              allConversations.push({ ...conv, _type: 'seller' });
            }
          } else if (created) {
            conv = created;
            allConversations.push({ ...conv, _type: 'seller' });
          }
        }
        if (conv && conv.is_active !== false) openConversationId = conv.id;
      }

      // Sort by last_message_at and enrich
      allConversations.sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0));

      const enrichedConversations = await Promise.all(
        allConversations.map(async (conv) => {
          const unreadCountRes = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .in('sender_type', conv._type === 'seller' ? ['seller'] : ['lender'])
            .eq('is_read', false);
          const unread_count = unreadCountRes?.count ?? 0;

          const pref = await getBuyerConversationPref(supabase, conv.id, authCheck.userUuid);
          const mark_unread = !!pref?.mark_unread;
          const is_blocked = !!pref?.is_blocked;
          const { data: latest } = await supabase
            .from('messages')
            .select('sender_type')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (conv._type === 'lender') {
            const { data: lender } = await supabase.from('lenders').select('id, business_name, email, phone').eq('id', conv.lender_id).single();
            const { data: financingRequest } = conv.financing_request_id
              ? await supabase.from('financing_requests').select('id, property_type, loan_amount').eq('id', conv.financing_request_id).single()
              : { data: null };
            const { _type, ...rest } = conv;
            return {
              ...rest,
              lenders: lender,
              financing_requests: financingRequest,
              unread_count,
              is_done: !!pref?.is_done,
              is_pinned: !!pref?.is_pinned,
              is_blocked,
              mark_unread,
              has_unread: mark_unread || unread_count > 0,
              is_unresponded: !!latest?.sender_type && latest.sender_type !== 'user'
            };
          }
          // For seller conversations, resolve seller name: seller_applications (manual), temp_seller_logins (wholesale), or users
          let sellerInfo = { business_name: 'Property seller', contact_person_name: null, email: null, phone: null };
          if (conv.seller_id) {
            const { data: sellerApp } = await supabase
              .from('seller_applications')
              .select('contact_person_name, business_name, email, phone')
              .eq('id', conv.seller_id)
              .maybeSingle();
            if (sellerApp) {
              const displayName = (sellerApp.contact_person_name || '').trim() ||
                (sellerApp.business_name || '').trim() ||
                'Property seller';
              sellerInfo = {
                business_name: displayName || 'Property seller',
                contact_person_name: (sellerApp.contact_person_name || '').trim() || null,
                email: sellerApp.email,
                phone: sellerApp.phone
              };
            } else {
              const { data: tempSeller } = await supabase
                .from('temp_seller_logins')
                .select('seller_name, seller_phone, sender_email')
                .eq('id', conv.seller_id)
                .maybeSingle();
              if (tempSeller) {
                const displayName = (tempSeller.seller_name || '').trim() || 'Property seller';
                sellerInfo = {
                  business_name: displayName,
                  contact_person_name: (tempSeller.seller_name || '').trim() || null,
                  email: tempSeller.sender_email || null,
                  phone: tempSeller.seller_phone || null
                };
              } else {
                const { data: seller } = await supabase
                  .from('users')
                  .select('first_name, last_name, full_name, email, phone')
                  .eq('id', conv.seller_id)
                  .maybeSingle();
                if (seller) {
                  const displayName = seller.full_name?.trim() ||
                    [seller.first_name, seller.last_name].filter(Boolean).join(' ').trim() ||
                    'Property seller';
                  sellerInfo = {
                    business_name: displayName,
                    contact_person_name: (seller.first_name || '').trim() || null,
                    email: seller.email,
                    phone: seller.phone
                  };
                }
              }
            }
          }
          const [property_thumbnail_url_raw, propertyDetails] = await Promise.all([
            getPropertyThumbnail(supabase, conv.property_id),
            getPropertyDetails(supabase, conv.property_id),
          ]);
          const property_thumbnail_url = property_thumbnail_url_raw || conv.property_thumbnail_url || null;
          let property_address = (conv.property_address && String(conv.property_address).trim()) || null;
          let property_slug = conv.property_slug || null;
          if (conv.property_id && !property_address) {
            const resolved = await getDealAddressAndSlug(supabase, conv.property_id);
            property_address = (resolved.address && String(resolved.address).trim()) || null;
            property_slug = resolved.slug || null;
            if (property_address) {
              await supabase
                .from('conversations')
                .update({
                  property_address,
                  updated_at: new Date().toISOString()
                })
                .eq('id', conv.id);
            }
          }
          const { _type, ...rest } = conv;
          return {
            ...rest,
            property_address,
            property_slug,
            property_thumbnail_url,
            ...propertyDetails,
            lenders: sellerInfo,
            financing_requests: null,
            unread_count,
            is_done: !!pref?.is_done,
            is_pinned: !!pref?.is_pinned,
            is_blocked,
            mark_unread,
            has_unread: mark_unread || unread_count > 0,
            is_unresponded: (latest?.sender_type || '') === 'seller'
          };
        })
      );

      const visibleConversations = enrichedConversations.filter((c) => !c.is_blocked);
      const res = { success: true, conversations: visibleConversations };
      if (openConversationId) res.openConversationId = openConversationId;
      return NextResponse.json(res);
    }

    // Fetch messages for a specific conversation
    if (action === 'get_messages' && conversationId) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, financing_request_id, seller_id, buyer_uuid, user_id')
        .eq('id', conversationId)
        .single();

      if (!conversation) {
        return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
      }

      let allowed = false;
      if (conversation.seller_id != null) {
        allowed = conversation.buyer_uuid === authCheck.userUuid || Number(conversation.user_id) === Number(authCheck.userId);
      } else if (conversation.financing_request_id) {
        const { data: fr } = await supabase
          .from('financing_requests')
          .select('id')
          .eq('id', conversation.financing_request_id)
          .eq('user_id', authCheck.userUuid)
          .single();
        allowed = !!fr;
      }
      if (!allowed) {
        return NextResponse.json({ success: false, error: 'Unauthorized access to conversation' }, { status: 403 });
      }

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch messages:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch messages'
        }, { status: 500 });
      }

      // Mark conversation as read when buyer opens it: clear mark_unread and set messages is_read
      const senderTypesToMark = conversation.seller_id != null ? ['seller'] : ['lender'];
      await supabase.from('messages').update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .in('sender_type', senderTypesToMark)
        .eq('is_read', false);
      await upsertBuyerConversationPref(supabase, conversationId, authCheck.userUuid, { mark_unread: false });

      return NextResponse.json({
        success: true,
        messages: messages || []
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST: Send message or mark as read
export async function POST(request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
        { success: false, error: 'Database not configured', hint: getSupabaseConfigError() },
        { status: 503 }
      );
  }
  try {
    const authCheck = await checkBuyerAuth(request, supabase);

    if (!authCheck.authenticated) {
      return NextResponse.json({
        success: false,
        error: authCheck.error
      }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Heartbeat: mark buyer as active on messages tab (only when tab is visible, client sends this)
    if (action === 'heartbeat') {
      try {
        await supabase.from('message_presence').upsert(
          { user_id: authCheck.userUuid, user_type: 'buyer', last_seen: new Date().toISOString() },
          { onConflict: 'user_id,user_type' }
        );
      } catch (e) {
        // table may not exist yet
      }
      return NextResponse.json({ success: true });
    }

    // Send message
    if (action === 'send_message') {
      const {
        conversationId,
        messageText,
        hasAttachment = false,
        attachmentUrl = null,
        attachmentName = null,
        attachmentType = null,
        attachmentSize = null
      } = body;

      if (!conversationId) {
        return NextResponse.json({
          success: false,
          error: 'Missing conversation ID'
        }, { status: 400 });
      }

      const pref = await getBuyerConversationPref(supabase, conversationId, authCheck.userUuid);
      if (pref?.is_blocked) {
        return NextResponse.json({ success: false, error: 'This conversation is blocked. Unblock user first.' }, { status: 403 });
      }

      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, lender_id, financing_request_id, user_id, seller_id, buyer_uuid, property_id, property_address')
        .eq('id', conversationId)
        .single();

      if (!conversation) {
        return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
      }

      let allowed = false;
      let financingRequest = null;
      if (conversation.seller_id != null) {
        allowed = conversation.buyer_uuid === authCheck.userUuid || Number(conversation.user_id) === Number(authCheck.userId);
      } else if (conversation.financing_request_id) {
        const { data: fr } = await supabase
          .from('financing_requests')
          .select('id, first_name, last_name')
          .eq('id', conversation.financing_request_id)
          .eq('user_id', authCheck.userUuid)
          .single();
        financingRequest = fr;
        allowed = !!fr;
      }
      if (!allowed) {
        return NextResponse.json({ success: false, error: 'Unauthorized access to conversation' }, { status: 403 });
      }

      const replyToAddress = generateReplyToAddress(conversationId);
      const senderIdForDb = conversation.seller_id != null ? String(authCheck.userUuid) : String(conversation.user_id);

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'user',
          sender_id: senderIdForDb,
          message_text: messageText,
          has_attachment: hasAttachment,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          attachment_type: attachmentType,
          attachment_size: attachmentSize,
          reply_to_email: replyToAddress,
          is_from_email: false
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to send message:', error);
        return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
      }

      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: (messageText || '[Attachment]').slice(0, 200),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      await upsertBuyerConversationPref(supabase, conversationId, authCheck.userUuid, {
        last_outbound_at: new Date().toISOString(),
        mark_unread: false
      });

      if (conversation.lender_id && financingRequest) {
        const { data: lender } = await supabase.from('lenders').select('business_name, email').eq('id', conversation.lender_id).single();
        const { data: financingRequestDetails } = await supabase.from('financing_requests').select('property_type, loan_amount').eq('id', conversation.financing_request_id).single();
        if (lender?.email) {
          const buyerName = `${financingRequest.first_name || ''} ${financingRequest.last_name || ''}`.trim() || 'Buyer';
          // Lender presence is not tracked in this app; send email (or add lender heartbeat in admin portal later)
          fireAndForget(
            sendEmailToLender(lender.email, lender.business_name, buyerName, messageText, conversationId, financingRequestDetails?.property_type, financingRequestDetails?.loan_amount),
            'Lender email notification'
          );
        }
      }

      // Insert notification for seller (new message)
      if (conversation.seller_id) {
        const buyerMsgData = await supabase.from('users').select('first_name, last_name').eq('id', authCheck.userUuid).maybeSingle();
        const bName = buyerMsgData?.data ? `${buyerMsgData.data.first_name || ''} ${buyerMsgData.data.last_name || ''}`.trim() || 'A buyer' : 'A buyer';
        supabase.from('notifications').insert({
          recipient_id: conversation.seller_id,
          recipient_type: 'seller',
          type: 'new_message',
          title: `New message from ${bName}`,
          body: (messageText || '[Attachment]').slice(0, 120),
          is_read: false,
          related_conversation_id: conversationId,
        }).then(() => {}).catch(() => {});
      }

      // Buyer → Seller: only email if seller is not active on messages tab
      if (conversation.seller_id) {
        const active = await isRecipientActiveOnMessages(supabase, conversation.seller_id, 'seller');
        if (active) {
          console.log('[Buyer chat] Email skipped: seller is active on messages tab');
        } else {
          let sellerEmail = null;
          let sellerName = 'Seller';
          const { data: sellerApp } = await supabase.from('seller_applications').select('email, contact_person_name, business_name').eq('id', conversation.seller_id).maybeSingle();
          if (sellerApp) {
            sellerEmail = sellerApp.email;
            sellerName = (sellerApp.contact_person_name || '').trim() || (sellerApp.business_name || '').trim() || 'Seller';
          } else {
            const { data: tempSeller } = await supabase.from('temp_seller_logins').select('sender_email, seller_name').eq('id', conversation.seller_id).maybeSingle();
            if (tempSeller) {
              sellerEmail = tempSeller.sender_email || null;
              sellerName = (tempSeller.seller_name || '').trim() || 'Seller';
            } else {
              const { data: seller } = await supabase.from('users').select('email, full_name, first_name, last_name').eq('id', conversation.seller_id).maybeSingle();
              if (seller) {
                sellerEmail = seller.email;
                sellerName = seller.full_name || [seller.first_name, seller.last_name].filter(Boolean).join(' ') || 'Seller';
              }
            }
          }
          const buyerData = await supabase.from('users').select('first_name, last_name').eq('id', authCheck.userUuid).single();
          const buyerName = [buyerData?.data?.first_name, buyerData?.data?.last_name].filter(Boolean).join(' ').trim() || 'A buyer';
          let propertyAddress = conversation.property_address || null;
          if (!propertyAddress && conversation.property_id) {
            const { address } = await getDealAddressAndSlug(supabase, conversation.property_id);
            propertyAddress = address;
          }
          if (!sellerEmail) {
            console.warn('[Buyer chat] Email skipped: no seller email found for seller_id', conversation.seller_id);
          } else {
            console.log('[Buyer chat] Sending email to seller:', sellerEmail);
            fireAndForget(
              sendEmailToSeller(sellerEmail, sellerName, buyerName, messageText, conversationId, propertyAddress),
              'Seller email notification'
            );
          }
        }
      }

      return NextResponse.json({ success: true, message });
    }

    // Mark messages as read
    if (action === 'mark_as_read') {
      const { conversationId } = body;

      if (!conversationId) {
        return NextResponse.json({ success: false, error: 'Missing conversation ID' }, { status: 400 });
      }

      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, financing_request_id, seller_id, buyer_uuid, user_id')
        .eq('id', conversationId)
        .single();

      if (!conversation) {
        return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
      }

      let allowed = false;
      if (conversation.seller_id != null) {
        allowed = conversation.buyer_uuid === authCheck.userUuid || Number(conversation.user_id) === Number(authCheck.userId);
      } else if (conversation.financing_request_id) {
        const { data: fr } = await supabase
          .from('financing_requests')
          .select('id')
          .eq('id', conversation.financing_request_id)
          .eq('user_id', authCheck.userUuid)
          .single();
        allowed = !!fr;
      }
      if (!allowed) {
        return NextResponse.json({ success: false, error: 'Unauthorized access to conversation' }, { status: 403 });
      }

      const senderTypesToMark = conversation.seller_id != null ? ['seller'] : ['lender'];
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .in('sender_type', senderTypesToMark)
        .eq('is_read', false);

      if (error) {
        console.error('Failed to mark messages as read:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to mark messages as read'
        }, { status: 500 });
      }

      await upsertBuyerConversationPref(supabase, conversationId, authCheck.userUuid, {
        mark_unread: false
      });

      return NextResponse.json({
        success: true
      });
    }

    // Delete (deactivate) conversation – soft delete so thread is hidden from list
    if (action === 'delete_conversation') {
      const { conversationId } = body;
      if (!conversationId) {
        return NextResponse.json({ success: false, error: 'Missing conversation ID' }, { status: 400 });
      }
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, seller_id, financing_request_id, buyer_uuid, user_id')
        .eq('id', conversationId)
        .single();
      if (!conversation) {
        return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
      }
      let allowed = false;
      if (conversation.seller_id != null) {
        allowed = conversation.buyer_uuid === authCheck.userUuid || Number(conversation.user_id) === Number(authCheck.userId);
      } else if (conversation.financing_request_id) {
        const { data: fr } = await supabase
          .from('financing_requests')
          .select('id')
          .eq('id', conversation.financing_request_id)
          .eq('user_id', authCheck.userUuid)
          .single();
        allowed = !!fr;
      }
      if (!allowed) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }
      const { error } = await supabase
        .from('conversations')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      if (error) {
        return NextResponse.json({ success: false, error: error.message || 'Failed to delete' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'update_conversation_pref') {
      const { conversationId } = body;
      if (!conversationId) {
        return NextResponse.json({ success: false, error: 'Missing conversation ID' }, { status: 400 });
      }
      const allowedKeys = ['is_done', 'is_pinned', 'is_blocked', 'mark_unread'];
      const patch = {};
      for (const key of allowedKeys) {
        if (typeof body[key] === 'boolean') patch[key] = body[key];
      }
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .select('id, seller_id, lender_id, buyer_uuid, user_id')
        .eq('id', conversationId)
        .single();
      if (convErr || !conv) {
        return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
      }
      const isOwner = conv.buyer_uuid === authCheck.userUuid || Number(conv.user_id) === Number(authCheck.userId);
      if (!isOwner) {
        return NextResponse.json({ success: false, error: 'You can only update your own conversations' }, { status: 403 });
      }
      let conversationIdsToUpdate = [conv.id];
      if (patch.is_blocked === true) {
        const { data: allConvs } = await supabase
          .from('conversations')
          .select('id, seller_id, lender_id')
          .or(`buyer_uuid.eq.${authCheck.userUuid},user_id.eq.${authCheck.userId}`);
        const sameCounterparty = (c) =>
          (conv.seller_id != null && c.seller_id === conv.seller_id) ||
          (conv.lender_id != null && c.lender_id === conv.lender_id);
        const ids = (allConvs || []).filter(sameCounterparty).map((c) => c.id);
        if (ids.length) conversationIdsToUpdate = ids;
      }
      for (const cid of conversationIdsToUpdate) {
        const { error } = await upsertBuyerConversationPref(supabase, cid, authCheck.userUuid, patch);
        if (error) {
          console.error('[update_conversation_pref] upsert error:', error.message);
          return NextResponse.json({ success: false, error: error.message || 'Failed to update preference' }, { status: 500 });
        }
      }
      return NextResponse.json({ success: true });
    }

    // Create or get conversation between buyer and seller for a property
    if (action === 'create_conversation') {
      const { sellerId, propertyId, propertyAddress } = body;
      if (!sellerId) {
        return NextResponse.json({ success: false, error: 'Missing sellerId' }, { status: 400 });
      }

      // Check if conversation already exists
      let conv = null;
      if (propertyId) {
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('seller_id', sellerId)
          .eq('buyer_uuid', authCheck.userUuid)
          .eq('property_id', String(propertyId))
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing) conv = existing;
      }
      if (!conv) {
        const { data: existingAny } = await supabase
          .from('conversations')
          .select('id')
          .eq('seller_id', sellerId)
          .eq('buyer_uuid', authCheck.userUuid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingAny && !propertyId) conv = existingAny;
      }

      if (!conv) {
        const insertPayload = {
          seller_id: sellerId,
          buyer_uuid: authCheck.userUuid,
          user_id: authCheck.userId,
          is_active: true,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (propertyId) {
          insertPayload.property_id = String(propertyId);
          if (propertyAddress) insertPayload.property_address = String(propertyAddress).trim() || null;
        }
        const { data: created, error: insertErr } = await supabase
          .from('conversations')
          .insert(insertPayload)
          .select('id')
          .single();
        if (insertErr) {
          // Fallback: insert without property fields if column error
          const { data: fallback, error: fallbackErr } = await supabase
            .from('conversations')
            .insert({
              seller_id: sellerId,
              buyer_uuid: authCheck.userUuid,
              user_id: authCheck.userId,
              is_active: true,
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select('id')
            .single();
          if (fallbackErr || !fallback) {
            return NextResponse.json({ success: false, error: 'Failed to create conversation' }, { status: 500 });
          }
          conv = fallback;
        } else {
          conv = created;
        }
      }

      return NextResponse.json({ success: true, conversationId: conv.id });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
