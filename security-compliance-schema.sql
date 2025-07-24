-- SECURITY AND COMPLIANCE SCHEMA
-- Schema for audit logging, compliance tracking, and security monitoring

-- ================================
-- SECURITY AUDIT LOGS
-- ================================
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'credential_access', 'data_export', etc.
  severity TEXT DEFAULT 'info' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,
  event_details JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- CREDENTIAL AUDIT LOGS
-- ================================
CREATE TABLE IF NOT EXISTS credential_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  credential_id UUID REFERENCES credentials(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'access', 'encrypt', 'decrypt')),
  provider TEXT NOT NULL,
  success BOOLEAN DEFAULT true,
  error_details TEXT,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- DATA PROCESSING LOGS (GDPR)
-- ================================
CREATE TABLE IF NOT EXISTS data_processing_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  data_subject_id UUID, -- Could reference external systems
  processing_purpose TEXT NOT NULL,
  lawful_basis TEXT NOT NULL CHECK (lawful_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
  data_categories TEXT[] DEFAULT '{}', -- ['personal_data', 'special_category', 'criminal_data']
  retention_period TEXT,
  third_party_recipients TEXT[],
  cross_border_transfer BOOLEAN DEFAULT false,
  processor_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- USER CONSENT LOGS
-- ================================
CREATE TABLE IF NOT EXISTS user_consent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'data_processing', 'marketing', 'cookies', 'analytics'
  consent_given BOOLEAN NOT NULL,
  consent_text TEXT,
  consent_version TEXT DEFAULT '1.0',
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- DATA RETENTION METRICS
-- ================================
CREATE TABLE IF NOT EXISTS data_retention_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data_type TEXT NOT NULL,
  total_records INTEGER DEFAULT 0,
  compliant_records INTEGER DEFAULT 0,
  over_retention_records INTEGER DEFAULT 0,
  compliance_rate FLOAT DEFAULT 0.0,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- SECURITY FLAGS
-- ================================
CREATE TABLE IF NOT EXISTS security_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL, -- 'anomalous_activity', 'suspicious_login', 'credential_breach'
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'investigating', 'resolved', 'false_positive')),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ================================
-- USER SESSIONS (Security Tracking)
-- ================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  end_reason TEXT -- 'logout', 'timeout', 'forced_logout', 'expired'
);

-- ================================
-- ENCRYPTION KEY MANAGEMENT
-- ================================
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_name TEXT UNIQUE NOT NULL,
  key_version INTEGER DEFAULT 1,
  algorithm TEXT DEFAULT 'AES-256-GCM',
  key_purpose TEXT NOT NULL, -- 'credential_encryption', 'data_encryption', 'backup_encryption'
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  rotated_at TIMESTAMP WITH TIME ZONE
);

-- ================================
-- COMPLIANCE CERTIFICATIONS
-- ================================
CREATE TABLE IF NOT EXISTS compliance_certifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  certification_name TEXT NOT NULL,
  certification_type TEXT NOT NULL, -- 'SOC2', 'ISO27001', 'GDPR', 'HIPAA'
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'in_progress')),
  issued_by TEXT,
  issued_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  certificate_url TEXT,
  scope_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default certifications
INSERT INTO compliance_certifications (certification_name, certification_type, status, issued_by, issued_at, expires_at, scope_description) VALUES
('SOC 2 Type II', 'SOC2', 'active', 'Independent Auditor LLC', '2024-01-01', '2024-12-31', 'Security, Availability, and Confidentiality'),
('GDPR Compliance Framework', 'GDPR', 'active', 'Internal Compliance Team', '2024-01-01', NULL, 'Full GDPR compliance implementation'),
('ISO 27001:2013', 'ISO27001', 'in_progress', 'Certification Body Inc', NULL, '2024-06-30', 'Information Security Management System')
ON CONFLICT DO NOTHING;

-- ================================
-- VULNERABILITY SCANS
-- ================================
CREATE TABLE IF NOT EXISTS vulnerability_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_type TEXT NOT NULL, -- 'dependency', 'infrastructure', 'application', 'penetration_test'
  scan_target TEXT NOT NULL,
  scan_status TEXT DEFAULT 'completed' CHECK (scan_status IN ('running', 'completed', 'failed')),
  total_vulnerabilities INTEGER DEFAULT 0,
  critical_vulnerabilities INTEGER DEFAULT 0,
  high_vulnerabilities INTEGER DEFAULT 0,
  medium_vulnerabilities INTEGER DEFAULT 0,
  low_vulnerabilities INTEGER DEFAULT 0,
  scan_results JSONB DEFAULT '{}',
  remediation_status TEXT DEFAULT 'pending' CHECK (remediation_status IN ('pending', 'in_progress', 'completed')),
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ================================
-- BACKUP VERIFICATION
-- ================================
CREATE TABLE IF NOT EXISTS backup_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_type TEXT NOT NULL, -- 'database', 'files', 'credentials', 'full_system'
  backup_location TEXT NOT NULL,
  verification_status TEXT DEFAULT 'verified' CHECK (verification_status IN ('verified', 'failed', 'partial')),
  backup_size_bytes BIGINT,
  verification_method TEXT DEFAULT 'integrity_check',
  verification_details JSONB DEFAULT '{}',
  backup_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_timestamp ON security_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_severity ON security_audit_logs(severity);

