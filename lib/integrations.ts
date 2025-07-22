// Integration configuration system for AgentFlow.AI
// Standardized JSON configs for all integrations

export interface IntegrationConfig {
  service: string
  type: 'oauth' | 'api_key' | 'webhook' | 'none'
  label: string
  field: string
  instructions: string
  validation?: {
    required: boolean
    pattern?: string
    minLength?: number
    maxLength?: number
  }
  oauth?: {
    authUrl: string
    tokenUrl: string
    scopes: string[]
    clientId?: string
  }
  apiKey?: {
    headerName: string
    prefix?: string
    testEndpoint?: string
  }
  refreshable?: boolean
  shared?: boolean // Can be shared across multiple agents
  priority?: number // Display priority in UI
}

// Standard integration configurations
export const INTEGRATION_CONFIGS: Record<string, IntegrationConfig> = {
  // AI Services
  openai: {
    service: 'OpenAI',
    type: 'api_key',
    label: 'OpenAI API Key',
    field: 'openai_api_key',
    instructions: 'Get your API key from https://platform.openai.com/api-keys',
    validation: {
      required: true,
      pattern: '^sk-[A-Za-z0-9]{48}$',
      minLength: 51,
      maxLength: 51
    },
    apiKey: {
      headerName: 'Authorization',
      prefix: 'Bearer ',
      testEndpoint: 'https://api.openai.com/v1/models'
    },
    shared: true,
    priority: 1
  },

  anthropic: {
    service: 'Anthropic Claude',
    type: 'api_key',
    label: 'Anthropic API Key',
    field: 'anthropic_api_key',
    instructions: 'Get your API key from https://console.anthropic.com/',
    validation: {
      required: true,
      pattern: '^sk-ant-[A-Za-z0-9\\-_]{95}$'
    },
    apiKey: {
      headerName: 'x-api-key',
      testEndpoint: 'https://api.anthropic.com/v1/models'
    },
    shared: true,
    priority: 2
  },

  // Communication
  gmail: {
    service: 'Gmail',
    type: 'oauth',
    label: 'Gmail Account',
    field: 'gmail_token',
    instructions: 'Connect your Gmail account to send and receive emails',
    oauth: {
      authUrl: 'https://accounts.google.com/o/oauth2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly']
    },
    refreshable: true,
    shared: true,
    priority: 3
  },

  slack: {
    service: 'Slack',
    type: 'oauth',
    label: 'Slack Workspace',
    field: 'slack_token',
    instructions: 'Connect your Slack workspace to send messages and notifications',
    oauth: {
      authUrl: 'https://slack.com/oauth/authorize',
      tokenUrl: 'https://slack.com/api/oauth.access',
      scopes: ['chat:write', 'channels:read', 'users:read']
    },
    refreshable: true,
    shared: false,
    priority: 4
  },

  twilio: {
    service: 'Twilio',
    type: 'api_key',
    label: 'Twilio Auth Token',
    field: 'twilio_auth_token',
    instructions: 'Get your Auth Token from https://console.twilio.com/',
    validation: {
      required: true,
      minLength: 32,
      maxLength: 32
    },
    apiKey: {
      headerName: 'Authorization',
      testEndpoint: 'https://api.twilio.com/2010-04-01/Accounts.json'
    },
    shared: true,
    priority: 5
  },

  // CRM
  hubspot: {
    service: 'HubSpot',
    type: 'oauth',
    label: 'HubSpot Account',
    field: 'hubspot_token',
    instructions: 'Connect your HubSpot account to manage contacts and deals',
    oauth: {
      authUrl: 'https://app.hubspot.com/oauth/authorize',
      tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
      scopes: ['contacts', 'content']
    },
    refreshable: true,
    shared: false,
    priority: 6
  },

  salesforce: {
    service: 'Salesforce',
    type: 'oauth',
    label: 'Salesforce Org',
    field: 'salesforce_token',
    instructions: 'Connect your Salesforce organization',
    oauth: {
      authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
      scopes: ['api', 'refresh_token', 'offline_access']
    },
    refreshable: true,
    shared: false,
    priority: 7
  },

  // E-commerce
  shopify: {
    service: 'Shopify',
    type: 'api_key',
    label: 'Shopify Admin API Key',
    field: 'shopify_api_key',
    instructions: 'Create a private app in your Shopify admin to get the API key',
    validation: {
      required: true,
      minLength: 32
    },
    apiKey: {
      headerName: 'X-Shopify-Access-Token',
      testEndpoint: 'https://{shop}.myshopify.com/admin/api/2023-10/shop.json'
    },
    shared: false,
    priority: 8
  },

  stripe: {
    service: 'Stripe',
    type: 'api_key',
    label: 'Stripe Secret Key',
    field: 'stripe_secret_key',
    instructions: 'Get your secret key from https://dashboard.stripe.com/apikeys',
    validation: {
      required: true,
      pattern: '^sk_(test_|live_)[A-Za-z0-9]{99}$'
    },
    apiKey: {
      headerName: 'Authorization',
      prefix: 'Bearer ',
      testEndpoint: 'https://api.stripe.com/v1/account'
    },
    shared: true,
    priority: 9
  },

  // Social Media
  twitter: {
    service: 'Twitter',
    type: 'oauth',
    label: 'Twitter Account',
    field: 'twitter_token',
    instructions: 'Connect your Twitter account to post tweets and read timeline',
    oauth: {
      authUrl: 'https://api.twitter.com/oauth/authorize',
      tokenUrl: 'https://api.twitter.com/oauth/access_token',
      scopes: ['read', 'write']
    },
    refreshable: false,
    shared: false,
    priority: 10
  },

  linkedin: {
    service: 'LinkedIn',
    type: 'oauth',
    label: 'LinkedIn Profile',
    field: 'linkedin_token',
    instructions: 'Connect your LinkedIn profile to post updates and manage connections',
    oauth: {
      authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
      scopes: ['r_liteprofile', 'w_member_social']
    },
    refreshable: true,
    shared: false,
    priority: 11
  },

  // Productivity
  notion: {
    service: 'Notion',
    type: 'oauth',
    label: 'Notion Workspace',
    field: 'notion_token',
    instructions: 'Connect your Notion workspace to create and update pages',
    oauth: {
      authUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token',
      scopes: []
    },
    refreshable: false,
    shared: false,
    priority: 12
  },

  airtable: {
    service: 'Airtable',
    type: 'api_key',
    label: 'Airtable Personal Access Token',
    field: 'airtable_api_key',
    instructions: 'Create a personal access token in your Airtable account settings',
    validation: {
      required: true,
      pattern: '^pat[A-Za-z0-9]{14}\\.[A-Za-z0-9]{64}$'
    },
    apiKey: {
      headerName: 'Authorization',
      prefix: 'Bearer ',
      testEndpoint: 'https://api.airtable.com/v0/meta/bases'
    },
    shared: true,
    priority: 13
  },

  // Cloud Storage
  googledrive: {
    service: 'Google Drive',
    type: 'oauth',
    label: 'Google Drive',
    field: 'googledrive_token',
    instructions: 'Connect your Google Drive to upload, download, and manage files',
    oauth: {
      authUrl: 'https://accounts.google.com/o/oauth2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/drive.file']
    },
    refreshable: true,
    shared: true,
    priority: 14
  },

  dropbox: {
    service: 'Dropbox',
    type: 'oauth',
    label: 'Dropbox Account',
    field: 'dropbox_token',
    instructions: 'Connect your Dropbox account to manage files and folders',
    oauth: {
      authUrl: 'https://www.dropbox.com/oauth2/authorize',
      tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
      scopes: ['files.content.write', 'files.content.read']
    },
    refreshable: true,
    shared: true,
    priority: 15
  }
}

