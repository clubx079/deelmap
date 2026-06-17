const SITE = 'https://deelmap.com'

export const metadata = {
  title: 'Real-Estate Investing Resources & Guides | DeelMap',
  description: 'Guides, tools, and resources for real-estate investors and wholesalers — financing, ARV, off-market sourcing, and more from DeelMap.',
  alternates: { canonical: `${SITE}/resources` },
  openGraph: {
    title: 'Real-Estate Investing Resources & Guides | DeelMap',
    description: 'Guides, tools, and resources for real-estate investors and wholesalers from DeelMap.',
    url: `${SITE}/resources`,
    siteName: 'DeelMap',
    type: 'website',
  },
}

export default function Layout({ children }) {
  return children
}
