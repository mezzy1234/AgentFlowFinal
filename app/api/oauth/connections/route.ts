import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TestResult {
  success: boolean
  error?: string
  message?: string
  details?: any
}

// GET /api/oauth/connections - Get user's OAuth connections
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  const agentId = searchParams.get('agent_id')

  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id parameter' }, { status: 400 })
  }

  try {
    // Get user's OAuth connections
    const { data: connections, error: connectionsError } = await supabase
      .from('user_oauth_connections')
      .select(`
        id,
        provider_user_id,
        provider_username,
        token_expires_at,
        is_active,
        last_used,
        created_at,
        oauth_providers (
          id,
          name,
          display_name,
          scope
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (connectionsError) {
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    let agentRequirements = []
    if (agentId) {
      // Get OAuth requirements for specific agent
      const { data: requirements, error: requirementsError } = await supabase.rpc('check_agent_oauth_requirements', {
        p_user_id: userId,
        p_agent_id: agentId
      })

      if (!requirementsError && requirements) {
        agentRequirements = requirements
      }
    }

    // Check for expired tokens and add status
    const connectionsWithStatus = connections.map(conn => {
      const needsRefresh = conn.token_expires_at && new Date(conn.token_expires_at) < new Date()
      return {
        ...conn,
        needs_refresh: needsRefresh,
        status: needsRefresh ? 'expired' : 'active'
      }
    })

    return NextResponse.json({
      connections: connectionsWithStatus,
      agent_requirements: agentRequirements
    })
  } catch (error) {
    console.error('Error fetching OAuth connections:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/oauth/connections - Test or refresh a connection
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, user_id, connection_id, provider_name } = body

  if (!user_id) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }

  try {
    switch (action) {
      case 'test':
        return await testConnection(user_id, connection_id)
      case 'refresh':
        return await refreshConnection(user_id, connection_id)
      case 'initiate':
        return await initiateConnection(user_id, provider_name)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('OAuth connection action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function testConnection(userId: string, connectionId: string) {
  // Get connection details
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

  if (error || !connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  const provider = connection.oauth_providers
  let testResult: TestResult = { success: false, error: 'Unknown provider' }

  try {
    // Test API call based on provider
    switch (provider.name) {
      case 'google':
        testResult = await testGoogleConnection(connection.access_token)
        break
      case 'slack':
        testResult = await testSlackConnection(connection.access_token)
        break
      case 'stripe':
        testResult = await testStripeConnection(connection.access_token)
        break
      case 'github':
        testResult = await testGitHubConnection(connection.access_token)
        break
    }

    // Log the test
    await supabase.rpc('log_oauth_usage', {
      p_user_id: userId,
      p_connection_id: connectionId,
      p_agent_id: null,
      p_action: 'test_connection',
      p_status_code: testResult.success ? 200 : 401,
      p_error_message: testResult.error,
      p_metadata: JSON.stringify({ test_type: 'api_connectivity' })
    })

    return NextResponse.json(testResult)
  } catch (error) {
    await supabase.rpc('log_oauth_usage', {
      p_user_id: userId,
      p_connection_id: connectionId,
      p_agent_id: null,
      p_action: 'test_connection',
      p_status_code: 500,
      p_error_message: 'Test failed with exception'
    })

    return NextResponse.json({ success: false, error: 'Test failed' })
  }
}

async function testGoogleConnection(accessToken: string): Promise<TestResult> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    
    if (response.ok) {
      const tokenInfo = await response.json()
      return { 
        success: true, 
        message: 'Google connection is active',
        details: { scope: tokenInfo.scope, expires_in: tokenInfo.expires_in }
      }
    } else {
      return { success: false, error: 'Invalid or expired Google token' }
    }
  } catch (error) {
    return { success: false, error: 'Google API test failed' }
  }
}

async function testSlackConnection(accessToken: string): Promise<TestResult> {
  try {
    const response = await fetch('https://slack.com/api/auth.test', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    
    const data = await response.json()
    if (data.ok) {
      return { 
        success: true, 
        message: 'Slack connection is active',
        details: { team: data.team, user: data.user }
      }
    } else {
      return { success: false, error: data.error || 'Slack auth test failed' }
    }
  } catch (error) {
    return { success: false, error: 'Slack API test failed' }
  }
}

async function testStripeConnection(accessToken: string): Promise<TestResult> {
  try {
    const response = await fetch('https://api.stripe.com/v1/account', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    
    if (response.ok) {
      const account = await response.json()
      return { 
        success: true, 
        message: 'Stripe connection is active',
        details: { account_id: account.id, business_name: account.business_name }
      }
    } else {
      return { success: false, error: 'Invalid or expired Stripe token' }
    }
  } catch (error) {
    return { success: false, error: 'Stripe API test failed' }
  }
}

async function testGitHubConnection(accessToken: string): Promise<TestResult> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })
    
    if (response.ok) {
      const user = await response.json()
      return { 
        success: true, 
        message: 'GitHub connection is active',
        details: { login: user.login, id: user.id }
      }
    } else {
      return { success: false, error: 'Invalid or expired GitHub token' }
    }
  } catch (error) {
    return { success: false, error: 'GitHub API test failed' }
  }
}

async function refreshConnection(userId: string, connectionId: string) {
  // Get connection details
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
    return NextResponse.json({ error: 'Connection not found or no refresh token available' }, { status: 404 })
  }

  const provider = connection.oauth_providers

  try {
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
      const errorData = await response.text()
      await supabase.rpc('log_oauth_usage', {
        p_user_id: userId,
        p_connection_id: connectionId,
        p_agent_id: null,
        p_action: 'refresh_token',
        p_status_code: response.status,
        p_error_message: errorData
      })
      return NextResponse.json({ success: false, error: 'Token refresh failed' })
    }

    const tokenData = await response.json()
    
    const expiresAt = tokenData.expires_in 
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null

    // Update connection with new tokens
    const { error: updateError } = await supabase
      .from('user_oauth_connections')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || connection.refresh_token,
        token_expires_at: expiresAt,
        last_used: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Failed to update connection' })
    }

    // Log successful refresh
    await supabase.rpc('log_oauth_usage', {
      p_user_id: userId,
      p_connection_id: connectionId,
      p_agent_id: null,
      p_action: 'refresh_token',
      p_status_code: 200
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Token refreshed successfully',
      expires_at: expiresAt
    })
  } catch (error) {
    await supabase.rpc('log_oauth_usage', {
      p_user_id: userId,
      p_connection_id: connectionId,
      p_agent_id: null,
      p_action: 'refresh_token',
      p_status_code: 500,
      p_error_message: 'Token refresh exception'
    })

    return NextResponse.json({ success: false, error: 'Token refresh error' })
  }
}

async function initiateConnection(userId: string, providerName: string) {
  // Get provider details
  const { data: provider, error } = await supabase
    .from('oauth_providers')
    .select('*')
    .eq('name', providerName)
    .eq('is_active', true)
    .single()

  if (error || !provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  }

  // Generate state and code verifier for PKCE
  const state = crypto.randomBytes(32).toString('hex')
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')

  // Create OAuth session
  const { error: sessionError } = await supabase
    .from('oauth_sessions')
    .insert({
      user_id: userId,
      provider_id: provider.id,
      state,
      code_verifier: codeVerifier,
      redirect_after_auth: '/dashboard/integrations'
    })

  if (sessionError) {
    return NextResponse.json({ error: 'Failed to create OAuth session' }, { status: 500 })
  }

  // Build authorization URL
  const authUrl = new URL(provider.authorization_url)
  authUrl.searchParams.set('client_id', provider.client_id)
  authUrl.searchParams.set('redirect_uri', provider.redirect_uri)
  authUrl.searchParams.set('scope', provider.scope)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  // Provider-specific parameters
  if (provider.name === 'google') {
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
  } else if (provider.name === 'slack') {
    authUrl.searchParams.set('user_scope', 'identity.basic,identity.email')
  }

  return NextResponse.json({ 
    success: true,
    authorization_url: authUrl.toString()
  })
}
