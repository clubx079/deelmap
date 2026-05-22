import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import FAQContent from './FAQContent'

export const metadata = {
  title: 'FAQ | Wholesale Real Estate Questions Answered | DeelMap',
  description: 'Find answers to common questions about buying and selling wholesale real estate on DeelMap. Learn how deals work, how sellers are verified, and what ARV means.',
  keywords: 'real estate investment FAQ, wholesale real estate questions, DeelMap FAQ, how to buy wholesale properties, real estate investing questions',
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <FAQContent />
      <Footer />
    </div>
  )
}
