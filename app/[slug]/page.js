//app/[slug]/page.js
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { supabaseMarketplace } from '@/lib/supabase'
import { PropertyDetail } from '@/components/property/PropertyDetail'
import { getPreferredPhotoUrl } from '@/utils/propertyPhotos'
import { normalizeWholesaleDeal, normalizeManualProperty } from '@/lib/propertyMappers'
import { toCitySlug } from '@/lib/cityUtils'

export const revalidate = 3600

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

    // Fall back to agent_phone/agent_name columns on the deal itself
    if (!agent) {
      agent = {
        name: wholesaleProperty.agent_name || null,
        phone: wholesaleProperty.agent_phone || null
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
    let agent = null

    // Buyer-posted deal: fetch buyer's phone from users table
    if (manualProperty.posted_by) {
      const { data: buyer } = await supabaseMarketplace
        .from('users')
        .select('first_name, last_name, phone')
        .eq('id', manualProperty.posted_by)
        .single()
      if (buyer) {
        agent = {
          name: [buyer.first_name, buyer.last_name].filter(Boolean).join(' ') || 'Buyer',
          phone: buyer.phone || null
        }
      }
    } else if (manualProperty.seller_id) {
      const { data: seller } = await supabaseMarketplace
        .from('users')
        .select('first_name, last_name, phone')
        .eq('id', manualProperty.seller_id)
        .single()
      if (seller) {
        agent = {
          name: [seller.first_name, seller.last_name].filter(Boolean).join(' ') || 'Seller',
          phone: seller.phone || null
        }
      }
    }

    // Normalize and return
    const normalized = normalizeManualProperty(manualProperty, manualProperty.property_images || [])
    return {
      ...normalized,
      agent,
      posted_by: manualProperty.posted_by || null,
      source: 'manual'
    }
  }

  // Not found in either table
  return null
}

const SITE = 'https://deelmap.com'

function buildJsonLd(property) {
  const fullAddress = property.full_address || property.display_address ||
    [property.address, property.city, property.state, property.zip_code].filter(Boolean).join(', ')
  const url = `${SITE}/${property.slug || property.id}`
  const photos = (property.property_photos || [])
    .map(p => getPreferredPhotoUrl(p))
    .filter(Boolean)

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: fullAddress,
    description: property.description || `${property.bedrooms || 0} bed, ${property.bathrooms || 0} bath investment property in ${property.city || ''}, ${property.state || ''}.`,
    url,
    image: photos.slice(0, 5),
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.address || '',
      addressLocality: property.city || '',
      addressRegion: property.state || '',
      postalCode: property.zip_code || '',
      addressCountry: 'US',
    },
  }

  if (property.bedrooms) ld.numberOfRooms = property.bedrooms
  if (property.sqft) ld.floorSize = { '@type': 'QuantitativeValue', value: property.sqft, unitCode: 'FTK' }

  const price = Number(property.price)
  if (isFinite(price) && price > 0) {
    ld.offers = {
      '@type': 'Offer',
      price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url,
    }
  }

  return ld
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params
  const property = await getProperty(resolvedParams.slug)

  if (!property) {
    return { title: 'Property Not Found | DeelMap' }
  }

  const price = Number(property.price)
  const formattedPrice = isFinite(price) && price > 0
    ? `$${price.toLocaleString('en-US')}`
    : property.listing_type === 'auction' ? 'Auction Listing' : 'Contact for Price'

  const fullAddress = property.full_address || property.display_address ||
    [property.address, property.city, property.state, property.zip_code].filter(Boolean).join(', ')

  const title = `${fullAddress} — ${formattedPrice} | DeelMap`
  const description = property.description ||
    `${property.bedrooms || 0} bed, ${property.bathrooms || 0} bath ${property.property_type || 'investment property'} in ${property.city || ''}, ${property.state || ''}. View details, photos, and contact the seller on DeelMap.`

  const pathSegment = property.slug || property.id
  const url = `${SITE}/${pathSegment}`
  const primaryImageUrl = getPreferredPhotoUrl(property.property_photos?.[0])
  const hasValidImage = Boolean(primaryImageUrl)

  return {
    title,
    description,
    metadataBase: new URL(SITE),
    openGraph: {
      title,
      description,
      url,
      siteName: 'DeelMap',
      images: hasValidImage ? [{ url: primaryImageUrl, width: 1200, height: 800, alt: fullAddress }] : [],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: hasValidImage ? [primaryImageUrl] : [],
    },
    alternates: { canonical: url },
  }
}

export default async function PropertyPage({ params }) {
  const resolvedParams = await params
  const property = await getProperty(resolvedParams.slug)

  if (!property) {
    notFound()
  }

  const citySlug = toCitySlug(property.city, property.state)
  const fullAddress = property.full_address || property.display_address || property.address

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Marketplace', item: `${SITE}/marketplace` },
      ...(citySlug ? [{ '@type': 'ListItem', position: 3, name: `${property.city}, ${property.state}`, item: `${SITE}/deals/${citySlug}` }] : []),
      { '@type': 'ListItem', position: citySlug ? 4 : 3, name: fullAddress || 'Property', item: `${SITE}/${property.slug || property.id}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(property)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {citySlug && (
        <div className="fixed top-[80px] left-0 right-0 z-[50] bg-white border-b border-[#E8E8E4] px-5 md:px-[45px] py-2">
          <nav className="text-[12px] text-[#737370] flex items-center gap-1.5">
            <Link href="/marketplace" className="hover:text-[#1A1816] transition-colors">Marketplace</Link>
            <span>/</span>
            <Link href={`/deals/${citySlug}`} className="hover:text-[#1A1816] transition-colors">
              {property.city}, {property.state}
            </Link>
            <span>/</span>
            <span className="text-[#1A1816] truncate max-w-[200px]">{fullAddress || 'Property'}</span>
          </nav>
        </div>
      )}
      <Suspense>
        <PropertyDetail property={property} />
      </Suspense>
    </>
  )
}