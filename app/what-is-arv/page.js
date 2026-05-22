import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { BarChart2, Home, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'

export const metadata = {
  title: 'What Is ARV in Real Estate? After Repair Value Explained | DeelMap',
  description: 'Learn what ARV (After Repair Value) means in real estate investing, how to calculate it, why it matters for wholesale deals, and how DeelMap uses ARV on every listing.',
  keywords: 'what is ARV real estate, after repair value, ARV calculation, ARV in wholesale real estate, how to calculate ARV, ARV meaning',
}

const ARV_USES = [
  {
    icon: Home,
    title: 'Fix-and-flip investing',
    description: 'Flippers use ARV to determine the maximum price they can pay for a distressed property and still profit after renovation. The standard rule is to stay at or below 70% of ARV minus repair costs.',
  },
  {
    icon: BarChart2,
    title: 'Wholesale deal analysis',
    description: 'Wholesalers price deals based on ARV to ensure their end buyers have enough margin. A wholesale price that leaves 30–35% spread from ARV is the standard benchmark for a viable deal.',
  },
  {
    icon: TrendingUp,
    title: 'Lender underwriting',
    description: 'Hard money and bridge lenders base loan amounts on ARV rather than current value. Understanding ARV helps investors know how much financing is available for a given deal.',
  },
]

const COMP_FACTORS = [
  {
    title: 'Recent sales (last 3–6 months)',
    description: 'Comparable sales should be recent. Market conditions shift, and sales from 12+ months ago may not accurately reflect today\'s value.',
  },
  {
    title: 'Similar size and configuration',
    description: 'Comps should be within 20% of the subject property\'s square footage and have a similar bedroom/bathroom count.',
  },
  {
    title: 'Same or adjacent neighborhood',
    description: 'Price per square foot can vary significantly by block in some markets. Comps should come from the same immediate area — ideally within 0.5 miles.',
  },
  {
    title: 'Renovated condition',
    description: 'Since ARV assumes a fully repaired property, comps should be in renovated or move-in-ready condition — not distressed properties or homes that also need work.',
  },
  {
    title: 'No unusual sale conditions',
    description: 'Exclude short sales, foreclosures, and estate sales from comps where possible. These transactions can skew ARV downward and don\'t reflect open-market value.',
  },
]

const COMMON_MISTAKES = [
  {
    title: 'Using Zestimate as ARV',
    description: 'Zillow\'s Zestimate is an automated consumer estimate, not an investment-grade valuation. It frequently misses neighborhood-level nuances and current distress conditions. Use actual comparable sales instead.',
  },
  {
    title: 'Not accounting for neighborhood ceiling',
    description: 'Every neighborhood has a price ceiling — the maximum value any home in that area will sell for regardless of renovations. Renovating beyond that ceiling doesn\'t increase ARV proportionally.',
  },
  {
    title: 'Using retail comps for a wholesale market',
    description: 'If a neighborhood\'s comps are all agent-listed retail homes, verify that renovated investor flips are actually achieving those prices. Buyer pool and property condition must align.',
  },
  {
    title: 'Overestimating scope of renovation',
    description: 'ARV assumes the property is fully renovated to a competitive standard for its market. Underestimating what "fully renovated" means leads to overestimated ARV.',
  },
]

export default function WhatIsArvPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-16 pb-12 lg:pt-20 lg:pb-16 bg-white">
        <div className="max-w-[760px] mx-auto px-6 sm:px-8 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">REAL ESTATE INVESTING GUIDE</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1816] leading-tight mb-6">
            What Is ARV in Real Estate?
          </h1>
          <p className="text-[16px] text-[#444441] leading-relaxed mb-8">
            ARV — After Repair Value — is the most important number in wholesale and fix-and-flip real estate investing. Understanding what it is, how to calculate it, and how to use it accurately is the foundation of every sound investment decision.
          </p>
          <Link href="/marketplace" className="inline-flex items-center gap-2 h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors">
            Browse Deals with ARV Data
          </Link>
        </div>
      </section>

      {/* Definition */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-[820px] mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">DEFINITION</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-6">What does ARV mean?</h2>
          <div className="space-y-4">
            <p className="text-[16px] text-[#444441] leading-relaxed">
              ARV stands for <strong className="text-[#1A1816]">After Repair Value</strong> — the estimated market value of a property after all necessary repairs, updates, and renovations have been completed. It represents what the property would sell for in move-in-ready condition on the open market.
            </p>
            <p className="text-[16px] text-[#444441] leading-relaxed">
              ARV is not the current value of the property. A distressed home with deferred maintenance, outdated finishes, and structural issues has a current value well below its ARV. The spread between the two — the gap between what you pay and what the property will be worth after renovation — is where investor returns come from.
            </p>
            <p className="text-[16px] text-[#444441] leading-relaxed">
              For wholesale investors, ARV determines the entire deal structure. It dictates the maximum price you can offer a seller, the minimum spread your buyer needs to be interested, and whether a deal is viable at all.
            </p>
          </div>

          {/* Formula highlight */}
          <div className="mt-8 bg-[#1A1816] rounded p-8">
            <p className="text-[11px] font-semibold text-[#737370] uppercase tracking-[2px] mb-3">THE INVESTOR FORMULA</p>
            <p className="text-[22px] font-bold text-white leading-snug mb-3">
              Maximum Offer = (ARV × 70%) − Repair Costs
            </p>
            <p className="text-[14px] text-[#A8A8A4] leading-relaxed">
              The 70% rule ensures the end buyer retains enough margin to cover holding costs, closing costs, and profit after completing the renovation and reselling the property.
            </p>
          </div>
        </div>
      </section>

      {/* How to calculate */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-[820px] mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">HOW TO CALCULATE ARV</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-6">How is ARV calculated?</h2>
          <div className="space-y-4 mb-8">
            <p className="text-[16px] text-[#444441] leading-relaxed">
              ARV is calculated by analyzing comparable sales — also called "comps" — of similar properties that have recently sold in the same area in fully renovated condition. This is the same methodology used by licensed appraisers to determine market value.
            </p>
            <p className="text-[16px] text-[#444441] leading-relaxed">
              The process: identify 3–5 recently sold properties that are similar in size, location, age, and condition to what the subject property will look like after renovation. Average their price per square foot and apply it to the subject property's square footage. Adjust for meaningful differences — an extra bathroom, garage, or significantly larger lot.
            </p>
          </div>
          <p className="text-[15px] font-semibold text-[#1A1816] mb-4">Key factors for selecting good comps:</p>
          <div className="space-y-3">
            {COMP_FACTORS.map((factor, idx) => (
              <div key={factor.title} className={`flex items-start gap-4 p-5 rounded border border-[#E8E8E4] ${idx % 2 === 0 ? 'bg-[#FAFAF8]' : 'bg-white'}`}>
                <CheckCircle2 className="w-4 h-4 text-[#D03839] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[15px] font-semibold text-[#1A1816] mb-1">{factor.title}</p>
                  <p className="text-[14px] text-[#444441] leading-relaxed">{factor.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Where ARV is used */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3 text-center">WHERE ARV IS USED</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-10 text-center">Why ARV matters in real estate investing</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {ARV_USES.map((use) => {
              const Icon = use.icon
              return (
                <div key={use.title} className="bg-white border border-[#E8E8E4] rounded p-7">
                  <div className="w-10 h-10 bg-[#D03839]/10 rounded flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-[#D03839]" />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#1A1816] mb-3">{use.title}</h3>
                  <p className="text-[15px] text-[#444441] leading-relaxed">{use.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Common mistakes */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-[820px] mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">WHAT TO AVOID</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-8">Common ARV mistakes investors make</h2>
          <div className="space-y-4">
            {COMMON_MISTAKES.map((mistake) => (
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

      {/* How DeelMap uses ARV */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-[820px] mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">HOW DEELMAP USES ARV</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-6">ARV on every DeelMap listing</h2>
          <div className="space-y-4">
            <p className="text-[16px] text-[#444441] leading-relaxed">
              Every deal listed on DeelMap includes an ARV estimate alongside the asking price. This gives buyers immediate visibility into the potential spread — the difference between what you pay and what the property will be worth after renovation.
            </p>
            <p className="text-[16px] text-[#444441] leading-relaxed">
              Rather than spending hours pulling comps and running your own analysis before deciding whether a deal is even worth looking at, DeelMap structures this data upfront. You can evaluate dozens of deals in the time it would take to manually analyze one.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-[680px] mx-auto px-6 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">START FINDING DEALS</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-4">See ARV data on every deal</h2>
          <p className="text-[16px] text-[#444441] leading-relaxed mb-8">
            Browse thousands of verified wholesale deals on DeelMap — each one with ARV, spread, and property details already structured. Free for buyers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/marketplace" className="h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors flex items-center">
              Browse Deals
            </Link>
            <Link href="/how-to-wholesale-real-estate" className="h-12 px-8 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] font-medium rounded transition-colors flex items-center">
              How to wholesale
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
