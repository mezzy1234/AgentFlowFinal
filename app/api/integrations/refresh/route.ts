import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

interface IntegrationRefreshConfig {
  name: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  grantType: string;
}

const INTEGRATION_REFRESH_CONFIGS: Record<string, IntegrationRefreshConfig> = {
  slack: {
    name: 'slack',
    tokenUrl: 'https://slack.com/api/auth.test',
    clientId: process.env.SLACK_CLIENT_ID!,
    clientSecret: process.env.SLACK_CLIENT_SECRET!,
    grantType: 'refresh_token'
  },
  gmail: {
    name: 'gmail',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    grantType: 'refresh_token'
  },
  notion: {
    name: 'notion',
    tokenUrl: 'https://api.notion.com/v1/users/me',
    clientId: process.env.NOTION_CLIENT_ID!,
    clientSecret: process.env.NOTION_CLIENT_SECRET!,
    grantType: 'refresh_token'
  },
  github: {
    name: 'github',
    tokenUrl: 'https://api.github.com/user',
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    grantType: 'refresh_token'
  },
  trello: {
    name: 'trello',
    tokenUrl: 'https://api.trello.com/1/members/me',
    clientId: process.env.TRELLO_API_KEY!,
    clientSecret: process.env.TRELLO_API_SECRET!,
    grantType: 'refresh_token'
  }
};

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get user from request headers (you'll need to implement proper auth)
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { integration } = await req.json();
    
    if (!integration || !INTEGRATION_REFRESH_CONFIGS[integration]) {
      return NextResponse.json({ error: 'Invalid integration' }, { status: 400 });
    }

    const config = INTEGRATION_REFRESH_CONFIGS[integration];

    // Get current token info
    const { data: tokenData, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_name', integration)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    let refreshResult;

    try {
      // Test current token first
      refreshResult = await testIntegrationConnection(config, tokenData.access_token);
      
      if (refreshResult.success) {
        // Token is still valid
        await updateIntegrationStatus(supabase, user.id, integration, 'connected', null);
        return NextResponse.json({ 
          success: true, 
          status: 'connected',
          message: 'Token is still valid'
        });
      }

      // Token needs refresh
      if (tokenData.refresh_token) {
        const newTokens = await refreshAccessToken(config, tokenData.refresh_token);
        
        if (newTokens.success) {
          // Update tokens in database
          const { error: updateError } = await supabase
            .from('oauth_tokens')
            .update({
              access_token: newTokens.accessToken,
              refresh_token: newTokens.refreshToken || tokenData.refresh_token,
              expires_at: newTokens.expiresAt,
              updated_at: new Date().toISOString()
            })
            .eq('id', tokenData.id);

          if (updateError) throw updateError;

          await updateIntegrationStatus(supabase, user.id, integration, 'connected', null);
          
          return NextResponse.json({ 
            success: true, 
            status: 'connected',
            message: 'Token refreshed successfully'
          });
        }
      }

      // Refresh failed
      await updateIntegrationStatus(
        supabase, 
        user.id, 
        integration, 
        'expired', 
        'Token expired - reauthorization required'
      );
      
      return NextResponse.json({ 
        success: false, 
        status: 'expired',
        message: 'Token expired - please reauthorize'
      });

    } catch (error) {
      console.error(`Failed to refresh ${integration}:`, error);
      
      await updateIntegrationStatus(
        supabase, 
        user.id, 
        integration, 
        'error', 
        error instanceof Error ? error.message : 'Connection test failed'
      );

      return NextResponse.json({ 
        success: false, 
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection test failed'
      });
    }

  } catch (error) {
    console.error('Integration refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

async function testIntegrationConnection(config: IntegrationRefreshConfig, accessToken: string) {
  try {
    let headers: Record<string, string> = {};
    let url = config.tokenUrl;

    // Configure headers based on integration type
    switch (config.name) {
      case 'slack':
        headers = { 'Authorization': `Bearer ${accessToken}` };
        break;
      case 'gmail':
        headers = { 'Authorization': `Bearer ${accessToken}` };
        url = 'https://www.googleapis.com/oauth2/v1/userinfo';
        break;
      case 'notion':
        headers = { 
          'Authorization': `Bearer ${accessToken}`,
          'Notion-Version': '2022-06-28'
        };
        break;
      case 'github':
        headers = { 'Authorization': `Bearer ${accessToken}` };
        break;
      case 'trello':
        url = `${config.tokenUrl}?key=${config.clientId}&token=${accessToken}`;
        break;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    return {
      success: response.ok,
      status: response.status,
      data: response.ok ? await response.json() : null
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed'
    };
  }
}

async function refreshAccessToken(config: IntegrationRefreshConfig, refreshToken: string) {
  try {
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    let url = config.tokenUrl;
    let body;
    let headers: Record<string, string> = {};

    // Configure request based on integration type
    switch (config.name) {
      case 'slack':
        url = 'https://slack.com/api/oauth.v2.access';
        body = params;
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        break;
      case 'gmail':
        url = 'https://oauth2.googleapis.com/token';
        body = params;
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        break;
      case 'notion':
        url = 'https://api.notion.com/v1/oauth/token';
        body = JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        });
        headers['Content-Type'] = 'application/json';
        headers['Authorization'] = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;
        break;
      case 'github':
        url = 'https://github.com/login/oauth/access_token';
        body = params;
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        headers['Accept'] = 'application/json';
        break;
      case 'trello':
        // Trello tokens don't expire, so this shouldn't be called
        throw new Error('Trello tokens do not expire');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? 
        new Date(Date.now() + data.expires_in * 1000).toISOString() : 
        new Date(Date.now() + 3600000).toISOString() // Default 1 hour
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed'
    };
  }
}

async function updateIntegrationStatus(
  supabase: any,
  userId: string,
  integrationName: string,
  status: 'connected' | 'expired' | 'error' | 'setup_incomplete',
  errorMessage?: string | null
) {
  const { error } = await supabase
    .from('integration_status')
    .upsert({
      user_id: userId,
      integration_name: integrationName,
      status,
      last_check_at: new Date().toISOString(),
      error_message: errorMessage,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Failed to update integration status:', error);
  }
}
