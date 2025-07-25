import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { OAUTH_PROVIDERS, ProviderConfig } from '@/lib/oauth-providers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    authUrl.searchParams.set('scope', providerConfig.scopes?.join(' ') || '')
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

  async exchangeCodeForToken(code: string, provider: string, providerConfig: ProviderConfig, redirectUri: string) {
    const tokenUrl = providerConfig.tokenUrl!
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`]!
    const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`]!

    const tokenData = {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams(tokenData)
    })

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`)
    }

    return await response.json()
  }

  async storeOAuthCredentials(userId: string, provider: string, tokenData: any) {
    const credentials = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_in ? 
        new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
      scope: tokenData.scope || '',
      token_type: tokenData.token_type || 'Bearer'
    }

    // Encrypt credentials
    const encryptedCredentials = await this.encryptCredentials(credentials)

    // Store in database
    const { error } = await supabase
      .from('user_credentials')
      .upsert({
        user_id: userId,
        provider: provider,
        credential_type: 'oauth',
        encrypted_value: encryptedCredentials,
        expires_at: credentials.expires_at,
        updated_at: new Date().toISOString()
      })

    if (error) {
      throw new Error(`Failed to store credentials: ${error.message}`)
    }
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
      return OAUTH_PROVIDERS
    }
    
    return Object.fromEntries(
      Object.entries(OAUTH_PROVIDERS).filter(([_, config]) => 
        'category' in config && (config as any).category === category
      )
    )
  }

  getProviderConfig(provider: string) {
    return OAUTH_PROVIDERS[provider as keyof typeof OAUTH_PROVIDERS] || null
  }

  async refreshOAuthToken(userId: string, provider: string) {
    // Get existing credentials
    const { data: credentialRecord, error } = await supabase
      .from('user_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('credential_type', 'oauth')
      .single()

    if (error || !credentialRecord) {
      throw new Error('No OAuth credentials found for refresh')
    }

    // Decrypt existing credentials to get refresh token
    const credentials = await this.decryptCredentials(credentialRecord.encrypted_value)
    
    if (!credentials.refresh_token) {
      throw new Error('No refresh token available')
    }

    const providerConfig = this.getProviderConfig(provider)
    if (!providerConfig || !providerConfig.tokenUrl) {
      throw new Error('Provider does not support token refresh')
    }

    const refreshData = {
      grant_type: 'refresh_token',
      refresh_token: credentials.refresh_token,
      client_id: process.env[`${provider.toUpperCase()}_CLIENT_ID`]!,
      client_secret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`]!
    }

    const response = await fetch(providerConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams(refreshData)
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`)
    }

    const newTokenData = await response.json()
    
    // Update stored credentials
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
    const { action, provider, userId, redirectUri, code, state } = await request.json()

    switch (action) {
      case 'initiate':
        if (!provider || !userId || !redirectUri) {
          return NextResponse.json(
            { error: 'Missing required parameters: provider, userId, redirectUri' },
            { status: 400 }
          )
        }

        const authResult = await oauthManager.initiateOAuth(provider, userId, redirectUri)
        return NextResponse.json(authResult)

      case 'callback':
        if (!code || !state || !provider) {
          return NextResponse.json(
            { error: 'Missing required parameters: code, state, provider' },
            { status: 400 }
          )
        }

        const callbackResult = await oauthManager.handleOAuthCallback(code, state, provider)
        return NextResponse.json(callbackResult)

      case 'refresh':
        if (!provider || !userId) {
          return NextResponse.json(
            { error: 'Missing required parameters: provider, userId' },
            { status: 400 }
          )
        }

        const refreshResult = await oauthManager.refreshOAuthToken(userId, provider)
        return NextResponse.json(refreshResult)

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: initiate, callback, refresh' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('OAuth operation failed:', error)
    return NextResponse.json(
      { 
        error: 'OAuth operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const provider = searchParams.get('provider')

    if (provider) {
      // Get specific provider config
      const config = oauthManager.getProviderConfig(provider)
      if (!config) {
        return NextResponse.json(
          { error: 'Provider not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ provider: provider, config })
    }

    if (type === 'providers') {
      // Get providers by category
      const providers = oauthManager.getProvidersByCategory(category || undefined)
      return NextResponse.json({ providers })
    }

    // Default: return all providers
    return NextResponse.json({ 
      providers: OAUTH_PROVIDERS,
      categories: ['communication', 'productivity', 'social', 'ecommerce', 'development', 'marketing', 'ai', 'custom']
    })

  } catch (error) {
    console.error('OAuth provider query failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get OAuth providers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
