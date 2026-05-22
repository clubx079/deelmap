import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Search, FileText, Handshake, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react'

export const metadata = {
  title: 'How to Wholesale Real Estate — A Complete Guide | DeelMap',
  description: 'Learn how to wholesale real estate step by step. Understand the wholesaling process, key terms like ARV and spread, common mistakes, and how to find your first deal.',
  keywords: 'how to wholesale real estate, real estate wholesaling guide, wholesale real estate for beginners, how to find wholesale deals, wholesale real estate process',
}

const STEPS = [
  {
    icon: Search,
    number: '01',
    title: 'Find a motivated seller',
    description: 'Wholesaling starts with a seller who needs to close quickly — often due to financial distress, inherited property, relocation, or a property in poor condition. Traditional approaches include direct mail, cold calling, and driving for dollars. Platforms like DeelMap give you direct access to motivated sellers who have already listed their properties.',
  },
  {
    icon: FileText,
    number: '02',
    title: 'Analyze the deal',
    description: 'Before making any offer, calculate the ARV (After Repair Value) — what the property will be worth once renovated. Then estimate repair costs and apply the standard investor formula: Maximum Allowable Offer = (ARV × 70%) minus repair costs. This ensures your buyer has enough margin when they eventually resell or rent the property.',
  },
  {
    icon: Handshake,
    number: '03',
    title: 'Get the property under contract',
    description: 'Once you agree on a price with the seller, you sign a purchase and sale agreement. This contract gives you equitable interest in the property and the legal right to assign that contract to a third-party buyer for a fee. The contract should include an assignment clause allowing you to transfer your rights.',
  },
  {
    icon: DollarSign,
    number: '04',
    title: 'Find a buyer and assign the contract',
    description: 'With the property under contract, you find an end buyer — typically a fix-and-flip investor or a buy-and-hold landlord — who purchases the contract from you. You collect an assignment fee, which is the difference between the price you contracted with the seller and the price the end buyer pays. This fee is your profit.',
  },
]

const TERMS = [
  {
    term: 'ARV (After Repair Value)',
    definition: 'The estimated market value of a property after all repairs and renovations are completed. ARV is the foundation of wholesale deal analysis — it determines how much margin exists in a deal.',
  },
  {
    term: 'Spread',
    definition: 'The difference between the purchase price and the ARV. A strong wholesale deal typically has a spread of 30–40% or more, giving the end buyer enough room to cover repairs, holding costs, and profit.',
  },
  {
    term: 'Assignment Fee',
    definition: 'The profit a wholesaler earns by assigning their purchase contract to an end buyer. Assignment fees typically range from $3,000 to $20,000+ depending on the deal size and market.',
  },
  {
    term: 'Assignment Clause',
    definition: 'A provision in a purchase contract that allows the original buyer (the wholesaler) to transfer their contractual rights to a third party. Without this clause, a contract cannot be legally assigned.',
  },
  {
    term: 'MAO (Maximum Allowable Offer)',
    definition: 'The highest price a wholesaler can offer a seller while still leaving enough margin for an end buyer. Calculated as: (ARV × 70%) minus estimated repair costs.',
  },
  {
    term: 'Double Close',
    definition: 'An alternative to assignment where the wholesaler actually purchases the property and then immediately resells it to the end buyer. Used when sellers or buyers object to a visible assignment fee.',
  },
  {
    term: 'Earnest Money',
    definition: 'A deposit paid to the seller to demonstrate serious intent when signing a purchase contract. Typically ranges from $500 to $5,000 in wholesale transactions.',
  },
  {
    term: 'End Buyer',
    definition: 'The investor who purchases the property from the wholesaler (or via contract assignment). End buyers are typically fix-and-flip investors or buy-and-hold landlords.',
  },
]

const MISTAKES = [
  {
    title: 'Overestimating ARV',
    description: 'Using optimistic comparable sales or ignoring neighborhood-level price differences. Inflated ARV means your end buyer won\'t have enough margin — and your deal won\'t close.',
  },
  {
    title: 'Underestimating repair costs',
    description: 'New wholesalers frequently miss hidden costs: foundation issues, roof replacement, HVAC, and electrical updates. Always walk the property or partner with a contractor before finalizing your MAO.',
  },
  {
    title: 'No assignment clause in the contract',
    description: 'Without an assignment clause, you have no legal right to transfer the contract. Every wholesale contract you sign must explicitly allow assignment to a third party.',
  },
  {
    title: 'Not having an end buyer lined up',
    description: 'Signing contracts without a built-up buyers list creates time pressure. The most successful wholesalers develop their buyer network before they go under contract.',
  },
  {
    title: 'Working with unverified sellers',
    description: 'Sellers who aren\'t the legal property owner, have title issues, or are misrepresenting the property\'s condition can kill a deal — and potentially create legal exposure. Always verify seller identity and run a basic title search.',
  },
]

