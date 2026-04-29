import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CheckCircle2, XCircle, DollarSign, Shield, Zap, Users } from 'lucide-react'

export const metadata = {
  title: 'DeelMap vs DealMachine — Which Is Better for Finding Wholesale Deals?',
  description: 'Compare DeelMap and DealMachine. DealMachine is a driving-for-dollars lead gen app. DeelMap is a verified wholesale deal marketplace. See which fits your investing strategy.',
  keywords: 'DeelMap vs DealMachine, DealMachine alternative, wholesale real estate marketplace, best way to find wholesale deals, DealMachine comparison',
}

const TESTIMONIALS = [
  {
    text: 'I used to spend hours sorting through duplicate listings. With DeelMap, I find clean, verified deals, understand the numbers, and move quickly. It\'s saved me time on every deal.',
    name: 'Raj Mehta', role: 'Fix & Flip Investor', deals: 25, initials: 'MC', color: 'bg-orange-400',
  },
  {
    text: 'I didn\'t know how to evaluate deals properly before. The ARV and ROI insights on DeelMap made everything easier to understand and helped me make better decisions.',
    name: 'Jonathan Reed', role: 'First-time Investor', deals: 15, initials: 'MH', color: 'bg-blue-500',
  },
  {
    text: 'I don\'t have time to jump between platforms. DeelMap brings everything into one place, so I can find, analyze, and connect faster without wasting time or missing good opportunities.',
    name: 'Emily Johnson', role: 'Real Estate Investor', deals: 10, initials: 'SM', color: 'bg-emerald-500',
  },
]

const COMPARISON_ROWS = [
  {
    feature: 'Price for Buyers',
    deelmap: { positive: true, text: 'Always free — browse and contact sellers at no cost' },
    competitor: { positive: false, text: '$49–$149/month subscription to generate and manage leads' },
  },
  {
    feature: 'What It Is',
    deelmap: { positive: true, text: 'A marketplace — sellers list live deals for buyers to browse' },
    competitor: { positive: false, text: 'A lead gen app — you drive neighborhoods to find distressed properties' },
  },
  {
    feature: 'Ready-to-Buy Deals',
    deelmap: { positive: true, text: 'Yes — every listing is a seller actively looking to close' },
    competitor: { positive: false, text: 'No — you identify properties and then cold-contact owners' },
  },
  {
    feature: 'Seller Verification',
    deelmap: { positive: true, text: 'Every seller identity-verified before listing' },
    competitor: { positive: false, text: 'No verification — you\'re cold-contacting property owners who may not want to sell' },
  },
  {
    feature: 'Time Investment',
    deelmap: { positive: true, text: 'Browse live deals on day one — no outreach required' },
    competitor: { positive: false, text: 'Drive neighborhoods, send mail, wait for callbacks — weeks of effort per deal' },
  },
  {
    feature: 'ARV Data',
    deelmap: { positive: true, text: 'Automated ARV on every listing — no analysis required' },
    competitor: { positive: false, text: 'Basic property data available but no structured deal analysis' },
  },
  {
    feature: 'Direct Seller Contact',
    deelmap: { positive: true, text: 'Secure messaging directly to verified, motivated sellers' },
    competitor: { positive: false, text: 'Cold mail, ringless voicemails, and cold calls to property owners' },
  },
  {
    feature: 'Free for Buyers',
    deelmap: { positive: true, text: 'Yes — zero cost to find and connect with sellers' },
    competitor: { positive: false, text: 'No — monthly subscription required before finding any leads' },
  },
  {
    feature: 'No Unsolicited Contact',
    deelmap: { positive: true, text: 'Buyers reach out on their own terms — no cold calls, ringless voicemails, or spam mailers ever' },
    competitor: { positive: false, text: 'Built to blast cold mail, texts, and ringless voicemails to homeowners who never asked to be contacted' },
  },
  {
    feature: 'Buyer Data Privacy',
    deelmap: { positive: true, text: 'Your contact info stays in-platform — sellers never receive your phone number or email directly' },
    competitor: { positive: false, text: 'Contact data is the core product — buyer and property owner info freely exported and used for outreach' },
  },
]

