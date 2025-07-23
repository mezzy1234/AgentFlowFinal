'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Percent, 
  DollarSign, 
  Star, 
  ShoppingCart, 
  Users, 
  Tag,
  Gift,
  TrendingUp,
  Calendar,
  Check,
  Plus,
  Minus,
  X,
  Edit,
  Eye,
  ArrowRight
} from 'lucide-react';
import Image from 'next/image';

// Types
export interface Agent {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url?: string;
  category?: string;
  rating: number;
  total_reviews: number;
}

export interface AgentBundle {
  id: string;
  title: string;
  description: string;
  slug: string;
  bundle_type: 'collection' | 'workflow' | 'themed' | 'developer';
  
  // Pricing
  individual_total: number;
  bundle_price: number;
  savings_amount: number;
  savings_percentage: number;
  
  // Metadata
  image_url?: string;
  tags: string[];
  category_ids: string[];
  
  // Stats
  purchase_count: number;
  view_count: number;
  
  // Agents
  agents: Agent[];
  featured_agents: Agent[];
  
  // Status
  is_featured: boolean;
  is_public: boolean;
  created_by: string;
  created_at: Date;
  published_at?: Date;
  
  // Reviews
  average_rating?: number;
  total_reviews?: number;
}

export interface BundleCollection {
  id: string;
  name: string;
  description: string;
  slug: string;
  is_featured: boolean;
  banner_image_url?: string;
  bundles: AgentBundle[];
}

