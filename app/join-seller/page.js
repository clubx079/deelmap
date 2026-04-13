'use client'
import { useState, useEffect } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Check, BadgeCheck, Rocket, TrendingUp, ShieldCheck } from 'lucide-react'

function openAuth(step) {
  window.dispatchEvent(new CustomEvent('showAuth', { detail: { step, role: 'seller' } }))
}

const FAQ_ITEMS = [
  { q: 'How do I list my property on Deelmap?', a: 'Create a seller account, complete your profile, then use the dashboard to add your property details, photos, and pricing.' },
  { q: 'Who will see my property listing?', a: 'Your listing is visible to our verified network of active real estate investors across the United States.' },
  { q: 'How do I list my property on Deelmap?', a: 'Log in to your seller account, navigate to "Add Property", fill in the details and submit for review. Listings go live within 24 hours.' },
  { q: 'How quickly can I start receiving offers and inquiries?', a: 'Most sellers receive their first inquiry within 48 hours of their listing going live.' },
  { q: 'How does Deelmap ensure I receive inquiries from verified investors only?', a: 'Every buyer on Deelmap goes through identity verification and must confirm active investment intent before accessing listings.' },
  { q: 'Do I need a real estate agent to sell my property on Deelmap?', a: 'No. Deelmap connects you directly with investors, removing the need for a traditional agent.' },
  { q: 'How is my contact information kept private and secure?', a: 'All communication happens through the Deelmap platform. Your personal contact details are never shared with buyers directly.' },
  { q: 'What happens after I submit my property listing?', a: 'Our team reviews it within 24 hours. Once approved, it goes live to our full investor network.' },
]

const TESTIMONIALS = [
  {
    text: 'DeelMap helped me list my property, and connect with serious buyers much faster than expected. I didn\'t have to deal with random inquiries or calls. The process felt smooth, and I was able to move forward with confident buyers.',
    name: 'Raj Mehta',
    role: 'Property Owner',
    days: 12,
    initials: 'RM',
    color: 'bg-orange-400',
  },
  {
    text: 'What I liked most was the quality of buyers. Every inquiry felt relevant and serious, which made conversations more productive. Instead of going back and forth endlessly, I was able to focus on real opportunities and close faster.',
    name: 'Jonathan Reed',
    role: 'First-time Investor',
    days: 24,
    initials: 'JR',
    color: 'bg-blue-500',
  },
  {
    text: 'Listing on DeelMap was simple, and the response was almost immediate. Buyers already had a clear understanding of the deal, which made negotiations easier. It saved me a lot of time compared to traditional platforms.',
    name: 'Emily Johnson',
    role: 'Real Estate Investor',
    days: 31,
    initials: 'EJ',
    color: 'bg-emerald-500',
  },
]

const HOW_IT_WORKS = [
  { n: 1, title: 'List your property', desc: 'Add pricing details, property info, and upload high-quality photos to showcase your deal.' },
  { n: 2, title: 'Reach verified investors', desc: 'Your deal gets instant visibility, reaching serious investors ready to take action.' },
  { n: 3, title: 'Receive offers & messages', desc: 'Get quality inquiries from verified investors actively looking to buy serious deals.' },
  { n: 4, title: 'Close your deal', desc: 'Finalize faster with trusted buyers and close deals efficiently with full confidence.' },
]

