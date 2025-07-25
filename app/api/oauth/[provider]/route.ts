import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface OAuthProvider {
  id: string
  name: string
  display_name: string
  client_id: string
  client_secret: string
  authorization_url: string
  token_url: string
  scope: string
  redirect_uri: string
  metadata: any
}

interface OAuthSession {
  id: string
  user_id: string
  provider_id: string
  state: string
  code_verifier: string | null
  redirect_after_auth: string | null
}

class OAuthManager {
  private async getProvider(providerId: string): Promise<OAuthProvider | null> {
    const { data, error } = await supabase
      .from('oauth_providers')
      .select('*')
      .eq('id', providerId)
      .eq('is_active', true)
      .single()
    
    if (error || !data) return null
    return data
  }

  private async getProviderByName(name: string): Promise<OAuthProvider | null> {
    const { data, error } = await supabase
      .from('oauth_providers')
      .select('*')
      .eq('name', name)
      .eq('is_active', true)
      .single()
    
    if (error || !data) return null
    return data
  }

  private generateState(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url')
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url')
  }

  async initiateOAuth(userId: string, providerName: string, redirectAfter?: string): Promise<{
    authorization_url: string
    error?: string
  }> {
    try {
      const provider = await this.getProviderByName(providerName)
      if (!provider) {
        return { authorization_url: '', error: 'Provider not found' }
      }

      const state = this.generateState()
      const codeVerifier = this.generateCodeVerifier()
      const codeChallenge = this.generateCodeChallenge(codeVerifier)

      // Create OAuth session
      const { error: sessionError } = await supabase
        .from('oauth_sessions')
        .insert({
          user_id: userId,
          provider_id: provider.id,
          state,
          code_verifier: codeVerifier,
          redirect_after_auth: redirectAfter
        })

      if (sessionError) {
        return { authorization_url: '', error: 'Failed to create OAuth session' }
      }

      // Build authorization URL
      const authUrl = new URL(provider.authorization_url)
      authUrl.searchParams.set('client_id', provider.client_id)
      authUrl.searchParams.set('redirect_uri', provider.redirect_uri)
      authUrl.searchParams.set('scope', provider.scope)
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('response_type', 'code')
      
      // Add PKCE for security
      authUrl.searchParams.set('code_challenge', codeChallenge)
      authUrl.searchParams.set('code_challenge_method', 'S256')

      // Provider-specific parameters
      if (provider.name === 'google') {
        authUrl.searchParams.set('access_type', 'offline')
        authUrl.searchParams.set('prompt', 'consent')
      } else if (provider.name === 'slack') {
        authUrl.searchParams.set('user_scope', 'identity.basic,identity.email')
      }

      return { authorization_url: authUrl.toString() }
    } catch (error) {
      console.error('OAuth initiation error:', error)
      return { authorization_url: '', error: 'Internal server error' }
    }
  }

