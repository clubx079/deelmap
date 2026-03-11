import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Marketplace DB: financing_requests (run scripts/marketplace-create-financing-requests.sql first)
const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      userId,
      firstName,
      lastName,
      email,
      phone,
      propertyType,
      propertyAddress,
      transactionType,
      loanAmount,
      creditScore,
      comments,
      mondayItemId
    } = body

    console.log('Financing request received:', {
      userId,
      firstName,
      lastName,
      email,
      hasUserId: !!userId
    })

    // Validate required fields
    if (!userId) {
      console.error('Missing userId in financing request')
      return NextResponse.json(
        { error: 'User must be logged in to submit financing request' },
        { status: 401 }
      )
    }

    if (!firstName || !lastName || !email || !phone || !propertyType || !transactionType || !loanAmount || !creditScore) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Insert financing request into Supabase (Marketplace DB).
    const insertData = {
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      property_type: propertyType,
      property_address: propertyAddress || null,
      transaction_type: transactionType,
      loan_amount: parseFloat(loanAmount),
      credit_score: creditScore,
      comments: comments || null,
      monday_item_id: mondayItemId || null
    }

    console.log('Inserting to Supabase:', insertData)

    const { data, error } = await supabase
      .from('financing_requests')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save financing request', details: error.message },
        { status: 500 }
      )
    }

    console.log('Financing request saved successfully:', data)

    return NextResponse.json({
      success: true,
      data: data
    })

  } catch (error) {
    console.error('Error in financing API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const email = searchParams.get('email')

    let query = supabase
      .from('financing_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    } else if (email) {
      query = query.eq('email', email)
    } else {
      return NextResponse.json(
        { error: 'userId or email parameter required' },
        { status: 400 }
      )
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch financing requests', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data
    })

  } catch (error) {
    console.error('Error in financing API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
