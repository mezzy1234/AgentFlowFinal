import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface IntegrationHealthCheck {
  integration_id: string
  service_name: string
  user_id: string
  status: 'healthy' | 'warning' | 'error' | 'expired'
  last_check_at: string
  response_time_ms?: number
  error_message?: string
  expires_at?: string
  auto_refresh_enabled: boolean
}

interface HealthMonitorConfig {
  check_interval_hours: number
  notification_thresholds: {
    warning_days_before_expiry: number
    critical_days_before_expiry: number
  }
  auto_refresh_tokens: boolean
  webhook_notifications: boolean
}

class IntegrationHealthMonitor {
  private config: HealthMonitorConfig = {
    check_interval_hours: 12,
    notification_thresholds: {
      warning_days_before_expiry: 7,
      critical_days_before_expiry: 2
    },
    auto_refresh_tokens: true,
    webhook_notifications: true
  }

  async runHealthChecks() {
    try {
      // Get all active integrations
      const { data: integrations, error } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('status', 'connected')

      if (error) throw error

      const results = []
      for (const integration of integrations || []) {
        const result = await this.checkIntegrationHealth(integration)
        results.push(result)

        // Update integration status based on health check
        await this.updateIntegrationStatus(integration.id, result)

        // Send notifications if needed
        if (result.status !== 'healthy') {
          await this.sendHealthNotification(integration, result)
        }
      }

      // Clean up old health check records
      await this.cleanupOldHealthChecks()

      return {
        success: true,
        total_checked: results.length,
        healthy: results.filter(r => r.status === 'healthy').length,
        warnings: results.filter(r => r.status === 'warning').length,
        errors: results.filter(r => r.status === 'error').length,
        expired: results.filter(r => r.status === 'expired').length,
        results: results
      }
    } catch (error) {
      console.error('Health check error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async checkIntegrationHealth(integration: any): Promise<IntegrationHealthCheck> {
    const startTime = Date.now()
    
    try {
      // Check if token is expired
      if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
        return {
          integration_id: integration.id,
          service_name: integration.service_name,
          user_id: integration.user_id,
          status: 'expired',
          last_check_at: new Date().toISOString(),
          error_message: 'Token has expired',
          expires_at: integration.expires_at,
          auto_refresh_enabled: integration.auto_refresh_enabled || false
        }
      }

      // Check if token expires soon
      const daysUntilExpiry = this.getDaysUntilExpiry(integration.expires_at)
      if (daysUntilExpiry !== null) {
        if (daysUntilExpiry <= this.config.notification_thresholds.critical_days_before_expiry) {
          return {
            integration_id: integration.id,
            service_name: integration.service_name,
            user_id: integration.user_id,
            status: 'error',
            last_check_at: new Date().toISOString(),
            response_time_ms: Date.now() - startTime,
            error_message: `Token expires in ${daysUntilExpiry} days`,
            expires_at: integration.expires_at,
            auto_refresh_enabled: integration.auto_refresh_enabled || false
          }
        } else if (daysUntilExpiry <= this.config.notification_thresholds.warning_days_before_expiry) {
          const validationResult = await this.validateIntegrationCredentials(integration)
          return {
            integration_id: integration.id,
            service_name: integration.service_name,
            user_id: integration.user_id,
            status: validationResult.valid ? 'warning' : 'error',
            last_check_at: new Date().toISOString(),
            response_time_ms: Date.now() - startTime,
            error_message: validationResult.valid ? `Token expires in ${daysUntilExpiry} days` : (validationResult.error || 'Unknown error'),
            expires_at: integration.expires_at,
            auto_refresh_enabled: integration.auto_refresh_enabled || false
          }
        }
      }

      // Perform actual health check
      const validationResult = await this.validateIntegrationCredentials(integration)
      
      return {
        integration_id: integration.id,
        service_name: integration.service_name,
        user_id: integration.user_id,
        status: validationResult.valid ? 'healthy' : 'error',
        last_check_at: new Date().toISOString(),
        response_time_ms: Date.now() - startTime,
        error_message: validationResult.error || 'Unknown error',
        expires_at: integration.expires_at,
        auto_refresh_enabled: integration.auto_refresh_enabled || false
      }
    } catch (error) {
      return {
        integration_id: integration.id,
        service_name: integration.service_name,
        user_id: integration.user_id,
        status: 'error',
        last_check_at: new Date().toISOString(),
        response_time_ms: Date.now() - startTime,
        error_message: (error as Error).message,
        expires_at: integration.expires_at,
        auto_refresh_enabled: integration.auto_refresh_enabled || false
      }
    }
  }

  async validateIntegrationCredentials(integration: any) {
    try {
      // Decrypt credentials (reusing logic from credential engine)
      const credentials = JSON.parse(this.decrypt(integration.encrypted_credentials))

      switch (integration.service_name.toLowerCase()) {
        case 'slack':
          return await this.validateSlackHealth(credentials)
        case 'google':
          return await this.validateGoogleHealth(credentials)
        case 'notion':
          return await this.validateNotionHealth(credentials)
        case 'airtable':
          return await this.validateAirtableHealth(credentials)
        case 'hubspot':
          return await this.validateHubspotHealth(credentials)
        case 'discord':
          return await this.validateDiscordHealth(credentials)
        case 'trello':
          return await this.validateTrelloHealth(credentials)
        default:
          return { valid: true, error: null } // Skip validation for unknown services
      }
    } catch (error) {
      return { valid: false, error: (error as Error).message }
    }
  }

  // Health check implementations for each service
  async validateSlackHealth(credentials: any) {
    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      return { 
        valid: data.ok, 
        error: data.ok ? null : `Slack API Error: ${data.error}` 
      }
    } catch (error) {
      return { valid: false, error: 'Failed to validate Slack credentials' }
    }
  }

