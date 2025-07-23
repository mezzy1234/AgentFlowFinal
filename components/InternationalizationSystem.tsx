'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Globe, 
  Check, 
  ChevronDown, 
  Languages, 
  Settings, 
  Download,
  Upload,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  Save
} from 'lucide-react';

// Types
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
  progress?: number; // Translation completion percentage
}

export interface Translation {
  key: string;
  en: string;
  [locale: string]: string;
}

export interface TranslationNamespace {
  id: string;
  name: string;
  description: string;
  keys: Translation[];
  lastUpdated: Date;
}

export interface PluralRule {
  locale: string;
  rule: (count: number) => 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
}

// Supported languages
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', progress: 100 },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', progress: 95 },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', progress: 88 },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', progress: 92 },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', progress: 85 },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', progress: 90 },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', progress: 75 },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', progress: 70 },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳', progress: 80 },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼', progress: 78 },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true, progress: 65 },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', rtl: true, progress: 60 },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', progress: 82 },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', progress: 55 },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', progress: 50 }
];

// Sample translation data
const SAMPLE_TRANSLATIONS: TranslationNamespace[] = [
  {
    id: 'common',
    name: 'Common',
    description: 'Common UI elements and actions',
    lastUpdated: new Date(),
    keys: [
      {
        key: 'save',
        en: 'Save',
        es: 'Guardar',
        fr: 'Enregistrer',
        de: 'Speichern',
        it: 'Salva',
        pt: 'Salvar',
        ja: '保存',
        ko: '저장',
        zh: '保存',
        ru: 'Сохранить',
        ar: 'حفظ'
      },
      {
        key: 'cancel',
        en: 'Cancel',
        es: 'Cancelar',
        fr: 'Annuler',
        de: 'Abbrechen',
        it: 'Annulla',
        pt: 'Cancelar',
        ja: 'キャンセル',
        ko: '취소',
        zh: '取消',
        ru: 'Отмена',
        ar: 'إلغاء'
      },
      {
        key: 'delete',
        en: 'Delete',
        es: 'Eliminar',
        fr: 'Supprimer',
        de: 'Löschen',
        it: 'Elimina',
        pt: 'Excluir',
        ja: '削除',
        ko: '삭제',
        zh: '删除',
        ru: 'Удалить',
        ar: 'حذف'
      }
    ]
  },
  {
    id: 'navigation',
    name: 'Navigation',
    description: 'Navigation menu items',
    lastUpdated: new Date(),
    keys: [
      {
        key: 'dashboard',
        en: 'Dashboard',
        es: 'Panel',
        fr: 'Tableau de bord',
        de: 'Dashboard',
        it: 'Dashboard',
        pt: 'Painel',
        ja: 'ダッシュボード',
        ko: '대시보드',
        zh: '仪表板',
        ru: 'Панель управления',
        ar: 'لوحة التحكم'
      },
      {
        key: 'marketplace',
        en: 'Marketplace',
        es: 'Mercado',
        fr: 'Marché',
        de: 'Marktplatz',
        it: 'Mercato',
        pt: 'Mercado',
        ja: 'マーケットプレイス',
        ko: '마켓플레이스',
        zh: '市场',
        ru: 'Магазин',
        ar: 'السوق'
      }
    ]
  },
  {
    id: 'agents',
    name: 'Agents',
    description: 'Agent-related content',
    lastUpdated: new Date(),
    keys: [
      {
        key: 'create_agent',
        en: 'Create Agent',
        es: 'Crear Agente',
        fr: 'Créer un Agent',
        de: 'Agent erstellen',
        it: 'Crea Agente',
        pt: 'Criar Agente',
        ja: 'エージェントを作成',
        ko: '에이전트 만들기',
        zh: '创建代理',
        ru: 'Создать агента',
        ar: 'إنشاء وكيل'
      }
    ]
  }
];

