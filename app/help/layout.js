const SITE = 'https://deelmap.com'

export const metadata = {
  title: 'Help Center | DeelMap',
  description: 'Get help with DeelMap — buying, selling, listings, offers, contracts, and your account. Find answers and contact support.',
  alternates: { canonical: `${SITE}/help` },
  openGraph: {
    title: 'Help Center | DeelMap',
    description: 'Get help with DeelMap — buying, selling, listings, offers, contracts, and your account.',
    url: `${SITE}/help`,
    siteName: 'DeelMap',
    type: 'website',
  },
}

export default function Layout({ children }) {
  return children
}
