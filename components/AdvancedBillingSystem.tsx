'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  CreditCard, 
  Download, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Settings,
  Plus,
  Edit3,
  Trash2,
  Copy,
  ExternalLink,
  BarChart3,
  PieChart,
  Activity,
  Wallet,
  Receipt,
  Shield,
  Bell,
  CreditCardIcon,
  BanknoteIcon,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Info,
  Star,
  Crown,
  Users,
  Building,
  Database,
  Bot
} from 'lucide-react';

// Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: Record<string, string>;
  limits: Record<string, number>;
  is_active: boolean;
  popular?: boolean;
}

export interface UserSubscription {
  id: string;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired' | 'paused';
  current_period_start: Date;
  current_period_end: Date;
  trial_end?: Date;
  billing_cycle: 'monthly' | 'yearly';
  auto_renew: boolean;
}

export interface UsageData {
  resource_type: string;
  total_quantity: number;
  limit_value: number;
  percentage_used: number;
  limit_exceeded: boolean;
  unit: string;
  cost?: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  billing_period_start: Date;
  billing_period_end: Date;
  due_date: Date;
  paid_at?: Date;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  resource_type: 'subscription' | 'usage' | 'one_time';
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'paypal';
  brand?: string;
  last_four: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
}

// Billing Overview Dashboard
export function BillingOverview({
  subscription,
  usage,
  upcomingInvoice,
  recentInvoices
}: {
  subscription?: UserSubscription;
  usage: UsageData[];
  upcomingInvoice?: Invoice;
  recentInvoices: Invoice[];
}) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const getCurrentUsageCosts = () => {
    return usage.reduce((total, item) => total + (item.cost || 0), 0);
  };

  const getUsageStatusColor = (percentage: number, exceeded: boolean) => {
    if (exceeded) return 'text-red-600 bg-red-50';
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-50';
    if (percentage >= 60) return 'text-blue-600 bg-blue-50';
    return 'text-green-600 bg-green-50';
  };

  const getUsageIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'api_calls': return Activity;
      case 'storage_gb': return Database;
      case 'agent_count': return Bot;
      default: return BarChart3;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Billing Overview</h2>
          <p className="text-gray-600">Manage your subscription and monitor usage</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" />
            <span>Download Invoice</span>
          </button>
          
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Settings className="h-4 w-4" />
            <span>Billing Settings</span>
          </button>
        </div>
      </div>

      {/* Current Subscription Card */}
      {subscription && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Crown className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{subscription.plan.name} Plan</h3>
                <p className="text-sm text-gray-600">{subscription.plan.description}</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                ${subscription.billing_cycle === 'monthly' 
                  ? subscription.plan.price_monthly 
                  : subscription.plan.price_yearly
                }
              </div>
              <div className="text-sm text-gray-500">
                per {subscription.billing_cycle === 'monthly' ? 'month' : 'year'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                subscription.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Next Billing</span>
              <span className="text-sm font-medium text-gray-900">
                {subscription.current_period_end.toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Auto Renew</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                subscription.auto_renew 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {subscription.auto_renew ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              Change Plan
            </button>
            <button className="text-gray-500 hover:text-gray-700 font-medium text-sm">
              Cancel Subscription
            </button>
          </div>
        </div>
      )}

      {/* Usage Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Current Usage</h3>
          <span className="text-sm text-gray-500">
            Billing period: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {usage.map((item) => {
            const Icon = getUsageIcon(item.resource_type);
            const percentage = Math.min(item.percentage_used, 100);
            
            return (
              <div key={item.resource_type} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {item.resource_type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    getUsageStatusColor(percentage, item.limit_exceeded)
                  }`}>
                    {item.limit_exceeded ? 'Exceeded' : `${Math.round(percentage)}%`}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {item.total_quantity.toLocaleString()} {item.unit}
                    </span>
                    <span className="text-gray-900">
                      {item.limit_value === -1 
                        ? 'Unlimited' 
                        : `${item.limit_value.toLocaleString()} ${item.unit}`
                      }
                    </span>
                  </div>
                  
                  {item.limit_value !== -1 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          item.limit_exceeded 
                            ? 'bg-red-500' 
                            : percentage >= 80 
                              ? 'bg-yellow-500' 
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {item.cost && (
                  <div className="text-xs text-gray-500">
                    Additional charges: ${item.cost.toFixed(2)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Invoice */}
      {upcomingInvoice && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Invoice</h3>
            <span className="text-sm text-gray-500">
              Due {upcomingInvoice.due_date.toLocaleDateString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">
                ${upcomingInvoice.subtotal.toFixed(2)}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Usage Charges</span>
              <span className="font-medium text-gray-900">
                ${getCurrentUsageCosts().toFixed(2)}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-600 font-medium">Total</span>
              <span className="font-bold text-blue-900">
                ${upcomingInvoice.total_amount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-600">
              Payment will be processed automatically on {upcomingInvoice.due_date.toLocaleDateString()}
            </span>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Recent Invoices */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              View All
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {recentInvoices.map((invoice) => (
            <div key={invoice.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-gray-600" />
                </div>
                
                <div>
                  <div className="font-medium text-gray-900">
                    Invoice {invoice.invoice_number}
                  </div>
                  <div className="text-sm text-gray-500">
                    {invoice.billing_period_start.toLocaleDateString()} - {invoice.billing_period_end.toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="font-medium text-gray-900">
                    ${invoice.total_amount.toFixed(2)}
                  </div>
                  <div className={`text-sm ${
                    invoice.status === 'paid' 
                      ? 'text-green-600' 
                      : invoice.status === 'overdue'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                  }`}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </div>
                </div>

                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Subscription Plan Selector
export function SubscriptionPlanSelector({
  plans,
  currentPlan,
  billingCycle,
  onPlanSelect,
  onBillingCycleChange
}: {
  plans: SubscriptionPlan[];
  currentPlan?: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  onPlanSelect: (plan: SubscriptionPlan) => void;
  onBillingCycleChange: (cycle: 'monthly' | 'yearly') => void;
}) {
  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free': return Zap;
      case 'pro': return Star;
      case 'team': return Users;
      case 'enterprise': return Building;
      default: return Crown;
    }
  };

  const calculateYearlySavings = (monthly: number, yearly: number) => {
    const monthlyYearly = monthly * 12;
    const savings = monthlyYearly - yearly;
    const percentage = Math.round((savings / monthlyYearly) * 100);
    return { savings, percentage };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
        <p className="text-gray-600">Scale your AI agents with confidence</p>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center">
        <div className="bg-gray-100 rounded-lg p-1 flex">
          <button
            onClick={() => onBillingCycleChange('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => onBillingCycleChange('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Yearly
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const Icon = getPlanIcon(plan.name);
          const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
          const isCurrentPlan = currentPlan?.id === plan.id;
          const yearlySavings = calculateYearlySavings(plan.price_monthly, plan.price_yearly);

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-lg border-2 p-6 cursor-pointer transition-all duration-200 ${
                plan.popular 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : isCurrentPlan
                    ? 'border-green-500 ring-2 ring-green-200'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
              }`}
              onClick={() => onPlanSelect(plan)}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute top-4 right-4">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    Current
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <div className={`w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-4 ${
                  plan.popular ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`h-6 w-6 ${
                    plan.popular ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-600">{plan.description}</p>
              </div>

              {/* Pricing */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center space-x-1">
                  <span className="text-3xl font-bold text-gray-900">
                    ${price === 0 ? '0' : price.toFixed(0)}
                  </span>
                  {price > 0 && (
                    <span className="text-gray-500">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  )}
                </div>
                
                {billingCycle === 'yearly' && price > 0 && yearlySavings.percentage > 0 && (
                  <div className="mt-1">
                    <span className="text-sm text-green-600 font-medium">
                      Save ${yearlySavings.savings}/year ({yearlySavings.percentage}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                {Object.entries(plan.features).map(([key, value]) => (
                  <div key={key} className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{value}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <button
                className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                  isCurrentPlan
                    ? 'bg-gray-100 text-gray-600 cursor-default'
                    : plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
                disabled={isCurrentPlan}
              >
                {isCurrentPlan ? 'Current Plan' : plan.price_monthly === 0 ? 'Get Started' : 'Upgrade'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Enterprise Contact */}
      <div className="text-center p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Need something custom?</h3>
        <p className="text-gray-600 mb-4">
          Contact our sales team for custom pricing and enterprise features.
        </p>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Contact Sales
        </button>
      </div>
    </div>
  );
}

// Payment Methods Management
export function PaymentMethodsManager({
  paymentMethods,
  onAddPaymentMethod,
  onDeletePaymentMethod,
  onSetDefault
}: {
  paymentMethods: PaymentMethod[];
  onAddPaymentMethod: () => void;
  onDeletePaymentMethod: (id: string) => void;
  onSetDefault: (id: string) => void;
}) {
  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'card': return CreditCard;
      case 'bank_account': return Building;
      case 'paypal': return Wallet;
      default: return CreditCard;
    }
  };

  const formatCardBrand = (brand?: string) => {
    if (!brand) return '';
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
          <p className="text-sm text-gray-600">Manage your payment methods and billing information</p>
        </div>
        
        <button
          onClick={onAddPaymentMethod}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Payment Method</span>
        </button>
      </div>

      {/* Payment Methods List */}
      <div className="space-y-4">
        {paymentMethods.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payment methods</h3>
            <p className="text-gray-600 mb-4">Add a payment method to manage your subscription</p>
            <button
              onClick={onAddPaymentMethod}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Payment Method
            </button>
          </div>
        ) : (
          paymentMethods.map((method) => {
            const Icon = getPaymentMethodIcon(method.type);
            
            return (
              <div
                key={method.id}
                className={`p-4 border rounded-lg transition-colors ${
                  method.is_default 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      method.is_default ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        method.is_default ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {method.type === 'card' 
                            ? `${formatCardBrand(method.brand)} •••• ${method.last_four}`
                            : method.type === 'bank_account'
                              ? `Bank Account •••• ${method.last_four}`
                              : 'PayPal'
                          }
                        </span>
                        
                        {method.is_default && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            Default
                          </span>
                        )}
                      </div>
                      
                      {method.exp_month && method.exp_year && (
                        <div className="text-sm text-gray-500">
                          Expires {method.exp_month.toString().padStart(2, '0')}/{method.exp_year}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!method.is_default && (
                      <button
                        onClick={() => onSetDefault(method.id)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Set as Default
                      </button>
                    )}
                    
                    <button
                      onClick={() => onDeletePaymentMethod(method.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete payment method"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Security Note */}
      <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
        <Shield className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-gray-700">
          <p className="font-medium mb-1">Your payment information is secure</p>
          <p>We use Stripe to process payments securely. Your payment information is encrypted and never stored on our servers.</p>
        </div>
      </div>
    </div>
  );
}

// Usage Analytics Component
export function UsageAnalytics({
  usage,
  period = 'month'
}: {
  usage: UsageData[];
  period?: 'day' | 'week' | 'month' | 'year';
}) {
  const [selectedMetric, setSelectedMetric] = useState('api_calls');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Usage Analytics</h3>
          <p className="text-sm text-gray-600">Monitor your resource consumption and costs</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {usage.map((item) => (
              <option key={item.resource_type} value={item.resource_type}>
                {item.resource_type.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Usage Chart Placeholder */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4" />
            <p>Usage chart would be rendered here</p>
            <p className="text-sm">Integration with charting library needed</p>
          </div>
        </div>
      </div>

      {/* Usage Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {usage.map((item) => (
          <div key={item.resource_type} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 capitalize">
                {item.resource_type.replace('_', ' ')}
              </h4>
              
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                item.limit_exceeded 
                  ? 'bg-red-100 text-red-800' 
                  : item.percentage_used >= 80
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
              }`}>
                {item.percentage_used.toFixed(1)}%
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Used</span>
                <span className="font-medium">{item.total_quantity.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Limit</span>
                <span className="font-medium">
                  {item.limit_value === -1 ? 'Unlimited' : item.limit_value.toLocaleString()}
                </span>
              </div>
              
              {item.cost && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Cost</span>
                  <span className="font-medium">${item.cost.toFixed(2)}</span>
                </div>
              )}
            </div>

            {item.limit_value !== -1 && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      item.limit_exceeded 
                        ? 'bg-red-500' 
                        : item.percentage_used >= 80 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(item.percentage_used, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
