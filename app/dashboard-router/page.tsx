'use client'

import { useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'

export default function DashboardRouter() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
      return
    }

    if (!loading && user?.role) {
      if (user.role === 'customer') {
        router.push('/customer-dashboard')
      } else if (user.role === 'developer') {
        router.push('/dev-dashboard')
      }
    }
  }, [user, user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-4">Loading dashboard...</p>
      </div>
    </div>
  )
}
