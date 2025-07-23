'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  X, 
  ChevronRight, 
  ChevronLeft,
  BookOpen,
  Lightbulb,
  CheckCircle,
  Circle,
  Target,
  Zap,
  Users,
  Code,
  Settings,
  ShoppingCart,
  Star,
  HelpCircle,
  ArrowRight,
  Eye,
  Hand
} from 'lucide-react';
import { createPortal } from 'react-dom';

// Types
export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'hover' | 'scroll' | 'type' | 'wait';
  actionData?: any;
  optional?: boolean;
  validation?: () => boolean | Promise<boolean>;
  onComplete?: () => void;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: 'getting-started' | 'agent-creation' | 'marketplace' | 'integrations' | 'advanced';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  prerequisites?: string[];
  steps: TutorialStep[];
  rewards?: {
    points?: number;
    badge?: string;
    unlock?: string[];
  };
}

export interface TutorialProgress {
  tutorialId: string;
  currentStep: number;
  completed: boolean;
  startedAt: Date;
  completedAt?: Date;
  skippedSteps: string[];
}

// Tutorial data
const TUTORIALS: Tutorial[] = [
  {
    id: 'getting-started',
    title: 'Welcome to AgentFlow.AI',
    description: 'Learn the basics of navigating and using the platform',
    category: 'getting-started',
    difficulty: 'beginner',
    estimatedTime: 5,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome! 👋',
        content: 'Welcome to AgentFlow.AI! This tutorial will guide you through the key features of our platform. You can pause, skip, or restart at any time.',
        position: 'center'
      },
      {
        id: 'navigation',
        title: 'Navigation Bar',
        content: 'This is your main navigation. Use it to access the marketplace, your dashboard, agents, and settings.',
        target: 'nav',
        position: 'bottom'
      },
      {
        id: 'marketplace',
        title: 'Agent Marketplace',
        content: 'Discover thousands of AI agents created by our community. Browse by category or search for specific functionality.',
        target: '[href="/marketplace"]',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'agent-card',
        title: 'Agent Cards',
        content: 'Each agent shows its rating, price, and key features. Click on any agent to view more details.',
        target: '.agent-card:first-child',
        position: 'right'
      },
      {
        id: 'profile',
        title: 'Your Profile',
        content: 'Access your account settings, purchase history, and developer tools from your profile menu.',
        target: '[data-testid="user-menu"]',
        position: 'bottom'
      }
    ],
    rewards: {
      points: 50,
      badge: 'First Steps',
      unlock: ['agent-creation']
    }
  },
  {
    id: 'agent-creation',
    title: 'Creating Your First Agent',
    description: 'Step-by-step guide to building and publishing your own AI agent',
    category: 'agent-creation',
    difficulty: 'intermediate',
    estimatedTime: 15,
    prerequisites: ['getting-started'],
    steps: [
      {
        id: 'developer-setup',
        title: 'Developer Setup',
        content: 'First, let\'s set up your developer profile. This allows you to create and sell agents on the marketplace.',
        target: '[href="/developer/setup"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'create-agent',
        title: 'Create New Agent',
        content: 'Click here to start creating your first agent. We\'ll walk you through each step of the process.',
        target: '[data-testid="create-agent-button"]',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'agent-details',
        title: 'Agent Information',
        content: 'Give your agent a descriptive name and detailed description. This helps users understand what your agent does.',
        target: '[data-testid="agent-form"]',
        position: 'right'
      },
      {
        id: 'code-editor',
        title: 'Code Your Agent',
        content: 'This is where the magic happens! Write your agent\'s logic using our built-in code editor with AI assistance.',
        target: '[data-testid="code-editor"]',
        position: 'top'
      },
      {
        id: 'test-agent',
        title: 'Test Your Agent',
        content: 'Always test your agent before publishing. Use the test panel to run your agent with sample data.',
        target: '[data-testid="test-panel"]',
        position: 'left'
      },
      {
        id: 'pricing',
        title: 'Set Your Price',
        content: 'Decide how much to charge for your agent. Consider the complexity and value it provides to users.',
        target: '[data-testid="pricing-section"]',
        position: 'right'
      },
      {
        id: 'publish',
        title: 'Publish to Marketplace',
        content: 'Once you\'re happy with your agent, publish it to the marketplace for others to discover and purchase!',
        target: '[data-testid="publish-button"]',
        position: 'top'
      }
    ],
    rewards: {
      points: 200,
      badge: 'Agent Creator',
      unlock: ['integrations', 'advanced']
    }
  },
  {
    id: 'marketplace-shopping',
    title: 'Shopping for Agents',
    description: 'Learn how to find, evaluate, and purchase the perfect agents for your needs',
    category: 'marketplace',
    difficulty: 'beginner',
    estimatedTime: 8,
    steps: [
      {
        id: 'search-filters',
        title: 'Using Search & Filters',
        content: 'Use the search bar and filters to find agents that match your specific needs. Filter by category, price range, and ratings.',
        target: '[data-testid="search-filters"]',
        position: 'bottom'
      },
      {
        id: 'agent-comparison',
        title: 'Comparing Agents',
        content: 'Compare similar agents by looking at their features, ratings, and prices. Read reviews from other users.',
        target: '[data-testid="comparison-table"]',
        position: 'top'
      },
      {
        id: 'purchase-flow',
        title: 'Making a Purchase',
        content: 'When you find the perfect agent, click "Purchase" to add it to your collection. We use Stripe for secure payments.',
        target: '[data-testid="purchase-button"]',
        position: 'top'
      },
      {
        id: 'agent-execution',
        title: 'Running Your Agent',
        content: 'After purchase, you can execute your agent from your dashboard. Configure inputs and monitor execution.',
        target: '[data-testid="execute-agent"]',
        position: 'right'
      }
    ],
    rewards: {
      points: 100,
      badge: 'Smart Shopper'
    }
  }
];

