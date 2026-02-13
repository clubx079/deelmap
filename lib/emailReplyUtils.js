/**
 * Email Reply Utilities
 * Handles generation of reply-to addresses, parsing inbound emails, and message routing
 */

import crypto from 'crypto';

/**
 * Generate a unique reply-to email address for a conversation
 * Format: conv_<conversationId>_<random>@inbound.ableman.co
 */
export function generateReplyToAddress(conversationId) {
  const randomString = crypto.randomBytes(8).toString('hex');
  return `conv_${conversationId}_${randomString}@inbound.ableman.co`;
}

/**
 * Parse conversation ID from reply-to email address
 * Input: conv_123_abc123def@inbound.ableman.co
 * Output: 123
 */
export function parseConversationIdFromEmail(email) {
  const match = email.match(/conv_(\d+)_[a-f0-9]+@inbound\.ableman\.co/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Clean email content by removing quoted replies and signatures
 */
export function cleanEmailContent(text, html) {
  if (!text && !html) return { cleanText: '', cleanHtml: '' };

  // Clean text version
  let cleanText = text || '';

  // Remove common reply patterns
  const replyPatterns = [
    /^On .+ wrote:[\s\S]*/m,
    /^-+\s*Original Message\s*-+[\s\S]*/m,
    /^From:.*[\s\S]*/m,
    /^>.*$/gm, // Remove quoted lines starting with >
  ];

  replyPatterns.forEach(pattern => {
    cleanText = cleanText.replace(pattern, '');
  });

  // Trim whitespace
  cleanText = cleanText.trim();

  // Clean HTML version (basic cleaning)
  let cleanHtml = html || '';

  // Remove blockquote sections (common in email replies)
  cleanHtml = cleanHtml.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '');

  // Remove Gmail quote sections
  cleanHtml = cleanHtml.replace(/<div class="gmail_quote">[\s\S]*?<\/div>/gi, '');

  return {
    cleanText: cleanText || text || '',
    cleanHtml: cleanHtml || html || ''
  };
}

/**
 * Determine sender type (lender/buyer) from email address
 */
export async function determineSenderType(email, conversationId, supabase) {
  // First, get the conversation details
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select(`
      id,
      lender_id,
      user_id,
      financing_requests (
        email,
        user_id
      )
    `)
    .eq('id', conversationId)
    .single();

  if (error || !conversation) {
    return { type: null, senderId: null };
  }

  // Check if sender is lender
  const { data: lender } = await supabase
    .from('lenders')
    .select('id, email')
    .eq('id', conversation.lender_id)
    .single();

  if (lender && lender.email.toLowerCase() === email.toLowerCase()) {
    return {
      type: 'lender',
      senderId: lender.id,
      recipientType: 'user',
      recipientId: conversation.user_id
    };
  }

  // Check if sender is buyer (from registered user)
  if (conversation.financing_requests?.user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', conversation.financing_requests.user_id)
      .single();

    if (user && user.email.toLowerCase() === email.toLowerCase()) {
      return {
        type: 'user',
        senderId: conversation.user_id,
        recipientType: 'lender',
        recipientId: conversation.lender_id
      };
    }
  }

  // Check if sender matches financing request email
  if (conversation.financing_requests?.email &&
      conversation.financing_requests.email.toLowerCase() === email.toLowerCase()) {
    return {
      type: 'user',
      senderId: conversation.user_id,
      recipientType: 'lender',
      recipientId: conversation.lender_id
    };
  }

  return { type: null, senderId: null };
}

/**
 * Extract plain text from HTML email
 */
export function extractTextFromHtml(html) {
  if (!html) return '';

  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Replace <br> and <p> tags with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');

  // Remove all other HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');

  // Clean up extra whitespace
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.trim();

  return text;
}

/**
 * Validate Resend webhook signature (for security)
 */
export function validateResendWebhook(signature, body, secret) {
  if (!signature || !secret) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(JSON.stringify(body)).digest('hex');

  return signature === digest;
}