// Internationalization Context
interface I18nContextType {
  currentLocale: string;
  setLocale: (locale: string) => void;
  t: (key: string, params?: Record<string, any>, namespace?: string) => string;
  pluralize: (key: string, count: number, params?: Record<string, any>, namespace?: string) => string;
  formatNumber: (number: number) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (date: Date, format?: Intl.DateTimeFormatOptions) => string;
  isRTL: boolean;
  languages: Language[];
  translations: TranslationNamespace[];
  loadTranslations: (namespace: string) => Promise<void>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Custom hook for internationalization
export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Language selector component
export function LanguageSelector({ 
  className = '',
  showProgress = false 
}: { 
  className?: string;
  showProgress?: boolean;
}) {
  const { currentLocale, setLocale, languages } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === currentLocale);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span>{currentLanguage?.flag}</span>
        <span>{currentLanguage?.nativeName}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => {
                setLocale(language.code);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{language.flag}</span>
                <div className="text-left">
                  <div className="font-medium text-gray-900">{language.nativeName}</div>
                  <div className="text-xs text-gray-500">{language.name}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {showProgress && (
                  <div className="flex items-center space-x-1">
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full">
                      <div 
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${language.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{language.progress}%</span>
                  </div>
                )}
                
                {currentLocale === language.code && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Translation management interface
export function TranslationManager() {
  const { translations, currentLocale, languages } = useI18n();
  const [selectedNamespace, setSelectedNamespace] = useState<string>('common');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [showUntranslated, setShowUntranslated] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newTranslation, setNewTranslation] = useState<Partial<Translation>>({});

  const currentNamespace = translations.find(ns => ns.id === selectedNamespace);
  
  const filteredKeys = currentNamespace?.keys.filter(translation => {
    const matchesSearch = translation.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         translation.en.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLanguageFilter = filterLanguage === 'all' || 
                                 !translation[filterLanguage] ||
                                 translation[filterLanguage].trim() === '';
    
    const matchesUntranslatedFilter = !showUntranslated ||
                                     languages.some(lang => !translation[lang.code] || translation[lang.code].trim() === '');
    
    return matchesSearch && (!matchesLanguageFilter || filterLanguage === 'all') && matchesUntranslatedFilter;
  }) || [];

  const getTranslationProgress = (translation: Translation) => {
    const totalLanguages = languages.length;
    const translatedLanguages = languages.filter(lang => 
      translation[lang.code] && translation[lang.code].trim() !== ''
    ).length;
    return Math.round((translatedLanguages / totalLanguages) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Translation Management</h2>
          <p className="text-gray-600">Manage translations for all supported languages</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            <span>Add Key</span>
          </button>
          
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Upload className="h-4 w-4" />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 border border-gray-200 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Namespace selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Namespace</label>
            <select
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {translations.map((namespace) => (
                <option key={namespace.id} value={namespace.id}>
                  {namespace.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search keys or values..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Language filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Language</label>
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Languages</option>
              {languages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.flag} {language.nativeName}
                </option>
              ))}
            </select>
          </div>

          {/* Show untranslated */}
          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showUntranslated}
                onChange={(e) => setShowUntranslated(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show only untranslated</span>
            </label>
          </div>
        </div>
      </div>

      {/* Translation table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  English (Source)
                </th>
                {languages.filter(lang => lang.code !== 'en').map((language) => (
                  <th key={language.code} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language.flag} {language.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredKeys.map((translation) => (
                <tr key={translation.key} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                      {translation.key}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
                    <div className="truncate" title={translation.en}>
                      {translation.en}
                    </div>
                  </td>
                  {languages.filter(lang => lang.code !== 'en').map((language) => (
                    <td key={language.code} className="px-4 py-3 text-sm max-w-xs">
                      {editingKey === `${translation.key}-${language.code}` ? (
                        <input
                          type="text"
                          value={newTranslation[language.code] || translation[language.code] || ''}
                          onChange={(e) => setNewTranslation({
                            ...newTranslation,
                            [language.code]: e.target.value
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              // Save translation logic
                              setEditingKey(null);
                              setNewTranslation({});
                            }
                            if (e.key === 'Escape') {
                              setEditingKey(null);
                              setNewTranslation({});
                            }
                          }}
                        />
                      ) : (
                        <div
                          className={`truncate cursor-pointer hover:bg-gray-100 rounded px-2 py-1 ${
                            !translation[language.code] || translation[language.code].trim() === ''
                              ? 'text-gray-400 italic'
                              : 'text-gray-900'
                          }`}
                          title={translation[language.code] || 'Not translated'}
                          onClick={() => setEditingKey(`${translation.key}-${language.code}`)}
                        >
                          {translation[language.code] || 'Not translated'}
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div 
                          className={`h-full rounded-full ${
                            getTranslationProgress(translation) === 100 
                              ? 'bg-green-500' 
                              : getTranslationProgress(translation) >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${getTranslationProgress(translation)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {getTranslationProgress(translation)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingKey(`${translation.key}-all`)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Edit all translations"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        className="text-gray-400 hover:text-red-600"
                        title="Delete translation key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {languages.map((language) => {
          const totalKeys = currentNamespace?.keys.length || 0;
          const translatedKeys = currentNamespace?.keys.filter(t => 
            t[language.code] && t[language.code].trim() !== ''
          ).length || 0;
          const progress = totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 100) : 0;

          return (
            <div key={language.code} className="bg-white p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{language.flag}</span>
                  <span className="font-medium text-gray-900">{language.nativeName}</span>
                </div>
                <span className="text-sm text-gray-500">{progress}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full ${
                    progress === 100 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="text-xs text-gray-500">
                {translatedKeys} of {totalKeys} keys translated
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Number and date formatting utilities
const getNumberFormat = (locale: string) => {
  return new Intl.NumberFormat(locale);
};

const getCurrencyFormat = (locale: string, currency: string = 'USD') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  });
};

const getDateFormat = (locale: string, options: Intl.DateTimeFormatOptions = {}) => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
};

// Plural rules for different languages
const PLURAL_RULES: Record<string, (count: number) => string> = {
  en: (count: number) => count === 1 ? 'one' : 'other',
  es: (count: number) => count === 1 ? 'one' : 'other',
  fr: (count: number) => count === 0 || count === 1 ? 'one' : 'other',
  de: (count: number) => count === 1 ? 'one' : 'other',
  ru: (count: number) => {
    if (count % 10 === 1 && count % 100 !== 11) return 'one';
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'few';
    return 'many';
  },
  ar: (count: number) => {
    if (count === 0) return 'zero';
    if (count === 1) return 'one';
    if (count === 2) return 'two';
    if (count % 100 >= 3 && count % 100 <= 10) return 'few';
    if (count % 100 >= 11) return 'many';
    return 'other';
  },
  // Add more plural rules as needed
};

// I18n Provider Component
export function I18nProvider({ children }: { children: ReactNode }) {
  const [currentLocale, setCurrentLocale] = useState('en');
  const [translations, setTranslations] = useState<TranslationNamespace[]>(SAMPLE_TRANSLATIONS);

  // Load locale from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale');
    if (savedLocale && SUPPORTED_LANGUAGES.find(lang => lang.code === savedLocale)) {
      setCurrentLocale(savedLocale);
    }
  }, []);

  // Save locale to localStorage when changed
  const setLocale = (locale: string) => {
    setCurrentLocale(locale);
    localStorage.setItem('locale', locale);
    
    // Set document direction for RTL languages
    const language = SUPPORTED_LANGUAGES.find(lang => lang.code === locale);
    document.documentElement.dir = language?.rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  };

  // Translation function
  const t = (key: string, params: Record<string, any> = {}, namespace: string = 'common'): string => {
    const ns = translations.find(t => t.id === namespace);
    const translation = ns?.keys.find(t => t.key === key);
    
    let text = translation?.[currentLocale] || translation?.en || key;
    
    // Replace parameters
    Object.keys(params).forEach(param => {
      text = text.replace(`{{${param}}}`, params[param]);
    });
    
    return text;
  };

  // Pluralization function
  const pluralize = (key: string, count: number, params: Record<string, any> = {}, namespace: string = 'common'): string => {
    const pluralRule = PLURAL_RULES[currentLocale] || PLURAL_RULES.en;
    const pluralForm = pluralRule(count);
    const pluralKey = `${key}.${pluralForm}`;
    
    return t(pluralKey, { ...params, count }, namespace);
  };

  // Format number
  const formatNumber = (number: number): string => {
    return getNumberFormat(currentLocale).format(number);
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return getCurrencyFormat(currentLocale, currency).format(amount);
  };

  // Format date
  const formatDate = (date: Date, format: Intl.DateTimeFormatOptions = {}): string => {
    return getDateFormat(currentLocale, format).format(date);
  };

  // Load translations for a namespace
  const loadTranslations = async (namespace: string): Promise<void> => {
    // In a real app, this would load translations from an API or file
    console.log(`Loading translations for namespace: ${namespace}`);
  };

  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === currentLocale);
  const isRTL = currentLanguage?.rtl || false;

  const contextValue: I18nContextType = {
    currentLocale,
    setLocale,
    t,
    pluralize,
    formatNumber,
    formatCurrency,
    formatDate,
    isRTL,
    languages: SUPPORTED_LANGUAGES,
    translations,
    loadTranslations,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

// Higher-order component for translation
export function withTranslation<P extends object>(Component: React.ComponentType<P>) {
  return function TranslatedComponent(props: P) {
    const i18n = useI18n();
    return <Component {...props} {...i18n} />;
  };
}
