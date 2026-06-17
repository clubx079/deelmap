const SITE = 'https://deelmap.com'

export const metadata = {
  title: 'Investment Property Financing | DeelMap',
  description: 'Financing options for investment properties — DSCR, hard money, fix & flip, and more. Connect with lenders and fund your next deal on DeelMap.',
  alternates: { canonical: `${SITE}/financing` },
  openGraph: {
    title: 'Investment Property Financing | DeelMap',
    description: 'Financing options for investment properties — DSCR, hard money, fix & flip, and more on DeelMap.',
    url: `${SITE}/financing`,
    siteName: 'DeelMap',
    type: 'website',
  },
}

export default function Layout({ children }) {
  return children
}
