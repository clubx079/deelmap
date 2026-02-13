'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { RegistrationModal } from '@/components/RegistrationModal'
import { PropertiesSlider } from '@/components/home/PropertiesSlider'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export default function HomePage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [showRegistration, setShowRegistration] = useState(false)

  const uniqueFeatures = [
    {
      title: "Extensive Property Database",
      description: "Access thousands of verified properties with complete details, dealer contact information, and comprehensive analytics"
    },
    {
      title: "Your Privacy is Protected",
      description: "Your information stays private. We never share your details with sellers or wholesalers without your explicit permission."
    },
    {
      title: "Sell Your Properties",
      description: "List your properties on our platform and reach thousands of serious buyers instantly"
    }
  ]

  const stats = [
    { number: "Join", label: "The Investors Community" },
    { number: "$500M+", label: "Deals Closed" },
    { number: "45", label: "States Covered" },
    { number: "98%", label: "Success Rate" }
  ]

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section - Text left (contained), Image right fills the space and scales up */}
      <section className="relative bg-white py-4 sm:py-5 lg:py-6 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-stretch lg:min-h-[70vh]">
          {/* Left: Text - padded from left, fixed max-width */}
          <div className="flex-shrink-0 mb-4 lg:mb-0 px-4 sm:px-6 lg:pl-8 xl:pl-12 2xl:pl-20 lg:pr-8 lg:max-w-[42%] xl:max-w-[38%] flex items-center">
            <div className="max-w-xl mx-auto lg:mx-0 text-center lg:text-left animate-fade-in w-full">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-normal leading-tight text-slate-900 tracking-tight mb-2 sm:mb-3">
                <span className="inline-block whitespace-nowrap">A Marketplace Built for</span>
                <br />
                <span className="inline-block whitespace-nowrap">Real Estate Investors</span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-slate-600 mb-3 sm:mb-4 max-w-xl lg:max-w-none mx-auto lg:mx-0 leading-relaxed text-center lg:text-left">
                Largest private source of value-add properties, ready to rehab.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center lg:justify-start">
                <Link
                  href="/signup"
                  className="bg-slate-900 text-white px-6 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all hover:bg-slate-800 w-full sm:w-auto text-center"
                >
                  Get Started
                </Link>
                <Link
                  href="/marketplace"
                  className="border-2 border-slate-900 text-slate-900 px-6 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all hover:bg-slate-900 hover:text-white text-center w-full sm:w-auto"
                >
                  Browse Deals
                </Link>
              </div>
            </div>
          </div>

          {/* Right: Image column - scaled and vertically centered in the blue area */}
          <div className="flex-1 flex items-center justify-center min-w-0 min-h-[50vh] sm:min-h-[55vh] lg:min-h-0 lg:h-[70vh] overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <div
                className="flex items-center justify-center"
                style={{ transform: 'scale(1.6) translateY(8%)', transformOrigin: 'center center' }}
              >
                <Image
                  src="/assets/landing-hero.png"
                  alt="Deelmap – Real estate investor marketplace. Browse properties on map."
                  width={1200}
                  height={630}
                  className="h-[70vh] w-auto object-contain object-center"
                  priority
                  sizes="(max-width: 1024px) 100vw, 65vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <PropertiesSlider />

      {/* Unique Features Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal text-slate-900 mb-4 tracking-tight">
              What Makes Us Different
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            {/* Left: Image */}
            <div className="order-2 lg:order-1">
              <div className="relative w-full aspect-square max-w-md mx-auto lg:max-w-none">
                <Image
                  src="/assets/image 134.png"
                  alt="Deelmap Properties"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* Right: Features List */}
            <div className="order-1 lg:order-2 space-y-8 lg:space-y-10">
              {uniqueFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="group"
                >
                  <div>
                    {/* Content */}
                    <h3 className="text-xl lg:text-2xl font-normal text-slate-900 mb-2 leading-tight group-hover:text-slate-700 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-base lg:text-lg text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Buyers & Sellers Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 lg:items-stretch">
            {/* Buyers Column */}
            <div className="border-2 border-slate-300 p-6 lg:p-8 hover:border-slate-900 transition-all flex flex-col">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-5">
                Buyers
              </h2>
              
              {/* Buyers Image */}
              <div className="relative w-full h-48 sm:h-56 lg:h-64 mb-6 bg-slate-50">
                <Image
                  src="/assets/Frame 33.png"
                  alt="Buyers"
                  fill
                  className="object-contain"
                />
              </div>

              {/* Buyers Categories */}
              <div className="space-y-4 mb-6 flex-1">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1.5">
                    Fix-and-Flip Investors
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Looking to buy their first or 100th home to rehab, flip for profit, and build a thriving business.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1.5">
                    Landlords
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Seeking rental properties to rehab and hold, building long-term wealth and expanding their rental portfolio.
                  </p>
                </div>
              </div>

              {/* Buy Button */}
              <Link
                href="/marketplace"
                className="block w-full bg-slate-900 text-white px-6 py-3 text-center text-sm font-semibold transition-all hover:bg-slate-800 mt-auto"
              >
                Buy
              </Link>
            </div>

            {/* Sellers Column */}
            <div className="border-2 border-slate-300 p-6 lg:p-8 hover:border-slate-900 transition-all flex flex-col">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-5">
                Sellers
              </h2>
              
              {/* Sellers Image */}
              <div className="relative w-full h-48 sm:h-56 lg:h-64 mb-6 bg-slate-50">
                <Image
                  src="/assets/image 145.png"
                  alt="Sellers"
                  fill
                  className="object-contain"
                />
              </div>

              {/* Sellers Categories */}
              <div className="space-y-4 mb-6 flex-1">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1.5">
                    Wholesalers
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Who need a reliable buyer to move deals quickly.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1.5">
                    Homeowners
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    List your property directly to the marketplace and access thousands of active investors.
                  </p>
                </div>
              </div>

              {/* Sell Button */}
              <Link
                href="/join-seller"
                className="block w-full bg-slate-900 text-white px-6 py-3 text-center text-sm font-semibold transition-all hover:bg-slate-800 mt-auto"
              >
                Sell
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Investor Types Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="text-center mb-20 animate-fade-in">
            <h2 className="text-5xl font-normal text-slate-900 mb-5">
              Perfect For All Investors
            </h2>
            <p className="text-xl text-slate-600">
              Whether you're a wholesaler, fix-and-flipper, or buy-and-hold investor
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Fix & Flippers */}
            <div className="bg-white p-8 rounded-lg hover:shadow-xl transition-all duration-300 shadow-md group opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
              <div className="mb-6">
                <h3 className="text-2xl font-normal text-slate-900 group-hover:text-slate-700 transition-colors">
                  Fix & Flippers
                </h3>
              </div>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start">
                  <span>Find distressed properties with high ARV</span>
                </li>
                <li className="flex items-start">
                  <span>Analyze deals with built-in calculators</span>
                </li>
                <li className="flex items-start">
                  <span>Access contractor networks in your area</span>
                </li>
              </ul>
            </div>

            {/* Buy & Hold */}
            <div className="bg-white p-8 rounded-lg hover:shadow-xl transition-all duration-300 shadow-md group opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
              <div className="mb-6">
                <h3 className="text-2xl font-normal text-slate-900 group-hover:text-slate-700 transition-colors">
                  Buy & Hold
                </h3>
              </div>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start">
                  <span>Find cash-flowing rental properties</span>
                </li>
                <li className="flex items-start">
                  <span>View detailed rental income projections</span>
                </li>
                <li className="flex items-start">
                  <span>Build a diversified portfolio nationwide</span>
                </li>
              </ul>
            </div>

            {/* Wholesalers */}
            <div className="bg-white p-8 rounded-lg hover:shadow-xl transition-all duration-300 shadow-md group opacity-0 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
              <div className="mb-6">
                <h3 className="text-2xl font-normal text-slate-900 group-hover:text-slate-700 transition-colors">
                  Wholesalers
                </h3>
              </div>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start">
                  <span>List unlimited deals to serious buyers</span>
                </li>
                <li className="flex items-start">
                  <span>Build your buyer's list automatically</span>
                </li>
                <li className="flex items-start">
                  <span>Close deals faster with verified investors</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10 text-center">
          <h2 className="text-5xl font-normal text-slate-900 mb-6">
            Ready to Start Finding Better Deals?
          </h2>
          <p className="text-xl text-slate-600 mb-10">
            Join the investors community using Deelmap to grow their real estate portfolio
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/marketplace"
              className="bg-slate-900 text-white px-10 py-5 text-base font-semibold transition-all hover:bg-slate-800 text-center"
            >
              Start Buying
            </Link>
            <Link
              href="/join-seller"
              className="bg-white border-2 border-slate-900 text-slate-900 px-10 py-5 text-base font-semibold transition-all hover:bg-slate-50 text-center"
            >
              Start Selling
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* Registration Modal */}
      <RegistrationModal
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
        initialStep="signup"
      />
    </div>
  )
}
