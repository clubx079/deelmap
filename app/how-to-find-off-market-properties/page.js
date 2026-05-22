import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MapPin, Mail, Users, Search, Shield, Zap, MessageCircle } from 'lucide-react'

export const metadata = {
  title: 'How to Find Off-Market Properties | DeelMap',
  description: 'Learn how to find off-market real estate properties using direct mail, networking, driving for dollars, and marketplaces like DeelMap. A practical guide for real estate investors.',
  keywords: 'how to find off-market properties, off-market real estate, find off-market deals, off-market property investing, wholesale off-market properties',
}

const TRADITIONAL_METHODS = [
  {
    icon: Mail,
    title: 'Direct mail campaigns',
    description: 'Sending targeted letters or postcards to homeowners who match motivated seller criteria — absentee owners, pre-foreclosures, probate properties, or long-term owners with equity. High effort, long lag time, and low response rates (typically 0.5–2%), but a proven method for experienced investors with the capital to sustain a mailing campaign.',
    effort: 'High',
    timeToFirstDeal: '4–12 weeks',
  },
  {
    icon: MapPin,
    title: 'Driving for dollars',
    description: 'Physically driving through target neighborhoods to identify visibly distressed properties — overgrown yards, boarded windows, obvious deferred maintenance. Once identified, you research the owner and reach out directly. Time-intensive and geographically limited, but effective in specific markets with high concentrations of distressed inventory.',
    effort: 'High',
    timeToFirstDeal: '3–8 weeks',
  },
  {
    icon: Users,
    title: 'Networking with agents and wholesalers',
    description: 'Building relationships with real estate agents who specialize in distressed properties and wholesalers who move inventory. Agents with probate, foreclosure, or investor experience often have access to pre-market properties. Requires sustained relationship-building and sharing of deal economics.',
    effort: 'Medium',
    timeToFirstDeal: '2–6 weeks',
  },
  {
    icon: Search,
    title: 'Public records research',
    description: 'Searching county courthouse records for pre-foreclosure notices (lis pendens), probate filings, tax delinquencies, and code violations. These public records identify property owners in situations that often lead to motivated selling. Data tools like PropStream and ATTOM aggregate this information, but raw records are also publicly accessible.',
    effort: 'Medium',
    timeToFirstDeal: '3–8 weeks',
  },
]

const DEELMAP_ADVANTAGES = [
  {
    icon: Shield,
    title: 'Verified seller on every listing',
    description: 'Traditional off-market sourcing requires you to cold-contact property owners who may have no interest in selling. Every seller on DeelMap has proactively listed their property — they\'re already motivated and verified.',
  },
  {
    icon: Zap,
    title: 'Deal data before you reach out',
    description: 'Traditional methods require property research before you even know if a deal is worth pursuing. DeelMap shows ARV, spread, and property details upfront so you can evaluate dozens of deals in the time one comp analysis would take.',
  },
  {
    icon: MessageCircle,
    title: 'No cold outreach',
    description: 'Direct mail and cold calling have 0.5–2% response rates. On DeelMap, the seller has already raised their hand — you\'re contacting someone who wants to hear from you.',
  },
  {
    icon: Search,
    title: 'Search across all 50 states',
    description: 'Traditional methods are geographically limited to your local market. DeelMap gives you access to verified off-market deals across the entire United States, so you can invest where the numbers make sense — not just where you live.',
  },
]

const WHAT_IS_OFF_MARKET = [
  'The property is not listed on the MLS or any public real estate portal',
  'The seller is a motivated individual, not a retail homeowner working with an agent',
  'The price is negotiated directly — without agent commissions on either side',
  'The deal typically involves some form of distress: financial, physical, or situational',
  'It closes faster than retail transactions because there are fewer parties involved',
]

