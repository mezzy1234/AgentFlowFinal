import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Comprehensive OAuth provider configurations
export const OAUTH_PROVIDERS = {
  // Communication & Messaging
  slack: {
    name: 'Slack',
    type: 'oauth2',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'channels:read', 'users:read'],
    icon: 'slack',
    category: 'communication'
  },
  discord: {
    name: 'Discord',
    type: 'oauth2',
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    scopes: ['bot', 'messages.read'],
    icon: 'discord',
    category: 'communication'
  },
  telegram: {
    name: 'Telegram',
    type: 'bot_token',
    authUrl: null,
    tokenUrl: null,
    scopes: [],
    icon: 'telegram',
    category: 'communication'
  },
  whatsapp: {
    name: 'WhatsApp Business',
    type: 'oauth2',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: ['whatsapp_business_messaging'],
    icon: 'whatsapp',
    category: 'communication'
  },

  // Email & Calendar
  gmail: {
    name: 'Gmail',
    type: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'],
    icon: 'gmail',
    category: 'email'
  },
  outlook: {
    name: 'Microsoft Outlook',
    type: 'oauth2',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['https://graph.microsoft.com/Mail.Send', 'https://graph.microsoft.com/Mail.Read'],
    icon: 'outlook',
    category: 'email'
  },
  google_calendar: {
    name: 'Google Calendar',
    type: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/calendar'],
    icon: 'google-calendar',
    category: 'calendar'
  },
  calendly: {
    name: 'Calendly',
    type: 'oauth2',
    authUrl: 'https://auth.calendly.com/oauth/authorize',
    tokenUrl: 'https://auth.calendly.com/oauth/token',
    scopes: ['read', 'write'],
    icon: 'calendly',
    category: 'calendar'
  },

  // CRM & Sales
  salesforce: {
    name: 'Salesforce',
    type: 'oauth2',
    authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    scopes: ['api', 'refresh_token'],
    icon: 'salesforce',
    category: 'crm'
  },
  hubspot: {
    name: 'HubSpot',
    type: 'oauth2',
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    scopes: ['contacts', 'content'],
    icon: 'hubspot',
    category: 'crm'
  },
  pipedrive: {
    name: 'Pipedrive',
    type: 'oauth2',
    authUrl: 'https://oauth.pipedrive.com/oauth/authorize',
    tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
    scopes: ['base'],
    icon: 'pipedrive',
    category: 'crm'
  },
  zoho_crm: {
    name: 'Zoho CRM',
    type: 'oauth2',
    authUrl: 'https://accounts.zoho.com/oauth/v2/auth',
    tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
    scopes: ['ZohoCRM.modules.ALL'],
    icon: 'zoho',
    category: 'crm'
  },
  intercom: {
    name: 'Intercom',
    type: 'oauth2',
    authUrl: 'https://app.intercom.com/oauth',
    tokenUrl: 'https://api.intercom.io/auth/eagle/token',
    scopes: ['read_conversations', 'write_conversations'],
    icon: 'intercom',
    category: 'crm'
  },

  // Productivity & Notes
  notion: {
    name: 'Notion',
    type: 'oauth2',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: ['read', 'write'],
    icon: 'notion',
    category: 'productivity'
  },
  trello: {
    name: 'Trello',
    type: 'oauth1',
    authUrl: 'https://trello.com/1/authorize',
    tokenUrl: 'https://trello.com/1/OAuthGetAccessToken',
    scopes: ['read', 'write'],
    icon: 'trello',
    category: 'productivity'
  },
  asana: {
    name: 'Asana',
    type: 'oauth2',
    authUrl: 'https://app.asana.com/-/oauth_authorize',
    tokenUrl: 'https://app.asana.com/-/oauth_token',
    scopes: ['default'],
    icon: 'asana',
    category: 'productivity'
  },
  monday: {
    name: 'Monday.com',
    type: 'oauth2',
    authUrl: 'https://auth.monday.com/oauth2/authorize',
    tokenUrl: 'https://auth.monday.com/oauth2/token',
    scopes: ['boards:read', 'boards:write'],
    icon: 'monday',
    category: 'productivity'
  },

  // Storage & Files
  google_drive: {
    name: 'Google Drive',
    type: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/drive'],
    icon: 'google-drive',
    category: 'storage'
  },
  dropbox: {
    name: 'Dropbox',
    type: 'oauth2',
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    scopes: ['files.content.write', 'files.content.read'],
    icon: 'dropbox',
    category: 'storage'
  },
  onedrive: {
    name: 'Microsoft OneDrive',
    type: 'oauth2',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['https://graph.microsoft.com/Files.ReadWrite'],
    icon: 'onedrive',
    category: 'storage'
  },

  // Databases & Spreadsheets
  airtable: {
    name: 'Airtable',
    type: 'oauth2',
    authUrl: 'https://airtable.com/oauth2/v1/authorize',
    tokenUrl: 'https://airtable.com/oauth2/v1/token',
    scopes: ['data.records:read', 'data.records:write'],
    icon: 'airtable',
    category: 'database'
  },
  google_sheets: {
    name: 'Google Sheets',
    type: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    icon: 'google-sheets',
    category: 'database'
  },

  // Accounting & Finance
  quickbooks: {
    name: 'QuickBooks',
    type: 'oauth2',
    authUrl: 'https://appcenter.intuit.com/connect/oauth2',
    tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    scopes: ['com.intuit.quickbooks.accounting'],
    icon: 'quickbooks',
    category: 'accounting'
  },
  stripe: {
    name: 'Stripe',
    type: 'oauth2',
    authUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    scopes: ['read_write'],
    icon: 'stripe',
    category: 'payment'
  },
  square: {
    name: 'Square',
    type: 'oauth2',
    authUrl: 'https://connect.squareup.com/oauth2/authorize',
    tokenUrl: 'https://connect.squareup.com/oauth2/token',
    scopes: ['MERCHANT_PROFILE_READ', 'PAYMENTS_WRITE'],
    icon: 'square',
    category: 'payment'
  },
  paypal: {
    name: 'PayPal',
    type: 'oauth2',
    authUrl: 'https://www.paypal.com/signin/authorize',
    tokenUrl: 'https://api.paypal.com/v1/oauth2/token',
    scopes: ['openid', 'profile'],
    icon: 'paypal',
    category: 'payment'
  },

  // Social Media
  twitter: {
    name: 'Twitter/X',
    type: 'oauth2',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'tweet.write', 'users.read'],
    icon: 'twitter',
    category: 'social'
  },
  linkedin: {
    name: 'LinkedIn',
    type: 'oauth2',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['r_liteprofile', 'w_member_social'],
    icon: 'linkedin',
    category: 'social'
  },
  facebook: {
    name: 'Facebook',
    type: 'oauth2',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: ['pages_manage_posts', 'pages_read_engagement'],
    icon: 'facebook',
    category: 'social'
  },
  instagram: {
    name: 'Instagram',
    type: 'oauth2',
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scopes: ['user_profile', 'user_media'],
    icon: 'instagram',
    category: 'social'
  },
  tiktok: {
    name: 'TikTok',
    type: 'oauth2',
    authUrl: 'https://www.tiktok.com/auth/authorize/',
    tokenUrl: 'https://open-api.tiktok.com/oauth/access_token/',
    scopes: ['user.info.basic', 'video.list'],
    icon: 'tiktok',
    category: 'social'
  },
  youtube: {
    name: 'YouTube',
    type: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/youtube.upload'],
    icon: 'youtube',
    category: 'social'
  },

  // E-commerce
  shopify: {
    name: 'Shopify',
    type: 'oauth2',
    authUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize',
    tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token',
    scopes: ['read_products', 'write_products'],
    icon: 'shopify',
    category: 'ecommerce'
  },
  woocommerce: {
    name: 'WooCommerce',
    type: 'api_key',
    authUrl: null,
    tokenUrl: null,
    scopes: [],
    icon: 'woocommerce',
    category: 'ecommerce'
  },

  // Development & Code
  github: {
    name: 'GitHub',
    type: 'oauth2',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'user'],
    icon: 'github',
    category: 'development'
  },
  gitlab: {
    name: 'GitLab',
    type: 'oauth2',
    authUrl: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token',
    scopes: ['api', 'read_user'],
    icon: 'gitlab',
    category: 'development'
  },

  // Marketing & Analytics
  mailchimp: {
    name: 'Mailchimp',
    type: 'oauth2',
    authUrl: 'https://login.mailchimp.com/oauth2/authorize',
    tokenUrl: 'https://login.mailchimp.com/oauth2/token',
    scopes: ['read', 'write'],
    icon: 'mailchimp',
    category: 'marketing'
  },
  google_analytics: {
    name: 'Google Analytics',
    type: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    icon: 'google-analytics',
    category: 'analytics'
  },

  // Custom & API Keys
  custom_api: {
    name: 'Custom API',
    type: 'api_key',
    authUrl: null,
    tokenUrl: null,
    scopes: [],
    icon: 'api',
    category: 'custom'
  },
  webhook: {
    name: 'Webhook',
    type: 'webhook',
    authUrl: null,
    tokenUrl: null,
    scopes: [],
    icon: 'webhook',
    category: 'custom'
  }
}

