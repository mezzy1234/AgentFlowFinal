'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import Navbar from '@/components/layout/Navbar'
import AgentCard from '@/components/marketplace/AgentCard'
import CredentialModal from '@/components/marketplace/CredentialModal'
import toast from 'react-hot-toast'

// Mock data for demonstration with enhanced agent cards
const mockAgents = [
  {
    id: '1',
    name: 'SupportAI - Instant Customer Response Bot',
    description: 'Auto-replies to customer questions in real-time using GPT-4o. Handles 90% of common inquiries instantly.',
    price_one_time: 499,
    price_monthly: 99,
    rating: 4.9,
    reviews: 203,
    tags: ['AutoReply', 'SupportBot', 'SMS', '24/7', 'GPT-4o'],
    category: 'Support',
    cover_image: '/api/placeholder/300/200?text=SupportAI+Bot&bg=059669',
    developer: 'SupportAI',
    required_integrations: ['Gmail', 'OpenAI', 'Twilio', 'Notion'],
    setup_time: '2 mins',
    uptime: '99.8%',
    users_count: 1240,
    featured: true,
    best_seller: true,
    verified_dev: true,
    demo_available: true
  },
  {
    id: '2',
    name: 'AI Email Marketing Machine',
    description: 'Generate personalized email campaigns that convert 3x better. AI writes, schedules, and optimizes automatically.',
    price_one_time: 299,
    price_monthly: null,
    rating: 4.8,
    reviews: 189,
    tags: ['Email', 'Marketing', 'AI', 'Personalization'],
    category: 'Marketing',
    cover_image: '/api/placeholder/300/200?text=Email+Marketing+AI&bg=4F46E5',
    developer: 'EmailBot Pro',
    required_integrations: ['Gmail', 'OpenAI', 'Mailchimp', 'Google Analytics'],
    setup_time: '3 mins',
    uptime: '99.5%',
    users_count: 892,
    featured: false,
    best_seller: true,
    verified_dev: true,
    demo_available: true
  },
  {
    id: '3',
    name: 'Lead Qualification Wizard',
    description: 'AI-powered lead scoring and qualification. Automatically routes hot prospects to your sales team.',
    price_one_time: null,
    price_monthly: 149,
    rating: 4.7,
    reviews: 156,
    tags: ['Lead Gen', 'Sales', 'AI', 'CRM'],
    category: 'Sales',
    cover_image: '/api/placeholder/300/200?text=Lead+Wizard&bg=7C3AED',
    developer: 'LeadGen AI',
    required_integrations: ['HubSpot', 'OpenAI', 'Slack', 'Salesforce'],
    setup_time: '5 mins',
    uptime: '99.2%',
    users_count: 567,
    featured: true,
    best_seller: false,
    verified_dev: true,
    demo_available: false
  },
  {
    id: '4',
    name: 'Social Media Autopilot',
    description: 'Schedule and post to Twitter, LinkedIn, Facebook automatically. AI creates engaging content based on trends.',
    price_one_time: 199,
    price_monthly: 49,
    rating: 4.6,
    reviews: 134,
    tags: ['Social Media', 'Content', 'Scheduling', 'AI'],
    category: 'Marketing',
    cover_image: '/api/placeholder/300/200?text=Social+Autopilot&bg=F59E0B',
    developer: 'Social Pro',
    required_integrations: ['Twitter', 'LinkedIn', 'Facebook', 'OpenAI'],
    setup_time: '4 mins',
    uptime: '98.9%',
    users_count: 423,
    featured: false,
    best_seller: false,
    verified_dev: false,
    demo_available: true
  },
  {
    id: '5',
    name: 'Invoice & Payment Automator',
    description: 'Automatically generate and send invoices when Stripe payments complete. Sync with QuickBooks seamlessly.',
    price_one_time: 179,
    price_monthly: null,
    rating: 4.9,
    reviews: 278,
    tags: ['Finance', 'Invoicing', 'Automation', 'Payments'],
    category: 'Finance',
    cover_image: '/api/placeholder/300/200?text=Invoice+Automator&bg=DC2626',
    developer: 'FinanceFlow',
    required_integrations: ['Stripe', 'QuickBooks', 'Gmail'],
    setup_time: '3 mins',
    uptime: '99.9%',
    users_count: 1156,
    featured: false,
    best_seller: true,
    verified_dev: true,
    demo_available: false
  },
  {
    id: '6',
    name: 'Meeting Notes & Task Creator',
    description: 'Turn Zoom recordings into detailed notes and actionable tasks. Automatically saves to Notion and assigns team members.',
    price_one_time: null,
    price_monthly: 79,
    rating: 4.5,
    reviews: 98,
    tags: ['Productivity', 'AI', 'Meetings', 'Tasks'],
    category: 'Productivity',
    cover_image: '/api/placeholder/300/200?text=Meeting+Notes+AI&bg=10B981',
    developer: 'ProductivityAI',
    required_integrations: ['Zoom', 'OpenAI', 'Notion', 'Slack'],
    setup_time: '6 mins',
    uptime: '98.7%',
    users_count: 234,
    featured: false,
    best_seller: false,
    verified_dev: true,
    demo_available: true
  }
]

const categories = ['All', 'Marketing', 'Sales', 'Finance', 'Support', 'AI', 'Automation']
const priceRanges = [
  { label: 'Free', min: 0, max: 0 },
  { label: 'Under $25', min: 1, max: 25 },
  { label: '$25 - $50', min: 25, max: 50 },
  { label: '$50 - $100', min: 50, max: 100 },
  { label: 'Over $100', min: 100, max: Infinity }
]