  async handleCallback(code: string, state: string): Promise<{
    success: boolean
    user_id?: string
    redirect_url?: string
    error?: string
  }> {
    try {
      // Get OAuth session
      const { data: session, error: sessionError } = await supabase
        .from('oauth_sessions')
        .select('*')
        .eq('state', state)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (sessionError || !session) {
        return { success: false, error: 'Invalid or expired OAuth session' }
      }

      const provider = await this.getProvider(session.provider_id)
      if (!provider) {
        return { success: false, error: 'Provider not found' }
      }

      // Exchange code for tokens
      const tokenData = await this.exchangeCodeForTokens(provider, code, session.code_verifier)
      if (!tokenData.success) {
        return { success: false, error: tokenData.error }
      }

      // Get user info from provider
      const userInfo = await this.getUserInfo(provider, tokenData.access_token!)
      if (!userInfo.success) {
        return { success: false, error: userInfo.error }
      }

      // Store OAuth connection
      const { error: connectionError } = await supabase
        .from('user_oauth_connections')
        .upsert({
          user_id: session.user_id,
          provider_id: provider.id,
          provider_user_id: userInfo.user_id,
          provider_username: userInfo.username,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenData.expires_at,
          scope: tokenData.scope,
          metadata: userInfo.metadata
        })

      if (connectionError) {
        return { success: false, error: 'Failed to store OAuth connection' }
      }

      // Mark session as completed
      await supabase
        .from('oauth_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', session.id)

      return {
        success: true,
        user_id: session.user_id,
        redirect_url: session.redirect_after_auth || '/dashboard/integrations'
      }
    } catch (error) {
      console.error('OAuth callback error:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  private async exchangeCodeForTokens(provider: OAuthProvider, code: string, codeVerifier: string | null): Promise<{
    success: boolean
    access_token?: string
    refresh_token?: string
    expires_at?: string
    scope?: string
    error?: string
  }> {
    try {
      const tokenRequestBody = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: provider.client_id,
        client_secret: provider.client_secret,
        code,
        redirect_uri: provider.redirect_uri
      })

      if (codeVerifier) {
        tokenRequestBody.set('code_verifier', codeVerifier)
      }

      const response = await fetch(provider.token_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: tokenRequestBody
      })

      if (!response.ok) {
        const errorData = await response.text()
        return { success: false, error: `Token exchange failed: ${errorData}` }
      }

      const tokenData = await response.json()
      
      const expiresAt = tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : undefined

      return {
        success: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        scope: tokenData.scope
      }
    } catch (error) {
      return { success: false, error: 'Token exchange error' }
    }
  }

  private async getUserInfo(provider: OAuthProvider, accessToken: string): Promise<{
    success: boolean
    user_id?: string
    username?: string
    metadata?: any
    error?: string
  }> {
    try {
      let userInfoUrl: string
      
      // Provider-specific user info endpoints
      switch (provider.name) {
        case 'google':
          userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo'
          break
        case 'slack':
          userInfoUrl = 'https://slack.com/api/users.identity'
          break
        case 'github':
          userInfoUrl = 'https://api.github.com/user'
          break
        case 'stripe':
          userInfoUrl = 'https://api.stripe.com/v1/account'
          break
        default:
          return { success: false, error: 'Unknown provider' }
      }

      const response = await fetch(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        return { success: false, error: 'Failed to get user info' }
      }

      const userData = await response.json()
      
      // Extract user info based on provider
      let userId: string, username: string, metadata: any
      
      switch (provider.name) {
        case 'google':
          userId = userData.id
          username = userData.email
          metadata = { name: userData.name, picture: userData.picture }
          break
        case 'slack':
          userId = userData.user.id
          username = userData.user.email
          metadata = { name: userData.user.name, team: userData.team }
          break
        case 'github':
          userId = userData.id.toString()
          username = userData.login
          metadata = { name: userData.name, avatar_url: userData.avatar_url }
          break
        case 'stripe':
          userId = userData.id
          username = userData.email
          metadata = { business_name: userData.business_name, country: userData.country }
          break
        default:
          return { success: false, error: 'Unknown provider format' }
      }

      return {
        success: true,
        user_id: userId,
        username: username,
        metadata: metadata
      }
    } catch (error) {
      return { success: false, error: 'User info error' }
    }
  }

  async refreshToken(connectionId: string, userId: string): Promise<{
    success: boolean
    access_token?: string
    error?: string
  }> {
    try {
      const { data: connection, error } = await supabase
        .from('user_oauth_connections')
        .select(`
          *,
          oauth_providers (*)
        `)
        .eq('id', connectionId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (error || !connection || !connection.refresh_token) {
        return { success: false, error: 'Connection not found or no refresh token' }
      }

      const provider = connection.oauth_providers

      const response = await fetch(provider.token_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: provider.client_id,
          client_secret: provider.client_secret,
          refresh_token: connection.refresh_token
        })
      })

      if (!response.ok) {
        return { success: false, error: 'Token refresh failed' }
      }

      const tokenData = await response.json()
      
      const expiresAt = tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null

      // Update connection with new tokens
      await supabase
        .from('user_oauth_connections')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || connection.refresh_token,
          token_expires_at: expiresAt,
          last_used: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      // Log the refresh
      await supabase.rpc('log_oauth_usage', {
        p_user_id: userId,
        p_connection_id: connectionId,
        p_agent_id: null,
        p_action: 'refresh_token',
        p_status_code: 200
      })

      return {
        success: true,
        access_token: tokenData.access_token
      }
    } catch (error) {
      return { success: false, error: 'Token refresh error' }
    }
  }

  async getUserConnections(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('user_oauth_connections')
      .select(`
        *,
        oauth_providers (name, display_name)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    return data || []
  }

  async revokeConnection(connectionId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('revoke_oauth_connection', {
      p_connection_id: connectionId,
      p_user_id: userId
    })

    return data === true
  }

  async checkAgentRequirements(userId: string, agentId: string): Promise<any[]> {
    const { data, error } = await supabase.rpc('check_agent_oauth_requirements', {
      p_user_id: userId,
      p_agent_id: agentId
    })

    return data || []
  }
}

const oauthManager = new OAuthManager()

// GET /api/oauth/[provider] - Initiate OAuth flow
// GET /api/oauth/callback/[provider] - Handle OAuth callback
// POST /api/oauth/refresh - Refresh access token
// GET /api/oauth/connections - Get user's OAuth connections
// DELETE /api/oauth/connections/[id] - Revoke OAuth connection

export async function GET(request: NextRequest, { params }: { params: { provider: string } }) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  const redirectAfter = searchParams.get('redirect_after')
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!userId && !code) {
    return NextResponse.json({ error: 'Missing user_id or code parameter' }, { status: 400 })
  }

  // Handle OAuth callback
  if (code && state) {
    const result = await oauthManager.handleCallback(code, state)
    
    if (!result.success) {
      return NextResponse.redirect(new URL(`/dashboard/integrations?error=${encodeURIComponent(result.error!)}`, request.url))
    }
    
    const redirectUrl = result.redirect_url || '/dashboard/integrations'
    return NextResponse.redirect(new URL(`${redirectUrl}?success=true`, request.url))
  }

  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id parameter' }, { status: 400 })
  }

  // Initiate OAuth flow
  const result = await oauthManager.initiateOAuth(userId, params.provider, redirectAfter || undefined)
  
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.redirect(result.authorization_url)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, user_id, connection_id } = body

  if (action === 'refresh' && user_id && connection_id) {
    const result = await oauthManager.refreshToken(connection_id, user_id)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 })
}

export async function DELETE(request: NextRequest, { params }: { params: { provider: string } }) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  const connectionId = params.provider // Reusing provider param for connection ID

  if (!userId || !connectionId) {
    return NextResponse.json({ error: 'Missing user_id or connection_id' }, { status: 400 })
  }

  const success = await oauthManager.revokeConnection(connectionId, userId)
  
  if (!success) {
    return NextResponse.json({ error: 'Failed to revoke connection' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
