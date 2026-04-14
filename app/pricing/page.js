'use client'
import { useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const CheckIcon = ({ filled }) => (
  <span
    className={`flex-shrink-0 mt-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
      filled
        ? 'bg-[#1A1816] border-[#1A1816]'
        : 'border-[#E8E8E4]'
    }`}
  >
    {filled && (
      <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
        <path d="M1 2.5L2.8 4.2L6 1" stroke="#FAFAF8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </span>
)

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 pb-20">

          {/* Hero */}
          <div className="text-center pt-16 pb-10">
            <h1 className="text-4xl sm:text-5xl font-bold text-[#1A1816] leading-tight mb-4">
              Simple, transparent{' '}
              <span className="text-[#D03839]">pricing</span>
            </h1>
            <p className="text-[16px] text-[#444441] leading-relaxed">
              List a single deal or run your entire pipeline. No hidden fees.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex flex-col items-center gap-2.5 mb-10">
            <div className="flex items-center gap-3">
              <span className={`text-sm transition-colors ${!annual ? 'text-[#1A1816] font-medium' : 'text-[#737370]'}`}>
                Monthly
              </span>
              <button
                onClick={() => setAnnual(v => !v)}
                aria-label="Toggle billing period"
                className={`relative w-10 h-[22px] rounded-full flex-shrink-0 transition-colors cursor-pointer border-none ${
                  annual ? 'bg-[#D03839]' : 'bg-[#1A1816]'
                }`}
              >
                <span
                  className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-[#FAFAF8] transition-transform ${
                    annual ? 'translate-x-[18px]' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-sm transition-colors ${annual ? 'text-[#1A1816] font-medium' : 'text-[#737370]'}`}>
                Annual
              </span>
            </div>
            <span className="text-[11px] font-semibold bg-[#E4F5EC] text-[#0F6E56] px-2.5 py-0.5 rounded-full">
              Save 20% on annual subscription
            </span>
          </div>

          {/* Tier Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">

            {/* Standard */}
            <div className="bg-white border border-[#E8E8E4] rounded p-5 flex flex-col">
              <div className="min-h-[24px] mb-2.5" />
              <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-1">One-time</p>
              <h2 className="text-2xl font-bold text-[#1A1816] tracking-tight mb-1">Standard</h2>
              <p className="text-xs text-[#737370] leading-relaxed mb-4 min-h-[2.4rem]">
                List a single property. No subscription required.
              </p>
              <div className="text-[38px] font-bold text-[#1A1816] leading-none tracking-tight mb-1">
                <sup className="text-lg font-normal align-super">$</sup>29
              </div>
              <p className="text-xs text-[#737370] mb-1">per listing · stays live</p>
              <p className="text-[11px] text-[#A8A8A4] mb-5 min-h-[1rem]">&nbsp;</p>
              <a
                href={`${process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || 'https://sellerportaldeelmap-production-bea8.up.railway.app'}/onboarding?plan=standard`}
                className="block w-full py-2.5 text-center text-xs font-semibold tracking-[0.05em] uppercase border border-[#D4D4CF] text-[#1A1816] rounded hover:bg-[#F3F3F0] transition-colors mb-5"
              >
                Post a listing
              </a>
              <hr className="border-t border-[#E8E8E4] mb-4" />
              <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-2.5">Includes</p>
              <ul className="flex flex-col gap-1.5">
                {[
                  [true, 'Basic seller dashboard'],
                  [true, 'Buyer inquiry inbox'],
                  [true, 'Photo uploads'],
                  [true, 'Basic analytics'],
                  [true, 'Standard support'],
                  [false, 'Verified seller badge'],
                  [false, 'Priority search placement'],
                  [false, 'CRM features'],
                ].map(([on, label], i) => (
                  <li key={i} className={`flex items-start gap-2 text-xs leading-snug ${on ? 'text-[#1A1816]' : 'text-[#A8A8A4]'}`}>
                    <CheckIcon filled={on} />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro Seller — featured */}
            <div className="bg-white border-2 border-[#D03839] rounded p-5 flex flex-col">
              <div className="min-h-[24px] mb-2.5">
                <span className="inline-block text-[11px] font-semibold bg-[#FEF0EF] text-[#D03839] px-2.5 py-0.5 rounded">
                  Most popular
                </span>
              </div>
              <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-1">Subscription</p>
              <h2 className="text-2xl font-bold text-[#1A1816] tracking-tight mb-1">Pro seller</h2>
              <p className="text-xs text-[#737370] leading-relaxed mb-4 min-h-[2.4rem]">
                For active investors and wholesalers moving deals consistently.
              </p>
              <div className="text-[38px] font-bold text-[#1A1816] leading-none tracking-tight mb-1">
                <sup className="text-lg font-normal align-super">$</sup>
                {annual ? '948' : '99'}
              </div>
              <p className="text-xs text-[#737370] mb-1">{annual ? 'per year · billed annually' : 'per month'} · 10 listings included</p>
              <p className="text-[11px] text-[#A8A8A4] mb-5 min-h-[1rem]">{annual ? 'Save $240 vs monthly · $79/mo' : '$19 per additional listing'}</p>
              <a
                href={`${process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || 'https://sellerportaldeelmap-production-bea8.up.railway.app'}/onboarding?plan=pro&billing=monthly`}
                className="block w-full py-2.5 text-center text-xs font-semibold tracking-[0.05em] uppercase bg-[#D03839] text-white rounded hover:bg-[#E0493B] active:bg-[#C73022] transition-colors mb-5"
              >
                Start free 7-day trial
              </a>
              <hr className="border-t border-[#E8E8E4] mb-4" />
              <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-2.5">Includes</p>
              <ul className="flex flex-col gap-1.5">
                {[
                  [true, 'Verified seller badge'],
                  [true, 'Advanced seller dashboard'],
                  [true, 'Advanced analytics'],
                  [true, 'Priority search placement'],
                  [true, 'Priority support'],
                  [true, '10 listings / month'],
                  [false, 'CRM features'],
                  [false, 'Team accounts'],
                ].map(([on, label], i) => (
                  <li key={i} className={`flex items-start gap-2 text-xs leading-snug ${on ? 'text-[#1A1816]' : 'text-[#A8A8A4]'}`}>
                    <CheckIcon filled={on} />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Enterprise */}
            <div className="bg-white border border-[#E8E8E4] rounded p-5 flex flex-col">
              <div className="min-h-[24px] mb-2.5" />
              <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-1">Subscription</p>
              <h2 className="text-2xl font-bold text-[#1A1816] tracking-tight mb-1">Enterprise</h2>
              <p className="text-xs text-[#737370] leading-relaxed mb-4 min-h-[2.4rem]">
                For acquisition teams running high-volume pipelines.
              </p>
              <div className="text-[38px] font-bold text-[#1A1816] leading-none tracking-tight mb-1">
                <sup className="text-lg font-normal align-super">$</sup>
                {annual ? '2,868' : '299'}
              </div>
              <p className="text-xs text-[#737370] mb-1">{annual ? 'per year · billed annually' : 'per month'} · unlimited listings</p>
              <p className="text-[11px] text-[#A8A8A4] mb-5 min-h-[1rem]">{annual ? 'Save $720 vs monthly · $239/mo' : <>&nbsp;</>}</p>
              <a
                href={`${process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || 'https://sellerportaldeelmap-production-bea8.up.railway.app'}/onboarding?plan=enterprise`}
                className="block w-full py-2.5 text-center text-xs font-semibold tracking-[0.05em] uppercase border border-[#D4D4CF] text-[#1A1816] rounded hover:bg-[#F3F3F0] transition-colors mb-5"
              >
                Talk to sales
              </a>
              <hr className="border-t border-[#E8E8E4] mb-4" />
              <p className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-2.5">Includes</p>
              <ul className="flex flex-col gap-1.5">
                {[
                  [true, 'Everything in Pro'],
                  [true, 'Unlimited listings'],
                  [true, 'Basic CRM features'],
                  [true, 'Lead management tools'],
                  [true, 'Team accounts'],
                  [true, 'Custom branding'],
                  [true, 'Dedicated account support'],
                  [true, <>API access <span className="text-[10px] text-[#A8A8A4] ml-0.5">· soon</span></>],
                ].map(([on, label], i) => (
                  <li key={i} className={`flex items-start gap-2 text-xs leading-snug ${on ? 'text-[#1A1816]' : 'text-[#A8A8A4]'}`}>
                    <CheckIcon filled={on} />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Add-ons */}
          <div className="mb-6">
            <h2 className="text-[28px] font-bold text-[#1A1816] tracking-tight mb-1.5">Listing enhancements</h2>
            <p className="text-[15px] text-[#737370]">Available on any tier. Purchased per listing at checkout.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-14">

            <div className="bg-[#F3F3F0] border border-[#E8E8E4] rounded p-5 flex flex-col">
              <p className="text-[10px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-3">Visibility</p>
              <p className="text-base font-semibold text-[#1A1816] mb-2 leading-snug">Highlighted listing</p>
              <p className="text-[13px] text-[#737370] leading-relaxed mb-4 flex-1">
                Gold-bordered card in search results for 7 days.
              </p>
              <div className="mt-auto">
                <p className="text-[28px] font-bold text-[#1A1816] tracking-tight leading-none mb-1">$9.99</p>
                <p className="text-xs text-[#A8A8A4] mb-3">One-time · 7-day window</p>
                <span className="inline-block text-[11px] font-semibold bg-white border border-[#E8E8E4] text-[#737370] px-3 py-1 rounded-full">
                  Flat fee
                </span>
              </div>
            </div>

            <div className="bg-[#F3F3F0] border border-[#E8E8E4] rounded p-5 flex flex-col">
              <p className="text-[10px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-3">Placement</p>
              <p className="text-base font-semibold text-[#1A1816] mb-2 leading-snug">Homepage feature</p>
              <p className="text-[13px] text-[#737370] leading-relaxed mb-4 flex-1">
                Rotates in the featured deals section on the homepage. Max 7-day booking.
              </p>
              <div className="mt-auto">
                <p className="text-[28px] font-bold text-[#1A1816] tracking-tight leading-none mb-1">$29</p>
                <p className="text-xs text-[#A8A8A4] mb-3">Per day · billed at checkout</p>
                <span className="inline-block text-[11px] font-semibold bg-[#FEF3E2] text-[#B5620A] px-3 py-1 rounded-full">
                  Daily rate
                </span>
              </div>
            </div>

            <div className="bg-[#F3F3F0] border border-[#E8E8E4] rounded p-5 flex flex-col">
              <p className="text-[10px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-3">Ranking</p>
              <p className="text-base font-semibold text-[#1A1816] mb-2 leading-snug">Boost listing</p>
              <p className="text-[13px] text-[#737370] leading-relaxed mb-4 flex-1">
                Pushed to top of search results for 7 days, then decays organically.
              </p>
              <div className="mt-auto">
                <p className="text-[28px] font-bold text-[#1A1816] tracking-tight leading-none mb-1">$14.99</p>
                <p className="text-xs text-[#A8A8A4] mb-3">Per boost · 7-day window</p>
                <span className="inline-block text-[11px] font-semibold bg-[#FEF3E2] text-[#B5620A] px-3 py-1 rounded-full">
                  7-day boost
                </span>
              </div>
            </div>

            <div className="bg-[#F3F3F0] border border-[#E8E8E4] rounded p-5 flex flex-col">
              <p className="text-[10px] font-semibold tracking-[0.09em] uppercase text-[#A8A8A4] mb-3">Bundle</p>
              <p className="text-base font-semibold text-[#1A1816] mb-2 leading-snug">Highlight + Boost</p>
              <p className="text-[13px] text-[#737370] leading-relaxed mb-4 flex-1">
                Full 30-day highlight plus a 7-day boost to top of search. Best value.
              </p>
              <div className="mt-auto">
                <p className="text-[28px] font-bold text-[#1A1816] tracking-tight leading-none mb-1">$22</p>
                <p className="text-xs text-[#A8A8A4] mb-3">One-time · saves $2.98</p>
                <span className="inline-block text-[11px] font-semibold bg-[#E4F5EC] text-[#0F6E56] px-3 py-1 rounded-full">
                  Best value
                </span>
              </div>
            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
