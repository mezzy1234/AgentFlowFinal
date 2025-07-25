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
    users_count: 1847,
    featured: true,
    best_seller: true,
    verified_dev: true,
    demo_available: true
  },
  {
    id: '2',
    name: 'Email Marketing AI - Campaign Automation',
    description: 'Automated email campaigns with AI-powered personalization. Increases open rates by 40% on average.',
    price_one_time: 299,
    price_monthly: 79,
    rating: 4.7,
    reviews: 156,
    tags: ['Email', 'Marketing', 'AI', 'Automation', 'Analytics'],
    category: 'Marketing',
    cover_image: '/api/placeholder/300/200?text=Email+Marketing+AI&bg=4F46E5',
    developer: 'MarketingAI Pro',
    required_integrations: ['Mailchimp', 'OpenAI', 'HubSpot', 'Analytics'],
    setup_time: '4 mins',
    uptime: '99.2%',
    users_count: 923,
    featured: true,
    best_seller: false,
    verified_dev: true,
    demo_available: true
  },
  {
    id: '3',
    name: 'Lead Wizard - Sales Automation',
    description: 'Automatically qualify and nurture leads through intelligent conversations and follow-up sequences.',
    price_one_time: 0,
    price_monthly: 149,
    rating: 4.8,
    reviews: 89,
    tags: ['Sales', 'Lead', 'CRM', 'Automation', 'Qualification'],
    category: 'Sales',
    cover_image: '/api/placeholder/300/200?text=Lead+Wizard&bg=7C3AED',
    developer: 'SalesFlow',
    required_integrations: ['Salesforce', 'LinkedIn', 'OpenAI', 'Calendly'],
    setup_time: '8 mins',
    uptime: '99.5%',
    users_count: 445,
    featured: false,
    best_seller: true,
    verified_dev: true,
    demo_available: true
  },
  {
    id: '4',
    name: 'Social Autopilot - Content & Engagement',
    description: 'Automated social media posting and engagement across all major platforms. AI-generated content included.',
    price_one_time: 199,
    price_monthly: 49,
    rating: 4.6,
    reviews: 278,
    tags: ['Social', 'Content', 'Automation', 'Multi-Platform', 'AI'],
    category: 'Marketing',
    cover_image: '/api/placeholder/300/200?text=Social+Autopilot&bg=F59E0B',
    developer: 'SocialAI',
    required_integrations: ['Twitter', 'LinkedIn', 'Instagram', 'OpenAI'],
    setup_time: '3 mins',
    uptime: '98.9%',
    users_count: 1234,
    featured: false,
    best_seller: true,
    verified_dev: false,
    demo_available: true
  },
  {
    id: '5',
    name: 'Invoice Automator - Finance Management',
    description: 'Automatically generates, sends, and tracks invoices. Integrates with payment processors for seamless billing.',
    price_one_time: 399,
    price_monthly: 0,
    rating: 4.9,
    reviews: 112,
    tags: ['Finance', 'Invoicing', 'Automation', 'Payments', 'Tracking'],
    category: 'Finance',
    cover_image: '/api/placeholder/300/200?text=Invoice+Automator&bg=DC2626',
    developer: 'FinanceAI',
    required_integrations: ['Stripe', 'QuickBooks', 'Gmail', 'PayPal'],
    setup_time: '5 mins',
    uptime: '99.7%',
    users_count: 567,
    featured: false,
    best_seller: false,
    verified_dev: true,
    demo_available: false
  },
  {
    id: '6',
    name: 'Meeting Notes AI - Productivity Booster',
    description: 'Automatically transcribes and summarizes meeting recordings. Creates action items and follow-up reminders.',
    price_one_time: 0,
    price_monthly: 29,
    rating: 4.5,
    reviews: 334,
    tags: ['Productivity', 'Meetings', 'AI', 'Transcription', 'Summary'],
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
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedPriceRange, setSelectedPriceRange] = useState('')
  const [sortBy, setSortBy] = useState('featured')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<any>(null)
  const [showCredentialModal, setShowCredentialModal] = useState(false)

  // Filter agents based on search, category, and price
  useEffect(() => {
    let filtered = mockAgents

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(agent => 
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(agent => agent.category === selectedCategory)
    }

    // Price filter
    if (selectedPriceRange) {
      const range = priceRanges.find(r => r.label === selectedPriceRange)
      if (range) {
        filtered = filtered.filter(agent => {
          const price = agent.price_monthly || agent.price_one_time || 0
          return price >= range.min && price <= range.max
        })
      }
    }

    // Sort agents
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => {
          const priceA = a.price_monthly || a.price_one_time || 0
          const priceB = b.price_monthly || b.price_one_time || 0
          return priceA - priceB
        })
        break
      case 'price-high':
        filtered.sort((a, b) => {
          const priceA = a.price_monthly || a.price_one_time || 0
          const priceB = b.price_monthly || b.price_one_time || 0
          return priceB - priceA
        })
        break
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating)
        break
      case 'popular':
        filtered.sort((a, b) => b.users_count - a.users_count)
        break
      default: // featured
        filtered.sort((a, b) => {
          if (a.featured && !b.featured) return -1
          if (!a.featured && b.featured) return 1
          if (a.best_seller && !b.best_seller) return -1
          if (!a.best_seller && b.best_seller) return 1
          return b.rating - a.rating
        })
    }

    setFilteredAgents(filtered)
  }, [searchTerm, selectedCategory, selectedPriceRange, sortBy])

  const handlePurchase = (agentId: string) => {
    const agent = mockAgents.find(a => a.id === agentId)
    if (!agent) return

    // Redirect to Stripe checkout page
    const checkoutUrl = `/checkout?agent=${agentId}&name=${encodeURIComponent(agent.name)}&price=${agent.price_monthly || agent.price_one_time}`
    window.location.href = checkoutUrl
  }

  const handleCredentialsComplete = () => {
    setShowCredentialModal(false)
    if (selectedAgent && 'name' in selectedAgent) {
      toast.success(`Agent activated! ${selectedAgent.name} is now running.`)
    }
    setSelectedAgent(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Agent Marketplace
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Discover and deploy powerful AI agents to automate your workflows
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="Search agents, features, or categories..."
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <FunnelIcon className="h-4 w-4" />
              <span>Filters</span>
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="featured">Featured</option>
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>

            {/* Results count */}
            <span className="text-gray-600 dark:text-gray-300">
              {filteredAgents.length} agents found
            </span>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Categories */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Category</h3>
                  <div className="space-y-2">
                    {categories.map(category => (
                      <label key={category} className="flex items-center">
                        <input
                          type="radio"
                          name="category"
                          value={category}
                          checked={selectedCategory === category}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Price Range</h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="priceRange"
                        value=""
                        checked={selectedPriceRange === ''}
                        onChange={(e) => setSelectedPriceRange(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Any Price</span>
                    </label>
                    {priceRanges.map(range => (
                      <label key={range.label} className="flex items-center">
                        <input
                          type="radio"
                          name="priceRange"
                          value={range.label}
                          checked={selectedPriceRange === range.label}
                          onChange={(e) => setSelectedPriceRange(e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{range.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onPurchase={handlePurchase}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <MagnifyingGlassIcon className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No agents found
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Try adjusting your search or filter criteria
            </p>
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('All')
                setSelectedPriceRange('')
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Credential Modal */}
      {showCredentialModal && selectedAgent && (
        <CredentialModal
          isOpen={showCredentialModal}
          agent={selectedAgent}
          onComplete={handleCredentialsComplete}
          onClose={() => {
            setShowCredentialModal(false)
            setSelectedAgent(null)
          }}
        />
      )}
    </div>
  )
}
