'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  PlusIcon,
  ChartBarIcon,
  CreditCardIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Navbar from '@/components/layout/Navbar'
import toast from 'react-hot-toast'

// Mock data for demonstration - this would come from API in real app
const mockDeveloperAgents = [
  {
    id: '1',
    name: 'AI Email Writer',
    description: 'Generate personalized sales emails using AI.',
    cover_image: '/api/placeholder/80/60?text=AI+Email&bg=4F46E5',
    price_one_time: 49,
    price_monthly: null,
    published: true,
    featured: true,
    download_count: 124,
    rating_avg: 4.8,
    rating_count: 23,
    created_at: '2024-01-10T10:30:00Z',
    revenue: 6076, // 124 * 49
    active_users: 98
  },
  {
    id: '2',
    name: 'Slack CRM Sync',
    description: 'Sync customer data between Slack and CRM.',
    cover_image: '/api/placeholder/80/60?text=Slack+CRM&bg=10B981',
    price_one_time: null,
    price_monthly: 19,
    published: true,
    featured: false,
    download_count: 89,
    rating_avg: 4.6,
    rating_count: 15,
    created_at: '2024-01-05T14:20:00Z',
    revenue: 1691, // 89 * 19
    active_users: 67
  },
  {
    id: '3',
    name: 'Invoice Generator',
    description: 'Auto-generate invoices from CRM deals.',
    cover_image: '/api/placeholder/80/60?text=Invoice&bg=DC2626',
    price_one_time: 79,
    price_monthly: null,
    published: false,
    featured: false,
    download_count: 0,
    rating_avg: 0,
    rating_count: 0,
    created_at: '2024-01-20T09:45:00Z',
    revenue: 0,
    active_users: 0
  }
]

const mockRecentActivity = [
  { id: '1', type: 'purchase', agent_name: 'AI Email Writer', message: 'New purchase by customer@example.com', created_at: '2024-01-20T14:22:00Z', revenue: 49 },
  { id: '2', type: 'review', agent_name: 'Slack CRM Sync', message: '5-star review: "Amazing automation!"', created_at: '2024-01-20T13:45:00Z' },
  { id: '3', type: 'purchase', agent_name: 'AI Email Writer', message: 'New purchase by john@startup.com', created_at: '2024-01-20T11:30:00Z', revenue: 49 },
  { id: '4', type: 'support', agent_name: 'Slack CRM Sync', message: 'Support request: API connection issue', created_at: '2024-01-20T10:15:00Z' }
]

export default function DeveloperDashboard() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [agents, setAgents] = useState(mockDeveloperAgents)
  const [recentActivity, setRecentActivity] = useState(mockRecentActivity)
  const [trialDaysLeft, setTrialDaysLeft] = useState(7) // Mock trial days

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
      return
    }

    if (!loading && profile?.role !== 'developer') {
      router.push('/customer-dashboard')
      return
    }
  }, [user, profile, loading, router])

  const toggleAgentPublished = async (agentId: string, currentPublished: boolean) => {
    try {
      setAgents(prev => 
        prev.map(agent => 
          agent.id === agentId 
            ? { ...agent, published: !currentPublished }
            : agent
        )
      )
      
      toast.success(`Agent ${!currentPublished ? 'published' : 'unpublished'} successfully`)
    } catch (error) {
      toast.error('Failed to update agent status')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <div key={i} className="relative">
        {i < Math.floor(rating) ? (
          <StarIconSolid className="w-4 h-4 text-yellow-400" />
        ) : i < rating ? (
          <div className="relative">
            <StarIcon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${(rating - Math.floor(rating)) * 100}%` }}
            >
              <StarIconSolid className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
        ) : (
          <StarIcon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
        )}
      </div>
    ))
  }

  const stats = {
    totalAgents: agents.length,
    publishedAgents: agents.filter(a => a.published).length,
    totalDownloads: agents.reduce((sum, agent) => sum + agent.download_count, 0),
    totalRevenue: agents.reduce((sum, agent) => sum + agent.revenue, 0),
    averageRating: agents.filter(a => a.rating_count > 0).reduce((sum, agent) => sum + agent.rating_avg, 0) / 
                   Math.max(agents.filter(a => a.rating_count > 0).length, 1)
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Developer Dashboard 🚀
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Build, publish, and monetize AI automation agents
              </p>
            </div>
            
            {/* Free Trial Badge */}
            {trialDaysLeft > 0 && (
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="w-5 h-5" />
                  <div>
                    <p className="font-semibold">Free Trial</p>
                    <p className="text-sm">{trialDaysLeft} days left</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
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
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Published</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.publishedAgents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Downloads</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalDownloads}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Revenue</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  ${(stats.totalRevenue * 0.7).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">70% of ${stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <StarIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Rating</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.averageRating.toFixed(1)}
                </p>
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
                    href="/dev-dashboard/new-agent" 
                    className="btn btn-primary text-sm"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Create Agent
                  </Link>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {agents.length === 0 ? (
                  <div className="text-center py-12">
                    <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No agents yet</h3>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                      Create your first agent to start earning revenue
                    </p>
                    <Link 
                      href="/dev-dashboard/new-agent" 
                      className="btn btn-primary mt-4"
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Create Your First Agent
                    </Link>
                  </div>
                ) : (
                  agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <img
                            src={agent.cover_image}
                            alt={agent.name}
                            className="w-16 h-12 rounded-lg object-cover bg-gray-200 dark:bg-gray-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {agent.name}
                              </h3>
                              {agent.featured && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Featured
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  agent.published
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {agent.published ? 'Published' : 'Draft'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {agent.description}
                            </p>
                            
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                              <div className="flex items-center space-x-1">
                                {renderStars(agent.rating_avg)}
                                <span className="ml-1">
                                  {agent.rating_avg.toFixed(1)} ({agent.rating_count})
                                </span>
                              </div>
                              <span>•</span>
                              <span>{agent.download_count} downloads</span>
                              <span>•</span>
                              <span>Created {formatDate(agent.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Revenue */}
                          <div className="text-right mr-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              ${(agent.revenue * 0.7).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {agent.active_users} active
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-1">
                            <button
                              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                              title="View Details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                              title="Edit Agent"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleAgentPublished(agent.id, agent.published)}
                              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                agent.published
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {agent.published ? 'Unpublish' : 'Publish'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link 
                  href="/dev-dashboard/new-agent" 
                  className="btn btn-primary w-full justify-center"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create New Agent
                </Link>
                <Link 
                  href="/dev-dashboard/bundles" 
                  className="btn btn-outline w-full justify-center"
                >
                  Create Bundle
                </Link>
                <Link 
                  href="/dev-dashboard/analytics" 
                  className="btn btn-outline w-full justify-center"
                >
                  View Analytics
                </Link>
                <Link 
                  href="/dev-dashboard/payouts" 
                  className="btn btn-outline w-full justify-center"
                >
                  Manage Payouts
                </Link>
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
                        {activity.type === 'purchase' ? (
                          <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
                        ) : activity.type === 'review' ? (
                          <StarIcon className="w-5 h-5 text-yellow-500" />
                        ) : activity.type === 'support' ? (
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                        ) : (
                          <CheckCircleIcon className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-medium">{activity.agent_name}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {activity.message}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-400">
                            {formatTimeAgo(activity.created_at)}
                          </p>
                          {activity.revenue && (
                            <span className="text-xs font-medium text-green-600">
                              +${(activity.revenue * 0.7).toFixed(2)}
                            </span>
                          )}
                        </div>
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
