'use client'
import { useState } from 'react'
import { Copy, Check, Facebook, Twitter, Mail, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function ShareModal({ isOpen, onClose, url, title, description }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const shareOnFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    window.open(facebookUrl, '_blank', 'width=600,height=400')
  }

  const shareOnTwitter = () => {
    const text = `${title} - ${description}`
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(twitterUrl, '_blank', 'width=600,height=400')
  }

  const shareByEmail = () => {
    const subject = encodeURIComponent(title)
    const body = encodeURIComponent(`Check out this property: ${description}\n\n${url}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const handleFacebookShare = (e) => {
    e.stopPropagation()
    shareOnFacebook()
  }

  const handleTwitterShare = (e) => {
    e.stopPropagation()
    shareOnTwitter()
  }

  const handleEmailShare = (e) => {
    e.stopPropagation()
    shareByEmail()
  }

  const handleWhatsAppShare = (e) => {
    e.stopPropagation()
    const text = `Check out this property: ${title} - ${url}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden z-[10000]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 bg-white rounded-full p-1 shadow-sm"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">🎉</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your link is ready!</h2>
            <p className="text-sm text-gray-600">Copy the link below to share it or choose a platform to share it to.</p>
          </div>
          
          {/* URL Copy Section - Bitly style */}
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center bg-white rounded-lg border">
              <input
                type="text"
                value={url}
                readOnly
                className="flex-1 px-3 py-3 text-sm bg-transparent border-none focus:outline-none text-gray-700"
              />
              <div className="flex gap-2 pr-3">
                <Button
                  onClick={copyToClipboard}
                  className={`px-4 py-2 text-white rounded-lg transition-all text-sm font-medium ${
                    copied 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90'
                  }`}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Social Media Icons - Bitly style */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleFacebookShare}
              className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors"
              title="Share on Facebook"
            >
              <Facebook className="h-5 w-5 text-white" />
            </button>
            
            <button
              onClick={handleTwitterShare}
              className="p-3 rounded-full bg-black hover:bg-gray-800 transition-colors"
              title="Share on Twitter"
            >
              <Twitter className="h-5 w-5 text-white" />
            </button>
            
            <button
              onClick={handleWhatsAppShare}
              className="p-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
              title="Share on WhatsApp"
            >
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
            </button>
            
            <button
              onClick={handleEmailShare}
              className="p-3 rounded-full bg-gray-600 hover:bg-gray-700 transition-colors"
              title="Share by Email"
            >
              <Mail className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}