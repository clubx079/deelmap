import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS in server-side routes
const supabaseMarketplace = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

// GET — fetch all listings posted by this buyer
export async function GET(request) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseMarketplace
      .from('properties')
      .select('id, slug, seo_title, address, state, latitude, longitude, price, property_type, bedrooms, bathrooms, floor_area, description, repairs, inspection_report_url, status, created_at, posted_by, property_images(image_url, image_key, sort_order)')
      .eq('posted_by', userId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, listings: data || [] })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — create a new listing (called after successful Stripe payment)
export async function POST(request) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    const slug = generateSlug()

    const { data, error } = await supabaseMarketplace
      .from('properties')
      .insert({
        slug,
        seo_title: body.title || null,
        address: body.address,
        state: body.state,
        latitude: body.latitude,
        longitude: body.longitude,
        price: body.price,
        property_type: body.property_type,
        bedrooms: body.bedrooms,
        bathrooms: body.bathrooms,
        floor_area: body.floor_area,
        description: body.description,
        repairs: body.repairs,
        inspection_report_url: body.inspection_report_url || null,
        status: 'active',
        posted_by: userId,
      })
      .select('id, slug')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, id: data.id, slug: data.slug })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH — update an existing listing
export async function PATCH(request) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, ...fields } = body

    // Ensure buyer can only edit their own listing
    const { data, error } = await supabaseMarketplace
      .from('properties')
      .update({
        seo_title: fields.title || null,
        address: fields.address,
        state: fields.state,
        latitude: fields.latitude,
        longitude: fields.longitude,
        price: fields.price,
        property_type: fields.property_type,
        bedrooms: fields.bedrooms,
        bathrooms: fields.bathrooms,
        floor_area: fields.floor_area,
        description: fields.description,
        repairs: fields.repairs,
        inspection_report_url: fields.inspection_report_url || null,
      })
      .eq('id', id)
      .eq('posted_by', userId)
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — delete a listing
export async function DELETE(request) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Delete images first (foreign key constraint)
    await supabaseMarketplace.from('property_images').delete().eq('property_id', id)

    const { error } = await supabaseMarketplace
      .from('properties')
      .delete()
      .eq('id', id)
      .eq('posted_by', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateSlug() {
  const alpha = 'abcdefghjkmnpqrstuvwxyz'
  const nums = '23456789'
  const p1 = Array.from({ length: 7 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join('')
  const p2 = Array.from({ length: 2 }, () => nums[Math.floor(Math.random() * nums.length)]).join('')
  return p1 + p2
}
