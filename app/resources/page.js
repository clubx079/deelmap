'use client'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Home } from 'lucide-react'

export default function ResourcesPage() {
  return (
    <div className="min-h-screen">
      <Navbar currentPage="resources" />

      {/* Resources Grid Section */}
      <section className="py-16 lg:py-24" style={{ backgroundColor: '#F6F4F1' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: '#022b41' }}>
              Available Resources
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Access finance calculators and tools designed for real estate investors
            </p>
          </div>

          {/* Resources Grid */}
          <div className="flex justify-center">
            {/* DSCR Loan Card */}
            <Link href="/resources/dscr-loan" className="max-w-md w-full">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 cursor-pointer group h-full">
                <div
                  className="p-8 text-center transition-colors duration-300"
                  style={{ backgroundColor: '#022b41' }}
                >
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: '#b29578' }}>
                    <Home className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    DSCR Loan
                  </h3>
                  <p className="text-white/80 text-sm">
                    Debt Service Coverage Ratio
                  </p>
                </div>

                <div className="p-6">
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Calculate loan eligibility based on property cash flow rather than personal income. Perfect for real estate investors.
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: '#b29578' }} />
                      <span className="text-sm text-gray-700">No personal income verification required</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: '#b29578' }} />
                      <span className="text-sm text-gray-700">Based on property rental income</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: '#b29578' }} />
                      <span className="text-sm text-gray-700">Ideal for investment properties</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm font-semibold transition-colors group-hover:text-[#b29578]" style={{ color: '#022b41' }}>
                    <span>Calculate Now</span>
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-20" style={{ backgroundColor: '#022b41' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Need Help Getting Started?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Our team is here to help you understand these resources and find the right finance solution for your investment property.
          </p>
          <Link href="/contact">
            <button
              className="px-8 py-4 rounded-lg font-semibold text-lg text-white transition-all duration-300 hover:shadow-xl hover:scale-105"
              style={{ backgroundColor: '#b29578' }}
            >
              Contact Us Today
            </button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
