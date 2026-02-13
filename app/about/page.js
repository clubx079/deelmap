'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AboutPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to Our Story page
    router.replace('/our-story')
  }, [router])

  return null
}