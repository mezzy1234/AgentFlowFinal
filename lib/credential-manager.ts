import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || 'dev-key-change-in-production-32-chars'

export interface CredentialData {
  accessToken?: string
  refreshToken?: string
  apiKey?: string
  username?: string
  password?: string
  scope?: string[]
  expiresAt?: string
  [key: string]: any
}

export interface UserCredential {
  id: string
  userId: string
  serviceName: string
  serviceType: 'oauth2' | 'api_key' | 'basic_auth'
  displayName: string
  status: 'active' | 'expired' | 'revoked' | 'error'
  lastUsedAt?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export class CredentialManager {
  private encryptData(data: CredentialData): string {
    const algorithm = 'aes-256-gcm'
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()
    const iv = crypto.randomBytes(16)
    
    const cipher = crypto.createCipher(algorithm, key)
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return iv.toString('hex') + ':' + encrypted
  }

  private decryptData(encryptedData: string): CredentialData {
    const algorithm = 'aes-256-gcm'
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()
    
    const parts = encryptedData.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    
    const decipher = crypto.createDecipher(algorithm, key)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return JSON.parse(decrypted)
  }

  async storeCredential(
    userId: string,
    serviceName: string,
    serviceType: 'oauth2' | 'api_key' | 'basic_auth',
    displayName: string,
    credentialData: CredentialData,
    options: {
      scope?: string[]
      expiresAt?: Date
    } = {}
  ): Promise<{ success: boolean; credentialId?: string; error?: string }> {
    try {
      const encryptedData = this.encryptData(credentialData)
      
      const { data, error } = await supabase
        .from('user_credentials')
        .insert({
          user_id: userId,
          service_name: serviceName,
          service_type: serviceType,
          display_name: displayName,
          encrypted_data: encryptedData,
          encryption_key_id: 'v1',
          oauth_scope: options.scope || [],
          expires_at: options.expiresAt?.toISOString(),
          status: 'active'
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error storing credential:', error)
        return { success: false, error: error.message }
      }

      // Log the credential creation
      await this.logCredentialUsage(data.id, userId, 'created', true)

      return { success: true, credentialId: data.id }
    } catch (error) {
      console.error('Error in storeCredential:', error)
      return { success: false, error: 'Failed to store credential' }
    }
  }

  async getCredential(
    credentialId: string,
    userId: string
  ): Promise<{ success: boolean; credential?: CredentialData; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_credentials')
        .select('encrypted_data, status, expires_at')
        .eq('id', credentialId)
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        return { success: false, error: 'Credential not found' }
      }

      if (data.status !== 'active') {
        return { success: false, error: 'Credential is not active' }
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        await this.updateCredentialStatus(credentialId, 'expired')
        return { success: false, error: 'Credential has expired' }
      }

      const credentialData = this.decryptData(data.encrypted_data)
      
      // Update last used timestamp
      await this.updateLastUsed(credentialId)
      await this.logCredentialUsage(credentialId, userId, 'used', true)

      return { success: true, credential: credentialData }
    } catch (error) {
      console.error('Error getting credential:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.logCredentialUsage(credentialId, userId, 'used', false, errorMessage)
      return { success: false, error: 'Failed to retrieve credential' }
    }
  }

  async getUserCredentials(
    userId: string,
    serviceName?: string
  ): Promise<{ success: boolean; credentials?: UserCredential[]; error?: string }> {
    try {
      let query = supabase
        .from('user_credentials')
        .select(`
          id,
          service_name,
          service_type,
          display_name,
          status,
          last_used_at,
          expires_at,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)

      if (serviceName) {
        query = query.eq('service_name', serviceName)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      const credentials: UserCredential[] = data.map(cred => ({
        id: cred.id,
        userId: userId,
        serviceName: cred.service_name,
        serviceType: cred.service_type,
        displayName: cred.display_name,
        status: cred.status,
        lastUsedAt: cred.last_used_at,
        expiresAt: cred.expires_at,
        createdAt: cred.created_at,
        updatedAt: cred.updated_at
      }))

      return { success: true, credentials }
    } catch (error) {
      console.error('Error getting user credentials:', error)
      return { success: false, error: 'Failed to retrieve credentials' }
    }
  }

  async updateCredential(
    credentialId: string,
    userId: string,
    credentialData: CredentialData,
    options: {
      expiresAt?: Date
      status?: 'active' | 'expired' | 'revoked' | 'error'
    } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const encryptedData = this.encryptData(credentialData)
      
      const updateData: any = {
        encrypted_data: encryptedData,
        updated_at: new Date().toISOString()
      }

      if (options.expiresAt) {
        updateData.expires_at = options.expiresAt.toISOString()
      }

      if (options.status) {
        updateData.status = options.status
      }

      const { error } = await supabase
        .from('user_credentials')
        .update(updateData)
        .eq('id', credentialId)
        .eq('user_id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      await this.logCredentialUsage(credentialId, userId, 'refreshed', true)
      return { success: true }
    } catch (error) {
      console.error('Error updating credential:', error)
      return { success: false, error: 'Failed to update credential' }
    }
  }

  async deleteCredential(
    credentialId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_credentials')
        .delete()
        .eq('id', credentialId)
        .eq('user_id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      await this.logCredentialUsage(credentialId, userId, 'revoked', true)
      return { success: true }
    } catch (error) {
      console.error('Error deleting credential:', error)
      return { success: false, error: 'Failed to delete credential' }
    }
  }

  async refreshOAuthToken(
    credentialId: string,
    userId: string,
    refreshToken: string
  ): Promise<{ success: boolean; newTokens?: CredentialData; error?: string }> {
    try {
      // Get the service configuration
      const { data: credData, error: credError } = await supabase
        .from('user_credentials')
        .select('service_name')
        .eq('id', credentialId)
        .eq('user_id', userId)
        .single()

      if (credError || !credData) {
        return { success: false, error: 'Credential not found' }
      }

      const { data: serviceConfig, error: configError } = await supabase
        .from('integration_configs')
        .select('oauth_token_url, oauth_client_id')
        .eq('service_name', credData.service_name)
        .single()

      if (configError || !serviceConfig) {
        return { success: false, error: 'Service configuration not found' }
      }

      // Make token refresh request
      const tokenResponse = await fetch(serviceConfig.oauth_token_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: serviceConfig.oauth_client_id,
        }),
      })

      if (!tokenResponse.ok) {
        return { success: false, error: 'Failed to refresh token' }
      }

      const tokens = await tokenResponse.json()
      
      const newCredentialData: CredentialData = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || refreshToken,
        expiresAt: tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : undefined,
        scope: tokens.scope?.split(' ') || []
      }

      // Update the stored credential
      const updateResult = await this.updateCredential(
        credentialId,
        userId,
        newCredentialData,
        {
          expiresAt: newCredentialData.expiresAt ? new Date(newCredentialData.expiresAt) : undefined,
          status: 'active'
        }
      )

      if (!updateResult.success) {
        return { success: false, error: updateResult.error }
      }

      return { success: true, newTokens: newCredentialData }
    } catch (error) {
      console.error('Error refreshing OAuth token:', error)
      return { success: false, error: 'Failed to refresh token' }
    }
  }

  private async updateLastUsed(credentialId: string): Promise<void> {
    await supabase
      .from('user_credentials')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', credentialId)
  }

  private async updateCredentialStatus(
    credentialId: string,
    status: 'active' | 'expired' | 'revoked' | 'error'
  ): Promise<void> {
    await supabase
      .from('user_credentials')
      .update({ status })
      .eq('id', credentialId)
  }

  private async logCredentialUsage(
    credentialId: string,
    userId: string,
    action: 'created' | 'used' | 'refreshed' | 'revoked',
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase
        .from('credential_usage_log')
        .insert({
          credential_id: credentialId,
          user_id: userId,
          action,
          success,
          error_message: errorMessage,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error logging credential usage:', error)
    }
  }

  async getIntegrationConfigs(): Promise<{ success: boolean; configs?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('integration_configs')
        .select('*')
        .eq('enabled', true)
        .order('featured', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, configs: data }
    } catch (error) {
      console.error('Error getting integration configs:', error)
      return { success: false, error: 'Failed to get integration configs' }
    }
  }
}

export const credentialManager = new CredentialManager()
