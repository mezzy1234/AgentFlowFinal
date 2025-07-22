'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import toast from 'react-hot-toast'

interface PurchaseDetails {
  agent: {
    id: string
    name: string
    description: string
    cover_image: string
    required_integrations: string[]
  }
  userAgent: {
    id: string
    active: boolean
    status: string
  }
  receipt: {
    amount_cents: number
    currency: string
    receipt_url?: string
  }
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchPurchaseDetails = async () => {
      const sessionId = searchParams.get('session_id')
      
      if (!sessionId) {
        setError('No session ID provided')
        setLoading(false)
        return
      }

      if (!user) {
        // Wait for auth to load
        return
      }

      try {
        const response = await fetch(`/api/purchase/details?session_id=${sessionId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch purchase details')
        }

        const data = await response.json()
        setPurchaseDetails(data)
      } catch (err) {
        console.error('Error fetching purchase details:', err)
        setError('Failed to load purchase details')
      } finally {
        setLoading(false)
      }
    }

    fetchPurchaseDetails()
  }, [user, searchParams])

  const handleSetupCredentials = () => {
    if (purchaseDetails) {
      router.push(`/customer-dashboard?setup=${purchaseDetails.userAgent.id}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error || !purchaseDetails) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              Purchase Error
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {error || 'Unable to load purchase details'}
            </p>
            <div className="mt-6">
              <Link
                href="/marketplace"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Marketplace
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
            Purchase Successful!
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Thank you for your purchase. Your agent is ready to be set up.
          </p>
        </div>

        <div className="mt-10 bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-start space-x-4">
              <img
                className="h-20 w-20 rounded-lg object-cover"
                src={purchaseDetails.agent.cover_image}
                alt={purchaseDetails.agent.name}
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {purchaseDetails.agent.name}
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {purchaseDetails.agent.description}
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Agent ID: {purchaseDetails.agent.id.slice(0, 8)}...
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    purchaseDetails.userAgent.status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {purchaseDetails.userAgent.status}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${(purchaseDetails.receipt.amount_cents / 100).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">
                  {purchaseDetails.receipt.currency.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Required Integrations */}
        {purchaseDetails.agent.required_integrations.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Required Integrations
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This agent requires the following integrations to be configured before it can be activated:
              </p>
              <div className="flex flex-wrap gap-2">
                {purchaseDetails.agent.required_integrations.map((integration) => (
                  <span
                    key={integration}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    {integration}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
            What's Next?
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>Set up the required integrations and credentials</li>
            <li>Test your agent configuration</li>
            <li>Activate your agent to start automation</li>
            <li>Monitor performance from your dashboard</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleSetupCredentials}
            className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Set Up Credentials
            <ArrowRightIcon className="ml-2 -mr-1 h-4 w-4" />
          </button>
          
          <Link
            href="/customer-dashboard"
            className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Dashboard
          </Link>

          {purchaseDetails.receipt.receipt_url && (
            <a
              href={purchaseDetails.receipt.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Download Receipt
            </a>
          )}
        </div>

        {/* Email Confirmation */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            📧 A confirmation email has been sent to your account with purchase details and receipt.
          </p>
        </div>
      </div>
    </div>
  )
}
