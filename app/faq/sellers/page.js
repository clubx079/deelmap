import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import FAQAccordion from '@/components/FAQAccordion'

export const metadata = {
  title: 'Seller FAQ — Questions About Listing Wholesale Deals | DeelMap',
  description: 'Common questions from sellers on DeelMap — how to list a property, what it costs, how buyers find your deal, and what happens after a listing goes live.',
  keywords: 'DeelMap seller FAQ, how to list wholesale property, sell wholesale deal online, DeelMap seller pricing, wholesale deal listing questions',
}

const QUESTIONS = [
  {
    q: 'How do I list a property on DeelMap?',
    a: 'Visit the Sell page and complete our property submission form. You\'ll provide basic property details, asking price, photos, and deal terms. Our team reviews each submission for completeness before it goes live. The process typically takes less than 15 minutes.',
  },
  {
    q: 'What does it cost to list on DeelMap?',
    a: 'DeelMap offers a free trial period for new sellers, allowing you to list your first properties and gauge buyer interest at no cost. After the trial, a subscription is required to continue listing. See our pricing page for current plan details.',
  },
  {
    q: 'How long is the free trial period?',
    a: 'New sellers receive a free trial to list their first deals and experience the platform. The trial period lets you test buyer interest and messaging volume before committing to a paid plan. Details are provided at signup.',
  },
  {
    q: 'How many listings can I have at once?',
    a: 'The number of active listings depends on your subscription plan. Paid plans support multiple concurrent listings, and higher-tier plans include additional features like priority placement and analytics. Visit the pricing page for a full breakdown.',
  },
  {
    q: 'What is the approval process for listings?',
    a: 'After you submit a property, our team reviews it to ensure the information is complete and accurate. Listings that include clear photos, realistic pricing, and full property details are approved fastest. Incomplete or misrepresented submissions are rejected and you\'ll be notified with feedback.',
  },
  {
    q: 'How do buyers find my deal?',
    a: 'Your listing appears in DeelMap\'s marketplace where thousands of active investors browse daily. Buyers can find your property through search filters including state, city, deal type, price range, and ARV. Well-structured listings with quality photos and clear numbers consistently attract more buyer inquiries.',
  },
  {
    q: 'Can I update a listing after it goes live?',
    a: 'Yes. You can edit your listing at any time through your seller dashboard. Changes to price, photos, or property details take effect immediately after submission.',
  },
  {
    q: 'What happens when a deal is sold?',
    a: 'When your property goes under contract, you can update the deal status in your dashboard to "Pending." Once closed, mark it as sold. This removes the listing from active search results and updates your seller profile with your closed deal history.',
  },
]

export default function SellerFAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-16 pb-12 lg:pt-20 lg:pb-16 bg-white">
        <div className="max-w-[680px] mx-auto px-6 sm:px-8 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">FAQ — FOR SELLERS</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1816] leading-tight mb-6">
            Seller questions, answered
          </h1>
          <p className="text-[16px] text-[#444441] leading-relaxed">
            Everything you need to know about listing your wholesale deals on DeelMap — from submission to closing.
          </p>
        </div>
      </section>

      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-[820px] mx-auto px-6 lg:px-[72px]">
          <FAQAccordion questions={QUESTIONS} />
        </div>
      </section>

      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-[680px] mx-auto px-6 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">READY TO LIST?</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1816] mb-4">Start listing your deals</h2>
          <p className="text-[15px] text-[#444441] leading-relaxed mb-8">Join thousands of verified sellers already using DeelMap to move wholesale deals faster.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/join-seller" className="h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors flex items-center">List a Property</Link>
            <Link href="/faq" className="h-12 px-8 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] font-medium rounded transition-colors flex items-center">All FAQs</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
