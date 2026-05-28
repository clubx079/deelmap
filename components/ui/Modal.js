'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'

export function Modal({ isOpen, onClose, children, className = '', hideClose = false }) {
  useEffect(() => {
    if (isOpen) {
      // Add modal-open class to body instead of directly setting overflow
      document.body.classList.add('modal-open')
      // Only prevent scrolling, don't hide content
      document.body.style.overflow = 'hidden'
    } else {
      document.body.classList.remove('modal-open')
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.classList.remove('modal-open')
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Much lighter backdrop - almost transparent */}
        <div
          className="fixed inset-0 transition-opacity"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(2px)'
          }}
        />
        {/* Modal content */}
        <div
          className={`relative bg-white rounded shadow-2xl max-w-lg w-full ${className}`}
          style={{ zIndex: 10000 }}
        >
          {!hideClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#A8A8A4] hover:text-[#444441] z-10 p-1 rounded-full hover:bg-[#FAFAF8] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}