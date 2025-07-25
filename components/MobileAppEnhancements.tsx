'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Smartphone,
  Tablet,
  Monitor,
  Wifi,
  WifiOff,
  Download,
  Share,
  Bell,
  Settings,
  Menu,
  X,
  ArrowLeft,
  Search,
  Filter,
  Star,
  Heart,
  ShoppingBag,
  User,
  Home,
  Compass,
  MessageSquare,
  MoreHorizontal,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  Globe,
  MapPin,
  Clock,
  TrendingUp,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RefreshCw,
  Upload,
  Camera,
  Mic,
  MicOff,
  Image as ImageIcon,
  File,
  Plus,
  Minus,
  Edit3,
  Save,
  Trash2,
  Copy,
  ExternalLink,
  QrCode,
  Bluetooth,
  Battery,
  Signal,
  Moon,
  Sun
} from 'lucide-react';

// Types for mobile functionality
export interface PWAConfig {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: 'any' | 'natural' | 'portrait' | 'landscape';
  startUrl: string;
  scope: string;
  icons: PWAIcon[];
}

export interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: 'maskable' | 'any';
}

export interface OfflineData {
  agents: any[];
  favorites: string[];
  userProfile: any;
  recentSearches: string[];
  cachedImages: Record<string, string>;
  lastSync: Date;
}

