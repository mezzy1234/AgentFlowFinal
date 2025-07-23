'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Activity,
  UserCheck,
  Globe,
  Smartphone,
  Monitor,
  MapPin,
  Calendar,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Zap,
  Bell,
  BellRing,
  Fingerprint,
  Scan,
  QrCode,
  CreditCard,
  Database,
  Server,
  Cloud,
  HardDrive,
  Wifi,
  WifiOff,
  Bug,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Info,
  AlertCircle as AlertCircleIcon
} from 'lucide-react';

// Types
export interface SecurityEvent {
  id: string;
  type: 'login' | 'failed_login' | 'password_change' | 'two_factor' | 'api_access' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  ip_address: string;
  user_agent: string;
  location?: {
    country: string;
    city: string;
    region: string;
  };
  details: Record<string, any>;
  resolved: boolean;
}

export interface TwoFactorMethod {
  id: string;
  type: 'app' | 'sms' | 'email' | 'backup_codes';
  name: string;
  enabled: boolean;
  verified: boolean;
  created_at: Date;
  last_used?: Date;
}

export interface APIKey {
  id: string;
  name: string;
  key: string; // Only shown once during creation
  permissions: string[];
  last_used?: Date;
  expires_at?: Date;
  created_at: Date;
  is_active: boolean;
  usage_count: number;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  is_active: boolean;
  applies_to: 'all_users' | 'agents' | 'api' | 'admin';
}

export interface SecurityRule {
  id: string;
  type: 'rate_limit' | 'ip_whitelist' | 'geo_restriction' | 'time_restriction' | 'mfa_required';
  config: Record<string, any>;
  enabled: boolean;
}

export interface ComplianceReport {
  id: string;
  type: 'gdpr' | 'hipaa' | 'soc2' | 'iso27001';
  status: 'compliant' | 'partial' | 'non_compliant';
  last_audit: Date;
  next_audit: Date;
  findings: ComplianceFinding[];
}

export interface ComplianceFinding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  remediation: string;
  status: 'open' | 'in_progress' | 'resolved';
  due_date?: Date;
}

