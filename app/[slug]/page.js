//app/[slug]/page.js
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { supabaseMarketplace } from '@/lib/supabase'
import { PropertyDetail } from '@/components/property/PropertyDetail'
import { getPreferredPhotoUrl } from '@/utils/propertyPhotos'
import { normalizeWholesaleDeal, normalizeManualProperty } from '@/lib/propertyMappers'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function getProperty(slugParam) {
  const slug = typeof slugParam === 'string' ? slugParam.trim() : ''
  if (!slug) return null

  // 1) Resolve by slug first (SEO-friendly short code)
  let wholesaleProperty = null
  let wholesaleError = null
  const { data: bySlug, error: slugErr } = await supabaseMarketplace
    .from('wholesale_deals')
    .select(`
      *,
      property_photos (
        id,
        photo_url,
        optimized_url,
        display_order,
        is_featured
      )
    `)
    .eq('slug', slug)
    .maybeSingle()
  if (!slugErr && bySlug) {
    wholesaleProperty = bySlug
  } else {
    wholesaleError = slugErr
  }

  // 2) If not found by slug and param looks like UUID, try by id (backward compatibility)
  if (!wholesaleProperty && UUID_REGEX.test(slug)) {
    const { data: byId, error: idErr } = await supabaseMarketplace
      .from('wholesale_deals')
      .select(`
        *,
        property_photos (
          id,
          photo_url,
          optimized_url,
          original_url,
          display_order
        )
      `)
      .eq('id', slug)
      .maybeSingle()
    if (!idErr && byId) wholesaleProperty = byId
    else wholesaleError = idErr
  }

  if (wholesaleProperty) {
    // Fetch agent (temp seller) when linked
    let agent = null
    if (wholesaleProperty.temp_seller_id) {
      const { data: tempSeller } = await supabaseMarketplace
        .from('temp_seller_logins')
        .select('seller_name, seller_phone')
        .eq('id', wholesaleProperty.temp_seller_id)
        .single()
      if (tempSeller) {
        agent = {
          name: tempSeller.seller_name || 'Agent',
          phone: tempSeller.seller_phone || null
        }
      }
    }

    // Normalize and return
    const normalized = normalizeWholesaleDeal(wholesaleProperty)
    return {
      ...normalized,
      agent,
      source: 'scraped'
    }
  }

  // 3) Try properties (manual) by slug first
  let manualProperty = null
  const { data: manualBySlug } = await supabaseMarketplace
    .from('properties')
    .select(`
      *,
      property_images (
        id,
        image_url,
        image_key,
        sort_order
      )
    `)
    .eq('slug', slug)
    .maybeSingle()
  if (manualBySlug) manualProperty = manualBySlug

  // 4) If not found by slug and param looks like UUID, try by id
  if (!manualProperty && UUID_REGEX.test(slug)) {
    const { data: manualById } = await supabaseMarketplace
      .from('properties')
      .select(`
        *,
        property_images (
          id,
          image_url,
          image_key,
          sort_order
        )
      `)
      .eq('id', slug)
      .maybeSingle()
    if (manualById) manualProperty = manualById
  }

  if (manualProperty) {
    // Fetch seller info if seller_id exists
    let agent = null
    if (manualProperty.seller_id) {
      const { data: seller } = await supabaseMarketplace
        .from('users')
        .select('full_name, phone')
        .eq('id', manualProperty.seller_id)
        .single()
      if (seller) {
        agent = {
          name: seller.full_name || 'Seller',
          phone: seller.phone || null
        }
      }
    }

    // Normalize and return
    const normalized = normalizeManualProperty(manualProperty, manualProperty.property_images || [])
    return {
      ...normalized,
      agent,
      source: 'manual'
    }
  }

  // Not found in either table
  return null
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params
  const property = await getProperty(resolvedParams.slug)
  
  if (!property) {
    return { title: 'Property Not Found' }
  }

  const price = Number(property.price)
  const formattedPrice = isFinite(price) ? `$${price.toLocaleString('en-US')}` : 'Contact for Price'

  // Build full address from parts
  const fullAddress = property.full_address || property.display_address ||
    `${property.address || ''}, ${property.city || ''}, ${property.state || ''} ${property.zip_code || ''}`.trim()

  const title = `${fullAddress} - ${formattedPrice}`
  const description = property.description || `${property.bedrooms || 0} bed, ${property.bathrooms || 0} bath ${property.property_type || 'home'} for sale.`
  const pathSegment = property.slug || property.id
  const url = `https://ableman.co/${pathSegment}`

  // Use first photo from property_photos if available
  const primaryImageUrl = getPreferredPhotoUrl(property.property_photos?.[0])
  const hasValidImage = Boolean(primaryImageUrl)

  return {
    title,
    description,
    metadataBase: new URL('https://ableman.co'),
    openGraph: {
      title: title,
      description: description,
      url: url,
      siteName: 'Ableman Group LLC',
      images: hasValidImage ? [
        {
          url: primaryImageUrl,
          width: 1200,
          height: 800,
          alt: fullAddress,
          type: 'image/jpeg',
        }
      ] : [],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: hasValidImage ? [primaryImageUrl] : [],
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function PropertyPage({ params }) {
  const resolvedParams = await params
  const property = await getProperty(resolvedParams.slug)

  if (!property) {
    notFound()
  }

  return <PropertyDetail property={property} />
}