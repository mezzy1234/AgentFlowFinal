'use client'

import { useState, useRef, useEffect } from 'react'
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  suggestions?: string[]
}

interface SetupHelperProps {
  isOpen: boolean
  onClose: () => void
}

export default function SetupHelperAI({ isOpen, onClose }: SetupHelperProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm your Setup Helper AI 🤖 I'm here to help you get the most out of AgentFlow.AI. What would you like to automate today?",
      isUser: false,
      timestamp: new Date(),
      suggestions: [
        "Set up email automation",
        "Connect my CRM",
        "Create a lead capture bot",
        "Automate social media posts"
      ]
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(content.toLowerCase())
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse.content,
        isUser: false,
        timestamp: new Date(),
        suggestions: aiResponse.suggestions
      }
      
      setMessages(prev => [...prev, aiMessage])
      setIsTyping(false)
    }, 1500)
  }

  const generateAIResponse = (input: string) => {
    // Email automation responses
    if (input.includes('email') || input.includes('newsletter') || input.includes('campaign')) {
      return {
        content: "Great choice! Email automation can save you hours each week. I can help you set up:\n\n📧 Welcome email sequences\n📊 Newsletter campaigns\n🎯 Targeted email marketing\n\nTo get started, I'll need to know: What email platform are you currently using? (Gmail, Outlook, Mailchimp, etc.)",
        suggestions: [
          "I use Gmail",
          "I use Mailchimp", 
          "I use Outlook",
          "I'm not sure"
        ]
      }
    }

    // CRM responses
    if (input.includes('crm') || input.includes('salesforce') || input.includes('hubspot')) {
      return {
        content: "Perfect! Connecting your CRM will automatically sync leads and customer data. I support:\n\n🔗 Salesforce\n🔗 HubSpot\n🔗 Pipedrive\n🔗 Zoho CRM\n\nWhich CRM are you using? I'll walk you through the connection process step by step.",
        suggestions: [
          "Salesforce",
          "HubSpot",
          "Pipedrive", 
          "Other CRM"
        ]
      }
    }

    // Lead capture responses
    if (input.includes('lead') || input.includes('capture') || input.includes('form')) {
      return {
        content: "Excellent! Lead capture automation can increase your conversion rates by 40%. Here's what I can set up:\n\n🎯 Smart web forms\n📱 Chatbot lead qualification\n📧 Instant follow-up emails\n📊 Lead scoring & routing\n\nWhat's your main source of leads right now?",
        suggestions: [
          "Website visitors",
          "Social media",
          "Email campaigns",
          "Referrals"
        ]
      }
    }

    // Social media responses
    if (input.includes('social') || input.includes('twitter') || input.includes('linkedin') || input.includes('facebook')) {
      return {
        content: "Social media automation is a game-changer! 🚀 I can help you:\n\n📅 Schedule posts across platforms\n📈 Auto-engage with followers\n📊 Track performance metrics\n🔄 Cross-post content automatically\n\nWhich platforms do you want to automate?",
        suggestions: [
          "LinkedIn + Twitter",
          "Facebook + Instagram", 
          "All platforms",
          "Just LinkedIn"
        ]
      }
    }

    // Gmail specific
    if (input.includes('gmail')) {
      return {
        content: "Perfect! Gmail automation is super easy to set up. Here's what I can configure:\n\n✉️ Auto-reply templates\n📂 Smart email sorting\n📋 Follow-up sequences\n📊 Email analytics\n\nLet's start with connecting your Gmail account. I'll guide you through the secure OAuth process.",
        suggestions: [
          "Connect Gmail now",
          "Set up auto-replies",
          "Create email templates",
          "Learn about security"
        ]
      }
    }

    // Mailchimp specific
    if (input.includes('mailchimp')) {
      return {
        content: "Great choice! Mailchimp integration will supercharge your email marketing. I can set up:\n\n🎯 Automated campaigns\n📈 A/B testing workflows\n📊 Advanced segmentation\n🔄 Cross-platform sync\n\nDo you have your Mailchimp API key ready, or should I show you how to find it?",
        suggestions: [
          "I have my API key",
          "Show me how to find it",
          "What is an API key?",
          "Set up campaigns first"
        ]
      }
    }

    // Security/not sure responses
    if (input.includes('not sure') || input.includes('security') || input.includes('safe')) {
      return {
        content: "No worries! Let me explain how AgentFlow.AI keeps your data secure:\n\n🔒 Bank-level AES-256 encryption\n🛡️ OAuth 2.0 authentication (no passwords stored)\n✅ SOC 2 Type II certified\n🔐 Zero-knowledge architecture\n\nYour credentials are encrypted and only you can access them. Ready to start with a simple automation?",
        suggestions: [
          "Yes, let's start simple",
          "Tell me more about security",
          "Show me the easiest setup",
          "What's OAuth?"
        ]
      }
    }

    // Default responses
    const defaultResponses = [
      {
        content: "I understand you're looking to automate your workflow! Let me suggest some popular starting points:\n\n🚀 Most users love starting with email automation - it's simple and shows immediate results.\n📊 CRM integration is also popular for sales teams.\n\nWhat area of your business takes up the most time each day?",
        suggestions: [
          "Email and communication",
          "Lead management", 
          "Social media posting",
          "Data entry tasks"
        ]
      },
      {
        content: "That's a great question! Based on what thousands of users have automated, here are the top time-savers:\n\n⏰ Email automation (saves 8+ hours/week)\n📈 Lead scoring & routing (saves 5+ hours/week)\n📱 Social media scheduling (saves 6+ hours/week)\n\nWhich of these sounds most valuable for your business?",
        suggestions: [
          "Email automation",
          "Lead management",
          "Social media", 
          "Show me all options"
        ]
      }
    ]

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">🤖</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Setup Helper AI</h3>
              <p className="text-sm text-green-600">● Online • Ready to help</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.isUser
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm whitespace-pre-line">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.isUser ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Suggestions */}
          {!isTyping && messages[messages.length - 1]?.suggestions && (
            <div className="flex flex-wrap gap-2">
              {messages[messages.length - 1].suggestions?.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
              placeholder="Ask me anything about setting up automations..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              disabled={isTyping}
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isTyping}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: I can help with Gmail, Slack, CRM setup, lead capture, and much more!
          </p>
        </div>
      </div>
    </div>
  )
}