class MultiOAuthManager {
  async initiateOAuth(provider: string, userId: string, redirectUri: string) {
    const providerConfig = OAUTH_PROVIDERS[provider as keyof typeof OAUTH_PROVIDERS]
    
    if (!providerConfig) {
      throw new Error(`Unsupported OAuth provider: ${provider}`)
    }

    if (providerConfig.type !== 'oauth2' && providerConfig.type !== 'oauth1') {
      throw new Error(`Provider ${provider} does not support OAuth flow`)
    }

    const state = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Store state for validation
    await supabase
      .from('oauth_states')
      .insert({
        state: state,
        user_id: userId,
        provider: provider,
        redirect_uri: redirectUri,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      })

    const authUrl = new URL(providerConfig.authUrl!)
    authUrl.searchParams.set('client_id', process.env[`${provider.toUpperCase()}_CLIENT_ID`] || '')
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('scope', providerConfig.scopes.join(' '))
    authUrl.searchParams.set('response_type', 'code')

    return {
      auth_url: authUrl.toString(),
      state: state,
      provider: provider
    }
  }

  async handleOAuthCallback(code: string, state: string, provider: string) {
    // Validate state
    const { data: stateRecord, error } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('provider', provider)
      .single()

    if (error || !stateRecord) {
      throw new Error('Invalid or expired OAuth state')
    }

    // Check expiration
    if (new Date() > new Date(stateRecord.expires_at)) {
      throw new Error('OAuth state has expired')
    }

    const providerConfig = OAUTH_PROVIDERS[provider as keyof typeof OAUTH_PROVIDERS]
    
    // Exchange code for token
    const tokenResponse = await this.exchangeCodeForToken(code, provider, providerConfig, stateRecord.redirect_uri)
    
    // Store credentials
    await this.storeOAuthCredentials(stateRecord.user_id, provider, tokenResponse)
    
    // Clean up state
    await supabase
      .from('oauth_states')
      .delete()
      .eq('state', state)

    return {
      success: true,
      provider: provider,
      user_id: stateRecord.user_id
    }
  }

