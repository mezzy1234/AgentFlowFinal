-- API keys and security enhancements for AgentFlow.AI
-- Extends the existing database with API key management and enhanced security

-- API keys table for secure programmatic access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key_id TEXT UNIQUE NOT NULL, -- e.g., ak_1234567890abcdef
  secret_hash TEXT NOT NULL, -- SHA-256 hash of the secret
  name TEXT NOT NULL, -- User-defined name for the key
  purpose TEXT, -- What this key is for
  permissions JSONB DEFAULT '[]', -- Array of allowed permissions
  rate_limit JSONB DEFAULT '{"windowMs": 60000, "maxRequests": 100}',
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_ip INET,
  metadata JSONB DEFAULT '{}'
);

-- Enhanced session security tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  device_fingerprint TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Security incidents tracking
CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL, -- 'suspicious_login', 'rate_limit_exceeded', 'data_breach_attempt', etc.
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  evidence JSONB DEFAULT '{}',
  response_actions JSONB DEFAULT '[]',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP, user ID, or API key
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip', 'user', 'api_key')),
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL,
  time_window_ms INTEGER NOT NULL,
  violated_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Data encryption keys management (for rotating encryption keys)
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_version INTEGER NOT NULL,
  key_hash TEXT NOT NULL, -- Hash of the key for identification
  algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_id ON api_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_security_incidents_user_id ON security_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_type ON security_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_created_at ON security_incidents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_identifier ON rate_limit_violations(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_endpoint ON rate_limit_violations(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_violated_at ON rate_limit_violations(violated_at DESC);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_version ON encryption_keys(key_version);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_active ON encryption_keys(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

-- API Keys policies
CREATE POLICY "Users can view their own API keys" ON api_keys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own API keys" ON api_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own API keys" ON api_keys
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own API keys" ON api_keys
  FOR DELETE USING (user_id = auth.uid());

-- User Sessions policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all sessions" ON user_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Security Incidents policies
CREATE POLICY "Users can view incidents related to them" ON security_incidents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all security incidents" ON security_incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update security incidents" ON security_incidents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Rate Limit Violations policies (admin only)
CREATE POLICY "Admins can view rate limit violations" ON rate_limit_violations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Encryption Keys policies (service role only)
CREATE POLICY "Service role can manage encryption keys" ON encryption_keys
  FOR ALL USING (auth.role() = 'service_role');

-- Functions for security management
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  -- Mark expired sessions as inactive
  UPDATE user_sessions 
  SET is_active = FALSE, updated_at = NOW()
  WHERE expires_at <= NOW() AND is_active = TRUE;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- Delete very old expired sessions (older than 30 days)
  DELETE FROM user_sessions
  WHERE expires_at <= NOW() - INTERVAL '30 days';
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_session_activity(session_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_sessions
  SET last_activity = NOW()
  WHERE id = session_uuid AND is_active = TRUE;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculate_user_risk_score(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  risk_score INTEGER := 0;
  recent_incidents INTEGER;
  unusual_activity INTEGER;
  multiple_sessions INTEGER;
BEGIN
  -- Check recent security incidents
  SELECT COUNT(*) INTO recent_incidents
  FROM security_incidents
  WHERE user_id = user_uuid
    AND created_at >= NOW() - INTERVAL '24 hours'
    AND severity IN ('high', 'critical');
  
  risk_score := risk_score + (recent_incidents * 25);
  
  -- Check for unusual activity patterns
  SELECT COUNT(*) INTO unusual_activity
  FROM audit_logs
  WHERE user_id = user_uuid
    AND created_at >= NOW() - INTERVAL '1 hour'
    AND action IN ('failed_login', 'suspicious_api_call', 'rate_limit_exceeded');
  
  risk_score := risk_score + (unusual_activity * 10);
  
  -- Check for multiple active sessions from different IPs
  SELECT COUNT(DISTINCT ip_address) INTO multiple_sessions
  FROM user_sessions
  WHERE user_id = user_uuid
    AND is_active = TRUE
    AND last_activity >= NOW() - INTERVAL '15 minutes';
  
  IF multiple_sessions > 3 THEN
    risk_score := risk_score + 20;
  END IF;
  
  -- Cap at 100
  risk_score := LEAST(risk_score, 100);
  
  -- Update user sessions with new risk score
  UPDATE user_sessions
  SET risk_score = calculate_user_risk_score.risk_score
  WHERE user_id = user_uuid AND is_active = TRUE;
  
  RETURN risk_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rotate encryption keys
CREATE OR REPLACE FUNCTION rotate_encryption_key()
RETURNS UUID AS $$
DECLARE
  new_key_id UUID;
  current_version INTEGER;
BEGIN
  -- Get current version
  SELECT COALESCE(MAX(key_version), 0) INTO current_version
  FROM encryption_keys;
  
  -- Mark old keys as inactive
  UPDATE encryption_keys SET is_active = FALSE WHERE is_active = TRUE;
  
  -- Create new key record (actual key generation happens in application)
  INSERT INTO encryption_keys (key_version, key_hash, is_active)
  VALUES (current_version + 1, 'pending', TRUE)
  RETURNING id INTO new_key_id;
  
  -- Log the key rotation
  INSERT INTO audit_logs (action, resource_type, resource_id, new_values)
  VALUES ('encryption_key_rotated', 'encryption_key', new_key_id::TEXT, 
          jsonb_build_object('version', current_version + 1, 'rotated_at', NOW()));
  
  RETURN new_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check API key permissions
CREATE OR REPLACE FUNCTION check_api_key_permission(key_id TEXT, required_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  key_permissions JSONB;
  has_permission BOOLEAN := FALSE;
BEGIN
  SELECT permissions INTO key_permissions
  FROM api_keys
  WHERE api_keys.key_id = check_api_key_permission.key_id
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF key_permissions IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if permission exists in the permissions array
  SELECT EXISTS(
    SELECT 1 FROM jsonb_array_elements_text(key_permissions) AS perm
    WHERE perm = required_permission OR perm = '*'
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_security_incident_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_security_incident_updated_at
  BEFORE UPDATE ON security_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_security_incident_timestamp();

-- Create some initial admin security settings
INSERT INTO encryption_keys (key_version, key_hash, is_active, metadata)
VALUES (1, 'initial-system-key-placeholder', TRUE, '{"created_by": "system", "purpose": "initial_setup"}')
ON CONFLICT DO NOTHING;
