'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Settings, Clock, Zap, WifiOff } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { cn } from '@/lib/utils';

interface IntegrationStatus {
  id: string;
  integration_name: string;
  status: 'connected' | 'expired' | 'error' | 'setup_incomplete';
  last_check_at: string;
  expires_at?: string;
  error_message?: string;
  auto_refresh_enabled: boolean;
}

interface IntegrationConfig {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  description: string;
  authType: 'oauth' | 'api_key';
  setupUrl: string;
}

const INTEGRATION_CONFIGS: Record<string, IntegrationConfig> = {
  slack: {
    name: 'slack',
    displayName: 'Slack',
    icon: '💬',
    color: 'bg-purple-500',
    description: 'Team communication and messaging',
    authType: 'oauth',
    setupUrl: '/integrations/slack'
  },
  gmail: {
    name: 'gmail',
    displayName: 'Gmail',
    icon: '📧',
    color: 'bg-red-500',
    description: 'Email management and automation',
    authType: 'oauth',
    setupUrl: '/integrations/gmail'
  },
  notion: {
    name: 'notion',
    displayName: 'Notion',
    icon: '📝',
    color: 'bg-gray-800',
    description: 'Knowledge management and documentation',
    authType: 'oauth',
    setupUrl: '/integrations/notion'
  },
  github: {
    name: 'github',
    displayName: 'GitHub',
    icon: '🐙',
    color: 'bg-gray-900',
    description: 'Code repository and project management',
    authType: 'oauth',
    setupUrl: '/integrations/github'
  },
  trello: {
    name: 'trello',
    displayName: 'Trello',
    icon: '📋',
    color: 'bg-blue-600',
    description: 'Project management and task tracking',
    authType: 'oauth',
    setupUrl: '/integrations/trello'
  }
};

export function IntegrationStatusDashboard() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchIntegrationStatus();
    
    // Set up real-time subscriptions
    const subscription = supabase
      .channel('integration_status_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'integration_status' 
        }, 
        () => {
          fetchIntegrationStatus();
        }
      )
      .subscribe();

    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchIntegrationStatus, 120000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const fetchIntegrationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('integration_status')
        .select('*')
        .eq('user_id', user.id)
        .order('integration_name');

      if (error) throw error;

      setIntegrations(data || []);
    } catch (error) {
      console.error('Failed to fetch integration status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshIntegration = async (integrationName: string) => {
    setRefreshing(prev => new Set([...Array.from(prev), integrationName]));
    
    try {
      const response = await fetch('/api/integrations/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integration: integrationName })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh integration');
      }

      await fetchIntegrationStatus();
    } catch (error) {
      console.error('Failed to refresh integration:', error);
    } finally {
      setRefreshing(prev => {
        const next = new Set(prev);
        next.delete(integrationName);
        return next;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'expired':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'setup_incomplete':
        return <WifiOff className="h-5 w-5 text-gray-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'expired':
        return 'Token Expired';
      case 'error':
        return 'Connection Error';
      case 'setup_incomplete':
        return 'Setup Required';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50';
      case 'expired':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'setup_incomplete':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const formatExpiresIn = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffInHours = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 0) return 'Expired';
    if (diffInHours < 24) return `${diffInHours}h remaining`;
    return `${Math.floor(diffInHours / 24)}d remaining`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Integration Status</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Get all configured integrations and merge with status
  const allIntegrations = Object.values(INTEGRATION_CONFIGS).map(config => {
    const status = integrations.find(i => i.integration_name === config.name);
    return {
      config,
      status: status || {
        id: 'setup-required',
        integration_name: config.name,
        status: 'setup_incomplete' as const,
        last_check_at: new Date().toISOString(),
        auto_refresh_enabled: false
      }
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Integration Status</h2>
          <p className="text-gray-600 mt-1">Monitor and manage your service connections</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchIntegrationStatus}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh All</span>
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Connected', 
            count: allIntegrations.filter(i => i.status.status === 'connected').length,
            color: 'text-green-600 bg-green-50 border-green-200'
          },
          { 
            label: 'Expired', 
            count: allIntegrations.filter(i => i.status.status === 'expired').length,
            color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
          },
          { 
            label: 'Errors', 
            count: allIntegrations.filter(i => i.status.status === 'error').length,
            color: 'text-red-600 bg-red-50 border-red-200'
          },
          { 
            label: 'Setup Required', 
            count: allIntegrations.filter(i => i.status.status === 'setup_incomplete').length,
            color: 'text-gray-600 bg-gray-50 border-gray-200'
          }
        ].map(stat => (
          <div key={stat.label} className={cn(
            "border rounded-lg p-4 text-center",
            stat.color
          )}>
            <div className="text-2xl font-bold">{stat.count}</div>
            <div className="text-sm font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Integration Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allIntegrations.map(({ config, status }) => (
          <div key={config.name} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg",
                  config.color
                )}>
                  {config.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{config.displayName}</h3>
                  <p className="text-sm text-gray-500">{config.description}</p>
                </div>
              </div>
              {getStatusIcon(status.status)}
            </div>

            <div className="mt-4 space-y-3">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                  getStatusColor(status.status)
                )}>
                  {getStatusText(status.status)}
                </span>
                {status.status === 'connected' && status.auto_refresh_enabled && (
                  <div title="Auto-refresh enabled">
                    <Zap className="h-4 w-4 text-blue-500" />
                  </div>
                )}
              </div>

              {/* Status Details */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Last checked:</span>
                  <span>{formatTimeAgo(status.last_check_at)}</span>
                </div>
                {status.expires_at && (
                  <div className="flex justify-between">
                    <span>Token expires:</span>
                    <span className={status.status === 'expired' ? 'text-red-600' : ''}>
                      {formatExpiresIn(status.expires_at)}
                    </span>
                  </div>
                )}
                {status.error_message && (
                  <div className="text-red-600 text-xs bg-red-50 p-2 rounded">
                    {status.error_message}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                {status.status === 'setup_incomplete' ? (
                  <a
                    href={config.setupUrl}
                    className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-center"
                  >
                    <Settings className="h-4 w-4 inline mr-2" />
                    Setup
                  </a>
                ) : (
                  <>
                    <button
                      onClick={() => refreshIntegration(config.name)}
                      disabled={refreshing.has(config.name)}
                      className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {refreshing.has(config.name) ? (
                        <RefreshCw className="h-4 w-4 inline mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 inline mr-2" />
                      )}
                      Refresh
                    </button>
                    <a
                      href={config.setupUrl}
                      className="bg-gray-100 text-gray-700 text-sm font-medium py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Connection Health Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">💡 Connection Health Tips</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Tokens typically expire every 1-3 months depending on the service</li>
          <li>• Enable auto-refresh for seamless agent execution</li>
          <li>• Check error messages for specific connection issues</li>
          <li>• Reauthorize integrations if you changed passwords recently</li>
        </ul>
      </div>
    </div>
  );
}
