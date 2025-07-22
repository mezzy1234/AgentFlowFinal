'use client';

import React, { useState, useEffect } from 'react';
import { Check, ArrowRight, ArrowLeft, User, Code, Users, Sparkles, Zap, Shield, Rocket } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
}

interface UserRole {
  id: 'end_user' | 'developer' | 'business';
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  color: string;
}

const USER_ROLES: UserRole[] = [
  {
    id: 'end_user',
    title: 'End User',
    description: 'I want to use AI agents to automate my tasks',
    icon: <User className="h-6 w-6" />,
    features: [
      'Browse and purchase agents',
      'Connect your favorite apps',
      'Set up automated workflows',
      'Monitor agent performance'
    ],
    color: 'bg-blue-500'
  },
  {
    id: 'developer',
    title: 'Developer',
    description: 'I want to create and sell AI agents',
    icon: <Code className="h-6 w-6" />,
    features: [
      'Build custom agents',
      'Monetize your creations',
      'Access developer tools',
      'Analytics dashboard'
    ],
    color: 'bg-purple-500'
  },
  {
    id: 'business',
    title: 'Business',
    description: 'I want to deploy agents for my team',
    icon: <Users className="h-6 w-6" />,
    features: [
      'Team management',
      'Enterprise security',
      'Custom integrations',
      'Usage analytics'
    ],
    color: 'bg-green-500'
  }
];

