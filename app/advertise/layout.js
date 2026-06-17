const SITE = 'https://deelmap.com'

export const metadata = {
  title: 'Advertise on DeelMap — Reach Real-Estate Investors & Wholesalers',
  description: 'Put your deals, lending, or services in front of active real-estate investors and wholesalers on DeelMap. Learn about advertising and partnership options.',
  alternates: { canonical: `${SITE}/advertise` },
  openGraph: {
    title: 'Advertise on DeelMap — Reach Real-Estate Investors & Wholesalers',
    description: 'Put your deals, lending, or services in front of active real-estate investors and wholesalers on DeelMap.',
    url: `${SITE}/advertise`,
    siteName: 'DeelMap',
    type: 'website',
  },
}

export default function Layout({ children }) {
  return children
}
