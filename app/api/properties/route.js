import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    
    let query = supabase
      .from('properties')
      .select('*')
      .eq('status', 'active')

    // Apply filters based on search params
    const states = searchParams.get('states')
    if (states) {
      const stateArray = states.split(',')
      query = query.in('state', stateArray)
    }

    const statuses = searchParams.get('statuses')
    if (statuses) {
      const statusArray = statuses.split(',')
      query = query.in('status', statusArray)
    }

    const minPrice = searchParams.get('minPrice')
    if (minPrice) {
      query = query.gte('price', parseInt(minPrice))
    }

    const maxPrice = searchParams.get('maxPrice')
    if (maxPrice) {
      query = query.lte('price', parseInt(maxPrice))
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}