import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

// Helper function to send email notification to seller (buyer sent message)
async function sendEmailToSeller(sellerEmail, sellerName, buyerName, messageText, conversationId) {
  if (!sellerEmail) return;
  const resend = getResend();
  if (!resend) {
    console.warn('[Buyer chat] RESEND_API_KEY not set; cannot send email to seller');
    return;
  }
  try {
    const sellerBase = (process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || '').replace(/\/$/, '') || 'https://sellerportaldeelmap-production.up.railway.app';
    const messagesUrl = `${sellerBase}/messages`;
    const preview = (messageText || '[Attachment]').slice(0, 200);
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#002A3A;color:#fff;padding:24px;text-align:center">
      <h1 style="margin:0;font-size:20px;font-weight:600">New message on Deelmap</h1>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 8px;font-size:14px;color:#666">From <strong style="color:#002A3A">${(buyerName || 'A buyer').replace(/</g, '&lt;')}</strong></p>
      <div style="background:#f8f9fa;border-left:4px solid #002A3A;padding:16px;border-radius:4px;margin:16px 0;font-size:15px;line-height:1.5;color:#333">${(preview || '').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</div>
      <a href="${messagesUrl}" style="display:inline-block;background:#002A3A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Open Messages</a>
    </div>
    <div style="padding:16px;text-align:center;font-size:12px;color:#888;border-top:1px solid #eee">You received this because you have an active conversation on Deelmap.</div>
  </div>
</body>
</html>`;
    await withTimeout(
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Deelmap <notifications@deelmap.com>',
        to: sellerEmail,
        subject: `New message from ${(buyerName || 'A buyer').slice(0, 50)} - Deelmap`,
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
            name = (sellerApp?.contact_person_name || '').trim() || (sellerApp?.business_name || '').trim() || 'Seller';
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

      // 3) If seller_id in URL: get or create that seller conversation and set openConversationId
      if (sellerIdParam) {
        let conv = (sellerConvs || []).find(c => c.seller_id === sellerIdParam);
        if (!conv) {
          const { data: created } = await supabase
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
          if (created) {
            conv = created;
            allConversations.push({ ...conv, _type: 'seller' });
          }
        }
        if (conv) openConversationId = conv.id;
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
          // For seller conversations, resolve seller name from seller_applications (dashboard) or users
          let sellerInfo = { business_name: 'Property seller', email: null, phone: null };
          if (conv.seller_id) {
            // Try seller_applications first (seller dashboard uses this; id in conversations = seller_applications.id)
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
                email: sellerApp.email,
                phone: sellerApp.phone
              };
            } else {
              // Fallback: try users table (e.g. if seller_id is a user uuid in some flows)
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
                  email: seller.email,
                  phone: seller.phone
                };
              }
            }
          }
          const { _type, ...rest } = conv;
          return {
            ...rest,
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

      return NextResponse.json({
        success: true,
        messages
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
        .select('id, lender_id, financing_request_id, user_id, seller_id, buyer_uuid')
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
            const { data: seller } = await supabase.from('users').select('email, full_name, first_name, last_name').eq('id', conversation.seller_id).maybeSingle();
            if (seller) {
              sellerEmail = seller.email;
              sellerName = seller.full_name || [seller.first_name, seller.last_name].filter(Boolean).join(' ') || 'Seller';
            }
          }
          const buyerData = await supabase.from('users').select('first_name, last_name').eq('id', authCheck.userUuid).single();
          const buyerName = [buyerData?.data?.first_name, buyerData?.data?.last_name].filter(Boolean).join(' ').trim() || 'A buyer';
          if (!sellerEmail) {
            console.warn('[Buyer chat] Email skipped: no seller email found for seller_id', conversation.seller_id);
          } else {
            console.log('[Buyer chat] Sending email to seller:', sellerEmail);
            fireAndForget(
              sendEmailToSeller(sellerEmail, sellerName, buyerName, messageText, conversationId),
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
      const { error } = await upsertBuyerConversationPref(supabase, conversationId, authCheck.userUuid, patch);
      if (error) {
        return NextResponse.json({ success: false, error: error.message || 'Failed to update preference' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
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
