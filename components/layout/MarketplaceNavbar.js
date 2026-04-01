'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search } from 'lucide-react'

export function MarketplaceNavbar({ searchQuery, onSearchChange }) {
  return (
    <nav className="bg-[#152343] border-b border-gray-700 w-full relative z-30">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0">
          <Link href="/" className="flex items-center">
            <Image
              src="/assets/logo.svg"
              alt="DeelMap"
              width={140}
              height={45}
              className="h-9 w-auto"
              priority
            />
          </Link>
        </div>

        {/* Right Side - Login / Sign up */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-white hover:text-gray-200"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-sm font-medium text-white bg-[#4A90E2] hover:bg-[#357ABD] rounded-lg transition-colors"
          >
            Sign up
          </Link>
        </div>
      </div>
    </nav>
  )
}
