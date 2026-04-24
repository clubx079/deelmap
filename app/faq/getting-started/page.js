import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import FAQAccordion from '@/components/FAQAccordion'

export const metadata = {
  title: 'Getting Started on DeelMap — New User FAQ | DeelMap',
  description: 'New to DeelMap? Learn how to create an account, browse off-market deals, use the platform, and what makes DeelMap different from other real estate tools.',
  keywords: 'getting started DeelMap, DeelMap new user guide, how to use DeelMap, DeelMap vs MLS, real estate investing platform for beginners',
}

const QUESTIONS = [
  {
    q: 'Who is DeelMap built for?',
    a: 'DeelMap is built for real estate investors at every stage — from first-time wholesalers acquiring their first deal to experienced investors managing a large portfolio. On the sell side, it serves wholesalers, fix-and-flip investors, and any property owner looking to sell directly to an investor without listing on the MLS.',
  },
  {
    q: 'How is DeelMap different from the MLS?',
    a: 'The MLS lists properties available through licensed real estate agents, typically at or near market value. DeelMap lists off-market wholesale deals — properties sold directly by motivated sellers, often below ARV, to investors who can move quickly. These deals are not listed on the MLS and are not accessible through traditional real estate searches.',
  },
  {
    q: 'Do I need to create an account to browse deals?',
    a: 'You can browse deal listings on DeelMap without an account. To contact a seller, save a deal to your favorites, or access full property details, you\'ll need to create a free buyer account. Registration takes under two minutes and requires no credit card.',
  },
  {
    q: 'Is DeelMap free to use?',
    a: 'Yes — for buyers, DeelMap is completely free. Browsing, saving deals, and contacting sellers all cost nothing. Sellers pay a subscription to list their properties. There are no buyer premiums, commissions, or hidden fees on the buyer side.',
  },
  {
    q: 'What states does DeelMap cover?',
    a: 'DeelMap has deals listed in all 50 states, with the highest concentration in Tennessee, Florida, Texas, Georgia, Ohio, Michigan, North Carolina, South Carolina, Illinois, and Indiana. New markets are added as our seller network grows.',
  },
  {
    q: 'Is my data safe on DeelMap?',
    a: 'Yes. DeelMap uses industry-standard encryption for all data in transit and at rest. We do not sell your personal information to third parties. Your contact details are only shared with counterparties when you initiate direct contact through the platform.',
  },
  {
    q: 'Does DeelMap offer financing?',
    a: 'DeelMap connects buyers and sellers but does not directly provide financing. We partner with lenders who specialize in investment property financing. Visit our Financing page to explore hard money, DSCR, and bridge loan options available to DeelMap users.',
  },
  {
    q: 'How do I get support?',
    a: 'You can reach our team through the Contact page. We respond to all inquiries within one business day. For faster answers, check the full FAQ page first — most common questions are covered there.',
  },
]

export default function GettingStartedFAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-16 pb-12 lg:pt-20 lg:pb-16 bg-white">
        <div className="max-w-[680px] mx-auto px-6 sm:px-8 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">FAQ — GETTING STARTED</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1816] leading-tight mb-6">
            New to DeelMap? Start here.
          </h1>
          <p className="text-[16px] text-[#444441] leading-relaxed">
            How the platform works, what it costs, who it's built for, and what makes it different from every other real estate tool.
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
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">READY TO START?</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1816] mb-4">Browse deals free — no card required</h2>
          <p className="text-[15px] text-[#444441] leading-relaxed mb-8">Thousands of verified off-market deals across all 50 states, free for every buyer.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/marketplace" className="h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors flex items-center">Browse Deals</Link>
            <Link href="/faq/buyers" className="h-12 px-8 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] font-medium rounded transition-colors flex items-center">Buyer FAQ</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
