// lib/sms.js
// Shared SMS utility for sending messages via AiroSofts

/**
 * Send SMS via AiroSofts API
 * @param {string} to - Recipient phone number
 * @param {string} message - SMS message content
 * @param {string} from - Optional sender number (falls back to AIROSOFTS_SMS_FROM)
 * @returns {Promise<{success: boolean, message_id?: string, error?: string}>}
 */
export async function sendSMS({ to, message, from }) {
  try {
    if (!to || !message) {
      throw new Error('Phone number and message are required')
    }

    if (!process.env.AIROSOFTS_SMS_API_KEY) {
      throw new Error('AiroSofts SMS API key not configured')
    }

    // Format to E.164
    const digits = to.replace(/\D/g, '')
    const toNumber = digits.length === 10
      ? `+1${digits}`
      : (digits.startsWith('+') ? to : `+${digits}`)

    const fromNumber = from || process.env.AIROSOFTS_SMS_FROM

    console.log('🔵 Sending SMS via AiroSofts:', {
      to: toNumber,
      from: fromNumber,
      message: message.substring(0, 50) + '...'
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    let response
    try {
      response = await fetch('https://app.airophone.com/api/external/sms/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIROSOFTS_SMS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromNumber,
          to: toNumber,
          message
        }),
        signal: controller.signal
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('❌ AiroSofts fetch error:', fetchError)
      return {
        success: false,
        error: 'Failed to connect to AiroSofts API',
        details: fetchError.message
      }
    }

    clearTimeout(timeoutId)

    const responseText = await response.text()
    console.log('AiroSofts API Response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    })

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse AiroSofts response:', parseError)
      return {
        success: false,
        error: 'Invalid response from AiroSofts API',
        details: responseText
      }
    }

    if (!response.ok) {
      console.error('AiroSofts API error:', data)
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
