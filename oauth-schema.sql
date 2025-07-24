-- OAuth Account Linking System
-- This handles OAuth connections for Google Sheets, Slack, Stripe, etc.

-- OAuth Provider Registry
CREATE TABLE IF NOT EXISTS oauth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE, -- 'google', 'slack', 'stripe', 'github', etc.
  display_name VARCHAR(100) NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  authorization_url TEXT NOT NULL,
  token_url TEXT NOT NULL,
  scope TEXT DEFAULT '',
  redirect_uri TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User OAuth Connections
CREATE TABLE IF NOT EXISTS user_oauth_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES oauth_providers(id),
  provider_user_id TEXT, -- The user's ID on the external service
  provider_username TEXT, -- Their username/email on the external service
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_used TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}', -- Store provider-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider_id)
);

-- OAuth Authorization Sessions (for the flow)
CREATE TABLE IF NOT EXISTS oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES oauth_providers(id),
  state VARCHAR(100) NOT NULL UNIQUE, -- CSRF protection
  code_verifier VARCHAR(128), -- For PKCE
  redirect_after_auth TEXT, -- Where to redirect after successful auth
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes'),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent OAuth Requirements
CREATE TABLE IF NOT EXISTS agent_oauth_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES oauth_providers(id),
  is_required BOOLEAN DEFAULT TRUE,
  scope_required TEXT, -- Specific scopes needed
  description TEXT, -- What this OAuth connection is used for
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, provider_id)
);

-- OAuth Usage Tracking
CREATE TABLE IF NOT EXISTS oauth_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES user_oauth_connections(id),
  agent_id UUID, -- Which agent used this connection
  action TEXT NOT NULL, -- 'api_call', 'refresh_token', 'revoke', etc.
  api_endpoint TEXT, -- Which API was called
  status_code INTEGER,
  error_message TEXT,
  rate_limit_remaining INTEGER,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_oauth_connections_user_id ON user_oauth_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_oauth_connections_provider_id ON user_oauth_connections(provider_id);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_state ON oauth_sessions(state);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_user_id ON oauth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_oauth_requirements_agent_id ON agent_oauth_requirements(agent_id);
CREATE INDEX IF NOT EXISTS idx_oauth_usage_logs_user_id ON oauth_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_usage_logs_timestamp ON oauth_usage_logs(timestamp);

-- PostgreSQL Functions for OAuth Management

-- Function to refresh an OAuth token
CREATE OR REPLACE FUNCTION refresh_oauth_token(p_connection_id UUID)
RETURNS TABLE(
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  conn_record RECORD;
  provider_record RECORD;
BEGIN
  -- Get connection and provider details
  SELECT uoc.*, op.token_url, op.client_id, op.client_secret
  INTO conn_record
  FROM user_oauth_connections uoc
  JOIN oauth_providers op ON uoc.provider_id = op.id
  WHERE uoc.id = p_connection_id AND uoc.is_active = TRUE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'OAuth connection not found or inactive';
  END IF;
  
  IF conn_record.refresh_token IS NULL THEN
    RAISE EXCEPTION 'No refresh token available';
  END IF;
  
  -- Mark that we attempted to refresh
  UPDATE user_oauth_connections 
  SET updated_at = NOW()
  WHERE id = p_connection_id;
  
  -- Return current tokens (actual refresh happens in application layer)
  RETURN QUERY
  SELECT 
    conn_record.access_token,
    conn_record.refresh_token,
    conn_record.token_expires_at;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has required OAuth connections for an agent
CREATE OR REPLACE FUNCTION check_agent_oauth_requirements(p_user_id UUID, p_agent_id UUID)
RETURNS TABLE(
  provider_name TEXT,
  is_connected BOOLEAN,
  is_required BOOLEAN,
  needs_reauth BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    op.name as provider_name,
    (uoc.id IS NOT NULL AND uoc.is_active = TRUE) as is_connected,
    aor.is_required,
    (uoc.token_expires_at IS NOT NULL AND uoc.token_expires_at < NOW()) as needs_reauth
  FROM agent_oauth_requirements aor
  JOIN oauth_providers op ON aor.provider_id = op.id
  LEFT JOIN user_oauth_connections uoc ON (
    uoc.user_id = p_user_id 
    AND uoc.provider_id = aor.provider_id 
    AND uoc.is_active = TRUE
  )
  WHERE aor.agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Function to revoke OAuth connection
CREATE OR REPLACE FUNCTION revoke_oauth_connection(p_connection_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  connection_exists BOOLEAN;
BEGIN
  -- Check if connection exists and belongs to user
  SELECT EXISTS(
    SELECT 1 FROM user_oauth_connections 
    WHERE id = p_connection_id AND user_id = p_user_id
  ) INTO connection_exists;
  
  IF NOT connection_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Deactivate the connection
  UPDATE user_oauth_connections 
  SET 
    is_active = FALSE,
    access_token = '',
    refresh_token = '',
    updated_at = NOW()
  WHERE id = p_connection_id AND user_id = p_user_id;
  
  -- Log the revocation
  INSERT INTO oauth_usage_logs (user_id, connection_id, action, metadata)
  VALUES (p_user_id, p_connection_id, 'revoke', '{"revoked_at": "' || NOW() || '"}');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to log OAuth API usage
CREATE OR REPLACE FUNCTION log_oauth_usage(
  p_user_id UUID,
  p_connection_id UUID,
  p_agent_id UUID,
  p_action TEXT,
  p_api_endpoint TEXT DEFAULT NULL,
  p_status_code INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_rate_limit_remaining INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO oauth_usage_logs (
    user_id, connection_id, agent_id, action, api_endpoint, 
    status_code, error_message, rate_limit_remaining, metadata
  )
  VALUES (
    p_user_id, p_connection_id, p_agent_id, p_action, p_api_endpoint,
    p_status_code, p_error_message, p_rate_limit_remaining, p_metadata
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default OAuth providers
INSERT INTO oauth_providers (name, display_name, client_id, client_secret, authorization_url, token_url, scope, redirect_uri, metadata) VALUES
('google', 'Google', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 
 'https://accounts.google.com/o/oauth2/v2/auth', 
 'https://oauth2.googleapis.com/token',
 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
 'https://your-domain.com/api/oauth/callback/google',
 '{"supports_refresh": true, "token_lifetime": 3600}'),

('slack', 'Slack', 'SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET',
 'https://slack.com/oauth/v2/authorize',
 'https://slack.com/api/oauth.v2.access',
 'channels:read,chat:write,users:read',
 'https://your-domain.com/api/oauth/callback/slack',
 '{"supports_refresh": true, "token_type": "bot"}'),

('stripe', 'Stripe', 'STRIPE_CLIENT_ID', 'STRIPE_CLIENT_SECRET',
 'https://connect.stripe.com/oauth/authorize',
 'https://connect.stripe.com/oauth/token',
 'read_write',
 'https://your-domain.com/api/oauth/callback/stripe',
 '{"supports_refresh": true, "account_type": "standard"}'),

('github', 'GitHub', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
 'https://github.com/login/oauth/authorize',
 'https://github.com/login/oauth/access_token',
 'repo,user',
 'https://your-domain.com/api/oauth/callback/github',
 '{"supports_refresh": false, "token_lifetime": "never_expires"}')

ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  authorization_url = EXCLUDED.authorization_url,
  token_url = EXCLUDED.token_url,
  scope = EXCLUDED.scope,
  redirect_uri = EXCLUDED.redirect_uri,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();
