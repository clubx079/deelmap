'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export default function PartnershipsPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-normal text-slate-900 mb-8 leading-tight tracking-tight">
              Partnerships
            </h1>
            <p className="text-xl sm:text-2xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
              Building strategic partnerships to enhance the Deelmap experience.
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="text-center space-y-6">
            <p className="text-lg lg:text-xl leading-relaxed text-slate-700">
              We're always looking for strategic partnerships that can benefit our community of investors and wholesalers. If you're interested in partnering with Deelmap, please reach out to us.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
