'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  PlayIcon,
  PauseIcon,
  ChartBarIcon,
  CogIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BoltIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Navbar from '@/components/layout/Navbar'
import toast from 'react-hot-toast'

// Mock data for demonstration - this would come from API in real app
const mockUserAgents = [
  {
    id: '1',
    agent: {
      id: '1',
      name: 'AI Email Writer',
      description: 'Generate personalized sales emails using AI.',
      cover_image: '/api/placeholder/80/60?text=AI+Email&bg=4F46E5',
      price_one_time: 49,
      price_monthly: null,
      required_integrations: ['Gmail', 'OpenAI']
    },
    active: true,
    purchased_at: '2024-01-15T10:30:00Z',
    last_run: '2024-01-20T14:22:00Z',
    run_count: 127,
    status: 'running'
  },
  {
    id: '2',
    agent: {
      id: '2',
      name: 'Slack CRM Sync',
      description: 'Sync customer data between Slack and CRM.',
      cover_image: '/api/placeholder/80/60?text=Slack+CRM&bg=10B981',
      price_one_time: null,
      price_monthly: 19,
      required_integrations: ['Slack', 'HubSpot']
    },
    active: false,
    purchased_at: '2024-01-10T09:15:00Z',
    last_run: '2024-01-18T11:45:00Z',
    run_count: 89,
    status: 'paused'
  },
  {
    id: '3',
    agent: {
      id: '3',
      name: 'Invoice Generator',
      description: 'Auto-generate invoices from CRM deals.',
      cover_image: '/api/placeholder/80/60?text=Invoice&bg=DC2626',
      price_one_time: 79,
      price_monthly: null,
      required_integrations: ['QuickBooks', 'Stripe']
    },
    active: true,
    purchased_at: '2024-01-12T16:20:00Z',
    last_run: '2024-01-20T15:10:00Z',
    run_count: 34,
    status: 'running'
  }
]

const mockRecentActivity = [
  { id: '1', agent_name: 'AI Email Writer', status: 'success', message: 'Generated 5 emails', created_at: '2024-01-20T14:22:00Z' },
  { id: '2', agent_name: 'Invoice Generator', status: 'success', message: 'Created invoice INV-001', created_at: '2024-01-20T15:10:00Z' },
  { id: '3', agent_name: 'AI Email Writer', status: 'error', message: 'OpenAI API limit exceeded', created_at: '2024-01-20T13:45:00Z' },
  { id: '4', agent_name: 'Invoice Generator', status: 'success', message: 'Sent invoice to client', created_at: '2024-01-20T12:30:00Z' }
]

export default function CustomerDashboard() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [userAgents, setUserAgents] = useState(mockUserAgents)
  const [recentActivity, setRecentActivity] = useState(mockRecentActivity)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
      return
    }

    if (!loading && profile?.role !== 'customer') {
      router.push('/dev-dashboard')
      return
    }
  }, [user, profile, loading, router])

  const toggleAgent = async (agentId: string, currentActive: boolean) => {
    try {
      // This would call the API in real app
      setUserAgents(prev => 
        prev.map(ua => 
          ua.id === agentId 
            ? { ...ua, active: !currentActive, status: !currentActive ? 'running' : 'paused' }
            : ua
        )
      )
      
      toast.success(`Agent ${!currentActive ? 'activated' : 'deactivated'} successfully`)
    } catch (error) {
      toast.error('Failed to update agent status')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  const stats = {
    totalAgents: userAgents.length,
    activeAgents: userAgents.filter(ua => ua.active).length,
    totalRuns: userAgents.reduce((sum, ua) => sum + ua.run_count, 0),
    creditsRemaining: profile?.credits || 0
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {profile.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your AI agents and monitor automation performance
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BoltIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Agents</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalAgents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlayIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.activeAgents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Runs</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalRuns}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCardIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Credits</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">${stats.creditsRemaining}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* My Agents */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Agents</h2>
                  <Link 
                    href="/marketplace" 
                    className="btn btn-outline text-sm"
                  >
                    Browse More
                  </Link>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {userAgents.length === 0 ? (
                  <div className="text-center py-12">
                    <BoltIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No agents yet</h3>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                      Purchase your first agent to get started with automation
                    </p>
                    <Link 
                      href="/marketplace" 
                      className="btn btn-primary mt-4"
                    >
                      Browse Agents
                    </Link>
                  </div>
                ) : (
                  userAgents.map((userAgent) => (
                    <div
                      key={userAgent.id}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4">
                        <img
                          src={userAgent.agent.cover_image}
                          alt={userAgent.agent.name}
                          className="w-16 h-12 rounded-lg object-cover bg-gray-200 dark:bg-gray-600"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {userAgent.agent.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {userAgent.agent.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                            <span>Purchased {formatDate(userAgent.purchased_at)}</span>
                            <span>•</span>
                            <span>{userAgent.run_count} runs</span>
                            {userAgent.last_run && (
                              <>
                                <span>•</span>
                                <span>Last run {formatTimeAgo(userAgent.last_run)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {/* Status Badge */}
                        <div className="flex items-center">
                          {userAgent.active ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircleIcon className="w-4 h-4 mr-1" />
                              <span className="text-xs font-medium">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-500">
                              <PauseIcon className="w-4 h-4 mr-1" />
                              <span className="text-xs font-medium">Paused</span>
                            </div>
                          )}
                        </div>

                        {/* Toggle Button */}
                        <button
                          onClick={() => toggleAgent(userAgent.id, userAgent.active)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            userAgent.active
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {userAgent.active ? (
                            <>
                              <PauseIcon className="w-3 h-3 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <PlayIcon className="w-3 h-3 mr-1" />
                              Activate
                            </>
                          )}
                        </button>

                        {/* Settings */}
                        <button className="text-gray-400 hover:text-gray-600">
                          <CogIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link 
                  href="/marketplace" 
                  className="btn btn-outline w-full justify-center"
                >
                  Browse Agents
                </Link>
                <Link 
                  href="/credentials" 
                  className="btn btn-outline w-full justify-center"
                >
                  Manage Credentials
                </Link>
                <button className="btn btn-outline w-full justify-center">
                  Buy Credits
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {activity.status === 'success' ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        ) : activity.status === 'error' ? (
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                        ) : (
                          <ClockIcon className="w-5 h-5 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-medium">{activity.agent_name}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTimeAgo(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {recentActivity.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No recent activity
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