// Tutorial overlay component
export function TutorialOverlay({ 
  step, 
  onNext, 
  onPrevious, 
  onSkip, 
  onClose,
  currentStepIndex,
  totalSteps,
  isLastStep 
}: {
  step: TutorialStep;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onClose: () => void;
  currentStepIndex: number;
  totalSteps: number;
  isLastStep: boolean;
}) {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [overlayPosition, setOverlayPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (step.target) {
      const element = document.querySelector(step.target) as HTMLElement;
      setTargetElement(element);
      
      if (element) {
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Calculate overlay position based on step position
        let top = rect.top + scrollTop;
        let left = rect.left + scrollLeft;
        
        switch (step.position) {
          case 'top':
            top = rect.top + scrollTop - 350;
            left = rect.left + scrollLeft + (rect.width / 2) - 200;
            break;
          case 'bottom':
            top = rect.bottom + scrollTop + 20;
            left = rect.left + scrollLeft + (rect.width / 2) - 200;
            break;
          case 'left':
            top = rect.top + scrollTop + (rect.height / 2) - 175;
            left = rect.left + scrollLeft - 420;
            break;
          case 'right':
            top = rect.top + scrollTop + (rect.height / 2) - 175;
            left = rect.right + scrollLeft + 20;
            break;
          case 'center':
          default:
            top = window.innerHeight / 2 - 175;
            left = window.innerWidth / 2 - 200;
            break;
        }
        
        setOverlayPosition({ top, left });
        
        // Scroll element into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight the target element
        element.classList.add('tutorial-highlight');
      }
    }

    return () => {
      if (targetElement) {
        targetElement.classList.remove('tutorial-highlight');
      }
    };
  }, [step, targetElement]);

  const overlayContent = (
    <div 
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-w-[90vw]"
      style={{ 
        top: step.position === 'center' ? '50%' : overlayPosition.top,
        left: step.position === 'center' ? '50%' : overlayPosition.left,
        transform: step.position === 'center' ? 'translate(-50%, -50%)' : 'none'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <BookOpen className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-900">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {step.title}
        </h3>
        <p className="text-gray-700 leading-relaxed">
          {step.content}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          {currentStepIndex > 0 && (
            <button
              onClick={onPrevious}
              className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
          )}
          
          {step.optional && (
            <button
              onClick={onSkip}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Progress dots */}
          <div className="flex space-x-1">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStepIndex
                    ? 'bg-blue-500'
                    : index < currentStepIndex
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={onNext}
            className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <span>{isLastStep ? 'Finish' : 'Next'}</span>
            {!isLastStep && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Tutorial content */}
      {createPortal(overlayContent, document.body)}
      
      {/* Highlight spotlight */}
      {targetElement && step.target && (
        <div 
          className="fixed z-45 pointer-events-none"
          style={{
            top: targetElement.getBoundingClientRect().top + window.pageYOffset - 8,
            left: targetElement.getBoundingClientRect().left + window.pageXOffset - 8,
            width: targetElement.getBoundingClientRect().width + 16,
            height: targetElement.getBoundingClientRect().height + 16,
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.8)',
            border: '2px solid #3B82F6'
          }}
        />
      )}
    </>
  );
}

// Tutorial card component
export function TutorialCard({ 
  tutorial, 
  progress, 
  onStart, 
  onResume 
}: {
  tutorial: Tutorial;
  progress?: TutorialProgress;
  onStart: () => void;
  onResume?: () => void;
}) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'getting-started': return Target;
      case 'agent-creation': return Code;
      case 'marketplace': return ShoppingCart;
      case 'integrations': return Zap;
      case 'advanced': return Settings;
      default: return BookOpen;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const Icon = getCategoryIcon(tutorial.category);
  const completionPercentage = progress 
    ? (progress.currentStep / tutorial.steps.length) * 100 
    : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{tutorial.title}</h3>
            <p className="text-sm text-gray-600">{tutorial.description}</p>
          </div>
        </div>
        
        {progress?.completed && (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center space-x-4 mb-4 text-sm text-gray-500">
        <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(tutorial.difficulty)}`}>
          {tutorial.difficulty}
        </span>
        <span>{tutorial.estimatedTime} min</span>
        <span>{tutorial.steps.length} steps</span>
      </div>

      {/* Progress */}
      {progress && !progress.completed && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm text-gray-600">{Math.round(completionPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Prerequisites */}
      {tutorial.prerequisites && tutorial.prerequisites.length > 0 && (
        <div className="mb-4">
          <span className="text-xs font-medium text-gray-500 mb-2 block">PREREQUISITES</span>
          <div className="flex flex-wrap gap-1">
            {tutorial.prerequisites.map((prereq) => (
              <span
                key={prereq}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
              >
                {TUTORIALS.find(t => t.id === prereq)?.title || prereq}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rewards */}
      {tutorial.rewards && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <Star className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Rewards</span>
          </div>
          <div className="text-xs text-yellow-700">
            {tutorial.rewards.points && `${tutorial.rewards.points} points`}
            {tutorial.rewards.badge && ` • ${tutorial.rewards.badge} badge`}
            {tutorial.rewards.unlock && ` • Unlocks ${tutorial.rewards.unlock.length} tutorials`}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        {progress?.completed ? (
          <button
            onClick={onStart}
            className="flex items-center space-x-2 px-4 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Replay</span>
          </button>
        ) : progress ? (
          <button
            onClick={onResume}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play className="h-4 w-4" />
            <span>Continue</span>
          </button>
        ) : (
          <button
            onClick={onStart}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play className="h-4 w-4" />
            <span>Start Tutorial</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Main tutorial manager component
export function TutorialManager() {
  const [tutorials] = useState<Tutorial[]>(TUTORIALS);
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState<Record<string, TutorialProgress>>({});
  const [showTutorialList, setShowTutorialList] = useState(true);

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('tutorial-progress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        // Convert date strings back to Date objects
        Object.keys(parsed).forEach(key => {
          parsed[key].startedAt = new Date(parsed[key].startedAt);
          if (parsed[key].completedAt) {
            parsed[key].completedAt = new Date(parsed[key].completedAt);
          }
        });
        setProgress(parsed);
      } catch (error) {
        console.error('Failed to load tutorial progress:', error);
      }
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback((newProgress: Record<string, TutorialProgress>) => {
    localStorage.setItem('tutorial-progress', JSON.stringify(newProgress));
    setProgress(newProgress);
  }, []);

  const startTutorial = (tutorial: Tutorial) => {
    setActiveTutorial(tutorial);
    setCurrentStepIndex(0);
    setShowTutorialList(false);
    
    const tutorialProgress: TutorialProgress = {
      tutorialId: tutorial.id,
      currentStep: 0,
      completed: false,
      startedAt: new Date(),
      skippedSteps: []
    };
    
    saveProgress({
      ...progress,
      [tutorial.id]: tutorialProgress
    });
  };

  const resumeTutorial = (tutorial: Tutorial) => {
    const tutorialProgress = progress[tutorial.id];
    if (tutorialProgress) {
      setActiveTutorial(tutorial);
      setCurrentStepIndex(tutorialProgress.currentStep);
      setShowTutorialList(false);
    }
  };

  const nextStep = () => {
    if (!activeTutorial) return;
    
    const nextIndex = currentStepIndex + 1;
    
    if (nextIndex >= activeTutorial.steps.length) {
      // Tutorial completed
      const updatedProgress = {
        ...progress,
        [activeTutorial.id]: {
          ...progress[activeTutorial.id],
          completed: true,
          completedAt: new Date(),
          currentStep: activeTutorial.steps.length
        }
      };
      saveProgress(updatedProgress);
      closeTutorial();
    } else {
      setCurrentStepIndex(nextIndex);
      const updatedProgress = {
        ...progress,
        [activeTutorial.id]: {
          ...progress[activeTutorial.id],
          currentStep: nextIndex
        }
      };
      saveProgress(updatedProgress);
    }
  };

  const previousStep = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      
      if (activeTutorial) {
        const updatedProgress = {
          ...progress,
          [activeTutorial.id]: {
            ...progress[activeTutorial.id],
            currentStep: prevIndex
          }
        };
        saveProgress(updatedProgress);
      }
    }
  };

  const skipStep = () => {
    if (!activeTutorial) return;
    
    const currentStep = activeTutorial.steps[currentStepIndex];
    const updatedProgress = {
      ...progress,
      [activeTutorial.id]: {
        ...progress[activeTutorial.id],
        skippedSteps: [...progress[activeTutorial.id].skippedSteps, currentStep.id]
      }
    };
    saveProgress(updatedProgress);
    
    nextStep();
  };

  const closeTutorial = () => {
    setActiveTutorial(null);
    setCurrentStepIndex(0);
    setShowTutorialList(true);
    
    // Remove tutorial highlights
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });
  };

  const groupedTutorials = tutorials.reduce((acc, tutorial) => {
    if (!acc[tutorial.category]) {
      acc[tutorial.category] = [];
    }
    acc[tutorial.category].push(tutorial);
    return acc;
  }, {} as Record<string, Tutorial[]>);

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'getting-started': return 'Getting Started';
      case 'agent-creation': return 'Agent Creation';
      case 'marketplace': return 'Marketplace';
      case 'integrations': return 'Integrations';
      case 'advanced': return 'Advanced Features';
      default: return category;
    }
  };

  return (
    <>
      {/* Tutorial List */}
      {showTutorialList && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Interactive Tutorials</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Learn AgentFlow.AI with hands-on tutorials that guide you through each feature step by step.
            </p>
          </div>

          {Object.entries(groupedTutorials).map(([category, categoryTutorials]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {getCategoryTitle(category)}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryTutorials.map((tutorial) => (
                  <TutorialCard
                    key={tutorial.id}
                    tutorial={tutorial}
                    progress={progress[tutorial.id]}
                    onStart={() => startTutorial(tutorial)}
                    onResume={() => resumeTutorial(tutorial)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Tutorial Overlay */}
      {activeTutorial && (
        <TutorialOverlay
          step={activeTutorial.steps[currentStepIndex]}
          onNext={nextStep}
          onPrevious={previousStep}
          onSkip={skipStep}
          onClose={closeTutorial}
          currentStepIndex={currentStepIndex}
          totalSteps={activeTutorial.steps.length}
          isLastStep={currentStepIndex === activeTutorial.steps.length - 1}
        />
      )}

      {/* Tutorial CSS */}
      <style jsx global>{`
        .tutorial-highlight {
          position: relative;
          z-index: 41;
          border-radius: 8px;
          animation: pulse-border 2s infinite;
        }
        
        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.8);
          }
        }
      `}</style>
    </>
  );
}

// Tutorial trigger component (shows tutorial hints)
export function TutorialTrigger({ 
  tutorialId, 
  stepId, 
  children 
}: {
  tutorialId: string;
  stepId: string;
  children: React.ReactNode;
}) {
  const [showHint, setShowHint] = useState(false);
  
  const tutorial = TUTORIALS.find(t => t.id === tutorialId);
  const step = tutorial?.steps.find(s => s.id === stepId);
  
  if (!tutorial || !step) return <>{children}</>;

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowHint(true)}
      onMouseLeave={() => setShowHint(false)}
    >
      {children}
      
      {showHint && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap">
          {step.title}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
