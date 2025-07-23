'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Code, 
  CreditCard, 
  Settings,
  Eye,
  Download,
  Star
} from 'lucide-react';
import { useToast } from './FormValidation';

// Test flow types
export interface TestStep {
  id: string;
  name: string;
  description: string;
  action: () => Promise<boolean>;
  status: 'pending' | 'running' | 'passed' | 'failed';
  errorMessage?: string;
  duration?: number;
}

export interface TestFlow {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
  userType: 'customer' | 'developer' | 'admin';
}

// Mock test implementations (replace with real API calls)
const mockApiCall = (name: string, shouldFail = false, delay = 1000): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (shouldFail) {
        resolve(false);
      } else {
        resolve(Math.random() > 0.1); // 90% success rate
      }
    }, delay);
  });
};

// Test flows configuration
const TEST_FLOWS: TestFlow[] = [
  {
    id: 'customer-journey',
    name: 'Customer Journey Flow',
    description: 'End-to-end customer experience from discovery to purchase',
    userType: 'customer',
    steps: [
      {
        id: 'landing-page',
        name: 'Landing Page Load',
        description: 'Verify landing page loads correctly with featured agents',
        action: async () => mockApiCall('landing-page'),
        status: 'pending'
      },
      {
        id: 'marketplace-browse',
        name: 'Browse Marketplace',
        description: 'Navigate to marketplace and view agent listings',
        action: async () => mockApiCall('marketplace-browse'),
        status: 'pending'
      },
      {
        id: 'agent-search',
        name: 'Search Agents',
        description: 'Use search and filters to find specific agents',
        action: async () => mockApiCall('agent-search'),
        status: 'pending'
      },
      {
        id: 'agent-details',
        name: 'View Agent Details',
        description: 'Open agent detail page and review information',
        action: async () => mockApiCall('agent-details'),
        status: 'pending'
      },
      {
        id: 'user-signup',
        name: 'User Registration',
        description: 'Create new user account with email verification',
        action: async () => mockApiCall('user-signup'),
        status: 'pending'
      },
      {
        id: 'agent-purchase',
        name: 'Purchase Agent',
        description: 'Complete Stripe checkout for agent purchase',
        action: async () => mockApiCall('agent-purchase'),
        status: 'pending'
      },
      {
        id: 'agent-execution',
        name: 'Execute Agent',
        description: 'Run purchased agent with test input',
        action: async () => mockApiCall('agent-execution'),
        status: 'pending'
      },
      {
        id: 'view-results',
        name: 'View Results',
        description: 'Check execution results and history',
        action: async () => mockApiCall('view-results'),
        status: 'pending'
      },
      {
        id: 'leave-review',
        name: 'Leave Review',
        description: 'Submit rating and review for purchased agent',
        action: async () => mockApiCall('leave-review'),
        status: 'pending'
      }
    ]
  },
  {
    id: 'developer-journey',
    name: 'Developer Journey Flow',
    description: 'Complete developer workflow from onboarding to monetization',
    userType: 'developer',
    steps: [
      {
        id: 'dev-signup',
        name: 'Developer Registration',
        description: 'Register as developer with enhanced profile setup',
        action: async () => mockApiCall('dev-signup'),
        status: 'pending'
      },
      {
        id: 'profile-setup',
        name: 'Profile Configuration',
        description: 'Complete developer profile with bio, skills, and verification',
        action: async () => mockApiCall('profile-setup'),
        status: 'pending'
      },
      {
        id: 'stripe-onboarding',
        name: 'Stripe Connect Setup',
        description: 'Complete Stripe Express account setup for payments',
        action: async () => mockApiCall('stripe-onboarding'),
        status: 'pending'
      },
      {
        id: 'agent-creation',
        name: 'Create Agent',
        description: 'Build new agent with code, description, and pricing',
        action: async () => mockApiCall('agent-creation'),
        status: 'pending'
      },
      {
        id: 'agent-testing',
        name: 'Test Agent',
        description: 'Run agent tests and validate functionality',
        action: async () => mockApiCall('agent-testing'),
        status: 'pending'
      },
      {
        id: 'agent-publish',
        name: 'Publish to Marketplace',
        description: 'Submit agent for review and publish to marketplace',
        action: async () => mockApiCall('agent-publish'),
        status: 'pending'
      },
      {
        id: 'integration-setup',
        name: 'Integration Configuration',
        description: 'Configure third-party integrations (Slack, Discord, etc.)',
        action: async () => mockApiCall('integration-setup'),
        status: 'pending'
      },
      {
        id: 'webhook-config',
        name: 'Webhook Setup',
        description: 'Set up webhooks for agent notifications',
        action: async () => mockApiCall('webhook-config'),
        status: 'pending'
      },
      {
        id: 'analytics-review',
        name: 'Analytics Dashboard',
        description: 'Review agent performance and earnings analytics',
        action: async () => mockApiCall('analytics-review'),
        status: 'pending'
      },
      {
        id: 'payout-request',
        name: 'Request Payout',
        description: 'Initiate payout request for earned revenue',
        action: async () => mockApiCall('payout-request'),
        status: 'pending'
      }
    ]
  },
  {
    id: 'payment-edge-cases',
    name: 'Payment Edge Cases',
    description: 'Test various Stripe payment scenarios and error conditions',
    userType: 'customer',
    steps: [
      {
        id: 'declined-card',
        name: 'Declined Card Test',
        description: 'Test payment flow with declined card',
        action: async () => mockApiCall('declined-card', true),
        status: 'pending'
      },
      {
        id: 'expired-card',
        name: 'Expired Card Test',
        description: 'Test payment flow with expired card',
        action: async () => mockApiCall('expired-card', true),
        status: 'pending'
      },
      {
        id: 'insufficient-funds',
        name: 'Insufficient Funds Test',
        description: 'Test payment flow with insufficient funds',
        action: async () => mockApiCall('insufficient-funds', true),
        status: 'pending'
      },
      {
        id: '3ds-authentication',
        name: '3D Secure Authentication',
        description: 'Test 3D Secure authentication flow',
        action: async () => mockApiCall('3ds-authentication'),
        status: 'pending'
      },
      {
        id: 'webhook-failure',
        name: 'Webhook Failure Recovery',
        description: 'Test payment completion when webhooks fail',
        action: async () => mockApiCall('webhook-failure'),
        status: 'pending'
      },
      {
        id: 'partial-refund',
        name: 'Partial Refund',
        description: 'Test partial refund processing',
        action: async () => mockApiCall('partial-refund'),
        status: 'pending'
      },
      {
        id: 'subscription-upgrade',
        name: 'Subscription Upgrade',
        description: 'Test subscription tier upgrade flow',
        action: async () => mockApiCall('subscription-upgrade'),
        status: 'pending'
      },
      {
        id: 'bundle-purchase',
        name: 'Bundle Purchase',
        description: 'Test purchasing agent bundle with discounts',
        action: async () => mockApiCall('bundle-purchase'),
        status: 'pending'
      }
    ]
  }
];

