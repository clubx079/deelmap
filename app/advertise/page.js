'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'
import { Mail, Users, TrendingUp, Target, BarChart2, CheckCircle } from 'lucide-react'

const BENEFITS = [
  {
    icon: Users,
    title: 'Qualified Audience',
    description: 'Reach thousands of active real estate investors, wholesalers, and buyers who are ready to transact — not just browse.',
  },
  {
    icon: Target,
    title: 'Targeted Exposure',
    description: 'Your brand appears in front of the right people at the right time — directly on deal pages, search results, and the marketplace.',
  },
  {
    icon: TrendingUp,
    title: 'Growing Platform',
    description: 'DeelMap is one of the fastest-growing wholesale real estate marketplaces in the US. Get in early and grow with us.',
  },
  {
    icon: BarChart2,
    title: 'Measurable Results',
    description: 'Track impressions, clicks, and conversions. We believe in transparency — you always know how your advertising is performing.',
  },
]

const AD_OPTIONS = [
  {
    title: 'Featured Listings',
    description: 'Boost your property listings to the top of search results and the marketplace homepage for maximum visibility.',
    tag: 'Most Popular',
  },
  {
    title: 'Banner Placements',
    description: 'Place your brand or service in high-traffic areas of the platform including the marketplace, deal pages, and dashboard.',
    tag: null,
  },
  {
    title: 'Sponsored Content',
    description: 'Partner with us to publish educational or promotional content that reaches our investor community.',
    tag: null,
  },
  {
    title: 'Email Campaigns',
    description: 'Get your message in front of our subscriber list of active investors and wholesale buyers through dedicated email blasts.',
    tag: null,
  },
]

const WHO_ADVERTISES = [
  'Wholesale real estate companies',
  'Hard money & DSCR lenders',
  'Title companies & closing attorneys',
  'Property management firms',
  'Real estate coaches & educators',
  'Home inspection & renovation services',
]

export default function AdvertisePage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />
      <div>

        {/* Hero — black background extends up under the fixed navbar so there's
            no light strip above it */}
        <div className="bg-[#1A1816] text-white pt-[80px]">
          <div className="max-w-5xl mx-auto px-6 lg:px-8 py-16 sm:py-20 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#D03839] mb-3">Advertise with us</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 leading-tight">
              Put Your Brand in Front of<br className="hidden sm:block" /> Serious Real Estate Investors
            </h1>
            <p className="text-[#A8A8A4] text-base sm:text-lg max-w-2xl mx-auto mb-8">
              DeelMap connects wholesale sellers with active buyers across the US. Reach a highly targeted audience that's ready to make deals.
            </p>
            <Link
              href="/contact?topic=advertise"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#D03839] hover:bg-[#E0493B] text-white text-sm font-semibold rounded transition-colors"
            >
              <Mail className="w-4 h-4" />
              Get in touch
            </Link>
            <p className="text-[13px] text-[#A8A8A4] mt-3">We typically respond within 24 hours.</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-14 sm:py-16">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1A1816] text-center mb-10">Why Advertise on DeelMap?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {BENEFITS.map((b) => {
              const Icon = b.icon
              return (
                <div key={b.title} className="bg-white rounded border border-[#E8E8E4] p-6">
                  <div className="w-10 h-10 rounded bg-[#FEF0EF] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-[#D03839]" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#1A1816] mb-2">{b.title}</h3>
                  <p className="text-sm text-[#737370] leading-relaxed">{b.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ad Options */}
        <div className="bg-white border-y border-[#E8E8E4]">
          <div className="max-w-5xl mx-auto px-6 lg:px-8 py-14 sm:py-16">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1A1816] text-center mb-3">Advertising Options</h2>
            <p className="text-sm text-[#737370] text-center mb-10">Flexible packages to fit your goals and budget.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {AD_OPTIONS.map((opt) => (
                <div key={opt.title} className="rounded border border-[#E8E8E4] p-5 relative">
                  {opt.tag && (
                    <span className="absolute top-4 right-4 px-2 py-0.5 bg-[#FEF0EF] text-[#D03839] text-[10px] font-bold rounded uppercase tracking-wide">
                      {opt.tag}
                    </span>
                  )}
                  <h3 className="text-[15px] font-semibold text-[#1A1816] mb-2">{opt.title}</h3>
                  <p className="text-sm text-[#737370] leading-relaxed">{opt.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Who Advertises */}
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-14 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1A1816] mb-3">Who Advertises with Us?</h2>
              <p className="text-sm text-[#737370] mb-6 leading-relaxed">
                We work with businesses that serve the real estate investment community. If your product or service helps investors close more deals, we want to help you reach them.
              </p>
              <div className="space-y-3">
                {WHO_ADVERTISES.map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-[#D03839] shrink-0" />
                    <span className="text-sm text-[#1A1816]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#1A1816] rounded p-8 text-white text-center">
              <p className="text-[12px] font-semibold uppercase tracking-[2px] text-[#D03839] mb-3">Ready to get started?</p>
              <h3 className="text-xl font-bold mb-3">Let's Talk</h3>
              <p className="text-[#A8A8A4] text-sm mb-6 leading-relaxed">
                Reach out to us and we'll put together a package that works for your budget and goals.
              </p>
              <a
                href="mailto:support@deelmap.com"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D03839] hover:bg-[#E0493B] text-white text-sm font-semibold rounded transition-colors"
              >
                <Mail className="w-4 h-4" />
                support@deelmap.com
              </a>
            </div>
          </div>
        </div>

      </div>
      <Footer />
    </div>
  )
}