// Bundle card component
export function BundleCard({ 
  bundle, 
  variant = 'standard',
  showPurchaseButton = true,
  onPurchase,
  onView 
}: {
  bundle: AgentBundle;
  variant?: 'standard' | 'compact' | 'featured';
  showPurchaseButton?: boolean;
  onPurchase?: () => void;
  onView?: () => void;
}) {
  const getBundleTypeColor = (type: string) => {
    switch (type) {
      case 'collection': return 'bg-blue-100 text-blue-800';
      case 'workflow': return 'bg-green-100 text-green-800';
      case 'themed': return 'bg-purple-100 text-purple-800';
      case 'developer': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (variant === 'compact') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-start space-x-3">
          {bundle.image_url && (
            <Image
              src={bundle.image_url}
              alt={bundle.title}
              width={60}
              height={60}
              className="rounded-lg flex-shrink-0"
            />
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{bundle.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{bundle.description}</p>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-green-600">
                  {formatPrice(bundle.bundle_price)}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  {formatPrice(bundle.individual_total)}
                </span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  -{Math.round(bundle.savings_percentage)}%
                </span>
              </div>
              
              <span className="text-xs text-gray-500">
                {bundle.agents.length} agents
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'featured') {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <Star className="h-5 w-5 text-yellow-300 fill-current" />
        </div>
        
        <div className="space-y-4">
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium bg-white bg-opacity-20`}>
              Featured Bundle
            </span>
            <h3 className="text-xl font-bold mt-2">{bundle.title}</h3>
            <p className="text-blue-100 text-sm">{bundle.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-blue-100">Agents Included</div>
              <div className="font-semibold">{bundle.agents.length}</div>
            </div>
            <div>
              <div className="text-blue-100">Total Savings</div>
              <div className="font-semibold">{Math.round(bundle.savings_percentage)}%</div>
            </div>
          </div>

          <div className="border-t border-white border-opacity-20 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-2xl font-bold">{formatPrice(bundle.bundle_price)}</span>
                <span className="text-blue-200 line-through ml-2 text-sm">
                  {formatPrice(bundle.individual_total)}
                </span>
              </div>
              <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
                SAVE {formatPrice(bundle.savings_amount)}
              </span>
            </div>
            
            {showPurchaseButton && (
              <button
                onClick={onPurchase}
                className="w-full bg-white text-purple-600 font-semibold py-3 rounded-lg hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Get Bundle</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standard variant
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Bundle image or placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-blue-50 to-purple-50">
        {bundle.image_url ? (
          <Image
            src={bundle.image_url}
            alt={bundle.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="h-16 w-16 text-gray-400" />
          </div>
        )}
        
        {/* Bundle type badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBundleTypeColor(bundle.bundle_type)}`}>
            {bundle.bundle_type.charAt(0).toUpperCase() + bundle.bundle_type.slice(1)}
          </span>
        </div>

        {/* Featured badge */}
        {bundle.is_featured && (
          <div className="absolute top-3 right-3">
            <Star className="h-5 w-5 text-yellow-500 fill-current" />
          </div>
        )}

        {/* Savings badge */}
        <div className="absolute bottom-3 right-3">
          <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
            <Percent className="h-3 w-3" />
            <span>{Math.round(bundle.savings_percentage)}% OFF</span>
          </span>
        </div>
      </div>

      {/* Bundle content */}
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{bundle.title}</h3>
          <p className="text-gray-600 text-sm line-clamp-2">{bundle.description}</p>
        </div>

        {/* Featured agents preview */}
        {bundle.featured_agents && bundle.featured_agents.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-500 mb-2">INCLUDES</div>
            <div className="flex -space-x-2 mb-2">
              {bundle.featured_agents.slice(0, 4).map((agent, index) => (
                <div
                  key={agent.id}
                  className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                  title={agent.title}
                >
                  {agent.title.charAt(0).toUpperCase()}
                </div>
              ))}
              {bundle.agents.length > 4 && (
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white">
                  +{bundle.agents.length - 4}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {bundle.agents.length} agents total
            </div>
          </div>
        )}

        {/* Tags */}
        {bundle.tags && bundle.tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {bundle.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
              {bundle.tags.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                  +{bundle.tags.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center space-x-4 mb-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>{bundle.purchase_count}</span>
          </div>
          {bundle.average_rating && (
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>{bundle.average_rating.toFixed(1)}</span>
              <span>({bundle.total_reviews})</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Eye className="h-4 w-4" />
            <span>{bundle.view_count}</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-2xl font-bold text-green-600">
                {formatPrice(bundle.bundle_price)}
              </span>
              <span className="text-gray-500 line-through ml-2">
                {formatPrice(bundle.individual_total)}
              </span>
            </div>
            <div className="text-right">
              <div className="text-green-600 font-semibold">
                Save {formatPrice(bundle.savings_amount)}
              </div>
              <div className="text-xs text-gray-500">
                {Math.round(bundle.savings_percentage)}% discount
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-2">
            {showPurchaseButton && (
              <button
                onClick={onPurchase}
                className="flex-1 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Purchase Bundle</span>
              </button>
            )}
            <button
              onClick={onView}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Bundle builder component
export function BundleBuilder({ 
  onSave,
  initialBundle,
  availableAgents 
}: {
  onSave: (bundle: Partial<AgentBundle>) => void;
  initialBundle?: Partial<AgentBundle>;
  availableAgents: Agent[];
}) {
  const [bundle, setBundle] = useState<Partial<AgentBundle>>(initialBundle || {
    title: '',
    description: '',
    bundle_type: 'collection',
    bundle_price: 0,
    agents: [],
    tags: [],
    is_public: true
  });

  const [selectedAgents, setSelectedAgents] = useState<Agent[]>(initialBundle?.agents || []);
  const [searchQuery, setSearchQuery] = useState('');

  const individualTotal = selectedAgents.reduce((sum, agent) => sum + agent.price, 0);
  const maxDiscount = individualTotal * 0.5; // Max 50% discount
  const suggestedPrice = individualTotal * 0.8; // Suggest 20% discount

  const filteredAgents = availableAgents.filter(agent => 
    agent.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedAgents.some(selected => selected.id === agent.id)
  );

  const addAgent = (agent: Agent) => {
    const newSelectedAgents = [...selectedAgents, agent];
    setSelectedAgents(newSelectedAgents);
    setBundle(prev => ({
      ...prev,
      agents: newSelectedAgents,
      individual_total: newSelectedAgents.reduce((sum, a) => sum + a.price, 0)
    }));
  };

  const removeAgent = (agentId: string) => {
    const newSelectedAgents = selectedAgents.filter(agent => agent.id !== agentId);
    setSelectedAgents(newSelectedAgents);
    setBundle(prev => ({
      ...prev,
      agents: newSelectedAgents,
      individual_total: newSelectedAgents.reduce((sum, a) => sum + a.price, 0)
    }));
  };

  const updateField = (field: keyof AgentBundle, value: any) => {
    setBundle(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const bundleToSave = {
      ...bundle,
      individual_total: individualTotal,
      savings_amount: individualTotal - (bundle.bundle_price || 0),
      savings_percentage: individualTotal > 0 ? ((individualTotal - (bundle.bundle_price || 0)) / individualTotal) * 100 : 0
    };
    onSave(bundleToSave);
  };

  return (
    <div className="space-y-6">
      {/* Bundle Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Bundle Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bundle Title
            </label>
            <input
              type="text"
              value={bundle.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter bundle title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bundle Type
            </label>
            <select
              value={bundle.bundle_type || 'collection'}
              onChange={(e) => updateField('bundle_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="collection">Collection</option>
              <option value="workflow">Workflow</option>
              <option value="themed">Themed</option>
              <option value="developer">Developer Special</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={bundle.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe your bundle..."
          />
        </div>
      </div>

      {/* Agent Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Agents</h3>
        
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Selected Agents */}
        {selectedAgents.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Selected Agents ({selectedAgents.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedAgents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <h5 className="font-medium text-gray-900">{agent.title}</h5>
                    <p className="text-sm text-gray-600">${agent.price.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => removeAgent(agent.id)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Agents */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Available Agents</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
            {filteredAgents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-900">{agent.title}</h5>
                  <p className="text-sm text-gray-600">${agent.price.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => addAgent(agent)}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Individual Total
            </label>
            <div className="text-2xl font-bold text-gray-900">
              ${individualTotal.toFixed(2)}
            </div>
            <p className="text-sm text-gray-500">Sum of all agent prices</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bundle Price
            </label>
            <input
              type="number"
              min="0"
              max={individualTotal}
              step="0.01"
              value={bundle.bundle_price || 0}
              onChange={(e) => updateField('bundle_price', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Suggested: ${suggestedPrice.toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Savings
            </label>
            <div className="text-2xl font-bold text-green-600">
              ${(individualTotal - (bundle.bundle_price || 0)).toFixed(2)}
            </div>
            <p className="text-sm text-gray-500">
              {individualTotal > 0 ? (((individualTotal - (bundle.bundle_price || 0)) / individualTotal) * 100).toFixed(1) : 0}% discount
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={handleSave}
          disabled={!bundle.title || selectedAgents.length === 0 || !bundle.bundle_price}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          Save Bundle
        </button>
      </div>
    </div>
  );
}

// Bundle collections component
export function BundleCollections({ collections }: { collections: BundleCollection[] }) {
  return (
    <div className="space-y-8">
      {collections.map((collection) => (
        <div key={collection.id} className="space-y-6">
          {/* Collection Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{collection.name}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">{collection.description}</p>
          </div>

          {/* Collection Bundles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collection.bundles.map((bundle) => (
              <BundleCard
                key={bundle.id}
                bundle={bundle}
                variant={collection.is_featured ? 'featured' : 'standard'}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
