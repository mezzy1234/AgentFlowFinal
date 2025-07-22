'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Star, TrendingUp, Users, Zap, Clock, Tag, ArrowUpDown } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  rating: number;
  reviews: number;
  sales: number;
  developer: {
    name: string;
    avatar?: string;
  };
  tags: string[];
  featured: boolean;
  trending: boolean;
  new: boolean;
  lastUpdated: string;
  executionTime: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

const CATEGORIES = [
  { id: 'all', name: 'All Categories', icon: '📋' },
  { id: 'productivity', name: 'Productivity', icon: '⚡' },
  { id: 'communication', name: 'Communication', icon: '💬' },
  { id: 'data', name: 'Data Processing', icon: '📊' },
  { id: 'automation', name: 'Automation', icon: '🤖' },
  { id: 'content', name: 'Content Creation', icon: '✍️' },
  { id: 'marketing', name: 'Marketing', icon: '📈' },
  { id: 'finance', name: 'Finance', icon: '💰' },
  { id: 'development', name: 'Development', icon: '👨‍💻' }
];

const SORT_OPTIONS = [
  { id: 'featured', name: 'Featured', icon: '⭐' },
  { id: 'popular', name: 'Most Popular', icon: '🔥' },
  { id: 'newest', name: 'Newest', icon: '🆕' },
  { id: 'rating', name: 'Highest Rated', icon: '⭐' },
  { id: 'price-low', name: 'Price: Low to High', icon: '💲' },
  { id: 'price-high', name: 'Price: High to Low', icon: '💰' }
];

export function EnhancedAgentMarketplace() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedComplexity, setSelectedComplexity] = useState<string[]>([]);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    filterAndSortAgents();
  }, [agents, searchQuery, selectedCategory, sortBy, priceRange, selectedComplexity]);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select(`
          id,
          name,
          description,
          category,
          price,
          rating,
          tags,
          featured,
          created_at,
          updated_at,
          profiles!developer_id(name, avatar_url),
          agent_reviews(rating),
          purchase_receipts(id)
        `)
        .eq('is_public', true)
        .order('featured', { ascending: false });

      if (error) throw error;

      const processedAgents: Agent[] = data.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        category: agent.category,
        price: parseFloat(agent.price) || 0,
        rating: agent.rating || 0,
        reviews: agent.agent_reviews?.length || 0,
        sales: agent.purchase_receipts?.length || 0,
        developer: {
          name: agent.profiles?.name || 'Unknown Developer',
          avatar: agent.profiles?.avatar_url
        },
        tags: agent.tags || [],
        featured: agent.featured || false,
        trending: (agent.purchase_receipts?.length || 0) > 10, // Simple trending logic
        new: new Date(agent.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lastUpdated: agent.updated_at,
        executionTime: '~2 min', // Placeholder - would calculate based on actual runs
        complexity: agent.price > 50 ? 'advanced' : agent.price > 20 ? 'intermediate' : 'beginner'
      }));

      setAgents(processedAgents);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortAgents = () => {
    let filtered = [...agents];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(agent => agent.category === selectedCategory);
    }

    // Price filter
    filtered = filtered.filter(agent => 
      agent.price >= priceRange[0] && agent.price <= priceRange[1]
    );

    // Complexity filter
    if (selectedComplexity.length > 0) {
      filtered = filtered.filter(agent => selectedComplexity.includes(agent.complexity));
    }

    // Sort
    switch (sortBy) {
      case 'featured':
        filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
      case 'popular':
        filtered.sort((a, b) => b.sales - a.sales);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
    }

    setFilteredAgents(filtered);
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-lg p-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Agent Marketplace</h1>
        <p className="text-blue-100 mb-6">Discover powerful AI agents to automate your workflows</p>
        
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search agents, categories, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center space-x-2",
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
          
          <div className="text-sm text-gray-600">
            {filteredAgents.length} agents found
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <ArrowUpDown className="h-4 w-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>${priceRange[0]}</span>
                  <span>${priceRange[1]}</span>
                </div>
              </div>
            </div>

            {/* Complexity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Complexity</label>
              <div className="space-y-2">
                {['beginner', 'intermediate', 'advanced'].map(complexity => (
                  <label key={complexity} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedComplexity.includes(complexity)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedComplexity([...selectedComplexity, complexity]);
                        } else {
                          setSelectedComplexity(selectedComplexity.filter(c => c !== complexity));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{complexity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Filters</label>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded text-sm">
                  ⭐ Featured only
                </button>
                <button className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded text-sm">
                  🔥 Trending now
                </button>
                <button className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded text-sm">
                  🆕 New this week
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map(agent => (
          <div key={agent.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all duration-300 group overflow-hidden">
            {/* Header with badges */}
            <div className="relative p-6 pb-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-wrap gap-2">
                  {agent.featured && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      ⭐ Featured
                    </span>
                  )}
                  {agent.trending && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      🔥 Trending
                    </span>
                  )}
                  {agent.new && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      🆕 New
                    </span>
                  )}
                </div>
                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize",
                  getComplexityColor(agent.complexity)
                )}>
                  {agent.complexity}
                </span>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {agent.name}
              </h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {agent.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {agent.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </span>
                ))}
                {agent.tags.length > 3 && (
                  <span className="text-xs text-gray-500">+{agent.tags.length - 3} more</span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center mb-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm font-medium">{agent.rating.toFixed(1)}</span>
                  </div>
                  <div className="text-xs text-gray-500">{agent.reviews} reviews</div>
                </div>
                <div>
                  <div className="flex items-center justify-center mb-1">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="ml-1 text-sm font-medium">{agent.sales}</span>
                  </div>
                  <div className="text-xs text-gray-500">purchases</div>
                </div>
                <div>
                  <div className="flex items-center justify-center mb-1">
                    <Clock className="h-4 w-4 text-green-500" />
                    <span className="ml-1 text-sm font-medium">{agent.executionTime}</span>
                  </div>
                  <div className="text-xs text-gray-500">avg time</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {agent.developer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{agent.developer.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    ${agent.price.toFixed(2)}
                  </div>
                </div>
              </div>
              
              <button className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
          <p className="text-gray-600">Try adjusting your search terms or filters</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setPriceRange([0, 100]);
              setSelectedComplexity([]);
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Load More */}
      {filteredAgents.length > 0 && filteredAgents.length % 9 === 0 && (
        <div className="text-center">
          <button className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            Load More Agents
          </button>
        </div>
      )}
    </div>
  );
}
