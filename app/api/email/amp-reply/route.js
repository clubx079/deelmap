import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { Resend } from 'resend';
import { determineSenderType, generateReplyToAddress } from '@/lib/emailReplyUtils';
import { generateAMPEmail, generateHTMLFallback } from '@/lib/ampEmailTemplate';

// Lender DB: conversations – lazy init so build succeeds without env
function getLenderSupabase() {
  const url = process.env.NEXT_PUBLIC_LENDER_SUPABASE_URL
  const key = process.env.LENDER_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * AMP Email Reply Handler
 * Processes inline replies from Gmail/AMP-enabled email clients
 */
export async function POST(request) {
  const supabase = getLenderSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Lender DB not configured' }, { status: 503 });
  }
  try {
    // Parse form data from AMP submission
    const formData = await request.formData();
    const conversationId = parseInt(formData.get('conversation_id'), 10);
    const messageText = formData.get('message')?.trim();

    console.log('AMP reply received:', { conversationId, messageLength: messageText?.length });

    // Validate required fields
    if (!conversationId || !messageText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate message length
    if (messageText.length > 5000) {
      return NextResponse.json(
        { error: 'Message too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    // Get the sender's email from request headers (set by AMP)
    // Note: In production, you might need additional authentication
    const senderEmail = request.headers.get('x-amp-email-sender') ||
                        request.headers.get('from');

    if (!senderEmail) {
      return NextResponse.json(
        { error: 'Unable to identify sender' },
        { status: 401 }
      );
    }

    console.log('Sender email:', senderEmail);

    // Fetch conversation to verify it exists and get participants
    const { data: conversation, error: convError } = await supabase
      .from('financing_requests')
      .select(`
        id,
        user_id,
        lender_id,
        property_type,
        loan_amount,
        users!financing_requests_user_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        lenders!financing_requests_lender_id_fkey (
          id,
          email,
          company_name,
          contact_name
        )
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('Conversation not found:', convError);
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Determine sender type and validate they're a participant
    const senderInfo = await determineSenderType(senderEmail, conversationId, supabase);

    if (!senderInfo) {
      console.error('Unauthorized sender:', senderEmail);
      return NextResponse.json(
        { error: 'You are not authorized to reply to this conversation' },
        { status: 403 }
      );
    }

    console.log('Sender identified:', senderInfo);

    // Insert message into database
    const { data: newMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: senderInfo.type,
        sender_id: senderInfo.senderId,
        message_text: messageText,
        is_from_email: true,
        sender_email: senderEmail
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert message:', insertError);
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }

    console.log('Message inserted:', newMessage.id);

    // Send notification email to the other party
    try {
      const formattedLoanAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(conversation.loan_amount || 0);

      const replyToAddress = generateReplyToAddress(conversationId);

      if (senderInfo.type === 'user') {
        // Buyer sent message, notify lender
        const lender = conversation.lenders;
        if (lender?.email) {
          const buyerName = conversation.users
            ? `${conversation.users.first_name} ${conversation.users.last_name}`
            : 'A buyer';
          const lenderName = lender.company_name || lender.contact_name || 'there';
          const chatLink = `${process.env.NEXT_PUBLIC_LENDER_URL || 'https://admin.ableman.co'}/lender/conversations/${conversationId}`;

          // Generate AMP and HTML versions
          const ampHtml = generateAMPEmail({
            conversationId,
            senderName: buyerName,
            messageText,
            propertyType: conversation.property_type,
            loanAmount: formattedLoanAmount,
            recipientType: 'lender',
            conversationUrl: chatLink
          });

          const htmlFallback = generateHTMLFallback({
            conversationId,
            senderName: buyerName,
            messageText,
            propertyType: conversation.property_type,
            loanAmount: formattedLoanAmount,
            conversationUrl: chatLink
          });

          await resend.emails.send({
            from: 'Ableman Rei <notifications@ableman.co>',
            to: lender.email,
            reply_to: replyToAddress,
            subject: `New reply from ${buyerName} - Ableman`,
            html: htmlFallback,
            amp: ampHtml
          });

          console.log('Notification sent to lender:', lender.email);
        }
      } else if (senderInfo.type === 'lender') {
        // Lender sent message, notify buyer
        const buyer = conversation.users;
        if (buyer?.email) {
          const lenderName = conversation.lenders?.company_name ||
                            conversation.lenders?.contact_name ||
                            'Your lender';
          const buyerName = buyer.first_name && buyer.last_name
            ? `${buyer.first_name} ${buyer.last_name}`
            : 'there';
          const chatLink = `${process.env.NEXT_PUBLIC_BUYER_URL || 'https://ableman.co'}/buyer/conversations/${conversationId}`;

          // Generate AMP and HTML versions
          const ampHtml = generateAMPEmail({
            conversationId,
            senderName: lenderName,
            messageText,
            propertyType: conversation.property_type,
            loanAmount: formattedLoanAmount,
            recipientType: 'buyer',
            conversationUrl: chatLink
          });

          const htmlFallback = generateHTMLFallback({
            conversationId,
            senderName: lenderName,
            messageText,
            propertyType: conversation.property_type,
            loanAmount: formattedLoanAmount,
            conversationUrl: chatLink
          });

          await resend.emails.send({
            from: 'Ableman Rei <notifications@ableman.co>',
            to: buyer.email,
            reply_to: replyToAddress,
            subject: `New reply from ${lenderName} - Ableman`,
            html: htmlFallback,
            amp: ampHtml
          });

          console.log('Notification sent to buyer:', buyer.email);
        }
      }
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Don't fail the request if notification fails
    }

    // Return success response (AMP format)
    return NextResponse.json({
      success: true,
      message: 'Reply sent successfully'
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'AMP-Access-Control-Allow-Source-Origin': request.headers.get('origin') || '*'
      }
    });

  } catch (error) {
    console.error('AMP reply handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'AMP-Access-Control-Allow-Source-Origin': request.headers.get('origin') || '*'
    }
  });
}
