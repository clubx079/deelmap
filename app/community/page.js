import { CommunityFeedClient } from './CommunityFeedClient'

const SITE = 'https://deelmap.com'

const title = 'DeelMap Community — Wholesale Real-Estate Deal Discussions'
const description =
  'Join the DeelMap community: wholesalers, investors, lenders, and contractors trading deals, comps, and strategy. Post a deal, ask a question, and find your next opportunity.'

export const metadata = {
  title,
  description,
  metadataBase: new URL(SITE),
  openGraph: { title, description, url: `${SITE}/community`, siteName: 'DeelMap', type: 'website', locale: 'en_US' },
  twitter: { card: 'summary_large_image', title, description },
  alternates: { canonical: `${SITE}/community` },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'DeelMap Community',
  description,
  url: `${SITE}/community`,
  isPartOf: { '@type': 'WebSite', name: 'DeelMap', url: SITE },
}

export default function CommunityPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CommunityFeedClient />
    </>
  )
}
