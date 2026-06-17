const SITE = 'https://deelmap.com'

export const metadata = {
  title: 'DSCR Calculator — Debt Service Coverage Ratio Calculator | DeelMap',
  description: 'Free DSCR calculator for rental and investment properties. Enter rent, expenses, and loan terms to instantly find your debt-service-coverage ratio and loan eligibility.',
  alternates: { canonical: `${SITE}/dscr-calculator` },
  openGraph: {
    title: 'DSCR Calculator — Debt Service Coverage Ratio Calculator | DeelMap',
    description: 'Free DSCR calculator for rental and investment properties — find your debt-service-coverage ratio instantly.',
    url: `${SITE}/dscr-calculator`,
    siteName: 'DeelMap',
    type: 'website',
  },
}

export default function Layout({ children }) {
  return children
}
