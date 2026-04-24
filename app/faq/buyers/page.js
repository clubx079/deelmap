import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import FAQAccordion from '@/components/FAQAccordion'

export const metadata = {
  title: 'Buyer FAQ — Questions About Buying Wholesale Deals | DeelMap',
  description: 'Answers to the most common questions buyers have on DeelMap — how deals work, how to contact sellers, what ARV means, and whether DeelMap is free.',
  keywords: 'DeelMap buyer FAQ, how to buy wholesale real estate, is DeelMap free for buyers, how to contact wholesale seller, what is ARV real estate',
}

const QUESTIONS = [
  {
    q: 'What is DeelMap?',
    a: 'DeelMap is a marketplace for verified off-market wholesale real estate deals. We connect real estate investors with motivated sellers across the United States. Every seller on DeelMap is identity-verified, and every listing includes structured deal data — ARV, spread, and property details — so you can evaluate opportunities without leaving the platform.',
  },
  {
    q: 'Is DeelMap free for buyers?',
    a: 'Yes. DeelMap is completely free for buyers. You can browse deals, view full property details, and contact verified sellers without a subscription or credit card. We charge sellers for listing their properties, not buyers for finding them.',
  },
  {
    q: 'How are sellers verified on DeelMap?',
    a: 'Every seller goes through an identity verification process before their first listing goes live. This includes confirming their identity and reviewing their deal submission for completeness and accuracy. Deals that don\'t meet our standards are rejected before buyers ever see them.',
  },
  {
    q: 'What types of deals are available?',
    a: 'DeelMap carries wholesale deals across all major investment strategies: fix-and-flip properties, buy-and-hold rentals, multi-family buildings, and vacant land. You can filter by deal type, location, price range, and ARV to find what matches your investment criteria.',
  },
  {
    q: 'How do I contact a seller?',
    a: 'Each deal listing includes a direct contact option. When you\'re interested in a property, you can message the seller through DeelMap\'s secure in-platform messaging system. There are no third-party brokers or intermediaries — you communicate directly with the verified seller.',
  },
  {
    q: 'What is ARV and why does it matter?',
    a: 'ARV stands for After Repair Value — the estimated market value of a property once all necessary repairs and renovations are completed. On DeelMap, ARV estimates are provided on every listing alongside the asking price, giving you a clear picture of the potential spread. The difference between the purchase price and ARV is where an investor\'s margin comes from.',
  },
  {
    q: 'What states does DeelMap cover?',
    a: 'DeelMap has deals listed in all 50 states, with the highest concentration in high-activity markets including Tennessee, Florida, Texas, Georgia, Ohio, Michigan, North Carolina, South Carolina, Illinois, and Indiana. We continue to grow our seller network in new markets every month.',
  },
  {
    q: 'Can I save deals to review later?',
    a: 'Yes. When you create a free buyer account, you can save any deal to your favorites list and return to it later. Your saved deals are stored in your account dashboard so you never lose track of opportunities you\'re evaluating.',
  },
  {
    q: 'How current are the listings?',
    a: 'Listings are updated in real time. When a deal goes under contract or is closed, its status is updated on the platform immediately. You can filter your search to show only active listings so you\'re never wasting time on a deal that\'s already gone.',
  },
]

export default function BuyerFAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-16 pb-12 lg:pt-20 lg:pb-16 bg-white">
        <div className="max-w-[680px] mx-auto px-6 sm:px-8 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">FAQ — FOR BUYERS</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1816] leading-tight mb-6">
            Buyer questions, answered
          </h1>
          <p className="text-[16px] text-[#444441] leading-relaxed">
            Everything you need to know about finding, evaluating, and contacting sellers for wholesale real estate deals on DeelMap.
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
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">EXPLORE MORE</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1816] mb-6">More help topics</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/faq/sellers" className="h-10 px-5 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] text-[14px] font-medium rounded transition-colors flex items-center">Seller FAQ</Link>
            <Link href="/faq/investing" className="h-10 px-5 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] text-[14px] font-medium rounded transition-colors flex items-center">Investing FAQ</Link>
            <Link href="/faq/getting-started" className="h-10 px-5 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] text-[14px] font-medium rounded transition-colors flex items-center">Getting Started</Link>
            <Link href="/faq" className="h-10 px-5 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] text-[14px] font-medium rounded transition-colors flex items-center">All FAQs</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
