'use client'
import { X } from 'lucide-react'
import Link from 'next/link'

export function StaticPagesMobileNav({ isOpen, onClose, menuItems, currentPage }) {
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
                target={item.external ? '_blank' : '_self'}
                rel={item.external ? 'noopener noreferrer' : undefined}
                onClick={onClose}
                className={`block py-4 px-4 text-base font-medium transition-colors duration-200 rounded-lg ${
                  currentPage === item.page
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
        
        {/* CTA Button Section */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-600 bg-[#033a56]">
          <a
            href="https://forms.monday.com/forms/160d7a7c32a951f6ab92b8812e440dc3?r=use1"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full bg-[#b29578] hover:bg-[#9a7e61] text-white py-4 text-base font-medium rounded-lg shadow-lg flex items-center justify-center transition-colors duration-200"
          >
            Join Our Buyer's List
          </a>
        </div>
      </div>
    </div>
  )
}