import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { generateReplyToAddress } from '@/lib/emailReplyUtils';
import { generateAMPEmail, generateHTMLFallback } from '@/lib/ampEmailTemplate';
import { withTimeout, fireAndForget } from '@/lib/timeout';

// Lender DB: conversations – lazy init so build succeeds without env
function getLenderSupabase() {
  const url = process.env.NEXT_PUBLIC_LENDER_SUPABASE_URL
  const key = process.env.LENDER_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to send email notification to lender
async function sendEmailToLender(lenderEmail, lenderName, buyerName, messageText, conversationId, propertyType, loanAmount) {
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

// Helper function to check buyer authentication
async function checkBuyerAuth(request, supabase) {
  if (!supabase) return { authenticated: false, error: 'Lender DB not configured' };
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
  const supabase = getLenderSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Lender DB not configured' }, { status: 503 });
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

    // Fetch all conversations for this buyer (user)
    if (action === 'get_conversations') {
      // First, get all financing requests for this user (by UUID)
      const { data: financingRequests, error: frError } = await supabase
        .from('financing_requests')
        .select('id')
        .eq('user_id', authCheck.userUuid);

      if (frError) {
        console.error('Failed to fetch financing requests:', frError);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch financing requests'
        }, { status: 500 });
      }

      // If no financing requests, return empty conversations
      if (!financingRequests || financingRequests.length === 0) {
        return NextResponse.json({
          success: true,
          conversations: []
        });
      }

      // Get the financing request IDs
      const financingRequestIds = financingRequests.map(fr => fr.id);

      // Fetch conversations for these financing requests
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('financing_request_id', financingRequestIds)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });

      if (convError) {
        console.error('Failed to fetch conversations:', convError);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch conversations'
        }, { status: 500 });
      }

      // Manually fetch and join lenders and financing_requests
      const enrichedConversations = await Promise.all(
        (conversations || []).map(async (conv) => {
          // Fetch lender data
          const { data: lender } = await supabase
            .from('lenders')
            .select('id, business_name, email, phone')
            .eq('id', conv.lender_id)
            .single();

          // Fetch financing request data
          const { data: financingRequest } = await supabase
            .from('financing_requests')
            .select('id, property_type, loan_amount')
            .eq('id', conv.financing_request_id)
            .single();

          // Fetch unread message count (messages from lender that are not read)
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('sender_type', 'lender')
            .eq('is_read', false);

          return {
            ...conv,
            lenders: lender,
            financing_requests: financingRequest,
            unread_count: unreadCount || 0
          };
        })
      );

      return NextResponse.json({
        success: true,
        conversations: enrichedConversations
      });
    }

    // Fetch messages for a specific conversation
    if (action === 'get_messages' && conversationId) {
      // Verify conversation belongs to this buyer via financing_request_id
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, financing_request_id')
        .eq('id', conversationId)
        .single();

      if (!conversation) {
        return NextResponse.json({
          success: false,
          error: 'Conversation not found'
        }, { status: 404 });
      }

      // Verify the financing request belongs to this user
      const { data: financingRequest } = await supabase
        .from('financing_requests')
        .select('id')
        .eq('id', conversation.financing_request_id)
        .eq('user_id', authCheck.userUuid)
        .single();

      if (!financingRequest) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized access to conversation'
        }, { status: 403 });
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
  const supabase = getLenderSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Lender DB not configured' }, { status: 503 });
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

      // Verify conversation belongs to this buyer via financing_request_id
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, lender_id, financing_request_id, user_id')
        .eq('id', conversationId)
        .single();

      if (!conversation) {
        return NextResponse.json({
          success: false,
          error: 'Conversation not found'
        }, { status: 404 });
      }

      // Verify the financing request belongs to this user and get buyer name
      const { data: financingRequest } = await supabase
        .from('financing_requests')
        .select('id, first_name, last_name')
        .eq('id', conversation.financing_request_id)
        .eq('user_id', authCheck.userUuid)
        .single();

      if (!financingRequest) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized access to conversation'
        }, { status: 403 });
      }

      // Get lender details for email
      const { data: lender } = await supabase
        .from('lenders')
        .select('business_name, email')
        .eq('id', conversation.lender_id)
        .single();

      // Get financing request details for email context
      const { data: financingRequestDetails } = await supabase
        .from('financing_requests')
        .select('property_type, loan_amount')
        .eq('id', conversation.financing_request_id)
        .single();

      // Generate reply-to address for this conversation
      const replyToAddress = generateReplyToAddress(conversationId);

      // Insert message (use the conversation's user_id, not the hashed one)
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'user',
          sender_id: conversation.user_id,  // Use the user_id from conversation
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
        return NextResponse.json({
          success: false,
          error: 'Failed to send message'
        }, { status: 500 });
      }

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: messageText || '[Attachment]'
        })
        .eq('id', conversationId);

      // Send email notification to lender (async, don't wait)
      // Use fireAndForget to ensure errors don't crash the process
      if (lender?.email) {
        const buyerName = `${financingRequest.first_name || ''} ${financingRequest.last_name || ''}`.trim() || 'Buyer';
        fireAndForget(
          sendEmailToLender(
            lender.email,
            lender.business_name,
            buyerName,
            messageText,
            conversationId,
            financingRequestDetails?.property_type,
            financingRequestDetails?.loan_amount
          ),
          'Lender email notification'
        );
      }

      return NextResponse.json({
        success: true,
        message
      });
    }

    // Mark messages as read
    if (action === 'mark_as_read') {
      const { conversationId } = body;

      if (!conversationId) {
        return NextResponse.json({
          success: false,
          error: 'Missing conversation ID'
        }, { status: 400 });
      }

      // Verify conversation belongs to this buyer via financing_request_id
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, financing_request_id')
        .eq('id', conversationId)
        .single();

      if (!conversation) {
        return NextResponse.json({
          success: false,
          error: 'Conversation not found'
        }, { status: 404 });
      }

      // Verify the financing request belongs to this user
      const { data: financingRequest } = await supabase
        .from('financing_requests')
        .select('id')
        .eq('id', conversation.financing_request_id)
        .eq('user_id', authCheck.userUuid)
        .single();

      if (!financingRequest) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized access to conversation'
        }, { status: 403 });
      }

      // Mark all unread messages from lender as read
      const { error } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'lender')
        .eq('is_read', false);

      if (error) {
        console.error('Failed to mark messages as read:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to mark messages as read'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true
      });
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
