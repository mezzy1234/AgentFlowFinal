'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronRightIcon, SparklesIcon, BoltIcon, ShieldCheckIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import Navbar from '@/components/layout/Navbar'

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6">
              AI Automation
              <span className="block text-primary-600">Marketplace</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Buy, sell, and activate AI-powered workflow agents. Connect your tools, automate your business, and scale effortlessly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/signup"
                className="btn btn-primary text-lg px-8 py-4"
              >
                Get Started Free
                <ChevronRightIcon className="ml-2 w-5 h-5" />
              </Link>
              <Link 
                href="/marketplace"
                className="btn btn-outline text-lg px-8 py-4"
              >
                Agent Marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why AgentFlow.AI?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              The fastest way to automate your business with pre-built AI agents
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card p-8 text-center">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">1000+ Integrations</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Connect Gmail, Slack, OpenAI, Stripe, and hundreds more tools instantly.
              </p>
            </div>

            <div className="card p-8 text-center">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BoltIcon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">One-Click Setup</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Buy an agent, connect your credentials, and activate. No coding required.
              </p>
            </div>

            <div className="card p-8 text-center">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Enterprise Security</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Encrypted credentials, 2FA support, and GDPR compliance built-in.
              </p>
            </div>

            <div className="card p-8 text-center">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ChartBarIcon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Developer Revenue</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Build once, sell forever. Earn from every agent activation and usage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to automate everything?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses already saving time with AI automation
          </p>
          <Link 
            href="/signup"
            className="btn btn-primary text-lg px-8 py-4"
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
              </div>
      </section>

      {/* Dashboard Previews Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Experience Both Dashboards
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Try our Customer and Developer dashboards before creating an account. See what each experience offers.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Customer Dashboard Preview */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChartBarIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Customer Dashboard</h3>
                <p className="text-gray-600 dark:text-gray-300">Manage your AI agents and monitor performance</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Agents</span>
                  <span className="text-2xl font-bold text-blue-600">12</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Tasks Completed</span>
                  <span className="text-2xl font-bold text-green-600">2,847</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Monthly Usage</span>
                  <span className="text-2xl font-bold text-purple-600">68%</span>
                </div>
              </div>
              
              <div className="text-center">
                <Link 
                  href="/customer-dashboard"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  Try Customer Dashboard
                  <ChevronRightIcon className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Developer Dashboard Preview */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BoltIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Developer Dashboard</h3>
                <p className="text-gray-600 dark:text-gray-300">Build, deploy, and monetize your AI agents</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Published Agents</span>
                  <span className="text-2xl font-bold text-purple-600">8</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Monthly Revenue</span>
                  <span className="text-2xl font-bold text-green-600">$1,247</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Downloads</span>
                  <span className="text-2xl font-bold text-blue-600">15.2k</span>
                </div>
              </div>
              
              <div className="text-center">
                <Link 
                  href="/dev-dashboard"
                  className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition"
                >
                  Try Developer Dashboard
                  <ChevronRightIcon className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Ready to get started? Choose your path and create your account.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/signup?role=customer"
                className="btn btn-primary text-lg px-8 py-4"
              >
                Start as Customer
              </Link>
              <Link 
                href="/signup?role=developer"
                className="btn btn-outline text-lg px-8 py-4"
              >
                Start as Developer
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/marketplace" className="hover:text-white">Marketplace</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/integrations" className="hover:text-white">Integrations</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-white">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Developer</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/dev" className="hover:text-white">Developer Hub</Link></li>
                <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
                <li><Link href="/api" className="hover:text-white">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
                <li><Link href="/refund" className="hover:text-white">Refund Policy</Link></li>
              </ul>
            </div>
          </div>
    </div>
  )
}
