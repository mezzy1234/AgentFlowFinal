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

interface SDKConfig {
  id: string;
  language: string;
  package_name: string;
  version: string;
  generation_status: string;
  download_url?: string;
  download_count: number;
  created_at: string;
}

interface CodeSnippet {
  id: string;
  title: string;
  description: string;
  language: string;
  category: string;
  code_content: string;
  api_endpoint: string;
  use_cases: string[];
  tags: string[];
  upvotes: number;
  view_count: number;
}

export default function SDKGeneratorDashboard() {
  const [sdkConfigs, setSdkConfigs] = useState<SDKConfig[]>([]);
  const [codeSnippets, setCodeSnippets] = useState<CodeSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sdks');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  // SDK Generation Form State
  const [sdkForm, setSdkForm] = useState({
    language: 'javascript',
    packageName: '',
    version: '1.0.0',
    platform: 'npm',
    includeExamples: true,
    includeTypes: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch SDK configurations
      const sdkResponse = await fetch('/api/developer?type=sdk_configs');
      const sdkData = await sdkResponse.json();
      setSdkConfigs(sdkData.configs || []);

      // Fetch code snippets
      const snippetsResponse = await fetch('/api/developer?type=code_snippets');
      const snippetsData = await snippetsResponse.json();
      setCodeSnippets(snippetsData.snippets || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSDK = async () => {
    try {
      const response = await fetch('/api/developer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_sdk',
          ...sdkForm
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSdkConfigs(prev => [result.config, ...prev]);
        setSdkForm({
          language: 'javascript',
          packageName: '',
          version: '1.0.0',
          platform: 'npm',
          includeExamples: true,
          includeTypes: true
        });
      }
    } catch (error) {
      console.error('Error generating SDK:', error);
    }
  };

  const getLanguageIcon = (language: string) => {
    const icons: { [key: string]: string } = {
      javascript: '🟨',
      typescript: '🔷',
      python: '🐍',
      java: '☕',
      csharp: '💎',
      go: '🐹',
      php: '🐘',
      ruby: '💎'
    };
    return icons[language] || '📝';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      completed: 'success',
      generating: 'warning',
      failed: 'error',
      pending: 'default'
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SDK generator...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">SDK Generator</h1>
              <p className="mt-1 text-sm text-gray-500">
                Generate and manage SDKs for multiple programming languages
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline">
                Download All
              </Button>
              <Button onClick={() => setActiveTab('generate')}>
                Generate New SDK
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
              { id: 'sdks', name: 'Generated SDKs' },
              { id: 'generate', name: 'Generate SDK' },
              { id: 'snippets', name: 'Code Snippets' },
              { id: 'documentation', name: 'API Documentation' }
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
        {activeTab === 'sdks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Generated SDKs</h2>
              <div className="flex space-x-2">
                <select 
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All Languages</option>
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="csharp">C#</option>
                  <option value="go">Go</option>
                  <option value="php">PHP</option>
                  <option value="ruby">Ruby</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sdkConfigs
                .filter(config => !selectedLanguage || config.language === selectedLanguage)
                .map((config) => (
                <Card key={config.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getLanguageIcon(config.language)}</span>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {config.package_name || `AgentFlow ${config.language.charAt(0).toUpperCase() + config.language.slice(1)} SDK`}
                        </h3>
                        <p className="text-sm text-gray-500">Version {config.version}</p>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(config.generation_status) as any}>
                      {config.generation_status.charAt(0).toUpperCase() + config.generation_status.slice(1)}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-500 mb-2">
                      <span>Downloads: {config.download_count.toLocaleString()}</span>
                      <span>Generated: {new Date(config.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex space-x-2">
                      {config.generation_status === 'completed' && config.download_url && (
                        <Button variant="outline" className="flex-1">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download
                        </Button>
                      )}
                      <Button variant="outline" className="flex-1">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Docs
                        </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {sdkConfigs.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No SDKs generated</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by generating your first SDK.</p>
                <div className="mt-6">
                  <Button onClick={() => setActiveTab('generate')}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Generate New SDK
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="max-w-2xl mx-auto">
            <Card className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Generate New SDK</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Programming Language
                  </label>
                  <select 
                    value={sdkForm.language}
                    onChange={(e) => setSdkForm({...sdkForm, language: e.target.value})}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="csharp">C#</option>
                    <option value="go">Go</option>
                    <option value="php">PHP</option>
                    <option value="ruby">Ruby</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Package Name
                  </label>
                  <input
                    type="text"
                    value={sdkForm.packageName}
                    onChange={(e) => setSdkForm({...sdkForm, packageName: e.target.value})}
                    placeholder="agentflow-sdk"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Version
                    </label>
                    <input
                      type="text"
                      value={sdkForm.version}
                      onChange={(e) => setSdkForm({...sdkForm, version: e.target.value})}
                      placeholder="1.0.0"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Platform
                    </label>
                    <select 
                      value={sdkForm.platform}
                      onChange={(e) => setSdkForm({...sdkForm, platform: e.target.value})}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="npm">NPM</option>
                      <option value="pypi">PyPI</option>
                      <option value="maven">Maven</option>
                      <option value="nuget">NuGet</option>
                      <option value="composer">Composer</option>
                      <option value="gem">RubyGems</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={sdkForm.includeExamples}
                      onChange={(e) => setSdkForm({...sdkForm, includeExamples: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Include code examples
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={sdkForm.includeTypes}
                      onChange={(e) => setSdkForm({...sdkForm, includeTypes: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Include type definitions
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setActiveTab('sdks')}>
                    Cancel
                  </Button>
                  <Button onClick={generateSDK}>
                    Generate SDK
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'snippets' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Code Snippets Library</h2>
              <Button>
                Add New Snippet
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {codeSnippets.map((snippet) => (
                <Card key={snippet.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{snippet.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{snippet.description}</p>
                    </div>
                    <Badge>{snippet.language}</Badge>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <pre className="text-sm text-gray-800 overflow-x-auto">
                      <code>{snippet.code_content.substring(0, 200)}...</code>
                    </pre>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex space-x-4">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                        </svg>
                        {snippet.upvotes}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        {snippet.view_count}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      {snippet.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'documentation' && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Interactive API Documentation</h3>
            <p className="mt-1 text-sm text-gray-500">Comprehensive API documentation with examples and live testing.</p>
            <div className="mt-6">
              <Button>
                Open API Explorer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