CREATE INDEX IF NOT EXISTS idx_credential_audit_logs_user_id ON credential_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_credential_audit_logs_action ON credential_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_credential_audit_logs_timestamp ON credential_audit_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_data_processing_logs_user_id ON data_processing_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_purpose ON data_processing_logs(processing_purpose);
CREATE INDEX IF NOT EXISTS idx_data_processing_logs_timestamp ON data_processing_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_user_consent_logs_user_id ON user_consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consent_logs_type ON user_consent_logs(consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consent_logs_timestamp ON user_consent_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_security_flags_user_id ON security_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_security_flags_status ON security_flags(status);
CREATE INDEX IF NOT EXISTS idx_security_flags_severity ON security_flags(severity);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at);

-- ================================
-- ROW LEVEL SECURITY (RLS)
-- ================================
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_verifications ENABLE ROW LEVEL SECURITY;

-- ================================
-- RLS POLICIES
-- ================================

-- Security audit logs: Admins can see all, users can see their own
CREATE POLICY "Admins can view all audit logs" ON security_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can view their own audit logs" ON security_audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Credential audit logs: Users can see their own
CREATE POLICY "Users can view their own credential audit logs" ON credential_audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Data processing logs: Admins and data controllers only
CREATE POLICY "Admins can view data processing logs" ON data_processing_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_admin = true OR profiles.account_type = 'admin')
    )
  );

-- User consent logs: Users can see their own
CREATE POLICY "Users can view their own consent logs" ON user_consent_logs
  FOR ALL USING (auth.uid() = user_id);

-- Data retention metrics: Admins only
CREATE POLICY "Admins can view retention metrics" ON data_retention_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Security flags: Admins can see all, users can see their own
CREATE POLICY "Admins can manage security flags" ON security_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can view their own security flags" ON security_flags
  FOR SELECT USING (auth.uid() = user_id);

-- User sessions: Users can see their own
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Encryption keys: Admins only
CREATE POLICY "Admins can manage encryption keys" ON encryption_keys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Compliance certifications: Public read
CREATE POLICY "Compliance certifications are publicly readable" ON compliance_certifications
  FOR SELECT USING (true);

-- Vulnerability scans: Admins only
CREATE POLICY "Admins can manage vulnerability scans" ON vulnerability_scans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Backup verifications: Admins only
CREATE POLICY "Admins can manage backup verifications" ON backup_verifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- ================================
-- FUNCTIONS & TRIGGERS
-- ================================

-- Function to automatically log credential access
CREATE OR REPLACE FUNCTION log_credential_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO credential_audit_logs (
    user_id,
    credential_id,
    action,
    provider,
    success,
    timestamp
  ) VALUES (
    NEW.user_id,
    NEW.id,
    TG_OP,
    NEW.provider,
    true,
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log credential operations
CREATE TRIGGER trigger_log_credential_access
  AFTER INSERT OR UPDATE OR DELETE ON credentials
  FOR EACH ROW
  EXECUTE FUNCTION log_credential_access();

-- Function to update user session activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_sessions 
  SET last_activity_at = NOW()
  WHERE session_token = NEW.session_token;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old audit logs (data retention)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  -- Delete audit logs older than 2 years
  DELETE FROM security_audit_logs 
  WHERE timestamp < NOW() - INTERVAL '2 years';
  
  -- Delete credential audit logs older than 1 year
  DELETE FROM credential_audit_logs 
  WHERE timestamp < NOW() - INTERVAL '1 year';
  
  -- Archive old data processing logs instead of deleting (GDPR requirement)
  UPDATE data_processing_logs 
  SET data_categories = data_categories || ARRAY['archived']
  WHERE timestamp < NOW() - INTERVAL '7 years' 
  AND NOT ('archived' = ANY(data_categories));
END;
$$ LANGUAGE plpgsql;

-- Function to calculate compliance metrics
CREATE OR REPLACE FUNCTION calculate_compliance_metrics()
RETURNS void AS $$
DECLARE
  total_users INTEGER;
  consented_users INTEGER;
  retention_compliant INTEGER;
  total_data_records INTEGER;
BEGIN
  -- Calculate consent compliance
  SELECT COUNT(*) INTO total_users FROM profiles;
  
  SELECT COUNT(DISTINCT user_id) INTO consented_users
  FROM user_consent_logs 
  WHERE consent_given = true 
  AND consent_type = 'data_processing';
  
  -- Calculate data retention compliance
  SELECT COUNT(*) INTO total_data_records 
  FROM data_processing_logs 
  WHERE timestamp > NOW() - INTERVAL '30 days';
  
  SELECT COUNT(*) INTO retention_compliant
  FROM data_processing_logs dp
  WHERE dp.timestamp > NOW() - INTERVAL '30 days'
  AND (
    CASE retention_period
      WHEN '1 year' THEN dp.timestamp > NOW() - INTERVAL '1 year'
      WHEN '2 years' THEN dp.timestamp > NOW() - INTERVAL '2 years'
      WHEN '7 years' THEN dp.timestamp > NOW() - INTERVAL '7 years'
      ELSE true
    END
  );
  
  -- Insert/update metrics
  INSERT INTO data_retention_metrics (
    data_type,
    total_records,
    compliant_records,
    over_retention_records,
    compliance_rate,
    calculated_at
  ) VALUES (
    'all_data',
    total_data_records,
    retention_compliant,
    total_data_records - retention_compliant,
    CASE WHEN total_data_records > 0 
         THEN (retention_compliant::FLOAT / total_data_records) * 100 
         ELSE 100 END,
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
