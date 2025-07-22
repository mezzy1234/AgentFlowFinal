'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, Package, Star, BarChart3, Calendar, Download } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalSales: number;
  activeUsers: number;
  avgRating: number;
  topAgent: string;
}

interface AgentPerformance {
  id: string;
  name: string;
  price: number;
  sales: number;
  revenue: number;
  rating: number;
  reviews: number;
  trend: 'up' | 'down' | 'stable';
}

interface RevenueHistory {
  date: string;
  revenue: number;
  sales: number;
}

export function DeveloperMonetizationDashboard() {
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalSales: 0,
    activeUsers: 0,
    avgRating: 0,
    topAgent: ''
  });
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [revenueHistory, setRevenueHistory] = useState<RevenueHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchDeveloperStats();
  }, [timeRange]);

  const fetchDeveloperStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch revenue stats
      const { data: purchases } = await supabase
        .from('purchase_receipts')
        .select(`
          amount,
          developer_share,
          created_at,
          agents!inner(name, developer_id)
        `)
        .eq('agents.developer_id', user.id);

      // Fetch agent performance
      const { data: agents } = await supabase
        .from('agents')
        .select(`
          id,
          name,
          price,
          rating,
          purchase_receipts(amount, developer_share, created_at),
          agent_reviews(rating)
        `)
        .eq('developer_id', user.id);

      // Process stats
      if (purchases) {
        const now = new Date();
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const totalRevenue = purchases.reduce((sum, p) => sum + (parseFloat(p.developer_share) || 0), 0);
        const monthlyRevenue = purchases
          .filter(p => new Date(p.created_at) >= monthAgo)
          .reduce((sum, p) => sum + (parseFloat(p.developer_share) || 0), 0);

        setStats(prev => ({
          ...prev,
          totalRevenue,
          monthlyRevenue,
          totalSales: purchases.length,
          topAgent: agents?.[0]?.name || 'No agents yet'
        }));

        // Process revenue history
        const historyMap = new Map<string, { revenue: number; sales: number }>();
        purchases.forEach(p => {
          const date = new Date(p.created_at).toISOString().split('T')[0];
          const existing = historyMap.get(date) || { revenue: 0, sales: 0 };
          historyMap.set(date, {
            revenue: existing.revenue + (parseFloat(p.developer_share) || 0),
            sales: existing.sales + 1
          });
        });

        const history = Array.from(historyMap.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date));
        
        setRevenueHistory(history);
      }

      // Process agent performance
      if (agents) {
        const performance: AgentPerformance[] = agents.map(agent => {
          const sales = agent.purchase_receipts?.length || 0;
          const revenue = agent.purchase_receipts?.reduce((sum: number, p: any) => 
            sum + (parseFloat(p.developer_share) || 0), 0) || 0;
          const reviews = agent.agent_reviews?.length || 0;
          const avgRating = reviews > 0 ? 
            agent.agent_reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews : 0;

          return {
            id: agent.id,
            name: agent.name,
            price: parseFloat(agent.price) || 0,
            sales,
            revenue,
            rating: avgRating,
            reviews,
            trend: 'stable' as const // Simplified - would calculate based on trend data
          };
        }).sort((a, b) => b.revenue - a.revenue);

        setAgentPerformance(performance);
      }

    } catch (error) {
      console.error('Failed to fetch developer stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    const csvData = agentPerformance.map(agent => ({
      'Agent Name': agent.name,
      'Price': `$${agent.price.toFixed(2)}`,
      'Sales': agent.sales,
      'Revenue': `$${agent.revenue.toFixed(2)}`,
      'Rating': agent.rating.toFixed(1),
      'Reviews': agent.reviews
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-performance-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Revenue Analytics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revenue Analytics</h2>
          <p className="text-gray-600 mt-1">Track your agent sales and earnings</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={exportData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Revenue Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 ml-1">+12.5% vs last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.monthlyRevenue.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-blue-600 ml-1">+8.2% vs last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-gray-600">Across all agents</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Rating</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgRating.toFixed(1)}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-gray-600">Customer satisfaction</span>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
          <BarChart3 className="h-5 w-5 text-gray-400" />
        </div>
        
        {revenueHistory.length > 0 ? (
          <div className="space-y-4">
            {/* Simple bar chart representation */}
            <div className="grid grid-cols-7 gap-2">
              {revenueHistory.slice(-7).map((day, index) => (
                <div key={day.date} className="text-center">
                  <div className="mb-2">
                    <div 
                      className="bg-blue-500 rounded-t mx-auto"
                      style={{
                        height: `${Math.max(8, (day.revenue / Math.max(...revenueHistory.map(d => d.revenue))) * 60)}px`,
                        width: '20px'
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-600">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-xs font-medium">${day.revenue.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No revenue data available yet
          </div>
        )}
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Agent Performance</h3>
          <p className="text-sm text-gray-600 mt-1">Revenue and engagement metrics for your agents</p>
        </div>
        
        {agentPerformance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reviews
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {agentPerformance.map((agent, index) => (
                  <tr key={agent.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-sm font-medium">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${agent.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agent.sales}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${agent.revenue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="ml-1 text-sm text-gray-900">{agent.rating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agent.reviews}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        agent.trend === 'up' ? 'bg-green-100 text-green-800' :
                        agent.trend === 'down' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      )}>
                        {agent.trend === 'up' ? '📈 Up' :
                         agent.trend === 'down' ? '📉 Down' :
                         '➡️ Stable'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No agents created yet</p>
            <p className="text-sm mt-1">Create your first agent to start earning revenue</p>
          </div>
        )}
      </div>

      {/* Pricing Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Revenue Share</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700 font-medium">You keep:</span>
                <span className="text-blue-900 font-bold">70%</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-blue-700 font-medium">Platform fee:</span>
                <span className="text-blue-900 font-bold">30%</span>
              </div>
            </div>
            <p className="text-xs text-gray-600">
              This competitive split ensures platform maintenance while maximizing your earnings
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Pricing Tips</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                Start with competitive pricing for new agents
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                Increase prices as you gain positive reviews
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                Bundle agents for higher-value offerings
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                Consider seasonal pricing strategies
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
