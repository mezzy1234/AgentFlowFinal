'use client';

import React, { useState, useEffect } from 'react';
import { 
  X,
  Key,
  Shield,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  HelpCircle,
  Zap,
  Globe,
  Lock,
  Unlock,
  Settings,
  TestTube,
  Save,
  Trash2
} from 'lucide-react';

// Types
export interface Integration {
  id: string;
  name: string;
  slug: string;
  category: string;
  type: 'trigger' | 'action' | 'both';
  auth_method: 'oauth2' | 'api_key' | 'webhook' | 'basic_auth' | 'none' | 'custom';
  logo_url?: string;
  description: string;
  documentation_url?: string;
  is_popular: boolean;
}

export interface RequiredIntegration {
  integration: Integration;
  field_name: string;
  is_required: boolean;
  description?: string;
}

export interface UserCredential {
  id: string;
  integration_id: string;
  field_name: string;
  credential_type: string;
  is_active: boolean;
  expires_at?: string;
  test_status?: 'pending' | 'success' | 'failed' | 'expired';
  last_tested?: string;
}

export interface CredentialModalProps {
  agentId: string;
  isOpen: boolean;
  onClose: () => void;
  onCredentialsUpdated?: () => void;
}

// Main Credential Modal Component
export function CredentialModal({ 
  agentId, 
  isOpen, 
  onClose, 
  onCredentialsUpdated 
}: CredentialModalProps) {
  const [requiredIntegrations, setRequiredIntegrations] = useState<RequiredIntegration[]>([]);
  const [userCredentials, setUserCredentials] = useState<Record<string, UserCredential>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingCredentials, setTestingCredentials] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'required' | 'all' | 'manage'>('required');

  useEffect(() => {
    if (isOpen && agentId) {
      fetchRequiredIntegrations();
      fetchUserCredentials();
    }
  }, [isOpen, agentId]);

  const fetchRequiredIntegrations = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/integrations`);
      if (!response.ok) throw new Error('Failed to fetch required integrations');
      
      const data = await response.json();
      setRequiredIntegrations(data.requiredIntegrations || []);
    } catch (error) {
      setError('Failed to load required integrations');
      console.error('Error fetching required integrations:', error);
    }
  };

  const fetchUserCredentials = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/credentials');
      if (!response.ok) throw new Error('Failed to fetch user credentials');
      
      const data = await response.json();
      const credentialsMap = data.credentials.reduce((acc: Record<string, UserCredential>, cred: UserCredential) => {
        const key = `${cred.integration_id}-${cred.field_name}`;
        acc[key] = cred;
        return acc;
      }, {});
      
      setUserCredentials(credentialsMap);
    } catch (error) {
      setError('Failed to load your credentials');
      console.error('Error fetching user credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialSave = async (integrationId: string, fieldName: string, value: string, type: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration_id: integrationId,
          field_name: fieldName,
          value,
          credential_type: type
        })
      });

      if (!response.ok) throw new Error('Failed to save credential');
      
      await fetchUserCredentials();
      onCredentialsUpdated?.();
    } catch (error) {
      setError('Failed to save credential');
      console.error('Error saving credential:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCredentialDelete = async (credentialId: string) => {
    try {
      const response = await fetch(`/api/user/credentials/${credentialId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete credential');
      
      await fetchUserCredentials();
      onCredentialsUpdated?.();
    } catch (error) {
      setError('Failed to delete credential');
      console.error('Error deleting credential:', error);
    }
  };

  const handleTestConnection = async (integrationId: string, fieldName: string) => {
    const key = `${integrationId}-${fieldName}`;
    setTestingCredentials(prev => ({ ...prev, [key]: true }));

    try {
      const response = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration_id: integrationId,
          field_name: fieldName
        })
      });

      if (!response.ok) throw new Error('Connection test failed');
      
      const result = await response.json();
      
      // Update credential test status
      await fetchUserCredentials();
      
    } catch (error) {
      console.error('Connection test failed:', error);
    } finally {
      setTestingCredentials(prev => ({ ...prev, [key]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Connect Credentials</h2>
            <p className="text-gray-600 mt-1">
              Configure the integrations needed to run this agent
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {([
            { id: 'required', label: 'Required', count: requiredIntegrations.length },
            { id: 'all', label: 'All Integrations', count: undefined },
            { id: 'manage', label: 'Manage', count: undefined }
          ] as const).map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {count !== undefined && (
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600">Loading integrations...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'required' && (
                <RequiredIntegrationsTab
                  requiredIntegrations={requiredIntegrations}
                  userCredentials={userCredentials}
                  testingCredentials={testingCredentials}
                  onSaveCredential={handleCredentialSave}
                  onTestConnection={handleTestConnection}
                  saving={saving}
                />
              )}
              {activeTab === 'all' && (
                <AllIntegrationsTab
                  userCredentials={userCredentials}
                  onSaveCredential={handleCredentialSave}
                />
              )}
              {activeTab === 'manage' && (
                <ManageCredentialsTab
                  userCredentials={userCredentials}
                  onDeleteCredential={handleCredentialDelete}
                  onTestConnection={handleTestConnection}
                  testingCredentials={testingCredentials}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Shield className="h-4 w-4" />
            <span>All credentials are encrypted and stored securely</span>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={() => onCredentialsUpdated?.()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Test Agent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Required Integrations Tab
function RequiredIntegrationsTab({
  requiredIntegrations,
  userCredentials,
  testingCredentials,
  onSaveCredential,
  onTestConnection,
  saving
}: {
  requiredIntegrations: RequiredIntegration[];
  userCredentials: Record<string, UserCredential>;
  testingCredentials: Record<string, boolean>;
  onSaveCredential: (integrationId: string, fieldName: string, value: string, type: string) => void;
  onTestConnection: (integrationId: string, fieldName: string) => void;
  saving: boolean;
}) {
  if (requiredIntegrations.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Credentials Required</h3>
        <p className="text-gray-600">This agent doesn't require any external integrations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {requiredIntegrations.map((required) => {
        const { integration, field_name, is_required } = required;
        const credentialKey = `${integration.id}-${field_name}`;
        const existingCredential = userCredentials[credentialKey];
        const isConnected = !!existingCredential?.is_active;
        const isTesting = testingCredentials[credentialKey];

        return (
          <IntegrationCard
            key={credentialKey}
            integration={integration}
            fieldName={field_name}
            isRequired={is_required}
            existingCredential={existingCredential}
            isConnected={isConnected}
            isTesting={isTesting}
            saving={saving}
            onSaveCredential={onSaveCredential}
            onTestConnection={onTestConnection}
          />
        );
      })}
    </div>
  );
}

// All Integrations Tab
function AllIntegrationsTab({
  userCredentials,
  onSaveCredential
}: {
  userCredentials: Record<string, UserCredential>;
  onSaveCredential: (integrationId: string, fieldName: string, value: string, type: string) => void;
}) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchAllIntegrations();
  }, []);

  const fetchAllIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations');
      if (!response.ok) throw new Error('Failed to fetch integrations');
      
      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(integrations.map(i => i.category))).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Loading integrations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredIntegrations.map(integration => (
          <div key={integration.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              {integration.logo_url ? (
                <img
                  src={integration.logo_url}
                  alt={integration.name}
                  className="w-10 h-10 rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                  <Globe className="h-5 w-5 text-gray-500" />
                </div>
              )}
              
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
                
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {integration.category}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    {integration.auth_method}
                  </span>
                  {integration.is_popular && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                      Popular
                    </span>
                  )}
                </div>
              </div>
              
              <button className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm">
                Connect
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <div className="text-center py-12">
          <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No integrations found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}

// Manage Credentials Tab
function ManageCredentialsTab({
  userCredentials,
  onDeleteCredential,
  onTestConnection,
  testingCredentials
}: {
  userCredentials: Record<string, UserCredential>;
  onDeleteCredential: (credentialId: string) => void;
  onTestConnection: (integrationId: string, fieldName: string) => void;
  testingCredentials: Record<string, boolean>;
}) {
  const credentials = Object.values(userCredentials);

  if (credentials.length === 0) {
    return (
      <div className="text-center py-12">
        <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Credentials Saved</h3>
        <p className="text-gray-600">You haven't connected any integrations yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {credentials.map(credential => {
        const credentialKey = `${credential.integration_id}-${credential.field_name}`;
        const isTesting = testingCredentials[credentialKey];
        
        return (
          <div key={credential.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                  <Key className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{credential.field_name}</h4>
                  <p className="text-sm text-gray-600">{credential.credential_type}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Status Indicator */}
                <div className="flex items-center space-x-1">
                  {credential.test_status === 'success' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {credential.test_status === 'failed' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  {credential.test_status === 'expired' && (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  )}
                </div>
                
                {/* Actions */}
                <button
                  onClick={() => onTestConnection(credential.integration_id, credential.field_name)}
                  disabled={isTesting}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                >
                  {isTesting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                </button>
                
                <button
                  onClick={() => onDeleteCredential(credential.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {credential.expires_at && (
              <div className="mt-2 text-xs text-gray-500">
                Expires: {new Date(credential.expires_at).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Individual Integration Card Component
function IntegrationCard({
  integration,
  fieldName,
  isRequired,
  existingCredential,
  isConnected,
  isTesting,
  saving,
  onSaveCredential,
  onTestConnection
}: {
  integration: Integration;
  fieldName: string;
  isRequired: boolean;
  existingCredential?: UserCredential;
  isConnected: boolean;
  isTesting: boolean;
  saving: boolean;
  onSaveCredential: (integrationId: string, fieldName: string, value: string, type: string) => void;
  onTestConnection: (integrationId: string, fieldName: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [credentialValue, setCredentialValue] = useState('');
  const [showValue, setShowValue] = useState(false);

  const handleOAuthConnect = () => {
    // OAuth flow would be implemented here
    const oauthUrl = `/api/oauth/${integration.slug}?redirect=${encodeURIComponent(window.location.href)}`;
    window.open(oauthUrl, 'oauth', 'width=600,height=600');
  };

  const handleSave = () => {
    if (credentialValue.trim()) {
      onSaveCredential(
        integration.id,
        fieldName,
        credentialValue,
        integration.auth_method === 'oauth2' ? 'oauth_token' : 'api_key'
      );
      setCredentialValue('');
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${
      isRequired && !isConnected ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {integration.logo_url ? (
            <img
              src={integration.logo_url}
              alt={integration.name}
              className="w-12 h-12 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
              <Globe className="h-6 w-6 text-gray-500" />
            </div>
          )}
          
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">{integration.name}</h3>
              {isRequired && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                  Required
                </span>
              )}
              {isConnected && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
            
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                {integration.auth_method}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                {fieldName}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isConnected && (
            <button
              onClick={() => onTestConnection(integration.id, fieldName)}
              disabled={isTesting}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
              title="Test Connection"
            >
              {isTesting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
            </button>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            {isExpanded ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          
          {integration.documentation_url && (
            <a
              href={integration.documentation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              title="View Documentation"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
          {integration.auth_method === 'oauth2' ? (
            <div>
              <button
                onClick={handleOAuthConnect}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
              >
                <Globe className="h-4 w-4" />
                <span>Connect with {integration.name}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  {integration.auth_method === 'api_key' ? 'API Key' : 'Credential Value'}
                </label>
                <button
                  onClick={() => setShowValue(!showValue)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              <div className="flex space-x-2">
                <input
                  type={showValue ? 'text' : 'password'}
                  value={credentialValue}
                  onChange={(e) => setCredentialValue(e.target.value)}
                  placeholder={`Enter your ${integration.name} ${integration.auth_method === 'api_key' ? 'API key' : 'credential'}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleSave}
                  disabled={!credentialValue.trim() || saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>Save</span>
                </button>
              </div>
              
              <p className="text-xs text-gray-500">
                Your credentials are encrypted and stored securely. We never store them in plain text.
              </p>
            </div>
          )}

          {/* Connection Status */}
          {existingCredential && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                {existingCredential.test_status === 'success' && (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-700">Connected successfully</span>
                  </>
                )}
                {existingCredential.test_status === 'failed' && (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700">Connection failed</span>
                  </>
                )}
                {existingCredential.test_status === 'expired' && (
                  <>
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-orange-700">Credentials expired</span>
                  </>
                )}
              </div>
              
              {existingCredential.last_tested && (
                <span className="text-xs text-gray-500">
                  Last tested: {new Date(existingCredential.last_tested).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
