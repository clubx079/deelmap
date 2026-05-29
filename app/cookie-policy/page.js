'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen">
      <Navbar currentPage="cookie-policy" />

      <section className="relative py-16 lg:py-20 overflow-hidden" style={{ backgroundColor: '#F6F4F1' }}>
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'url(/assets/aboutussection.jpg)', backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', opacity: 0.15 }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded shadow-lg p-6 sm:p-8 lg:p-12">

            <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-4">Cookie Policy</h1>
            <p className="text-sm text-gray-600 mb-8"><strong>Effective Date:</strong> May 28, 2026</p>

            <div className="prose prose-gray max-w-none mb-8">
              <p className="text-base leading-relaxed text-gray-700">
                This Cookie Policy explains how DeelMap ("we", "us") uses cookies and similar technologies when you visit our website. It should be read alongside our{' '}
                <a href="/privacy-policy" className="text-[#D03839] font-semibold hover:underline">Privacy Policy</a>.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1A1816] mb-4">1. What are cookies?</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Cookies are small text files placed on your device when you visit a website. They help the site function, remember your preferences, and understand how the site is used. We also use similar technologies such as local storage and pixels, which we refer to collectively as "cookies".
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1A1816] mb-4">2. Types of cookies we use</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Essential cookies</strong> — required for core features such as signing in, keeping you logged in, and saving properties. The site cannot function properly without these.</li>
                <li><strong>Performance &amp; analytics cookies</strong> — help us understand how visitors use the site so we can improve it (for example, which pages are visited and how the marketplace performs).</li>
                <li><strong>Functional cookies</strong> — remember choices you make (such as filters or recently viewed deals) to give you a more personalized experience.</li>
              </ul>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1A1816] mb-4">3. Managing cookies</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Most browsers let you control cookies through their settings — you can block or delete them at any time. Please note that disabling essential cookies may prevent parts of DeelMap (such as login and saved properties) from working correctly.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1A1816] mb-4">4. Third-party cookies</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Some cookies may be set by third-party services we use, such as analytics and mapping providers. These third parties are responsible for their own cookies and privacy practices.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1A1816] mb-4">5. Changes to this policy</h2>
              <p className="text-base leading-relaxed text-gray-700">
                We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated effective date.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1A1816] mb-4">6. Contact us</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Questions about this policy? Reach us through our{' '}
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