export function UserOnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<'end_user' | 'developer' | 'business' | null>(null);
  const [userData, setUserData] = useState({
    name: '',
    company: '',
    useCases: [] as string[],
    integrations: [] as string[]
  });
  const [isLoading, setIsLoading] = useState(false);

  // Role Selection Step
  const RoleSelectionStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <Sparkles className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to AgentFlow.AI!</h2>
        <p className="text-lg text-gray-600">Let's get you set up. What describes you best?</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {USER_ROLES.map(role => (
          <div
            key={role.id}
            onClick={() => setSelectedRole(role.id)}
            className={cn(
              "relative p-6 bg-white rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg",
              selectedRole === role.id
                ? 'border-blue-500 shadow-lg transform scale-105'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            {selectedRole === role.id && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1">
                <Check className="h-4 w-4" />
              </div>
            )}
            
            <div className={cn("p-3 rounded-lg mb-4", role.color)}>
              <div className="text-white">{role.icon}</div>
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{role.title}</h3>
            <p className="text-gray-600 mb-4">{role.description}</p>
            
            <ul className="space-y-2">
              {role.features.map(feature => (
                <li key={feature} className="flex items-center text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

  // Profile Setup Step
  const ProfileSetupStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <User className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Tell us about yourself</h2>
        <p className="text-lg text-gray-600">This helps us personalize your experience</p>
      </div>
      
      <div className="bg-white rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
          <input
            type="text"
            value={userData.name}
            onChange={(e) => setUserData({...userData, name: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your full name"
          />
        </div>
        
        {selectedRole === 'business' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
            <input
              type="text"
              value={userData.company}
              onChange={(e) => setUserData({...userData, company: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your company name"
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Primary Use Cases</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              'Email automation', 'Social media management', 'Data processing',
              'Customer service', 'Content creation', 'Sales outreach',
              'Report generation', 'Task management'
            ].map(useCase => (
              <label key={useCase} className="flex items-center">
                <input
                  type="checkbox"
                  checked={userData.useCases.includes(useCase)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setUserData({...userData, useCases: [...userData.useCases, useCase]});
                    } else {
                      setUserData({...userData, useCases: userData.useCases.filter(uc => uc !== useCase)});
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{useCase}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Integration Setup Step
  const IntegrationSetupStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <Zap className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Connect your tools</h2>
        <p className="text-lg text-gray-600">Choose the apps you'd like to integrate with AgentFlow</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: 'Gmail', icon: '📧', description: 'Email automation and management' },
          { name: 'Slack', icon: '💬', description: 'Team communication workflows' },
          { name: 'Google Sheets', icon: '📊', description: 'Spreadsheet automation' },
          { name: 'Notion', icon: '📝', description: 'Knowledge base integration' },
          { name: 'Trello', icon: '📋', description: 'Project management boards' },
          { name: 'GitHub', icon: '🐙', description: 'Code repository workflows' },
          { name: 'Calendly', icon: '📅', description: 'Meeting scheduling automation' },
          { name: 'Twitter', icon: '🐦', description: 'Social media management' },
          { name: 'Stripe', icon: '💳', description: 'Payment processing workflows' }
        ].map(integration => (
          <div
            key={integration.name}
            onClick={() => {
              if (userData.integrations.includes(integration.name)) {
                setUserData({...userData, integrations: userData.integrations.filter(i => i !== integration.name)});
              } else {
                setUserData({...userData, integrations: [...userData.integrations, integration.name]});
              }
            }}
            className={cn(
              "p-4 bg-white rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md",
              userData.integrations.includes(integration.name)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{integration.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{integration.name}</div>
                </div>
              </div>
              {userData.integrations.includes(integration.name) && (
                <Check className="h-5 w-5 text-blue-500" />
              )}
            </div>
            <p className="text-sm text-gray-600">{integration.description}</p>
          </div>
        ))}
      </div>
      
      <div className="text-center mt-6">
        <p className="text-sm text-gray-500">Don't worry, you can always add more integrations later</p>
      </div>
    </div>
  );

  // Completion Step
  const CompletionStep = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8 mb-8">
        <Rocket className="h-16 w-16 mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-2">You're all set! 🎉</h2>
        <p className="text-blue-100 text-lg">Welcome to the future of workflow automation</p>
      </div>
      
      <div className="bg-white rounded-xl p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">What's next?</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedRole === 'end_user' && (
            <>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="font-medium text-blue-900">Browse Marketplace</div>
                <div className="text-sm text-blue-700 mt-1">Discover agents for your use cases</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="font-medium text-green-900">Setup Integrations</div>
                <div className="text-sm text-green-700 mt-1">Connect your favorite apps</div>
              </div>
            </>
          )}
          
          {selectedRole === 'developer' && (
            <>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="font-medium text-purple-900">Create Your First Agent</div>
                <div className="text-sm text-purple-700 mt-1">Use our visual builder</div>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <div className="font-medium text-indigo-900">Access Dev Tools</div>
                <div className="text-sm text-indigo-700 mt-1">API docs and resources</div>
              </div>
            </>
          )}
          
          {selectedRole === 'business' && (
            <>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="font-medium text-green-900">Invite Team Members</div>
                <div className="text-sm text-green-700 mt-1">Get everyone onboard</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="font-medium text-yellow-900">Enterprise Setup</div>
                <div className="text-sm text-yellow-700 mt-1">Configure security settings</div>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-center space-x-4">
        <Shield className="h-5 w-5 text-green-500" />
        <span className="text-sm text-gray-600">Your data is encrypted and secure</span>
      </div>
    </div>
  );

  const steps: OnboardingStep[] = [
    {
      id: 'role',
      title: 'Choose Your Role',
      description: 'Tell us how you plan to use AgentFlow',
      component: <RoleSelectionStep />
    },
    {
      id: 'profile',
      title: 'Profile Setup',
      description: 'Basic information about you',
      component: <ProfileSetupStep />
    },
    {
      id: 'integrations',
      title: 'Connect Apps',
      description: 'Choose your preferred integrations',
      component: <IntegrationSetupStep />
    },
    {
      id: 'complete',
      title: 'All Done!',
      description: 'Welcome to AgentFlow.AI',
      component: <CompletionStep />
    }
  ];

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      setIsLoading(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({
              name: userData.name,
              company: userData.company,
              role: selectedRole,
              use_cases: userData.useCases,
              preferred_integrations: userData.integrations,
              onboarding_completed: true
            })
            .eq('id', user.id);
        }
        
        onComplete();
      } catch (error) {
        console.error('Failed to complete onboarding:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedRole !== null;
      case 1: return userData.name.trim().length > 0;
      case 2: return true; // Integrations are optional
      case 3: return true;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Bar */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 font-medium",
                  index <= currentStep
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-400 border-gray-300'
                )}>
                  {index < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                
                {index < steps.length - 1 && (
                  <div className={cn(
                    "w-16 h-1 mx-2",
                    index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  )} />
                )}
              </div>
            ))}
          </div>
          
          <div className="flex justify-between mt-2">
            {steps.map((step, index) => (
              <div key={step.id} className={cn(
                "text-xs text-center max-w-24",
                index <= currentStep ? 'text-blue-600 font-medium' : 'text-gray-400'
              )}>
                {step.title}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {steps[currentStep].component}
        </div>

        {/* Navigation */}
        <div className="max-w-3xl mx-auto flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={cn(
              "flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors",
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>
          
          <button
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
            className={cn(
              "flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors",
              canProceed() && !isLoading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            <span>
              {isLoading ? 'Setting up...' : 
               currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </span>
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
