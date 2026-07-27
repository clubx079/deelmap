import { DM_Sans } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { LiveTrackingProvider } from '@/components/LiveTrackingProvider'
import AnalyticsProvider from '@/components/AnalyticsProvider'

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
    ],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${dmSans.className} ${dmSans.variable}`}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WVTT9R5P"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}

        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WVTT9R5P');`}
        </Script>
        {/* End Google Tag Manager */}

        {/* Google tag (gtag.js) */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-40D09KHD54" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-40D09KHD54');`}
        </Script>

        <AuthProvider>
          <AnalyticsProvider>
            <LiveTrackingProvider>
              {children}
            </LiveTrackingProvider>
          </AnalyticsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
