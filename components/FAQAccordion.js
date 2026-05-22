'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

function AccordionItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#E8E8E4] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[15px] font-semibold text-[#1A1816]">{question}</span>
        <ChevronDown className={`w-4 h-4 text-[#737370] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="text-[15px] text-[#444441] leading-relaxed pb-5">{answer}</p>
      )}
    </div>
  )
}

export default function FAQAccordion({ questions, bg = 'white' }) {
  return (
    <div className={`border border-[#E8E8E4] rounded px-6 sm:px-8 ${bg === 'gray' ? 'bg-[#FAFAF8]' : 'bg-white'}`}>
      {questions.map((faq) => (
        <AccordionItem key={faq.q} question={faq.q} answer={faq.a} />
      ))}
    </div>
  )
}
