'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { RegistrationModal } from '@/components/RegistrationModal'
import { PropertiesSlider } from '@/components/home/PropertiesSlider'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Search, Star, ShieldCheck, MessageSquare, Check, BadgeCheck, SlidersHorizontal, Rocket } from 'lucide-react'
import LocationAutocomplete from '@/components/ui/LocationAutocomplete'

const TESTIMONIALS = [
  { initials: 'MC', color: 'bg-[#D03839]', name: 'Michael Carter', role: 'Property Investor', metric: '23', metricLabel: 'deals closed', text: 'Deelmap helped me discover off-market deals I wouldn\'t have found anywhere else. The ARV data alone saves me a full underwriting session per deal. I open the platform and have real deals in under 5 minutes.' },
  { initials: 'MH', color: 'bg-[#0E7490]', name: 'Marcus Hill', role: 'Real Estate Investor', metric: '$4.2M', metricLabel: 'portfolio', text: 'The deduplication is the killer feature. I was seeing the same property from three different wholesalers. Deelmap cleaned all of that up. Now the marketplace brings together opportunities from different sellers without the chaos.' },
  { initials: 'SM', color: 'bg-[#0F6E56]', name: 'Sophia Martinez', role: 'Wholesale Investor', metric: '140+', metricLabel: 'deals assigned', text: 'Being able to connect with buyers and sellers directly inside the platform makes deals move much faster than traditional methods. As a wholesaler, deal velocity doubled. The verified buyer network is a game changer.' },
  { initials: 'JR', color: 'bg-[#7C3AED]', name: 'James Rivera', role: 'Fix & Flip Investor', metric: '58', metricLabel: 'deals closed', text: 'I\'ve tried every wholesale marketplace out there. Deelmap is the first one where the data is actually reliable. The ARV estimates and spread calculations are accurate enough that I trust them in my first pass.' },
  { initials: 'AL', color: 'bg-[#B45309]', name: 'Ashley Lee', role: 'Buy & Hold Investor', metric: '$2.8M', metricLabel: 'portfolio', text: 'Finding cash-flowing rentals used to take weeks of sorting through duplicate listings. Now I filter by cap rate, pick a state, and have a short list in minutes. My acquisition pace has completely changed.' },
  { initials: 'DW', color: 'bg-[#0369A1]', name: 'Derek Wallace', role: 'Portfolio Builder', metric: '31', metricLabel: 'deals assigned', text: 'The messaging system keeps everything organized. I\'m not juggling emails and texts anymore — every conversation with a seller is in one place, tied to the exact deal. It\'s the workflow I always needed.' },
]

