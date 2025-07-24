'use client'

import { useState, useEffect } from 'react'
import { TrashIcon, KeyIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { credentialManager, UserCredential } from '@/lib/credential-manager'

interface CredentialsManagerProps {
  userId: string
}

export default function CredentialsManager({ userId }: CredentialsManagerProps) {
  const [credentials, setCredentials] = useState<UserCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState('')
  const [integrationConfigs, setIntegrationConfigs] = useState<any[]>([])

  useEffect(() => {
    loadCredentials()
    loadIntegrationConfigs()
  }, [userId])

  const loadCredentials = async () => {
    const result = await credentialManager.getUserCredentials(userId)
    if (result.success && result.credentials) {
      setCredentials(result.credentials)
    }
    setLoading(false)
  }

  const loadIntegrationConfigs = async () => {
    const result = await credentialManager.getIntegrationConfigs()
    if (result.success && result.configs) {
      setIntegrationConfigs(result.configs)
    }
  }

  const handleDeleteCredential = async (credentialId: string) => {
    if (!confirm('Are you sure you want to delete this credential? This action cannot be undone.')) {
      return
    }

    const result = await credentialManager.deleteCredential(credentialId, userId)
    if (result.success) {
      setCredentials(prev => prev.filter(cred => cred.id !== credentialId))
    } else {
      alert('Failed to delete credential: ' + result.error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'expired':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />
      case 'error':
      case 'revoked':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getServiceIcon = (serviceName: string) => {
    const iconMap: { [key: string]: string } = {
      'gmail': '📧',
      'slack': '💬',
      'google_sheets': '📊',
      'salesforce': '🏢',
      'github': '🐙',
      'hubspot': '🎯',
      'mailchimp': '🐵',
      'stripe': '💳',
      'zoom': '📹',
      'dropbox': '📦',
      'trello': '📋',
      'asana': '✅'
    }
    return iconMap[serviceName] || '🔗'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredCredentials = selectedService 
    ? credentials.filter(cred => cred.serviceName === selectedService)
    : credentials

  const groupedCredentials = filteredCredentials.reduce((acc, cred) => {
    if (!acc[cred.serviceName]) {
      acc[cred.serviceName] = []
    }
    acc[cred.serviceName].push(cred)
    return acc
  }, {} as Record<string, UserCredential[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Credential Management</h2>
          <p className="text-gray-600">Securely manage your API keys and OAuth tokens</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Services</option>
            {integrationConfigs.map(config => (
              <option key={config.service_name} value={config.service_name}>
                {config.display_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <KeyIcon className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Credentials</p>
              <p className="text-lg font-semibold text-gray-900">{credentials.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="w-8 h-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-lg font-semibold text-gray-900">
                {credentials.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <ClockIcon className="w-8 h-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Expired</p>
              <p className="text-lg font-semibold text-gray-900">
                {credentials.filter(c => c.status === 'expired').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Issues</p>
              <p className="text-lg font-semibold text-gray-900">
                {credentials.filter(c => c.status === 'error' || c.status === 'revoked').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Credentials List */}
      <div className="space-y-6">
        {Object.entries(groupedCredentials).map(([serviceName, serviceCredentials]) => {
          const config = integrationConfigs.find(c => c.service_name === serviceName)
          return (
            <div key={serviceName} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getServiceIcon(serviceName)}</span>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {config?.display_name || serviceName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {serviceCredentials.length} credential{serviceCredentials.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {serviceCredentials.map((credential) => (
                  <div key={credential.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(credential.status)}
                        <div>
                          <h4 className="font-medium text-gray-900">{credential.displayName}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="capitalize">{credential.serviceType}</span>
                            <span>Created {formatDate(credential.createdAt)}</span>
                            {credential.lastUsedAt && (
                              <span>Last used {formatDate(credential.lastUsedAt)}</span>
                            )}
                            {credential.expiresAt && (
                              <span>Expires {formatDate(credential.expiresAt)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          credential.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : credential.status === 'expired'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {credential.status}
                        </span>
                        
                        <button
                          onClick={() => handleDeleteCredential(credential.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete credential"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {credentials.length === 0 && (
        <div className="text-center py-12">
          <KeyIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No credentials stored</h3>
          <p className="text-gray-500 mb-4">
            Connect your first integration to start storing credentials securely.
          </p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            Browse Integrations
          </button>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm">🔒</span>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-blue-900">Enterprise Security</h4>
            <p className="text-sm text-blue-700 mt-1">
              All credentials are encrypted using AES-256 encryption and stored securely. 
              We use industry-standard OAuth 2.0 flows and never store your passwords directly.
              Your data is protected with bank-level security.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
