import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import FAQAccordion from '@/components/FAQAccordion'

export const metadata = {
  title: 'Real Estate Investing FAQ — ARV, Wholesale Deals & More | DeelMap',
  description: 'Answers to common real estate investing questions — what ARV is, how the 70% rule works, deal types, how to evaluate a wholesale deal, and more.',
  keywords: 'real estate investing FAQ, what is ARV, 70% rule real estate, how to evaluate wholesale deal, fix and flip FAQ, buy and hold real estate questions',
}

const QUESTIONS = [
  {
    q: 'What is ARV in real estate?',
    a: 'ARV stands for After Repair Value — the estimated market value of a property once all necessary repairs and renovations are completed. It\'s the single most important number in a wholesale deal because it determines how much margin exists between the purchase price and what the property will ultimately be worth. Every deal listing on DeelMap includes an automated ARV estimate.',
  },
  {
    q: 'What is the 70% rule in real estate investing?',
    a: 'The 70% rule is a quick formula used by fix-and-flip investors to evaluate whether a wholesale deal makes financial sense. The formula is: Maximum Offer = (ARV × 0.70) − Estimated Repair Costs. If a property has an ARV of $200,000 and $30,000 in repairs, the maximum you should pay is ($200,000 × 0.70) − $30,000 = $110,000. It\'s a fast filter, not a substitute for a full deal analysis.',
  },
  {
    q: 'What types of wholesale deals should I look for?',
    a: 'The right deal type depends on your strategy. Fix-and-flip investors look for properties below ARV with manageable repair costs and short hold times. Buy-and-hold investors prioritize cash flow — monthly rent minus expenses. Multi-family buyers focus on NOI and cap rate. Land investors look for developable parcels in growing markets. DeelMap lets you filter by property type to match your specific strategy.',
  },
  {
    q: 'What is the difference between wholesale price and ARV?',
    a: 'The wholesale price is what the seller is asking — what you\'d pay to acquire the deal. ARV is what the property could be worth after full renovation. The difference (spread) is the gross margin available before repair costs, holding costs, and fees. A deal with a wholesale price of $80,000 and an ARV of $150,000 has a $70,000 gross spread — but that spread needs to cover repairs and still leave your profit.',
  },
  {
    q: 'How do I evaluate whether a wholesale deal is worth pursuing?',
    a: 'Start with the ARV and work backwards using the 70% rule to set your maximum purchase price. Then get a realistic repair estimate — either from a contractor walk-through or a per-square-foot rule of thumb for your market. Subtract your repair costs, holding costs, financing costs, and desired profit margin from the ARV to arrive at your true maximum offer. If the seller\'s asking price is at or below that number, the deal is worth pursuing.',
  },
  {
    q: 'What is a cap rate and when does it matter?',
    a: 'Cap rate (capitalization rate) measures the annual return a property generates relative to its price, assuming you paid all cash. The formula is: Cap Rate = Net Operating Income ÷ Purchase Price. It matters most for buy-and-hold and multi-family investors. A higher cap rate generally means more return per dollar invested, but also often reflects higher risk or lower-quality markets. Most investors look for cap rates of 6–10% depending on the market.',
  },
  {
    q: 'What is NOI in real estate?',
    a: 'NOI stands for Net Operating Income — the annual revenue a rental property generates after subtracting all operating expenses (property management, insurance, taxes, maintenance, vacancy allowance), but before debt service. It\'s the core profitability metric for income-producing properties. NOI drives cap rate and cash-on-cash return calculations.',
  },
  {
    q: 'What is cash-on-cash return?',
    a: 'Cash-on-cash return measures the annual pre-tax cash flow you receive relative to the cash you actually invested (down payment plus closing costs). Unlike cap rate, it accounts for your financing. A property with $6,000 annual cash flow on a $60,000 cash investment has a 10% cash-on-cash return. It\'s the most practical profitability metric for leveraged buy-and-hold investments.',
  },
  {
    q: 'How is wholesale real estate different from buying on the MLS?',
    a: 'MLS properties are listed publicly by agents, typically at or near market value, with buyer agent commissions built into the price. Wholesale deals are sold directly by motivated sellers — often below ARV — to investors who can close quickly and without contingencies. Wholesale buyers accept properties in as-is condition, which is why the price reflects that discount. The tradeoff is speed and simplicity rather than a retail-ready property.',
  },
]

export default function InvestingFAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-16 pb-12 lg:pt-20 lg:pb-16 bg-white">
        <div className="max-w-[680px] mx-auto px-6 sm:px-8 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">FAQ — INVESTING</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1816] leading-tight mb-6">
            Real estate investing questions, answered
          </h1>
          <p className="text-[16px] text-[#444441] leading-relaxed">
            ARV, the 70% rule, cap rates, NOI — the core concepts every wholesale real estate investor needs to understand before making an offer.
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
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">KEEP LEARNING</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1816] mb-6">More resources</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/what-is-arv" className="h-10 px-5 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] text-[14px] font-medium rounded transition-colors flex items-center">What is ARV?</Link>
            <Link href="/how-to-wholesale-real-estate" className="h-10 px-5 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] text-[14px] font-medium rounded transition-colors flex items-center">How to wholesale</Link>
            <Link href="/faq/buyers" className="h-10 px-5 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] text-[14px] font-medium rounded transition-colors flex items-center">Buyer FAQ</Link>
            <Link href="/faq" className="h-10 px-5 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] text-[14px] font-medium rounded transition-colors flex items-center">All FAQs</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
