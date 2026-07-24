'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function Stars({ value, hover, setHover, onPick, readOnly }) {
  const shown = (!readOnly && hover) || value
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onPick?.(n)}
          onMouseEnter={() => !readOnly && setHover?.(n)}
          onMouseLeave={() => !readOnly && setHover?.(0)}
          aria-label={`${n} star`}
          className={`p-1 transition-transform ${readOnly ? 'cursor-default' : 'hover:scale-110'}`}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill={n <= shown ? '#F5A623' : 'none'} stroke={n <= shown ? '#F5A623' : '#C9C9C4'} strokeWidth="1.6">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
      {value > 0 && <span className="ml-2 text-[13px] font-medium text-[#737370]">{value}/5</span>}
    </div>
  )
}

function ThankYou() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF7EF]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <h1 className="text-[20px] font-bold text-[#1A1816]">Thank you!</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#737370]">Your feedback goes straight to our team and genuinely helps us make DeelMap better.</p>
    </div>
  )
}

function FeedbackForm() {
  const params = useSearchParams()
  const token = params.get('fid') || ''
  const urlRating = parseInt(params.get('rating') || '0', 10)
  const preRated = urlRating >= 1 && urlRating <= 5

  const [rating, setRating] = useState(preRated ? urlRating : 0)
  const [hover, setHover] = useState(0)
  const [message, setMessage] = useState('')
  const [feedbackId, setFeedbackId] = useState(null)
  const [state, setState] = useState(preRated ? 'saving-rating' : 'idle') // idle | saving-rating | rated | sending | done | error
  const [err, setErr] = useState('')
  const didSave = useRef(false)

  // Star tapped in the email → save that rating instantly, then invite a comment.
  useEffect(() => {
    if (!preRated || didSave.current) return
    didSave.current = true
    ;(async () => {
      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: urlRating, token }),
        })
        const d = await res.json().catch(() => ({}))
        if (res.ok && d.id) setFeedbackId(d.id)
      } catch {}
      setState('rated')
    })()
  }, [preRated, urlRating, token])

  const submit = async () => {
    if (state === 'rated') {
      if (!message.trim()) { setState('done'); return } // rating already saved; nothing to add
    } else if (!rating && !message.trim()) {
      setErr('Add a rating or a comment first.'); return
    }
    setState('sending'); setErr('')
    try {
      const payload = feedbackId
        ? { feedbackId, message: message.trim() }
        : { rating: rating || null, message: message.trim() || null, token }
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(d.error || 'Something went wrong.'); setState(feedbackId ? 'rated' : 'idle'); return }
      setState('done')
    } catch {
      setErr('Network error — please try again.'); setState(feedbackId ? 'rated' : 'idle')
    }
  }

  if (state === 'done') return <ThankYou />

  const rated = state === 'rated' || state === 'saving-rating'
  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-[-0.4px] text-[#1A1816]">
        {rated ? `Thanks — you rated us ${rating}/5` : "How's your DeelMap experience?"}
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#737370]">
        {rated ? 'Want to add a comment? (optional)' : 'Tap a rating and tell us how the site looks and feels.'}
      </p>

      <div className="mt-5">
        <Stars value={rating} hover={hover} setHover={setHover} onPick={rated ? undefined : setRating} readOnly={rated} />
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        placeholder="What's working well? What could be better? (optional)"
        className="mt-5 w-full resize-none rounded border border-[#E8E8E4] bg-white p-3 text-[14px] text-[#1A1816] outline-none focus:border-[#D03839]"
      />

      {err && <p className="mt-3 text-[13px] text-[#D03839]">{err}</p>}

      <button
        onClick={submit}
        disabled={state === 'sending' || state === 'saving-rating'}
        className="mt-5 w-full rounded bg-[#D03839] py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#E0493B] disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending…' : rated ? (message.trim() ? 'Send comment' : 'Done') : 'Send feedback'}
      </button>
    </div>
  )
}

export default function FeedbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F3] px-4 py-12 font-[var(--font-dm-sans)]">
      <div className="w-full max-w-[480px] rounded-lg border border-[#E8E8E4] bg-white p-8 shadow-sm">
        <div className="mb-6 border-b-2 border-[#D03839] pb-3">
          <span className="text-[20px] font-extrabold text-[#1A1816]">DeelMap</span>
        </div>
        <Suspense fallback={null}>
          <FeedbackForm />
        </Suspense>
      </div>
    </div>
  )
}
