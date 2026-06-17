const SITE = 'https://deelmap.com'

export const metadata = {
  title: 'Contact DeelMap',
  description: 'Get in touch with the DeelMap team — questions about deals, listings, partnerships, or support.',
  alternates: { canonical: `${SITE}/contact` },
  openGraph: {
    title: 'Contact DeelMap',
    description: 'Get in touch with the DeelMap team.',
    url: `${SITE}/contact`,
    siteName: 'DeelMap',
    type: 'website',
  },
}

export default function Layout({ children }) {
  return children
}
