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

interface Integration {
  id: string;
  name: string;
  slug: string;
  description: string;
  provider: string;
  logo_url?: string;
  category: string;
  rating: number;
  install_count: number;
  is_official: boolean;
  is_featured: boolean;
  pricing_model: string;
  features: string[];
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon_url: string;
}

export default function IntegrationMarketplaceDashboard() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('marketplace');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [integrationsResponse, categoriesResponse] = await Promise.all([
        fetch('/api/integrations?type=marketplace'),
        fetch('/api/integrations?type=categories')
      ]);

      const integrationsData = await integrationsResponse.json();
      const categoriesData = await categoriesResponse.json();

      setIntegrations(integrationsData.integrations || []);
      setCategories(categoriesData.categories || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIntegrations = integrations.filter(integration => {
    const matchesCategory = !selectedCategory || integration.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.provider.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const featuredIntegrations = integrations.filter(i => i.is_featured);

  const installIntegration = async (integrationId: string) => {
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'install_integration',
          integrationId
        })
      });

      if (response.ok) {
        // Handle successful installation
        console.log('Integration installed successfully');
      }
    } catch (error) {
      console.error('Error installing integration:', error);
    }
  };

  const getStarRating = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading integration marketplace...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Integration Marketplace</h1>
              <p className="mt-1 text-sm text-gray-500">
                Discover and install integrations to extend your agent capabilities
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline">
                My Integrations
              </Button>
              <Button onClick={() => setActiveTab('custom')}>
                Create Custom
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
              { id: 'marketplace', name: 'Marketplace' },
              { id: 'installed', name: 'Installed' },
              { id: 'custom', name: 'Custom Connectors' },
              { id: 'analytics', name: 'Analytics' }
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
        {activeTab === 'marketplace' && (
          <div className="space-y-8">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search integrations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Featured Integrations */}
            {featuredIntegrations.length > 0 && !searchQuery && !selectedCategory && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Featured Integrations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {featuredIntegrations.slice(0, 6).map((integration) => (
                    <Card key={integration.id} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-3">
                            {integration.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{integration.name}</h3>
                            <p className="text-sm text-gray-500">{integration.provider}</p>
                          </div>
                        </div>
                        {integration.is_official && (
                          <Badge variant="success">Official</Badge>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm mb-4">{integration.description}</p>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          {getStarRating(integration.rating)}
                          <span className="ml-2 text-sm text-gray-600">
                            {integration.rating.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {integration.install_count.toLocaleString()} installs
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant={integration.pricing_model === 'free' ? 'success' : 'default'}>
                          {integration.pricing_model.charAt(0).toUpperCase() + integration.pricing_model.slice(1)}
                        </Badge>
                        <Button onClick={() => installIntegration(integration.id)}>
                          Install
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* All Integrations */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {searchQuery || selectedCategory ? 'Search Results' : 'All Integrations'}
                <span className="text-gray-500 font-normal ml-2">
                  ({filteredIntegrations.length} integrations)
                </span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredIntegrations.map((integration) => (
                  <Card key={integration.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">
                          {integration.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{integration.name}</h3>
                          <p className="text-sm text-gray-500">{integration.provider}</p>
                        </div>
                      </div>
                      {integration.is_official && (
                        <Badge variant="success">Official</Badge>
                      )}
                    </div>

                    <p className="text-gray-600 text-sm mb-4">{integration.description}</p>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {integration.features.slice(0, 3).map((feature, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {feature}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        {getStarRating(integration.rating)}
                        <span className="ml-2 text-sm text-gray-600">
                          {integration.rating.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {integration.install_count.toLocaleString()} installs
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant={integration.pricing_model === 'free' ? 'success' : 'default'}>
                        {integration.pricing_model.charAt(0).toUpperCase() + integration.pricing_model.slice(1)}
                      </Badge>
                      <div className="flex space-x-2">
                        <Button variant="outline" className="text-xs px-3 py-1">
                          Learn More
                        </Button>
                        <Button onClick={() => installIntegration(integration.id)} className="text-xs px-3 py-1">
                          Install
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {filteredIntegrations.length === 0 && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No integrations found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search criteria or browse all categories.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'installed' && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No installed integrations</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your installed integrations will appear here once you install them from the marketplace.
            </p>
            <div className="mt-6">
              <Button onClick={() => setActiveTab('marketplace')}>
                Browse Marketplace
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Custom Connectors</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create custom integrations for APIs that aren't available in the marketplace.
            </p>
            <div className="mt-6">
              <Button>
                Create Custom Connector
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Integration Analytics</h3>
            <p className="mt-1 text-sm text-gray-500">
              Monitor your integration usage, performance, and costs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
