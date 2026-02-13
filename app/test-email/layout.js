import { redirect } from 'next/navigation'

export default function TestEmailLayout({ children }) {
  // Simple protection - in production, use proper authentication
  // For now, this page is only accessible in development or with a secret
  const isDev = process.env.NODE_ENV === 'development'
  const hasSecret = process.env.EMAIL_TEST_SECRET
  
  // Only allow in development or if secret is set
  if (!isDev && !hasSecret) {
    redirect('/')
  }
  
  return <>{children}</>
}