const BENEFITS = [
  {
    icon: DollarSign,
    title: 'No driving required',
    description: 'DealMachine was built for investors who want to physically scout neighborhoods. DeelMap brings verified off-market deals to you — browse from anywhere, for free.',
  },
  {
    icon: Shield,
    title: 'Sellers who are ready',
    description: 'DealMachine blasts cold outreach to homeowners who may never want to sell. Every DeelMap seller has proactively listed their deal — motivated, verified, and waiting for your message.',
  },
  {
    icon: Zap,
    title: 'Instant deal access',
    description: 'DealMachine requires weeks of mailing and follow-up before a single conversation. On DeelMap, you can message a verified seller the same day you sign up.',
  },
  {
    icon: Users,
    title: 'Numbers on every deal',
    description: 'DealMachine identifies properties — it doesn\'t structure deals. DeelMap shows ARV, spread, and deal details upfront so you know the numbers before reaching out.',
  },
]

export default function VsDealMachinePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-16 pb-12 lg:pt-20 lg:pb-16 bg-white">
        <div className="max-w-[760px] mx-auto px-6 sm:px-8 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">PLATFORM COMPARISON</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1816] leading-tight mb-6">
            DeelMap vs DealMachine — Which Is Better for Finding Wholesale Deals?
          </h1>
          <p className="text-[16px] text-[#444441] leading-relaxed mb-8">
            DealMachine sends cold mail, ringless voicemails, and texts to homeowners who may not want to sell. DeelMap is a marketplace where motivated sellers actively list their own deals — buyers browse for free, no cold outreach required on either side, and your contact info stays completely private.
          </p>
          <Link href="/marketplace" className="inline-flex items-center gap-2 h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors">
            Try DeelMap Free
          </Link>
        </div>
      </section>

      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3 text-center">FEATURE COMPARISON</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-10 text-center">Side-by-side comparison</h2>
          <div className="rounded border border-[#E8E8E4] overflow-hidden">
            <div className="grid grid-cols-3 bg-[#1A1816]">
              <div className="p-4 lg:p-5"><p className="text-[12px] font-semibold text-[#737370] uppercase tracking-[1px]">Feature</p></div>
              <div className="p-4 lg:p-5 border-l border-[#2D2A27]"><p className="text-[14px] font-bold text-white">DeelMap</p></div>
              <div className="p-4 lg:p-5 border-l border-[#2D2A27]"><p className="text-[14px] font-bold text-[#737370]">DealMachine</p></div>
            </div>
            {COMPARISON_ROWS.map((row, idx) => (
              <div key={row.feature} className={`grid grid-cols-3 border-t border-[#E8E8E4] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}`}>
                <div className="p-4 lg:p-5"><p className="text-[14px] font-semibold text-[#1A1816]">{row.feature}</p></div>
                <div className="p-4 lg:p-5 border-l border-[#E8E8E4]">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" />
                    <p className="text-[13px] text-[#444441] leading-relaxed">{row.deelmap.text}</p>
                  </div>
                </div>
                <div className="p-4 lg:p-5 border-l border-[#E8E8E4]">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-[#D03839] flex-shrink-0 mt-0.5" />
                    <p className="text-[13px] text-[#737370] leading-relaxed">{row.competitor.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3 text-center">WHY INVESTORS CHOOSE DEELMAP</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-10 text-center">Stop driving. Start closing.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon
              return (
                <div key={benefit.title} className="bg-[#FAFAF8] border border-[#E8E8E4] rounded p-6">
                  <div className="w-10 h-10 bg-[#D03839]/10 rounded flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-[#D03839]" />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#1A1816] mb-2">{benefit.title}</h3>
                  <p className="text-[14px] text-[#444441] leading-relaxed">{benefit.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">USER STORIES</p>
          <h2 className="text-3xl font-bold text-[#1A1816] mb-10">What investors say about DeelMap</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white border border-[#E8E8E4] rounded p-6">
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[13px] text-[#444441] leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${t.color} flex items-center justify-center text-white text-[12px] font-bold`}>{t.initials}</div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#1A1816]">{t.name}</p>
                      <p className="text-[11px] text-[#737370]">{t.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-[#1A1816]">{t.deals}</p>
                    <p className="text-[10px] text-[#A8A8A4]">Deals closed</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-[680px] mx-auto px-6 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">GET STARTED</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-4">Try DeelMap free today</h2>
          <p className="text-[16px] text-[#444441] leading-relaxed mb-8">No subscription. No driving. Browse thousands of verified wholesale deals and connect with motivated sellers on day one.</p>
          <Link href="/marketplace" className="inline-flex items-center gap-2 h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors">
            Browse the Marketplace
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
