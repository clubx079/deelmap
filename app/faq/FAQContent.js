'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

const BUYER_FAQS = [
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

const SELLER_FAQS = [
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

const GENERAL_FAQS = [
  {
    q: 'Is my data safe on DeelMap?',
    a: 'Yes. DeelMap uses industry-standard encryption for all data in transit and at rest. We do not sell your personal information to third parties. Your contact details are only shared with counterparties when you initiate direct contact through the platform.',
  },
  {
    q: 'How is DeelMap different from the MLS?',
    a: 'The MLS lists properties available through licensed real estate agents, typically at or near market value. DeelMap lists off-market wholesale deals — properties sold directly by motivated sellers, often below ARV, to investors who can move quickly. These deals are not listed on the MLS and are not accessible through traditional real estate searches.',
  },
  {
    q: 'Does DeelMap offer financing?',
    a: 'DeelMap connects buyers and sellers but does not directly provide financing. We partner with lenders who specialize in investment property financing. Visit our Financing page to explore hard money, DSCR, and bridge loan options available to DeelMap users.',
  },
  {
    q: 'Who is DeelMap built for?',
    a: 'DeelMap is built for real estate investors at every stage — from first-time wholesalers acquiring their first deal to experienced investors managing a large portfolio. On the sell side, it serves wholesalers, fix-and-flip investors, and any property owner looking to sell directly to an investor without listing on the MLS.',
  },
  {
    q: 'How do I get support?',
    a: 'You can reach our team through the Contact page. We respond to all inquiries within one business day. For faster answers, check this FAQ page first — most common questions are covered here.',
  },
]

function AccordionItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#E8E8E4] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[15px] font-semibold text-[#1A1816]">{question}</span>
        <ChevronDown
          className={`w-4 h-4 text-[#737370] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="text-[15px] text-[#444441] leading-relaxed pb-5">{answer}</p>
      )}
    </div>
  )
}

const TOPIC_CARDS = [
  { label: 'For Buyers', desc: 'Browsing deals, contacting sellers, saving favorites, and understanding listings.', href: '/faq/buyers', count: 9 },
  { label: 'For Sellers', desc: 'Listing properties, pricing, the approval process, and managing active deals.', href: '/faq/sellers', count: 8 },
  { label: 'Investing', desc: 'ARV, the 70% rule, cap rates, deal types, and how to evaluate a wholesale deal.', href: '/faq/investing', count: 9 },
  { label: 'Getting Started', desc: 'Who DeelMap is for, how it differs from the MLS, account setup, and platform basics.', href: '/faq/getting-started', count: 8 },
]

export default function FAQContent() {
  return (
    <>
      {/* Hero */}
      <section className="pt-16 pb-12 lg:pt-20 lg:pb-16 bg-white">
        <div className="max-w-[680px] mx-auto px-6 sm:px-8 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">FREQUENTLY ASKED QUESTIONS</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1816] leading-tight mb-6">
            Questions about DeelMap, answered
          </h1>
          <p className="text-[16px] text-[#444441] leading-relaxed">
            Everything buyers and sellers need to know about finding and listing wholesale real estate deals on DeelMap.
          </p>
        </div>
      </section>

      {/* Topic cards */}
      <section className="py-10 bg-white border-b border-[#E8E8E4]">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TOPIC_CARDS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="group block bg-[#FAFAF8] border border-[#E8E8E4] rounded p-5 hover:border-[#D03839] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[14px] font-bold text-[#1A1816]">{t.label}</span>
                  <span className="text-[11px] font-semibold text-[#737370] bg-white border border-[#E8E8E4] rounded px-2 py-0.5">{t.count} Q&A</span>
                </div>
                <p className="text-[13px] text-[#737370] leading-relaxed mb-3">{t.desc}</p>
                <span className="text-[13px] font-semibold text-[#D03839] group-hover:underline">View all →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* For Buyers */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-[820px] mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">FOR BUYERS</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-8">Buyer questions</h2>
          <div className="bg-white border border-[#E8E8E4] rounded px-6 sm:px-8">
            {BUYER_FAQS.map((faq) => (
              <AccordionItem key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* For Sellers */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-[820px] mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">FOR SELLERS</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-8">Seller questions</h2>
          <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded px-6 sm:px-8">
            {SELLER_FAQS.map((faq) => (
              <AccordionItem key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* General */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-[820px] mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">GENERAL</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-8">General questions</h2>
          <div className="bg-white border border-[#E8E8E4] rounded px-6 sm:px-8">
            {GENERAL_FAQS.map((faq) => (
              <AccordionItem key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-[680px] mx-auto px-6 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">STILL HAVE QUESTIONS?</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-4">We're here to help</h2>
          <p className="text-[16px] text-[#444441] leading-relaxed mb-8">
            Can't find what you're looking for? Reach out to our team and we'll get back to you within one business day.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/contact"
              className="h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors flex items-center"
            >
              Contact Support
            </a>
            <a
              href="/marketplace"
              className="h-12 px-8 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] font-medium rounded transition-colors flex items-center"
            >
              Browse Deals
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