export interface PushNotificationConfig {
  enabled: boolean;
  types: {
    newAgents: boolean;
    priceDrops: boolean;
    messages: boolean;
    updates: boolean;
    marketing: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface DeviceCapabilities {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  isOnline: boolean;
  isPWA: boolean;
  canInstall: boolean;
  hasCamera: boolean;
  hasMicrophone: boolean;
  hasGeolocation: boolean;
  hasPushNotifications: boolean;
  hasVibration: boolean;
  supportsShare: boolean;
  supportsClipboard: boolean;
}

// Mobile App Shell Component
export function MobileAppShell({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [isOnline, setIsOnline] = useState(navigator.onLine !== false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  // Detect online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // PWA install prompt handling
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    }
  };

  const navigationItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'explore', icon: Compass, label: 'Explore' },
    { id: 'favorites', icon: Heart, label: 'Favorites' },
    { id: 'messages', icon: MessageSquare, label: 'Messages' },
    { id: 'profile', icon: User, label: 'Profile' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Status Bar */}
      <div className="md:hidden bg-gray-900 text-white px-4 py-1 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Signal className="h-3 w-3" />
          <Wifi className="h-3 w-3" />
          <Battery className="h-3 w-3" />
        </div>
        <div className="text-center font-medium">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="flex items-center space-x-1">
          {!isOnline && <WifiOff className="h-3 w-3 text-red-400" />}
          {installPrompt && (
            <button
              onClick={handleInstallPWA}
              className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs"
            >
              Install
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 -m-2 text-gray-600 hover:text-gray-900"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">AgentFlow</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isOnline && (
              <div className="flex items-center space-x-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-full text-xs">
                <WifiOff className="h-3 w-3" />
                <span>Offline</span>
              </div>
            )}
            <button className="p-2 text-gray-600 hover:text-gray-900 relative">
              <Bell className="h-5 w-5" />
              <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            </button>
          </div>
        </div>
      </header>

      {/* Side Menu Overlay */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)}>
          <div className="bg-white w-80 h-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <nav className="p-4 space-y-2">
              {navigationItems.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left ${
                    activeTab === id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="grid grid-cols-5">
          {navigationItems.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center py-2 px-1 ${
                activeTab === id
                  ? 'text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              <Icon className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// Mobile-Optimized Agent Card
export function MobileAgentCard({
  agent,
  onFavorite,
  onShare,
  isOffline = false
}: {
  agent: any;
  onFavorite?: () => void;
  onShare?: () => void;
  isOffline?: boolean;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Agent Image */}
      <div className="relative aspect-video bg-gray-100">
        {!imageError ? (
          <img
            src={agent.image_url || '/api/placeholder/400/200'}
            alt={agent.name}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* Overlay Actions */}
        <div className="absolute top-2 right-2 flex space-x-2">
          {onFavorite && (
            <button
              onClick={onFavorite}
              className="p-2 bg-white bg-opacity-90 rounded-full shadow-sm"
            >
              <Heart className="h-4 w-4 text-gray-600" />
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              className="p-2 bg-white bg-opacity-90 rounded-full shadow-sm"
            >
              <Share className="h-4 w-4 text-gray-600" />
            </button>
          )}
        </div>
        
        {/* Offline Indicator */}
        {isOffline && (
          <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
            <WifiOff className="h-3 w-3" />
            <span>Cached</span>
          </div>
        )}
      </div>

      {/* Agent Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">
            {agent.name}
          </h3>
          <div className="ml-2 text-right">
            <div className="font-bold text-lg text-gray-900">
              ${agent.price}
            </div>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {agent.description}
        </p>
        
        {/* Metrics */}
        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span>{agent.rating}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Eye className="h-4 w-4" />
            <span>{agent.views}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Download className="h-4 w-4" />
            <span>{agent.downloads}</span>
          </div>
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {agent.tags?.slice(0, 3).map((tag: string, index: number) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {agent.tags?.length > 3 && (
            <span className="text-xs text-gray-500">
              +{agent.tags.length - 3} more
            </span>
          )}
        </div>
        
        {/* Action Button */}
        <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
          View Details
        </button>
      </div>
    </div>
  );
}

// Pull-to-Refresh Component
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 60,
  resistance = 2.5
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  resistance?: number;
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY.current === 0 || window.scrollY > 0 || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, (currentY - startY.current) / resistance);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(distance);
      setCanRefresh(distance >= threshold);
    }
  }, [threshold, resistance, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (canRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setCanRefresh(false);
    startY.current = 0;
  }, [canRefresh, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div ref={containerRef} className="relative">
      {/* Pull Indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-transform duration-200"
        style={{
          transform: `translateY(${Math.min(pullDistance - 50, 10)}px)`,
          opacity: pullDistance > 10 ? 1 : 0
        }}
      >
        <div className={`p-2 rounded-full ${
          canRefresh ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        } transition-colors`}>
          <RefreshCw className={`h-5 w-5 ${
            isRefreshing ? 'animate-spin' : canRefresh ? 'rotate-180' : ''
          } transition-transform`} />
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${Math.min(pullDistance, threshold)}px)`
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Swipe Actions Component
export function SwipeActions({
  children,
  leftActions,
  rightActions,
  threshold = 80
}: {
  children: React.ReactNode;
  leftActions?: Array<{
    icon: React.ComponentType<any>;
    label: string;
    color: string;
    action: () => void;
  }>;
  rightActions?: Array<{
    icon: React.ComponentType<any>;
    label: string;
    color: string;
    action: () => void;
  }>;
  threshold?: number;
}) {
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsActive(true);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isActive) return;

    const currentX = e.touches[0].clientX;
    const distance = currentX - startX.current;
    
    // Limit swipe distance
    const maxDistance = 200;
    const limitedDistance = Math.max(-maxDistance, Math.min(maxDistance, distance));
    
    setSwipeDistance(limitedDistance);
  }, [isActive]);

  const handleTouchEnd = useCallback(() => {
    if (Math.abs(swipeDistance) >= threshold) {
      // Trigger action based on swipe direction
      if (swipeDistance > 0 && leftActions && leftActions.length > 0) {
        leftActions[0].action();
      } else if (swipeDistance < 0 && rightActions && rightActions.length > 0) {
        rightActions[0].action();
      }
    }
    
    setSwipeDistance(0);
    setIsActive(false);
  }, [swipeDistance, threshold, leftActions, rightActions]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Left Actions */}
      {leftActions && (
        <div 
          className="absolute left-0 top-0 bottom-0 flex items-center"
          style={{
            width: Math.max(0, swipeDistance),
            opacity: swipeDistance > threshold * 0.5 ? 1 : 0.5
          }}
        >
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`h-full px-4 flex flex-col items-center justify-center text-white text-xs ${action.color}`}
              style={{ width: Math.max(0, swipeDistance) / leftActions.length }}
            >
              <action.icon className="h-5 w-5 mb-1" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right Actions */}
      {rightActions && (
        <div 
          className="absolute right-0 top-0 bottom-0 flex items-center"
          style={{
            width: Math.max(0, -swipeDistance),
            opacity: -swipeDistance > threshold * 0.5 ? 1 : 0.5
          }}
        >
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`h-full px-4 flex flex-col items-center justify-center text-white text-xs ${action.color}`}
              style={{ width: Math.max(0, -swipeDistance) / rightActions.length }}
            >
              <action.icon className="h-5 w-5 mb-1" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateX(${swipeDistance}px)`
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Infinite Scroll Component
export function InfiniteScroll({
  hasMore,
  loading,
  onLoadMore,
  children,
  threshold = 200
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  children: React.ReactNode;
  threshold?: number;
}) {
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore, threshold]);

  return (
    <div>
      {children}
      {hasMore && (
        <div ref={loaderRef} className="flex justify-center py-6">
          {loading ? (
            <div className="flex items-center space-x-2 text-gray-600">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading more...</span>
            </div>
          ) : (
            <button
              onClick={onLoadMore}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Load More
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Touch-Friendly Search Component
export function MobileSearchBar({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder = "Search agents...",
  suggestions = [],
  onSuggestionSelect
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
    onFocus?.();
  };

  const handleBlur = () => {
    // Delay to allow suggestion clicks
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
      onBlur?.();
    }, 200);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    onSuggestionSelect?.(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className={`flex items-center bg-white rounded-lg border transition-all ${
        isFocused ? 'border-blue-500 shadow-lg' : 'border-gray-300'
      }`}>
        <Search className="h-5 w-5 text-gray-400 ml-3" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="flex-1 px-3 py-3 text-base border-none outline-none rounded-lg"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center space-x-3">
                <Search className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{suggestion}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Mobile-Optimized Filter Panel
export function MobileFilterPanel({
  isOpen,
  onClose,
  filters,
  onFiltersChange
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: any;
  onFiltersChange: (filters: any) => void;
}) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      category: '',
      priceRange: [0, 1000],
      rating: 0,
      tags: [],
      sortBy: 'popular'
    };
    setLocalFilters(resetFilters);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="p-4 space-y-6">
          {/* Category */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Category</h3>
            <div className="grid grid-cols-2 gap-2">
              {['All', 'AI', 'Automation', 'Analytics', 'Marketing', 'Development'].map((category) => (
                <button
                  key={category}
                  onClick={() => setLocalFilters({ ...localFilters, category })}
                  className={`p-3 text-center text-sm font-medium rounded-lg border ${
                    localFilters.category === category
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Price Range</h3>
            <div className="px-2">
              <input
                type="range"
                min="0"
                max="1000"
                value={localFilters.priceRange[1]}
                onChange={(e) => setLocalFilters({
                  ...localFilters,
                  priceRange: [0, parseInt(e.target.value)]
                })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>$0</span>
                <span>${localFilters.priceRange[1]}</span>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Minimum Rating</h3>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setLocalFilters({ ...localFilters, rating })}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg border ${
                    localFilters.rating === rating
                      ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  <Star className="h-4 w-4 fill-current" />
                  <span>{rating}+</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sort By */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Sort By</h3>
            <div className="space-y-2">
              {[
                { value: 'popular', label: 'Most Popular' },
                { value: 'newest', label: 'Newest' },
                { value: 'price-low', label: 'Price: Low to High' },
                { value: 'price-high', label: 'Price: High to Low' },
                { value: 'rating', label: 'Highest Rated' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setLocalFilters({ ...localFilters, sortBy: value })}
                  className={`w-full text-left p-3 rounded-lg border ${
                    localFilters.sortBy === value
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex space-x-3">
          <button
            onClick={handleReset}
            className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

// PWA Installation Component
export function PWAInstallBanner({
  onInstall,
  onDismiss,
  isVisible
}: {
  onInstall: () => void;
  onDismiss: () => void;
  isVisible: boolean;
}) {
  if (!isVisible) return null;

  return (
    <div className="bg-blue-600 text-white p-4 relative">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 text-blue-200 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="pr-8">
        <h3 className="font-semibold mb-1">Install AgentFlow</h3>
        <p className="text-blue-100 text-sm mb-3">
          Get the full app experience with offline access and push notifications.
        </p>
        
        <div className="flex space-x-3">
          <button
            onClick={onInstall}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-50"
          >
            Install Now
          </button>
          <button
            onClick={onDismiss}
            className="text-blue-200 hover:text-white text-sm"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

// Offline Status Component
export function OfflineStatus({ isOnline }: { isOnline: boolean }) {
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowOfflineMessage(true);
    } else {
      // Hide after 2 seconds when back online
      const timer = setTimeout(() => setShowOfflineMessage(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!showOfflineMessage) return null;

  return (
    <div className={`fixed top-16 left-4 right-4 z-50 p-3 rounded-lg shadow-lg transition-all ${
      isOnline 
        ? 'bg-green-500 text-white' 
        : 'bg-orange-500 text-white'
    }`}>
      <div className="flex items-center space-x-2">
        {isOnline ? (
          <>
            <Wifi className="h-5 w-5" />
            <span className="font-medium">Back online!</span>
          </>
        ) : (
          <>
            <WifiOff className="h-5 w-5" />
            <span className="font-medium">You're offline</span>
          </>
        )}
      </div>
      {!isOnline && (
        <p className="text-orange-100 text-sm mt-1">
          Some features may be limited. Cached content is available.
        </p>
      )}
    </div>
  );
}
