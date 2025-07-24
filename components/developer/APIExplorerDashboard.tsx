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

interface APIEndpoint {
  id: string;
  endpoint_path: string;
  http_method: string;
  title: string;
  description: string;
  api_version: string;
  authentication_required: boolean;
  is_deprecated: boolean;
  request_schema: any;
  response_schema: any;
  examples: any[];
}

interface APIRequest {
  method: string;
  endpoint: string;
  headers: { [key: string]: string };
  body: string;
  parameters: { [key: string]: string };
}

export default function APIExplorerDashboard() {
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [request, setRequest] = useState<APIRequest>({
    method: 'GET',
    endpoint: '',
    headers: { 'Content-Type': 'application/json' },
    body: '',
    parameters: {}
  });
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState('explorer');

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const fetchEndpoints = async () => {
    try {
      const response = await fetch('/api/developer?type=api_documentation');
      const data = await response.json();
      setEndpoints(data.endpoints || []);
    } catch (error) {
      console.error('Error fetching endpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectEndpoint = (endpoint: APIEndpoint) => {
    setSelectedEndpoint(endpoint);
    setRequest({
      method: endpoint.http_method,
      endpoint: endpoint.endpoint_path,
      headers: { 
        'Content-Type': 'application/json',
        ...(endpoint.authentication_required ? { 'Authorization': 'Bearer YOUR_API_KEY' } : {})
      },
      body: endpoint.http_method !== 'GET' ? JSON.stringify(endpoint.examples?.[0]?.request || {}, null, 2) : '',
      parameters: {}
    });
    setResponse(null);
  };

  const executeRequest = async () => {
    setTesting(true);
    try {
      // Simulate API request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '999'
        },
        data: selectedEndpoint?.examples?.[0]?.response || {
          success: true,
          message: 'Request executed successfully',
          data: { id: 'example_123', status: 'active' }
        }
      };
      
      setResponse(mockResponse);
    } catch (error) {
      setResponse({
        status: 500,
        statusText: 'Internal Server Error',
        error: 'Failed to execute request'
      });
    } finally {
      setTesting(false);
    }
  };

  const getMethodColor = (method: string) => {
    const colors: { [key: string]: string } = {
      GET: 'bg-green-100 text-green-800',
      POST: 'bg-blue-100 text-blue-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800',
      PATCH: 'bg-purple-100 text-purple-800'
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading API explorer...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">API Explorer</h1>
              <p className="mt-1 text-sm text-gray-500">
                Interactive API documentation and testing environment
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline">
                Import Collection
              </Button>
              <Button>
                Save Session
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
              { id: 'explorer', name: 'API Explorer' },
              { id: 'collections', name: 'Collections' },
              { id: 'history', name: 'Request History' },
              { id: 'environments', name: 'Environments' }
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
      <div className="flex h-screen">
        {/* Sidebar - Endpoints List */}
        <div className="w-1/3 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search endpoints..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              {endpoints.map((endpoint) => (
                <div
                  key={endpoint.id}
                  onClick={() => selectEndpoint(endpoint)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedEndpoint?.id === endpoint.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50 border-gray-200'
                  } border`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getMethodColor(endpoint.http_method)}>
                      {endpoint.http_method}
                    </Badge>
                    {endpoint.is_deprecated && (
                      <Badge variant="warning">Deprecated</Badge>
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {endpoint.title}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    {endpoint.endpoint_path}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {endpoint.description?.substring(0, 80)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {selectedEndpoint ? (
            <>
              {/* Request Builder */}
              <div className="bg-white border-b border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedEndpoint.title}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedEndpoint.description}
                    </p>
                  </div>
                  <Button 
                    onClick={executeRequest}
                    disabled={testing}
                    className="min-w-[120px]"
                  >
                    {testing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Testing...
                      </>
                    ) : (
                      'Send Request'
                    )}
                  </Button>
                </div>

                {/* Request Configuration */}
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <div className="w-32">
                      <select
                        value={request.method}
                        onChange={(e) => setRequest({...request, method: e.target.value})}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={request.endpoint}
                        onChange={(e) => setRequest({...request, endpoint: e.target.value})}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="/api/agents"
                      />
                    </div>
                  </div>

                  {/* Headers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Headers
                    </label>
                    <div className="space-y-2">
                      {Object.entries(request.headers).map(([key, value]) => (
                        <div key={key} className="flex space-x-2">
                          <input
                            type="text"
                            value={key}
                            className="w-1/3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Header name"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setRequest({
                              ...request,
                              headers: { ...request.headers, [key]: e.target.value }
                            })}
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Header value"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Request Body */}
                  {request.method !== 'GET' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Request Body
                      </label>
                      <textarea
                        value={request.body}
                        onChange={(e) => setRequest({...request, body: e.target.value})}
                        rows={8}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                        placeholder="Request body (JSON)"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Response Display */}
              <div className="flex-1 bg-gray-50 p-6">
                {response ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">Response</h3>
                      <div className="flex items-center space-x-2">
                        <Badge variant={response.status < 400 ? 'success' : 'error'}>
                          {response.status} {response.statusText}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {testing ? 'Testing...' : '1.2s'}
                        </span>
                      </div>
                    </div>

                    {/* Response Headers */}
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Headers</h4>
                      <div className="space-y-1">
                        {Object.entries(response.headers || {}).map(([key, value]) => (
                          <div key={key} className="flex text-sm">
                            <span className="font-mono text-gray-600 w-48">{key}:</span>
                            <span className="font-mono text-gray-900">{value as string}</span>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Response Body */}
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Body</h4>
                      <pre className="bg-gray-50 rounded-lg p-4 text-sm font-mono overflow-x-auto">
                        {JSON.stringify(response.data || response.error, null, 2)}
                      </pre>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No response yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Send a request to see the response here.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Select an endpoint</h3>
                <p className="mt-1 text-sm text-gray-500">Choose an API endpoint from the left panel to get started.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