// Integration management functions
export class IntegrationManager {
  constructor(private supabase: any) {}

  /**
   * Get integration config by service name
   */
  getConfig(service: string): IntegrationConfig | null {
    return INTEGRATION_CONFIGS[service.toLowerCase()] || null
  }

  /**
   * Get all integration configs
   */
  getAllConfigs(): IntegrationConfig[] {
    return Object.values(INTEGRATION_CONFIGS).sort((a, b) => (a.priority || 999) - (b.priority || 999))
  }

  /**
   * Validate credential value
   */
  validateCredential(service: string, value: string): { valid: boolean; error?: string } {
    const config = this.getConfig(service)
    if (!config) {
      return { valid: false, error: 'Integration not supported' }
    }

    const { validation } = config
    if (!validation) {
      return { valid: true }
    }

    if (validation.required && !value) {
      return { valid: false, error: 'This field is required' }
    }

    if (validation.minLength && value.length < validation.minLength) {
      return { valid: false, error: `Minimum length is ${validation.minLength} characters` }
    }

    if (validation.maxLength && value.length > validation.maxLength) {
      return { valid: false, error: `Maximum length is ${validation.maxLength} characters` }
    }

    if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
      return { valid: false, error: 'Invalid format' }
    }

    return { valid: true }
  }

  /**
   * Test API key connection
   */
  async testApiKey(service: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
    const config = this.getConfig(service)
    if (!config || config.type !== 'api_key' || !config.apiKey?.testEndpoint) {
      return { success: false, error: 'Testing not supported for this integration' }
    }

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'AgentFlow.AI/1.0.0'
      }

      // Add API key to headers
      const { headerName, prefix = '' } = config.apiKey
      headers[headerName] = prefix + apiKey

      const response = await fetch(config.apiKey.testEndpoint, {
        method: 'GET',
        headers
      })

      if (response.ok) {
        return { success: true }
      } else if (response.status === 401) {
        return { success: false, error: 'Invalid API key' }
      } else if (response.status === 403) {
        return { success: false, error: 'Access denied - check permissions' }
      } else {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
      }

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      }
    }
  }

  /**
   * Generate OAuth URL
   */
  generateOAuthUrl(service: string, state: string, redirectUri: string): string | null {
    const config = this.getConfig(service)
    if (!config || config.type !== 'oauth' || !config.oauth) {
      return null
    }

    const { authUrl, scopes, clientId } = config.oauth
    const params = new URLSearchParams({
      client_id: clientId || process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || '',
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      state,
      response_type: 'code'
    })

    return `${authUrl}?${params.toString()}`
  }

  /**
   * Exchange OAuth code for token
   */
  async exchangeOAuthCode(
    service: string,
    code: string,
    redirectUri: string
  ): Promise<{ success: boolean; token?: any; error?: string }> {
    const config = this.getConfig(service)
    if (!config || config.type !== 'oauth' || !config.oauth) {
      return { success: false, error: 'OAuth not supported for this integration' }
    }

    try {
      const { tokenUrl, clientId } = config.oauth
      const clientSecret = process.env[`${service.toUpperCase()}_CLIENT_SECRET`]

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AgentFlow.AI/1.0.0'
        },
        body: new URLSearchParams({
          client_id: clientId || process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || '',
          client_secret: clientSecret || '',
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        })
      })

      if (!response.ok) {
        return { success: false, error: `OAuth exchange failed: ${response.statusText}` }
      }

      const token = await response.json()
      return { success: true, token }

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'OAuth exchange failed' 
      }
    }
  }

  /**
   * Refresh OAuth token
   */
  async refreshOAuthToken(
    service: string,
    refreshToken: string
  ): Promise<{ success: boolean; token?: any; error?: string }> {
    const config = this.getConfig(service)
    if (!config || config.type !== 'oauth' || !config.refreshable) {
      return { success: false, error: 'Token refresh not supported' }
    }

    try {
      const { tokenUrl, clientId } = config.oauth!
      const clientSecret = process.env[`${service.toUpperCase()}_CLIENT_SECRET`]

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AgentFlow.AI/1.0.0'
        },
        body: new URLSearchParams({
          client_id: clientId || process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || '',
          client_secret: clientSecret || '',
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      })

      if (!response.ok) {
        return { success: false, error: `Token refresh failed: ${response.statusText}` }
      }

      const token = await response.json()
      return { success: true, token }

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Token refresh failed' 
      }
    }
  }

  /**
   * Store credentials securely
   */
  async storeCredentials(
    userId: string,
    integrationId: string,
    credentials: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Encrypt credentials (in production, use proper encryption)
      const encryptedData = Buffer.from(JSON.stringify(credentials)).toString('base64')

      const { error } = await this.supabase
        .from('user_credentials')
        .upsert({
          user_id: userId,
          integration_id: integrationId,
          key_name: 'main',
          value: encryptedData
        }, {
          onConflict: 'user_id,integration_id,key_name'
        })

      if (error) throw error

      return { success: true }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to store credentials'
      }
    }
  }

  /**
   * Retrieve credentials
   */
  async getCredentials(
    userId: string,
    integrationId: string
  ): Promise<{ success: boolean; credentials?: Record<string, any>; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('user_credentials')
        .select('value')
        .eq('user_id', userId)
        .eq('integration_id', integrationId)
        .eq('key_name', 'main')
        .single()

      if (error) throw error

      // Decrypt credentials (in production, use proper decryption)
      const credentials = JSON.parse(Buffer.from(data.value, 'base64').toString())

      return { success: true, credentials }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve credentials'
      }
    }
  }
}