const CLOSED_DEALS = [
  { badge: 'Similar to yours', roi: '+73% ROI', soldDate: 'Jan 7, 2026', price: 189000, arv: '340k', sqft: '2,040', beds: 4, baths: 2, location: 'Phoenix, AZ', spread: 151000, days: 16, type: 'Fix & Flip', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=260&fit=crop' },
  { badge: null, roi: '+66% ROI', soldDate: 'Nov 14, 2025', price: 111000, arv: '185k', sqft: '1,420', beds: 3, baths: 1.5, location: 'Detroit, MI', spread: 74000, days: 11, type: 'BRRRR', img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=260&fit=crop' },
  { badge: 'Just listed', roi: '+88% ROI', soldDate: 'Jan 7, 2026', price: 210000, arv: '395k', sqft: '1,860', beds: 3, baths: 2, location: 'Bend, OR', spread: 185000, days: 22, type: 'Fix & Flip', img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=260&fit=crop' },
  { badge: null, roi: '+92% ROI', soldDate: 'Dec 11, 2025', price: 142000, arv: '278k', sqft: '1,720', beds: 3, baths: 2, location: 'Asheville, NC', spread: 136000, days: 18, type: 'Buy & Hold', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=260&fit=crop' },
  { badge: 'Hot deal', roi: '+61% ROI', soldDate: 'Dec 3, 2025', price: 95000, arv: '153k', sqft: '1,310', beds: 3, baths: 1, location: 'Memphis, TN', spread: 58000, days: 9, type: 'Fix & Flip', img: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=400&h=260&fit=crop' },
  { badge: null, roi: '+79% ROI', soldDate: 'Nov 28, 2025', price: 175000, arv: '314k', sqft: '2,100', beds: 4, baths: 2.5, location: 'Tampa, FL', spread: 139000, days: 14, type: 'Buy & Hold', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=260&fit=crop' },
]

const WHY_FEATURES = [
  { Icon: BadgeCheck, title: 'Verified buyers', desc: 'Only serious, identity-verified investors ready to take action on quality deals.' },
  { Icon: Rocket, title: 'Fast deal distribution', desc: 'Your listing reaches active buyers instantly, increasing visibility and response speed.' },
  { Icon: TrendingUp, title: 'Smart pricing insights', desc: 'Understand ARV, spread, and market demand to price your deal more effectively.' },
  { Icon: ShieldCheck, title: 'Private communication', desc: 'Your contact details stay protected while communicating securely with buyers.' },
]

const PricingCheckIcon = ({ filled }) => (
  <span className={`flex-shrink-0 mt-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border ${filled ? 'bg-[#1A1816] border-[#1A1816]' : 'border-[#E8E8E4]'}`}>
    {filled && (
      <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
        <path d="M1 2.5L2.8 4.2L6 1" stroke="#FAFAF8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </span>
)

const SELLER_PORTAL_URL = process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || 'https://sellerportaldeelmap-production-bea8.up.railway.app'

function savePlanAndGo(plan, href) {
  try { localStorage.setItem('deelmap_selected_plan', plan) } catch {}
  window.location.href = href
}

export default function SellPage() {
  const { user } = useAuth()
  const [openFaq, setOpenFaq] = useState(null)
  const [activeStep, setActiveStep] = useState(1)
  const [dealIndex, setDealIndex] = useState(0)
  const [annual, setAnnual] = useState(false)
  const visibleDeals = CLOSED_DEALS.slice(dealIndex, dealIndex + 4)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep(prev => prev === 4 ? 1 : prev + 1)
    }, 1800)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-36 pb-32 bg-white">
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div className="pt-4">
              <h1 className="text-4xl sm:text-5xl font-bold text-[#1A1816] leading-tight mb-4">
                Sell your property to{' '}
                <span className="text-[#D03839]">serious investors</span>
              </h1>
              <p className="text-[#737370] text-[17px] mb-6 leading-relaxed">
                List your deal, reach verified buyers, and close faster without spam or middlemen, with direct access to serious investors.
              </p>
              <ul className="space-y-3 mb-8">
                {['Access to 10,000+ active, organic investors', 'Direct access to verified buyers', 'Faster offers and deal closing', 'Get serious inquiries only'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-[#444441] text-[15px]">
                    <span className="w-5 h-5 rounded-full bg-[#DCFCE7] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-[#16A34A] stroke-[2.5]" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right – Login card */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-sm">
                {/* Background shadow layer */}
                <div className="absolute inset-0 translate-x-2.5 translate-y-2.5 bg-[#E8E8E4] rounded-[14px]" />
                <div className="relative bg-white border border-[#E8E8E4] rounded-[14px] p-10 shadow-sm">
                {/* Lock icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-14 h-14 bg-[#FEF0EF] rounded-full flex items-center justify-center">
                    <svg className="w-7 h-7 text-[#D03839]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-[18px] font-bold text-[#1A1816] text-center mb-3">Log in to continue</h3>
                <p className="text-[13px] text-center mb-8" style={{ color: '#737370' }}>
                  Create an account to list your property and connect with verified investors
                </p>
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="w-full h-12 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold text-[15px] rounded flex items-center justify-center transition-colors mb-3"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full h-12 bg-white border border-[#1A1816] text-[#1A1816] font-semibold text-[15px] rounded flex items-center justify-center hover:bg-[#FAFAF8] transition-colors"
                >
                  Sign up as seller
                </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 lg:py-32 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">HOW IT WORKS</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-3">
            Sell your property in a few<br />simple steps
          </h2>
          <p className="text-[16px] max-w-xl mx-auto mb-12" style={{ color: '#737370' }}>
            List your property, connect with investors, and close your deal quickly with a faster, more efficient process.
          </p>

          {/* Circles row with single continuous dashed line */}
          <div className="relative mb-8">
            {/* Dashed line from center of circle 1 to center of circle 4 */}
            <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 border-t-2 border-dashed border-[#D1D1CE]" style={{ left: '12.5%', right: '12.5%' }} />
            <div className="grid grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((step) => (
                <div key={step.n} className="flex justify-center">
                  <div className="relative flex items-center justify-center w-24 h-24">
                    {activeStep === step.n && (
                      <svg key={`ring-${activeStep}`} className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
                        <circle cx="48" cy="48" r="40" fill="none" stroke="#E8E8E4" strokeWidth="2.5" />
                        <circle
                          cx="48" cy="48" r="40"
                          fill="none"
                          stroke="#D03839"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray="251"
                          className="animate-stroke-fill"
                          style={{ strokeDashoffset: 251 }}
                        />
                      </svg>
                    )}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-[20px] font-bold transition-all duration-500 ease-in-out z-10 ${
                      activeStep === step.n
                        ? 'bg-[#D03839] text-white'
                        : 'bg-white border-2 border-[#E8E8E4] text-[#A8A8A4]'
                    }`}
                    style={activeStep === step.n ? { boxShadow: '0 6px 20px rgba(208,56,57,0.35)' } : {}}>
                      {step.n}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-8">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.n} className="text-center px-4">
                <h3 className={`text-[16px] font-semibold mb-3 transition-colors duration-500 ${activeStep === step.n ? 'text-[#1A1816]' : 'text-[#737370]'}`}>
                  {step.title}
                </h3>
                <p className={`text-[14px] leading-relaxed transition-colors duration-500 ${activeStep === step.n ? 'text-[#444441]' : 'text-[#A8A8A4]'}`}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Sell on Deelmap */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-[1fr_1.6fr] gap-32 items-center">
            {/* Left */}
            <div>
              <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">WHY SELL ON DEELMAP</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-4">Built to help you<br />close deals faster</h2>
              <p className="text-[15px] leading-relaxed mb-8" style={{ color: '#737370' }}>
                Discover curated investment properties with transparent data, ARV insights, and opportunities designed for serious investors.
              </p>
              <ul className="space-y-4">
                {['Reach verified investors instantly', 'No spam or duplicate inquiries', 'Transparent deal insights', 'Secure communication'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-[#444441] text-[15px]">
                    <span className="w-5 h-5 rounded-full bg-[#DCFCE7] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-[#16A34A] stroke-[2.5]" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Right */}
            <div className="grid grid-cols-2 gap-5">
              {WHY_FEATURES.map(({ Icon, title, desc }) => (
                <div key={title} className="bg-[#FAFAF8] border border-[#E8E8E4] rounded p-5">
                  <div className="w-10 h-10 bg-white border border-[#E8E8E4] rounded flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-[#D03839]" />
                  </div>
                  <h4 className="text-[15px] font-semibold text-[#1A1816] mb-5">{title}</h4>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#737370' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Closed Deals Nearby */}
      <section className="py-16 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          {/* Header */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-2">RECENT SALES</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816]">Closed deals nearby</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDealIndex(i => Math.max(0, i - 1))}
                disabled={dealIndex === 0}
                className="w-9 h-9 rounded-full border border-[#E8E8E4] bg-white flex items-center justify-center text-[#1A1816] hover:bg-[#FAFAF8] disabled:opacity-30 transition-colors"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
              <button
                type="button"
                onClick={() => setDealIndex(i => Math.min(CLOSED_DEALS.length - 4, i + 1))}
                disabled={dealIndex >= CLOSED_DEALS.length - 4}
                className="w-9 h-9 rounded-full border border-[#E8E8E4] bg-white flex items-center justify-center text-[#1A1816] hover:bg-[#FAFAF8] disabled:opacity-30 transition-colors"
              >
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleDeals.map((deal, i) => (
              <div key={dealIndex + i} className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
                {/* Image */}
                <div className="relative h-[160px]">
                  <img src={deal.img} alt={deal.location} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  {deal.badge && (
                    <span className="absolute top-2 left-2 bg-white text-[#1A1816] text-[10px] font-semibold px-2 py-1 rounded">
                      {deal.badge}
                    </span>
                  )}
                  <span className="absolute top-2 right-2 bg-[#1A1816] text-white text-[10px] font-bold px-2 py-1 rounded">
                    {deal.roi}
                  </span>
                </div>
                {/* Content */}
                <div className="p-4">
                  <p className="text-[11px] text-[#737370] mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D03839] inline-block flex-shrink-0" />
                    Sold – {deal.soldDate}
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[18px] font-bold text-[#1A1816]">${Number(deal.price).toLocaleString()}</span>
                    <span className="text-[10px] font-semibold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded">ARV ${deal.arv}</span>
                  </div>
                  <p className="text-[11px] text-[#737370] mb-1">{deal.sqft} sq ft &nbsp;·&nbsp; {deal.beds} bed &nbsp;·&nbsp; {deal.baths} bath</p>
                  <p className="text-[11px] text-[#737370] mb-3 flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {deal.location}
                  </p>
                  <div className="border-t border-[#E8E8E4] pt-3 grid grid-cols-3 gap-1">
                    <div>
                      <p className="text-[9px] font-semibold text-[#A8A8A4] uppercase tracking-[1px] mb-0.5">Spread</p>
                      <p className="text-[11px] font-semibold text-[#D03839]">${(deal.spread / 1000).toFixed(0)}k</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-[#A8A8A4] uppercase tracking-[1px] mb-0.5">Days on market</p>
                      <p className="text-[11px] font-semibold text-[#1A1816]">{deal.days} days</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-[#A8A8A4] uppercase tracking-[1px] mb-0.5">Type</p>
                      <p className="text-[11px] font-semibold text-[#1A1816]">{deal.type}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4 text-center">FREQUENTLY ASKED QUESTIONS</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-14 text-center">Everything you need to know</h2>
          <div className="divide-y divide-[#E8E8E4]">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-6 text-left gap-6"
                >
                  <span className="text-[16px] font-semibold text-[#1A1816]">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-[#1A1816] flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <p className="pb-6 text-[14px] leading-relaxed text-[#1A1816]">{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seller Testimonials */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">SELLER STORIES</p>
          <h2 className="text-3xl font-bold text-[#1A1816] mb-10">What our sellers say about us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white border border-[#E8E8E4] rounded-lg p-6 flex flex-col">
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  ))}
                </div>
                <p className="text-[13px] text-[#444441] leading-relaxed mb-5 flex-1">"{t.text}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${t.color} flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0`}>
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#1A1816] whitespace-nowrap">{t.name}</p>
                      <p className="text-[11px] text-[#737370] whitespace-nowrap">{t.role}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-bold text-[#1A1816]">{t.days}</p>
                    <p className="text-[10px] text-[#A8A8A4]">Deals closed</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section id="pricing" className="py-20 lg:py-28 bg-[#FAFAF8]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">PRICING</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-3">Simple, transparent pricing</h2>
            <p className="text-[16px] text-[#737370] leading-relaxed">List a single deal or run your entire pipeline. No hidden fees.</p>
          </div>

          {/* Billing Toggle */}
          <div className="flex flex-col items-center gap-2.5 mb-10">
            <div className="flex items-center gap-3">
              <span className={`text-sm transition-colors ${!annual ? 'text-[#1A1816] font-medium' : 'text-[#737370]'}`}>Monthly</span>
              <button
                onClick={() => setAnnual(v => !v)}
                className={`relative w-10 h-[22px] rounded-full flex-shrink-0 transition-colors cursor-pointer border-none ${annual ? 'bg-[#D03839]' : 'bg-[#1A1816]'}`}
              >
                <span className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-[#FAFAF8] transition-transform ${annual ? 'translate-x-[18px]' : 'translate-x-0'}`} />
              </button>
              <span className={`text-sm transition-colors ${annual ? 'text-[#1A1816] font-medium' : 'text-[#737370]'}`}>Annual</span>
            </div>
            <span className="text-[11px] font-semibold bg-[#E4F5EC] text-[#0F6E56] px-2.5 py-0.5 rounded-full">Save 20% on annual subscription</span>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Pay Per Listing */}
            <div className="bg-white border border-[#E8E8E4] rounded p-5 flex flex-col">
              <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-1">One-time</p>
              <h3 className="text-2xl font-bold text-[#1A1816] tracking-tight mb-1">Pay Per Listing</h3>
              <p className="text-xs text-[#737370] leading-relaxed mb-4 min-h-[2.4rem]">
                List a single property. No subscription required.
              </p>
              <div className="text-[38px] font-bold text-[#1A1816] leading-none tracking-tight mb-1">
                <sup className="text-lg font-normal align-super">$</sup>29
              </div>
              <p className="text-xs text-[#737370] mb-1">per listing · 30-day expiry</p>
              <p className="text-[11px] text-[#A8A8A4] mb-5 min-h-[1rem]">Listing goes live after review</p>
              <button
                onClick={() => savePlanAndGo('pay-per-listing', '/buyer/listings?new=1')}
                className="block w-full py-2.5 text-center text-xs font-semibold tracking-[0.05em] uppercase border border-[#D4D4CF] text-[#1A1816] rounded hover:bg-[#F3F3F0] transition-colors mb-5"
              >
                Post a listing
              </button>
              <hr className="border-t border-[#E8E8E4] mb-4" />
              <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-2.5">Includes</p>
              <ul className="flex flex-col gap-1.5">
                {[
                  [true, 'Basic seller dashboard'],
                  [true, 'Buyer inquiry inbox'],
                  [true, 'Photo uploads'],
                  [true, 'Basic analytics'],
                  [true, 'Standard support'],
                  [false, 'Verified seller badge'],
                  [false, 'Priority search placement'],
                  [false, 'CRM features'],
                ].map(([on, label], i) => (
                  <li key={i} className={`flex items-start gap-2 text-xs leading-snug ${on ? 'text-[#1A1816]' : 'text-[#A8A8A4]'}`}>
                    <PricingCheckIcon filled={on} />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro Seller */}
            <div className="bg-white border-2 border-[#D03839] rounded p-5 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4]">Subscription</p>
                <span className="text-[11px] font-semibold bg-[#FEF0EF] text-[#D03839] px-2.5 py-0.5 rounded">Most popular</span>
              </div>
              <h3 className="text-2xl font-bold text-[#1A1816] tracking-tight mb-1">Pro seller</h3>
              <p className="text-xs text-[#737370] leading-relaxed mb-4 min-h-[2.4rem]">
                For active investors and wholesalers moving deals consistently.
              </p>
              <div className="text-[38px] font-bold text-[#1A1816] leading-none tracking-tight mb-1 flex items-baseline gap-1.5">
                <span><sup className="text-lg font-normal align-super">$</sup>{annual ? '79' : '99'}</span>
                <span className="text-sm font-normal text-[#737370]">/ per month</span>
              </div>
              <p className="text-[11px] text-[#A8A8A4] mb-5 min-h-[1rem]">{annual ? 'Save $240 vs monthly' : '$19 per additional listing'}</p>
              <button
                onClick={() => savePlanAndGo('pro', `${SELLER_PORTAL_URL}/onboarding?plan=pro&billing=${annual ? 'annual' : 'monthly'}`)}
                className="block w-full py-2.5 text-center text-xs font-semibold tracking-[0.05em] uppercase bg-[#D03839] text-white rounded hover:bg-[#E0493B] active:bg-[#C73022] transition-colors mb-5"
              >
                Start free 7-day trial
              </button>
              <hr className="border-t border-[#E8E8E4] mb-4" />
              <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-2.5">Includes</p>
              <ul className="flex flex-col gap-1.5">
                {[
                  [true, 'Verified seller badge'],
                  [true, 'Advanced seller dashboard'],
                  [true, 'Advanced analytics'],
                  [true, 'Priority search placement'],
                  [true, 'Priority support'],
                  [true, '10 listings / month'],
                  [false, 'CRM features'],
                  [false, 'Team accounts'],
                ].map(([on, label], i) => (
                  <li key={i} className={`flex items-start gap-2 text-xs leading-snug ${on ? 'text-[#1A1816]' : 'text-[#A8A8A4]'}`}>
                    <PricingCheckIcon filled={on} />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Enterprise */}
            <div className="bg-white border border-[#E8E8E4] rounded p-5 flex flex-col">
              <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-1">Subscription</p>
              <h3 className="text-2xl font-bold text-[#1A1816] tracking-tight mb-1">Enterprise</h3>
              <p className="text-xs text-[#737370] leading-relaxed mb-4 min-h-[2.4rem]">
                For acquisition teams running high-volume pipelines.
              </p>
              <div className="text-[38px] font-bold text-[#1A1816] leading-none tracking-tight mb-1 flex items-baseline gap-1.5">
                <span><sup className="text-lg font-normal align-super">$</sup>{annual ? '239' : '299'}</span>
                <span className="text-sm font-normal text-[#737370]">/ per month</span>
              </div>
              <p className="text-[11px] text-[#A8A8A4] mb-5 min-h-[1rem]">{annual ? 'Save $720 vs monthly' : '\u00a0'}</p>
              <button
                onClick={() => savePlanAndGo('enterprise', `${SELLER_PORTAL_URL}/onboarding?plan=enterprise&billing=${annual ? 'annual' : 'monthly'}`)}
                className="block w-full py-2.5 text-center text-xs font-semibold tracking-[0.05em] uppercase border border-[#D4D4CF] text-[#1A1816] rounded hover:bg-[#F3F3F0] transition-colors mb-5"
              >
                Start 7 day free trial
              </button>
              <hr className="border-t border-[#E8E8E4] mb-4" />
              <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-2.5">Includes</p>
              <ul className="flex flex-col gap-1.5">
                {[
                  [true, 'Everything in Pro'],
                  [true, 'Unlimited listings'],
                  [true, 'Basic CRM features'],
                  [true, 'Lead management tools'],
                  [true, 'Team accounts'],
                  [true, 'Custom branding'],
                  [true, 'Dedicated account support'],
                  [true, 'API access'],
                ].map(([on, label], i) => (
                  <li key={i} className={`flex items-start gap-2 text-xs leading-snug ${on ? 'text-[#1A1816]' : 'text-[#A8A8A4]'}`}>
                    <PricingCheckIcon filled={on} />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Add-ons */}
          <div className="mt-16 pt-14 border-t border-[#E8E8E4]">
            <div className="text-center mb-8">
              <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">LISTING ENHANCEMENTS</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#1A1816] mb-2">Boost your listing visibility</h3>
              <p className="text-[15px] text-[#737370]">Available on any plan. Add them at checkout — no commitment required.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Highlight */}
              <div className="bg-white border border-[#E8E8E4] rounded p-5 flex flex-col">
                <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-1.5">Visibility</p>
                <p className="text-[15px] font-bold text-[#1A1816] mb-2 leading-snug">Highlight Listing</p>
                <p className="text-[13px] text-[#737370] leading-relaxed flex-1 mb-4">
                  Gold-bordered card in search results so your deal stands out from the crowd.
                </p>
                <div className="mt-auto">
                  <p className="text-[26px] font-bold text-[#1A1816] tracking-tight leading-none mb-0.5">$9.99</p>
                  <p className="text-[11px] text-[#A8A8A4]">One-time · per listing</p>
                </div>
              </div>

              {/* Homepage */}
              <div className="bg-white border border-[#E8E8E4] rounded p-5 flex flex-col">
                <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-1.5">Placement</p>
                <p className="text-[15px] font-bold text-[#1A1816] mb-2 leading-snug">Feature on Homepage</p>
                <p className="text-[13px] text-[#737370] leading-relaxed flex-1 mb-4">
                  Your listing rotates in the featured deals section seen by all visitors for 7 days.
                </p>
                <div className="mt-auto">
                  <p className="text-[26px] font-bold text-[#1A1816] tracking-tight leading-none mb-0.5">$29</p>
                  <p className="text-[11px] text-[#A8A8A4]">One-time · 7-day window</p>
                </div>
              </div>

              {/* Boost */}
              <div className="bg-white border border-[#E8E8E4] rounded p-5 flex flex-col">
                <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-1.5">Ranking</p>
                <p className="text-[15px] font-bold text-[#1A1816] mb-2 leading-snug">Boost Listing</p>
                <p className="text-[13px] text-[#737370] leading-relaxed flex-1 mb-4">
                  Pushed to the top of search results for 7 days, then decays organically.
                </p>
                <div className="mt-auto">
                  <p className="text-[26px] font-bold text-[#1A1816] tracking-tight leading-none mb-0.5">$14.99</p>
                  <p className="text-[11px] text-[#A8A8A4]">One-time · 7-day boost</p>
                </div>
              </div>

              {/* Bundle */}
              <div className="bg-white border-2 border-[#D03839] rounded p-5 flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4]">Bundle</p>
                  <span className="text-[10px] font-semibold bg-[#E4F5EC] text-[#0F6E56] px-2 py-0.5 rounded">Best value</span>
                </div>
                <p className="text-[15px] font-bold text-[#1A1816] mb-2 leading-snug">Highlight + Boost</p>
                <p className="text-[13px] text-[#737370] leading-relaxed flex-1 mb-4">
                  Full 30-day highlight plus a 7-day boost to top of search. Best value.
                </p>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <p className="text-[26px] font-bold text-[#1A1816] tracking-tight leading-none">$22</p>
                    <p className="text-[12px] text-[#A8A8A4] line-through">$24.98</p>
                  </div>
                  <p className="text-[11px] text-[#A8A8A4]">One-time · saves $2.98</p>
                </div>
              </div>

            </div>

            <p className="text-center text-[12px] text-[#A8A8A4] mt-6">
              Add-ons are selected at checkout when posting your listing. No separate purchase needed.
            </p>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  )
}
