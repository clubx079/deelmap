'use client'
import { useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send message')
      setSuccess(true)
      setForm({ name: '', email: '', message: '' })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-20 pb-20 lg:pt-28 lg:pb-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-[#1A1816] leading-tight mb-5">
                Contact us and<br />
                we&apos;ll help you{' '}
                <span className="text-[#D03839]">find<br />the right deal</span>
              </h1>
              <p className="text-[15px] text-[#737370] leading-relaxed mb-8 max-w-sm">
                Tell us what you&apos;re looking for and we&apos;ll guide you to the right opportunity, from discovering deals to making informed decisions.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1A1816] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <a href="mailto:office@deelmap.co" className="text-[15px] text-[#444441] hover:text-[#D03839] transition-colors">
                    office@deelmap.co
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1A1816] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                  </div>
                  <a href="tel:+18887808093" className="text-[15px] text-[#444441] hover:text-[#D03839] transition-colors">
                    (888) 780-8093
                  </a>
                </div>
              </div>
            </div>

            {/* Right – Form */}
            <div className="bg-white border border-[#E8E8E4] rounded p-8 shadow-sm">
              <h2 className="text-[20px] font-bold text-[#1A1816] mb-6">Contact Us</h2>

              {success ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-full bg-[#E4F5EC] flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-[#0F6E56]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-[15px] font-semibold text-[#1A1816] mb-1">Message sent!</p>
                  <p className="text-[13px] text-[#737370]">We&apos;ll get back to you as soon as possible.</p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="mt-5 text-[13px] text-[#D03839] font-semibold hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1816] mb-1.5">
                      Your Name <span className="text-[#D03839]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full h-11 px-3 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] placeholder-[#A8A8A4] focus:outline-none focus:border-[#D03839] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1816] mb-1.5">
                      Your Email <span className="text-[#D03839]">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="w-full h-11 px-3 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] placeholder-[#A8A8A4] focus:outline-none focus:border-[#D03839] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1816] mb-1.5">
                      Send Message <span className="text-[#D03839]">*</span>
                    </label>
                    <textarea
                      placeholder="Enter your message"
                      value={form.message}
                      onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                      required
                      rows={5}
                      className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] placeholder-[#A8A8A4] focus:outline-none focus:border-[#D03839] transition-colors resize-none"
                    />
                  </div>

                  {error && <p className="text-[13px] text-[#D03839]">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold text-[15px] rounded transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Submit'}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
