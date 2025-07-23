'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Settings,
  Link,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Shield,
  Key,
  Globe,
  Webhook,
  Database,
  Cloud,
  Mail,
  MessageSquare,
  BarChart3,
  ShoppingCart,
  Calendar,
  FileText,
  Users,
  Zap,
  Star,
  Clock,
  Activity,
  Download,
  Upload,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Edit,
  MoreHorizontal,
  X
} from 'lucide-react';

// Types
export interface Integration {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url?: string;
  category: string;
  subcategory?: string;
  tags: string[];
  auth_type: 'none' | 'api_key' | 'oauth2' | 'basic_auth' | 'webhook' | 'custom';
  oauth_config?: {
    authorize_url: string;
    token_url: string;
    scope?: string;
    client_id_required: boolean;
  };
  webhook_config?: {
    supported_events: string[];
    signature_header?: string;
  };
  api_base_url?: string;
  documentation_url?: string;
  setup_instructions?: string;
  rate_limit?: string;
  supported_actions: string[];
  supported_triggers: string[];
  popularity_score: number;
  is_verified: boolean;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserIntegration {
  id: string;
  integration_id: string;
  user_id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'expired';
  auth_data_encrypted: string;
  last_sync_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  integration: Integration;
}

export interface IntegrationStats {
  total_integrations: number;
  connected_integrations: number;
  failed_integrations: number;
  popular_categories: Array<{ category: string; count: number; }>;
  recent_activity: number;
}

// Integration categories with icons
const CATEGORIES = {
  'Communication': { icon: MessageSquare, color: 'text-blue-600 bg-blue-100' },
  'CRM': { icon: Users, color: 'text-green-600 bg-green-100' },
  'E-commerce': { icon: ShoppingCart, color: 'text-purple-600 bg-purple-100' },
  'Email Marketing': { icon: Mail, color: 'text-orange-600 bg-orange-100' },
  'Analytics': { icon: BarChart3, color: 'text-indigo-600 bg-indigo-100' },
  'Productivity': { icon: Calendar, color: 'text-yellow-600 bg-yellow-100' },
  'File Storage': { icon: Database, color: 'text-gray-600 bg-gray-100' },
  'Social Media': { icon: Users, color: 'text-pink-600 bg-pink-100' },
  'Payment': { icon: ShoppingCart, color: 'text-emerald-600 bg-emerald-100' },
  'Document': { icon: FileText, color: 'text-red-600 bg-red-100' },
  'Cloud': { icon: Cloud, color: 'text-sky-600 bg-sky-100' },
  'Other': { icon: Grid3X3, color: 'text-slate-600 bg-slate-100' }
};

// Main Integration Dashboard
export function IntegrationDashboard({ userId }: { userId: string }) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [userIntegrations, setUserIntegrations] = useState<UserIntegration[]>([]);
  const [stats, setStats] = useState<IntegrationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAuth, setSelectedAuth] = useState<string>('all');
  const [showConnected, setShowConnected] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  useEffect(() => {
    fetchIntegrations();
    fetchUserIntegrations();
    fetchStats();
  }, [userId]);

  const fetchIntegrations = async () => {
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        category: selectedCategory,
        auth_type: selectedAuth,
        connected_only: showConnected.toString()
      });
      
      const response = await fetch(`/api/integrations?${params}`);
      if (!response.ok) throw new Error('Failed to fetch integrations');
      
      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserIntegrations = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/integrations`);
      if (!response.ok) throw new Error('Failed to fetch user integrations');
      
      const data = await response.json();
      setUserIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Error fetching user integrations:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/integrations/stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchIntegrations();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedCategory, selectedAuth, showConnected]);

  const isIntegrationConnected = (integrationId: string) => {
    return userIntegrations.some(ui => ui.integration_id === integrationId && ui.status === 'connected');
  };

  const getUserIntegration = (integrationId: string) => {
    return userIntegrations.find(ui => ui.integration_id === integrationId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600">Connect your favorite apps and services</p>
        </div>
        
        <button
          onClick={() => window.location.reload()}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Sync Integrations</span>
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Available"
            value={stats.total_integrations}
            subtitle="integrations"
            icon={Grid3X3}
            color="blue"
          />
          <StatsCard
            title="Connected"
            value={stats.connected_integrations}
            subtitle="active connections"
            icon={CheckCircle}
            color="green"
          />
          <StatsCard
            title="Failed"
            value={stats.failed_integrations}
            subtitle="need attention"
            icon={XCircle}
            color="red"
          />
          <StatsCard
            title="Recent Activity"
            value={stats.recent_activity}
            subtitle="in last 24h"
            icon={Activity}
            color="purple"
          />
        </div>
      )}

      {/* Filters & Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center space-x-4">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {Object.keys(CATEGORIES).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* Auth Type Filter */}
            <select
              value={selectedAuth}
              onChange={(e) => setSelectedAuth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Auth Types</option>
              <option value="oauth2">OAuth2</option>
              <option value="api_key">API Key</option>
              <option value="webhook">Webhook</option>
              <option value="none">No Auth</option>
              <option value="basic_auth">Basic Auth</option>
            </select>

            {/* Connected Only Toggle */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showConnected}
                onChange={(e) => setShowConnected(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Connected only</span>
            </label>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 border-l border-gray-300 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
        {loading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <IntegrationSkeleton key={i} viewMode={viewMode} />
          ))
        ) : integrations.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Integrations Found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              userIntegration={getUserIntegration(integration.id)}
              isConnected={isIntegrationConnected(integration.id)}
              viewMode={viewMode}
              onConnect={() => setSelectedIntegration(integration)}
              onManage={() => setSelectedIntegration(integration)}
            />
          ))
        )}
      </div>

      {/* Integration Setup Modal */}
      {selectedIntegration && (
        <IntegrationSetupModal
          integration={selectedIntegration}
          userIntegration={getUserIntegration(selectedIntegration.id)}
          onClose={() => setSelectedIntegration(null)}
          onSuccess={() => {
            setSelectedIntegration(null);
            fetchUserIntegrations();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    red: 'text-red-600 bg-red-100',
    purple: 'text-purple-600 bg-purple-100',
    yellow: 'text-yellow-600 bg-yellow-100'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

// Integration Card Component
function IntegrationCard({
  integration,
  userIntegration,
  isConnected,
  viewMode,
  onConnect,
  onManage
}: {
  integration: Integration;
  userIntegration?: UserIntegration;
  isConnected: boolean;
  viewMode: 'grid' | 'list';
  onConnect: () => void;
  onManage: () => void;
}) {
  const categoryConfig = CATEGORIES[integration.category as keyof typeof CATEGORIES] || CATEGORIES['Other'];
  const CategoryIcon = categoryConfig.icon;

  const getAuthIcon = (authType: string) => {
    switch (authType) {
      case 'oauth2': return Shield;
      case 'api_key': return Key;
      case 'webhook': return Webhook;
      case 'basic_auth': return Lock;
      case 'none': return Globe;
      default: return Settings;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'expired': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const AuthIcon = getAuthIcon(integration.auth_type);

  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Logo */}
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              {integration.logo_url ? (
                <img 
                  src={integration.logo_url} 
                  alt={integration.name}
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <CategoryIcon className="h-6 w-6 text-gray-500" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                {integration.is_verified && (
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                )}
                {integration.is_premium && (
                  <Star className="h-4 w-4 text-yellow-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${categoryConfig.color}`}>
                  <CategoryIcon className="h-3 w-3" />
                  <span>{integration.category}</span>
                </span>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <AuthIcon className="h-3 w-3" />
                  <span className="capitalize">{integration.auth_type.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Status */}
            {userIntegration && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(userIntegration.status)}`}>
                {userIntegration.status}
              </span>
            )}

            {/* Connect/Manage Button */}
            <button
              onClick={isConnected ? onManage : onConnect}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isConnected
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isConnected ? 'Manage' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
          {integration.logo_url ? (
            <img 
              src={integration.logo_url} 
              alt={integration.name}
              className="w-8 h-8 object-contain"
            />
          ) : (
            <CategoryIcon className="h-6 w-6 text-gray-500" />
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {integration.is_verified && (
            <CheckCircle className="h-4 w-4 text-blue-600" />
          )}
          {integration.is_premium && (
            <Star className="h-4 w-4 text-yellow-500" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 mb-2">{integration.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2">{integration.description}</p>
      </div>

      {/* Meta */}
      <div className="space-y-2 mb-4">
        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${categoryConfig.color}`}>
          <CategoryIcon className="h-3 w-3" />
          <span>{integration.category}</span>
        </span>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <AuthIcon className="h-3 w-3" />
            <span className="capitalize">{integration.auth_type.replace('_', ' ')}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Activity className="h-3 w-3" />
            <span>{integration.popularity_score}</span>
          </div>
        </div>
      </div>

      {/* Status & Action */}
      <div className="flex items-center justify-between">
        {userIntegration && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(userIntegration.status)}`}>
            {userIntegration.status}
          </span>
        )}
        
        <button
          onClick={isConnected ? onManage : onConnect}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isConnected
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isConnected ? 'Manage' : 'Connect'}
        </button>
      </div>
    </div>
  );
}

// Integration Skeleton
function IntegrationSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-300 rounded-lg" />
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-2" />
            <div className="h-3 bg-gray-300 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-300 rounded w-1/3" />
          </div>
          <div className="w-20 h-8 bg-gray-300 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-gray-300 rounded-lg" />
        <div className="w-4 h-4 bg-gray-300 rounded" />
      </div>
      <div className="mb-4">
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-300 rounded w-full" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-6 bg-gray-300 rounded w-1/2" />
        <div className="h-3 bg-gray-300 rounded w-1/3" />
      </div>
      <div className="h-8 bg-gray-300 rounded" />
    </div>
  );
}

// Integration Setup Modal (placeholder)
function IntegrationSetupModal({
  integration,
  userIntegration,
  onClose,
  onSuccess
}: {
  integration: Integration;
  userIntegration?: UserIntegration;
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Setup {integration.name}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              Integration setup functionality will be implemented here with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
              <li>OAuth2 flow handling</li>
              <li>API key input and validation</li>
              <li>Connection testing</li>
              <li>Permission configuration</li>
              <li>Webhook setup</li>
            </ul>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onSuccess}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
