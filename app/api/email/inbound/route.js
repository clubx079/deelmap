import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { Resend } from 'resend';
import {
  parseConversationIdFromEmail,
  cleanEmailContent,
  determineSenderType,
  extractTextFromHtml,
  generateReplyToAddress
} from '@/lib/emailReplyUtils';
import { generateAMPEmail, generateHTMLFallback } from '@/lib/ampEmailTemplate';

// Lender DB: conversations, financing_requests – lazy init so build succeeds without env
function getLenderSupabase() {
  const url = process.env.NEXT_PUBLIC_LENDER_SUPABASE_URL
  const key = process.env.LENDER_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Inbound Email Webhook Handler
 * Processes email replies from Resend and inserts them as chat messages
 */
export async function POST(request) {
  const supabase = getLenderSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Lender DB not configured' }, { status: 503 });
  }
  try {
    const body = await request.json();
    console.log('Inbound email received:', {
      from: body.from,
      to: body.to,
      subject: body.subject
    });

    // Extract email data from Resend webhook payload
    const {
      from,        // sender email address
      to,          // recipient (our reply-to address)
      subject,
      text,        // plain text content
      html,        // HTML content
      message_id   // email message ID
    } = body;

    // Validate required fields
    if (!from || !to) {
      return NextResponse.json({
        success: false,
        error: 'Missing required email fields'
      }, { status: 400 });
    }

    // Parse conversation ID from reply-to address
    const conversationId = parseConversationIdFromEmail(to);

    if (!conversationId) {
      console.error('Could not parse conversation ID from:', to);
      return NextResponse.json({
        success: false,
        error: 'Invalid reply-to address format'
      }, { status: 400 });
    }

    // Fetch conversation details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        lender_id,
        user_id,
        financing_request_id,
        financing_requests (
          id,
          email,
          user_id,
          first_name,
          last_name,
          property_type,
          loan_amount
        )
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('Conversation not found:', conversationId);
      return NextResponse.json({
        success: false,
        error: 'Conversation not found'
      }, { status: 404 });
    }

    // Determine sender type (lender or buyer)
    const senderInfo = await determineSenderType(from, conversationId, supabase);

    if (!senderInfo.type) {
      console.error('Could not determine sender type for:', from);
      return NextResponse.json({
        success: false,
        error: 'Unauthorized sender'
      }, { status: 403 });
    }

    // Clean email content (remove quoted replies and signatures)
    const { cleanText, cleanHtml } = cleanEmailContent(text, html);

    // Use cleaned text if available, otherwise extract from HTML
    const messageText = cleanText || extractTextFromHtml(cleanHtml) || 'Email reply received';

    // Insert message into database
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: senderInfo.type,
        sender_id: senderInfo.senderId,
        sender_email: from,
        message_text: messageText,
        html_message: cleanHtml,
        is_from_email: true,
        email_message_id: message_id,
        is_read: false
      })
      .select()
      .single();

    if (messageError) {
      console.error('Failed to insert message:', messageError);
      return NextResponse.json({
        success: false,
        error: 'Failed to save message'
      }, { status: 500 });
    }

    // Update conversation last message
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: messageText.substring(0, 100)
      })
      .eq('id', conversationId);

    // Send email notification to the other party
    await sendNotificationEmail(
      conversation,
      senderInfo,
      messageText,
      conversationId
    );

    console.log('Email reply processed successfully:', {
      conversationId,
      messageId: newMessage.id,
      senderType: senderInfo.type
    });

    return NextResponse.json({
      success: true,
      message: {
        id: newMessage.id,
        conversation_id: conversationId,
        sender_type: senderInfo.type
      }
    });

  } catch (error) {
    console.error('Inbound email processing error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * Send notification email to the recipient
 */
async function sendNotificationEmail(conversation, senderInfo, messageText, conversationId) {
  try {
    const formattedLoanAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(conversation.financing_requests?.loan_amount || 0);

    // Generate unique reply-to address
    const replyToAddress = generateReplyToAddress(conversationId);

    if (senderInfo.recipientType === 'user') {
      // Send to buyer
      const { data: buyerUser } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', conversation.financing_requests?.user_id)
        .single();

      const { data: lender } = await supabase
        .from('lenders')
        .select('business_name')
        .eq('id', conversation.lender_id)
        .single();

      if (buyerUser?.email) {
        const chatLink = `${process.env.NEXT_PUBLIC_BUYER_URL || 'https://ableman.co'}/buyer/conversations/${conversationId}`;
        const buyerName = `${buyerUser.first_name || ''} ${buyerUser.last_name || ''}`.trim();
        const lenderName = lender?.business_name || 'Lender';

        // Generate AMP and HTML versions
        const ampHtml = generateAMPEmail({
          conversationId,
          senderName: lenderName,
          messageText,
          propertyType: conversation.financing_requests?.property_type,
          loanAmount: formattedLoanAmount,
          recipientType: 'buyer',
          conversationUrl: chatLink
        });

        const htmlFallback = generateHTMLFallback({
          conversationId,
          senderName: lenderName,
          messageText,
          propertyType: conversation.financing_requests?.property_type,
          loanAmount: formattedLoanAmount,
          conversationUrl: chatLink
        });

        await resend.emails.send({
          from: 'Ableman Rei <notifications@ableman.co>',
          to: buyerUser.email,
          reply_to: replyToAddress,
          subject: `New message from ${lenderName} - Ableman`,
          html: htmlFallback,
          amp: ampHtml
        });
      }
    } else if (senderInfo.recipientType === 'lender') {
      // Send to lender
      const { data: lender } = await supabase
        .from('lenders')
        .select('email, business_name')
        .eq('id', conversation.lender_id)
        .single();

      if (lender?.email) {
        const chatLink = `${process.env.NEXT_PUBLIC_LENDER_URL || 'https://admin.ableman.co'}/lender/conversations/${conversationId}`;
        const buyerName = `${conversation.financing_requests?.first_name || ''} ${conversation.financing_requests?.last_name || ''}`.trim() || 'Buyer';
        const lenderName = lender.business_name || 'there';

        // Generate AMP and HTML versions
        const ampHtml = generateAMPEmail({
          conversationId,
          senderName: buyerName,
          messageText,
          propertyType: conversation.financing_requests?.property_type,
          loanAmount: formattedLoanAmount,
          recipientType: 'lender',
          conversationUrl: chatLink
        });

        const htmlFallback = generateHTMLFallback({
          conversationId,
          senderName: buyerName,
          messageText,
          propertyType: conversation.financing_requests?.property_type,
          loanAmount: formattedLoanAmount,
          conversationUrl: chatLink
        });

        await resend.emails.send({
          from: 'Ableman Rei <notifications@ableman.co>',
          to: lender.email,
          reply_to: replyToAddress,
          subject: `New message from ${buyerName} - Ableman`,
          html: htmlFallback,
          amp: ampHtml
        });
      }
    }
  } catch (error) {
    console.error('Failed to send notification email:', error);
    // Don't throw - email failure shouldn't fail the whole operation
  }
}
