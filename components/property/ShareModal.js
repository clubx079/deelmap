'use client'
import { useState } from 'react'
import { Copy, Check, X, Mail } from 'lucide-react'

export function ShareModal({ isOpen, onClose, url, title, description }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shareOnFacebook = (e) => {
    e.stopPropagation()
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
  }

  const shareOnTwitter = (e) => {
    e.stopPropagation()
    const text = `${title} - ${description}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
  }

  const shareByEmail = (e) => {
    e.stopPropagation()
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this property: ${description}\n\n${url}`)}`
  }

  const shareOnWhatsApp = (e) => {
    e.stopPropagation()
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this property: ${title} - ${url}`)}`, '_blank')
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#E8E8E4] rounded shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8E4]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#737370]">Share listing</p>
            <h2 className="text-[14px] font-bold text-[#1A1816] truncate max-w-[220px]">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#FAFAF8] text-[#737370] hover:text-[#1A1816] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* URL copy */}
        <div className="p-4 border-b border-[#E8E8E4]">
          <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#737370] mb-2">Link</p>
          <div className="flex items-center gap-2 bg-[#FAFAF8] border border-[#E8E8E4] rounded px-3 py-2">
            <code className="text-[11px] text-[#1A1816] flex-1 truncate">{url}</code>
            <button
              onClick={copyToClipboard}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded transition-colors flex-shrink-0 ${
                copied
                  ? 'bg-[#E4F5EC] text-[#0F6E56] border border-[#A8DFBA]'
                  : 'bg-[#FEF0EF] text-[#D03839] border border-[#F5C4C0] hover:bg-[#FEE4E3]'
              }`}
            >
              {copied ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
            </button>
          </div>
        </div>

        {/* Social platforms */}
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#737370] mb-3">Share on</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={shareOnFacebook}
              className="flex items-center gap-3 px-3 py-2.5 border border-[#E8E8E4] rounded hover:border-[#D03839] hover:bg-[#FEF0EF] transition-colors group"
            >
              <img src="https://cdn.simpleicons.org/facebook/1877F2" alt="" className="w-4 h-4" />
              <span className="text-[13px] font-medium text-[#1A1816]">Facebook</span>
            </button>
            <button
              onClick={shareOnTwitter}
              className="flex items-center gap-3 px-3 py-2.5 border border-[#E8E8E4] rounded hover:border-[#D03839] hover:bg-[#FEF0EF] transition-colors group"
            >
              <img src="https://cdn.simpleicons.org/x/000000" alt="" className="w-4 h-4" />
              <span className="text-[13px] font-medium text-[#1A1816]">Twitter / X</span>
            </button>
            <button
              onClick={shareOnWhatsApp}
              className="flex items-center gap-3 px-3 py-2.5 border border-[#E8E8E4] rounded hover:border-[#D03839] hover:bg-[#FEF0EF] transition-colors group"
            >
              <img src="https://cdn.simpleicons.org/whatsapp/25D366" alt="" className="w-4 h-4" />
              <span className="text-[13px] font-medium text-[#1A1816]">WhatsApp</span>
            </button>
            <button
              onClick={shareByEmail}
              className="flex items-center gap-3 px-3 py-2.5 border border-[#E8E8E4] rounded hover:border-[#D03839] hover:bg-[#FEF0EF] transition-colors group"
            >
              <Mail className="w-4 h-4 text-[#737370]" />
              <span className="text-[13px] font-medium text-[#1A1816]">Email</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
