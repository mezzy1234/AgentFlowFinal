'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { CheckIcon, SparklesIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    description: 'Perfect for getting started',
    features: [
      '1 agent',
      'Basic analytics',
      'Community support',
      'Standard listing'
    ],
    limitations: [
      'Limited to 1 agent',
      'No bundle sales',
      'Basic stats only'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    priceId: 'price_pro_monthly', // You'll replace this with actual Stripe price ID
    description: 'For serious developers',
    features: [
      'Up to 10 agents',
      'Full analytics dashboard',
      'Bundle sales enabled',
      'Email support',
      'Priority listing'
    ],
    popular: true
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 49,
    priceId: 'price_elite_monthly', // You'll replace this with actual Stripe price ID
    description: 'Maximum growth potential',
    features: [
      'Unlimited agents',
      'Advanced analytics',
      'Featured placement',
      'Premium support',
      'Revenue insights',
      'Custom branding'
    ]
  }
]

export default function DeveloperPlansPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState('pro')
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signup')
    }
  }, [user, loading, router])

  const handleFreePlan = async () => {
    // For free plan, we just update the user's plan in the database
    try {
      setSubscribing(true)
      
      // Update user plan to free in Supabase
      // This would be implemented with your Supabase client
      
      toast.success('Welcome to AgentFlow.AI! Redirecting to your developer dashboard...')
      setTimeout(() => router.push('/dev'), 1500)
    } catch (error) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubscribing(false)
    }
  }

  const handlePaidPlan = async (plan: typeof plans[0]) => {
    // For paid plans, redirect to Stripe Checkout
    try {
      setSubscribing(true)
      
      // This will be implemented with your Stripe integration
      toast.success('Redirecting to secure checkout...')
      
      // Mock Stripe checkout redirect
      // In real implementation, this would create a Stripe checkout session
      setTimeout(() => {
        toast.success('Payment successful! Welcome to AgentFlow.AI')
        router.push('/dev')
      }, 2000)
      
    } catch (error) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubscribing(false)
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Developer Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Start building and selling agents today. Upgrade anytime as you grow.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative card p-8 ${
                plan.popular 
                  ? 'ring-2 ring-primary-500 border-primary-500' 
                  : selectedPlan === plan.id
                  ? 'ring-2 ring-gray-300 dark:ring-gray-600'
                  : ''
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                    <SparklesIcon className="w-4 h-4 mr-1" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {plan.description}
                </p>
                
                <div className="mb-8">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-600 dark:text-gray-400">/month</span>
                  )}
                </div>

                <ul className="space-y-3 text-left mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-400">{feature}</span>
                    </li>
                  ))}
                  
                  {plan.limitations?.map((limitation, index) => (
                    <li key={`limitation-${index}`} className="flex items-center text-sm text-gray-500 dark:text-gray-500">
                      <span className="w-4 h-4 mr-2 flex-shrink-0 text-center">-</span>
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    if (plan.price === 0) {
                      handleFreePlan()
                    } else {
                      handlePaidPlan(plan)
                    }
                  }}
                  disabled={subscribing}
                  className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                    plan.popular
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
                  }`}
                >
                  {subscribing ? 'Processing...' : 
                   plan.price === 0 ? 'Start Free' : `Subscribe for $${plan.price}/mo`}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                What happens if I exceed my agent limit?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                You'll be notified and can upgrade your plan. Existing agents continue to work.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                How do I get paid for agent sales?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Payments are processed via Stripe and deposited to your connected bank account weekly.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Is there a setup fee?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                No setup fees. The free plan is completely free, and paid plans are month-to-month.
              </p>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Need help choosing? Contact our team at{' '}
            <a href="mailto:support@agentflow.ai" className="text-primary-600 hover:text-primary-500">
              support@agentflow.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
