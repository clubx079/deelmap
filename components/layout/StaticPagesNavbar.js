'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { StaticPagesMobileNav } from './StaticPagesMobileNav'

export function StaticPagesNavbar({ currentPage = 'home' }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const menuItems = [
    { label: 'Home', href: '/', page: 'home' },
    { label: 'About Us', href: '/about', page: 'about' },
    { label: 'Cash Offer', href: '/cashoffer', page: 'cashoffer' },
    { label: 'MarketPlace', href: '/marketplace', page: 'marketplace' },
    { label: 'Finance', href: '/financing', page: 'financing', hasNew: true},
    { label: 'Contact Us', href: '/contact', page: 'contact' }
  ]

  return (
    <>
      <nav className="bg-[#022b41] text-white shadow-lg w-full relative z-30">
        <div className="flex items-center justify-between h-24 px-6">
          {/* LEFT: Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/assets/ablemanlogo.png"
                alt="Ableman"
                width={200}
                height={65}
                className="h-16 w-auto"
                priority
              />
            </Link>
          </div>

          {/* RIGHT: Menu + CTA Button */}
          <div className="flex items-center space-x-6">
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-2">
              {menuItems.map((item) => (
                <div key={item.label} className="relative">
                  <Link
                    href={item.href}
                    target={item.external ? '_blank' : '_self'}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    className={`relative px-5 py-3 text-sm font-medium transition-colors duration-200 rounded-lg ${
                      currentPage === item.page
                        ? 'text-[#b29578] bg-white/10'
                        : 'text-white hover:text-[#b29578] hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </Link>
                  {item.hasNew && (
                    <span className="absolute -top-3 right-1/2 translate-x-1/2 bg-[#b29578] text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold shadow-sm">
                      NEW
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop CTA Button */}
            <div className="hidden md:flex items-center space-x-4">
              <a
                href="https://forms.monday.com/forms/160d7a7c32a951f6ab92b8812e440dc3?r=use1"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#b29578] hover:bg-[#9a7e61] text-white px-7 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg text-sm"
              >
                Join Our Buyer's List
              </a>
            </div>

            {/* Mobile Hamburger Menu */}
            <div className="md:hidden">
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 text-white hover:text-[#b29578] hover:bg-white/10 rounded-lg transition-colors"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <StaticPagesMobileNav
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        menuItems={menuItems}
        currentPage={currentPage}
      />
    </>
  )
}