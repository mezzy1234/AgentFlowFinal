'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Activity, 
  Calendar, 
  Download, 
  Filter, 
  RefreshCw,
  Eye,
  MousePointer,
  ShoppingCart,
  Zap,
  Clock,
  MapPin,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Star,
  MessageCircle,
  Share2,
  Target,
  PieChart,
  LineChart,
  BarChart,
  AreaChart,
  Layers,
  Settings,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  ExternalLink,
  Search,
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  FileText,
  Mail
} from 'lucide-react';

// Types
export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  unit?: string;
  format?: 'number' | 'currency' | 'percentage' | 'time';
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface AnalyticsFilter {
  dateRange: {
    start: Date;
    end: Date;
    period: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
  segments: {
    userType?: 'all' | 'buyers' | 'sellers';
    geography?: string[];
    deviceType?: 'all' | 'desktop' | 'mobile' | 'tablet';
    trafficSource?: string[];
  };
  agentCategories?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
}

export interface ConversionFunnel {
  stage: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface GeographicData {
  country: string;
  countryCode: string;
  users: number;
  revenue: number;
  conversionRate: number;
}

export interface UserBehaviorFlow {
  fromPage: string;
  toPage: string;
  users: number;
  percentage: number;
}

export interface CohortData {
  cohort: string;
  size: number;
  retention: number[];
  revenue: number[];
}

// Sample data generators
const generateTimeSeriesData = (days: number, baseValue: number, variance: number): TimeSeriesData[] => {
  const data = [];
  let currentValue = baseValue;
  
  for (let i = 0; i < days; i++) {
    currentValue += (Math.random() - 0.5) * variance;
    data.push({
      timestamp: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000),
      value: Math.max(0, currentValue)
    });
  }
  
  return data;
};

// Key Metrics Dashboard
export function AnalyticsDashboard({
  metrics,
  filter,
  onFilterChange
}: {
  metrics: AnalyticsMetric[];
  filter: AnalyticsFilter;
  onFilterChange: (filter: Partial<AnalyticsFilter>) => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d' | '90d'>('30d');

  const formatMetricValue = (metric: AnalyticsMetric) => {
    const { value, format = 'number', unit = '' } = metric;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'time':
        return `${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, '0')}`;
      default:
        return `${value.toLocaleString()}${unit ? ` ${unit}` : ''}`;
    }
  };

  const getChangeIcon = (changeType?: string) => {
    switch (changeType) {
      case 'increase': return ArrowUp;
      case 'decrease': return ArrowDown;
      default: return Minus;
    }
  };

  const getChangeColor = (changeType?: string) => {
    switch (changeType) {
      case 'increase': return 'text-green-600';
      case 'decrease': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Insights and performance metrics for your platform</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center border border-gray-300 rounded-lg">
            {(['24h', '7d', '30d', '90d'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 text-sm ${
                  selectedPeriod === period
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const ChangeIcon = getChangeIcon(metric.changeType);
          const changeColor = getChangeColor(metric.changeType);
          
          return (
            <div key={metric.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">{metric.name}</h3>
                <Info className="h-4 w-4 text-gray-400" />
              </div>
              
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatMetricValue(metric)}
                  </div>
                  
                  {metric.change !== undefined && (
                    <div className={`flex items-center space-x-1 text-sm ${changeColor}`}>
                      <ChangeIcon className="h-3 w-3" />
                      <span>{Math.abs(metric.change)}%</span>
                      <span className="text-gray-500">vs. last period</span>
                    </div>
                  )}
                </div>
                
                {/* Mini chart placeholder */}
                <div className="w-16 h-10 flex items-end space-x-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-blue-200 rounded-sm flex-1"
                      style={{ 
                        height: `${20 + Math.random() * 20}px`,
                        opacity: 0.3 + Math.random() * 0.7 
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <UserGrowthChart />
        <ConversionFunnelChart />
        <GeographicHeatmap />
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopPerformingAgents />
        <RecentActivity />
      </div>
    </div>
  );
}

// Revenue Chart Component
export function RevenueChart() {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  
  // Sample revenue data
  const revenueData = generateTimeSeriesData(30, 5000, 1000);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Revenue Trends</h3>
        
        <div className="flex items-center space-x-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          
          <div className="flex items-center border border-gray-300 rounded">
            {([
              { type: 'area' as const, icon: AreaChart },
              { type: 'line' as const, icon: LineChart },
              { type: 'bar' as const, icon: BarChart }
            ]).map(({ type, icon: Icon }) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`p-1 ${
                  chartType === type 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-2" />
          <p>Revenue Chart</p>
          <p className="text-sm">Chart library integration needed</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">$124,563</div>
          <div className="text-sm text-gray-600">Total Revenue</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">+12.5%</div>
          <div className="text-sm text-gray-600">Growth Rate</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">$4,152</div>
          <div className="text-sm text-gray-600">Avg Daily</div>
        </div>
      </div>
    </div>
  );
}

// User Growth Chart
export function UserGrowthChart() {
  const [metric, setMetric] = useState<'users' | 'agents' | 'transactions'>('users');
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Growth Metrics</h3>
        
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as any)}
          className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="users">New Users</option>
          <option value="agents">New Agents</option>
          <option value="transactions">Transactions</option>
        </select>
      </div>

      <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center mb-6">
        <div className="text-center text-gray-500">
          <TrendingUp className="h-12 w-12 mx-auto mb-2" />
          <p>Growth Chart</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">This Month</span>
          </div>
          <div className="text-xl font-bold text-blue-900">2,847</div>
          <div className="text-sm text-blue-700">+18% vs last month</div>
        </div>
        
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <Target className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">Goal Progress</span>
          </div>
          <div className="text-xl font-bold text-green-900">87%</div>
          <div className="text-sm text-green-700">On track to hit target</div>
        </div>
      </div>
    </div>
  );
}

// Conversion Funnel Chart
export function ConversionFunnelChart() {
  const funnelData: ConversionFunnel[] = [
    { stage: 'Visitors', users: 10000, conversionRate: 100, dropoffRate: 0 },
    { stage: 'Signups', users: 2500, conversionRate: 25, dropoffRate: 75 },
    { stage: 'Agent Creators', users: 750, conversionRate: 7.5, dropoffRate: 17.5 },
    { stage: 'First Sale', users: 225, conversionRate: 2.25, dropoffRate: 5.25 },
    { stage: 'Repeat Customers', users: 135, conversionRate: 1.35, dropoffRate: 0.9 }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Conversion Funnel</h3>
        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          View Details
        </button>
      </div>

      <div className="space-y-4">
        {funnelData.map((stage, index) => {
          const width = (stage.users / funnelData[0].users) * 100;
          
          return (
            <div key={stage.stage} className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{stage.stage}</span>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {stage.users.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {stage.conversionRate}%
                  </span>
                </div>
              </div>
              
              <div className="relative">
                <div className="w-full h-8 bg-gray-100 rounded">
                  <div
                    className={`h-8 rounded flex items-center justify-center text-white text-sm font-medium ${
                      index === 0 ? 'bg-blue-500' :
                      index === 1 ? 'bg-green-500' :
                      index === 2 ? 'bg-yellow-500' :
                      index === 3 ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${width}%` }}
                  >
                    {width > 30 && `${stage.conversionRate}%`}
                  </div>
                </div>
                
                {index < funnelData.length - 1 && stage.dropoffRate > 0 && (
                  <div className="absolute -bottom-6 right-0 text-xs text-red-600">
                    -{stage.dropoffRate}% drop-off
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">1.35%</div>
          <div className="text-sm text-gray-600">Overall Conversion Rate</div>
        </div>
      </div>
    </div>
  );
}

// Geographic Heatmap
export function GeographicHeatmap() {
  const [metric, setMetric] = useState<'users' | 'revenue'>('users');
  
  const geoData: GeographicData[] = [
    { country: 'United States', countryCode: 'US', users: 12500, revenue: 45000, conversionRate: 3.2 },
    { country: 'United Kingdom', countryCode: 'GB', users: 3200, revenue: 12000, conversionRate: 2.8 },
    { country: 'Germany', countryCode: 'DE', users: 2800, revenue: 11500, conversionRate: 3.1 },
    { country: 'Canada', countryCode: 'CA', users: 2100, revenue: 8500, conversionRate: 2.9 },
    { country: 'Australia', countryCode: 'AU', users: 1800, revenue: 7200, conversionRate: 3.0 },
    { country: 'France', countryCode: 'FR', users: 1500, revenue: 6800, conversionRate: 2.7 },
    { country: 'Japan', countryCode: 'JP', users: 1200, revenue: 5400, conversionRate: 2.5 },
    { country: 'Netherlands', countryCode: 'NL', users: 980, revenue: 4200, conversionRate: 3.4 }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Geographic Distribution</h3>
        
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as any)}
          className="text-sm border border-gray-300 rounded px-3 py-1"
        >
          <option value="users">Users</option>
          <option value="revenue">Revenue</option>
        </select>
      </div>

      {/* World map placeholder */}
      <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center mb-6">
        <div className="text-center text-gray-500">
          <Globe className="h-12 w-12 mx-auto mb-2" />
          <p>World Map Visualization</p>
          <p className="text-sm">Map library integration needed</p>
        </div>
      </div>

      {/* Top countries list */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Top Countries</h4>
        {geoData.slice(0, 5).map((country, index) => {
          const value = metric === 'users' ? country.users : country.revenue;
          const maxValue = Math.max(...geoData.map(c => metric === 'users' ? c.users : c.revenue));
          const percentage = (value / maxValue) * 100;
          
          return (
            <div key={country.countryCode} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-6 text-center text-sm text-gray-500">
                  #{index + 1}
                </div>
                <span className="text-2xl">{getCountryFlag(country.countryCode)}</span>
                <span className="text-sm font-medium text-gray-900">
                  {country.country}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-24 h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 bg-blue-500 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  {metric === 'users' 
                    ? value.toLocaleString() 
                    : `$${(value / 1000).toFixed(1)}k`
                  }
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Top Performing Agents Table
export function TopPerformingAgents() {
  const topAgents = [
    { id: '1', name: 'Data Analyzer Pro', sales: 342, revenue: 15420, rating: 4.9, category: 'Analytics' },
    { id: '2', name: 'Social Media Bot', sales: 298, revenue: 8940, rating: 4.8, category: 'Marketing' },
    { id: '3', name: 'Code Generator', sales: 256, revenue: 12800, rating: 4.7, category: 'Development' },
    { id: '4', name: 'Email Assistant', sales: 234, revenue: 7020, rating: 4.6, category: 'Productivity' },
    { id: '5', name: 'Image Processor', sales: 189, revenue: 9450, rating: 4.8, category: 'Media' }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Top Performing Agents</h3>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Agent
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {topAgents.map((agent) => (
              <tr key={agent.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {agent.name}
                    </div>
                    <div className="text-sm text-gray-500">{agent.category}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {agent.sales.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${agent.revenue.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-900">{agent.rating}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Recent Activity Feed
export function RecentActivity() {
  const activities = [
    { id: '1', type: 'purchase', user: 'John Doe', agent: 'Data Analyzer Pro', time: '2 minutes ago', amount: 49.99 },
    { id: '2', type: 'review', user: 'Jane Smith', agent: 'Social Media Bot', time: '15 minutes ago', rating: 5 },
    { id: '3', type: 'signup', user: 'Mike Johnson', time: '32 minutes ago' },
    { id: '4', type: 'publish', user: 'Sarah Wilson', agent: 'Email Assistant', time: '1 hour ago' },
    { id: '5', type: 'purchase', user: 'Alex Brown', agent: 'Code Generator', time: '2 hours ago', amount: 99.99 }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'purchase': return ShoppingCart;
      case 'review': return Star;
      case 'signup': return Users;
      case 'publish': return Zap;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'text-green-600 bg-green-100';
      case 'review': return 'text-yellow-600 bg-yellow-100';
      case 'signup': return 'text-blue-600 bg-blue-100';
      case 'publish': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
      </div>

      <div className="divide-y divide-gray-200">
        {activities.map((activity) => {
          const Icon = getActivityIcon(activity.type);
          const colorClass = getActivityColor(activity.type);
          
          return (
            <div key={activity.id} className="px-6 py-4 flex items-center space-x-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                <Icon className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.user}</span>
                  {activity.type === 'purchase' && (
                    <span> purchased <span className="font-medium">{activity.agent}</span> for ${activity.amount}</span>
                  )}
                  {activity.type === 'review' && (
                    <span> left a {activity.rating}-star review for <span className="font-medium">{activity.agent}</span></span>
                  )}
                  {activity.type === 'signup' && <span> signed up</span>}
                  {activity.type === 'publish' && (
                    <span> published <span className="font-medium">{activity.agent}</span></span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-6 py-4 border-t border-gray-200">
        <button className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium">
          View All Activity
        </button>
      </div>
    </div>
  );
}

// Helper function for country flags (simplified)
const getCountryFlag = (countryCode: string): string => {
  const flags: Record<string, string> = {
    'US': '🇺🇸',
    'GB': '🇬🇧',
    'DE': '🇩🇪',
    'CA': '🇨🇦',
    'AU': '🇦🇺',
    'FR': '🇫🇷',
    'JP': '🇯🇵',
    'NL': '🇳🇱'
  };
  return flags[countryCode] || '🌍';
};

// Cohort Analysis Component
export function CohortAnalysis() {
  const cohortData: CohortData[] = [
    {
      cohort: '2024-01',
      size: 1000,
      retention: [100, 45, 32, 28, 24, 22, 20],
      revenue: [5000, 2250, 1600, 1400, 1200, 1100, 1000]
    },
    {
      cohort: '2024-02',
      size: 1200,
      retention: [100, 48, 35, 30, 26, 24],
      revenue: [6000, 2880, 2100, 1800, 1560, 1440]
    },
    {
      cohort: '2024-03',
      size: 1500,
      retention: [100, 52, 38, 33, 29],
      revenue: [7500, 3900, 2850, 2475, 2175]
    }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Cohort Analysis</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-sm font-medium text-gray-500 pb-2">Cohort</th>
              <th className="text-left text-sm font-medium text-gray-500 pb-2">Size</th>
              <th className="text-center text-sm font-medium text-gray-500 pb-2">Month 0</th>
              <th className="text-center text-sm font-medium text-gray-500 pb-2">Month 1</th>
              <th className="text-center text-sm font-medium text-gray-500 pb-2">Month 2</th>
              <th className="text-center text-sm font-medium text-gray-500 pb-2">Month 3</th>
              <th className="text-center text-sm font-medium text-gray-500 pb-2">Month 4</th>
              <th className="text-center text-sm font-medium text-gray-500 pb-2">Month 5</th>
              <th className="text-center text-sm font-medium text-gray-500 pb-2">Month 6</th>
            </tr>
          </thead>
          <tbody>
            {cohortData.map((cohort) => (
              <tr key={cohort.cohort} className="border-t border-gray-200">
                <td className="py-2 text-sm font-medium text-gray-900">{cohort.cohort}</td>
                <td className="py-2 text-sm text-gray-900">{cohort.size}</td>
                {Array.from({ length: 7 }).map((_, index) => {
                  const retention = cohort.retention[index];
                  const intensity = retention ? retention / 100 : 0;
                  
                  return (
                    <td key={index} className="py-2 text-center">
                      {retention !== undefined ? (
                        <div
                          className="inline-block px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `rgba(59, 130, 246, ${intensity * 0.8})`,
                            color: intensity > 0.5 ? 'white' : '#1f2937'
                          }}
                        >
                          {retention.toFixed(0)}%
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
