import { createClient } from '@supabase/supabase-js'

// Single DB (Marketplace): users, user_favorites, wholesale_deals, property_photos, temp_seller_logins, etc.
const supabaseUrl = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY || ''

const client = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null
export const supabase = client
export const supabaseMarketplace = client