  async validateGoogleHealth(credentials: any) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      })

      const data = await response.json()
      return { 
        valid: !data.error, 
        error: data.error ? `Google API Error: ${data.error_description || data.error}` : null 
      }
    } catch (error) {
      return { valid: false, error: 'Failed to validate Google credentials' }
    }
  }

  async validateNotionHealth(credentials: any) {
    try {
      const response = await fetch('https://api.notion.com/v1/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`,
          'Notion-Version': '2022-06-28'
        }
      })

      const data = await response.json()
      return { 
        valid: !data.status, 
        error: data.status ? `Notion API Error: ${data.message}` : null 
      }
    } catch (error) {
      return { valid: false, error: 'Failed to validate Notion credentials' }
    }
  }

  async validateAirtableHealth(credentials: any) {
    try {
      const response = await fetch('https://api.airtable.com/v0/meta/whoami', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      })

      const data = await response.json()
      return { 
        valid: !data.error, 
        error: data.error ? `Airtable API Error: ${data.error.message}` : null 
      }
    } catch (error) {
      return { valid: false, error: 'Failed to validate Airtable credentials' }
    }
  }

  async validateHubspotHealth(credentials: any) {
    try {
      const response = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${credentials.access_token}`, {
        method: 'GET'
      })

      const data = await response.json()
      return { 
        valid: !data.status, 
        error: data.status ? `HubSpot API Error: ${data.message}` : null 
      }
    } catch (error) {
      return { valid: false, error: 'Failed to validate HubSpot credentials' }
    }
  }

  async validateDiscordHealth(credentials: any) {
    try {
      const response = await fetch('https://discord.com/api/users/@me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      })

      const data = await response.json()
      return { 
        valid: !data.code, 
        error: data.code ? `Discord API Error: ${data.message}` : null 
      }
    } catch (error) {
      return { valid: false, error: 'Failed to validate Discord credentials' }
    }
  }

  async validateTrelloHealth(credentials: any) {
    try {
      const response = await fetch(`https://api.trello.com/1/tokens/${credentials.access_token}?key=${credentials.api_key}`, {
        method: 'GET'
      })

      const data = await response.json()
      return { 
        valid: response.ok, 
        error: response.ok ? null : `Trello API Error: ${data.message || 'Invalid token'}` 
      }
    } catch (error) {
      return { valid: false, error: 'Failed to validate Trello credentials' }
    }
  }

  private decrypt(encryptedText: string): string {
    // Reuse decryption logic from credential engine
    const crypto = require('crypto')
    const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || 'your-32-char-secret-key-here-123'
    
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  getDaysUntilExpiry(expiresAt: string | null): number | null {
    if (!expiresAt) return null
    
    const expiry = new Date(expiresAt)
    const now = new Date()
    const diffMs = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    
    return diffDays
  }

  async updateIntegrationStatus(integrationId: string, healthCheck: IntegrationHealthCheck) {
    await supabase
      .from('user_integrations')
      .update({
        status: healthCheck.status === 'expired' ? 'expired' : 'connected',
        last_validated_at: healthCheck.last_check_at,
        validation_error: healthCheck.error_message,
        response_time_ms: healthCheck.response_time_ms
      })
      .eq('id', integrationId)

    // Store detailed health check record
    await supabase
      .from('integration_health_checks')
      .insert({
        integration_id: integrationId,
        service_name: healthCheck.service_name,
        user_id: healthCheck.user_id,
        status: healthCheck.status,
        response_time_ms: healthCheck.response_time_ms,
        error_message: healthCheck.error_message,
        checked_at: healthCheck.last_check_at
      })
  }

  async sendHealthNotification(integration: any, healthCheck: IntegrationHealthCheck) {
    try {
      // Get user email
      const { data: user } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', integration.user_id)
        .single()

      if (!user) return

      // Send email notification
      await fetch('/api/email-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_email',
          email_request: {
            type: 'integration_expired',
            recipient_email: user.email,
            recipient_name: user.display_name,
            data: {
              user_name: user.display_name,
              service_name: integration.service_name,
              status: healthCheck.status,
              error_message: healthCheck.error_message,
              expires_at: healthCheck.expires_at,
              affected_agents: [], // Would need to query for agents using this integration
              integrations_url: `${process.env.NEXT_PUBLIC_APP_URL}/integrations`
            }
          }
        })
      })

      // Log notification sent
      await supabase
        .from('integration_notifications')
        .insert({
          integration_id: integration.id,
          user_id: integration.user_id,
          notification_type: 'health_check',
          status: healthCheck.status,
          message: healthCheck.error_message,
          sent_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Health notification error:', error)
    }
  }

  async cleanupOldHealthChecks() {
    // Keep only last 30 days of health check records
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    await supabase
      .from('integration_health_checks')
      .delete()
      .lt('checked_at', thirtyDaysAgo)
  }

  async getUserIntegrationStatus(userId: string) {
    const { data: integrations } = await supabase
      .from('user_integrations')
      .select(`
        *,
        integration_health_checks!integration_health_checks_integration_id_fkey(
          status,
          response_time_ms,
          error_message,
          checked_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return integrations?.map(integration => ({
      ...integration,
      health_status: integration.integration_health_checks?.[0] || null,
      days_until_expiry: this.getDaysUntilExpiry(integration.expires_at)
    })) || []
  }

  async refreshExpiredToken(integrationId: string) {
    try {
      // This would implement OAuth token refresh logic
      // For now, just mark as needing manual reconnection
      await supabase
        .from('user_integrations')
        .update({
          status: 'refresh_required',
          validation_error: 'Token refresh required - please reconnect',
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId)

      return {
        success: false,
        message: 'Manual reconnection required'
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }
}

const healthMonitor = new IntegrationHealthMonitor()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'run_health_checks':
        const checkResult = await healthMonitor.runHealthChecks()
        return NextResponse.json(checkResult)

      case 'refresh_token':
        const refreshResult = await healthMonitor.refreshExpiredToken(body.integration_id)
        return NextResponse.json(refreshResult)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Health monitor POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    const integrations = await healthMonitor.getUserIntegrationStatus(userId)
    return NextResponse.json({ integrations })
  } catch (error) {
    console.error('Health monitor GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
