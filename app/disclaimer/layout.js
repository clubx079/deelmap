const SITE = 'https://deelmap.com'

export const metadata = {
  title: 'Disclaimer | DeelMap',
  description: 'Important disclaimers about the information and listings provided on DeelMap.',
  alternates: { canonical: `${SITE}/disclaimer` },
}

export default function Layout({ children }) {
  return children
}
