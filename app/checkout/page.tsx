'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import { CheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const agentId = searchParams.get('agent')
  const agentName = searchParams.get('name')
  const price = searchParams.get('price')

  const handleCheckout = async () => {
    setLoading(true)
    
    try {
      // In a real app, you'd call your Stripe API here
      // For now, we'll simulate the checkout process
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Redirect to success page
      router.push(`/purchase/success?agent=${agentId}&name=${encodeURIComponent(agentName || '')}`)
    } catch (error) {
      console.error('Checkout failed:', error)
      setLoading(false)
    }
  }

  if (!agentId || !agentName || !price) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-md mx-auto pt-20">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Checkout</h1>
            <p className="text-gray-600 mb-6">Missing required information for checkout.</p>
            <button
              onClick={() => router.push('/marketplace')}
              className="btn btn-primary"
            >
              Return to Marketplace
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-2xl mx-auto pt-8 px-4">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Marketplace
        </button>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Purchase</h1>
            <p className="text-gray-600 mb-8">You're one step away from activating your AI agent</p>

            {/* Agent Summary */}
            <div className="border border-gray-200 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{agentName}</h3>
                  <p className="text-sm text-gray-600">AI Agent License</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">${price}</div>
                  <div className="text-sm text-gray-600">One-time payment</div>
                </div>
              </div>
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                  Instant agent activation
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                  Full access to agent features
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                  30-day money-back guarantee
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                  Priority customer support
                </div>
              </div>
            </div>

            {/* Payment Form Placeholder */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">
                        <strong>Demo Mode:</strong> This is a demonstration checkout. No real payment will be processed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                    <input 
                      type="text" 
                      placeholder="4242 4242 4242 4242"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                      <input 
                        type="text" 
                        placeholder="MM/YY"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CVC</label>
                      <input 
                        type="text" 
                        placeholder="123"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
                    <input 
                      type="text" 
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  `Complete Purchase - $${price}`
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                By clicking "Complete Purchase", you agree to our{' '}
                <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> and{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