export default function MarketplacePage() {
  const [agents, setAgents] = useState(mockAgents)
  const [filteredAgents, setFilteredAgents] = useState(mockAgents)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('rating')
  const [showFilters, setShowFilters] = useState(false)
  const [showCredentialModal, setShowCredentialModal] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<any>(null)

  // Handle agent purchase
  const handlePurchase = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId)
    if (agent) {
      // Convert to credential format for modal
      const agentWithCredentials = {
        ...agent,
        required_integrations: agent.required_integrations.map(name => ({
          id: `${agentId}_${name}`,
          name: `${name} Integration`,
          type: getIntegrationType(name),
          instruction: getIntegrationInstruction(name),
          required: true,
          integration: {
            id: name.toLowerCase().replace(/\s+/g, '_'),
            name,
            auth_method: getAuthMethod(name)
          }
        }))
      }
      setSelectedAgent(agentWithCredentials)
      setShowCredentialModal(true)
    }
  }

  // Handle learn more / demo
  const handleLearnMore = (agentId: string) => {
    toast.success('Demo feature coming soon!')
  }

  // Helper functions for credential types
  const getIntegrationType = (integration: string): 'oauth' | 'text' | 'webhook' => {
    const oauthIntegrations = ['Gmail', 'Google Calendar', 'LinkedIn', 'Facebook', 'Twitter', 'Slack', 'Notion', 'Zoom']
    if (oauthIntegrations.includes(integration)) return 'oauth'
    return 'text'
  }

  const getAuthMethod = (integration: string): string => {
    const oauthIntegrations = ['Gmail', 'Google Calendar', 'LinkedIn', 'Facebook', 'Twitter', 'Slack', 'Notion', 'Zoom']
    return oauthIntegrations.includes(integration) ? 'oauth' : 'api_key'
  }

  const getIntegrationInstruction = (integration: string): string => {
    const instructions: { [key: string]: string } = {
      'Gmail': 'Click to connect your Gmail account for email automation',
      'OpenAI': 'Enter your OpenAI API key with GPT-4 access',
      'Slack': 'Connect your Slack workspace to enable bot messaging',
      'Twilio': 'Add your Twilio Account SID and Auth Token for SMS',
      'Stripe': 'Connect your Stripe account for payment processing',
      'HubSpot': 'Enter your HubSpot API key for CRM integration',
      'Salesforce': 'Connect your Salesforce account',
      'QuickBooks': 'Connect your QuickBooks account for accounting',
      'Notion': 'Connect your Notion workspace',
      'Zoom': 'Connect your Zoom account for meeting management'
    }
    return instructions[integration] || `Enter your ${integration} credentials`
  }

  const handleCredentialComplete = () => {
    toast.success('Agent activated successfully! Check your dashboard.')
  }

  useEffect(() => {
    let filtered = [...agents]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(agent => 
        agent.category === selectedCategory || agent.tags.includes(selectedCategory)
      )
    }

    // Price range filter
    if (selectedPriceRange) {
      const range = priceRanges.find(r => r.label === selectedPriceRange)
      if (range) {
        filtered = filtered.filter(agent => {
          const price = agent.price_one_time || agent.price_monthly || 0
          return price >= range.min && (range.max === Infinity ? true : price <= range.max)
        })
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating
        case 'price-low':
          const priceA = a.price_one_time || a.price_monthly || 0
          const priceB = b.price_one_time || b.price_monthly || 0
          return priceA - priceB
        case 'price-high':
          const priceA2 = a.price_one_time || a.price_monthly || 0
          const priceB2 = b.price_one_time || b.price_monthly || 0
          return priceB2 - priceA2
        case 'reviews':
          return b.reviews - a.reviews
        default:
          return 0
      }
    })

    setFilteredAgents(filtered)
  }, [agents, searchQuery, selectedCategory, selectedPriceRange, sortBy])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Agent Marketplace
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Discover and purchase AI automation agents to streamline your workflow
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents, tags, or categories..."
                className="input pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-outline flex items-center lg:hidden"
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input lg:w-48"
            >
              <option value="rating">Highest Rated</option>
              <option value="reviews">Most Reviews</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>

          {/* Filters */}
          <div className={`${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="grid lg:grid-cols-3 gap-4 p-4 card">
              {/* Categories */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Category</h3>
                <div className="space-y-2">
                  {categories.map(category => (
                    <label key={category} className="flex items-center">
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === category}
                        onChange={() => setSelectedCategory(category)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {category}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Price Range</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="price"
                      checked={selectedPriceRange === null}
                      onChange={() => setSelectedPriceRange(null)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Any Price
                    </span>
                  </label>
                  {priceRanges.map(range => (
                    <label key={range.label} className="flex items-center">
                      <input
                        type="radio"
                        name="price"
                        checked={selectedPriceRange === range.label}
                        onChange={() => setSelectedPriceRange(range.label)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {range.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Results</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredAgents.length} of {agents.length} agents
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onPurchase={handlePurchase}
              onLearnMore={handleLearnMore}
            />
          ))}
        </div>

        {/* Credential Modal */}
        {showCredentialModal && selectedAgent && (
          <CredentialModal
            isOpen={showCredentialModal}
            onClose={() => setShowCredentialModal(false)}
            agent={selectedAgent}
            onComplete={handleCredentialComplete}
          />
        )}

        {/* Empty State */}
        {filteredAgents.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No agents found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try adjusting your search criteria or filters
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('All')
                setSelectedPriceRange(null)
              }}
              className="btn btn-primary"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
