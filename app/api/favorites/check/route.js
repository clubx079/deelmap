import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Use seller database (same as users table) for user_favorites
// Marketplace DB: user_favorites
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

// Check if properties are favorited (batch check)
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ favorited: {} })
    }

    const userId = authHeader.replace('Bearer ', '')
    const { property_ids } = await request.json()

    if (!property_ids || !Array.isArray(property_ids) || property_ids.length === 0) {
      return NextResponse.json({ favorited: {} })
    }

    // Use service role for query to avoid RLS issues
    const client = supabaseService || supabase

    // Get all favorites for this user and these properties
    const { data: favorites, error } = await client
      .from('user_favorites')
      .select('property_id')
      .eq('user_id', userId)
      .in('property_id', property_ids)

    if (error) {
      console.error('Error checking favorites:', error)
      return NextResponse.json({ favorited: {} })
    }

    // Create a map of favorited property IDs
    const favoritedMap = {}
    if (favorites) {
      favorites.forEach(fav => {
        favoritedMap[fav.property_id] = true
      })
    }

    return NextResponse.json({ favorited: favoritedMap })

  } catch (error) {
    console.error('Favorites check error:', error)
    return NextResponse.json({ favorited: {} })
  }
}
