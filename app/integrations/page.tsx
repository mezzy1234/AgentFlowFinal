export default function Integrations() {
  const integrations = [
    {
      name: "Slack",
      description: "Deploy agents directly to Slack channels",
      logo: "🔗",
      status: "Available"
    },
    {
      name: "Discord",
      description: "Bot integration for Discord servers",
      logo: "🎮",
      status: "Available"
    },
    {
      name: "Zapier",
      description: "Connect agents to 5000+ apps",
      logo: "⚡",
      status: "Available"
    },
    {
      name: "Webhook API",
      description: "REST API endpoints for any integration",
      logo: "🔌",
      status: "Available"
    },
    {
      name: "WhatsApp Business",
      description: "Customer service agents for WhatsApp",
      logo: "💬",
      status: "Coming Soon"
    },
    {
      name: "Salesforce",
      description: "CRM integration and automation",
      logo: "☁️",
      status: "Coming Soon"
    },
    {
      name: "HubSpot",
      description: "Marketing and sales automation",
      logo: "🎯",
      status: "Coming Soon"
    },
    {
      name: "Shopify",
      description: "E-commerce customer support",
      logo: "🛒",
      status: "Coming Soon"
    }
  ]

  return (
    'use client'

import { useState, useMemo } from 'react'
import { MagnifyingGlassIcon, FunnelIcon, PlusIcon, StarIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

// Mock data for 1000+ integrations (sample of real n8n integrations)
const INTEGRATIONS = [
  // Communication
  { id: 1, name: 'Gmail', category: 'Communication', description: 'Send and receive emails', icon: '📧', connected: true, featured: true, rating: 4.9, installs: '50k+' },
  { id: 2, name: 'Slack', category: 'Communication', description: 'Team messaging and collaboration', icon: '💬', connected: true, featured: true, rating: 4.8, installs: '45k+' },
  { id: 3, name: 'Microsoft Teams', category: 'Communication', description: 'Video calls and team chat', icon: '👥', connected: false, featured: true, rating: 4.7, installs: '38k+' },
  { id: 4, name: 'Discord', category: 'Communication', description: 'Community and gaming chat', icon: '🎮', connected: false, featured: false, rating: 4.6, installs: '25k+' },
  { id: 5, name: 'Telegram', category: 'Communication', description: 'Secure messaging platform', icon: '📱', connected: false, featured: false, rating: 4.8, installs: '30k+' },
  
  // CRM & Sales
  { id: 10, name: 'Salesforce', category: 'CRM', description: 'Customer relationship management', icon: '🏢', connected: true, featured: true, rating: 4.8, installs: '42k+' },
  { id: 11, name: 'HubSpot', category: 'CRM', description: 'Inbound marketing and sales', icon: '🎯', connected: false, featured: true, rating: 4.9, installs: '35k+' },
  { id: 12, name: 'Pipedrive', category: 'CRM', description: 'Sales pipeline management', icon: '📊', connected: true, featured: false, rating: 4.7, installs: '28k+' },
  { id: 13, name: 'Zoho CRM', category: 'CRM', description: 'Complete CRM solution', icon: '🔄', connected: false, featured: false, rating: 4.6, installs: '22k+' },
  
  // Marketing
  { id: 20, name: 'Mailchimp', category: 'Marketing', description: 'Email marketing automation', icon: '🐵', connected: true, featured: true, rating: 4.8, installs: '40k+' },
  { id: 21, name: 'Facebook Ads', category: 'Marketing', description: 'Social media advertising', icon: '📘', connected: false, featured: true, rating: 4.5, installs: '32k+' },
  { id: 22, name: 'Google Ads', category: 'Marketing', description: 'Search and display advertising', icon: '🎯', connected: false, featured: true, rating: 4.6, installs: '38k+' },
  { id: 23, name: 'LinkedIn Ads', category: 'Marketing', description: 'Professional network advertising', icon: '💼', connected: false, featured: false, rating: 4.4, installs: '18k+' },
  
  // E-commerce
  { id: 30, name: 'Shopify', category: 'E-commerce', description: 'Online store management', icon: '🛍️', connected: false, featured: true, rating: 4.8, installs: '35k+' },
  { id: 31, name: 'WooCommerce', category: 'E-commerce', description: 'WordPress e-commerce', icon: '🛒', connected: false, featured: false, rating: 4.7, installs: '28k+' },
  { id: 32, name: 'Stripe', category: 'E-commerce', description: 'Payment processing', icon: '💳', connected: true, featured: true, rating: 4.9, installs: '45k+' },
  { id: 33, name: 'PayPal', category: 'E-commerce', description: 'Online payments', icon: '💰', connected: false, featured: false, rating: 4.5, installs: '30k+' },
  
  // Productivity
  { id: 40, name: 'Google Sheets', category: 'Productivity', description: 'Online spreadsheets', icon: '📊', connected: true, featured: true, rating: 4.8, installs: '48k+' },
  { id: 41, name: 'Notion', category: 'Productivity', description: 'All-in-one workspace', icon: '📝', connected: false, featured: true, rating: 4.7, installs: '25k+' },
  { id: 42, name: 'Airtable', category: 'Productivity', description: 'Database and spreadsheet hybrid', icon: '🗂️', connected: true, featured: false, rating: 4.6, installs: '22k+' },
  { id: 43, name: 'Trello', category: 'Productivity', description: 'Project management boards', icon: '📋', connected: false, featured: false, rating: 4.5, installs: '28k+' },
  { id: 44, name: 'Asana', category: 'Productivity', description: 'Team project management', icon: '✅', connected: false, featured: false, rating: 4.6, installs: '24k+' },
  
  // Developer Tools
  { id: 50, name: 'GitHub', category: 'Developer', description: 'Code hosting and collaboration', icon: '🐙', connected: true, featured: true, rating: 4.9, installs: '35k+' },
  { id: 51, name: 'GitLab', category: 'Developer', description: 'DevOps lifecycle platform', icon: '🦊', connected: false, featured: false, rating: 4.7, installs: '18k+' },
  { id: 52, name: 'Jira', category: 'Developer', description: 'Issue and project tracking', icon: '🔧', connected: false, featured: false, rating: 4.4, installs: '20k+' },
  { id: 53, name: 'Jenkins', category: 'Developer', description: 'Automation server', icon: '⚙️', connected: false, featured: false, rating: 4.3, installs: '15k+' },
  
  // Social Media
  { id: 60, name: 'Twitter', category: 'Social Media', description: 'Social networking platform', icon: '🐦', connected: false, featured: true, rating: 4.5, installs: '32k+' },
  { id: 61, name: 'Instagram', category: 'Social Media', description: 'Photo and video sharing', icon: '📸', connected: false, featured: true, rating: 4.6, installs: '28k+' },
  { id: 62, name: 'YouTube', category: 'Social Media', description: 'Video hosting platform', icon: '📺', connected: false, featured: false, rating: 4.7, installs: '25k+' },
  { id: 63, name: 'TikTok', category: 'Social Media', description: 'Short-form video platform', icon: '🎵', connected: false, featured: false, rating: 4.4, installs: '20k+' },
]

// Generate more integrations to reach 1000+
const generateMoreIntegrations = () => {
  const additionalApps = [
    'Zoom', 'Microsoft Outlook', 'Dropbox', 'Google Drive', 'OneDrive', 'Box', 'AWS S3', 'Azure Storage',
    'Calendly', 'Typeform', 'SurveyMonkey', 'Zapier', 'IFTTT', 'Microsoft Power Automate',
    'QuickBooks', 'Xero', 'FreshBooks', 'Wave Accounting', 'Sage', 'NetSuite',
    'Zendesk', 'Freshdesk', 'Help Scout', 'Intercom', 'Drift', 'LiveChat',
    'WordPress', 'Webflow', 'Squarespace', 'Wix', 'Drupal', 'Joomla',
    'Twilio', 'SendGrid', 'Postmark', 'Mandrill', 'Amazon SES', 'Mailgun',
    'Spotify', 'Apple Music', 'SoundCloud', 'Pandora', 'Deezer', 'Tidal',
    'Netflix', 'Hulu', 'Disney+', 'Amazon Prime', 'HBO Max', 'Paramount+',
    'Uber', 'Lyft', 'DoorDash', 'Grubhub', 'Instacart', 'Postmates',
    'Airbnb', 'Booking.com', 'Expedia', 'Hotels.com', 'TripAdvisor', 'Kayak'
  ]
  
  const categories = ['Communication', 'CRM', 'Marketing', 'E-commerce', 'Productivity', 'Developer', 'Social Media', 'Finance', 'Media', 'Travel']
  const moreIntegrations = []
  
  additionalApps.forEach((app, index) => {
    const category = categories[index % categories.length]
    const id = 100 + index
    moreIntegrations.push({
      id,
      name: app,
      category,
      description: `${app} integration for workflow automation`,
      icon: '🔗',
      connected: Math.random() > 0.8,
      featured: Math.random() > 0.7,
      rating: 4.0 + Math.random() * 1.0,
      installs: `${Math.floor(Math.random() * 50)}k+`
    })
  })
  
  return moreIntegrations
}

const ALL_INTEGRATIONS = [...INTEGRATIONS, ...generateMoreIntegrations()]
const CATEGORIES = ['All', 'Featured', 'Connected', 'Communication', 'CRM', 'Marketing', 'E-commerce', 'Productivity', 'Developer', 'Social Media', 'Finance', 'Media', 'Travel']

export default function IntegrationsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('featured') // featured, name, rating, installs
  const [showConnectedOnly, setShowConnectedOnly] = useState(false)

  const filteredIntegrations = useMemo(() => {
    let filtered = ALL_INTEGRATIONS

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(integration => 
        integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        integration.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        integration.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory === 'Featured') {
      filtered = filtered.filter(integration => integration.featured)
    } else if (selectedCategory === 'Connected') {
      filtered = filtered.filter(integration => integration.connected)
    } else if (selectedCategory !== 'All') {
      filtered = filtered.filter(integration => integration.category === selectedCategory)
    }

    // Filter connected only
    if (showConnectedOnly) {
      filtered = filtered.filter(integration => integration.connected)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'rating':
          return b.rating - a.rating
        case 'installs':
          return parseInt(b.installs) - parseInt(a.installs)
        case 'featured':
        default:
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
      }
    })

    return filtered
  }, [searchTerm, selectedCategory, sortBy, showConnectedOnly])

  const connectedCount = ALL_INTEGRATIONS.filter(i => i.connected).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
              <p className="mt-2 text-gray-600">
                Connect your favorite tools and automate your workflow. {connectedCount} connected, {ALL_INTEGRATIONS.length}+ available.
              </p>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center">
              <PlusIcon className="w-5 h-5 mr-2" />
              Request Integration
            </button>
          </div>
          
          {/* Search and Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search integrations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="featured">Featured</option>
                <option value="name">Name</option>
                <option value="rating">Rating</option>
                <option value="installs">Popularity</option>
              </select>
              
              <button
                onClick={() => setShowConnectedOnly(!showConnectedOnly)}
                className={`px-4 py-3 rounded-lg border transition ${
                  showConnectedOnly 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FunnelIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-6">
              <span className="text-blue-700">
                <strong>{filteredIntegrations.length}</strong> integrations found
              </span>
              <span className="text-blue-600">
                <CheckCircleIcon className="w-4 h-4 inline mr-1" />
                <strong>{connectedCount}</strong> connected
              </span>
            </div>
            <div className="text-blue-600">
              💡 New integrations added weekly
            </div>
          </div>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredIntegrations.map((integration) => (
            <div
              key={integration.id}
              className={`bg-white rounded-lg shadow-sm border-2 transition-all hover:shadow-md ${
                integration.connected 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                      {integration.icon}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                        {integration.featured && (
                          <StarIconSolid className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{integration.category}</p>
                    </div>
                  </div>
                  
                  {integration.connected && (
                    <CheckCircleIcon className="w-6 h-6 text-green-500" />
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {integration.description}
                </p>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <StarIcon className="w-3 h-3 text-yellow-400 fill-current" />
                    <span>{integration.rating.toFixed(1)}</span>
                  </div>
                  <span>{integration.installs} installs</span>
                </div>

                {/* Action Button */}
                <button
                  className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition ${
                    integration.connected
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {integration.connected ? 'Configure' : 'Connect'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredIntegrations.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MagnifyingGlassIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No integrations found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search or filters, or request a new integration.
            </p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              Request Integration
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
