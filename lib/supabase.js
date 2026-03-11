import { createClient as _createClient } from '@supabase/supabase-js'

// Build-safe wrapper: provides placeholder during Docker build when env vars are missing
export function createClient(url, key, options) {
  if (!url || !key) {
    return _createClient('https://placeholder.supabase.co', 'placeholder-key', options)
  }
  return _createClient(url, key, options)
}

// Single DB (Marketplace): users, user_favorites, wholesale_deals, property_photos, temp_seller_logins, etc.
const supabaseUrl = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY || ''

const client = createClient(supabaseUrl, supabaseAnonKey)
export const supabase = client
export const supabaseMarketplace = client