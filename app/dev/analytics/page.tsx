'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import Navbar from '@/components/layout/Navbar'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  BoltIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import toast from 'react-hot-toast'

interface AnalyticsData {
  overview: {
    totalAgents: number
    totalRevenue: number
    totalCustomers: number
    totalExecutions: number
    revenueGrowth: number
    executionsGrowth: number
    conversionRate: number
  }
  revenue: {
    daily: Array<{ date: string; amount: number; transactions: number }>
    byAgent: Array<{ agentName: string; revenue: number; percentage: number }>
    monthlyTotal: number
    monthlyGrowth: number
  }
  agents: {
    performance: Array<{
      id: string
      name: string
      executions: number
      successRate: number
      revenue: number
      customers: number
      avgExecutionTime: number
      status: 'active' | 'issues' | 'low_performance'
    }>
    topPerforming: Array<{ name: string; metric: number; type: string }>
  }
  customers: {
    demographics: Array<{ plan: string; count: number; percentage: number }>
    retention: { rate: number; churn: number }
    satisfaction: { score: number; trend: 'up' | 'down' | 'stable' }
    lifecycle: Array<{ stage: string; count: number; conversion: number }>
  }
  executions: {
    hourly: Array<{ hour: number; successful: number; failed: number }>
    errors: Array<{ type: string; count: number; percentage: number }>
    avgResponseTime: number
    uptime: number
  }
}

interface DateRange {
  start: Date
  end: Date
  label: string
}

const DATE_RANGES: DateRange[] = [
  { start: subDays(new Date(), 7), end: new Date(), label: 'Last 7 days' },
  { start: subDays(new Date(), 30), end: new Date(), label: 'Last 30 days' },
  { start: subDays(new Date(), 90), end: new Date(), label: 'Last 3 months' },
]

export default function AnalyticsDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState(DATE_RANGES[1])
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (user?.role !== 'developer') {
      window.location.href = '/'
      return
    }
    loadAnalytics()
  }, [user, selectedDateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        start: selectedDateRange.start.toISOString(),
        end: selectedDateRange.end.toISOString(),
      })

      const response = await fetch(`/api/dev/analytics?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.role !== 'developer') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              This analytics dashboard is only available to developers.
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Analytics Dashboard
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Monitor your agents' performance and revenue
            </p>
          </div>
          
          {/* Date Range Selector */}
          <div className="mt-4 sm:mt-0">
            <select
              value={selectedDateRange.label}
              onChange={(e) => {
                const range = DATE_RANGES.find(r => r.label === e.target.value)
                if (range) setSelectedDateRange(range)
              }}
              className="block w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DATE_RANGES.map((range) => (
                <option key={range.label} value={range.label}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Overview Cards */}
        {analyticsData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Total Revenue
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                          ${(analyticsData.overview.totalRevenue / 100).toLocaleString()}
                        </div>
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          analyticsData.overview.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {analyticsData.overview.revenueGrowth >= 0 ? (
                            <TrendingUpIcon className="self-center flex-shrink-0 h-3 w-3" />
                          ) : (
                            <TrendingDownIcon className="self-center flex-shrink-0 h-3 w-3" />
                          )}
                          <span className="ml-1">
                            {Math.abs(analyticsData.overview.revenueGrowth).toFixed(1)}%
                          </span>
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
                    <BoltIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Total Executions
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {analyticsData.overview.totalExecutions.toLocaleString()}
                        </div>
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          analyticsData.overview.executionsGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {analyticsData.overview.executionsGrowth >= 0 ? (
                            <TrendingUpIcon className="self-center flex-shrink-0 h-3 w-3" />
                          ) : (
                            <TrendingDownIcon className="self-center flex-shrink-0 h-3 w-3" />
                          )}
                          <span className="ml-1">
                            {Math.abs(analyticsData.overview.executionsGrowth).toFixed(1)}%
                          </span>
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
                    <UsersIcon className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Active Customers
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {analyticsData.overview.totalCustomers}
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
                    <ChartBarIcon className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Conversion Rate
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {analyticsData.overview.conversionRate.toFixed(1)}%
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
              { id: 'revenue', name: 'Revenue' },
              { id: 'agents', name: 'Agent Performance' },
              { id: 'customers', name: 'Customers' },
              { id: 'executions', name: 'Executions' }
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
        {analyticsData && (
          <>
            {activeTab === 'agents' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Agent Performance
                </h2>
                
                <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Agent
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Executions
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Success Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Revenue
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Customers
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Avg Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {analyticsData.agents.performance.map((agent) => (
                          <tr key={agent.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {agent.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {agent.executions.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                agent.successRate >= 95 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : agent.successRate >= 85
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              }`}>
                                {agent.successRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              ${(agent.revenue / 100).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {agent.customers}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {agent.avgExecutionTime}ms
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                agent.status === 'active' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : agent.status === 'issues'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              }`}>
                                {agent.status === 'active' && <CheckCircleIcon className="h-3 w-3 mr-1" />}
                                {agent.status === 'issues' && <ExclamationCircleIcon className="h-3 w-3 mr-1" />}
                                {agent.status === 'low_performance' && <ClockIcon className="h-3 w-3 mr-1" />}
                                {agent.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                    Daily Revenue Trend
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

                {/* Revenue by Agent */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Revenue by Agent
                  </h3>
                  <div className="space-y-4">
                    {analyticsData.revenue.byAgent.map((agent, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {agent.agentName}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="text-sm text-gray-900 dark:text-white mr-4">
                            ${(agent.revenue / 100).toLocaleString()}
                          </div>
                          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${agent.percentage}%` }}
                            ></div>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 ml-2 w-12">
                            {agent.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'executions' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Execution Analytics
                </h2>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <ClockIcon className="h-6 w-6 text-blue-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                              Avg Response Time
                            </dt>
                            <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                              {analyticsData.executions.avgResponseTime}ms
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
                          <CheckCircleIcon className="h-6 w-6 text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                              Uptime
                            </dt>
                            <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                              {analyticsData.executions.uptime.toFixed(2)}%
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
                          <ExclamationCircleIcon className="h-6 w-6 text-red-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                              Error Rate
                            </dt>
                            <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                              {(analyticsData.executions.errors.reduce((sum, error) => sum + error.percentage, 0)).toFixed(1)}%
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Breakdown */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Common Errors
                  </h3>
                  <div className="space-y-3">
                    {analyticsData.executions.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {error.type}
                        </div>
                        <div className="flex items-center">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mr-4">
                            {error.count} occurrences
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                            {error.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
