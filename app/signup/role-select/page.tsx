'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { 
  ShoppingCartIcon, 
  CodeBracketIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function RoleSelectPage() {
  const { user, updateRole, loading } = useAuth()
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<'customer' | 'developer' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signup')
    }
  }, [user, loading, router])

  const handleRoleSelect = async (role: 'customer' | 'developer') => {
    if (!user) return

    try {
      setSubmitting(true)
      await updateRole(role)

      if (role === 'customer') {
        toast.success('Welcome! Your account is ready - completely free!')
        setTimeout(() => router.push('/dashboard'), 1000)
      } else {
        toast.success('Welcome! Start your 7-day free trial...')
        setTimeout(() => router.push('/signup/developer-plans'), 1000)
      }
    } catch (error) {
      console.error('Error updating role:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center mb-6">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to AgentFlow.AI!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Tell us what brings you here so we can personalize your experience
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Customer Card */}
          <div
            className={`relative card p-8 cursor-pointer transition-all duration-200 ${
              selectedRole === 'customer' 
                ? 'ring-2 ring-primary-500 border-primary-500' 
                : 'hover:shadow-lg border-gray-200 dark:border-gray-700'
            }`}
            onClick={() => setSelectedRole('customer')}
          >
            {selectedRole === 'customer' && (
              <div className="absolute top-4 right-4">
                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCartIcon className="w-8 h-8 text-blue-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                I'm a Customer
              </h2>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                I want to buy and use automation agents to streamline my business operations
              </p>
              
              <div className="text-left space-y-3">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Free to join - no monthly fees
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Pay only for agents you purchase
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  One-click agent activation
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Customer support included
                </div>
              </div>
            </div>
          </div>

          {/* Developer Card */}
          <div
            className={`relative card p-8 cursor-pointer transition-all duration-200 ${
              selectedRole === 'developer' 
                ? 'ring-2 ring-primary-500 border-primary-500' 
                : 'hover:shadow-lg border-gray-200 dark:border-gray-700'
            }`}
            onClick={() => setSelectedRole('developer')}
          >
            {selectedRole === 'developer' && (
              <div className="absolute top-4 right-4">
                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <CodeBracketIcon className="w-8 h-8 text-purple-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                I'm a Developer
              </h2>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                I want to build and sell automation agents in the marketplace
              </p>
              
              <div className="text-left space-y-3">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  7-day free trial included
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Create & publish unlimited agents
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Keep 70% of all sales revenue
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Advanced analytics & tools
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        {selectedRole && (
          <div className="text-center mt-12">
            <button
              onClick={() => handleRoleSelect(selectedRole)}
              disabled={submitting}
              className="btn btn-primary px-12 py-3 text-lg"
            >
              {submitting ? 'Setting up your account...' : 'Continue'}
            </button>
            
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              You can always change this later in your account settings
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
