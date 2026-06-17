import { notFound } from 'next/navigation'
import { getServiceClient } from '@/lib/community/auth'
import { LotPageClient } from './LotPageClient'

export const revalidate = 120

const SITE = 'https://deelmap.com'

const CATEGORY_LABELS = {
  real_estate: 'Real Estate',
  lending:     'Lending & Capital',
  finance:     'Finance & Strategy',
  contractors: 'Contractors & Trades',
  markets:     'Markets',
}

async function getLotMeta(lotSlug) {
  const slug = typeof lotSlug === 'string' ? lotSlug.trim() : ''
  if (!slug) return null
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('community_lots')
    .select('slug, name, description, category, post_count, member_count, is_active')
    .eq('slug', slug)
    .maybeSingle()
  if (!data || !data.is_active) return null
  return data
}

export async function generateMetadata({ params }) {
  const { lotSlug } = await params
  const lot = await getLotMeta(lotSlug)
  if (!lot) return { title: 'Lot not found | DeelMap Community' }

  const cat = CATEGORY_LABELS[lot.category] || 'Community'
  const title = `${lot.name} — ${cat} | DeelMap Community`
  const description =
    lot.description?.trim() ||
    `${lot.name}: wholesale real-estate discussions on DeelMap. ${lot.post_count || 0} posts. Join the conversation.`
  const url = `${SITE}/community/${lot.slug}`

  return {
    title,
    description,
    metadataBase: new URL(SITE),
    openGraph: { title, description, url, siteName: 'DeelMap', type: 'website', locale: 'en_US' },
    twitter: { card: 'summary', title, description },
    alternates: { canonical: url },
  }
}

function buildJsonLd(lot) {
  const url = `${SITE}/community/${lot.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: lot.name,
    ...(lot.description ? { description: lot.description } : {}),
    url,
    isPartOf: { '@type': 'WebSite', name: 'DeelMap Community', url: `${SITE}/community` },
  }
}

export default async function LotPage({ params }) {
  const { lotSlug } = await params
  const lot = await getLotMeta(lotSlug)
  if (!lot) notFound()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(lot)) }}
      />
      <LotPageClient lotSlug={lotSlug} />
    </>
  )
}
