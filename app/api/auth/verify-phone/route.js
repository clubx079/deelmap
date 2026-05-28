// app/api/auth/verify-phone/route.js
import { NextResponse } from 'next/server'

// Numverify API keys (200 keys, 100 lookups each)
const NUMVERIFY_API_KEYS = (process.env.NUMVERIFY_API_KEYS || '').split(',').map(s => s.trim()).filter(Boolean)

// Track current key index (in production, use Redis or database)
let currentKeyIndex = 0

async function verifyWithNumverify(phone, keyIndex = 0) {
  if (keyIndex >= NUMVERIFY_API_KEYS.length) {
    console.error('All Numverify API keys exhausted')
    return { success: false, error: 'Service temporarily unavailable' }
  }

  const apiKey = NUMVERIFY_API_KEYS[keyIndex]
  const url = `http://apilayer.net/api/validate?access_key=${apiKey}&number=${phone}&country_code=US&format=1`

  console.log('\n========== NUMVERIFY API CALL ==========')
  console.log('Phone number:', phone)
  console.log('Using API key index:', keyIndex)
  console.log('API URL:', url.replace(apiKey, 'HIDDEN_KEY'))

  try {
    const response = await fetch(url)
    const data = await response.json()

    console.log('\n---------- NUMVERIFY RESPONSE ----------')
    console.log('Full response:', JSON.stringify(data, null, 2))
    console.log('----------------------------------------\n')

    // Check if API key has no credits left
    if (data.error && (data.error.code === 104 || data.error.info?.includes('monthly'))) {
      console.log(`API key ${keyIndex} exhausted, trying next...`)
      currentKeyIndex = keyIndex + 1
      return verifyWithNumverify(phone, keyIndex + 1)
    }

    if (data.error) {
      console.error('Numverify API error:', data.error)
      return { success: false, error: data.error.info || 'Validation failed' }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Numverify fetch error:', error)
    // Try next key on network error
    return verifyWithNumverify(phone, keyIndex + 1)
  }
}

export async function POST(request) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { valid: false, message: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Clean the phone number - remove all non-digits
    const cleanedPhone = phone.replace(/\D/g, '')

    // Basic validation for US numbers (10 digits without country code)
    if (cleanedPhone.length !== 10) {
      return NextResponse.json(
        { valid: false, message: 'Please enter a valid 10-digit US phone number' },
        { status: 400 }
      )
    }

    // Check for obviously invalid patterns
    const areaCode = cleanedPhone.slice(0, 3)
    const exchange = cleanedPhone.slice(3, 6)

    // Reject all same digits (0000000000, 1111111111, etc.)
    if (/^(\d)\1{9}$/.test(cleanedPhone)) {
      return NextResponse.json(
        { valid: false, message: 'Please enter a valid phone number' },
        { status: 400 }
      )
    }

    // Reject sequential numbers (1234567890, 0123456789)
    if (cleanedPhone === '1234567890' || cleanedPhone === '0123456789') {
      return NextResponse.json(
        { valid: false, message: 'Please enter a valid phone number' },
        { status: 400 }
      )
    }

    // US area codes cannot start with 0 or 1
    if (areaCode.startsWith('0') || areaCode.startsWith('1')) {
      return NextResponse.json(
        { valid: false, message: 'Invalid area code. US area codes cannot start with 0 or 1' },
        { status: 400 }
      )
    }

    // Exchange (next 3 digits) cannot start with 0 or 1
    if (exchange.startsWith('0') || exchange.startsWith('1')) {
      return NextResponse.json(
        { valid: false, message: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Reject fake test numbers (555-0100 to 555-0199 are reserved for fiction)
    if (exchange === '555' && cleanedPhone.slice(6, 8) === '01') {
      return NextResponse.json(
        { valid: false, message: 'Please enter a valid phone number' },
        { status: 400 }
      )
    }

    // Format with country code for Numverify (needs full international format)
    const formattedPhone = `1${cleanedPhone}`

    // Call Numverify API
    const result = await verifyWithNumverify(formattedPhone, currentKeyIndex)

    if (!result.success) {
      return NextResponse.json(
        { valid: false, message: result.error || 'Phone verification service unavailable' },
        { status: 500 }
      )
    }

    const data = result.data

    // Check if the number is valid
    if (!data.valid) {
      console.log('❌ PHONE INVALID - Numverify says invalid')
      console.log('Returning: { valid: false, message: "This phone number appears to be invalid..." }')
      return NextResponse.json(
        { valid: false, message: 'This phone number appears to be invalid. Please enter a valid US phone number.' },
        { status: 400 }
      )
    }

    // Additional check - ensure it's a US number
    if (data.country_code !== 'US') {
      console.log('❌ PHONE INVALID - Not a US number, country_code:', data.country_code)
      return NextResponse.json(
        { valid: false, message: 'Please enter a valid US phone number' },
        { status: 400 }
      )
    }

    // Number is valid
    const response = {
      valid: true,
      message: 'Phone number verified',
      lineType: data.line_type || 'unknown',
      carrier: data.carrier || 'Unknown',
      location: data.location || ''
    }
    console.log('✅ PHONE VALID - Returning:', JSON.stringify(response, null, 2))
    return NextResponse.json(response)

  } catch (error) {
    console.error('Phone verification error:', error)
    return NextResponse.json(
      { valid: false, message: 'Phone verification service temporarily unavailable. Please try again.' },
      { status: 500 }
    )
  }
}
