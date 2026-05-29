'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen">
      <Navbar currentPage="disclaimer" />

      <section className="relative py-16 lg:py-20 overflow-hidden" style={{ backgroundColor: '#F6F4F1' }}>
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'url(/assets/aboutussection.jpg)', backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', opacity: 0.15 }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded shadow-lg p-6 sm:p-8 lg:p-12">

            <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-4">Disclaimer</h1>
            <p className="text-sm text-gray-600 mb-8"><strong>Effective Date:</strong> May 28, 2026</p>

            <div className="prose prose-gray max-w-none mb-8">
              <p className="text-base leading-relaxed text-gray-700">
                The information provided on DeelMap is for general informational purposes only. By using the Site, you acknowledge and agree to the disclaimers below. This page should be read together with our{' '}
                <a href="/terms-of-use" className="text-[#D03839] font-semibold hover:underline">Terms of Use</a>.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1A1816] mb-4">1. No professional advice</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Nothing on DeelMap constitutes legal, financial, tax, or investment advice. Property data, ARV estimates, projected returns, and analytics are provided for informational purposes only. You should consult your own qualified professionals before making any purchase, sale, or investment decision.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1A1816] mb-4">2. Accuracy of property data</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Listings and property information are provided "as is" and are often supplied by third-party sellers and wholesalers. DeelMap does not guarantee the accuracy, completeness, or current availability of any listing, price, ARV, condition, or other detail. You are responsible for independently verifying all information before acting on it.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1A1816] mb-4">3. Investment risk</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Real estate investing involves risk, including the possible loss of principal. Past performance and projected figures are not guarantees of future results. Any decision you make based on information from the Site is made at your own risk.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1A1816] mb-4">4. Third-party sellers and listings</h2>
              <p className="text-base leading-relaxed text-gray-700">
                DeelMap is a marketplace that connects buyers and sellers. We do not own, control, or independently verify the properties listed, and we are not a party to any transaction between users. Any agreement you enter into is solely between you and the other party.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1A1816] mb-4">5. External links</h2>
              <p className="text-base leading-relaxed text-gray-700">
                The Site may contain links to third-party websites. We are not responsible for the content, accuracy, or practices of any third-party site.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1A1816] mb-4">6. Limitation of liability</h2>
              <p className="text-base leading-relaxed text-gray-700">
                To the fullest extent permitted by law, DeelMap is not liable for any loss or damage arising from your reliance on information obtained through the Site or from any transaction with another user.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1A1816] mb-4">7. Contact us</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Questions about this disclaimer? Reach us through our{' '}
                <a href="/contact" className="text-[#D03839] font-semibold hover:underline">contact page</a>.
              </p>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
