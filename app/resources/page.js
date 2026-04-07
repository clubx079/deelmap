'use client'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Calculator, BarChart3, ArrowRight } from 'lucide-react'

const TOOLS = [
  {
    icon: Calculator,
    label: 'Tool',
    title: 'DSCR Calculator',
    description: 'Calculate loan eligibility based on property cash flow. Enter your rent, loan amount, rate, and expenses to instantly see your DSCR ratio, monthly cash flow, cap rate, and cash-on-cash return.',
    features: ['DSCR ratio & loan eligibility', 'Monthly & annual cash flow', 'Cap rate & cash-on-cash return', 'Purchase & refinance scenarios'],
    href: '/resources/dscr-loan',
    cta: 'Open Calculator',
  },
  {
    icon: BarChart3,
    label: 'Tool',
    title: 'Advanced REI Underwriter',
    description: 'Full BRRRR / buy-and-hold / flip underwriting tool. Model the complete deal lifecycle from acquisition through refinance and exit with 60+ inputs across 6 tabs.',
    features: ['Full BRRRR deal modeling', 'Hard money + DSCR refi waterfall', '5-year cash flow projection & IRR', 'Flip / sale exit analysis'],
    href: '/dscr-calculator',
    cta: 'Open Underwriter',
  },
]

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />
      <div className="pt-[80px]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">

          {/* Header */}
          <div className="mb-10">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#D03839] mb-2">Resources</p>
            <h1 className="text-[26px] font-bold text-[#1A1816] mb-2">Investment Tools</h1>
            <p className="text-[14px] text-[#737370]">Calculators and underwriting tools built for real estate investors.</p>
          </div>

          {/* Tool cards */}
          <div className="flex flex-col gap-4">
            {TOOLS.map((tool) => {
              const Icon = tool.icon
              return (
                <Link key={tool.href} href={tool.href}>
                  <div className="bg-white border border-[#E8E8E4] rounded hover:shadow-md hover:border-[#D03839] transition-all duration-200 p-6 flex flex-col sm:flex-row gap-5">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-11 h-11 bg-[#FEF0EF] border border-[#F5C4C0] rounded flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#D03839]" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#737370] mb-1">{tool.label}</p>
                      <h2 className="text-[16px] font-bold text-[#1A1816] mb-2">{tool.title}</h2>
                      <p className="text-[13px] text-[#737370] leading-relaxed mb-4">{tool.description}</p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 mb-4">
                        {tool.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-[12px] text-[#444441]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D03839] flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#D03839]">
                        {tool.cta} <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

        </div>
      </div>
      <Footer />
    </div>
  )
}
