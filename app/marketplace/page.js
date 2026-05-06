import { MarketplaceView } from '@/components/marketplace/MarketplaceView'

export const metadata = {
  title: 'Wholesale Investment Properties Marketplace | DeelMap',
  description: 'Browse thousands of off-market wholesale and auction investment properties across the US. Updated daily. Find fix & flip, buy & hold, and BRRRR deals on DeelMap.',
  alternates: { canonical: 'https://deelmap.com/marketplace' },
  openGraph: {
    title: 'Wholesale Investment Properties Marketplace | DeelMap',
    description: 'Browse thousands of off-market wholesale and auction investment properties across the US. Updated daily.',
    url: 'https://deelmap.com/marketplace',
    siteName: 'DeelMap',
    locale: 'en_US',
    type: 'website',
  },
}

export default function DealsPage() {
  return <MarketplaceView />
}
