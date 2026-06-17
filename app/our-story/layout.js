const SITE = 'https://deelmap.com'

export const metadata = {
  title: 'Our Story | DeelMap',
  description: 'How DeelMap became the marketplace for off-market wholesale and auction investment properties — our mission to help investors find better deals, faster.',
  alternates: { canonical: `${SITE}/our-story` },
  openGraph: {
    title: 'Our Story | DeelMap',
    description: 'How DeelMap became the marketplace for off-market wholesale and auction investment properties.',
    url: `${SITE}/our-story`,
    siteName: 'DeelMap',
    type: 'website',
  },
}

export default function Layout({ children }) {
  return children
}
