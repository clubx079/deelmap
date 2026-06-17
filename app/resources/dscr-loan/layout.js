const SITE = 'https://deelmap.com'

export const metadata = {
  title: 'DSCR Loans Explained — Rates, Requirements & How They Work | DeelMap',
  description: 'What a DSCR loan is, how lenders calculate the debt-service-coverage ratio, typical rates and requirements, and how investors use DSCR loans to fund rentals.',
  alternates: { canonical: `${SITE}/resources/dscr-loan` },
  openGraph: {
    title: 'DSCR Loans Explained — Rates, Requirements & How They Work | DeelMap',
    description: 'What a DSCR loan is, how it is calculated, and how investors use DSCR loans to fund rental properties.',
    url: `${SITE}/resources/dscr-loan`,
    siteName: 'DeelMap',
    type: 'article',
  },
}

export default function Layout({ children }) {
  return children
}