export default function HowToFindOffMarketPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-16 pb-12 lg:pt-20 lg:pb-16 bg-white">
        <div className="max-w-[760px] mx-auto px-6 sm:px-8 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">REAL ESTATE INVESTING GUIDE</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1816] leading-tight mb-6">
            How to Find Off-Market Properties
          </h1>
          <p className="text-[16px] text-[#444441] leading-relaxed mb-8">
            Off-market properties — homes sold outside the MLS directly from motivated sellers — are where the best investment returns exist. Here's a complete guide to how investors find them, and how DeelMap makes it dramatically faster.
          </p>
          <Link href="/marketplace" className="inline-flex items-center gap-2 h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors">
            Browse Off-Market Deals
          </Link>
        </div>
      </section>

      {/* What is off-market */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-[820px] mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">WHAT ARE OFF-MARKET PROPERTIES</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-6">What does "off-market" mean?</h2>
          <div className="space-y-4 mb-8">
            <p className="text-[16px] text-[#444441] leading-relaxed">
              An off-market property is a property that is available for sale but not listed on the Multiple Listing Service (MLS) or any public real estate portal. These deals are transacted directly between motivated sellers and investors, often at prices below the retail market value that a traditional listing would achieve.
            </p>
            <p className="text-[16px] text-[#444441] leading-relaxed">
              The seller's motivation to sell off-market rather than through an agent typically comes from a combination of factors: urgency to close quickly, a property in poor condition that would not photograph well, financial distress, divorce, probate, or simply a preference to avoid the disruption of listing publicly.
            </p>
          </div>
          <p className="text-[15px] font-semibold text-[#1A1816] mb-4">Off-market properties typically share these characteristics:</p>
          <div className="space-y-3">
            {WHAT_IS_OFF_MARKET.map((item) => (
              <div key={item} className="flex items-start gap-3 p-4 bg-white border border-[#E8E8E4] rounded">
                <div className="w-4 h-4 rounded-full bg-[#D03839] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[14px] text-[#444441] leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Traditional methods */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3 text-center">TRADITIONAL APPROACHES</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-3 text-center">Traditional ways to find off-market deals</h2>
          <p className="text-[15px] text-[#444441] text-center mb-10 max-w-[640px] mx-auto">These methods have worked for decades. They require significant time and budget, but experienced investors use them to build proprietary deal flow.</p>
          <div className="grid md:grid-cols-2 gap-6">
            {TRADITIONAL_METHODS.map((method) => {
              const Icon = method.icon
              return (
                <div key={method.title} className="bg-[#FAFAF8] border border-[#E8E8E4] rounded p-8">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 bg-[#D03839]/10 rounded flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#D03839]" />
                    </div>
                    <h3 className="text-[18px] font-bold text-[#1A1816] mt-1">{method.title}</h3>
                  </div>
                  <p className="text-[15px] text-[#444441] leading-relaxed mb-5">{method.description}</p>
                  <div className="flex gap-4">
                    <div className="bg-white border border-[#E8E8E4] rounded px-3 py-2">
                      <p className="text-[10px] font-semibold text-[#737370] uppercase tracking-[1px]">Effort</p>
                      <p className="text-[13px] font-semibold text-[#1A1816]">{method.effort}</p>
                    </div>
                    <div className="bg-white border border-[#E8E8E4] rounded px-3 py-2">
                      <p className="text-[10px] font-semibold text-[#737370] uppercase tracking-[1px]">Time to first deal</p>
                      <p className="text-[13px] font-semibold text-[#1A1816]">{method.timeToFirstDeal}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* DeelMap advantage */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3 text-center">A FASTER WAY</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-3 text-center">How DeelMap changes the equation</h2>
          <p className="text-[15px] text-[#444441] text-center mb-10 max-w-[640px] mx-auto">DeelMap aggregates verified off-market deals from motivated sellers across the country so you can browse, analyze, and connect without any of the traditional sourcing overhead.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {DEELMAP_ADVANTAGES.map((adv) => {
              const Icon = adv.icon
              return (
                <div key={adv.title} className="bg-white border border-[#E8E8E4] rounded p-6">
                  <div className="w-10 h-10 bg-[#D03839]/10 rounded flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-[#D03839]" />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#1A1816] mb-2">{adv.title}</h3>
                  <p className="text-[14px] text-[#444441] leading-relaxed">{adv.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-[680px] mx-auto px-6 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">START TODAY</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-4">Browse verified off-market deals now</h2>
          <p className="text-[16px] text-[#444441] leading-relaxed mb-8">
            Stop cold-calling. Stop driving. DeelMap gives you instant access to thousands of verified off-market wholesale deals across all 50 states — free for every buyer.
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
