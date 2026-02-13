// lib/sms.js
// Shared SMS utility for sending messages via OpenPhone

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY
const DEFAULT_FROM_NUMBER = process.env.OPENPHONE_FROM_NUMBER || '+13323333839'

/**
 * Send SMS via OpenPhone API
 * @param {string} to - Recipient phone number
 * @param {string} message - SMS message content
 * @param {string} from - Optional sender number
 * @returns {Promise<{success: boolean, message_id?: string, error?: string}>}
 */
export async function sendSMS({ to, message, from }) {
  try {
    if (!to || !message) {
      throw new Error('Phone number and message are required')
    }

    if (!OPENPHONE_API_KEY) {
      throw new Error('OpenPhone API key not configured')
    }

    // Format phone number (remove spaces, dashes, parentheses)
    const formattedTo = to.replace(/[\s\-\(\)]/g, '')
    const formattedFrom = (from || DEFAULT_FROM_NUMBER).replace(/[\s\-\(\)]/g, '')

    // Ensure numbers start with +
    const toNumber = formattedTo.startsWith('+') ? formattedTo : `+1${formattedTo}`
    const fromNumber = formattedFrom.startsWith('+') ? formattedFrom : `+1${formattedFrom}`

    console.log('🔵 Sending SMS:', {
      to: toNumber,
      from: fromNumber,
      message: message.substring(0, 50) + '...'
    })

    // Send SMS via OpenPhone API with 10 second timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    let response
    try {
      response = await fetch('https://api.openphone.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': OPENPHONE_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromNumber,
          to: [toNumber],
          content: message
        }),
        signal: controller.signal
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('❌ OpenPhone fetch error:', fetchError)
      return {
        success: false,
        error: 'Failed to connect to OpenPhone API',
        details: fetchError.message
      }
    }

    clearTimeout(timeoutId)

    // Get raw response text first for debugging
    const responseText = await response.text()
    console.log('OpenPhone API Response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    })

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse OpenPhone response:', parseError)
      return {
        success: false,
        error: 'Invalid response from OpenPhone API',
        details: responseText
      }
    }

    if (!response.ok) {
      console.error('OpenPhone API error:', data)
      return {
        success: false,
        error: data.message || 'Failed to send SMS',
        details: data
      }
    }

    console.log('SMS sent successfully:', data)

    return {
      success: true,
      message: 'SMS sent successfully',
      message_id: data.id,
      to: toNumber,
      from: fromNumber
    }

  } catch (error) {
    console.error('SMS sending error:', error)
    return {
      success: false,
      error: 'Failed to send SMS',
      details: error.message
    }
  }
}
