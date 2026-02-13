//app/[slug]/page.js
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PropertyDetail } from '@/components/property/PropertyDetail'
import { getPreferredPhotoUrl } from '@/utils/propertyPhotos'

async function getProperty(slug) {
  // First, try to get the property by ID (slug is the ID)
  const { data: property, error } = await supabase
    .from('wholesale_deals')
    .select('*')
    .eq('id', slug)
    .single()

  if (error || !property) {
    return null
  }

  // Also fetch property photos
  const { data: photos } = await supabase
    .from('property_photos')
    .select('id, photo_url, optimized_url, original_url, display_order')
    .eq('deal_id', property.id)
    .order('display_order', { ascending: true })

  // Fetch agent (temp seller) when linked
  let agent = null
  if (property.temp_seller_id) {
    const { data: tempSeller } = await supabase
      .from('temp_seller_logins')
      .select('seller_name, seller_phone')
      .eq('id', property.temp_seller_id)
      .single()
    if (tempSeller) {
      agent = {
        name: tempSeller.seller_name || 'Agent',
        phone: tempSeller.seller_phone || null
      }
    }
  }

  return {
    ...property,
    property_photos: photos || [],
    agent
  }
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
  const url = `https://ableman.co/${property.id}`

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