'use client'
import { X, User } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export function MobileNav({ isOpen, onClose, menuItems, user, onShowAuth, onLogout }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] md:hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-80 bg-[#022b41] transform transition-transform duration-300 ease-in-out shadow-2xl z-[10000]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600">
          <h2 className="text-white text-xl font-bold">Menu</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-[#b29578] p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Menu Items */}
        <div className="p-6 space-y-2">
          {menuItems.map((item) => (
            <div key={item.label} className="relative">
              <Link
                href={item.href}
                onClick={onClose}
                className={`block py-4 px-4 text-base font-medium transition-colors duration-200 rounded-lg ${
                  item.active
                    ? 'text-[#b29578] bg-white/10'
                    : 'text-white hover:text-[#b29578] hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.hasNew && (
                    <span className="bg-[#b29578] text-white text-xs px-2 py-1 rounded-full font-semibold">
                      NEW
                    </span>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
        
        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-600 bg-[#033a56]">
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-white">
                <div className="w-10 h-10 bg-[#b29578] rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {user.user_metadata?.name || 'User'}
                  </div>
                  <div className="text-xs text-gray-300 truncate">
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  onLogout()
                  onClose()
                }}
                className="w-full text-left py-3 px-4 text-white hover:text-[#b29578] hover:bg-white/5 rounded-lg transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Button
              onClick={() => {
                onShowAuth()
                onClose()
              }}
              className="w-full bg-[#b29578] hover:bg-[#9a7e61] text-white py-4 text-base font-medium rounded-lg shadow-lg"
            >
              Join Ableman
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}