import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

function hotScore(p) {
  const score = p.upvote_count + p.save_count * 2 + p.comment_count * 0.5
  const ageHours = (Date.now() - new Date(p.created_at).getTime()) / 3600000
  return score / Math.pow(ageHours + 2, 1.5)
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const channel = searchParams.get('channel')
  const sort = searchParams.get('sort') || 'hot'
  const type = searchParams.get('type')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('community_posts')
    .select('*, channel:community_channels!channel_id(slug, name)')
    .range(offset, offset + limit - 1)

  if (channel) {
    const { data: ch } = await supabase.from('community_channels').select('id').eq('slug', channel).maybeSingle()
    if (ch) query = query.eq('channel_id', ch.id)
  }

  if (type) query = query.eq('post_type', type)

  if (sort === 'new') query = query.order('created_at', { ascending: false })
  else if (sort === 'top') query = query.order('upvote_count', { ascending: false })
  else query = query.order('hot_score', { ascending: false })

  const { data, error } = await query
  if (error) return NextResponse.json([], { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request) {
  try {
    const { channelSlug, postType, title, body, userId, userName,
      address, propertyType, dealType, askingPrice, arv, estRepairs,
      beds, baths, sqft } = await request.json()

    if (!channelSlug || !postType || !title || !userId || !userName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: channel } = await supabase
      .from('community_channels')
      .select('id')
      .eq('slug', channelSlug)
      .maybeSingle()

    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

    const spread = askingPrice && arv ? arv - askingPrice - (estRepairs || 0) : null

    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        channel_id: channel.id,
        user_id: userId,
        user_name: userName,
        post_type: postType,
        title,
        body: body || null,
        address: address || null,
        property_type: propertyType || null,
        deal_type: dealType || null,
        asking_price: askingPrice || null,
        arv: arv || null,
        est_repairs: estRepairs || null,
        spread,
        beds: beds || null,
        baths: baths || null,
        sqft: sqft || null,
        hot_score: 0,
      })
      .select('*, channel:community_channels!channel_id(slug, name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update channel post count
    await supabase.from('community_channels')
      .update({ post_count: supabase.from('community_channels').select('post_count') })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
