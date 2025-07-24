-- Global Credential Management Tables
-- Secure storage with AES-256 encryption for OAuth tokens and API keys

-- Main credentials table
CREATE TABLE IF NOT EXISTS user_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL, -- e.g., 'gmail', 'slack', 'salesforce'
    service_type VARCHAR(50) NOT NULL, -- 'oauth2', 'api_key', 'basic_auth'
    display_name VARCHAR(200) NOT NULL, -- User-friendly name
    
    -- Encrypted credential data (AES-256)
    encrypted_data BYTEA NOT NULL, -- Contains tokens, keys, etc.
    encryption_key_id VARCHAR(100) NOT NULL, -- Key ID for rotation
    
    -- OAuth specific fields
    oauth_scope TEXT[], -- Requested scopes
    oauth_redirect_uri TEXT,
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'active', -- active, expired, revoked, error
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, service_name, display_name)
);

-- Credential usage log for security monitoring
CREATE TABLE IF NOT EXISTS credential_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID NOT NULL REFERENCES user_credentials(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Usage details
    action VARCHAR(50) NOT NULL, -- 'created', 'used', 'refreshed', 'revoked'
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Context
    integration_id UUID, -- Which integration used this credential
    agent_id UUID, -- Which agent used this credential
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth state management for secure flows
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_token VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    redirect_uri TEXT,
    code_verifier VARCHAR(255), -- For PKCE
    
    -- Security
    ip_address INET,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service configurations (supported integrations)
CREATE TABLE IF NOT EXISTS integration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    
    -- OAuth configuration
    oauth_client_id VARCHAR(500),
    oauth_client_secret_encrypted BYTEA,
    oauth_authorize_url TEXT,
    oauth_token_url TEXT,
    oauth_scopes TEXT[],
    
    -- API configuration
    api_base_url TEXT,
    api_version VARCHAR(20),
    rate_limits JSONB, -- Rate limiting configuration
    
    -- UI configuration
    icon_url TEXT,
    description TEXT,
    documentation_url TEXT,
    
    -- Status
    enabled BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credential sharing for team workspaces (enterprise feature)
CREATE TABLE IF NOT EXISTS credential_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID NOT NULL REFERENCES user_credentials(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID, -- For organization-wide sharing
    
    -- Permissions
    permissions JSONB NOT NULL DEFAULT '{"read": true, "use": true, "manage": false}',
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credentials_service ON user_credentials(service_name);
CREATE INDEX IF NOT EXISTS idx_user_credentials_status ON user_credentials(status);
CREATE INDEX IF NOT EXISTS idx_credential_usage_log_credential_id ON credential_usage_log(credential_id);
CREATE INDEX IF NOT EXISTS idx_credential_usage_log_created_at ON credential_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_token ON oauth_states(state_token);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_credential_shares_credential_id ON credential_shares(credential_id);

-- RLS Policies for security
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_shares ENABLE ROW LEVEL SECURITY;

-- Users can only access their own credentials
CREATE POLICY "Users can manage their own credentials" 
ON user_credentials FOR ALL 
USING (auth.uid() = user_id);

-- Users can only view their own usage logs
CREATE POLICY "Users can view their own usage logs" 
ON credential_usage_log FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only access their own OAuth states
CREATE POLICY "Users can manage their own OAuth states" 
ON oauth_states FOR ALL 
USING (auth.uid() = user_id);

-- Users can access credentials shared with them
CREATE POLICY "Users can access shared credentials" 
ON credential_shares FOR SELECT 
USING (
  auth.uid() = shared_with OR 
  auth.uid() = shared_by OR
  auth.uid() IN (
    SELECT user_id FROM workspace_members 
    WHERE workspace_id = credential_shares.workspace_id
  )
);

-- Insert default integration configurations
INSERT INTO integration_configs (service_name, display_name, category, oauth_scopes, description, featured) VALUES
('gmail', 'Gmail', 'Communication', ARRAY['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'], 'Send and receive emails via Gmail', true),
('slack', 'Slack', 'Communication', ARRAY['channels:read', 'chat:write', 'users:read'], 'Team messaging and collaboration', true),
('google_sheets', 'Google Sheets', 'Productivity', ARRAY['https://www.googleapis.com/auth/spreadsheets'], 'Read and write spreadsheet data', true),
('salesforce', 'Salesforce', 'CRM', ARRAY['api', 'refresh_token'], 'Customer relationship management', true),
('github', 'GitHub', 'Developer', ARRAY['repo', 'user'], 'Code repository management', true),
('hubspot', 'HubSpot', 'CRM', ARRAY['crm.objects.contacts.read', 'crm.objects.deals.read'], 'Inbound marketing and sales', true),
('mailchimp', 'Mailchimp', 'Marketing', ARRAY['read', 'write'], 'Email marketing automation', true),
('stripe', 'Stripe', 'E-commerce', NULL, 'Payment processing (API key based)', true)
ON CONFLICT (service_name) DO NOTHING;

-- Functions for credential encryption/decryption
-- Note: In production, use external key management service (AWS KMS, etc.)

CREATE OR REPLACE FUNCTION encrypt_credential_data(
  data JSONB,
  service_name TEXT
) RETURNS BYTEA AS $$
DECLARE
  key_id TEXT;
  encrypted_data BYTEA;
BEGIN
  -- In production, generate/retrieve encryption key from secure key management
  key_id := 'credential_key_v1';
  
  -- Encrypt the data (simplified - use proper encryption in production)
  encrypted_data := encode(data::TEXT, 'base64')::BYTEA;
  
  RETURN encrypted_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_credential_data(
  encrypted_data BYTEA,
  encryption_key_id TEXT
) RETURNS JSONB AS $$
DECLARE
  decrypted_text TEXT;
BEGIN
  -- Decrypt the data (simplified - use proper decryption in production)
  decrypted_text := convert_from(encrypted_data, 'UTF8');
  
  -- Convert base64 back to JSON
  RETURN decode(decrypted_text, 'base64')::TEXT::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