// Test Flow Runner Component
export function TestFlowRunner() {
  const [flows, setFlows] = useState<TestFlow[]>(TEST_FLOWS);
  const [activeFlow, setActiveFlow] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const { addToast } = useToast();

  const runTestFlow = async (flowId: string) => {
    setActiveFlow(flowId);
    setIsRunning(true);

    const flowIndex = flows.findIndex(f => f.id === flowId);
    if (flowIndex === -1) return;

    const flow = flows[flowIndex];
    const updatedFlow = { ...flow };

    // Reset all steps
    updatedFlow.steps = updatedFlow.steps.map(step => ({
      ...step,
      status: 'pending' as const,
      errorMessage: undefined,
      duration: undefined
    }));

    setFlows(prev => [
      ...prev.slice(0, flowIndex),
      updatedFlow,
      ...prev.slice(flowIndex + 1)
    ]);

    // Run each step sequentially
    for (let stepIndex = 0; stepIndex < updatedFlow.steps.length; stepIndex++) {
      const step = updatedFlow.steps[stepIndex];
      
      // Update step status to running
      updatedFlow.steps[stepIndex] = { ...step, status: 'running' };
      setFlows(prev => [
        ...prev.slice(0, flowIndex),
        updatedFlow,
        ...prev.slice(flowIndex + 1)
      ]);

      const startTime = Date.now();
      
      try {
        const success = await step.action();
        const duration = Date.now() - startTime;
        
        updatedFlow.steps[stepIndex] = {
          ...step,
          status: success ? 'passed' : 'failed',
          duration,
          errorMessage: success ? undefined : 'Test step failed'
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        updatedFlow.steps[stepIndex] = {
          ...step,
          status: 'failed',
          duration,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      setFlows(prev => [
        ...prev.slice(0, flowIndex),
        updatedFlow,
        ...prev.slice(flowIndex + 1)
      ]);

      // Brief pause between steps
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
    setActiveFlow(null);

    // Show completion toast
    const passedSteps = updatedFlow.steps.filter(s => s.status === 'passed').length;
    const totalSteps = updatedFlow.steps.length;
    
    if (passedSteps === totalSteps) {
      addToast({
        type: 'success',
        title: 'Test Flow Completed',
        message: `All ${totalSteps} steps passed successfully`
      });
    } else {
      addToast({
        type: 'warning',
        title: 'Test Flow Completed',
        message: `${passedSteps}/${totalSteps} steps passed`
      });
    }
  };

  const getFlowStatus = (flow: TestFlow) => {
    const passed = flow.steps.filter(s => s.status === 'passed').length;
    const failed = flow.steps.filter(s => s.status === 'failed').length;
    const total = flow.steps.length;

    if (failed > 0) return { type: 'failed', text: `${failed} failed` };
    if (passed === total) return { type: 'passed', text: 'All passed' };
    if (passed > 0) return { type: 'partial', text: `${passed}/${total} passed` };
    return { type: 'pending', text: 'Not run' };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quality Assurance Test Flows
        </h2>
        <p className="text-gray-600 mb-6">
          Comprehensive testing of user journeys and edge cases across the platform.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {flows.map((flow) => {
            const status = getFlowStatus(flow);
            const isActive = activeFlow === flow.id;

            return (
              <div key={flow.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      {flow.userType === 'customer' && <User className="h-4 w-4 text-blue-500" />}
                      {flow.userType === 'developer' && <Code className="h-4 w-4 text-green-500" />}
                      {flow.userType === 'admin' && <Settings className="h-4 w-4 text-purple-500" />}
                      <h3 className="font-medium text-gray-900">{flow.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{flow.description}</p>
                  </div>
                  
                  <div className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${status.type === 'passed' ? 'bg-green-100 text-green-800' : ''}
                    ${status.type === 'failed' ? 'bg-red-100 text-red-800' : ''}
                    ${status.type === 'partial' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${status.type === 'pending' ? 'bg-gray-100 text-gray-800' : ''}
                  `}>
                    {status.text}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {flow.steps.map((step) => (
                    <div key={step.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate">{step.name}</span>
                      <div className="flex items-center space-x-1 ml-2">
                        {step.status === 'pending' && <Clock className="h-3 w-3 text-gray-400" />}
                        {step.status === 'running' && <Clock className="h-3 w-3 text-blue-500 animate-spin" />}
                        {step.status === 'passed' && <CheckCircle className="h-3 w-3 text-green-500" />}
                        {step.status === 'failed' && <XCircle className="h-3 w-3 text-red-500" />}
                        {step.duration && (
                          <span className="text-xs text-gray-500">{step.duration}ms</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => runTestFlow(flow.id)}
                  disabled={isRunning}
                  className={`
                    w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }
                    ${isRunning && !isActive ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <Play className="h-4 w-4" />
                  <span>{isActive ? 'Running...' : 'Run Test Flow'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed step view for active flow */}
      {activeFlow && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Test Progress: {flows.find(f => f.id === activeFlow)?.name}
          </h3>
          
          <div className="space-y-3">
            {flows.find(f => f.id === activeFlow)?.steps.map((step) => (
              <div key={step.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="mt-1">
                  {step.status === 'pending' && <Clock className="h-4 w-4 text-gray-400" />}
                  {step.status === 'running' && <Clock className="h-4 w-4 text-blue-500 animate-spin" />}
                  {step.status === 'passed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {step.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900">{step.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  
                  {step.errorMessage && (
                    <p className="text-sm text-red-600 mt-2">
                      Error: {step.errorMessage}
                    </p>
                  )}
                  
                  {step.duration && (
                    <p className="text-xs text-gray-500 mt-1">
                      Completed in {step.duration}ms
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
