'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  PlusIcon,
  CogIcon,
  PlayIcon,
  PauseIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import Navbar from '@/components/layout/Navbar'
import toast from 'react-hot-toast'

// Mock user agents data
const mockUserAgents = [
  {
    id: '1',
    agent_id: '1',
    name: 'AI Email Writer',
    description: 'Generate personalized sales emails using AI',
    status: 'running',
    active: true,
    purchase_date: '2024-01-15',
    last_run: '2024-01-22 14:30',
    runs_today: 12,
    success_rate: 95,
    required_integrations: ['Gmail', 'OpenAI'],
    connected_integrations: ['Gmail', 'OpenAI'],
    cover_image: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=150&h=100&fit=crop'
  },
  {
    id: '2',
    agent_id: '2',
    name: 'Slack CRM Sync',
    description: 'Sync customer data between Slack and CRM',
    status: 'ready',
    active: false,
    purchase_date: '2024-01-10',
    last_run: null,
    runs_today: 0,
    success_rate: null,
    required_integrations: ['Slack', 'HubSpot'],
    connected_integrations: ['Slack'],
    cover_image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=150&h=100&fit=crop'
  },
  {
    id: '3',
    agent_id: '3',
    name: 'Invoice Automation',
    description: 'Auto-generate invoices from Stripe payments',
    status: 'error',
    active: false,
    purchase_date: '2024-01-08',
    last_run: '2024-01-20 09:15',
    runs_today: 0,
    success_rate: 78,
    required_integrations: ['Stripe', 'QuickBooks', 'Gmail'],
    connected_integrations: ['Stripe', 'Gmail'],
    cover_image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=150&h=100&fit=crop'
  }
]

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [agents, setAgents] = useState(mockUserAgents)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
    } else if (user?.role === 'developer') {
      router.push('/dev')
    }
  }, [user, loading, router])

  const handleToggleAgent = async (agentId: string, currentActive: boolean) => {
    try {
      // Find the agent and check if all integrations are connected
      const agent = agents.find(a => a.id === agentId)
      if (!agent) return

      const missingIntegrations = agent.required_integrations.filter(
        integration => !agent.connected_integrations.includes(integration)
      )

      if (!currentActive && missingIntegrations.length > 0) {
        toast.error(`Please connect ${missingIntegrations.join(', ')} first`)
        return
      }

      // Update agent status
      setAgents(prev => prev.map(a => 
        a.id === agentId 
          ? { 
              ...a, 
              active: !currentActive,
              status: !currentActive ? 'running' : 'ready'
            }
          : a
      ))

      toast.success(
        !currentActive 
          ? 'Agent activated successfully!' 
          : 'Agent deactivated'
      )
    } catch (error) {
      toast.error('Failed to update agent')
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
    
    switch (status) {
      case 'running':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
      case 'ready':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />
      case 'ready':
        return <ClockIcon className="w-4 h-4 text-blue-500" />
      case 'error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-yellow-500" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const totalRuns = agents.reduce((sum, agent) => sum + agent.runs_today, 0)
  const activeAgents = agents.filter(agent => agent.active).length
  const avgSuccessRate = agents.filter(a => a.success_rate !== null).reduce(
    (sum, agent, _, arr) => sum + (agent.success_rate || 0) / arr.length, 0
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                My Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your automation agents
              </p>
            </div>
            
            <div className="mt-4 sm:mt-0">
              <Link
                href="/marketplace"
                className="btn btn-primary"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Browse Agents
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Agents
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {agents.length}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <PlayIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeAgents}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Runs Today
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalRuns}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Success Rate
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {avgSuccessRate.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Agents Grid */}
        {agents.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <PlusIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No agents yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Browse our marketplace to find agents that can automate your workflow
            </p>
            <Link
              href="/marketplace"
              className="btn btn-primary"
            >
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {agents.map(agent => (
              <div key={agent.id} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <img
                      src={agent.cover_image}
                      alt={agent.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {agent.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {agent.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(agent.status)}
                    <span className={getStatusBadge(agent.status)}>
                      {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Integration Status */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      Integrations
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {agent.connected_integrations.length}/{agent.required_integrations.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agent.required_integrations.map(integration => (
                      <span
                        key={integration}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                          agent.connected_integrations.includes(integration)
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {integration}
                        {agent.connected_integrations.includes(integration) ? ' ✓' : ' ✗'}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                {agent.status !== 'pending' && (
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Runs Today</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {agent.runs_today}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Success Rate</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {agent.success_rate ? `${agent.success_rate}%` : 'N/A'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Last Run */}
                {agent.last_run && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Last run: {new Date(agent.last_run).toLocaleString()}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleAgent(agent.id, agent.active)}
                      className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        agent.active
                          ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
                          : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
                      }`}
                    >
                      {agent.active ? (
                        <>
                          <PauseIcon className="w-4 h-4 mr-1" />
                          Turn Off
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-4 h-4 mr-1" />
                          Turn On
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/dashboard/agents/${agent.id}/logs`}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="View Logs"
                    >
                      <ChartBarIcon className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/dashboard/agents/${agent.id}/settings`}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Agent Settings"
                    >
                      <CogIcon className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
