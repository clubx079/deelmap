import Link from 'next/link'

const PLATFORM = [
  { label: 'Buy', href: '/marketplace' },
  { label: 'Sell', href: '/join-seller' },
  { label: 'Finance', href: '/financing' },
]

const COMPANY = [
  { label: 'About us', href: '/our-story' },
  { label: 'How it works', href: '/our-story' },
  { label: 'Contact', href: '/contact' },
  { label: 'Blog', href: '/resources' },
]

const RESOURCES = [
  { label: 'Help center', href: '/contact' },
]

const LEGAL = [
  { label: 'Privacy policy', href: '/privacy-policy' },
  { label: 'Terms of service', href: '/terms-of-use' },
  { label: 'Cookie policy', href: '/privacy-policy' },
  { label: 'Disclaimer', href: '/terms-of-use' },
]

export function Footer() {
  return (
    <footer>
      {/* CTA Section */}
      <div className="bg-[#1A1816] relative overflow-hidden">
        {/* Decorative circle */}
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/[0.04] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
            {/* Left */}
            <div className="max-w-lg">
              <p className="text-[11px] font-semibold text-[#737370] uppercase tracking-[2px] mb-4">GET STARTED TODAY</p>
              <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
                Find and close better<br />real estate deals
              </h2>
              <p className="text-[#737370] text-[15px] leading-relaxed">
                Join thousands of investors already using DeelMap to source, analyze, and close off-market deals across the United States.
              </p>
            </div>

            {/* Right – Buttons */}
            <div className="flex flex-col gap-3 lg:min-w-[260px]">
              <Link
                href="/marketplace"
                className="flex items-center justify-center gap-2 h-14 bg-[#D03839] hover:bg-[#E0493B] active:bg-[#C73022] text-white font-semibold text-[16px] rounded transition-colors"
              >
                Start finding deals →
              </Link>
              <Link
                href="/join-seller"
                className="flex items-center justify-center h-14 border border-[#444441] text-white hover:border-[#737370] font-medium text-[15px] rounded transition-colors"
              >
                List a property
              </Link>
              <p className="text-[12px] text-[#737370] text-center">No credit card required · Free to browse</p>
            </div>
          </div>
        </div>
      </div>

      {/* Links Section */}
      <div className="bg-[#111111]">
        <div className="w-full px-6 lg:px-10 py-12 lg:py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">

            {/* Brand */}
            <div className="lg:col-span-1">
              {/* Logo mark */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#D03839] rounded flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5c-1.381 0-2.5-1.119-2.5-2.5S10.619 6.5 12 6.5s2.5 1.119 2.5 2.5S13.381 11.5 12 11.5z"/>
                  </svg>
                </div>
                <span className="text-white font-bold text-[18px]">DeelMap</span>
              </div>
              <p className="text-[13px] text-[#737370] leading-relaxed mb-6">
                The trusted marketplace for verified off-market real estate deals across the United States.
              </p>

              {/* Social Icons */}
              <div className="flex items-center gap-2">
                {/* X / Twitter */}
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 border border-[#333333] rounded flex items-center justify-center text-[#737370] hover:text-white hover:border-[#555555] transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                {/* Instagram */}
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 border border-[#333333] rounded flex items-center justify-center text-[#737370] hover:text-white hover:border-[#555555] transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                {/* Phone */}
                <a href="tel:+18887808093"
                  className="w-9 h-9 border border-[#333333] rounded flex items-center justify-center text-[#737370] hover:text-white hover:border-[#555555] transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                </a>
                {/* LinkedIn */}
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 border border-[#333333] rounded flex items-center justify-center text-[#737370] hover:text-white hover:border-[#555555] transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-[11px] font-semibold text-white uppercase tracking-[1.5px] mb-5">PLATFORM</h4>
              <ul className="space-y-3">
                {PLATFORM.map(l => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[14px] text-[#737370] hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[11px] font-semibold text-white uppercase tracking-[1.5px] mb-5">COMPANY</h4>
              <ul className="space-y-3">
                {COMPANY.map(l => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[14px] text-[#737370] hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-[11px] font-semibold text-white uppercase tracking-[1.5px] mb-5">RESOURCES</h4>
              <ul className="space-y-3">
                {RESOURCES.map(l => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[14px] text-[#737370] hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[11px] font-semibold text-white uppercase tracking-[1.5px] mb-5">LEGAL</h4>
              <ul className="space-y-3">
                {LEGAL.map(l => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[14px] text-[#737370] hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#222222]">
          <div className="w-full px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[13px] text-[#555555]">© 2026 DeelMap. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <Link href="/privacy-policy" className="text-[13px] text-[#555555] hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms-of-use" className="text-[13px] text-[#555555] hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy-policy" className="text-[13px] text-[#555555] hover:text-white transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
