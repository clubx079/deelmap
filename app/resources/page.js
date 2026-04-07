'use client'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Calculator, BarChart3, ArrowRight, CheckCircle2 } from 'lucide-react'

const TOOLS = [
  {
    icon: Calculator,
    tag: 'Free Tool',
    title: 'DSCR Calculator',
    subtitle: 'Debt Service Coverage Ratio',
    description: 'Instantly check if a rental property qualifies for a DSCR loan. Enter your rent, loan details, and expenses — get your DSCR ratio, cash flow, cap rate, and more in seconds.',
    features: [
      'DSCR ratio & loan eligibility',
      'Monthly & annual cash flow',
      'Cap rate & cash-on-cash return',
      'Purchase & refinance scenarios',
    ],
    href: '/resources/dscr-loan',
    cta: 'Open Calculator',
  },
  {
    icon: BarChart3,
    tag: 'Advanced Tool',
    title: 'REI Underwriting Tool',
    subtitle: 'Full Deal Underwriter',
    description: 'Model the complete lifecycle of a BRRRR, buy-and-hold, or fix-and-flip deal. From acquisition through refinance and exit — 60+ inputs, 5-year projections, and IRR analysis.',
    features: [
      'Full BRRRR deal waterfall',
      'Hard money + DSCR refi modeling',
      '5-year cash flow & IRR',
      'Flip / sale exit analysis',
    ],
    href: '/dscr-calculator',
    cta: 'Open Underwriter',
  },
]

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />

      {/* Hero */}
      <div className="bg-[#1A1816] pt-[80px]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-14 md:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#D03839] mb-3">Resources</p>
          <h1 className="text-[32px] md:text-[44px] font-bold text-white leading-tight mb-4">Investment Tools</h1>
          <p className="text-[15px] text-white/60 max-w-xl leading-relaxed">
            Free calculators and underwriting tools built for real estate investors. No signup required.
          </p>
        </div>
      </div>

      {/* Tools */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TOOLS.map((tool, idx) => {
            const Icon = tool.icon
            return (
              <Link key={tool.href} href={tool.href} className="group">
                <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden h-full flex flex-col hover:border-[#D03839] hover:shadow-lg transition-all duration-200">

                  {/* Card header */}
                  <div className="bg-[#1A1816] px-6 py-6 flex items-start gap-4">
                    <div className="w-10 h-10 rounded bg-[#D03839] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40 mb-1">{tool.tag}</span>
                      <h2 className="text-[18px] font-bold text-white leading-tight">{tool.title}</h2>
                      <p className="text-[12px] text-white/50 mt-0.5">{tool.subtitle}</p>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="px-6 py-5 flex flex-col flex-1">
                    <p className="text-[13px] text-[#444441] leading-relaxed mb-5">{tool.description}</p>

                    <ul className="space-y-2 mb-6 flex-1">
                      {tool.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#D03839] flex-shrink-0" />
                          <span className="text-[12px] text-[#1A1816] font-medium">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center justify-between pt-4 border-t border-[#E8E8E4]">
                      <span className="text-[12px] font-semibold text-[#D03839] flex items-center gap-1.5 group-hover:gap-2.5 transition-all duration-200">
                        {tool.cta} <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A8A8A4]">Free</span>
                    </div>
                  </div>

                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <Footer />
    </div>
  )
}
