import { NextResponse } from 'next/server'

const MONDAY_API_URL = 'https://api.monday.com/v2'
const BOARD_ID = '7789594745'
const GROUP_ID = 'topics'

export async function POST(request) {
  const token = process.env.MONDAY_API_KEY
  if (!token) {
    return NextResponse.json(
      { error: 'Cash-offer intake is not configured. Please contact support.' },
      { status: 500 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const {
    firstName = '',
    lastName = '',
    email = '',
    phoneNumber = '',
    propertyType = '',
    fullAddress = '',
    state = '',
    closingTime = '',
    askingPrice = '',
    negotiable = '',
    contactDate = '',
    condition = '',
  } = body || {}

  if (!firstName || !lastName || !email || !phoneNumber || !fullAddress) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const mutation = `
    mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
      create_item (
        board_id: $boardId,
        group_id: $groupId,
        item_name: $itemName,
        column_values: $columnValues
      ) { id }
    }
  `

  const variables = {
    boardId: BOARD_ID,
    groupId: GROUP_ID,
    itemName: `Cash Offer - ${firstName} ${lastName}`,
    columnValues: JSON.stringify({
      short_text8: firstName,
      short_textcp5kwc0i: lastName,
      email: { email, text: email },
      number: phoneNumber,
      short_text__1: propertyType,
      short_text: fullAddress,
      state__1: state,
      number9: parseInt(closingTime, 10) || 0,
      number0: parseFloat(String(askingPrice).replace(/[^0-9.-]+/g, '')) || 0,
      single_select7: negotiable,
      date: contactDate,
      long_text: condition,
    }),
  }

  try {
    const res = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: mutation, variables }),
    })
    if (!res.ok) {
      const detail = await res.text()
      console.error('Monday API non-OK:', res.status, detail)
      return NextResponse.json({ error: 'Could not submit your request. Please try again.' }, { status: 502 })
    }
    const json = await res.json()
    if (json?.errors?.length) {
      console.error('Monday API errors:', json.errors)
      return NextResponse.json({ error: 'Could not submit your request. Please try again.' }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Cash-offer submission failed:', err)
    return NextResponse.json({ error: 'Could not submit your request. Please try again.' }, { status: 500 })
  }
}
