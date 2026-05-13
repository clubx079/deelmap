import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { FileText, PenLine, ShieldCheck, Clock } from 'lucide-react'

export const metadata = {
  title: 'Contracts | DeelMap',
  description: 'Digital contracts and e-signatures for wholesale real estate deals on DeelMap.',
}

const FEATURES = [
  {
    icon: FileText,
    title: 'Contract templates',
    description: 'Pre-built wholesale assignment contracts, purchase agreements, and JV agreements — ready to send in seconds without drafting from scratch.',
  },
  {
    icon: PenLine,
    title: 'E-signatures',
    description: 'Send contracts for digital signature directly through DeelMap. Both parties sign electronically — no printing, scanning, or back-and-forth email chains.',
  },
  {
    icon: ShieldCheck,
    title: 'Legally binding documents',
    description: 'All signed contracts are stored securely and are legally binding. Every document is timestamped, tracked, and accessible from your dashboard.',
  },
  {
    icon: Clock,
    title: 'Deal status tracking',
    description: 'See exactly where each deal stands — draft, sent, signed, or closed. Track every contract tied to your active listings in one place.',
  },
]

export default function ContractsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-16 pb-12 lg:pt-20 lg:pb-16 bg-white">
        <div className="max-w-[720px] mx-auto px-6 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 h-8 px-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            <span className="text-[12px] font-semibold text-[#16A34A] uppercase tracking-[1.5px]">Now Live</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1816] leading-tight mb-6">
            Contracts on DeelMap
          </h1>
          <p className="text-[16px] text-[#444441] leading-relaxed mb-8">
            Sign and manage your wholesale deal contracts without leaving the platform. Powered by DocuSeal — secure, legally binding, and built for real estate.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/buyer/contracts"
              className="h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors flex items-center"
            >
              View My Contracts
            </Link>
            <Link
              href="/marketplace"
              className="h-12 px-8 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] font-medium rounded transition-colors flex items-center"
            >
              Browse Deals
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3 text-center">HOW IT WORKS</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-3 text-center">Close deals without leaving DeelMap</h2>
          <p className="text-[15px] text-[#444441] text-center mb-10 max-w-[580px] mx-auto">
            Find a deal, agree on terms, and sign the contract — all in one place.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="bg-white border border-[#E8E8E4] rounded p-6">
                  <div className="w-10 h-10 bg-[#D03839]/10 rounded flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-[#D03839]" />
                  </div>
                  <h3 className="text-[17px] font-bold text-[#1A1816] mb-2">{feature.title}</h3>
                  <p className="text-[14px] text-[#444441] leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-[680px] mx-auto px-6">
          <div className="bg-[#1A1816] rounded p-8 sm:p-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Ready to sign your first deal?
            </h2>
            <p className="text-[15px] text-[#737370] leading-relaxed mb-6">
              Sign in to your buyer account to view and sign contracts sent to you by sellers.
            </p>
            <Link
              href="/buyer/contracts"
              className="inline-flex items-center h-11 px-7 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors text-[14px]"
            >
              Go to My Contracts
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