function InvestorTestimonials() {
  const [index, setIndex] = useState(0)
  const visible = TESTIMONIALS.slice(index, index + 3)
  return (
    <section className="py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[1.1px] mb-3">INVESTOR STORIES</p>
            <h2 className="text-[36px] sm:text-[40px] font-bold text-[#1A1816]">What our investors say about us</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-2">
            <button
              onClick={() => setIndex(i => Math.max(0, i - 1))}
              disabled={index === 0}
              className="w-9 h-9 rounded-full border border-[#E8E8E4] flex items-center justify-center text-[#1A1816] hover:bg-[#FAFAF8] disabled:opacity-30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              onClick={() => setIndex(i => Math.min(TESTIMONIALS.length - 3, i + 1))}
              disabled={index >= TESTIMONIALS.length - 3}
              className="w-9 h-9 rounded-full border border-[#E8E8E4] flex items-center justify-center text-[#1A1816] hover:bg-[#FAFAF8] disabled:opacity-30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {visible.map((t) => (
            <div key={t.name} className="bg-white border border-[#E8E8E4] rounded p-6 flex flex-col">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                ))}
              </div>
              <p className="text-[14px] text-[#444441] leading-relaxed mb-6 flex-1 italic">
                <span className="text-[#D03839] font-bold not-italic">"</span>{t.text}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1816]">{t.name}</p>
                    <p className="text-[12px] text-[#737370]">{t.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold text-[#D03839]">{t.metric}</p>
                  <p className="text-[11px] text-[#A8A8A4]">{t.metricLabel}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const WHY_FEATURES = [
  { Icon: BadgeCheck, title: 'Verified listings', desc: 'Every property is identity-verified and deduplicated before it reaches your feed.' },
  { Icon: Rocket, title: 'Deal marketplace', desc: 'Browse thousands of off-market wholesale deals aggregated from across the US.' },
  { Icon: SlidersHorizontal, title: 'Smart deal filters', desc: 'Filter by ARV, cap rate, cash-on-cash return, location, and more.' },
  { Icon: MessageSquare, title: 'Secure messaging', desc: 'Contact sellers directly through the platform — your info stays private.' },
]

const HOW_IT_WORKS = [
  { n: 1, title: 'Discover deals', desc: 'Browse off-market properties from trusted, verified sellers across the US.' },
  { n: 2, title: 'Analyze data', desc: 'Compare pricing, ARV estimates, and projected returns at a glance.' },
  { n: 3, title: 'Connect with sellers', desc: 'Message verified wholesalers securely inside the platform.' },
  { n: 4, title: 'Close faster', desc: 'Secure promising opportunities before other investors move in.' },
]

export default function HomePage() {
  const [showRegistration, setShowRegistration] = useState(false)
  const [heroSearch, setHeroSearch] = useState('')
  const [activeStep, setActiveStep] = useState(1)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep(prev => prev === 4 ? 1 : prev + 1)
    }, 1800)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#F7F6F3]" style={{ minHeight: '100vh' }}>
        {/* Background: Figma map image */}
        <Image
          src="/assets/hero-map-new.png"
          alt="Deelmap map view"
          fill
          className="object-cover"
          style={{ objectPosition: '0% center' }}
          priority
          sizes="100vw"
        />
        {/* Left gradient overlay so text stays readable */}
        <div className="absolute inset-0 hidden lg:block" style={{ background: 'linear-gradient(to right, white 0%, white 35%, rgba(255,255,255,0.6) 50%, transparent 65%)' }} />
        <div className="absolute inset-0 lg:hidden" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.88) 42%, white 65%)' }} />

        {/* Left: Text (overlaid) */}
        <div className="relative z-10 flex items-center h-full" style={{ minHeight: '100vh' }}>
          <div className="lg:w-[62%] xl:w-[58%] px-6 lg:px-40 xl:px-40 py-16 lg:py-0 lg:pt-[70px]">
            <div className="w-full max-w-[620px]">

              {/* Heading */}
              <h1 className="text-[44px] sm:text-[48px] lg:text-[46px] xl:text-[52px] font-bold text-[#1A1816] leading-[1.1] mb-5">
                Discover verified<br />
                off-market{' '}
                <span className="text-[#D03839]">real<br />estate deals</span>
              </h1>

              {/* Subtext */}
              <p className="text-[16px] text-[#444441] leading-relaxed mb-8 max-w-[420px]">
                Browse investment opportunities from wholesalers and sellers across the United States— all in one trusted marketplace.
              </p>

              {/* Search bar */}
              <div className="flex items-center h-[56px] border border-[#E8E8E4] bg-white rounded mb-5 max-w-[580px] focus-within:border-[#D03839] focus-within:shadow-[0_0_0_3px_rgba(208,56,57,0.12)] transition-all duration-200">
                <LocationAutocomplete
                  value={heroSearch}
                  onChange={setHeroSearch}
                  onSelect={({ label }) => {
                    setHeroSearch(label)
                    window.location.href = `/marketplace?search=${encodeURIComponent(label)}`
                  }}
                  onSubmit={(val) => {
                    window.location.href = `/marketplace${val ? `?search=${encodeURIComponent(val)}` : ''}`
                  }}
                  placeholder="Search markets, cities, or ZIP codes"
                  inputStyle={{ fontSize: '15px' }}
                  buttonClassName="px-5 w-auto"
                />
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-[#16A34A] fill-[#16A34A]" />
                  <span className="text-[13px] text-[#444441]">Verified sellers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span className="text-[13px] text-[#444441]">No spam, no duplicates</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span className="text-[13px] text-[#444441]">Secure messaging</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <PropertiesSlider />

      {/* Why Deelmap Section */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-[1fr_1.6fr] gap-32 items-center">
            {/* Left */}
            <div>
              <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[1.1px] mb-3">WHY DEELMAP</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-4">
                Built to help you find<br />
                <span className="underline underline-offset-4">profitable deals</span>
              </h2>
              <p className="text-[15px] leading-relaxed mb-8" style={{ color: '#737370' }}>
                Discover curated investment properties with transparent data, ARV insights, and opportunities designed for serious investors.
              </p>
              <ul className="space-y-4">
                {[
                  'No spam, no duplicate listings',
                  'Every seller identity-verified',
                  'Real-time ARV and spread data',
                  'Contact info never publicly exposed',
                ].map(item => (
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
                  <h4 className="text-[15px] font-semibold text-[#1A1816] mb-2">{title}</h4>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#737370' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 lg:py-32 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[1.1px] mb-3">HOW IT WORKS</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-3">
            Find and close deals faster
          </h2>
          <p className="text-[16px] max-w-xl mx-auto mb-12" style={{ color: '#737370' }}>
            Our streamlined process helps investors discover opportunities and connect with sellers quickly.
          </p>

          {/* Circles row with dashed line */}
          <div className="relative mb-8">
            <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 border-t-2 border-dashed border-[#D4D4CF]" style={{ left: '12.5%', right: '12.5%' }} />
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

      {/* Who It's For Section */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[1.1px] mb-3">WHO IT'S FOR</p>
          <h2 className="text-[36px] sm:text-[40px] font-bold text-[#1A1816] mb-8">Built for buyers &amp; sellers</h2>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Buyers — dark card */}
            <div className="relative bg-[#1A1816] rounded p-10 lg:p-14 overflow-hidden flex flex-col min-h-[500px]">
              {/* Decorative blob */}
              <div className="absolute top-[-60px] right-[-60px] w-[280px] h-[280px] rounded-full bg-[#2e2b28] opacity-70 pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full">
                <span className="self-start text-[12px] font-semibold text-white bg-[#333] px-3 py-1.5 rounded-full mb-6">FOR BUYERS</span>
                <h3 className="text-[32px] font-bold text-white mb-3">Investors</h3>
                <p className="text-[14px] text-[#A8A8A4] leading-relaxed mb-6">
                  Find deals that match your strategy — whether you fix-and-flip or build a rental portfolio.
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    'Fix-and-flip investors — buy below market, renovate, and resell for profit',
                    'Landlords — find rental properties to hold for long-term cash flow',
                    'Portfolio builders — scale your real estate holdings efficiently',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-3 text-[14px] text-[#D4D4CF]">
                      <span className="w-5 h-5 rounded-full bg-[#333] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-white stroke-[2.5]" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div>
                  <Link
                    href="/marketplace"
                    className="inline-flex items-center gap-2 h-11 px-6 bg-[#D03839] hover:bg-[#E0493B] active:bg-[#C73022] active:scale-[0.98] text-white text-[14px] font-semibold rounded transition-all duration-200"
                  >
                    Browse deals →
                  </Link>
                </div>
              </div>
            </div>

            {/* Sellers — light card */}
            <div className="relative bg-[#FAFAF8] rounded p-10 lg:p-14 overflow-hidden flex flex-col min-h-[500px]">
              {/* Decorative circle */}
              <div className="absolute top-[-40px] right-[-40px] w-[240px] h-[240px] rounded-full bg-[#E8E8E4] opacity-60 pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full">
                <span className="self-start text-[12px] font-semibold text-[#444441] bg-white border border-[#E8E8E4] px-3 py-1.5 rounded-full mb-6">FOR SELLERS</span>
                <h3 className="text-[32px] font-bold text-[#1A1816] mb-3">List your property</h3>
                <p className="text-[14px] text-[#737370] leading-relaxed mb-6">
                  Reach thousands of serious, verified investors ready to close — without the spam.
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    'Wholesalers — connect with active buyers ready for new opportunities',
                    'Homeowners — list your property and reach thousands of investors',
                    'Deal sourcers — build credibility and close repeat deals faster',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-3 text-[14px] text-[#444441]">
                      <span className="w-5 h-5 rounded-full bg-[#DCFCE7] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-[#16A34A] stroke-[2.5]" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div>
                  <Link
                    href="/join-seller"
                    className="inline-flex items-center gap-2 h-11 px-6 bg-[#1A1816] hover:bg-[#2e2b28] text-white text-[14px] font-semibold rounded transition-colors"
                  >
                    List a property →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Investor Testimonials Section */}
      <InvestorTestimonials />

      <Footer />

      {/* Registration Modal */}
      <RegistrationModal
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
        initialStep="signup"
      />
    </div>
  )
}
