import { DM_Sans } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { LiveTrackingProvider } from '@/components/LiveTrackingProvider'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-dm-sans' })

export const metadata = {
  title: 'DeelMap — Off-Market & Wholesale Investment Properties',
  description: 'DeelMap is the largest marketplace for off-market wholesale and auction investment properties in the US. Find fix & flip, buy & hold, and BRRRR deals updated daily.',
  metadataBase: new URL('https://deelmap.com'),
  openGraph: {
    title: 'DeelMap — Off-Market & Wholesale Investment Properties',
    description: 'The largest marketplace for off-market wholesale and auction investment properties in the US. Updated daily.',
    url: 'https://deelmap.com',
    siteName: 'DeelMap',
    locale: 'en_US',
    type: 'website',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png' },
    ],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${dmSans.className} ${dmSans.variable}`}>
        <AuthProvider>
          <LiveTrackingProvider>
            {children}
          </LiveTrackingProvider>
        </AuthProvider>
      </body>
    </html>
  )
}