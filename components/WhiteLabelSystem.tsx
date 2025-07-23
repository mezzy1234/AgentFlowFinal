'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Palette, 
  Upload, 
  Eye, 
  Code, 
  Copy, 
  Download, 
  Save, 
  RefreshCw,
  Settings,
  Layers,
  Type,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Github,
  ExternalLink,
  ChevronDown,
  Plus,
  Edit3,
  Trash2,
  Move,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  Crown,
  Building,
  Users,
  Zap
} from 'lucide-react';

// Types
export interface BrandingConfig {
  id: string;
  name: string;
  logo?: {
    light: string;
    dark: string;
    favicon: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  typography: {
    fontFamily: string;
    headingFamily?: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  layout: {
    borderRadius: string;
    spacing: string;
    maxWidth: string;
    headerHeight: string;
    sidebarWidth: string;
  };
  customCSS?: string;
  domain?: string;
  company: {
    name: string;
    description?: string;
    website?: string;
    email?: string;
    phone?: string;
    address?: string;
    social?: {
      twitter?: string;
      linkedin?: string;
      facebook?: string;
      instagram?: string;
      github?: string;
    };
  };
  features: {
    hideAgentFlowBranding: boolean;
    customDomain: boolean;
    whiteLabel: boolean;
    apiAccess: boolean;
  };
  isActive: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ThemeTemplate {
  id: string;
  name: string;
  description: string;
  category: 'corporate' | 'creative' | 'minimal' | 'tech' | 'custom';
  preview: string;
  config: Partial<BrandingConfig>;
  isPremium: boolean;
}

// Default theme templates
const THEME_TEMPLATES: ThemeTemplate[] = [
  {
    id: 'default',
    name: 'AgentFlow Default',
    description: 'Clean and professional default theme',
    category: 'tech',
    preview: '/themes/default-preview.png',
    isPremium: false,
    config: {
      colors: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        accent: '#8B5CF6',
        background: '#FFFFFF',
        surface: '#F9FAFB',
        text: {
          primary: '#111827',
          secondary: '#6B7280',
          muted: '#9CA3AF'
        },
        border: '#E5E7EB',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444'
      }
    }
  },
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    description: 'Professional corporate theme with blue accent',
    category: 'corporate',
    preview: '/themes/corporate-blue-preview.png',
    isPremium: false,
    config: {
      colors: {
        primary: '#1E40AF',
        secondary: '#475569',
        accent: '#0EA5E9',
        background: '#FFFFFF',
        surface: '#F8FAFC',
        text: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#64748B'
        },
        border: '#E2E8F0',
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626'
      }
    }
  },
  {
    id: 'dark-mode',
    name: 'Dark Professional',
    description: 'Sleek dark theme for modern applications',
    category: 'tech',
    preview: '/themes/dark-preview.png',
    isPremium: true,
    config: {
      colors: {
        primary: '#6366F1',
        secondary: '#9CA3AF',
        accent: '#EC4899',
        background: '#111827',
        surface: '#1F2937',
        text: {
          primary: '#F9FAFB',
          secondary: '#D1D5DB',
          muted: '#9CA3AF'
        },
        border: '#374151',
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171'
      }
    }
  },
  {
    id: 'minimal-green',
    name: 'Minimal Green',
    description: 'Clean minimal theme with green accents',
    category: 'minimal',
    preview: '/themes/minimal-green-preview.png',
    isPremium: false,
    config: {
      colors: {
        primary: '#059669',
        secondary: '#6B7280',
        accent: '#10B981',
        background: '#FFFFFF',
        surface: '#F9FAFB',
        text: {
          primary: '#1F2937',
          secondary: '#6B7280',
          muted: '#9CA3AF'
        },
        border: '#E5E7EB',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444'
      }
    }
  },
  {
    id: 'creative-purple',
    name: 'Creative Purple',
    description: 'Vibrant creative theme with purple gradients',
    category: 'creative',
    preview: '/themes/creative-purple-preview.png',
    isPremium: true,
    config: {
      colors: {
        primary: '#7C3AED',
        secondary: '#6B7280',
        accent: '#EC4899',
        background: '#FEFEFE',
        surface: '#F9FAFB',
        text: {
          primary: '#1F2937',
          secondary: '#6B7280',
          muted: '#9CA3AF'
        },
        border: '#E5E7EB',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444'
      }
    }
  }
];

