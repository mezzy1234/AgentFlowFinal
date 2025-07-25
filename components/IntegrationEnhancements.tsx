'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Zap, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  RefreshCw,
  ExternalLink,
  Key,
  Globe,
  MessageSquare,
  Bell,
  Database,
  Mail,
  Calendar,
  FileText,
  Image,
  Code,
  BarChart,
  Shield,
  Webhook,
  X,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';

// Types
export interface Integration {
  id: string;
  name: string;
  service: string;
  type: 'oauth' | 'api_key' | 'webhook' | 'database';
  status: 'connected' | 'disconnected' | 'error' | 'expired' | 'pending';
  health_score: number; // 0-100
  last_sync: Date;
  created_at: Date;
  
  // Configuration
  config: {
    api_key?: string;
    client_id?: string;
    client_secret?: string;
    webhook_url?: string;
    database_url?: string;
    custom_fields?: Record<string, any>;
  };
  
  // Health metrics
  metrics: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    average_response_time: number;
    uptime_percentage: number;
    last_error?: string;
    last_error_at?: Date;
  };
  
  // Capabilities
  capabilities: string[]; // e.g., ['read', 'write', 'webhook', 'real_time']
  triggers: IntegrationTrigger[];
}

export interface IntegrationTrigger {
  id: string;
  integration_id: string;
  event_type: string;
  webhook_url?: string;
  is_active: boolean;
  created_at: Date;
  config: Record<string, any>;
}

export interface IntegrationTemplate {
  service: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  type: 'oauth' | 'api_key' | 'webhook' | 'database';
  capabilities: string[];
  config_fields: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'url' | 'select' | 'textarea';
    required: boolean;
    placeholder?: string;
    options?: { value: string; label: string }[];
  }[];
  auth_url?: string;
  docs_url: string;
  setup_guide: string[];
}

// Integration templates configuration
const INTEGRATION_TEMPLATES: IntegrationTemplate[] = [
  {
    service: 'slack',
    name: 'Slack',
    description: 'Send messages and notifications to Slack channels',
    icon: 'MessageSquare',
    color: '#4A154B',
    type: 'oauth',
    capabilities: ['messaging', 'channels', 'users', 'files'],
    config_fields: [
      { key: 'workspace', label: 'Workspace URL', type: 'url', required: true, placeholder: 'https://yourworkspace.slack.com' }
    ],
    auth_url: '/api/integrations/slack/auth',
    docs_url: 'https://api.slack.com/docs',
    setup_guide: [
      'Go to Slack App Directory and create a new app',
      'Configure OAuth & Permissions with required scopes',
      'Add your app to your workspace',
      'Copy the Bot User OAuth Token'
    ]
  },
  {
    service: 'discord',
    name: 'Discord',
    description: 'Create Discord bots and send messages to channels',
    icon: 'MessageSquare',
    color: '#5865F2',
    type: 'api_key',
    capabilities: ['messaging', 'channels', 'webhooks', 'embeds'],
    config_fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', required: true, placeholder: 'Bot token from Discord Developer Portal' },
      { key: 'server_id', label: 'Server ID', type: 'text', required: false, placeholder: 'Discord server ID' }
    ],
    docs_url: 'https://discord.com/developers/docs',
    setup_guide: [
      'Go to Discord Developer Portal',
      'Create a new application and bot',
      'Copy the bot token',
      'Invite bot to your server with required permissions'
    ]
  },
  {
    service: 'webhooks',
    name: 'Custom Webhooks',
    description: 'Send HTTP requests to any webhook endpoint',
    icon: 'Webhook',
    color: '#6366F1',
    type: 'webhook',
    capabilities: ['http_post', 'http_get', 'custom_headers', 'retries'],
    config_fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', required: true, placeholder: 'https://api.example.com/webhook' },
      { key: 'secret', label: 'Secret/API Key', type: 'password', required: false, placeholder: 'Optional authentication' },
      { key: 'method', label: 'HTTP Method', type: 'select', required: true, options: [
        { value: 'POST', label: 'POST' },
        { value: 'GET', label: 'GET' },
        { value: 'PUT', label: 'PUT' },
        { value: 'PATCH', label: 'PATCH' }
      ]},
      { key: 'headers', label: 'Custom Headers', type: 'textarea', required: false, placeholder: 'JSON object with custom headers' }
    ],
    docs_url: 'https://webhook.site/docs',
    setup_guide: [
      'Prepare your webhook endpoint to receive HTTP requests',
      'Configure authentication if required',
      'Test with a simple POST request',
      'Set up proper error handling'
    ]
  },
  {
    service: 'email',
    name: 'Email (SMTP)',
    description: 'Send emails via SMTP server',
    icon: 'Mail',
    color: '#EF4444',
    type: 'api_key',
    capabilities: ['send_email', 'html_content', 'attachments', 'templates'],
    config_fields: [
      { key: 'smtp_host', label: 'SMTP Host', type: 'text', required: true, placeholder: 'smtp.gmail.com' },
      { key: 'smtp_port', label: 'SMTP Port', type: 'text', required: true, placeholder: '587' },
      { key: 'username', label: 'Username/Email', type: 'text', required: true, placeholder: 'your-email@gmail.com' },
      { key: 'password', label: 'Password/App Password', type: 'password', required: true, placeholder: 'Your email password or app password' },
      { key: 'from_name', label: 'From Name', type: 'text', required: false, placeholder: 'Your Name' }
    ],
    docs_url: 'https://nodemailer.com/smtp/',
    setup_guide: [
      'Get SMTP credentials from your email provider',
      'For Gmail, enable 2FA and create an App Password',
      'Test connection with simple email',
      'Configure from address and display name'
    ]
  },
  {
    service: 'database',
    name: 'Database',
    description: 'Connect to PostgreSQL, MySQL, or other databases',
    icon: 'Database',
    color: '#10B981',
    type: 'database',
    capabilities: ['read', 'write', 'transactions', 'migrations'],
    config_fields: [
      { key: 'database_type', label: 'Database Type', type: 'select', required: true, options: [
        { value: 'postgresql', label: 'PostgreSQL' },
        { value: 'mysql', label: 'MySQL' },
        { value: 'sqlite', label: 'SQLite' }
      ]},
      { key: 'connection_string', label: 'Connection String', type: 'password', required: true, placeholder: 'postgresql://user:pass@host:5432/dbname' }
    ],
    docs_url: 'https://www.postgresql.org/docs/',
    setup_guide: [
      'Ensure database server is accessible',
      'Create database user with appropriate permissions',
      'Test connection string format',
      'Configure SSL if required'
    ]
  }
];

