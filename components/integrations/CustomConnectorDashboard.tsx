'use client';

import { useState, useEffect } from 'react';

// Local UI Components
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white overflow-hidden shadow rounded-lg ${className}`}>{children}</div>
);

const Button = ({ 
  children, 
  variant = "primary", 
  onClick, 
  className = "",
  ...props 
}: { 
  children: React.ReactNode; 
  variant?: "primary" | "outline" | "secondary";
  onClick?: () => void;
  className?: string;
  [key: string]: any;
}) => {
  const baseClasses = "inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors";
  const variants = {
    primary: "border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    outline: "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500",
    secondary: "border-transparent text-blue-700 bg-blue-100 hover:bg-blue-200 focus:ring-blue-500"
  };
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${className}`} 
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

const Badge = ({ 
  children, 
  variant = "default", 
  className = "" 
}: { 
  children: React.ReactNode; 
  variant?: "default" | "success" | "warning" | "error";
  className?: string;
}) => {
  const variants = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800"
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

interface CustomConnector {
  id: string;
  name: string;
  description: string;
  base_url: string;
  authentication_type: string;
  status: string;
  usage_count: number;
  created_at: string;
  endpoints: any[];
}

interface Endpoint {
  name: string;
  method: string;
  path: string;
  description: string;
  parameters: any[];
}

export default function CustomConnectorDashboard() {
  const [connectors, setConnectors] = useState<CustomConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('connectors');
  const [selectedConnector, setSelectedConnector] = useState<CustomConnector | null>(null);

  // New Connector Form State
  const [newConnector, setNewConnector] = useState({
    name: '',
    description: '',
    baseUrl: '',
    authenticationType: 'api_key',
    authConfig: {},
    headers: {},
    endpoints: [] as Endpoint[]
  });

  useEffect(() => {
    fetchConnectors();
  }, []);

  const fetchConnectors = async () => {
    try {
      const response = await fetch('/api/integrations?type=custom_connectors');
      const data = await response.json();
      setConnectors(data.connectors || []);
    } catch (error) {
      console.error('Error fetching connectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const createConnector = async () => {
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_custom_connector',
          ...newConnector
        })
      });

      if (response.ok) {
        const result = await response.json();
        setConnectors(prev => [result.connector, ...prev]);
        setNewConnector({
          name: '',
          description: '',
          baseUrl: '',
          authenticationType: 'api_key',
          authConfig: {},
          headers: {},
          endpoints: []
        });
        setActiveTab('connectors');
      }
    } catch (error) {
      console.error('Error creating connector:', error);
    }
  };

  const testConnector = async (connectorId: string) => {
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_custom_connector',
          connectorId
        })
      });

      if (response.ok) {
        console.log('Connector test successful');
      }
    } catch (error) {
      console.error('Error testing connector:', error);
    }
  };

  const addEndpoint = () => {
    setNewConnector({
      ...newConnector,
      endpoints: [
        ...newConnector.endpoints,
        {
          name: '',
          method: 'GET',
          path: '',
          description: '',
          parameters: []
        }
      ]
    });
  };

  const updateEndpoint = (index: number, field: string, value: string) => {
    const updatedEndpoints = [...newConnector.endpoints];
    updatedEndpoints[index] = { ...updatedEndpoints[index], [field]: value };
    setNewConnector({ ...newConnector, endpoints: updatedEndpoints });
  };

  const removeEndpoint = (index: number) => {
    const updatedEndpoints = newConnector.endpoints.filter((_, i) => i !== index);
    setNewConnector({ ...newConnector, endpoints: updatedEndpoints });
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      active: 'success',
      testing: 'warning',
      draft: 'default',
      deprecated: 'error'
    };
    return colors[status] || 'default';
  };

  const getAuthTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      api_key: '🔑',
      bearer_token: '🎫',
      oauth2: '🔐',
      basic_auth: '🔒',
      none: '🌐'
    };
    return icons[type] || '🔑';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading custom connectors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Custom Connectors</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create custom integrations for any API
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline">
                Import OpenAPI
              </Button>
              <Button onClick={() => setActiveTab('create')}>
                Create Connector
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'connectors', name: 'My Connectors' },
              { id: 'create', name: 'Create New' },
              { id: 'templates', name: 'Templates' },
              { id: 'shared', name: 'Shared Connectors' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'connectors' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Your Custom Connectors</h2>
              <Button onClick={() => setActiveTab('create')}>
                Create New Connector
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {connectors.map((connector) => (
                <Card key={connector.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{connector.name}</h3>
                      <p className="text-sm text-gray-500">{connector.base_url}</p>
                    </div>
                    <Badge variant={getStatusColor(connector.status) as any}>
                      {connector.status}
                    </Badge>
                  </div>

                  <p className="text-gray-600 text-sm mb-4">{connector.description}</p>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="mr-2">{getAuthTypeIcon(connector.authentication_type)}</span>
                      {connector.authentication_type.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {connector.endpoints.length} endpoints
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>Used {connector.usage_count} times</span>
                    <span>Created {new Date(connector.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => testConnector(connector.id)}
                      className="flex-1"
                    >
                      Test
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedConnector(connector)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <Button className="flex-1">
                      Use
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {connectors.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No custom connectors</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first custom connector.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setActiveTab('create')}>
                    Create Custom Connector
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="max-w-4xl mx-auto">
            <Card className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Create Custom Connector</h2>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Connector Name
                    </label>
                    <input
                      type="text"
                      value={newConnector.name}
                      onChange={(e) => setNewConnector({...newConnector, name: e.target.value})}
                      placeholder="My API Connector"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base URL
                    </label>
                    <input
                      type="url"
                      value={newConnector.baseUrl}
                      onChange={(e) => setNewConnector({...newConnector, baseUrl: e.target.value})}
                      placeholder="https://api.example.com/v1"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newConnector.description}
                    onChange={(e) => setNewConnector({...newConnector, description: e.target.value})}
                    rows={3}
                    placeholder="Describe what this connector does..."
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                {/* Authentication */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Authentication Type
                  </label>
                  <select 
                    value={newConnector.authenticationType}
                    onChange={(e) => setNewConnector({...newConnector, authenticationType: e.target.value})}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="none">No Authentication</option>
                    <option value="api_key">API Key</option>
                    <option value="bearer_token">Bearer Token</option>
                    <option value="basic_auth">Basic Authentication</option>
                    <option value="oauth2">OAuth 2.0</option>
                  </select>
                </div>

                {/* Endpoints */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      API Endpoints
                    </label>
                    <Button onClick={addEndpoint} variant="outline">
                      Add Endpoint
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {newConnector.endpoints.map((endpoint, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Method
                            </label>
                            <select
                              value={endpoint.method}
                              onChange={(e) => updateEndpoint(index, 'method', e.target.value)}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value="GET">GET</option>
                              <option value="POST">POST</option>
                              <option value="PUT">PUT</option>
                              <option value="PATCH">PATCH</option>
                              <option value="DELETE">DELETE</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Path
                            </label>
                            <input
                              type="text"
                              value={endpoint.path}
                              onChange={(e) => updateEndpoint(index, 'path', e.target.value)}
                              placeholder="/users"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={endpoint.name}
                              onChange={(e) => updateEndpoint(index, 'name', e.target.value)}
                              placeholder="Get Users"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button 
                              variant="outline" 
                              onClick={() => removeEndpoint(index)}
                              className="w-full"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={endpoint.description}
                            onChange={(e) => updateEndpoint(index, 'description', e.target.value)}
                            placeholder="Describe what this endpoint does..."
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setActiveTab('connectors')}>
                    Cancel
                  </Button>
                  <Button onClick={createConnector}>
                    Create Connector
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Connector Templates</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  name: 'REST API Template',
                  description: 'Standard REST API with CRUD operations',
                  auth: 'API Key',
                  endpoints: 5
                },
                {
                  name: 'GraphQL Template',
                  description: 'GraphQL API with query and mutation support',
                  auth: 'Bearer Token',
                  endpoints: 2
                },
                {
                  name: 'Webhook Template',
                  description: 'Webhook receiver with event processing',
                  auth: 'None',
                  endpoints: 1
                }
              ].map((template, index) => (
                <Card key={index} className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {template.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">{template.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>Auth: {template.auth}</span>
                    <span>{template.endpoints} endpoints</span>
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    Use Template
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'shared' && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Community Connectors</h3>
            <p className="mt-1 text-sm text-gray-500">
              Discover connectors shared by the community.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
