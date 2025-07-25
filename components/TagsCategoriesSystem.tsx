'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Tag, 
  Hash, 
  Search, 
  Filter, 
  X, 
  Plus, 
  TrendingUp, 
  Star,
  Folder,
  ChevronDown,
  Grid,
  List
} from 'lucide-react';

// Types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  agent_count?: number;
  children?: Category[];
}

export interface TagItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  usage_count: number;
  is_trending: boolean;
  is_featured: boolean;
  relevance_score?: number;
}

export interface TagCluster {
  id: string;
  name: string;
  description?: string;
  tags: TagItem[];
  similarity_threshold: number;
}

// Category component
export function CategoryCard({ 
  category, 
  selected = false, 
  onClick, 
  showCount = true 
}: {
  category: Category;
  selected?: boolean;
  onClick?: () => void;
  showCount?: boolean;
}) {
  const IconComponent = category.icon ? require('lucide-react')[category.icon] : Folder;

  return (
    <div
      onClick={onClick}
      className={`
        group relative p-4 rounded-lg border cursor-pointer transition-all duration-200
        ${selected 
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-center space-x-3">
        <div 
          className="p-2 rounded-lg"
          style={{ 
            backgroundColor: category.color ? `${category.color}20` : '#F3F4F6',
            color: category.color || '#6B7280'
          }}
        >
          <IconComponent className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {category.name}
          </h3>
          {category.description && (
            <p className="text-sm text-gray-600 truncate">
              {category.description}
            </p>
          )}
        </div>

        {showCount && category.agent_count !== undefined && (
          <div className="text-sm text-gray-500 font-medium">
            {category.agent_count}
          </div>
        )}
      </div>

      {/* Subcategories preview */}
      {category.children && category.children.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {category.children.slice(0, 3).map((child) => (
            <span
              key={child.id}
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
            >
              {child.name}
            </span>
          ))}
          {category.children.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
              +{category.children.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Tag component
export function TagChip({ 
  tag, 
  selected = false, 
  removable = false,
  size = 'md',
  onClick, 
  onRemove 
}: {
  tag: TagItem;
  selected?: boolean;
  removable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onRemove?: () => void;
}) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <div
      className={`
        inline-flex items-center space-x-1 rounded-full font-medium cursor-pointer transition-all duration-200
        ${selected 
          ? 'bg-blue-500 text-white ring-2 ring-blue-200' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
        ${sizeClasses[size]}
      `}
      style={tag.color && !selected ? { 
        backgroundColor: `${tag.color}20`, 
        color: tag.color 
      } : {}}
      onClick={onClick}
    >
      <Hash className="h-3 w-3" />
      <span>{tag.name}</span>
      
      {tag.is_trending && (
        <TrendingUp className="h-3 w-3 text-orange-500" />
      )}
      
      {tag.is_featured && (
        <Star className="h-3 w-3 text-yellow-500" />
      )}
      
      {tag.usage_count > 0 && size !== 'sm' && (
        <span className="text-xs opacity-75">({tag.usage_count})</span>
      )}

      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-black hover:bg-opacity-20 rounded-full p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// Category tree view
export function CategoryTree({ 
  categories, 
  selectedCategories = [], 
  onCategorySelect, 
  multiSelect = true 
}: {
  categories: Category[];
  selectedCategories?: string[];
  onCategorySelect: (categoryId: string) => void;
  multiSelect?: boolean;
}) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const renderCategory = (category: Category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.includes(category.id);
    const isSelected = selectedCategories.includes(category.id);

    return (
      <div key={category.id} className="space-y-1">
        <div 
          className={`
            flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors duration-200
            ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}
          `}
          style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(category.id)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <ChevronDown 
                className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} 
              />
            </button>
          )}
          
          <div 
            className="flex-1 flex items-center space-x-2"
            onClick={() => onCategorySelect(category.id)}
          >
            <div 
              className="p-1 rounded"
              style={{ 
                backgroundColor: category.color ? `${category.color}20` : '#F3F4F6',
                color: category.color || '#6B7280'
              }}
            >
              <Folder className="h-4 w-4" />
            </div>
            
            <span className={`text-sm ${isSelected ? 'font-medium text-blue-900' : 'text-gray-700'}`}>
              {category.name}
            </span>
            
            {category.agent_count !== undefined && (
              <span className="text-xs text-gray-500">({category.agent_count})</span>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {categories.map(category => renderCategory(category))}
    </div>
  );
}

// Tag input with suggestions
export function TagInput({ 
  selectedTags = [], 
  onTagsChange, 
  suggestions = [],
  placeholder = "Add tags...",
  maxTags = 10 
}: {
  selectedTags?: TagItem[];
  onTagsChange: (tags: TagItem[]) => void;
  suggestions?: TagItem[];
  placeholder?: string;
  maxTags?: number;
}) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<TagItem[]>([]);

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = suggestions
        .filter(tag => 
          tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
          !selectedTags.some(selected => selected.id === tag.id)
        )
        .slice(0, 10);
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [inputValue, suggestions, selectedTags]);

  const addTag = (tag: TagItem) => {
    if (selectedTags.length < maxTags && !selectedTags.some(t => t.id === tag.id)) {
      onTagsChange([...selectedTags, tag]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: TagItem) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagToRemove.id));
  };

  const createNewTag = () => {
    if (inputValue.trim() && selectedTags.length < maxTags) {
      const newTag: TagItem = {
        id: `temp-${Date.now()}`,
        name: inputValue.trim().toLowerCase(),
        slug: inputValue.trim().toLowerCase().replace(/\s+/g, '-'),
        usage_count: 0,
        is_trending: false,
        is_featured: false
      };
      addTag(newTag);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        addTag(filteredSuggestions[0]);
      } else {
        createNewTag();
      }
    }
  };

  return (
    <div className="relative">
      <div className="min-h-[2.5rem] p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <div className="flex flex-wrap gap-1 items-center">
          {selectedTags.map((tag) => (
            <TagChip
              key={tag.id}
              tag={tag}
              removable
              size="sm"
              onRemove={() => removeTag(tag)}
            />
          ))}
          
          {selectedTags.length < maxTags && (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedTags.length === 0 ? placeholder : ''}
              className="flex-1 min-w-[120px] outline-none text-sm"
            />
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((tag) => (
            <div
              key={tag.id}
              onClick={() => addTag(tag)}
              className="p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <TagChip tag={tag} size="sm" />
                {tag.description && (
                  <span className="text-xs text-gray-500">{tag.description}</span>
                )}
              </div>
              <span className="text-xs text-gray-400">{tag.usage_count} uses</span>
            </div>
          ))}
          
          {inputValue.trim() && !filteredSuggestions.some(t => t.name === inputValue.trim()) && (
            <div
              onClick={createNewTag}
              className="p-2 hover:bg-gray-50 cursor-pointer border-t border-gray-100 text-sm text-gray-600"
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Create "{inputValue.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Tag cloud component
export function TagCloud({ 
  tags, 
  selectedTags = [], 
  onTagClick, 
  layout = 'cloud' 
}: {
  tags: TagItem[];
  selectedTags?: string[];
  onTagClick?: (tag: TagItem) => void;
  layout?: 'cloud' | 'grid' | 'list';
}) {
  const getTagSize = (tag: TagItem) => {
    const maxUsage = Math.max(...tags.map(t => t.usage_count));
    const minUsage = Math.min(...tags.map(t => t.usage_count));
    const normalized = (tag.usage_count - minUsage) / (maxUsage - minUsage);
    
    if (normalized > 0.8) return 'lg';
    if (normalized > 0.5) return 'md';
    return 'sm';
  };

  if (layout === 'list') {
    return (
      <div className="space-y-2">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
            <TagChip
              tag={tag}
              selected={selectedTags.includes(tag.id)}
              onClick={() => onTagClick?.(tag)}
            />
            <span className="text-xs text-gray-500">{tag.usage_count} uses</span>
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {tags.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            selected={selectedTags.includes(tag.id)}
            onClick={() => onTagClick?.(tag)}
          />
        ))}
      </div>
    );
  }

  // Cloud layout (default)
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {tags.map((tag) => (
        <TagChip
          key={tag.id}
          tag={tag}
          selected={selectedTags.includes(tag.id)}
          size={getTagSize(tag)}
          onClick={() => onTagClick?.(tag)}
        />
      ))}
    </div>
  );
}

// Main tags and categories manager
export function TagsCategoriesManager() {
  const [activeTab, setActiveTab] = useState<'categories' | 'tags'>('categories');
  const [viewMode, setViewMode] = useState<'grid' | 'tree'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Mock data (replace with actual API calls)
  const categories: Category[] = [
    {
      id: '1',
      name: 'AI & Machine Learning',
      slug: 'ai-ml',
      description: 'Agents powered by artificial intelligence',
      color: '#3B82F6',
      icon: 'Brain',
      sort_order: 1,
      is_active: true,
      agent_count: 45
    },
    {
      id: '2',
      name: 'Automation',
      slug: 'automation',
      description: 'Workflow and process automation',
      color: '#10B981',
      icon: 'Zap',
      sort_order: 2,
      is_active: true,
      agent_count: 32
    }
  ];

  const tags: TagItem[] = [
    {
      id: '1',
      name: 'automation',
      slug: 'automation',
      description: 'Workflow automation',
      color: '#10B981',
      usage_count: 145,
      is_trending: true,
      is_featured: false
    },
    {
      id: '2',
      name: 'ai',
      slug: 'ai',
      description: 'Artificial intelligence',
      color: '#3B82F6',
      usage_count: 298,
      is_trending: true,
      is_featured: true
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tags & Categories</h2>
          <p className="text-gray-600">Organize and discover agents by topic and functionality</p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex border border-gray-200 rounded-lg">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                activeTab === 'categories' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Categories
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                activeTab === 'tags' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Tags
            </button>
          </div>

          {activeTab === 'categories' && (
            <div className="flex border border-gray-200 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`p-2 ${viewMode === 'tree' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Content */}
      {activeTab === 'categories' ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  selected={selectedCategory === category.id}
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.id ? null : category.id
                  )}
                />
              ))}
            </div>
          ) : (
            <CategoryTree
              categories={categories}
              selectedCategories={selectedCategory ? [selectedCategory] : []}
              onCategorySelect={(id) => setSelectedCategory(
                selectedCategory === id ? null : id
              )}
              multiSelect={false}
            />
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Popular Tags</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <TrendingUp className="h-4 w-4" />
                <span>Trending</span>
              </div>
            </div>
            <TagCloud
              tags={tags}
              selectedTags={selectedTags}
              onTagClick={(tag) => setSelectedTags(prev => 
                prev.includes(tag.id) 
                  ? prev.filter(id => id !== tag.id)
                  : [...prev, tag.id]
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
