'use client'

import { useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { 
  XMarkIcon,
  ShieldCheckIcon,
  KeyIcon,
  LinkIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/components/providers/AuthProvider'
import toast from 'react-hot-toast'

interface Credential {
  id: string
  name: string
  type: 'text' | 'token' | 'secret' | 'oauth' | 'webhook'
  instruction: string
  required: boolean
  placeholder?: string
  oauth_scopes?: string[]
  integration: {
    id: string
    name: string
    logo_url?: string
    auth_method: string
  }
}

interface CredentialModalProps {
  isOpen: boolean
  onClose: () => void
  agent: {
    id: string
    name: string
    required_integrations: Credential[]
  }
  onComplete: () => void
}

export default function CredentialModal({ 
  isOpen, 
  onClose, 
  agent, 
  onComplete 
}: CredentialModalProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [credentials, setCredentials] = useState<{ [key: string]: string }>({})
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  const currentCredential = agent.required_integrations[currentStep]
  const isLastStep = currentStep === agent.required_integrations.length - 1

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
      setCredentials({})
      setCompletedSteps([])
      setShowPassword({})
    }
  }, [isOpen])

  const handleInputChange = (credentialId: string, value: string) => {
    setCredentials(prev => ({ ...prev, [credentialId]: value }))
  }

  const handleOAuthConnect = async (credential: Credential) => {
    try {
      setIsSubmitting(true)
      
      // Mock OAuth flow - in real implementation, this would trigger Supabase Auth
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate successful OAuth connection
      setCompletedSteps(prev => [...prev, credential.id])
      toast.success(`Connected to ${credential.integration.name}`)
      
      if (isLastStep) {
        handleComplete()
      } else {
        setCurrentStep(prev => prev + 1)
      }
    } catch (error) {
      toast.error(`Failed to connect to ${credential.integration.name}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    const value = credentials[currentCredential.id]
    
    if (currentCredential.required && !value?.trim()) {
      toast.error('This credential is required')
      return
    }

    setCompletedSteps(prev => [...prev, currentCredential.id])

    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleComplete = async () => {
    try {
      setIsSubmitting(true)

      // Save all credentials to backend
      const credentialData = agent.required_integrations.map(cred => ({
        agent_id: agent.id,
        integration_id: cred.integration.id,
        credential_name: cred.name,
        credential_value: credentials[cred.id] || 'oauth_connected',
        encrypted: true
      }))

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      toast.success('All credentials connected successfully!')
      onComplete()
      onClose()
    } catch (error) {
      toast.error('Failed to save credentials')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderCredentialInput = (credential: Credential) => {
    switch (credential.type) {
      case 'oauth':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <div className="text-center">
                {credential.integration.logo_url ? (
                  <img 
                    src={credential.integration.logo_url} 
                    alt={credential.integration.name}
                    className="w-12 h-12 mx-auto mb-4"
                  />
                ) : (
                  <LinkIcon className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {credential.instruction}
                </p>
                <button
                  onClick={() => handleOAuthConnect(credential)}
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? 'Connecting...' : `Connect ${credential.integration.name}`}
                </button>
              </div>
            </div>
          </div>
        )

      case 'webhook':
        const webhookUrl = `https://your-n8n-instance.com/webhook/${agent.id}/${user?.id}`
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Webhook URL
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={webhookUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-gray-100 dark:bg-gray-700 text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl)
                    toast.success('Webhook URL copied!')
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 text-sm"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {credential.instruction}
              </p>
            </div>
          </div>
        )

      default:
        const isPasswordField = credential.type === 'secret' || credential.name.toLowerCase().includes('password')
        const fieldId = credential.id
        
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {credential.name}
                {credential.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="relative">
                <input
                  type={isPasswordField && !showPassword[fieldId] ? 'password' : 'text'}
                  value={credentials[fieldId] || ''}
                  onChange={(e) => handleInputChange(fieldId, e.target.value)}
                  placeholder={credential.placeholder || `Enter your ${credential.name.toLowerCase()}`}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800"
                />
                {isPasswordField && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, [fieldId]: !prev[fieldId] }))}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword[fieldId] ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
              {credential.instruction && (
                <p className="text-sm text-gray-500 mt-2">
                  {credential.instruction}
                </p>
              )}
            </div>
          </div>
        )
    }
  }

  if (!currentCredential) return null

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                    >
                      Connect Your Accounts
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 mt-1">
                      {agent.name} needs access to these services
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Progress */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Step {currentStep + 1} of {agent.required_integrations.length}
                    </span>
                    <span className="text-sm text-gray-500">
                      {Math.round(((currentStep + 1) / agent.required_integrations.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${((currentStep + 1) / agent.required_integrations.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Current Credential */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      {currentCredential.integration.logo_url ? (
                        <img 
                          src={currentCredential.integration.logo_url} 
                          alt={currentCredential.integration.name}
                          className="w-6 h-6"
                        />
                      ) : (
                        <KeyIcon className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {currentCredential.integration.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {currentCredential.required ? 'Required' : 'Optional'}
                      </p>
                    </div>
                  </div>

                  {renderCredentialInput(currentCredential)}
                </div>

                {/* Security Notice */}
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-300">
                      Your data is secure
                    </span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                    All credentials are encrypted and stored securely. We never access your data.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {currentStep > 0 && (
                    <button
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Back
                    </button>
                  )}
                  {currentCredential.type !== 'oauth' && (
                    <button
                      onClick={handleNext}
                      disabled={isSubmitting}
                      className="flex-1 btn btn-primary"
                    >
                      {isSubmitting ? 'Saving...' : isLastStep ? 'Complete Setup' : 'Next'}
                    </button>
                  )}
                </div>

                {/* Skip Option for Optional Credentials */}
                {!currentCredential.required && currentCredential.type !== 'oauth' && (
                  <button
                    onClick={() => {
                      if (isLastStep) {
                        handleComplete()
                      } else {
                        setCurrentStep(prev => prev + 1)
                      }
                    }}
                    className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Skip this step
                  </button>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
