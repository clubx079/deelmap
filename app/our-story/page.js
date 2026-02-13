'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import Image from 'next/image'
import Link from 'next/link'

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      {/* Hero Section - "We Buy & Sell A Property Every 13 Minutes" */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Side - Illustration */}
            <div className="order-2 lg:order-1 flex justify-center lg:justify-start">
              <div className="relative w-full max-w-md">
                <Image
                  src="/assets/Frame-3.png"
                  alt="DeelMap team collaboration"
                  width={500}
                  height={500}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>

            {/* Right Side - Text and Buttons */}
            <div className="order-1 lg:order-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal text-slate-900 mb-6 leading-tight">
                We Buy & Sell A Property Every 13 Minutes
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
                What started out as a few hungry entrepreneurs driven to organize an erratic industry has transformed into the largest single-family investment marketplace in the nation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/careers"
                  className="inline-flex items-center justify-center px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                >
                  View Careers
                </Link>
                <Link
                  href="/leadership"
                  className="inline-flex items-center justify-center px-8 py-3 bg-white border-2 border-red-600 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors"
                >
                  View Our Leadership Team
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Beginning Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Side - Text */}
            <div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-normal text-slate-900 mb-8 leading-tight">
                The Beginning
              </h2>
              <div className="space-y-6 text-lg text-slate-700 leading-relaxed">
                <p>
                  On the heels of the 2008 foreclosure crisis, we saw an opportunity to serve local flippers and landlords in need of a constant source of investment properties.
                </p>
                <p>
                  With a plan firmly rooted in technology, we utilized data and our local field expertise to create unique algorithms that would take an outdated, local, one-to-one model for acquiring houses to a national scale.
                </p>
              </div>
            </div>

            {/* Right Side - Illustration */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md">
                <Image
                  src="/assets/Frame-6.png"
                  alt="Property for sale illustration"
                  width={500}
                  height={500}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Building On Success Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Side - Map and Year */}
            <div className="flex flex-col items-center lg:items-start">
              <div className="relative w-full max-w-sm mb-6">
                <Image
                  src="/assets/Frame-6.png"
                  alt="Growth map showing 2008"
                  width={400}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Right Side - Text */}
            <div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-normal text-slate-900 mb-8 leading-tight">
                Building On Success
              </h2>
              <div className="space-y-6 text-lg text-slate-700 leading-relaxed">
                <p>
                  We opened our first offices and business took off. From launching Dallas and Fort Worth to Houston and San Antonio—we laid down roots. And then set our sights on expansion outside the Lone Star state, taking on new markets in Atlanta and Philadelphia and moving on to California and Florida.
                </p>
                <p>
                  As we started getting noticed and also rewarded as the fastest-growing business in Dallas, we launched into hypergrowth, expanding into more markets. Since inception, demand for our service has continued to rise and we have seen an average growth rate of 40 percent year-over-year.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2022 Growth Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Side - Text */}
            <div>
              <p className="text-2xl sm:text-3xl lg:text-4xl text-slate-900 leading-relaxed">
                In 2022 we experienced our most significant growth, <span className="text-red-600 font-bold">doubling</span> our geographic footprint.
              </p>
            </div>

          </div>
        </div>
      </section>


      <Footer />
    </div>
  )
}
