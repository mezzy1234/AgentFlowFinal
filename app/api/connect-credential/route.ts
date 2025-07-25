import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CredentialConnection {
  provider: string;
  type: 'oauth' | 'api_key' | 'bearer' | 'basic_auth';
  value?: string;
  oauth_code?: string;
  scopes?: string[];
  metadata?: Record<string, any>;
}

// OAuth provider configurations
const OAUTH_CONFIGS = {
  google: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['profile', 'email']
  },
  github: {
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['user', 'repo']
  },
  discord: {
    tokenUrl: 'https://discord.com/api/oauth2/token',
    scopes: ['identify', 'email']
  },
  notion: {
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: ['read_content', 'update_content']
  },
  slack: {
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'channels:read']
  }
};

// Connect or update credential
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CredentialConnection = await request.json();
    const { provider, type, value, oauth_code, scopes, metadata } = body;

    if (!provider || !type) {
      return NextResponse.json({ error: 'Provider and type are required' }, { status: 400 });
    }

    let credentialValue = value;
    let credentialMetadata = metadata || {};

    // Handle OAuth flow
    if (type === 'oauth' && oauth_code) {
      const oauthResult = await handleOAuthExchange(provider, oauth_code, scopes || []);
      credentialValue = oauthResult.accessToken;
      credentialMetadata = {
        ...credentialMetadata,
        refresh_token: oauthResult.refreshToken,
        expires_at: oauthResult.expiresAt,
        token_type: oauthResult.tokenType,
        scopes: oauthResult.scopes
      };
    }

    if (!credentialValue) {
      return NextResponse.json({ error: 'Credential value or OAuth code required' }, { status: 400 });
    }

    // Validate credential
    const validation = await validateCredential(provider, type, credentialValue);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'Invalid credential', 
        details: validation.error 
      }, { status: 400 });
    }

    // Encrypt credential value
    const encryptedValue = encryptCredential(credentialValue);

    // Check if credential already exists
    const { data: existingCred } = await supabase
      .from('user_credentials')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single();

    let credentialResult;

    if (existingCred) {
      // Update existing credential
      const { data: updatedCred, error: updateError } = await supabase
        .from('user_credentials')
        .update({
          type,
          encrypted_value: encryptedValue,
          scopes: scopes || [],
          metadata: credentialMetadata,
          status: 'active',
          last_validated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCred.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update credential:', updateError);
        return NextResponse.json({ error: 'Failed to update credential' }, { status: 500 });
      }

      credentialResult = updatedCred;
    } else {
      // Create new credential
      const { data: newCred, error: createError } = await supabase
        .from('user_credentials')
        .insert({
          user_id: user.id,
          provider,
          type,
          encrypted_value: encryptedValue,
          scopes: scopes || [],
          metadata: credentialMetadata,
          status: 'active',
          last_validated: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create credential:', createError);
        return NextResponse.json({ error: 'Failed to create credential' }, { status: 500 });
      }

      credentialResult = newCred;
    }

    // Log credential activity
    await logCredentialActivity(user.id, provider, 'connected', {
      type,
      scopes: scopes || [],
      validation_result: validation
    });

    return NextResponse.json({
      success: true,
      credential: {
        id: credentialResult.id,
        provider: credentialResult.provider,
        type: credentialResult.type,
        scopes: credentialResult.scopes,
        status: credentialResult.status,
        created_at: credentialResult.created_at,
        last_validated: credentialResult.last_validated
      },
      validation
    });

  } catch (error) {
    console.error('Credential connection error:', error);
    return NextResponse.json({ 
      error: 'Failed to connect credential',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// GET endpoint for credential status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const agentId = searchParams.get('agentId');

    if (provider) {
      // Get specific credential
      const { data: credential } = await supabase
        .from('user_credentials')
        .select('id, provider, type, scopes, status, created_at, last_validated, last_used_at')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .single();

      if (!credential) {
        return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
      }

      // Check if credential needs refresh
      const needsRefresh = await checkCredentialRefresh(credential);

      return NextResponse.json({
        credential,
        needsRefresh,
        isValid: credential.status === 'active'
      });
    }

    if (agentId) {
      // Get required credentials for agent
      const { data: agentCreds } = await supabase
        .from('agent_credentials')
        .select('*')
        .eq('agent_id', agentId);

      const { data: userCreds } = await supabase
        .from('user_credentials')
        .select('id, provider, type, scopes, status, created_at, last_validated')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const credentialStatus = agentCreds?.map(req => {
        const userCred = userCreds?.find(uc => uc.provider === req.service);
        return {
          service: req.service,
          type: req.type,
          required: req.required,
          scopes: req.scopes,
          connected: !!userCred,
          valid: userCred?.status === 'active',
          last_validated: userCred?.last_validated
        };
      }) || [];

      const missingRequired = credentialStatus.filter(cs => cs.required && !cs.connected);
      const allRequiredConnected = missingRequired.length === 0;

      return NextResponse.json({
        agentId,
        credentialStatus,
        missingRequired,
        allRequiredConnected
      });
    }

    // Get all user credentials
    const { data: credentials } = await supabase
      .from('user_credentials')
      .select('id, provider, type, scopes, status, created_at, last_validated, last_used_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ credentials: credentials || [] });

  } catch (error) {
    console.error('Get credential status error:', error);
    return NextResponse.json({ error: 'Failed to get credential status' }, { status: 500 });
  }
}

// DELETE endpoint for removing credentials
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const credentialId = searchParams.get('credentialId');

    let deleteQuery = supabase
      .from('user_credentials')
      .delete()
      .eq('user_id', user.id);

    if (credentialId) {
      deleteQuery = deleteQuery.eq('id', credentialId);
    } else if (provider) {
      deleteQuery = deleteQuery.eq('provider', provider);
    } else {
      return NextResponse.json({ error: 'Provider or credentialId required' }, { status: 400 });
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error('Failed to delete credential:', deleteError);
      return NextResponse.json({ error: 'Failed to delete credential' }, { status: 500 });
    }

    // Log credential activity
    await logCredentialActivity(user.id, provider || 'unknown', 'disconnected');

    return NextResponse.json({ success: true, message: 'Credential deleted' });

  } catch (error) {
    console.error('Delete credential error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete credential',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// Handle OAuth token exchange
async function handleOAuthExchange(provider: string, code: string, scopes: string[]) {
  const config = OAUTH_CONFIGS[provider as keyof typeof OAUTH_CONFIGS];
  if (!config) {
    throw new Error(`OAuth not supported for provider: ${provider}`);
  }

  const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
  const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];
  const redirectUri = process.env[`${provider.toUpperCase()}_REDIRECT_URI`];

  if (!clientId || !clientSecret) {
    throw new Error(`OAuth credentials not configured for ${provider}`);
  }

  const tokenResponse = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    })
  });

  if (!tokenResponse.ok) {
    throw new Error(`OAuth token exchange failed: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
    tokenType: tokenData.token_type || 'Bearer',
    scopes: tokenData.scope?.split(' ') || scopes
  };
}

// Validate credential
async function validateCredential(provider: string, type: string, value: string): Promise<{
  valid: boolean;
  error?: string;
  metadata?: Record<string, any>;
}> {
  try {
    // Provider-specific validation
    switch (provider) {
      case 'google':
        return await validateGoogleToken(value);
      case 'github':
        return await validateGitHubToken(value);
      case 'discord':
        return await validateDiscordToken(value);
      case 'notion':
        return await validateNotionToken(value);
      case 'slack':
        return await validateSlackToken(value);
      default:
        // Generic validation for API keys
        if (type === 'api_key' && value.length < 10) {
          return { valid: false, error: 'API key too short' };
        }
        return { valid: true };
    }
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}

// Provider-specific validation functions
async function validateGoogleToken(token: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!response.ok) {
    return { valid: false, error: 'Invalid Google token' };
  }
  
  const userData = await response.json();
  return { 
    valid: true, 
    metadata: { 
      user_id: userData.id, 
      email: userData.email,
      name: userData.name 
    } 
  };
}

async function validateGitHubToken(token: string) {
  const response = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!response.ok) {
    return { valid: false, error: 'Invalid GitHub token' };
  }
  
  const userData = await response.json();
  return { 
    valid: true, 
    metadata: { 
      user_id: userData.id, 
      username: userData.login,
      name: userData.name 
    } 
  };
}

async function validateDiscordToken(token: string) {
  const response = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!response.ok) {
    return { valid: false, error: 'Invalid Discord token' };
  }
  
  const userData = await response.json();
  return { 
    valid: true, 
    metadata: { 
      user_id: userData.id, 
      username: userData.username,
      discriminator: userData.discriminator 
    } 
  };
}

async function validateNotionToken(token: string) {
  const response = await fetch('https://api.notion.com/v1/users/me', {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28'
    }
  });
  
  if (!response.ok) {
    return { valid: false, error: 'Invalid Notion token' };
  }
  
  const userData = await response.json();
  return { 
    valid: true, 
    metadata: { 
      user_id: userData.id, 
      name: userData.name,
      type: userData.type 
    } 
  };
}

async function validateSlackToken(token: string) {
  const response = await fetch('https://slack.com/api/auth.test', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!response.ok) {
    return { valid: false, error: 'Invalid Slack token' };
  }
  
  const result = await response.json();
  if (!result.ok) {
    return { valid: false, error: result.error || 'Invalid Slack token' };
  }
  
  return { 
    valid: true, 
    metadata: { 
      user_id: result.user_id, 
      team_id: result.team_id,
      user: result.user 
    } 
  };
}

// Check if credential needs refresh
async function checkCredentialRefresh(credential: any): Promise<boolean> {
  if (credential.type !== 'oauth' || !credential.metadata?.expires_at) {
    return false;
  }
  
  const expiresAt = new Date(credential.metadata.expires_at);
  const now = new Date();
  const buffer = 5 * 60 * 1000; // 5 minutes buffer
  
  return expiresAt.getTime() - now.getTime() < buffer;
}

// Encrypt credential value
function encryptCredential(value: string): string {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-characters-long!!', 'utf8');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(Buffer.from('agentflow-credential', 'utf8'));
  
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

// Log credential activity
async function logCredentialActivity(userId: string, provider: string, action: string, metadata?: any) {
  try {
    await supabase
      .from('credential_audit_logs')
      .insert({
        user_id: userId,
        provider,
        action,
        metadata,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log credential activity:', error);
  }
}
