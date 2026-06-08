'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { resolveInboxConversationId } from '@/lib/conversationId'
import { RegistrationModal } from '@/components/RegistrationModal'

export function Navbar() {
  const { user, signOut, displayName, profileExtras } = useAuth()
  const pathname = usePathname()
  const [showAuth, setShowAuth] = useState(false)
  const [authInitialStep, setAuthInitialStep] = useState('login')
  const [authDefaultRole, setAuthDefaultRole] = useState('buyer')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showMobileMore, setShowMobileMore] = useState(false)
  const [showAboutDropdown, setShowAboutDropdown] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifUnread, setNotifUnread] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])

  const aboutButtonRef = useRef(null)
  const notifBellRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)

  const isHome = pathname === '/'

  useEffect(() => {
    if (!isHome) return
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  // Fetch unread message count
  useEffect(() => {
    if (!user?.id) { setUnreadCount(0); return }
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/buyer/unread-count', { headers: { 'x-user-id': user.id } })
        if (res.ok) { const data = await res.json(); setUnreadCount(data.count || 0) }
      } catch {}
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [user?.id])

  // Fetch notifications
  useEffect(() => {
    if (!user?.id) { setNotifUnread(0); setNotifications([]); return }
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/buyer/notifications', { headers: { Authorization: `Bearer ${user.id}` } })
        if (res.ok) {
          const data = await res.json()
          setNotifUnread(data.unreadCount || 0)
          setNotifications(data.notifications || [])
        }
      } catch {}
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [user?.id])

  // Close notif dropdowns on outside click
  useEffect(() => {
    if (!notifOpen) return
    const handler = (e) => {
      if (notifOpen && notifBellRef.current && !notifBellRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  // Body scroll lock when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = showMobileMenu ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showMobileMenu])

  // Close dropdowns on route change
  useEffect(() => { setShowAboutDropdown(false); setShowMobileMore(false) }, [pathname])

  // Close about dropdown on outside click
  useEffect(() => {
    if (!showAboutDropdown) return
    const handler = (e) => {
      if (aboutButtonRef.current && !aboutButtonRef.current.contains(e.target) && !e.target.closest('.about-dropdown-menu')) {
        setShowAboutDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAboutDropdown])

  // Listen for auth modal trigger from PropertyCard
  useEffect(() => {
    const handleShowAuth = (event) => {
      setAuthInitialStep(event.detail?.step || 'login')
      setAuthDefaultRole(event.detail?.role || 'buyer')
      setShowAuth(true)
    }
    window.addEventListener('showAuth', handleShowAuth)
    return () => window.removeEventListener('showAuth', handleShowAuth)
  }, [])

  const getUserInitials = (user) => {
    if (profileExtras.is_anonymous) {
      return profileExtras.nickname ? profileExtras.nickname[0].toUpperCase() : '?'
    }
    if (user?.first_name && user?.last_name) return (user.first_name[0] + user.last_name[0]).toUpperCase()
    if (user?.user_metadata?.name) {
      const parts = user.user_metadata.name.trim().split(' ')
      return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0][0].toUpperCase()
    }
    if (user?.first_name) return user.first_name[0].toUpperCase()
    if (user?.email) return user.email[0].toUpperCase()
    return 'U'
  }

  const getUserDisplayName = () => displayName

  const aboutDropdownItems = [
    { label: 'About Us', href: '/our-story' },
    { label: 'Resources', href: '/resources' },
    { label: 'Advertise with us', href: '/advertise' },
    { label: 'Contact Us', href: '/contact' },
  ]

  const navItems = [
    { label: 'Buy', href: '/marketplace' },
    { label: 'Sell', href: '/join-seller' },
    { label: 'Finance', href: '/financing' },
    { label: 'Community', href: '/community' },
    { label: 'More', href: '/our-story', hasDropdown: true },
  ]

  const isActive = (href) => {
    if (href === '/marketplace') return pathname === '/marketplace'
    if (href === '/join-seller') return pathname === '/join-seller'
    if (href === '/financing') return pathname === '/financing'
    if (href === '/community') return pathname === '/community' || pathname.startsWith('/community/')
    if (href === '/our-story') return pathname === '/our-story' || pathname === '/contact' || pathname === '/resources' || pathname.startsWith('/resources/') || pathname === '/advertise'
    return false
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[60] transition-all duration-300 bg-white border-b border-[#E8E8E4]">
        <div className="w-full pl-2 pr-4 md:pl-[45px] md:pr-[85px]">
          <div className="flex items-center justify-between h-[80px]">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-90 transition-opacity">
              <img src="/assets/logo.svg" alt="DeelMap" className="h-[46px] w-auto md:h-[68px] md:w-[190px]" />
            </Link>

            {/* Nav links – center */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.href)
                if (item.hasDropdown) {
                  return (
                    <div key={item.label} className="relative" ref={aboutButtonRef}>
                      <button
                        onClick={() => setShowAboutDropdown(!showAboutDropdown)}
                        className={`flex items-center gap-1 px-4 pt-2 pb-0.5 text-[17px] transition-colors ${active ? 'font-semibold text-[#1A1816] border-b-2 border-[#1A1816]' : 'font-medium text-[#444441] hover:text-[#1A1816]'}`}
                      >
                        {item.label}
                        {/* Filled triangle arrow */}
                        <svg
                          className={`w-2.5 h-2.5 transition-transform flex-shrink-0 ${showAboutDropdown ? 'rotate-180' : ''}`}
                          viewBox="0 0 10 6" fill="currentColor"
                        >
                          <path d="M0 0l5 6 5-6z" />
                        </svg>
                      </button>

                      {showAboutDropdown && typeof window !== 'undefined' && createPortal(
                        <div
                          className="fixed bg-white rounded shadow-lg border border-[#E8E8E4] py-1.5 about-dropdown-menu"
                          style={{
                            top: aboutButtonRef.current ? aboutButtonRef.current.getBoundingClientRect().bottom + 4 : 68,
                            left: aboutButtonRef.current ? aboutButtonRef.current.getBoundingClientRect().left : 0,
                            width: 180,
                            zIndex: 99999,
                          }}
                        >
                          {aboutDropdownItems.map((d) => {
                            const dropdownActive = pathname === d.href
                            return (
                              <Link
                                key={d.href}
                                href={d.href}
                                onClick={() => setShowAboutDropdown(false)}
                                className={`block px-4 py-2.5 text-[14px] transition-colors border-l-2 ${dropdownActive ? 'font-semibold text-[#1A1816] bg-[#FAFAF8] border-l-[#D03839]' : 'text-[#444441] border-l-transparent hover:text-[#1A1816] hover:bg-[#FAFAF8]'}`}
                              >
                                {d.label}
                              </Link>
                            )
                          })}
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
                    className={`px-4 pt-2 pb-0.5 text-[17px] transition-colors ${active ? 'font-semibold text-[#1A1816] border-b-2 border-[#1A1816]' : 'font-medium text-[#444441] hover:text-[#1A1816]'}`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  {/* Post a Deal */}
                  <Link
                    href="/buyer/listings?new=1"
                    className="hidden sm:flex items-center gap-1.5 h-[36px] px-4 bg-[#D03839] hover:bg-[#C73022] text-white text-[13px] font-semibold rounded transition-colors"
                  >
                    + Post a Deal
                  </Link>

                  {/* Notifications */}
                  <div className="relative" ref={notifBellRef}>
                    <button
                      onClick={() => setNotifOpen(prev => !prev)}
                      className="relative p-2 text-[#737370] hover:text-[#1A1816] transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                      </svg>
                      {notifUnread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-[#D03839] rounded-full leading-none">
                          {notifUnread > 99 ? '99+' : notifUnread}
                        </span>
                      )}
                    </button>

                    {notifOpen && (
                      <div className="fixed top-[84px] left-3 right-3 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-2 sm:w-[380px] bg-white border border-[#E8E8E4] rounded shadow-xl z-[99999] overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8E4]">
                          <span className="text-[14px] font-semibold text-[#1A1816]">Notifications</span>
                          {notifUnread > 0 && (
                            <button
                              onClick={async () => {
                                await fetch('/api/buyer/notifications', { method: 'POST', headers: { Authorization: `Bearer ${user.id}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_all_read' }) })
                                setNotifUnread(0)
                                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
                              }}
                              className="text-[12px] text-[#D03839] font-medium hover:underline"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-[340px] overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="flex items-center justify-center h-16 text-[13px] text-[#737370]">No notifications yet</div>
                          ) : notifications.map(n => (
                            <Link
                              key={n.id}
                              href={(() => {
                                const t = n.type || ''
                                const convId = resolveInboxConversationId(n.related_conversation_id)
                                if (convId) return `/buyer/inbox?conversation=${convId}`
                                if (t === 'buy_box_match' && n.related_property_id) return `/${n.related_property_id}`
                                if (t === 'listing_approved' || t === 'listing_rejected') return '/buyer/listings'
                                if (t.startsWith('offer_') || t === 'counter_received') return '/buyer/offers'
                                if (t.startsWith('contract_')) return '/buyer/contracts'
                                if (t.startsWith('payment_') || t === 'subscription_created' || t === 'subscription_cancelled') return '/buyer/billing'
                                return '/buyer/inbox'
                              })()}
                              onClick={async () => {
                                setNotifOpen(false)
                                if (!n.is_read) {
                                  await fetch('/api/buyer/notifications', { method: 'POST', headers: { Authorization: `Bearer ${user.id}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_read', notification_id: n.id }) })
                                  setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
                                  setNotifUnread(prev => Math.max(0, prev - 1))
                                }
                              }}
                              className={`flex items-start gap-3 px-4 py-3 border-l-2 transition-colors hover:bg-[#FAFAF8] ${n.is_read ? 'border-l-transparent' : 'border-l-[#D03839] bg-[#FAFAF8]'}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className={`text-[13px] truncate ${n.is_read ? 'text-[#444441]' : 'font-semibold text-[#1A1816]'}`}>{n.title}</p>
                                <p className="text-[12px] text-[#737370] truncate mt-0.5">{n.body}</p>
                                <p className="text-[11px] text-[#A8A8A4] mt-1">{n.created_at ? new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Avatar */}
                  <Link href="/buyer/dashboard" className="flex items-center gap-2 group">
                    <div className="w-9 h-9 rounded-full bg-[#FEF0EF] flex items-center justify-center text-[#D03839] text-[13px] font-semibold ring-2 ring-[#F5C4C0] group-hover:ring-[#D03839] group-hover:scale-110 transition-all duration-200">
                      {getUserInitials(user)}
                    </div>
                  </Link>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-[10px]">
                  <button
                    onClick={() => { setAuthInitialStep('login'); setShowAuth(true) }}
                    className="py-2 px-[18px] text-[14px] font-semibold text-[#1A1816] border border-[#D1D1CE] rounded hover:bg-[#FAFAF8] transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => { setAuthInitialStep('signup'); setShowAuth(true) }}
                    className="py-2 px-[18px] text-[14px] font-semibold text-white bg-[#D03839] hover:bg-[#E0493B] rounded transition-colors"
                  >
                    Create account
                  </button>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setShowMobileMenu(true)}
                className="md:hidden p-2 text-[#444441] hover:text-[#1A1816] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-[9999] md:hidden ${showMobileMenu ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        {showMobileMenu && (
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileMenu(false)} />
        )}
        <div
          className={`absolute right-0 top-0 h-full w-[85vw] max-w-[300px] bg-white shadow-xl border-l border-[#E8E8E4] transition-transform duration-300 ease-in-out pointer-events-auto ${showMobileMenu ? 'translate-x-0' : 'translate-x-full'}`}
        >
            <div className="flex items-center justify-between p-5 border-b border-[#E8E8E4]">
              <span className="text-[15px] font-semibold text-[#1A1816]">Menu</span>
              <button onClick={() => setShowMobileMenu(false)} className="p-1 text-[#737370] hover:text-[#1A1816]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-0.5">
              {navItems.map((item) => {
                const active = isActive(item.href)
                if (item.hasDropdown) {
                  return (
                    <div key={item.label}>
                      <button
                        onClick={() => setShowMobileMore(p => !p)}
                        className={`w-full flex items-center justify-between py-3 px-3 text-[15px] font-medium rounded transition-colors ${active ? 'text-[#1A1816] font-semibold' : 'text-[#444441] hover:text-[#1A1816] hover:bg-[#FAFAF8]'}`}
                      >
                        {item.label}
                        <svg className={`w-4 h-4 transition-transform ${showMobileMore ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className={`overflow-hidden transition-all duration-250 ease-in-out ${showMobileMore ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="pl-4 space-y-0.5 pb-1">
                          {aboutDropdownItems.map((d) => (
                            <Link key={d.href} href={d.href} onClick={() => setShowMobileMenu(false)}
                              className="block py-2.5 px-3 text-[14px] text-[#737370] hover:text-[#1A1816] rounded hover:bg-[#FAFAF8] transition-colors">
                              {d.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                }
                return (
                  <Link key={item.label} href={item.href} onClick={() => setShowMobileMenu(false)}
                    className={`block py-3 px-3 text-[15px] font-medium rounded transition-colors ${active ? 'text-[#1A1816] font-semibold bg-[#FAFAF8]' : 'text-[#444441] hover:text-[#1A1816] hover:bg-[#FAFAF8]'}`}>
                    {item.label}
                  </Link>
                )
              })}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#E8E8E4] bg-white">
              {user ? (
                <Link href="/buyer/dashboard" onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-3 p-3 rounded bg-[#1A1816] hover:bg-[#2A2825] transition-colors">
                  <div className="w-10 h-10 rounded-full bg-[#D03839] flex items-center justify-center text-white font-semibold">
                    {getUserInitials(user)}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{getUserDisplayName(user)}</p>
                    <p className="text-[11px] text-[#737370]">Go to dashboard →</p>
                  </div>
                </Link>
              ) : (
                <div className="space-y-2">
                  <button onClick={() => { setShowMobileMenu(false); setAuthInitialStep('login'); setShowAuth(true) }}
                    className="w-full h-11 text-[14px] font-semibold text-[#1A1816] border border-[#E8E8E4] rounded hover:bg-[#FAFAF8] transition-colors">
                    Login
                  </button>
                  <button onClick={() => { setShowMobileMenu(false); setAuthInitialStep('signup'); setShowAuth(true) }}
                    className="w-full h-11 text-[14px] font-semibold text-white bg-[#D03839] hover:bg-[#E0493B] rounded transition-colors">
                    Create account
                  </button>
                </div>
              )}
            </div>
        </div>
      </div>

      <RegistrationModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        initialStep={authInitialStep}
        defaultRole={authDefaultRole}
      />
    </>
  )
}
