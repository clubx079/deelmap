'use client'
import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { DocusealForm } from '@docuseal/react'
import Image from 'next/image'

export default function SignPage({ params }) {
  const { slug } = params
  const [completed, setCompleted] = useState(false)

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <div className="border-b border-[#E8E8E4] bg-white px-6 py-3 flex items-center">
        <Image src="/favicon.ico" alt="DeelMap" width={28} height={28} className="mr-2" />
        <span className="text-[15px] font-bold text-[#1A1816]">DeelMap</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {completed ? (
          <div className="bg-white border border-[#E8E8E4] rounded p-12 text-center">
            <div className="w-14 h-14 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-7 h-7 text-[#16A34A]" />
            </div>
            <h1 className="text-[22px] font-bold text-[#1A1816] mb-2">You're all set!</h1>
            <p className="text-[14px] text-[#737370] max-w-[340px] mx-auto leading-relaxed">
              Your signature has been recorded. You'll receive an email copy once all parties have signed.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E8E8E4]">
              <h1 className="text-[16px] font-bold text-[#1A1816]">Review &amp; Sign Contract</h1>
              <p className="text-[13px] text-[#737370] mt-0.5">Please review the document below and add your signature.</p>
            </div>
            <DocusealForm
              src={`https://docuseal.com/s/${slug}`}
              withTitle={false}
              withDownloadButton={false}
              customCss={`
                body { font-family: 'DM Sans', -apple-system, sans-serif !important; }
                .base-button { background: #D03839 !important; border-color: #D03839 !important; border-radius: 4px !important; }
                .base-button:hover { background: #E0493B !important; }
              `}
              onComplete={() => setCompleted(true)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
