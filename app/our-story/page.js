'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import Image from 'next/image'
import Link from 'next/link'

const TESTIMONIALS = [
  {
    text: 'I used to spend hours sorting through duplicate listings. With DeelMap, I find clean, verified deals, understand the numbers, and move quickly. It\'s saved me time on every deal.',
    name: 'Raj Mehta',
    role: 'Fix & Flip Investor',
    deals: 25,
    initials: 'MC',
    color: 'bg-orange-400',
  },
  {
    text: 'I didn\'t know how to evaluate deals properly before. The ARV and ROI insights on DeelMap made everything easier to understand and helped me make better decisions.',
    name: 'Jonathan Reed',
    role: 'First-time Investor',
    deals: 15,
    initials: 'MH',
    color: 'bg-blue-500',
  },
  {
    text: 'I don\'t have time to jump between platforms. DeelMap brings everything into one place, so I can find, analyze, and connect faster without wasting time or missing good opportunities.',
    name: 'Emily Johnson',
    role: 'Real Estate Investor',
    deals: 10,
    initials: 'SM',
    color: 'bg-emerald-500',
  },
]

const OTHERS_LIST = [
  'Duplicate listings across multiple sellers',
  'Unverified sellers and unreliable information',
  'Endless browsing with no clear deal insights',
  'Spam inquiries and low-quality leads',
  'Scattered communication across platforms',
  'Outdated or incomplete deal information',
  'Slow deal discovery and missed opportunities',
  'Cold outreach with low response rates',
]

const DEELMAP_LIST = [
  'Clean, deduplicated deals in one place',
  'Every deal tied to identity-verified sellers',
  'Clear ARV, spread, and ROI data at a glance',
  'Connect only with serious, active investors',
  'Secure, centralized messaging within the platform',
  'Up-to-date, structured deal data you can trust',
  'Instant access to high-quality deals',
  'Direct access to active, responsive buyers',
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-16 pb-12 lg:pt-20 lg:pb-16 bg-white">
        <div className="max-w-[720px] mx-auto px-6 sm:px-8 lg:px-10 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1816] leading-tight mb-6">
            Your trusted platform for finding{' '}
            <span className="text-[#D03839]">real estate deals</span>
          </h1>
          <div className="max-w-[720px] mx-auto text-center space-y-4">
            <p className="text-[16px] text-[#444441] leading-relaxed">
              DeelMap is a modern marketplace built for real estate investors to discover verified off-market deals, analyze opportunities with real data, and connect directly with serious buyers and sellers. We remove the noise from traditional platforms so you can focus on what matters – finding and closing the right deals faster.
            </p>
            <p className="text-[16px] text-[#444441] leading-relaxed">
              From accurate ARV insights to structured deal data and secure communication, DeelMap brings everything you need into one place. Whether you're flipping properties or building a rental portfolio, our platform is designed to help you move with clarity and confidence.
            </p>
            <p className="text-[15px] font-semibold text-[#1A1816]">
              DeelMap helps investors find, analyze, and close better deals faster.
            </p>
          </div>
        </div>
      </section>

      {/* Why we built DeelMap */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="rounded overflow-hidden">
              <Image
                src="/assets/image-11.png"
                alt="Aerial view of neighborhood"
                width={600}
                height={400}
                className="w-full h-auto object-cover rounded"
              />
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-5">Why we built DeelMap</h2>
              <p className="text-[16px] text-[#444441] leading-relaxed mb-4">
                Real estate investing is full of noise — duplicate listings, unverified sellers, and wasted time. Investors spend more time filtering deals than actually closing them.
              </p>
              <p className="text-[16px] text-[#444441] leading-relaxed">
                We built DeelMap to change that. A platform where every deal is structured, every seller is verified, and every opportunity is worth your time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What makes DeelMap different */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3 text-center">WHY DEELMAP</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-10 text-center">What makes DeelMap different</h2>
          <div className="grid md:grid-cols-2 gap-0 overflow-hidden rounded border border-[#E8E8E4]">
            {/* Others */}
            <div className="bg-[#F3F3F1] p-8">
              <h3 className="text-[18px] font-bold text-[#1A1816] mb-5">Others</h3>
              <ul className="space-y-5">
                {OTHERS_LIST.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px] text-[#444441]">
                    <span className="w-4 h-4 rounded-full bg-[#1A1816] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* DeelMap */}
            <div className="bg-[#1A1816] p-8">
              <h3 className="text-[18px] font-bold text-white mb-5">DeelMap</h3>
              <ul className="space-y-5">
                {DEELMAP_LIST.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px] text-[#A8A8A4]">
                    <span className="w-4 h-4 rounded-full bg-[#D03839] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">USER STORIES</p>
          <h2 className="text-3xl font-bold text-[#1A1816] mb-10">What our users say about us</h2>
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
                    <div className={`w-8 h-8 rounded-full ${t.color} flex items-center justify-center text-white text-[12px] font-bold`}>
                      {t.initials}
                    </div>
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

      <Footer />
    </div>
  )
}