export default function HowToWholesalePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-16 pb-12 lg:pt-20 lg:pb-16 bg-white">
        <div className="max-w-[760px] mx-auto px-6 sm:px-8 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">WHOLESALE REAL ESTATE GUIDE</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1816] leading-tight mb-6">
            How to Wholesale Real Estate
          </h1>
          <p className="text-[16px] text-[#444441] leading-relaxed mb-8">
            Wholesaling is one of the most accessible entry points in real estate investing — it requires no capital to purchase properties and no renovation experience. This guide walks through the complete process, key terms, and common pitfalls to avoid.
          </p>
          <Link href="/marketplace" className="inline-flex items-center gap-2 h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors">
            Browse Wholesale Deals
          </Link>
        </div>
      </section>

      {/* What is wholesaling */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-[820px] mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">WHAT IS WHOLESALING</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-6">What is wholesale real estate?</h2>
          <div className="space-y-4">
            <p className="text-[16px] text-[#444441] leading-relaxed">
              Real estate wholesaling is the process of finding a property at a price significantly below its market value, getting it under contract, and then selling that contract to an end buyer for a profit. The wholesaler never actually purchases the property — they sell their contractual right to buy it.
            </p>
            <p className="text-[16px] text-[#444441] leading-relaxed">
              The wholesale profit comes from the spread between the price negotiated with the seller and the price the end buyer agrees to pay. This spread — called the assignment fee — is the wholesaler's compensation for finding the deal, negotiating the terms, and connecting the seller with the buyer.
            </p>
            <p className="text-[16px] text-[#444441] leading-relaxed">
              Because wholesaling doesn't require purchasing the property outright, it has historically been one of the most accessible entry points for new real estate investors. However, it does require strong deal analysis skills, a reliable network of end buyers, and the ability to find and negotiate with motivated sellers.
            </p>
            <p className="text-[16px] text-[#444441] leading-relaxed">
              Platforms like DeelMap streamline one of the hardest parts of wholesaling for buyers — finding verified sellers with real deals already structured and ready to review.
            </p>
          </div>
        </div>
      </section>

      {/* Step by step */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3 text-center">THE PROCESS</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-10 text-center">The wholesale real estate process</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.number} className="bg-[#FAFAF8] border border-[#E8E8E4] rounded p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#D03839]/10 rounded flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#D03839]" />
                    </div>
                    <span className="text-[11px] font-semibold text-[#737370] uppercase tracking-[2px]">Step {step.number}</span>
                  </div>
                  <h3 className="text-[18px] font-bold text-[#1A1816] mb-3">{step.title}</h3>
                  <p className="text-[15px] text-[#444441] leading-relaxed">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Key Terms */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-[820px] mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">GLOSSARY</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-8">Key wholesale real estate terms</h2>
          <div className="space-y-0 border border-[#E8E8E4] rounded overflow-hidden">
            {TERMS.map((item, idx) => (
              <div key={item.term} className={`p-6 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'} ${idx > 0 ? 'border-t border-[#E8E8E4]' : ''}`}>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#D03839] flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-[15px] font-bold text-[#1A1816] mb-1">{item.term}</p>
                    <p className="text-[14px] text-[#444441] leading-relaxed">{item.definition}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Common Mistakes */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-[820px] mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">WHAT TO AVOID</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-8">Common wholesale real estate mistakes</h2>
          <div className="space-y-4">
            {MISTAKES.map((mistake) => (
              <div key={mistake.title} className="flex items-start gap-4 p-6 bg-[#FAFAF8] border border-[#E8E8E4] rounded">
                <div className="w-9 h-9 bg-[#1A1816] rounded flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-[#1A1816] mb-1">{mistake.title}</p>
                  <p className="text-[14px] text-[#444441] leading-relaxed">{mistake.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-[680px] mx-auto px-6 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">READY TO START</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-4">Find your first wholesale deal on DeelMap</h2>
          <p className="text-[16px] text-[#444441] leading-relaxed mb-8">
            DeelMap gives you access to thousands of verified wholesale deals with ARV, spread, and property details already structured. Browse deals, contact verified sellers, and start building your wholesale business today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/marketplace" className="h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors flex items-center">
              Browse Deals
            </Link>
            <Link href="/what-is-arv" className="h-12 px-8 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] font-medium rounded transition-colors flex items-center">
              What is ARV?
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
