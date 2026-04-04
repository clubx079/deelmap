import { DM_Sans } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { LiveTrackingProvider } from '@/components/LiveTrackingProvider'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

export const metadata = {
  title: 'DeelMap - Property Deals Marketplace',
  description: 'Find the best property deals with DeelMap',
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