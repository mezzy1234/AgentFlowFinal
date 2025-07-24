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

interface WebhookTest {
  id: string;
  test_name: string;
  webhook_url: string;
  test_status: string;
  response_status?: number;
  response_time?: number;
  created_at: string;
  executed_at?: string;
}

interface APIVersion {
  id: string;
  version: string;
  status: string;
  release_date: string;
  breaking_changes: boolean;
  changelog: any;
}

export default function WebhookTestingDashboard() {
  const [webhookTests, setWebhookTests] = useState<WebhookTest[]>([]);
  const [apiVersions, setApiVersions] = useState<APIVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tests');

  // New Webhook Test Form
  const [newTest, setNewTest] = useState({
    testName: '',
    webhookUrl: '',
    payload: '{\n  "event_type": "agent.created",\n  "data": {\n    "id": "agent_123",\n    "name": "Test Agent"\n  }\n}',
    headers: { 'Content-Type': 'application/json' }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [testsResponse, versionsResponse] = await Promise.all([
        fetch('/api/developer?type=webhook_tests'),
        fetch('/api/developer?type=api_versions')
      ]);

      const testsData = await testsResponse.json();
      const versionsData = await versionsResponse.json();

      setWebhookTests(testsData.tests || []);
      setApiVersions(versionsData.versions || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runWebhookTest = async () => {
    try {
      const response = await fetch('/api/developer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_webhook',
          userId: 'demo-user',
          testName: newTest.testName,
          webhookUrl: newTest.webhookUrl,
          payloadTemplate: JSON.parse(newTest.payload),
          headers: newTest.headers
        })
      });

      if (response.ok) {
        const result = await response.json();
        setWebhookTests(prev => [result.result, ...prev]);
        setNewTest({
          testName: '',
          webhookUrl: '',
          payload: '{\n  "event_type": "agent.created",\n  "data": {\n    "id": "agent_123",\n    "name": "Test Agent"\n  }\n}',
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('Error running webhook test:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      delivered: 'success',
      pending: 'warning',
      failed: 'error',
      timeout: 'error'
    };
    return colors[status] || 'default';
  };

  const getVersionColor = (status: string) => {
    const colors: { [key: string]: string } = {
      active: 'success',
      deprecated: 'warning',
      sunset: 'error'
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading webhook testing...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Webhook Testing</h1>
              <p className="mt-1 text-sm text-gray-500">
                Test and debug your webhook endpoints
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline">
                Import Collection
              </Button>
              <Button onClick={() => setActiveTab('new-test')}>
                New Test
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
              { id: 'tests', name: 'Test Results' },
              { id: 'new-test', name: 'New Test' },
              { id: 'templates', name: 'Payload Templates' },
              { id: 'versions', name: 'API Versions' }
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
        {activeTab === 'tests' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Recent Webhook Tests</h2>
              <Button onClick={() => setActiveTab('new-test')}>
                Run New Test
              </Button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {webhookTests.map((test) => (
                  <li key={test.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {test.test_name}
                          </p>
                          <Badge 
                            variant={getStatusColor(test.test_status) as any}
                            className="ml-2"
                          >
                            {test.test_status}
                          </Badge>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                            {test.response_status && (
                              <span className={`${
                                test.response_status < 400 ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'
                              } px-2 py-1 rounded-full`}>
                                {test.response_status}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                            </svg>
                            {test.webhook_url.substring(0, 50)}...
                          </p>
                          {test.response_time && (
                            <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                              <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              {test.response_time}ms
                            </p>
                          )}
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          <p>
                            {test.executed_at ? new Date(test.executed_at).toLocaleString() : 'Pending'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {webhookTests.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No webhook tests</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by running your first webhook test.</p>
                <div className="mt-6">
                  <Button onClick={() => setActiveTab('new-test')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Run New Test
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'new-test' && (
          <div className="max-w-2xl mx-auto">
            <Card className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Create New Webhook Test</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Name
                  </label>
                  <input
                    type="text"
                    value={newTest.testName}
                    onChange={(e) => setNewTest({...newTest, testName: e.target.value})}
                    placeholder="Agent Creation Test"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={newTest.webhookUrl}
                    onChange={(e) => setNewTest({...newTest, webhookUrl: e.target.value})}
                    placeholder="https://your-app.com/webhooks/agentflow"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payload Template
                  </label>
                  <textarea
                    value={newTest.payload}
                    onChange={(e) => setNewTest({...newTest, payload: e.target.value})}
                    rows={12}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Enter JSON payload"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Headers
                  </label>
                  <div className="space-y-2">
                    {Object.entries(newTest.headers).map(([key, value]) => (
                      <div key={key} className="flex space-x-2">
                        <input
                          type="text"
                          value={key}
                          className="w-1/3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Header name"
                          readOnly
                        />
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setNewTest({
                            ...newTest,
                            headers: { ...newTest.headers, [key]: e.target.value }
                          })}
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Header value"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setActiveTab('tests')}>
                    Cancel
                  </Button>
                  <Button onClick={runWebhookTest}>
                    Run Test
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  name: 'Agent Created',
                  description: 'Triggered when a new agent is created',
                  payload: {
                    event_type: 'agent.created',
                    data: { id: 'agent_123', name: 'New Agent', status: 'active' }
                  }
                },
                {
                  name: 'Agent Executed',
                  description: 'Triggered when an agent execution completes',
                  payload: {
                    event_type: 'agent.execution.completed',
                    data: { execution_id: 'exec_456', agent_id: 'agent_123', status: 'success' }
                  }
                },
                {
                  name: 'Payment Succeeded',
                  description: 'Triggered when a payment is processed successfully',
                  payload: {
                    event_type: 'payment.succeeded',
                    data: { payment_id: 'pay_789', amount: 2999, currency: 'usd' }
                  }
                },
                {
                  name: 'User Registered',
                  description: 'Triggered when a new user signs up',
                  payload: {
                    event_type: 'user.registered',
                    data: { user_id: 'user_101', email: 'user@example.com', plan: 'pro' }
                  }
                }
              ].map((template, index) => (
                <Card key={index} className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {template.description}
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <pre className="text-sm text-gray-800 overflow-x-auto">
                      <code>{JSON.stringify(template.payload, null, 2)}</code>
                    </pre>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setNewTest({
                        ...newTest,
                        payload: JSON.stringify(template.payload, null, 2)
                      });
                      setActiveTab('new-test');
                    }}
                  >
                    Use Template
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">API Versions</h2>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {apiVersions.map((version) => (
                  <li key={version.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-blue-600">
                            {version.version}
                          </p>
                          <Badge 
                            variant={getVersionColor(version.status) as any}
                            className="ml-2"
                          >
                            {version.status}
                          </Badge>
                          {version.breaking_changes && (
                            <Badge variant="warning" className="ml-2">
                              Breaking Changes
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          Released: {new Date(version.release_date).toLocaleDateString()}
                        </div>
                      </div>
                      {version.changelog && (
                        <div className="mt-2 text-sm text-gray-600">
                          <p>{version.changelog.summary}</p>
                          {version.changelog.changes && (
                            <ul className="mt-1 list-disc list-inside">
                              {version.changelog.changes.slice(0, 3).map((change: string, index: number) => (
                                <li key={index}>{change}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
