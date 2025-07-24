import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || 'your-32-char-secret-key-here-123'

interface CredentialRequest {
  user_id: string
  service_name: string
  credentials: any
  expires_at?: string
}

interface CredentialInjectionRequest {
  agent_id: string
  user_id: string
  workflow_payload: any
  validate_credentials?: boolean
}

class CredentialEngine {
  private encrypt(text: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
  }

  private decrypt(text: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY)
    let decrypted = decipher.update(text, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  async storeCredentials(request: CredentialRequest) {
    try {
      const { user_id, service_name, credentials, expires_at } = request

      // Encrypt credentials
      const encryptedCredentials = this.encrypt(JSON.stringify(credentials))

      // Store in database
      const { data, error } = await supabase
        .from('user_integrations')
        .upsert({
          user_id,
          service_name,
          encrypted_credentials: encryptedCredentials,
          status: 'connected',
          expires_at: expires_at || null,
          last_validated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()

      if (error) throw error

      return {
        success: true,
        message: 'Credentials stored successfully',
        integration_id: data[0]?.id
      }
    } catch (error) {
      console.error('Credential storage error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async getCredentials(userId: string, serviceName: string) {
    try {
      const { data, error } = await supabase
        .from('user_integrations')
        .select('encrypted_credentials, status, expires_at, last_validated_at')
        .eq('user_id', userId)
        .eq('service_name', serviceName)
        .eq('status', 'connected')
        .single()

      if (error || !data) {
        return {
          success: false,
          error: 'Credentials not found or expired'
        }
      }

      // Check if credentials are expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        await this.markCredentialsExpired(userId, serviceName)
        return {
          success: false,
          error: 'Credentials have expired'
        }
      }

      // Decrypt credentials
      const credentials = JSON.parse(this.decrypt(data.encrypted_credentials))

      return {
        success: true,
        credentials,
        last_validated_at: data.last_validated_at
      }
    } catch (error) {
      console.error('Credential retrieval error:', error)
      return {
        success: false,
        error: 'Failed to retrieve credentials'
      }
    }
  }

  async validateCredentials(userId: string, serviceName: string) {
    try {
      const credResult = await this.getCredentials(userId, serviceName)
      if (!credResult.success) {
        return credResult
      }

      // Perform service-specific validation
      const validationResult = await this.performServiceValidation(serviceName, credResult.credentials)

      // Update validation status
      await supabase
        .from('user_integrations')
        .update({
          status: validationResult.valid ? 'connected' : 'error',
          last_validated_at: new Date().toISOString(),
          validation_error: validationResult.valid ? null : validationResult.error
        })
        .eq('user_id', userId)
        .eq('service_name', serviceName)

      return {
        success: validationResult.valid,
        valid: validationResult.valid,
        error: validationResult.error,
        service_name: serviceName
      }
    } catch (error) {
      console.error('Credential validation error:', error)
      return {
        success: false,
        error: 'Validation failed'
      }
    }
  }

  async performServiceValidation(serviceName: string, credentials: any) {
    try {
      switch (serviceName.toLowerCase()) {
        case 'slack':
          return await this.validateSlackCredentials(credentials)
        case 'google':
          return await this.validateGoogleCredentials(credentials)
        case 'notion':
          return await this.validateNotionCredentials(credentials)
        case 'airtable':
          return await this.validateAirtableCredentials(credentials)
        case 'hubspot':
          return await this.validateHubspotCredentials(credentials)
        default:
          return { valid: true, error: null } // Skip validation for unknown services
      }
    } catch (error) {
      return { valid: false, error: (error as Error).message }
    }
  }

  async validateSlackCredentials(credentials: any) {
    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      return { valid: data.ok, error: data.ok ? null : data.error }
    } catch (error) {
      return { valid: false, error: 'Failed to validate Slack credentials' }
    }
  }

  async validateGoogleCredentials(credentials: any) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      })

      const data = await response.json()
      return { valid: !data.error, error: data.error || null }
    } catch (error) {
      return { valid: false, error: 'Failed to validate Google credentials' }
    }
  }

  async validateNotionCredentials(credentials: any) {
    try {
      const response = await fetch('https://api.notion.com/v1/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`,
          'Notion-Version': '2022-06-28'
        }
      })

      const data = await response.json()
      return { valid: !data.status, error: data.status ? data.message : null }
    } catch (error) {
      return { valid: false, error: 'Failed to validate Notion credentials' }
    }
  }

  async validateAirtableCredentials(credentials: any) {
    try {
      const response = await fetch('https://api.airtable.com/v0/meta/whoami', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      })

      const data = await response.json()
      return { valid: !data.error, error: data.error?.message || null }
    } catch (error) {
      return { valid: false, error: 'Failed to validate Airtable credentials' }
    }
  }

  async validateHubspotCredentials(credentials: any) {
    try {
      const response = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${credentials.access_token}`, {
        method: 'GET'
      })

      const data = await response.json()
      return { valid: !data.status, error: data.status ? data.message : null }
    } catch (error) {
      return { valid: false, error: 'Failed to validate HubSpot credentials' }
    }
  }

  async injectCredentials(request: CredentialInjectionRequest) {
    try {
      const { agent_id, user_id, workflow_payload, validate_credentials } = request

      // Get agent's required integrations
      const { data: agent } = await supabase
        .from('agents')
        .select('required_integrations, metadata')
        .eq('id', agent_id)
        .single()

      if (!agent) {
        return {
          success: false,
          error: 'Agent not found'
        }
      }

      const requiredIntegrations = agent.required_integrations || []
      const injectedCredentials: any = {}
      const validationErrors: string[] = []

      // Get and inject credentials for each required integration
      for (const serviceName of requiredIntegrations) {
        if (validate_credentials) {
          const validation = await this.validateCredentials(user_id, serviceName)
          if (!validation.success) {
            validationErrors.push(`${serviceName}: ${validation.error}`)
            continue
          }
        }

        const credResult = await this.getCredentials(user_id, serviceName)
        if (credResult.success) {
          injectedCredentials[serviceName] = credResult.credentials
        } else {
          validationErrors.push(`${serviceName}: ${credResult.error}`)
        }
      }

      if (validationErrors.length > 0 && validate_credentials) {
        return {
          success: false,
          error: 'Credential validation failed',
          validation_errors: validationErrors
        }
      }

      // Inject credentials into workflow payload
      const enrichedPayload = {
        ...workflow_payload,
        credentials: injectedCredentials,
        agent_metadata: agent.metadata,
        user_id: user_id,
        agent_id: agent_id,
        timestamp: new Date().toISOString()
      }

      return {
        success: true,
        payload: enrichedPayload,
        injected_services: Object.keys(injectedCredentials),
        validation_errors: validationErrors
      }
    } catch (error) {
      console.error('Credential injection error:', error)
      return {
        success: false,
        error: 'Failed to inject credentials'
      }
    }
  }

  async markCredentialsExpired(userId: string, serviceName: string) {
    await supabase
      .from('user_integrations')
      .update({ 
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('service_name', serviceName)
  }

  async getUserIntegrations(userId: string) {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('service_name, status, expires_at, last_validated_at, validation_error')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  }
}

const credentialEngine = new CredentialEngine()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'store':
        const storeResult = await credentialEngine.storeCredentials(body)
        return NextResponse.json(storeResult)

      case 'validate':
        const validateResult = await credentialEngine.validateCredentials(body.user_id, body.service_name)
        return NextResponse.json(validateResult)

      case 'inject':
        const injectResult = await credentialEngine.injectCredentials(body)
        return NextResponse.json(injectResult)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Credential engine POST error:', error)
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

    const integrations = await credentialEngine.getUserIntegrations(userId)
    return NextResponse.json({ integrations })
  } catch (error) {
    console.error('Credential engine GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