  async exchangeCodeForToken(code: string, provider: string, config: any, redirectUri: string) {
    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`] || '',
      client_secret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`] || ''
    })

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenData
    })

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`)
    }

    return await response.json()
  }

  async storeOAuthCredentials(userId: string, provider: string, tokenData: any) {
    const credentials = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
      obtained_at: new Date().toISOString()
    }

    // Encrypt credentials
    const encryptedCredentials = await this.encryptCredentials(credentials)

    // Store in database
    await supabase
      .from('user_integrations')
      .upsert({
        user_id: userId,
        service_name: provider,
        status: 'connected',
        encrypted_credentials: encryptedCredentials,
        expires_at: tokenData.expires_in ? 
          new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      })
  }

  async encryptCredentials(credentials: any): Promise<string> {
    // Use the same encryption as credential engine
    const crypto = require('crypto')
    const algorithm = 'aes-256-cbc'
    const key = process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-key-change-in-production'
    
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher(algorithm, key)
    
    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return encrypted
  }

  async validateProvider(provider: string): Promise<boolean> {
    return provider in OAUTH_PROVIDERS
  }

  getProvidersByCategory(category?: string) {
    if (!category) {
      return Object.entries(OAUTH_PROVIDERS).map(([key, config]) => ({
        id: key,
        ...config
      }))
    }

    return Object.entries(OAUTH_PROVIDERS)
      .filter(([_, config]) => config.category === category)
      .map(([key, config]) => ({
        id: key,
        ...config
      }))
  }

  getProviderConfig(provider: string) {
    return OAUTH_PROVIDERS[provider as keyof typeof OAUTH_PROVIDERS]
  }

  async refreshToken(userId: string, provider: string) {
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('encrypted_credentials')
      .eq('user_id', userId)
      .eq('service_name', provider)
      .single()

    if (!integration) {
      throw new Error('Integration not found')
    }

    // Decrypt existing credentials to get refresh token
    const credentials = await this.decryptCredentials(integration.encrypted_credentials)
    
    if (!credentials.refresh_token) {
      throw new Error('No refresh token available')
    }

    const providerConfig = this.getProviderConfig(provider)
    
    // Refresh the token
    const tokenData = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: credentials.refresh_token,
      client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`] || '',
      client_secret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`] || ''
    })

    const response = await fetch(providerConfig.tokenUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenData
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`)
    }

    const newTokenData = await response.json()
    
    // Store refreshed credentials
    await this.storeOAuthCredentials(userId, provider, {
      ...newTokenData,
      refresh_token: newTokenData.refresh_token || credentials.refresh_token
    })

    return newTokenData
  }

  async decryptCredentials(encryptedData: string): Promise<any> {
    const crypto = require('crypto')
    const algorithm = 'aes-256-cbc'
    const key = process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-key-change-in-production'
    
    const decipher = crypto.createDecipher(algorithm, key)
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return JSON.parse(decrypted)
  }
}

const oauthManager = new MultiOAuthManager()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'initiate_oauth':
        const { provider, user_id, redirect_uri } = body
        const authData = await oauthManager.initiateOAuth(provider, user_id, redirect_uri)
        return NextResponse.json({ success: true, ...authData })

      case 'handle_callback':
        const { code, state, provider: callbackProvider } = body
        const result = await oauthManager.handleOAuthCallback(code, state, callbackProvider)
        return NextResponse.json(result)

      case 'refresh_token':
        const { user_id: refreshUserId, provider: refreshProvider } = body
        const refreshedToken = await oauthManager.refreshToken(refreshUserId, refreshProvider)
        return NextResponse.json({ success: true, token_data: refreshedToken })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Multi-OAuth error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const provider = searchParams.get('provider')

    switch (type) {
      case 'providers':
        const providers = oauthManager.getProvidersByCategory(category || undefined)
        return NextResponse.json({ success: true, providers })

      case 'provider_config':
        if (!provider) {
          return NextResponse.json({ error: 'Missing provider parameter' }, { status: 400 })
        }
        const config = oauthManager.getProviderConfig(provider)
        return NextResponse.json({ success: true, config })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Multi-OAuth GET error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}
