import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Marketplace DB: users, user_favorites
const supabaseUrl = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const supabaseService = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// GET: Get user's favorites
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authHeader.replace('Bearer ', '')

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's favorites
    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select('property_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching favorites:', error)
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
    }

    return NextResponse.json({ 
      favorites: favorites || [],
      count: favorites?.length || 0
    })

  } catch (error) {
    console.error('Favorites GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Add favorite
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authHeader.replace('Bearer ', '')
    const { property_id } = await request.json()

    if (!property_id) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Use service role for insert to avoid RLS issues
    const client = supabaseService || supabase

    // Check if already favorited
    const { data: existing } = await client
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('property_id', property_id)
      .single()

    if (existing) {
      return NextResponse.json({ 
        message: 'Already favorited',
        favorited: true 
      })
    }

    // Add favorite
    const { data, error } = await client
      .from('user_favorites')
      .insert([{
        user_id: userId,
        property_id: property_id
      }])
      .select()
      .single()

    if (error) {
      console.error('Error adding favorite:', error)
      return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Favorite added',
      favorited: true,
      favorite: data
    })

  } catch (error) {
    console.error('Favorites POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Remove favorite
export async function DELETE(request) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authHeader.replace('Bearer ', '')
    const { searchParams } = new URL(request.url)
    const property_id = searchParams.get('property_id')

    if (!property_id) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Use service role for delete to avoid RLS issues
    const client = supabaseService || supabase

    // Remove favorite
    const { error } = await client
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', property_id)

    if (error) {
      console.error('Error removing favorite:', error)
      return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Favorite removed',
      favorited: false
    })

  } catch (error) {
    console.error('Favorites DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
