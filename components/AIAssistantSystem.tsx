'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  X, 
  Minimize2, 
  Maximize2,
  Settings,
  Zap,
  BookOpen,
  Code,
  Search,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RefreshCw,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Star,
  HelpCircle,
  Sparkles,
  Brain,
  Target,
  ArrowRight,
  Plus,
  Filter,
  ChevronDown,
  Loader
} from 'lucide-react';
import { createPortal } from 'react-dom';

// Types
export interface AIMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
    suggestions?: string[];
    codeBlocks?: CodeBlock[];
    actions?: AIAction[];
  };
}

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  filename?: string;
  description?: string;
}

export interface AIAction {
  id: string;
  type: 'navigate' | 'create' | 'execute' | 'search' | 'tutorial';
  label: string;
  icon: React.ComponentType<any>;
  data: any;
}

export interface AIContext {
  page: string;
  section?: string;
  selectedAgent?: string;
  userRole: 'buyer' | 'seller' | 'admin';
  recentActions: string[];
  preferences: AIPreferences;
}

export interface AIPreferences {
  responseStyle: 'concise' | 'detailed' | 'technical';
  suggestionsEnabled: boolean;
  voiceEnabled: boolean;
  autoHelp: boolean;
  topics: string[];
}

export interface SuggestedQuery {
  id: string;
  text: string;
  category: 'getting-started' | 'development' | 'marketplace' | 'troubleshooting';
  icon: React.ComponentType<any>;
  popularity: number;
}

// Sample suggested queries
const SUGGESTED_QUERIES: SuggestedQuery[] = [
  {
    id: 'create-first-agent',
    text: 'How do I create my first agent?',
    category: 'getting-started',
    icon: Code,
    popularity: 95
  },
  {
    id: 'pricing-strategies',
    text: 'What are good pricing strategies for my agents?',
    category: 'marketplace',
    icon: Target,
    popularity: 88
  },
  {
    id: 'debug-agent-error',
    text: 'My agent is throwing an error, how can I fix it?',
    category: 'troubleshooting',
    icon: AlertCircle,
    popularity: 92
  },
  {
    id: 'marketplace-optimization',
    text: 'How can I optimize my agent listing for more sales?',
    category: 'marketplace',
    icon: Star,
    popularity: 85
  },
  {
    id: 'integration-setup',
    text: 'How do I set up third-party integrations?',
    category: 'development',
    icon: Zap,
    popularity: 78
  },
  {
    id: 'analytics-insights',
    text: 'How can I understand my agent\'s performance analytics?',
    category: 'development',
    icon: Brain,
    popularity: 82
  }
];