// Color Picker Component
export function ColorPicker({ 
  label, 
  value, 
  onChange, 
  description 
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  description?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const presetColors = [
    '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
    '#F59E0B', '#10B981', '#059669', '#0EA5E9', '#06B6D4',
    '#1F2937', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB'
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {description && (
          <span className="block text-xs text-gray-500 font-normal">{description}</span>
        )}
      </label>
      
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <div
            className="w-6 h-6 rounded border border-gray-300"
            style={{ backgroundColor: value }}
          />
          <span className="flex-1 text-left text-sm font-mono">{value}</span>
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
            {/* Hex Input */}
            <div className="mb-4">
              <input
                type="text"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono"
                placeholder="#000000"
              />
            </div>

            {/* Color Input */}
            <div className="mb-4">
              <input
                type="color"
                value={value}
                onChange={(e) => {
                  onChange(e.target.value);
                  setTempValue(e.target.value);
                }}
                className="w-full h-10 border border-gray-300 rounded cursor-pointer"
              />
            </div>

            {/* Preset Colors */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {presetColors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onChange(color);
                    setTempValue(color);
                  }}
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-between space-x-2">
              <button
                onClick={() => {
                  onChange(tempValue);
                  setIsOpen(false);
                }}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setTempValue(value);
                  setIsOpen(false);
                }}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Theme Template Selector
export function ThemeTemplateSelector({
  templates,
  selectedTemplate,
  onSelect
}: {
  templates: ThemeTemplate[];
  selectedTemplate?: string;
  onSelect: (template: ThemeTemplate) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { value: 'all', label: 'All Themes' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'tech', label: 'Technology' },
    { value: 'creative', label: 'Creative' },
    { value: 'minimal', label: 'Minimal' }
  ];

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Category:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${
              selectedTemplate === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            }`}
            onClick={() => onSelect(template)}
          >
            {/* Premium Badge */}
            {template.isPremium && (
              <div className="absolute top-2 right-2">
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                  <Crown className="h-3 w-3" />
                  <span>Pro</span>
                </span>
              </div>
            )}

            {/* Preview */}
            <div className="aspect-video bg-gray-100 rounded mb-3 overflow-hidden">
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Eye className="h-8 w-8" />
              </div>
            </div>

            {/* Info */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{template.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 capitalize">
                  {template.category}
                </span>
                
                {selectedTemplate === template.id && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Brand Colors Editor
export function BrandColorsEditor({
  colors,
  onChange
}: {
  colors: BrandingConfig['colors'];
  onChange: (colors: BrandingConfig['colors']) => void;
}) {
  const colorGroups = [
    {
      name: 'Brand Colors',
      colors: [
        { key: 'primary', label: 'Primary', description: 'Main brand color for buttons and links' },
        { key: 'secondary', label: 'Secondary', description: 'Secondary brand color' },
        { key: 'accent', label: 'Accent', description: 'Accent color for highlights' }
      ]
    },
    {
      name: 'Background Colors',
      colors: [
        { key: 'background', label: 'Background', description: 'Main background color' },
        { key: 'surface', label: 'Surface', description: 'Card and panel backgrounds' },
        { key: 'border', label: 'Border', description: 'Border and divider color' }
      ]
    },
    {
      name: 'Text Colors',
      colors: [
        { key: 'text.primary', label: 'Primary Text', description: 'Main text color' },
        { key: 'text.secondary', label: 'Secondary Text', description: 'Secondary text color' },
        { key: 'text.muted', label: 'Muted Text', description: 'Muted and disabled text' }
      ]
    },
    {
      name: 'Status Colors',
      colors: [
        { key: 'success', label: 'Success', description: 'Success states and messages' },
        { key: 'warning', label: 'Warning', description: 'Warning states and messages' },
        { key: 'error', label: 'Error', description: 'Error states and messages' }
      ]
    }
  ];

  const getValue = (path: string): string => {
    const keys = path.split('.');
    if (keys.length === 1) {
      return (colors as any)[keys[0]];
    } else {
      return colors.text[keys[1] as keyof typeof colors.text];
    }
  };

  const setValue = (path: string, value: string) => {
    const keys = path.split('.');
    const newColors = { ...colors };
    
    if (keys.length === 1) {
      (newColors as any)[keys[0]] = value;
    } else {
      const nested = { ...newColors.text };
      nested[keys[1] as keyof typeof nested] = value;
      newColors.text = nested;
    }
    
    onChange(newColors);
  };

  return (
    <div className="space-y-6">
      {colorGroups.map((group) => (
        <div key={group.name} className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
            {group.name}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.colors.map((colorConfig) => (
              <ColorPicker
                key={colorConfig.key}
                label={colorConfig.label}
                value={getValue(colorConfig.key)}
                onChange={(value) => setValue(colorConfig.key, value)}
                description={colorConfig.description}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Logo Upload Component
export function LogoUploader({
  logos,
  onUpload
}: {
  logos?: BrandingConfig['logo'];
  onUpload: (type: 'light' | 'dark' | 'favicon', file: File) => void;
}) {
  const fileInputRefs = {
    light: useRef<HTMLInputElement>(null),
    dark: useRef<HTMLInputElement>(null),
    favicon: useRef<HTMLInputElement>(null)
  };

  const handleFileChange = (type: 'light' | 'dark' | 'favicon', file: File | null) => {
    if (file) {
      onUpload(type, file);
    }
  };

  const logoTypes = [
    {
      key: 'light' as const,
      label: 'Light Logo',
      description: 'Logo for light backgrounds',
      recommended: '200x60px PNG or SVG'
    },
    {
      key: 'dark' as const,
      label: 'Dark Logo', 
      description: 'Logo for dark backgrounds',
      recommended: '200x60px PNG or SVG'
    },
    {
      key: 'favicon' as const,
      label: 'Favicon',
      description: 'Browser tab icon',
      recommended: '32x32px PNG or ICO'
    }
  ];

  return (
    <div className="space-y-6">
      {logoTypes.map((logoType) => (
        <div key={logoType.key} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {logoType.label}
            </label>
            <p className="text-xs text-gray-500">{logoType.description}</p>
            <p className="text-xs text-gray-400">Recommended: {logoType.recommended}</p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Current Logo Preview */}
            <div className="w-24 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
              {logos?.[logoType.key] ? (
                <img
                  src={logos[logoType.key]}
                  alt={`${logoType.label} preview`}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-gray-400" />
              )}
            </div>

            {/* Upload Button */}
            <div className="flex-1">
              <input
                ref={fileInputRefs[logoType.key]}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(logoType.key, e.target.files?.[0] || null)}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRefs[logoType.key].current?.click()}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Upload {logoType.label}</span>
              </button>
              
              {logos?.[logoType.key] && (
                <button
                  onClick={() => {
                    // Remove logo logic
                  }}
                  className="ml-2 text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Custom CSS Editor
export function CustomCSSEditor({
  css,
  onChange,
  brandConfig
}: {
  css?: string;
  onChange: (css: string) => void;
  brandConfig: BrandingConfig;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const generateCSS = () => {
    return `/* Auto-generated CSS from your brand configuration */
:root {
  /* Brand Colors */
  --color-primary: ${brandConfig.colors.primary};
  --color-secondary: ${brandConfig.colors.secondary};
  --color-accent: ${brandConfig.colors.accent};
  
  /* Background Colors */
  --color-background: ${brandConfig.colors.background};
  --color-surface: ${brandConfig.colors.surface};
  --color-border: ${brandConfig.colors.border};
  
  /* Text Colors */
  --color-text-primary: ${brandConfig.colors.text.primary};
  --color-text-secondary: ${brandConfig.colors.text.secondary};
  --color-text-muted: ${brandConfig.colors.text.muted};
  
  /* Status Colors */
  --color-success: ${brandConfig.colors.success};
  --color-warning: ${brandConfig.colors.warning};
  --color-error: ${brandConfig.colors.error};
  
  /* Typography */
  --font-family: ${brandConfig.typography.fontFamily};
  --font-size-base: ${brandConfig.typography.fontSize.base};
  
  /* Layout */
  --border-radius: ${brandConfig.layout.borderRadius};
  --spacing: ${brandConfig.layout.spacing};
}

/* Custom styles go here */
`;
  };

  const copyCSS = () => {
    const cssContent = css || generateCSS();
    navigator.clipboard.writeText(cssContent);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Custom CSS</h4>
          <p className="text-xs text-gray-500">Add custom styles to further customize your theme</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onChange(generateCSS())}
            className="flex items-center space-x-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Generate</span>
          </button>
          
          <button
            onClick={copyCSS}
            className="flex items-center space-x-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            <Copy className="h-3 w-3" />
            <span>Copy</span>
          </button>
        </div>
      </div>

      <div className="border border-gray-300 rounded-lg">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-300">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Code className="h-4 w-4" />
            <span>CSS Editor</span>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          </button>
        </div>
        
        <textarea
          ref={textareaRef}
          value={css || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/* Enter your custom CSS here */"
          className={`w-full p-3 border-none resize-none focus:ring-0 font-mono text-sm ${
            isExpanded ? 'h-96' : 'h-32'
          }`}
        />
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 Tip: Use CSS custom properties (variables) defined above for consistent theming</p>
        <p>🎨 Example: <code className="bg-gray-100 px-1 rounded">color: var(--color-primary)</code></p>
      </div>
    </div>
  );
}

// Domain Configuration
export function DomainConfiguration({
  domain,
  onChange,
  isWhiteLabel
}: {
  domain?: string;
  onChange: (domain: string) => void;
  isWhiteLabel: boolean;
}) {
  const [customDomain, setCustomDomain] = useState(domain || '');
  const [dnsStatus, setDnsStatus] = useState<'pending' | 'verified' | 'failed'>('pending');

  const checkDNS = async () => {
    // Simulate DNS check
    setDnsStatus('pending');
    setTimeout(() => {
      setDnsStatus(Math.random() > 0.5 ? 'verified' : 'failed');
    }, 2000);
  };

  if (!isWhiteLabel) {
    return (
      <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
        <div className="text-center">
          <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Custom Domain</h3>
          <p className="text-gray-600 mb-4">
            Upgrade to a White-Label plan to use your own custom domain
          </p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Upgrade Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Custom Domain</h4>
        <p className="text-xs text-gray-500 mb-4">
          Use your own domain for your AgentFlow instance (e.g., agents.yourcompany.com)
        </p>
      </div>

      <div className="space-y-4">
        {/* Domain Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Domain Name
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="agents.yourcompany.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => onChange(customDomain)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>

        {/* DNS Configuration */}
        {domain && (
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-medium text-gray-900">DNS Configuration</h5>
              <button
                onClick={checkDNS}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Check DNS</span>
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600 mb-2">Add these DNS records to your domain:</p>
                
                <div className="bg-gray-50 p-3 rounded border font-mono text-xs space-y-1">
                  <div>Type: CNAME</div>
                  <div>Name: {domain.split('.')[0]}</div>
                  <div>Value: agents.agentflow.ai</div>
                  <div>TTL: 300</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  dnsStatus === 'verified' 
                    ? 'bg-green-500' 
                    : dnsStatus === 'failed' 
                      ? 'bg-red-500' 
                      : 'bg-yellow-500 animate-pulse'
                }`} />
                <span className={`text-sm ${
                  dnsStatus === 'verified' 
                    ? 'text-green-600' 
                    : dnsStatus === 'failed' 
                      ? 'text-red-600' 
                      : 'text-yellow-600'
                }`}>
                  {dnsStatus === 'verified' 
                    ? 'Domain verified and active' 
                    : dnsStatus === 'failed' 
                      ? 'DNS records not found' 
                      : 'Checking DNS configuration...'
                  }
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main White Label Configuration
export function WhiteLabelConfiguration({
  config,
  onChange,
  onSave
}: {
  config: BrandingConfig;
  onChange: (config: Partial<BrandingConfig>) => void;
  onSave: () => void;
}) {
  const [activeTab, setActiveTab] = useState('theme');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const tabs = [
    { id: 'theme', label: 'Theme', icon: Palette },
    { id: 'logos', label: 'Logos', icon: ImageIcon },
    { id: 'company', label: 'Company', icon: Building },
    { id: 'domain', label: 'Domain', icon: Globe },
    { id: 'css', label: 'Custom CSS', icon: Code }
  ];

  const getPreviewIcon = () => {
    switch (previewMode) {
      case 'desktop': return Monitor;
      case 'tablet': return Tablet;
      case 'mobile': return Smartphone;
    }
  };

  const PreviewIcon = getPreviewIcon();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">White-Label Configuration</h2>
          <p className="text-gray-600">Customize your AgentFlow instance with your brand</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center border border-gray-300 rounded-lg">
            {['desktop', 'tablet', 'mobile'].map((mode) => {
              const Icon = mode === 'desktop' ? Monitor : mode === 'tablet' ? Tablet : Smartphone;
              return (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode as any)}
                  className={`p-2 ${
                    previewMode === mode 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
          
          <button
            onClick={onSave}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white">
            {activeTab === 'theme' && (
              <div className="space-y-6">
                <ThemeTemplateSelector
                  templates={THEME_TEMPLATES}
                  selectedTemplate={config.id}
                  onSelect={(template) => onChange(template.config)}
                />
                
                <BrandColorsEditor
                  colors={config.colors}
                  onChange={(colors) => onChange({ colors })}
                />
              </div>
            )}

            {activeTab === 'logos' && (
              <LogoUploader
                logos={config.logo}
                onUpload={(type, file) => {
                  // Handle logo upload
                  const url = URL.createObjectURL(file);
                  onChange({
                    logo: {
                      light: config.logo?.light || '',
                      dark: config.logo?.dark || '',
                      favicon: config.logo?.favicon || '',
                      [type]: url
                    }
                  });
                }}
              />
            )}

            {activeTab === 'company' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={config.company.name}
                      onChange={(e) => onChange({
                        company: { ...config.company, name: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={config.company.website || ''}
                      onChange={(e) => onChange({
                        company: { ...config.company, website: e.target.value }
                      })}
                      placeholder="https://yourcompany.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={config.company.description || ''}
                    onChange={(e) => onChange({
                      company: { ...config.company, description: e.target.value }
                    })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of your company..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={config.company.email || ''}
                      onChange={(e) => onChange({
                        company: { ...config.company, email: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={config.company.phone || ''}
                      onChange={(e) => onChange({
                        company: { ...config.company, phone: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'domain' && (
              <DomainConfiguration
                domain={config.domain}
                onChange={(domain) => onChange({ domain })}
                isWhiteLabel={config.features.whiteLabel}
              />
            )}

            {activeTab === 'css' && (
              <CustomCSSEditor
                css={config.customCSS}
                onChange={(customCSS) => onChange({ customCSS })}
                brandConfig={config}
              />
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Preview</h3>
            <PreviewIcon className="h-4 w-4 text-gray-500" />
          </div>

          <div className={`border border-gray-300 rounded-lg overflow-hidden bg-white ${
            previewMode === 'desktop' ? 'aspect-[4/3]' :
            previewMode === 'tablet' ? 'aspect-[3/4]' :
            'aspect-[9/16]'
          }`}>
            {/* Mock preview content */}
            <div 
              className="w-full h-full"
              style={{ 
                backgroundColor: config.colors.background,
                color: config.colors.text.primary 
              }}
            >
              {/* Mock header */}
              <div 
                className="h-16 border-b flex items-center justify-between px-4"
                style={{ 
                  backgroundColor: config.colors.surface,
                  borderColor: config.colors.border 
                }}
              >
                <div className="flex items-center space-x-3">
                  {config.logo?.light && (
                    <img
                      src={config.logo.light}
                      alt="Logo"
                      className="h-8 w-auto"
                    />
                  )}
                  <span className="font-semibold">{config.company.name}</span>
                </div>
                
                <button 
                  className="px-4 py-2 rounded text-white text-sm"
                  style={{ backgroundColor: config.colors.primary }}
                >
                  Sign In
                </button>
              </div>

              {/* Mock content */}
              <div className="p-4 space-y-4">
                <div 
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: config.colors.surface }}
                >
                  <h3 className="font-semibold mb-2">Welcome to AgentFlow</h3>
                  <p style={{ color: config.colors.text.secondary }}>
                    Build and deploy AI agents with ease
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div 
                    className="p-3 rounded text-center text-sm"
                    style={{ 
                      backgroundColor: config.colors.primary,
                      color: 'white' 
                    }}
                  >
                    Primary
                  </div>
                  <div 
                    className="p-3 rounded text-center text-sm"
                    style={{ 
                      backgroundColor: config.colors.secondary,
                      color: 'white' 
                    }}
                  >
                    Secondary
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-2">
            <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="h-4 w-4" />
              <span>Export Theme</span>
            </button>
            
            <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <ExternalLink className="h-4 w-4" />
              <span>Open Preview</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
