'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  StarIcon,
  TagIcon,
  UserIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface AgentCardProps {
  agent: {
    id: string
    name: string
    description: string
    price_one_time: number | null
    price_monthly: number | null
    rating: number
    reviews: number
    tags: string[]
    category: string
    cover_image: string
    developer: string
    required_integrations: string[]
    setup_time?: string
    uptime?: string
    users_count?: number
    featured?: boolean
    best_seller?: boolean
    verified_dev?: boolean
    demo_available?: boolean
  }
  onPurchase?: (agentId: string) => void
  onLearnMore?: (agentId: string) => void
}

export default function AgentCard({ agent, onPurchase, onLearnMore }: AgentCardProps) {
  const [imageError, setImageError] = useState(false)

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => {
      const filled = i < Math.floor(rating)
      const partial = i < rating && i >= Math.floor(rating)
      
      return (
        <div key={i} className="relative">
          {filled ? (
            <StarIconSolid className="w-4 h-4 text-yellow-400" />
          ) : partial ? (
            <div className="relative">
              <StarIcon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${(rating - Math.floor(rating)) * 100}%` }}
              >
                <StarIconSolid className="w-4 h-4 text-yellow-400" />
              </div>
            </div>
          ) : (
            <StarIcon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          )}
        </div>
      )
    })
  }

  const getIntegrationIcon = (integration: string) => {
    const iconMap: { [key: string]: string } = {
      'Gmail': '📧',
      'OpenAI': '🤖',
      'Slack': '💬',
      'Twilio': '📞',
      'Stripe': '💳',
      'HubSpot': '🔧',
      'Salesforce': '☁️',
      'Google Calendar': '📅',
      'Notion': '📝',
      'Zapier': '⚡',
      'GitHub': '🐙',
      'LinkedIn': '💼',
      'Twitter': '🐦',
      'Facebook': '👥',
      'Discord': '🎮',
      'Zoom': '🎥',
      'Dropbox': '📦',
      'Google Drive': '💾'
    }
    return iconMap[integration] || '🔗'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 group">
      {/* Header Image */}
      <div className="relative h-48 overflow-hidden">
        <Image
          src={imageError ? '/api/placeholder/300/200?text=Agent+Preview&bg=6366F1' : agent.cover_image}
          alt={agent.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageError(true)}
        />
        
        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {agent.featured && (
            <span className="px-2 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
              ⭐ Featured
            </span>
          )}
          {agent.best_seller && (
            <span className="px-2 py-1 bg-orange-600 text-white text-xs font-medium rounded-full">
              🔥 Best Seller
            </span>
          )}
        </div>

        {/* Quick Stats Overlay */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 text-right">
          {agent.uptime && (
            <span className="px-2 py-1 bg-black/70 text-white text-xs rounded-full">
              {agent.uptime} Uptime
            </span>
          )}
          {agent.users_count && (
            <span className="px-2 py-1 bg-black/70 text-white text-xs rounded-full">
              {agent.users_count.toLocaleString()} Users
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Agent Name & Category */}
        <div className="mb-3">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 flex-1">
              {agent.name}
            </h3>
            <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
              {agent.category}
            </span>
          </div>
          
          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {agent.description}
          </p>
        </div>

        {/* Pricing */}
        <div className="mb-4">
          {agent.price_one_time && agent.price_monthly ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-green-600">
                  ${agent.price_one_time}
                </span>
                <span className="text-sm text-gray-500">one-time</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-md font-semibold text-blue-600">
                  ${agent.price_monthly}/mo
                </span>
                <span className="text-sm text-gray-500">subscription</span>
              </div>
            </div>
          ) : agent.price_one_time ? (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-green-600">
                ${agent.price_one_time}
              </span>
              <span className="text-sm text-gray-500">one-time purchase</span>
            </div>
          ) : agent.price_monthly ? (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-blue-600">
                ${agent.price_monthly}
              </span>
              <span className="text-sm text-gray-500">/month</span>
            </div>
          ) : (
            <span className="text-lg font-semibold text-green-600">Free</span>
          )}
        </div>

        {/* Required Integrations */}
        <div className="mb-4">
          <div className="flex items-center gap-1 mb-2">
            <TagIcon className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Required Integrations:
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {agent.required_integrations.slice(0, 4).map((integration) => (
              <span
                key={integration}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded-full"
              >
                <span>{getIntegrationIcon(integration)}</span>
                {integration}
              </span>
            ))}
            {agent.required_integrations.length > 4 && (
              <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                +{agent.required_integrations.length - 4} more
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {agent.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Rating & Reviews */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex">{renderStars(agent.rating)}</div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {agent.rating.toFixed(1)}
            </span>
            <span className="text-sm text-gray-500">
              ({agent.reviews.toLocaleString()})
            </span>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {agent.setup_time && (
              <div className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {agent.setup_time}
              </div>
            )}
          </div>
        </div>

        {/* Developer Info */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              by {agent.developer}
            </span>
            {agent.verified_dev && (
              <CheckIcon className="w-4 h-4 text-green-500" />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {agent.demo_available && (
            <button
              onClick={() => onLearnMore?.(agent.id)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Try Demo
            </button>
          )}
          <button
            onClick={() => onPurchase?.(agent.id)}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {agent.price_one_time && !agent.price_monthly ? 'Buy Now' : 
             agent.price_monthly && !agent.price_one_time ? 'Subscribe' : 
             'Get Started'}
          </button>
        </div>

        {/* Trust Signals */}
        {(agent.setup_time || agent.uptime) && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-xs text-gray-500">
              {agent.setup_time && (
                <span>⚡ Setup: {agent.setup_time}</span>
              )}
              {agent.uptime && (
                <span>✅ {agent.uptime} Uptime</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
