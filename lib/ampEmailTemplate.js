/**
 * AMP Email Template for Inline Replies
 * Provides Monday.com-style reply box directly in email
 */

/**
 * Generate AMP email with inline reply box
 * @param {Object} params - Template parameters
 * @param {number} params.conversationId - Conversation ID
 * @param {string} params.senderName - Name of message sender
 * @param {string} params.messageText - Message content preview
 * @param {string} params.propertyType - Property type (optional)
 * @param {string} params.loanAmount - Loan amount (optional)
 * @param {string} params.recipientType - 'buyer' or 'lender'
 * @param {string} params.conversationUrl - Deep link to conversation
 * @returns {string} AMP-compliant HTML email
 */
export function generateAMPEmail({
  conversationId,
  senderName,
  messageText,
  propertyType = '',
  loanAmount = '',
  recipientType,
  conversationUrl
}) {
  const apiEndpoint = recipientType === 'buyer'
    ? 'https://ableman.co/api/email/amp-reply'
    : 'https://admin.ableman.co/api/email/amp-reply';

  const truncatedMessage = messageText.length > 200
    ? messageText.substring(0, 200) + '...'
    : messageText;

  return `<!doctype html>
<html ⚡4email data-css-strict>
<head>
  <meta charset="utf-8">
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  <script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script>
  <script async custom-template="amp-mustache" src="https://cdn.ampproject.org/v0/amp-mustache-0.2.js"></script>
  <style amp4email-boilerplate>body{visibility:hidden}</style>
  <style amp-custom>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #002B45 0%, #004d73 100%);
      color: white;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 32px 24px;
    }
    .sender-info {
      margin-bottom: 24px;
    }
    .sender-name {
      font-size: 18px;
      font-weight: 600;
      color: #002B45;
      margin-bottom: 4px;
    }
    .message-label {
      font-size: 13px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .message-preview {
      background-color: #f8f9fa;
      border-left: 4px solid #002B45;
      padding: 16px;
      border-radius: 4px;
      margin-bottom: 24px;
      font-size: 15px;
      line-height: 1.6;
      color: #333;
    }
    .context-info {
      background-color: #f0f7ff;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 24px;
      font-size: 13px;
      color: #004d73;
    }
    .reply-section {
      background-color: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .reply-title {
      font-size: 16px;
      font-weight: 600;
      color: #002B45;
      margin-bottom: 16px;
    }
    .reply-textarea {
      width: 100%;
      min-height: 100px;
      padding: 12px;
      border: 1px solid #d0d0d0;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;
    }
    .reply-button {
      background: linear-gradient(135deg, #002B45 0%, #004d73 100%);
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 12px;
      width: 100%;
    }
    .success-message {
      background-color: #d4edda;
      color: #155724;
      padding: 16px;
      border-radius: 6px;
      border-left: 4px solid #28a745;
      margin-top: 16px;
      font-size: 14px;
    }
    .error-message {
      background-color: #f8d7da;
      color: #721c24;
      padding: 16px;
      border-radius: 6px;
      border-left: 4px solid #dc3545;
      margin-top: 16px;
      font-size: 14px;
    }
    .view-conversation {
      display: inline-block;
      background-color: white;
      color: #002B45;
      border: 2px solid #002B45;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      margin-top: 16px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e0e0e0;
    }
    .footer-text {
      color: #666;
      font-size: 13px;
      line-height: 1.6;
      margin: 0;
    }
    .footer-link {
      color: #004d73;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1>New Message from ${senderName}</h1>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Sender Info -->
      <div class="sender-info">
        <div class="sender-name">${senderName}</div>
        <div class="message-label">sent you a message</div>
      </div>

      <!-- Message Preview -->
      <div class="message-preview">
        ${truncatedMessage}
      </div>

      ${propertyType || loanAmount ? `
      <!-- Context Info -->
      <div class="context-info">
        ${propertyType ? `<strong>Property:</strong> ${propertyType}<br>` : ''}
        ${loanAmount ? `<strong>Loan Amount:</strong> ${loanAmount}` : ''}
      </div>
      ` : ''}

      <!-- Inline Reply Section -->
      <div class="reply-section">
        <div class="reply-title">Reply directly from your email</div>

        <amp-form method="post" action-xhr="${apiEndpoint}">
          <input type="hidden" name="conversation_id" value="${conversationId}">

          <textarea
            name="message"
            class="reply-textarea"
            placeholder="Type your reply here..."
            required
          ></textarea>

          <button type="submit" class="reply-button">Send Reply</button>

          <!-- Success Message -->
          <div submit-success>
            <template type="amp-mustache">
              <div class="success-message">
                ✓ Your reply has been sent successfully!
              </div>
            </template>
          </div>

          <!-- Error Message -->
          <div submit-error>
            <template type="amp-mustache">
              <div class="error-message">
                ✗ Failed to send reply. Please try again or reply directly in the portal.
              </div>
            </template>
          </div>
        </amp-form>
      </div>

      <!-- View in Portal Link -->
      <div style="text-align: center;">
        <a href="${conversationUrl}" class="view-conversation">
          View Full Conversation
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-text">
        You received this email because you have an active conversation on
        <a href="https://ableman.co" class="footer-link">Ableman REI</a>.
        <br><br>
        Questions? Contact us at <a href="mailto:support@ableman.co" class="footer-link">support@ableman.co</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate HTML fallback (for email clients that don't support AMP)
 * @param {Object} params - Same parameters as generateAMPEmail
 * @returns {string} Regular HTML email
 */
export function generateHTMLFallback({
  conversationId,
  senderName,
  messageText,
  propertyType = '',
  loanAmount = '',
  conversationUrl
}) {
  const truncatedMessage = messageText.length > 200
    ? messageText.substring(0, 200) + '...'
    : messageText;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #002B45 0%, #004d73 100%);
      color: white;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 32px 24px;
    }
    .sender-info {
      margin-bottom: 24px;
    }
    .sender-name {
      font-size: 18px;
      font-weight: 600;
      color: #002B45;
      margin-bottom: 4px;
    }
    .message-label {
      font-size: 13px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .message-preview {
      background-color: #f8f9fa;
      border-left: 4px solid #002B45;
      padding: 16px;
      border-radius: 4px;
      margin-bottom: 24px;
      font-size: 15px;
      line-height: 1.6;
      color: #333;
    }
    .context-info {
      background-color: #f0f7ff;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 24px;
      font-size: 13px;
      color: #004d73;
    }
    .cta-section {
      text-align: center;
      margin: 32px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #002B45 0%, #004d73 100%);
      color: white;
      padding: 14px 32px;
      border-radius: 6px;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e0e0e0;
    }
    .footer-text {
      color: #666;
      font-size: 13px;
      line-height: 1.6;
      margin: 0;
    }
    .footer-link {
      color: #004d73;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1>New Message from ${senderName}</h1>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Sender Info -->
      <div class="sender-info">
        <div class="sender-name">${senderName}</div>
        <div class="message-label">sent you a message</div>
      </div>

      <!-- Message Preview -->
      <div class="message-preview">
        ${truncatedMessage}
      </div>

      ${propertyType || loanAmount ? `
      <!-- Context Info -->
      <div class="context-info">
        ${propertyType ? `<strong>Property:</strong> ${propertyType}<br>` : ''}
        ${loanAmount ? `<strong>Loan Amount:</strong> ${loanAmount}` : ''}
      </div>
      ` : ''}

      <!-- Call to Action -->
      <div class="cta-section">
        <a href="${conversationUrl}" class="cta-button">
          Reply to Message
        </a>
      </div>

      <p style="text-align: center; color: #666; font-size: 14px; margin-top: 16px;">
        Or reply directly to this email to continue the conversation
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-text">
        You received this email because you have an active conversation on
        <a href="https://ableman.co" class="footer-link">Ableman REI</a>.
        <br><br>
        Questions? Contact us at <a href="mailto:support@ableman.co" class="footer-link">support@ableman.co</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
