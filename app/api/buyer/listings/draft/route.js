import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

function generateSlug() {
  const alpha = 'abcdefghjkmnpqrstuvwxyz'
  const nums = '23456789'
  const p1 = Array.from({ length: 7 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join('')
  const p2 = Array.from({ length: 2 }, () => nums[Math.floor(Math.random() * nums.length)]).join('')
  return p1 + p2
}

// POST — create a new draft listing (no payment required)
export async function POST(request) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const slug = generateSlug()

    const { data, error } = await supabase
      .from('properties')
      .insert({
        slug,
        seo_title: body.title || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zipcode: body.zipcode || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        price: body.price || null,
        property_type: body.property_type || null,
        bedrooms: body.bedrooms || null,
        bathrooms: body.bathrooms || null,
        floor_area: body.floor_area || null,
        description: body.description || null,
        repairs: body.repairs || null,
        inspection_report_url: body.inspection_report_url || null,
        seller_type: body.seller_type || null,
        contract_url: body.contract_url || null,
        status: 'draft',
        posted_by: userId,
      })
      .select('id, slug')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, id: data.id })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH — update an existing draft
export async function PATCH(request) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, ...body } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const update = {}
    if (body.title !== undefined) update.seo_title = body.title || null
    if (body.address !== undefined) update.address = body.address
    if (body.city !== undefined) update.city = body.city || null
    if (body.state !== undefined) update.state = body.state
    if (body.zipcode !== undefined) update.zipcode = body.zipcode || null
    if (body.latitude !== undefined) update.latitude = body.latitude
    if (body.longitude !== undefined) update.longitude = body.longitude
    if (body.price !== undefined) update.price = body.price
    if (body.property_type !== undefined) update.property_type = body.property_type
    if (body.bedrooms !== undefined) update.bedrooms = body.bedrooms
    if (body.bathrooms !== undefined) update.bathrooms = body.bathrooms
    if (body.floor_area !== undefined) update.floor_area = body.floor_area
    if (body.description !== undefined) update.description = body.description
    if (body.repairs !== undefined) update.repairs = body.repairs
    if (body.inspection_report_url !== undefined) update.inspection_report_url = body.inspection_report_url || null
    if (body.seller_type !== undefined) update.seller_type = body.seller_type || null
    if (body.contract_url !== undefined) update.contract_url = body.contract_url || null

    const { error } = await supabase
      .from('properties')
      .update(update)
      .eq('id', id)
      .eq('posted_by', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
