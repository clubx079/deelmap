'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'
import { Search, MessageCircle, Home, FileText, CreditCard, ArrowRight } from 'lucide-react'

const TOPICS = [
  { Icon: Home, title: 'Getting started', desc: 'How DeelMap works, creating an account, and browsing deals.', href: '/faq/getting-started' },
  { Icon: Search, title: 'Buying & offers', desc: 'Finding deals, saving favorites, making offers, and messaging sellers.', href: '/faq/buyers' },
  { Icon: FileText, title: 'Listing a deal', desc: 'Posting a property, photos, highlights, and the review process.', href: '/faq/sellers' },
  { Icon: CreditCard, title: 'Investing & financing', desc: 'ARV, spread, financing requests, and analyzing returns.', href: '/faq/investing' },
]

export default function HelpCenterPage() {
  return (
    <div className="min-h-screen">
      <Navbar currentPage="help" />

      <section className="relative py-16 lg:py-20 overflow-hidden" style={{ backgroundColor: '#F6F4F1' }}>
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'url(/assets/aboutussection.jpg)', backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', opacity: 0.15 }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-3">How can we help?</h1>
            <p className="text-base text-[#444441] max-w-2xl mx-auto">
              Find answers to common questions, or get in touch with our team.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <Link href="/faq" className="inline-flex items-center gap-2 px-5 py-3 bg-[#D03839] hover:bg-[#E0493B] text-white rounded text-sm font-semibold transition-colors">
                <Search className="w-4 h-4" /> Browse all FAQs
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-[#E8E8E4] hover:border-[#D03839] text-[#1A1816] rounded text-sm font-semibold transition-colors">
                <MessageCircle className="w-4 h-4" /> Contact support
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TOPICS.map(({ Icon, title, desc, href }) => (
              <Link
                key={title}
                href={href}
                className="group bg-white border border-[#E8E8E4] rounded p-6 hover:border-[#D03839] transition-colors flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-[#FEF0EF] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#D03839]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[#1A1816] mb-1 flex items-center gap-1">
                    {title}
                    <ArrowRight className="w-3.5 h-3.5 text-[#A8A8A4] group-hover:text-[#D03839] transition-colors" />
                  </p>
                  <p className="text-[13px] text-[#737370] leading-relaxed">{desc}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 bg-[#1A1816] rounded p-6 sm:p-8 text-center">
            <p className="text-white text-lg font-semibold mb-1">Still need help?</p>
            <p className="text-[#A8A8A4] text-sm mb-5">Our team typically responds within one business day.</p>
            <Link href="/contact" className="inline-flex items-center gap-2 px-5 py-3 bg-[#D03839] hover:bg-[#E0493B] text-white rounded text-sm font-semibold transition-colors">
              <MessageCircle className="w-4 h-4" /> Get in touch
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