// Integration health bar component
export function IntegrationHealthBar({ 
  integration,
  showDetails = false 
}: {
  integration: Integration;
  showDetails?: boolean;
}) {
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusIcon = () => {
    switch (integration.status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected': return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'expired': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${INTEGRATION_TEMPLATES.find(t => t.service === integration.service)?.color}20` }}>
            <MessageSquare className="h-5 w-5" style={{ color: INTEGRATION_TEMPLATES.find(t => t.service === integration.service)?.color }} />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{integration.name}</h3>
            <p className="text-sm text-gray-500">{integration.service}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm text-gray-600 capitalize">{integration.status}</span>
        </div>
      </div>

      {/* Health Score */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Health Score</span>
          <span className="text-sm text-gray-900">{integration.health_score}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getHealthColor(integration.health_score)}`}
            style={{ width: `${integration.health_score}%` }}
          />
        </div>
      </div>

      {showDetails && (
        <div className="space-y-3 pt-3 border-t border-gray-100">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Success Rate</span>
              <div className="font-medium text-gray-900">
                {integration.metrics.total_requests > 0 
                  ? ((integration.metrics.successful_requests / integration.metrics.total_requests) * 100).toFixed(1)
                  : 0
                }%
              </div>
            </div>
            <div>
              <span className="text-gray-500">Avg Response</span>
              <div className="font-medium text-gray-900">
                {integration.metrics.average_response_time}ms
              </div>
            </div>
            <div>
              <span className="text-gray-500">Uptime</span>
              <div className="font-medium text-gray-900">
                {integration.metrics.uptime_percentage.toFixed(1)}%
              </div>
            </div>
            <div>
              <span className="text-gray-500">Last Sync</span>
              <div className="font-medium text-gray-900">
                {formatRelativeTime(integration.last_sync)}
              </div>
            </div>
          </div>

          {/* Last Error */}
          {integration.metrics.last_error && (
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900">Latest Error</p>
                  <p className="text-sm text-red-700">{integration.metrics.last_error}</p>
                  {integration.metrics.last_error_at && (
                    <p className="text-xs text-red-600 mt-1">
                      {formatRelativeTime(integration.metrics.last_error_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Integration settings modal
export function IntegrationSettingsModal({ 
  integration, 
  template, 
  isOpen, 
  onClose, 
  onSave 
}: {
  integration?: Integration;
  template: IntegrationTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
}) {
  const [config, setConfig] = useState(integration?.config || {});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const updateConfig = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      // Mock test (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 2000));
      const success = Math.random() > 0.3; // 70% success rate for demo
      
      setTestResult({
        success,
        message: success 
          ? 'Connection successful! Integration is working properly.' 
          : 'Connection failed. Please check your configuration.'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Test failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSave(config);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${template.color}20` }}>
              <MessageSquare className="h-5 w-5" style={{ color: template.color }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {integration ? 'Edit' : 'Add'} {template.name} Integration
              </h2>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Setup Guide */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Setup Guide</h3>
            <ol className="list-decimal list-inside space-y-1">
              {template.setup_guide.map((step, index) => (
                <li key={index} className="text-sm text-blue-800">{step}</li>
              ))}
            </ol>
            <a
              href={template.docs_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
            >
              <span>View Documentation</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Configuration Form */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Configuration</h3>
            
            {template.config_fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {field.type === 'select' ? (
                  <select
                    value={(config as any)[field.key] || ''}
                    onChange={(e) => updateConfig(field.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select an option</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={(config as any)[field.key] || ''}
                    onChange={(e) => updateConfig(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : field.type === 'password' ? (
                  <div className="relative">
                    <input
                      type={showSecrets[field.key] ? 'text' : 'password'}
                      value={(config as any)[field.key] || ''}
                      onChange={(e) => updateConfig(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowSecret(field.key)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                ) : (
                  <input
                    type={field.type}
                    value={(config as any)[field.key] || ''}
                    onChange={(e) => updateConfig(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Test Connection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Test Connection</h3>
              <button
                onClick={testConnection}
                disabled={testing || !Object.values(config).some(v => v)}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-start space-x-2">
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  )}
                  <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {testResult.message}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Capabilities */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Capabilities</h3>
            <div className="flex flex-wrap gap-2">
              {template.capabilities.map((capability) => (
                <span
                  key={capability}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                >
                  {capability.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!Object.values(config).some(v => v)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {integration ? 'Update' : 'Add'} Integration
          </button>
        </div>
      </div>
    </div>
  );
}

// Integration triggers modal
export function IntegrationTriggersModal({ 
  integration, 
  isOpen, 
  onClose, 
  onSave 
}: {
  integration: Integration;
  isOpen: boolean;
  onClose: () => void;
  onSave: (triggers: IntegrationTrigger[]) => void;
}) {
  const [triggers, setTriggers] = useState<IntegrationTrigger[]>(integration.triggers || []);
  const [newTrigger, setNewTrigger] = useState({
    event_type: '',
    webhook_url: '',
    config: {}
  });

  const addTrigger = () => {
    if (newTrigger.event_type.trim()) {
      const trigger: IntegrationTrigger = {
        id: `trigger-${Date.now()}`,
        integration_id: integration.id,
        event_type: newTrigger.event_type,
        webhook_url: newTrigger.webhook_url || undefined,
        is_active: true,
        created_at: new Date(),
        config: newTrigger.config
      };
      
      setTriggers(prev => [...prev, trigger]);
      setNewTrigger({ event_type: '', webhook_url: '', config: {} });
    }
  };

  const removeTrigger = (triggerId: string) => {
    setTriggers(prev => prev.filter(t => t.id !== triggerId));
  };

  const toggleTrigger = (triggerId: string) => {
    setTriggers(prev => 
      prev.map(t => 
        t.id === triggerId ? { ...t, is_active: !t.is_active } : t
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {integration.name} Triggers
            </h2>
            <p className="text-sm text-gray-600">
              Configure event triggers and webhooks
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Existing Triggers */}
          {triggers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Active Triggers</h3>
              <div className="space-y-3">
                {triggers.map((trigger) => (
                  <div key={trigger.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{trigger.event_type}</div>
                      {trigger.webhook_url && (
                        <div className="text-sm text-gray-600">{trigger.webhook_url}</div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={trigger.is_active}
                          onChange={() => toggleTrigger(trigger.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Active</span>
                      </label>
                      <button
                        onClick={() => removeTrigger(trigger.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Trigger */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Add New Trigger</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <input
                  type="text"
                  value={newTrigger.event_type}
                  onChange={(e) => setNewTrigger(prev => ({ ...prev, event_type: e.target.value }))}
                  placeholder="e.g., agent.executed, user.registered"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL (Optional)
                </label>
                <input
                  type="url"
                  value={newTrigger.webhook_url}
                  onChange={(e) => setNewTrigger(prev => ({ ...prev, webhook_url: e.target.value }))}
                  placeholder="https://api.example.com/webhook"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                onClick={addTrigger}
                disabled={!newTrigger.event_type.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                <span>Add Trigger</span>
              </button>
            </div>
          </div>

          {/* Common Event Types */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Common Event Types</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">• agent.executed</div>
              <div className="text-gray-600">• agent.failed</div>
              <div className="text-gray-600">• user.registered</div>
              <div className="text-gray-600">• purchase.completed</div>
              <div className="text-gray-600">• integration.connected</div>
              <div className="text-gray-600">• integration.error</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(triggers)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Triggers
          </button>
        </div>
      </div>
    </div>
  );
}

// Main integrations dashboard
export function IntegrationsDashboard() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<IntegrationTemplate | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTriggersModal, setShowTriggersModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  // Mock data (replace with real API calls)
  useEffect(() => {
    const mockIntegrations: Integration[] = [
      {
        id: '1',
        name: 'Company Slack',
        service: 'slack',
        type: 'oauth',
        status: 'connected',
        health_score: 95,
        last_sync: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        config: {
          custom_fields: {
            workspace: 'company.slack.com'
          }
        },
        metrics: {
          total_requests: 1250,
          successful_requests: 1200,
          failed_requests: 50,
          average_response_time: 120,
          uptime_percentage: 99.2
        },
        capabilities: ['messaging', 'channels', 'users', 'files'],
        triggers: []
      }
    ];
    setIntegrations(mockIntegrations);
  }, []);

  const handleAddIntegration = (config: any) => {
    if (selectedTemplate) {
      const newIntegration: Integration = {
        id: `integration-${Date.now()}`,
        name: `${selectedTemplate.name} Integration`,
        service: selectedTemplate.service,
        type: selectedTemplate.type,
        status: 'pending',
        health_score: 0,
        last_sync: new Date(),
        created_at: new Date(),
        config,
        metrics: {
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0,
          average_response_time: 0,
          uptime_percentage: 0
        },
        capabilities: selectedTemplate.capabilities,
        triggers: []
      };
      
      setIntegrations(prev => [...prev, newIntegration]);
      setShowSettingsModal(false);
      setSelectedTemplate(null);
    }
  };

  const handleEditIntegration = (config: any) => {
    if (editingIntegration) {
      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === editingIntegration.id 
            ? { ...integration, config }
            : integration
        )
      );
      setShowSettingsModal(false);
      setEditingIntegration(null);
    }
  };

  const handleDeleteIntegration = (integrationId: string) => {
    setIntegrations(prev => prev.filter(i => i.id !== integrationId));
  };

  const openAddModal = (template: IntegrationTemplate) => {
    setSelectedTemplate(template);
    setEditingIntegration(null);
    setShowSettingsModal(true);
  };

  const openEditModal = (integration: Integration) => {
    const template = INTEGRATION_TEMPLATES.find(t => t.service === integration.service);
    if (template) {
      setSelectedTemplate(template);
      setEditingIntegration(integration);
      setShowSettingsModal(true);
    }
  };

  const openTriggersModal = (integration: Integration) => {
    setSelectedIntegration(integration);
    setShowTriggersModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Integrations</h2>
          <p className="text-gray-600">Connect your agents with external services</p>
        </div>
        <div className="text-sm text-gray-500">
          {integrations.filter(i => i.status === 'connected').length} of {integrations.length} connected
        </div>
      </div>

      {/* Active Integrations */}
      {integrations.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Active Integrations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => (
              <div key={integration.id} className="relative">
                <IntegrationHealthBar integration={integration} showDetails />
                <div className="absolute top-4 right-4 flex space-x-1">
                  <button
                    onClick={() => openEditModal(integration)}
                    className="p-1 text-gray-400 hover:text-gray-600 bg-white rounded shadow-sm"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openTriggersModal(integration)}
                    className="p-1 text-gray-400 hover:text-gray-600 bg-white rounded shadow-sm"
                  >
                    <Webhook className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteIntegration(integration.id)}
                    className="p-1 text-gray-400 hover:text-red-600 bg-white rounded shadow-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Integrations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INTEGRATION_TEMPLATES
            .filter(template => !integrations.some(i => i.service === template.service))
            .map((template) => (
              <div key={template.service} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${template.color}20` }}>
                    <MessageSquare className="h-5 w-5" style={{ color: template.color }} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500">{template.type}</p>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-4">{template.description}</p>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.capabilities.slice(0, 3).map((capability) => (
                    <span
                      key={capability}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                    >
                      {capability.replace('_', ' ')}
                    </span>
                  ))}
                  {template.capabilities.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                      +{template.capabilities.length - 3}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => openAddModal(template)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Integration</span>
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Modals */}
      {showSettingsModal && selectedTemplate && (
        <IntegrationSettingsModal
          integration={editingIntegration || undefined}
          template={selectedTemplate}
          isOpen={showSettingsModal}
          onClose={() => {
            setShowSettingsModal(false);
            setSelectedTemplate(null);
            setEditingIntegration(null);
          }}
          onSave={editingIntegration ? handleEditIntegration : handleAddIntegration}
        />
      )}

      {showTriggersModal && selectedIntegration && (
        <IntegrationTriggersModal
          integration={selectedIntegration}
          isOpen={showTriggersModal}
          onClose={() => {
            setShowTriggersModal(false);
            setSelectedIntegration(null);
          }}
          onSave={(triggers) => {
            setIntegrations(prev =>
              prev.map(i =>
                i.id === selectedIntegration.id
                  ? { ...i, triggers }
                  : i
              )
            );
            setShowTriggersModal(false);
            setSelectedIntegration(null);
          }}
        />
      )}
    </div>
  );
}
