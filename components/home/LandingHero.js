'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

// Number blocks on the map: each has a number and links to a property card index
const NUMBER_BLOCKS = [
  { id: 0, number: 2, cardIndex: 0, label: 'Cincinnati' },
  { id: 1, number: 14, cardIndex: 1, label: 'Columbus' },
  { id: 2, number: 4, cardIndex: 0, label: 'Cincinnati' }
]

const PROPERTY_CARDS = [
  {
    price: '$159,999',
    location: 'Cincinnati, Ohio',
    beds: '3 Beds',
    baths: '2 Bath',
    sqft: '1,200 sqft',
    image: '/assets/home/1.png'
  },
  {
    price: '$165,000',
    location: 'Columbus, Ohio',
    beds: '2 Beds',
    baths: '1 Bath',
    sqft: '1,100 sqft',
    image: '/assets/home/2.png'
  }
]

const CYCLE_MS = 3500

export function LandingHero() {
  const [activeBlockId, setActiveBlockId] = useState(0)

  // Cycle through number blocks so the matching property popup highlights
  useEffect(() => {
    const t = setInterval(() => {
      setActiveBlockId((prev) => (prev + 1) % NUMBER_BLOCKS.length)
    }, CYCLE_MS)
    return () => clearInterval(t)
  }, [])

  const activeCardIndex = NUMBER_BLOCKS[activeBlockId].cardIndex

  return (
    <div className="relative w-full max-w-4xl mx-auto flex items-center justify-center min-h-[320px] sm:min-h-[420px] lg:min-h-[480px] px-2 sm:px-4">
      {/* Left property card - appears when block 2 or 4 is active */}
      <div
        className="absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-[100px] sm:w-[160px] lg:w-[200px] transition-all duration-500 ease-out"
        style={{
          opacity: activeCardIndex === 0 ? 1 : 0.5,
          transform: `translateY(-50%) scale(${activeCardIndex === 0 ? 1.08 : 1})`,
          zIndex: activeCardIndex === 0 ? 30 : 20
        }}
      >
        <PropertyCard {...PROPERTY_CARDS[0]} />
      </div>

      {/* Center: phone + map + pin + number blocks */}
      <div className="relative z-10 flex items-center justify-center">
        {/* Phone mockup */}
        <div className="relative w-[200px] sm:w-[240px] lg:w-[280px] aspect-[9/19] bg-[#1A1816] rounded-[2.5rem] shadow-2xl border-[10px] sm:border-[12px] border-[#1A1816] overflow-hidden">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-[#1A1816] rounded-b-2xl z-10" />
          {/* Screen - map area */}
          <div className="absolute inset-0 pt-6 bg-[#E8E8E4] overflow-hidden">
            {/* Subtle map-like grid background */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #94a3b8 1px, transparent 1px),
                  linear-gradient(to bottom, #94a3b8 1px, transparent 1px)
                `,
                backgroundSize: '16px 16px'
              }}
            />
            <div className="absolute bottom-2 left-2 right-2 text-[8px] sm:text-[9px] text-[#737370] font-medium">
              Cincinnati
            </div>

            {/* Number blocks on the map */}
            {NUMBER_BLOCKS.map((block) => (
              <button
                key={block.id}
                type="button"
                onClick={() => setActiveBlockId(block.id)}
                className="absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#4A90E2] text-white text-xs sm:text-sm font-bold flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#1A1816] focus:ring-offset-2"
                style={{
                  left: block.id === 0 ? '18%' : block.id === 1 ? '42%' : '32%',
                  top: block.id === 0 ? '22%' : block.id === 1 ? '38%' : '62%',
                  boxShadow: activeBlockId === block.id
                    ? '0 0 0 3px white, 0 0 0 6px #2563eb, 0 4px 14px rgba(0,0,0,0.25)'
                    : '0 4px 14px rgba(0,0,0,0.2)',
                  transform: activeBlockId === block.id ? 'scale(1.15)' : 'scale(1)'
                }}
              >
                {block.number}
              </button>
            ))}
          </div>
        </div>

        {/* Red map pin (SVG) - overlaps phone */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-52%, -85%)',
            width: '56px',
            height: '72px',
            zIndex: 25
          }}
        >
          <MapPinIcon />
        </div>
      </div>

      {/* Right property card - appears when block 14 is active */}
      <div
        className="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-[100px] sm:w-[160px] lg:w-[200px] transition-all duration-500 ease-out"
        style={{
          opacity: activeCardIndex === 1 ? 1 : 0.5,
          transform: `translateY(-50%) scale(${activeCardIndex === 1 ? 1.08 : 1})`,
          zIndex: activeCardIndex === 1 ? 30 : 20
        }}
      >
        <PropertyCard {...PROPERTY_CARDS[1]} />
      </div>
    </div>
  )
}

function PropertyCard({ price, location, beds, baths, sqft, image }) {
  return (
    <div className="bg-white rounded-xl shadow-xl border border-[#E8E8E4] overflow-hidden transition-shadow duration-300 hover:shadow-2xl">
      <div className="relative aspect-[4/3] bg-[#FAFAF8]">
        <Image
          src={image}
          alt={location}
          fill
          className="object-cover"
          sizes="200px"
        />
      </div>
      <div className="p-2 sm:p-2.5">
        <p className="text-sm sm:text-base font-bold text-[#1A1816]">{price}</p>
        <p className="text-[10px] sm:text-xs text-[#444441] truncate">{location}</p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          <span className="inline-block px-1.5 py-0.5 rounded bg-[#FAFAF8] text-[9px] sm:text-xs text-[#444441]">
            {beds}
          </span>
          <span className="inline-block px-1.5 py-0.5 rounded bg-[#FAFAF8] text-[9px] sm:text-xs text-[#444441]">
            {baths}
          </span>
          <span className="inline-block px-1.5 py-0.5 rounded bg-[#FAFAF8] text-[9px] sm:text-xs text-[#444441]">
            {sqft}
          </span>
        </div>
      </div>
    </div>
  )
}

function MapPinIcon() {
  return (
    <svg
      viewBox="0 0 56 72"
      fill="none"
      className="w-full h-full drop-shadow-lg"
      aria-hidden
    >
      {/* Pin shape */}
      <path
        d="M28 0C12.536 0 0 12.536 0 28c0 15.464 28 44 28 44s28-28.536 28-44C56 12.536 43.464 0 28 0z"
        fill="#D03839"
      />
      {/* House icon inside pin */}
      <path
        d="M28 18l-10 8v10h6v-6h8v6h6V26l-10-8z"
        fill="white"
        stroke="white"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