// AI Chat Message Component
export function AIMessageComponent({ message, onAction }: {
  message: AIMessage;
  onAction?: (action: AIAction) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    // Show toast notification
  };

  const formatMessageContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className={`flex items-start space-x-3 ${
      message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
    }`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        message.type === 'user' 
          ? 'bg-blue-100 text-blue-600' 
          : message.type === 'assistant'
            ? 'bg-purple-100 text-purple-600'
            : 'bg-gray-100 text-gray-600'
      }`}>
        {message.type === 'user' ? (
          <User className="h-4 w-4" />
        ) : message.type === 'assistant' ? (
          <Bot className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[80%] ${
        message.type === 'user' ? 'flex flex-col items-end' : ''
      }`}>
        <div className={`rounded-lg p-3 ${
          message.type === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}>
          <div 
            dangerouslySetInnerHTML={{ 
              __html: formatMessageContent(message.content) 
            }} 
          />
        </div>

        {/* Code blocks */}
        {message.metadata?.codeBlocks?.map((codeBlock) => (
          <div key={codeBlock.id} className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Code className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {codeBlock.filename || codeBlock.language}
                </span>
              </div>
              <button
                onClick={() => handleCopyCode(codeBlock.code)}
                className="text-gray-500 hover:text-gray-700"
                title="Copy code"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <pre className="p-3 text-sm text-gray-900 bg-white overflow-x-auto">
              <code>{codeBlock.code}</code>
            </pre>
            {codeBlock.description && (
              <div className="px-3 py-2 bg-gray-50 text-sm text-gray-600">
                {codeBlock.description}
              </div>
            )}
          </div>
        ))}

        {/* Actions */}
        {message.metadata?.actions && message.metadata.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.metadata.actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => onAction?.(action)}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  <Icon className="h-3 w-3" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Suggestions */}
        {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.metadata.suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="block text-left w-full px-3 py-2 text-sm text-gray-600 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                onClick={() => {
                  // Handle suggestion click
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
          <span>{message.timestamp.toLocaleTimeString()}</span>
          
          {message.metadata?.confidence && (
            <div className="flex items-center space-x-1">
              <span>Confidence:</span>
              <div className="w-12 h-1.5 bg-gray-200 rounded-full">
                <div 
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${message.metadata.confidence * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// AI Chat Interface
export function AIChatInterface({ 
  isMinimized, 
  onToggleMinimize, 
  onClose,
  context 
}: {
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
  context: AIContext;
}) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome',
      type: 'assistant',
      content: 'Hi! I\'m your AI assistant. I can help you with creating agents, navigating the marketplace, debugging issues, and more. What would you like to know?',
      timestamp: new Date(),
      metadata: {
        suggestions: [
          'Show me how to create an agent',
          'Help me understand the marketplace',
          'I need help with pricing'
        ]
      }
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (!isMinimized) {
      inputRef.current?.focus();
    }
  }, [isMinimized]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputMessage, context);
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const generateAIResponse = (userInput: string, context: AIContext): AIMessage => {
    // Simple response generation based on keywords
    const input = userInput.toLowerCase();
    
    let content = '';
    let actions: AIAction[] = [];
    let codeBlocks: CodeBlock[] = [];
    
    if (input.includes('create') && input.includes('agent')) {
      content = `I'll help you create your first agent! Here's a step-by-step guide:

**1. Set up your developer profile**
First, make sure you have developer access enabled.

**2. Choose your agent type**
Decide what your agent will do - data processing, API integration, or automation.

**3. Write your agent code**
Use our built-in editor with AI assistance.`;

      actions = [
        {
          id: 'navigate-create',
          type: 'navigate',
          label: 'Go to Create Agent',
          icon: Code,
          data: { url: '/agents/create' }
        },
        {
          id: 'start-tutorial',
          type: 'tutorial',
          label: 'Start Tutorial',
          icon: BookOpen,
          data: { tutorialId: 'agent-creation' }
        }
      ];

      codeBlocks = [
        {
          id: 'sample-agent',
          language: 'javascript',
          filename: 'sample-agent.js',
          code: `// Sample agent code
export default function handler(input) {
  // Your agent logic here
  return {
    success: true,
    data: processInput(input)
  };
}

function processInput(input) {
  // Process the input data
  return input.toUpperCase();
}`,
          description: 'This is a basic agent template you can start with'
        }
      ];
    } else if (input.includes('pricing') || input.includes('price')) {
      content = `Here are some effective pricing strategies for your agents:

**💰 Value-Based Pricing**
Price based on the value your agent provides to users.

**📊 Market Research**
Research similar agents to find competitive pricing.

**🚀 Freemium Model**
Offer a free version with premium features.`;

      actions = [
        {
          id: 'view-pricing',
          type: 'navigate',
          label: 'View Pricing Guide',
          icon: Target,
          data: { url: '/docs/pricing' }
        }
      ];
    } else if (input.includes('error') || input.includes('debug') || input.includes('fix')) {
      content = `I can help you debug your agent! Here are common troubleshooting steps:

**🔍 Check the Console**
Look for error messages in the browser console or agent logs.

**🧪 Test with Sample Data**
Use our test runner with known good data.

**📝 Review Your Code**
Common issues include syntax errors and API rate limits.`;

      actions = [
        {
          id: 'open-debugger',
          type: 'execute',
          label: 'Open Debug Console',
          icon: Code,
          data: { action: 'debug' }
        },
        {
          id: 'test-agent',
          type: 'execute',
          label: 'Run Test',
          icon: Zap,
          data: { action: 'test' }
        }
      ];
    } else if (input.includes('marketplace') || input.includes('sell')) {
      content = `Here's how to optimize your marketplace presence:

**✨ Great Title & Description**
Use clear, searchable titles and detailed descriptions.

**📸 Quality Screenshots**
Show your agent in action with good visuals.

**⭐ Gather Reviews**
Encourage satisfied users to leave reviews.`;
    } else {
      content = `I understand you're asking about "${userInput}". Let me help you with that! 

Based on your current context (${context.page}), here are some relevant suggestions:

- Check our documentation for detailed guides
- Try the interactive tutorials
- Browse the community forum for similar questions

Is there something specific you'd like me to explain further?`;
    }

    return {
      id: `ai-${Date.now()}`,
      type: 'assistant',
      content,
      timestamp: new Date(),
      metadata: {
        confidence: 0.85 + Math.random() * 0.15,
        actions,
        codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined
      }
    };
  };

  const handleSuggestedQuery = (query: SuggestedQuery) => {
    setInputMessage(query.text);
  };

  const filteredSuggestions = selectedCategory === 'all' 
    ? SUGGESTED_QUERIES 
    : SUGGESTED_QUERIES.filter(q => q.category === selectedCategory);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onToggleMinimize}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors"
        >
          <Bot className="h-5 w-5" />
          <span>AI Assistant</span>
          {isTyping && (
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          )}
        </button>
      </div>
    );
  }

  return createPortal(
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-purple-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Assistant</h3>
            <p className="text-xs text-gray-500">Powered by AgentFlow AI</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              voiceEnabled ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'
            }`}
            title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          
          <button
            onClick={onToggleMinimize}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 1 && (
          <div className="space-y-4">
            {/* Category filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Topics</option>
                <option value="getting-started">Getting Started</option>
                <option value="development">Development</option>
                <option value="marketplace">Marketplace</option>
                <option value="troubleshooting">Troubleshooting</option>
              </select>
            </div>

            {/* Suggested queries */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                <Sparkles className="h-4 w-4" />
                <span>Popular Questions</span>
              </h4>
              {filteredSuggestions.map((query) => {
                const Icon = query.icon;
                return (
                  <button
                    key={query.id}
                    onClick={() => handleSuggestedQuery(query)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group"
                  >
                    <div className="flex items-start space-x-2">
                      <Icon className="h-4 w-4 text-gray-400 mt-0.5 group-hover:text-purple-600" />
                      <span className="text-sm text-gray-700 group-hover:text-purple-900">
                        {query.text}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <AIMessageComponent
            key={message.id}
            message={message}
            onAction={(action) => {
              // Handle action
              console.log('Action:', action);
            }}
          />
        ))}

        {isTyping && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Bot className="h-4 w-4 text-purple-600" />
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pr-10"
            />
            
            {voiceEnabled && (
              <button
                onClick={() => setIsListening(!isListening)}
                className={`absolute right-2 top-2 p-1 rounded transition-colors ${
                  isListening 
                    ? 'bg-red-100 text-red-600' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Main AI Assistant Manager
export function AIAssistantManager({ context }: { context: AIContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <>
      {/* Floating action button when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center z-50 group"
          title="Open AI Assistant"
        >
          <Bot className="h-6 w-6" />
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-green-500 rounded-full animate-pulse group-hover:animate-none" />
        </button>
      )}

      {/* AI Chat Interface */}
      {isOpen && (
        <AIChatInterface
          isMinimized={isMinimized}
          onToggleMinimize={() => setIsMinimized(!isMinimized)}
          onClose={() => {
            setIsOpen(false);
            setIsMinimized(false);
          }}
          context={context}
        />
      )}
    </>
  );
}
