import { supabaseMarketplace } from '@/lib/supabase'
import { toCitySlug, TYPE_MAP } from '@/lib/cityUtils'

export const revalidate = 3600

const SITE = 'https://deelmap.com'

export default async function sitemap() {
  const staticPages = [
    { url: SITE, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/marketplace`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE}/how-to-find-off-market-properties`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/how-to-wholesale-real-estate`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/what-is-arv`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/wholesale-real-estate`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const { data: deals } = await supabaseMarketplace
    .from('wholesale_deals')
    .select('slug, id, updated_at')
    .in('status', ['active', 'pending'])
    .order('updated_at', { ascending: false })
    .limit(5000)

  const listingPages = (deals || []).map(deal => ({
    url: `${SITE}/${deal.slug || deal.id}`,
    lastModified: deal.updated_at ? new Date(deal.updated_at) : new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  const { data: manualDeals } = await supabaseMarketplace
    .from('properties')
    .select('slug, id, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1000)

  const manualPages = (manualDeals || []).map(p => ({
    url: `${SITE}/${p.slug || p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  // City landing pages
  const { data: cityRows } = await supabaseMarketplace
    .from('wholesale_deals')
    .select('city, state')
    .eq('status', 'active')
    .not('city', 'is', null)
    .not('state', 'is', null)

  const cityCount = {}
  for (const row of cityRows || []) {
    if (!row.city || !row.state) continue
    const slug = toCitySlug(row.city, row.state)
    if (slug) cityCount[slug] = (cityCount[slug] || 0) + 1
  }

  const typeKeys = Object.keys(TYPE_MAP)
  const cityPages = []
  for (const [citySlug] of Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 200)) {
    cityPages.push({ url: `${SITE}/deals/${citySlug}`, changeFrequency: 'daily', priority: 0.7 })
    for (const type of typeKeys) {
      cityPages.push({ url: `${SITE}/deals/${citySlug}/${type}`, changeFrequency: 'daily', priority: 0.6 })
    }
  }

  return [...staticPages, ...listingPages, ...manualPages, ...cityPages]
}
