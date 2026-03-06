'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { RegistrationModal } from '@/components/RegistrationModal'

export function Navbar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [showAuth, setShowAuth] = useState(false)
  const [authInitialStep, setAuthInitialStep] = useState('signup')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [showAboutDropdown, setShowAboutDropdown] = useState(false)

  const aboutButtonRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close dropdown when clicking outside or route changes
  useEffect(() => {
    setShowAboutDropdown(false)
  }, [pathname])

  useEffect(() => {
    if (showAboutDropdown) {
      const handleClickOutside = (e) => {
        if (
          aboutButtonRef.current &&
          !aboutButtonRef.current.contains(e.target) &&
          !e.target.closest('.about-dropdown-menu')
        ) {
          setShowAboutDropdown(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAboutDropdown])

  const getUserInitials = (user) => {
    if (user?.first_name && user?.last_name) {
      return (user.first_name[0] + user.last_name[0]).toUpperCase()
    }
    else if (user?.user_metadata?.name) {
      const nameParts = user.user_metadata.name.trim().split(' ')
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      } else {
        return nameParts[0][0].toUpperCase()
      }
    }
    else if (user?.first_name) {
      return user.first_name[0].toUpperCase()
    }
    else if (user?.last_name) {
      return user.last_name[0].toUpperCase()
    }
    else if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  const getUserDisplayName = (user) => {
    if (user?.first_name || user?.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }
    else if (user?.user_metadata?.name) {
      return user.user_metadata.name
    }
    else if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'User'
  }

  const aboutDropdownItems = [
    { label: 'Our Story', href: '/our-story' },
    { label: 'Partnerships', href: '/partnerships' },
    { label: 'Reviews', href: '/reviews' },
    { label: 'Leadership', href: '/leadership' }
  ]

  const navItems = [
    { label: 'Buy', href: '/marketplace' },
    { label: 'Sell', href: '/join-seller' },
    { label: 'Finance', href: '/financing' },
    { label: 'About Us', href: '/about', hasDropdown: true }
  ]

  const isActive = (href) => {
    if (href === '/marketplace') return pathname === '/marketplace'
    if (href === '/join-seller') return pathname === '/join-seller'
    if (href === '/financing') return pathname === '/financing'
    if (href === '/about' || href === '/our-story' || href === '/partnerships' || href === '/reviews' || href === '/leadership') {
      return pathname === href || pathname.startsWith('/our-story') || pathname.startsWith('/partnerships') || pathname.startsWith('/reviews') || pathname.startsWith('/leadership')
    }
    return false
  }

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-[60] bg-white transition-all duration-300 ${
          isScrolled 
            ? 'shadow-sm border-b-2 border-slate-200' 
            : 'border-b-2 border-slate-300'
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo - Left */}
          <div className="flex items-center flex-shrink-0">
              <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
                <Image
                  src="/assets/logo copy.png"
                  alt="Deelmap"
                  width={140}
                  height={45}
                  className="h-10 w-auto"
                  priority
                />
              </Link>
          </div>

            {/* Navigation Items - Center (Natural Flexbox Centering) */}
            <div className="hidden md:flex items-center justify-center flex-1 space-x-0">
              {navItems.map((item) => {
                const active = isActive(item.href)
                
                if (item.hasDropdown) {
                  return (
                    <div key={item.label} className="relative" ref={item.label === 'About Us' ? aboutButtonRef : null}>
                      <button
                        onClick={() => setShowAboutDropdown(!showAboutDropdown)}
                        className={`
                          relative px-6 py-3 text-sm font-medium transition-all duration-200 rounded-lg flex items-center gap-1
                          ${active 
                            ? 'text-slate-900 font-semibold bg-slate-200' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }
                        `}
                      >
                        <span className="relative z-10">{item.label}</span>
                        <svg 
                          className={`w-4 h-4 transition-transform ${showAboutDropdown ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {showAboutDropdown && typeof window !== 'undefined' && createPortal(
                        <div 
                          className="fixed bg-white rounded-lg shadow-2xl border border-slate-200 py-2 about-dropdown-menu"
                          style={{
                            top: aboutButtonRef.current 
                              ? aboutButtonRef.current.getBoundingClientRect().bottom + 8 
                              : '80px',
                            left: aboutButtonRef.current 
                              ? aboutButtonRef.current.getBoundingClientRect().left 
                              : '50%',
                            width: '192px',
                            zIndex: 99999,
                            position: 'fixed'
                          }}
                        >
                          {aboutDropdownItems.map((dropdownItem) => (
                            <Link
                              key={dropdownItem.href}
                              href={dropdownItem.href}
                              onClick={() => setShowAboutDropdown(false)}
                              className={`
                                block px-4 py-2 text-sm transition-colors
                                ${isActive(dropdownItem.href)
                                  ? 'text-slate-900 font-semibold bg-slate-100'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }
                              `}
                            >
                              {dropdownItem.label}
                            </Link>
                          ))}
                        </div>,
                        document.body
                      )}
                    </div>
                  )
                }
                
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`
                      relative px-6 py-3 text-sm font-medium transition-all duration-200 rounded-lg
                      ${active 
                        ? 'text-slate-900 font-semibold bg-slate-200' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }
                    `}
                  >
                    <span className="relative z-10">{item.label}</span>
                    {!active && (
                      <span 
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 transition-all duration-200 origin-center scale-x-0 hover:scale-x-100"
                      />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* User Profile / Login - Right */}
            <div className="flex items-center space-x-6">
              {user ? (
                <Link
                  href="/buyer/dashboard"
                  className="flex items-center space-x-3 group relative"
                >
                  <span className="hidden lg:inline-block text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors duration-200">
                    {getUserDisplayName(user)}
                  </span>
                  <div className="relative">
                    {/* User avatar: slate base, red ring on hover (professional, no purple) */}
                    <div className="relative w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white text-sm font-semibold transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg cursor-pointer ring-2 ring-slate-200 group-hover:ring-red-600">
                      {getUserInitials(user)}
                      {/* Shine on hover */}
                      <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className={`relative px-6 py-3 text-sm font-medium transition-all duration-200 rounded-lg ${
                    pathname === '/login'
                      ? 'text-slate-900 font-semibold bg-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="relative z-10">Login</span>
                  {pathname !== '/login' && (
                    <span 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 transition-all duration-200 origin-center scale-x-0 hover:scale-x-100"
                    />
                  )}
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(true)}
                className="md:hidden p-2 text-slate-700 hover:text-slate-900 transition-colors"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-[9999] md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setShowMobileMenu(false)} 
          />
          
          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl border-l-2 border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b-2 border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Menu</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Menu Items */}
            <div className="p-6 space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.href)
                
                if (item.hasDropdown) {
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className={`
                        block py-4 px-4 text-base font-medium transition-colors rounded-lg
                        ${active 
                          ? 'text-slate-900 font-semibold bg-slate-200' 
                          : 'text-slate-600'
                        }
                      `}>
                        {item.label}
                      </div>
                      <div className="pl-4 space-y-1">
                        {aboutDropdownItems.map((dropdownItem) => (
                          <Link
                            key={dropdownItem.href}
                            href={dropdownItem.href}
                            onClick={() => setShowMobileMenu(false)}
                            className={`
                              block py-3 px-4 text-sm transition-colors rounded-lg
                              ${isActive(dropdownItem.href)
                                ? 'text-slate-900 font-semibold bg-slate-100'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                              }
                            `}
                          >
                            {dropdownItem.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                }
                
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`
                      block py-4 px-4 text-base font-medium transition-colors rounded-lg
                      ${active 
                        ? 'text-slate-900 font-semibold bg-slate-200' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
            
            {/* User Section */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t-2 border-slate-200 bg-white">
              {user ? (
                <Link
                  href="/buyer/dashboard"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 p-4 rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-lg">
                    {getUserInitials(user)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {getUserDisplayName(user)}
                    </div>
                    <div className="text-xs text-white/70 truncate">
                      Go to Buyer Portal →
                    </div>
                  </div>
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setShowMobileMenu(false)}
                  className={`block w-full text-center py-3 px-4 transition-colors font-medium rounded-lg ${
                    pathname === '/login'
                      ? 'text-slate-900 bg-slate-200'
                      : 'text-slate-900 hover:text-slate-700 border-2 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <RegistrationModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        initialStep={authInitialStep}
      />
    </>
  )
}
