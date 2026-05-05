import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseMarketplace } from '@/lib/supabase'
import { getPreferredPhotoUrl } from '@/utils/propertyPhotos'
import { parseCitySlug, toCitySlug, TYPE_MAP } from '@/lib/cityUtils'

export const revalidate = 3600

const SITE = 'https://deelmap.com'

async function getCityData(city, state) {
  const { data: deals } = await supabaseMarketplace
    .from('wholesale_deals')
    .select(`
      id, slug, address, full_address, city, state, zip_code,
      price, bedrooms, bathrooms, sqft, property_type, listing_type,
      property_photos!left(photo_url, optimized_url, is_featured)
    `)
    .eq('status', 'active')
    .eq('is_incomplete', false)
    .ilike('city', city)
    .eq('state', state)
    .order('created_at', { ascending: false })
    .limit(20)

  const { count } = await supabaseMarketplace
    .from('wholesale_deals')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .eq('is_incomplete', false)
    .ilike('city', city)
    .eq('state', state)

  return { deals: deals || [], total: count || 0 }
}

export async function generateStaticParams() {
  const { data } = await supabaseMarketplace
    .from('wholesale_deals')
    .select('city, state')
    .eq('status', 'active')
    .not('city', 'is', null)
    .not('state', 'is', null)

  if (!data) return []

  const cityCount = {}
  for (const row of data) {
    if (!row.city || !row.state) continue
    const slug = toCitySlug(row.city, row.state)
    if (slug) cityCount[slug] = (cityCount[slug] || 0) + 1
  }

  return Object.entries(cityCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 200)
    .map(([city]) => ({ city }))
}

export async function generateMetadata({ params }) {
  const { city: citySlug } = await params
  const parsed = parseCitySlug(citySlug)
  if (!parsed) return { title: 'Not Found' }
  const { city, state } = parsed
  const title = `Wholesale Investment Properties in ${city}, ${state} | DeelMap`
  const description = `Browse off-market wholesale and auction investment properties in ${city}, ${state}. Updated daily. Find fix & flip, buy & hold, and BRRRR deals on DeelMap.`
  return {
    title,
    description,
    metadataBase: new URL(SITE),
    openGraph: { title, description, url: `${SITE}/deals/${citySlug}`, siteName: 'DeelMap', locale: 'en_US', type: 'website' },
    alternates: { canonical: `${SITE}/deals/${citySlug}` },
  }
}

export default async function CityPage({ params }) {
  const { city: citySlug } = await params
  const parsed = parseCitySlug(citySlug)
  if (!parsed) notFound()

  const { city, state } = parsed
  const { deals, total } = await getCityData(city, state)

  if (total === 0) notFound()

  const prices = deals.map(d => Number(d.price)).filter(n => n > 0)
  const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Marketplace', item: `${SITE}/marketplace` },
      { '@type': 'ListItem', position: 3, name: `${city}, ${state}`, item: `${SITE}/deals/${citySlug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="min-h-screen bg-[#FAFAF8]">
        {/* Nav spacer */}
        <div className="h-[80px]" />

        <div className="max-w-5xl mx-auto px-5 py-10">

          {/* Breadcrumb */}
          <nav className="text-[13px] text-[#737370] mb-6 flex items-center gap-1.5">
            <Link href="/" className="hover:text-[#1A1816] transition-colors">Home</Link>
            <span>/</span>
            <Link href="/marketplace" className="hover:text-[#1A1816] transition-colors">Marketplace</Link>
            <span>/</span>
            <span className="text-[#1A1816] font-medium">{city}, {state}</span>
          </nav>

          {/* Header */}
          <h1 className="text-[28px] md:text-[36px] font-bold text-[#1A1816] mb-3">
            Investment Properties in {city}, {state}
          </h1>
          <p className="text-[15px] text-[#737370] mb-6 max-w-2xl">
            Browse {total.toLocaleString()} off-market wholesale and auction investment properties in {city}, {state}. Deals updated daily — fix &amp; flip, buy &amp; hold, and BRRRR opportunities.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="bg-white border border-[#E8E8E4] rounded-lg px-5 py-3">
              <p className="text-[11px] font-semibold text-[#737370] uppercase tracking-wider mb-0.5">Total Listings</p>
              <p className="text-[20px] font-bold text-[#1A1816]">{total.toLocaleString()}</p>
            </div>
            {avgPrice && (
              <div className="bg-white border border-[#E8E8E4] rounded-lg px-5 py-3">
                <p className="text-[11px] font-semibold text-[#737370] uppercase tracking-wider mb-0.5">Avg Asking Price</p>
                <p className="text-[20px] font-bold text-[#1A1816]">${avgPrice.toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Type filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            <Link
              href={`/marketplace?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`}
              className="px-4 py-2 bg-[#1A1816] text-white text-[13px] font-medium rounded-full"
            >
              All Listings
            </Link>
            {Object.entries(TYPE_MAP).map(([slug, { label }]) => (
              <Link
                key={slug}
                href={`/deals/${citySlug}/${slug}`}
                className="px-4 py-2 bg-white border border-[#E8E8E4] text-[#444441] text-[13px] font-medium rounded-full hover:border-[#1A1816] hover:text-[#1A1816] transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Listings grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {deals.map(deal => {
              const featuredPhoto = deal.property_photos?.find(p => p.is_featured) || deal.property_photos?.[0]
              const photoUrl = getPreferredPhotoUrl(featuredPhoto)
              const displayAddress = deal.full_address || deal.address || `${city}, ${state}`
              const price = Number(deal.price)
              const priceStr = price > 0 ? `$${price.toLocaleString()}` : deal.listing_type === 'auction' ? 'Auction Listing' : 'Contact for Price'
              const slug = deal.slug || deal.id

              return (
                <Link
                  key={deal.id}
                  href={`/${slug}`}
                  className="bg-white border border-[#E8E8E4] rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
                >
                  {/* Photo */}
                  <div className="aspect-[16/9] bg-[#F0EFE9] overflow-hidden">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={displayAddress}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <img src="/assets/logo.svg" alt="DeelMap" className="h-10 opacity-20" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <p className="text-[15px] font-bold text-[#1A1816] mb-1 line-clamp-1">{priceStr}</p>
                    <p className="text-[13px] text-[#444441] mb-2 line-clamp-1">{displayAddress}</p>
                    <div className="flex items-center gap-3 text-[12px] text-[#737370]">
                      {deal.bedrooms && <span>{deal.bedrooms} bed</span>}
                      {deal.bathrooms && <span>{deal.bathrooms} bath</span>}
                      {deal.sqft && <span>{Number(deal.sqft).toLocaleString()} sqft</span>}
                      {deal.property_type && <span>{deal.property_type}</span>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* CTA to full marketplace */}
          {total > 20 && (
            <div className="mt-8 text-center">
              <Link
                href={`/marketplace?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`}
                className="inline-block bg-[#1A1816] hover:bg-[#333] text-white font-semibold px-6 py-3 rounded transition-colors text-[14px]"
              >
                View all {total.toLocaleString()} properties in {city}, {state}
              </Link>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
