import { supabaseMarketplace } from '@/lib/supabase'
import { toCitySlug } from '@/lib/cityUtils'

const ABBR_TO_SLUG = {
  AL:'alabama',AK:'alaska',AZ:'arizona',AR:'arkansas',CA:'california',CO:'colorado',
  CT:'connecticut',DE:'delaware',FL:'florida',GA:'georgia',HI:'hawaii',ID:'idaho',
  IL:'illinois',IN:'indiana',IA:'iowa',KS:'kansas',KY:'kentucky',LA:'louisiana',
  ME:'maine',MD:'maryland',MA:'massachusetts',MI:'michigan',MN:'minnesota',MS:'mississippi',
  MO:'missouri',MT:'montana',NE:'nebraska',NV:'nevada',NH:'new-hampshire',NJ:'new-jersey',
  NM:'new-mexico',NY:'new-york',NC:'north-carolina',ND:'north-dakota',OH:'ohio',
  OK:'oklahoma',OR:'oregon',PA:'pennsylvania',RI:'rhode-island',SC:'south-carolina',
  SD:'south-dakota',TN:'tennessee',TX:'texas',UT:'utah',VT:'vermont',VA:'virginia',
  WA:'washington',WV:'west-virginia',WI:'wisconsin',WY:'wyoming',
}

export const revalidate = 3600

const SITE = 'https://deelmap.com'

export default async function sitemap() {
  const staticPages = [
    { url: SITE, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/marketplace`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE}/wholesale-real-estate`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/how-to-find-off-market-properties`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/how-to-wholesale-real-estate`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/what-is-arv`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const { data: stateRows } = await supabaseMarketplace
    .from('wholesale_deals')
    .select('state')
    .eq('status', 'active')
    .not('state', 'is', null)

  const stateSlugs = [...new Set(
    (stateRows || [])
      .map(r => ABBR_TO_SLUG[r.state?.trim().toUpperCase()])
      .filter(Boolean)
  )]

  const statePages = stateSlugs.map(state => ({
    url: `${SITE}/wholesale-real-estate/${state}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

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

  const cityPages = []
  for (const [citySlug] of Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 200)) {
    cityPages.push({ url: `${SITE}/deals/${citySlug}`, changeFrequency: 'daily', priority: 0.7 })
  }

  return [...staticPages, ...statePages, ...listingPages, ...manualPages, ...cityPages]
}
