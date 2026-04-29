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
    <div
      className="min-h-screen bg-[#1A1816] flex flex-col items-center justify-center px-6"
      style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
    >
      {/* Card */}
      <div className="w-full max-w-[440px]">

        {/* Logo above card */}
        <div className="flex justify-center mb-8">
          <Image
            src="/assets/logo-footer.svg"
            alt="DeelMap"
            width={200}
            height={60}
            className="h-16 w-auto"
            priority
          />
        </div>

        {/* Main card — matches login modal spec */}
        <div className="bg-white border border-[#707070] rounded overflow-hidden">

          <div className="px-8 py-10">
            {/* Badge */}
            <div className="flex justify-center mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF0EF] border border-[#F5C4C0] text-[#D03839] text-[11px] font-semibold uppercase tracking-[0.09em]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D03839] animate-pulse inline-block" />
                Private Beta
              </span>
            </div>

            <h1
              className="text-[22px] font-bold text-[#1A1816] text-center mb-2"
              style={{ letterSpacing: '-0.3px' }}
            >
              Welcome to DeelMap
            </h1>
            <p className="text-[14px] text-[#737370] text-center mb-8 leading-relaxed">
              Enter your access code to continue.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  value={pin}
                  onChange={e => { setPin(e.target.value); setError(null) }}
                  placeholder="Enter access code"
                  autoFocus
                  autoComplete="off"
                  className="w-full h-[56px] px-4 rounded border border-[#E8E8E4] text-[14px] text-[#1A1816] text-center tracking-[0.15em] font-semibold bg-[#FAFAF8] outline-none focus:border-[#D03839] transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-[#737370]"
                  style={{ boxShadow: 'none', fontFamily: 'var(--font-dm-sans), sans-serif' }}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(208,56,57,0.12)'}
                  onBlur={e => e.target.style.boxShadow = 'none'}
                />
                {error && (
                  <p className="text-[12px] text-[#D03839] mt-1.5">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !pin.trim()}
                className="w-full h-[56px] bg-[#D03839] hover:bg-[#E0493B] active:bg-[#C73022] text-white text-[18px] font-semibold rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ transition: 'all 0.2s ease' }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Continue'}
              </button>
            </form>
          </div>

          {/* Footer row */}
          <div className="px-8 py-4 bg-[#FAFAF8] border-t border-[#E8E8E4] text-center">
            <p className="text-[11px] text-[#A8A8A4]">
              Need access?{' '}
              <a href="mailto:hello@deelmap.com" className="text-[#D03839] font-medium" style={{ textDecoration: 'none' }}>
                Contact us
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#444441] mt-6">
          © {new Date().getFullYear()} DeelMap · All rights reserved
        </p>
      </div>
    </div>
  )
}
