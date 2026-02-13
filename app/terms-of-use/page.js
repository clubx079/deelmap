'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen">
      <Navbar currentPage="terms-of-use" />

      {/* Terms of Use Content Section */}
      <section
        className="relative py-16 lg:py-20 overflow-hidden"
        style={{ backgroundColor: '#F6F4F1' }}
      >
        {/* Background Image Overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/assets/aboutussection.jpg)',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            opacity: 0.15
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 lg:p-12">

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold text-[#022b41] mb-4">
              Ableman Terms of Use
            </h1>

            {/* Effective Date */}
            <p className="text-sm text-gray-600 mb-8">
              <strong>Effective Date:</strong> Dec. 15, 2025
            </p>

            {/* Introduction */}
            <div className="prose prose-gray max-w-none mb-8">
              <p className="text-base leading-relaxed text-gray-700">
                These Terms of Use ("Terms") govern your access to and use of the Ableman website, platform, content, data, and services (collectively, the "Site" or "Services"). By accessing or using the Site or Services, you agree to be bound by these Terms. If you do not agree, do not use the Site or Services.
              </p>
            </div>

            {/* Section 1 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">1. Ownership of Content and Data</h2>
              <p className="text-base leading-relaxed text-gray-700 mb-4">
                All content, materials, information, property data, listings, pricing, analytics, text, graphics, images, videos, software, and other materials made available on or through the Site (collectively, "Ableman Content") are owned by or licensed to Ableman and are protected by applicable intellectual property and proprietary rights laws.
              </p>
              <p className="text-base leading-relaxed text-gray-700 mb-4">
                Ableman Content may not be used publicly or commercially without consent.
              </p>
              <p className="text-base leading-relaxed text-gray-700">
                You may not copy, reproduce, publish, display, distribute, scrape, sell, license, or otherwise use Ableman Content — including property or market data — for any public, commercial, or third-party purpose without prior express written approval from Ableman.
              </p>
            </div>

            {/* Section 2 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">2. Limited Permission to Use</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Ableman grants you a limited, revocable, non-exclusive, non-transferable permission to access and use the Site and Services solely for their intended purpose. All rights not expressly granted are reserved by Ableman.
              </p>
            </div>

            {/* Section 3 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">3. Prohibited Conduct</h2>
              <p className="text-base leading-relaxed text-gray-700 mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Publicly share, republish, or redistribute Ableman Content without written consent;</li>
                <li>Scrape, harvest, mine, or extract data from the Site by any means;</li>
                <li>Reverse engineer, interfere with, or disrupt the Site or Services;</li>
                <li>Use the Site or Services in violation of any applicable law;</li>
                <li>Misrepresent your identity or misuse the platform.</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">4. Suspension, Blocking, and Enforcement</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Ableman may, at its sole discretion and without notice, block, suspend, restrict, or terminate your access to the Site or Services for any violation of these Terms or misuse of Ableman Content.
              </p>
            </div>

            {/* Section 5 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">5. Legal and Financial Consequences</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Unauthorized use of Ableman Content or violation of these Terms may result in legal and financial penalties, including injunctive relief, monetary damages, recovery of attorneys' fees and costs, and other remedies available under law.
              </p>
            </div>

            {/* Section 6 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">6. Disclaimers and Limitation of Liability</h2>
              <p className="text-base leading-relaxed text-gray-700">
                The Site and Services are provided on an "AS IS" and "AS AVAILABLE" basis. To the fullest extent permitted by law, Ableman disclaims all warranties and shall not be liable for any indirect, incidental, consequential, or punitive damages.
              </p>
            </div>

            {/* Section 7 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">7. Governing Law</h2>
              <p className="text-base leading-relaxed text-gray-700">
                These Terms are governed by the laws of the State of Kentucky. Any disputes shall be brought exclusively in the state or federal courts located in Kentucky.
              </p>
            </div>

            {/* Section 8 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">8. Changes to These Terms</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Ableman may update these Terms at any time by posting revised Terms on the Site. Continued use of the Site or Services constitutes acceptance of the updated Terms.
              </p>
            </div>

            {/* Section 9 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">9. Contact</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Questions regarding these Terms should be directed to Ableman using the contact information provided on the Site.
              </p>
            </div>

            {/* Closing Statement */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-base leading-relaxed text-gray-700 font-medium">
                By using the Site or Services, you acknowledge that you have read, understood, and agree to these Terms of Use.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Don't Hesitate CTA Section */}
      <section
        className="relative py-16 lg:py-20 overflow-hidden"
        style={{ backgroundColor: '#B29578' }}
      >
        {/* Background Overlay Image */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/assets/overlaycta.png)',
            backgroundPosition: 'center left',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            opacity: 0.5
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">

            {/* Left side - Text Content */}
            <div className="text-center lg:text-left lg:flex-1">
              <p
                className="text-sm sm:text-base font-medium text-white uppercase tracking-wider mb-4"
                style={{
                  animation: 'fadeInUp 1.2s ease-out',
                  opacity: 0.9
                }}
              >
                DON'T HESITATE TO CONTACT US
              </p>
              <h2
                className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight"
                style={{
                  animation: 'fadeInUp 1.2s ease-out 0.2s both'
                }}
              >
                MAKE AN APPOINTMENT NOW
              </h2>
            </div>

            {/* Right side - CTA Button */}
            <div
              className="lg:flex-shrink-0"
              style={{
                animation: 'fadeInUp 1.2s ease-out 0.4s both'
              }}
            >
              <a
                href="/contact"
                className="inline-block bg-[#022b41] hover:bg-white hover:text-[#022b41] text-white px-8 lg:px-12 py-4 lg:py-5 rounded-lg font-bold text-sm lg:text-base uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                CONTACT US TODAY!
              </a>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
