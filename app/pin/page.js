'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

export default function PinPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pin.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      })

      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        setError('Incorrect access code. Try again.')
        setPin('')
        inputRef.current?.focus()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#1A1816] flex flex-col items-center justify-center px-6">

      {/* Background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#2D2A27_0%,_#1A1816_70%)] pointer-events-none" />

      {/* Card */}
      <div className="relative w-full max-w-[420px]">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/assets/logo.svg"
            alt="DeelMap"
            width={180}
            height={52}
            className="h-14 w-auto brightness-0 invert"
            priority
          />
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">

          {/* Top accent */}
          <div className="h-1 w-full bg-[#D03839]" />

          <div className="px-8 py-10">
            {/* Badge */}
            <div className="flex justify-center mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF0EF] border border-[#F5C0BF] text-[#D03839] text-[11px] font-semibold uppercase tracking-[0.08em]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D03839] animate-pulse inline-block" />
                Private Beta
              </span>
            </div>

            <h1 className="text-[22px] font-bold text-[#1A1816] text-center leading-snug mb-2">
              Welcome to DeelMap
            </h1>
            <p className="text-[14px] text-[#737370] text-center mb-8 leading-relaxed">
              Enter your access code to continue.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  value={pin}
                  onChange={e => { setPin(e.target.value); setError(null) }}
                  placeholder="Access code"
                  autoFocus
                  autoComplete="off"
                  className="w-full h-[52px] px-4 rounded-lg border border-[#E8E8E4] text-[15px] text-[#1A1816] text-center tracking-[0.2em] font-semibold bg-[#FAFAF8] outline-none focus:border-[#D03839] focus:ring-2 focus:ring-[#D03839]/10 transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-[#A8A8A4]"
                />
                {error && (
                  <p className="text-[12px] text-[#D03839] text-center mt-2">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !pin.trim()}
                className="w-full h-[52px] bg-[#D03839] hover:bg-[#E0493B] active:bg-[#C73022] text-white text-[15px] font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Continue →'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-[#FAFAF8] border-t border-[#F0F0EE] text-center">
            <p className="text-[12px] text-[#A8A8A4]">
              Need access?{' '}
              <a href="mailto:hello@deelmap.com" className="text-[#D03839] hover:underline font-medium">
                Contact us
              </a>
            </p>
          </div>
        </div>

        {/* Bottom caption */}
        <p className="text-center text-[12px] text-[#444441] mt-6">
          © {new Date().getFullYear()} DeelMap · All rights reserved
        </p>
      </div>
    </div>
  )
}
