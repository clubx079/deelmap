import { notFound } from 'next/navigation'
import { parseCitySlug } from '@/lib/cityUtils'
import { MarketplaceView } from '@/components/marketplace/MarketplaceView'

const SITE = 'https://deelmap.com'

export const revalidate = 3600

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

  return <MarketplaceView defaultSearch={`${parsed.city}, ${parsed.state}`} />
}