// Security Dashboard
export function SecurityDashboard({
  securityScore,
  recentEvents,
  activeThreats,
  complianceStatus
}: {
  securityScore: number;
  recentEvents: SecurityEvent[];
  activeThreats: number;
  complianceStatus: ComplianceReport[];
}) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login': return UserCheck;
      case 'failed_login': return ShieldX;
      case 'password_change': return Key;
      case 'two_factor': return Fingerprint;
      case 'api_access': return Database;
      case 'suspicious_activity': return AlertTriangle;
      default: return Activity;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Security Center</h2>
          <p className="text-gray-600">Monitor and manage your account security</p>
        </div>
        
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Download className="h-4 w-4" />
          <span>Security Report</span>
        </button>
      </div>

      {/* Security Score */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Security Score</h3>
          <button className="text-gray-400 hover:text-gray-600">
            <Info className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path
                  d="m18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="3"
                />
                <path
                  d="m18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={securityScore >= 90 ? '#10b981' : securityScore >= 70 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="3"
                  strokeDasharray={`${securityScore}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{securityScore}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Two-Factor Authentication</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Strong Password</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Key Security</span>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Login Monitoring</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Threats</p>
              <p className="text-2xl font-bold text-red-600">{activeThreats}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
          </div>
          
          {activeThreats > 0 && (
            <div className="mt-4">
              <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                View Details →
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Login Events (24h)</p>
              <p className="text-2xl font-bold text-gray-900">
                {recentEvents.filter(e => e.type === 'login' && 
                  new Date(e.timestamp).getTime() > Date.now() - 86400000).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Compliance Status</p>
              <p className="text-2xl font-bold text-green-600">
                {Math.round((complianceStatus.filter(c => c.status === 'compliant').length / complianceStatus.length) * 100)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Security Events</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All Events
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {recentEvents.slice(0, 5).map((event) => {
            const Icon = getEventIcon(event.type);
            return (
              <div key={event.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    getSeverityColor(event.severity)
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-900 capitalize">
                      {event.type.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {event.ip_address} • {event.location?.city}, {event.location?.country}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    getSeverityColor(event.severity)
                  }`}>
                    {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {event.timestamp.toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Two-Factor Authentication Setup
export function TwoFactorAuthSetup({
  methods,
  onEnable,
  onDisable,
  onVerify
}: {
  methods: TwoFactorMethod[];
  onEnable: (type: TwoFactorMethod['type']) => void;
  onDisable: (id: string) => void;
  onVerify: (id: string, code: string) => void;
}) {
  const [qrCode, setQrCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [activeSetup, setActiveSetup] = useState<TwoFactorMethod['type'] | null>(null);

  const methodConfigs = [
    {
      type: 'app' as const,
      name: 'Authenticator App',
      description: 'Use an app like Google Authenticator or Authy',
      icon: Smartphone,
      recommended: true
    },
    {
      type: 'sms' as const,
      name: 'SMS Messages',
      description: 'Receive codes via text message',
      icon: MessageSquare,
      recommended: false
    },
    {
      type: 'email' as const,
      name: 'Email',
      description: 'Receive codes via email',
      icon: Mail,
      recommended: false
    },
    {
      type: 'backup_codes' as const,
      name: 'Backup Codes',
      description: 'Use pre-generated backup codes',
      icon: Key,
      recommended: false
    }
  ];

  const getMethodStatus = (type: TwoFactorMethod['type']) => {
    const method = methods.find(m => m.type === type);
    if (!method) return 'not_setup';
    if (!method.verified) return 'pending';
    if (!method.enabled) return 'disabled';
    return 'enabled';
  };

  const generateBackupCodes = () => {
    // Generate 10 backup codes
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }
    setBackupCodes(codes);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Two-Factor Authentication</h3>
        <p className="text-sm text-gray-600">
          Add an extra layer of security to your account by requiring a second form of authentication.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {methodConfigs.map((config) => {
          const Icon = config.icon;
          const status = getMethodStatus(config.type);
          const method = methods.find(m => m.type === config.type);

          return (
            <div
              key={config.type}
              className={`relative border rounded-lg p-6 ${
                status === 'enabled' 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              {config.recommended && (
                <div className="absolute -top-2 right-4">
                  <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    Recommended
                  </span>
                </div>
              )}

              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  status === 'enabled' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <Icon className="h-6 w-6" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900">{config.name}</h4>
                    
                    {status === 'enabled' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    
                    {status === 'pending' && (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">{config.description}</p>

                  {method?.last_used && status === 'enabled' && (
                    <p className="text-xs text-gray-500 mb-4">
                      Last used: {method.last_used.toLocaleDateString()}
                    </p>
                  )}

                  <div className="flex items-center space-x-2">
                    {status === 'not_setup' && (
                      <button
                        onClick={() => {
                          onEnable(config.type);
                          setActiveSetup(config.type);
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Set Up
                      </button>
                    )}
                    
                    {status === 'pending' && (
                      <button
                        onClick={() => setActiveSetup(config.type)}
                        className="text-yellow-600 hover:text-yellow-700 font-medium text-sm"
                      >
                        Complete Setup
                      </button>
                    )}
                    
                    {status === 'enabled' && (
                      <button
                        onClick={() => onDisable(method!.id)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        Disable
                      </button>
                    )}
                    
                    {status === 'disabled' && (
                      <button
                        onClick={() => onEnable(config.type)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Enable
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Setup Modals */}
      {activeSetup === 'app' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Setup Authenticator App</h3>
              <button
                onClick={() => setActiveSetup(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <QrCode className="h-16 w-16 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">
                  Scan this QR code with your authenticator app
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setActiveSetup(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (verificationCode) {
                      onVerify('app-method-id', verificationCode);
                      setActiveSetup(null);
                      setVerificationCode('');
                    }
                  }}
                  disabled={!verificationCode}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSetup === 'backup_codes' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Backup Codes</h3>
              <button
                onClick={() => setActiveSetup(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Important
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      Save these codes in a safe place. Each code can only be used once.
                    </div>
                  </div>
                </div>
              </div>

              {backupCodes.length === 0 ? (
                <button
                  onClick={generateBackupCodes}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Generate Backup Codes
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {backupCodes.map((code, index) => (
                        <div key={index} className="p-2 bg-white rounded border">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        const text = backupCodes.join('\n');
                        navigator.clipboard.writeText(text);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      <Copy className="h-4 w-4" />
                      <span>Copy</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'backup-codes.txt';
                        a.click();
                      }}
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        onEnable('backup_codes');
                        setActiveSetup(null);
                        setBackupCodes([]);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save & Enable
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// API Keys Management
export function APIKeysManager({
  apiKeys,
  onCreateKey,
  onDeleteKey,
  onUpdateKey
}: {
  apiKeys: APIKey[];
  onCreateKey: (name: string, permissions: string[]) => void;
  onDeleteKey: (id: string) => void;
  onUpdateKey: (id: string, updates: Partial<APIKey>) => void;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const availablePermissions = [
    { id: 'agents:read', name: 'Read Agents', description: 'View agent information' },
    { id: 'agents:write', name: 'Modify Agents', description: 'Create, update, delete agents' },
    { id: 'agents:execute', name: 'Execute Agents', description: 'Run agent executions' },
    { id: 'marketplace:read', name: 'Read Marketplace', description: 'Browse marketplace listings' },
    { id: 'marketplace:write', name: 'Modify Marketplace', description: 'Create, update listings' },
    { id: 'analytics:read', name: 'Read Analytics', description: 'View analytics and reports' },
    { id: 'billing:read', name: 'Read Billing', description: 'View billing information' },
    { id: 'admin:full', name: 'Full Admin Access', description: 'Complete administrative access' }
  ];

  const handleCreateKey = () => {
    if (newKeyName && selectedPermissions.length > 0) {
      const newKey = `ak_${Math.random().toString(36).substr(2, 32)}`;
      onCreateKey(newKeyName, selectedPermissions);
      setCreatedKey(newKey);
      setNewKeyName('');
      setSelectedPermissions([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
          <p className="text-sm text-gray-600">Manage API keys for programmatic access</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Create API Key</span>
        </button>
      </div>

      {/* API Keys List */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
        {apiKeys.length === 0 ? (
          <div className="p-8 text-center">
            <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No API Keys</h3>
            <p className="text-gray-600 mb-4">Create your first API key to start using the API</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Create API Key
            </button>
          </div>
        ) : (
          apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">{apiKey.name}</h4>
                  <p className="text-sm text-gray-500">
                    Created {apiKey.created_at.toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    apiKey.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {apiKey.is_active ? 'Active' : 'Inactive'}
                  </span>
                  
                  <button
                    onClick={() => onDeleteKey(apiKey.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-sm text-gray-600">Usage Count</span>
                  <p className="font-medium">{apiKey.usage_count.toLocaleString()}</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600">Last Used</span>
                  <p className="font-medium">
                    {apiKey.last_used ? apiKey.last_used.toLocaleDateString() : 'Never'}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600">Expires</span>
                  <p className="font-medium">
                    {apiKey.expires_at ? apiKey.expires_at.toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-sm text-gray-600">Permissions</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {apiKey.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Create API Key</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreatedKey(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!createdKey ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production API, Mobile App"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Permissions
                  </label>
                  <div className="space-y-3">
                    {availablePermissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPermissions([...selectedPermissions, permission.id]);
                            } else {
                              setSelectedPermissions(selectedPermissions.filter(p => p !== permission.id));
                            }
                          }}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{permission.name}</div>
                          <div className="text-sm text-gray-600">{permission.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateKey}
                    disabled={!newKeyName || selectedPermissions.length === 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Create API Key
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        API Key Created Successfully
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        Save this key securely - you won't be able to see it again.
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your API Key
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={createdKey}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(createdKey)}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreatedKey(null);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
