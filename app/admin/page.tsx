'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import Navbar from '@/components/layout/Navbar'
import { 
  UsersIcon, 
  CubeIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface AdminStats {
  totalUsers: number
  totalAgents: number
  totalRevenue: number
  monthlyRevenue: number
  activeAgents: number
  pendingAgents: number
  userGrowth: number
  revenueGrowth: number
}

interface AgentApproval {
  id: string
  name: string
  description: string
  developer_name: string
  developer_email: string
  cover_image: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  price_cents: number
}

interface RevenueData {
  date: string
  amount: number
  developer_amount: number
  platform_amount: number
}

interface UserData {
  id: string
  email: string
  full_name: string
  role: string
  plan: string
  total_spent: number
  agents_purchased: number
  last_active: string
  created_at: string
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [pendingAgents, setPendingAgents] = useState<AgentApproval[]>([])
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [userData, setUserData] = useState<UserData[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentApproval | null>(null)

  useEffect(() => {
    if (user?.role !== 'admin') {
      window.location.href = '/'
      return
    }
    loadAdminData()
  }, [user])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      
      // Load all admin data in parallel
      const [statsRes, agentsRes, revenueRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/agents/pending'),
        fetch('/api/admin/revenue'),
        fetch('/api/admin/users')
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json()
        setPendingAgents(agentsData.agents)
      }

      if (revenueRes.ok) {
        const revenueRes_data = await revenueRes.json()
        setRevenueData(revenueRes_data.revenue)
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUserData(usersData.users)
      }

    } catch (error) {
      console.error('Error loading admin data:', error)
      toast.error('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const handleAgentApproval = async (agentId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const response = await fetch(`/api/admin/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, reason })
      })

      if (!response.ok) {
        throw new Error('Failed to update agent status')
      }

      toast.success(`Agent ${action}d successfully`)
      await loadAdminData()
      setSelectedAgent(null)

    } catch (error) {
      console.error('Error updating agent:', error)
      toast.error(`Failed to ${action} agent`)
    }
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have permission to access the admin dashboard.
            </p>
          </div>
        </div>
      </div>
    )
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage AgentFlow.AI platform operations and analytics
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UsersIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Total Users
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {stats.totalUsers.toLocaleString()}
                        </div>
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          stats.userGrowth > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stats.userGrowth > 0 ? (
                            <ArrowUpIcon className="self-center flex-shrink-0 h-3 w-3" />
                          ) : (
                            <ArrowDownIcon className="self-center flex-shrink-0 h-3 w-3" />
                          )}
                          <span className="sr-only">
                            {stats.userGrowth > 0 ? 'Increased' : 'Decreased'} by
                          </span>
                          {Math.abs(stats.userGrowth)}%
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CubeIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Active Agents
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.activeAgents}/{stats.totalAgents}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Total Revenue
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                          ${(stats.totalRevenue / 100).toLocaleString()}
                        </div>
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          stats.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stats.revenueGrowth > 0 ? (
                            <ArrowUpIcon className="self-center flex-shrink-0 h-3 w-3" />
                          ) : (
                            <ArrowDownIcon className="self-center flex-shrink-0 h-3 w-3" />
                          )}
                          <span className="sr-only">
                            {stats.revenueGrowth > 0 ? 'Increased' : 'Decreased'} by
                          </span>
                          {Math.abs(stats.revenueGrowth)}%
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Pending Approval
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.pendingAgents}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'agents', name: 'Agent Approvals' },
              { id: 'revenue', name: 'Revenue Analytics' },
              { id: 'users', name: 'User Management' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Pending Agent Approvals
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400">
                {pendingAgents.length} pending
              </span>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
              <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                {pendingAgents.map((agent) => (
                  <li key={agent.id}>
                    <div className="px-4 py-4 flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <img
                          className="h-12 w-12 rounded-lg object-cover"
                          src={agent.cover_image}
                          alt={agent.name}
                        />
                        <div className="ml-4 min-w-0 flex-1">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {agent.name}
                            </p>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                              ${(agent.price_cents / 100).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            by {agent.developer_name} • {format(new Date(agent.created_at), 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                            {agent.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedAgent(agent)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Review
                        </button>
                        <button
                          onClick={() => handleAgentApproval(agent.id, 'approve')}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleAgentApproval(agent.id, 'reject')}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              
              {pendingAgents.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    No pending approvals
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    All agents have been reviewed.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Revenue Analytics
            </h2>
            
            {/* Revenue Chart Placeholder */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Monthly Revenue Trend
              </h3>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="text-center">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Revenue Chart
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Chart integration coming soon
                  </p>
                </div>
              </div>
            </div>

            {/* Revenue Table */}
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Recent Revenue
                </h3>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Total Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Developer Share
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Platform Share
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {revenueData.slice(0, 10).map((revenue, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {format(new Date(revenue.date), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          ${(revenue.amount / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          ${(revenue.developer_amount / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          ${(revenue.platform_amount / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              User Management
            </h2>

            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Total Spent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Agents
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Last Active
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {userData.slice(0, 20).map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.full_name || 'Unnamed User'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                              : user.role === 'developer'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {user.plan || 'Free'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          ${(user.total_spent / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.agents_purchased}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.last_active ? format(new Date(user.last_active), 'MMM d') : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Agent Review Modal */}
        {selectedAgent && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Agent Review
                  </h3>
                  <button
                    onClick={() => setSelectedAgent(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <img
                    className="w-full h-48 object-cover rounded-lg"
                    src={selectedAgent.cover_image}
                    alt={selectedAgent.name}
                  />
                  
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedAgent.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      by {selectedAgent.developer_name} ({selectedAgent.developer_email})
                    </p>
                    <p className="text-lg font-semibold text-green-600 mt-1">
                      ${(selectedAgent.price_cents / 100).toFixed(2)}
                    </p>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                      Description
                    </h5>
                    <p className="text-gray-700 dark:text-gray-300">
                      {selectedAgent.description}
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => handleAgentApproval(selectedAgent.id, 'reject')}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAgentApproval(selectedAgent.id, 'approve')}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Approve Agent
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
