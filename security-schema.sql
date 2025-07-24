-- AgentFlow.AI Security & Compliance Database Schema
-- Chunk 8: Security monitoring, audit trails, compliance tracking

-- Security Audit Logs
CREATE TABLE security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL, -- 'login', 'logout', 'permission_change', 'data_access', 'api_key_usage'
  event_category VARCHAR(50) NOT NULL, -- 'authentication', 'authorization', 'data_access', 'configuration'
  user_id UUID,
  target_user_id UUID, -- For admin actions on other users
  resource_type VARCHAR(100), -- 'user', 'agent', 'integration', 'api_key'
  resource_id UUID,
  action VARCHAR(100) NOT NULL, -- 'create', 'read', 'update', 'delete', 'execute'
  outcome VARCHAR(20) NOT NULL, -- 'success', 'failure', 'blocked'
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(100),
  request_id VARCHAR(100),
  details JSONB DEFAULT '{}', -- Additional context about the action
  risk_score INTEGER DEFAULT 0, -- 0-100 risk assessment
  flagged_by_system BOOLEAN DEFAULT FALSE,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API Security Monitoring
CREATE TABLE api_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID,
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  rate_limit_exceeded BOOLEAN DEFAULT FALSE,
  suspicious_activity BOOLEAN DEFAULT FALSE,
  blocked BOOLEAN DEFAULT FALSE,
  reason TEXT, -- Why it was blocked or flagged
  request_size_bytes INTEGER,
  response_status INTEGER,
  response_time_ms INTEGER,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Data Access Monitoring
CREATE TABLE data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  data_type VARCHAR(100) NOT NULL, -- 'user_data', 'agent_data', 'conversation', 'integration_config'
  data_id UUID,
  access_type VARCHAR(50) NOT NULL, -- 'read', 'write', 'delete', 'export', 'share'
  query_details TEXT, -- SQL query or API endpoint accessed
  row_count INTEGER, -- Number of records accessed
  sensitive_data_accessed BOOLEAN DEFAULT FALSE,
  export_format VARCHAR(50), -- 'json', 'csv', 'pdf' for exports
  file_path VARCHAR(500), -- For file exports
  compliance_tags TEXT[], -- ['pii', 'gdpr', 'hipaa', 'financial']
  data_classification VARCHAR(50) DEFAULT 'internal', -- 'public', 'internal', 'confidential', 'restricted'
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(100),
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Compliance Frameworks and Requirements
CREATE TABLE compliance_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- 'GDPR', 'HIPAA', 'SOC2', 'ISO27001', 'CCPA'
  version VARCHAR(20),
  description TEXT,
  requirements JSONB NOT NULL DEFAULT '[]', -- Array of requirement objects
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Compliance Assessments
CREATE TABLE compliance_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES compliance_frameworks(id),
  assessment_name VARCHAR(200) NOT NULL,
  assessor_id UUID NOT NULL,
  assessment_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'in_progress', -- 'planned', 'in_progress', 'completed', 'failed'
  score INTEGER, -- Overall compliance score 0-100
  findings JSONB DEFAULT '[]', -- Array of finding objects
  recommendations JSONB DEFAULT '[]',
  remediation_plan JSONB DEFAULT '{}',
  next_assessment_date DATE,
  evidence_files TEXT[], -- Paths to evidence documents
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Security Incidents
CREATE TABLE security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type VARCHAR(100) NOT NULL, -- 'data_breach', 'unauthorized_access', 'malware', 'ddos', 'phishing'
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'investigating', 'contained', 'resolved', 'closed'
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  detected_by VARCHAR(100), -- 'system', 'user', 'external', 'monitoring'
  detection_method VARCHAR(100), -- 'automated', 'manual', 'third_party'
  affected_systems TEXT[], -- List of affected systems
  affected_users TEXT[], -- List of affected user IDs
  data_compromised BOOLEAN DEFAULT FALSE,
  data_types_affected TEXT[], -- Types of data potentially compromised
  estimated_impact VARCHAR(100),
  timeline JSONB DEFAULT '[]', -- Array of timeline events
  evidence JSONB DEFAULT '{}',
  containment_actions JSONB DEFAULT '[]',
  eradication_actions JSONB DEFAULT '[]',
  recovery_actions JSONB DEFAULT '[]',
  lessons_learned TEXT,
  reported_to_authorities BOOLEAN DEFAULT FALSE,
  regulatory_notifications JSONB DEFAULT '{}',
  assigned_to UUID,
  detected_at TIMESTAMP NOT NULL,
  contained_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User Permission Changes
CREATE TABLE permission_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  change_type VARCHAR(50) NOT NULL, -- 'role_change', 'permission_grant', 'permission_revoke', 'group_add', 'group_remove'
  previous_state JSONB,
  new_state JSONB,
  reason TEXT,
  approval_required BOOLEAN DEFAULT FALSE,
  approved_by UUID,
  approved_at TIMESTAMP,
  effective_date TIMESTAMP DEFAULT NOW(),
  expiry_date TIMESTAMP, -- For temporary permissions
  created_at TIMESTAMP DEFAULT NOW()
);

-- Data Retention Policies
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name VARCHAR(200) NOT NULL,
  data_type VARCHAR(100) NOT NULL, -- 'user_data', 'audit_logs', 'conversations', 'analytics'
  retention_period_days INTEGER NOT NULL,
  auto_delete BOOLEAN DEFAULT TRUE,
  legal_hold_override BOOLEAN DEFAULT FALSE,
  compliance_requirements TEXT[], -- Which frameworks require this retention
  policy_document_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL,
  approved_by UUID,
  effective_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Data Deletion Records
CREATE TABLE data_deletion_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deletion_type VARCHAR(50) NOT NULL, -- 'user_request', 'retention_policy', 'legal_order', 'manual'
  data_type VARCHAR(100) NOT NULL,
  data_id UUID,
  user_id UUID, -- User whose data was deleted
  requested_by UUID, -- Who requested the deletion
  approved_by UUID, -- Who approved the deletion
  deletion_reason TEXT,
  legal_basis VARCHAR(100), -- GDPR Article, etc.
  records_deleted INTEGER,
  files_deleted TEXT[], -- Paths to deleted files
  backup_locations TEXT[], -- Where backups need to be cleaned
  verification_hash VARCHAR(64), -- Hash to verify deletion
  completed BOOLEAN DEFAULT FALSE,
  scheduled_for TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Encryption Key Management
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name VARCHAR(100) NOT NULL,
  key_type VARCHAR(50) NOT NULL, -- 'aes256', 'rsa2048', 'rsa4096', 'ed25519'
  purpose VARCHAR(100) NOT NULL, -- 'data_encryption', 'api_signing', 'jwt_signing'
  key_fingerprint VARCHAR(128) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  rotation_frequency_days INTEGER DEFAULT 90,
  last_rotated TIMESTAMP DEFAULT NOW(),
  next_rotation TIMESTAMP,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  deactivated_at TIMESTAMP
);

-- Privacy Impact Assessments (PIA)
CREATE TABLE privacy_impact_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name VARCHAR(200) NOT NULL,
  project_description TEXT,
  data_controller UUID NOT NULL, -- User responsible for the data
  data_processor UUID, -- If different from controller
  data_types_processed TEXT[] NOT NULL,
  processing_purposes TEXT[] NOT NULL,
  legal_basis VARCHAR(100), -- GDPR legal basis
  data_sources TEXT[],
  data_sharing JSONB DEFAULT '{}', -- Details about data sharing
  retention_period VARCHAR(100),
  security_measures JSONB DEFAULT '[]',
  privacy_risks JSONB DEFAULT '[]',
  mitigation_measures JSONB DEFAULT '[]',
  dpo_review_required BOOLEAN DEFAULT FALSE,
  dpo_reviewed BOOLEAN DEFAULT FALSE,
  dpo_reviewed_by UUID,
  dpo_reviewed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'review', 'approved', 'rejected'
  approved_by UUID,
  approved_at TIMESTAMP,
  review_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Threat Intelligence
CREATE TABLE threat_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_type VARCHAR(100) NOT NULL, -- 'malware', 'ip_reputation', 'domain_reputation', 'vulnerability'
  indicator VARCHAR(500) NOT NULL, -- IP, domain, hash, etc.
  indicator_type VARCHAR(50) NOT NULL, -- 'ip', 'domain', 'url', 'file_hash', 'email'
  threat_level VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  confidence_score INTEGER NOT NULL, -- 0-100
  source VARCHAR(100) NOT NULL, -- 'internal', 'commercial', 'open_source', 'government'
  description TEXT,
  first_seen TIMESTAMP NOT NULL,
  last_seen TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  tags TEXT[],
  tlp_marking VARCHAR(20) DEFAULT 'white', -- Traffic Light Protocol
  related_incidents UUID[], -- Array of related incident IDs
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for security and performance
CREATE INDEX idx_security_audit_logs_user_time ON security_audit_logs(user_id, created_at);
CREATE INDEX idx_security_audit_logs_event_type ON security_audit_logs(event_type, created_at);
CREATE INDEX idx_security_audit_logs_outcome ON security_audit_logs(outcome, created_at);
CREATE INDEX idx_security_audit_logs_risk_score ON security_audit_logs(risk_score DESC, created_at);
CREATE INDEX idx_security_audit_logs_flagged ON security_audit_logs(flagged_by_system, created_at);

CREATE INDEX idx_api_security_events_ip ON api_security_events(ip_address, timestamp);
CREATE INDEX idx_api_security_events_api_key ON api_security_events(api_key_id, timestamp);
CREATE INDEX idx_api_security_events_suspicious ON api_security_events(suspicious_activity, timestamp);
CREATE INDEX idx_api_security_events_blocked ON api_security_events(blocked, timestamp);

CREATE INDEX idx_data_access_logs_user_time ON data_access_logs(user_id, timestamp);
CREATE INDEX idx_data_access_logs_data_type ON data_access_logs(data_type, timestamp);
CREATE INDEX idx_data_access_logs_sensitive ON data_access_logs(sensitive_data_accessed, timestamp);
CREATE INDEX idx_data_access_logs_compliance ON data_access_logs USING GIN(compliance_tags);

CREATE INDEX idx_security_incidents_status ON security_incidents(status, created_at);
CREATE INDEX idx_security_incidents_severity ON security_incidents(severity, detected_at);
CREATE INDEX idx_security_incidents_type ON security_incidents(incident_type, detected_at);

CREATE INDEX idx_permission_changes_user ON permission_changes(user_id, created_at);
CREATE INDEX idx_permission_changes_changed_by ON permission_changes(changed_by, created_at);

CREATE INDEX idx_data_deletion_records_user ON data_deletion_records(user_id, created_at);
CREATE INDEX idx_data_deletion_records_type ON data_deletion_records(deletion_type, created_at);
CREATE INDEX idx_data_deletion_records_completed ON data_deletion_records(completed, scheduled_for);

CREATE INDEX idx_threat_intelligence_indicator ON threat_intelligence(indicator);
CREATE INDEX idx_threat_intelligence_type_level ON threat_intelligence(threat_type, threat_level);
CREATE INDEX idx_threat_intelligence_active ON threat_intelligence(is_active, last_seen);

-- Security functions
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type VARCHAR(100),
  p_event_category VARCHAR(50),
  p_user_id UUID,
  p_action VARCHAR(100),
  p_outcome VARCHAR(20),
  p_ip_address INET DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
  risk_score INTEGER := 0;
BEGIN
  -- Calculate risk score based on various factors
  CASE 
    WHEN p_outcome = 'failure' THEN risk_score := risk_score + 30;
    WHEN p_event_type = 'login' AND p_outcome = 'failure' THEN risk_score := risk_score + 20;
    WHEN p_action = 'delete' THEN risk_score := risk_score + 15;
    WHEN p_event_category = 'configuration' THEN risk_score := risk_score + 10;
  END CASE;

  INSERT INTO security_audit_logs (
    event_type, event_category, user_id, action, outcome, 
    ip_address, details, risk_score
  ) VALUES (
    p_event_type, p_event_category, p_user_id, p_action, p_outcome,
    p_ip_address, p_details, risk_score
  ) RETURNING id INTO audit_id;

  -- Flag high-risk events for review
  IF risk_score > 50 THEN
    UPDATE security_audit_logs 
    SET flagged_by_system = TRUE 
    WHERE id = audit_id;
  END IF;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_suspicious_activity()
RETURNS void AS $$
DECLARE
  suspicious_threshold INTEGER := 5;
BEGIN
  -- Flag users with multiple failed login attempts
  UPDATE security_audit_logs 
  SET flagged_by_system = TRUE
  WHERE id IN (
    SELECT DISTINCT ON (user_id) id
    FROM security_audit_logs 
    WHERE event_type = 'login' 
      AND outcome = 'failure'
      AND created_at > NOW() - INTERVAL '1 hour'
    GROUP BY user_id
    HAVING COUNT(*) >= suspicious_threshold
  );

  -- Flag unusual data access patterns
  UPDATE data_access_logs 
  SET sensitive_data_accessed = TRUE
  WHERE user_id IN (
    SELECT user_id
    FROM data_access_logs
    WHERE timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY user_id
    HAVING COUNT(*) > 100 -- More than 100 data accesses in an hour
  );
END;
$$ LANGUAGE plpgsql;

-- Sample compliance frameworks
INSERT INTO compliance_frameworks (name, version, description, requirements) VALUES 
('GDPR', '2018', 'General Data Protection Regulation', '[
  {"id": "art6", "title": "Lawful basis for processing", "description": "Processing must have a legal basis"},
  {"id": "art7", "title": "Conditions for consent", "description": "Clear and specific consent requirements"},
  {"id": "art17", "title": "Right to erasure", "description": "Data subjects can request deletion"},
  {"id": "art25", "title": "Data protection by design", "description": "Privacy by design implementation"},
  {"id": "art32", "title": "Security of processing", "description": "Appropriate technical measures"}
]'),
('SOC2', 'Type II', 'Service Organization Control 2', '[
  {"id": "cc1", "title": "Control Environment", "description": "Establish control environment"},
  {"id": "cc2", "title": "Communication", "description": "Information and communication"},
  {"id": "cc3", "title": "Risk Assessment", "description": "Risk assessment process"},
  {"id": "cc4", "title": "Monitoring", "description": "Monitoring activities"},
  {"id": "cc5", "title": "Control Activities", "description": "Control activities"}
]'),
('HIPAA', '2013', 'Health Insurance Portability and Accountability Act', '[
  {"id": "164.308", "title": "Administrative Safeguards", "description": "Administrative security measures"},
  {"id": "164.310", "title": "Physical Safeguards", "description": "Physical access controls"},
  {"id": "164.312", "title": "Technical Safeguards", "description": "Technical access controls"},
  {"id": "164.314", "title": "Organizational Requirements", "description": "Business associate agreements"}
]');

-- Sample data retention policies
INSERT INTO data_retention_policies (policy_name, data_type, retention_period_days, compliance_requirements, created_by) VALUES 
('User Account Data Retention', 'user_data', 2555, ARRAY['GDPR', 'CCPA'], '550e8400-e29b-41d4-a716-446655440000'),
('Audit Log Retention', 'audit_logs', 2555, ARRAY['SOC2', 'ISO27001'], '550e8400-e29b-41d4-a716-446655440000'),
('Conversation Data Retention', 'conversations', 365, ARRAY['GDPR'], '550e8400-e29b-41d4-a716-446655440000'),
('Analytics Data Retention', 'analytics', 1095, ARRAY['GDPR'], '550e8400-e29b-41d4-a716-446655440000');

-- Sample encryption keys
INSERT INTO encryption_keys (key_name, key_type, purpose, key_fingerprint, created_by) VALUES 
('primary-data-encryption', 'aes256', 'data_encryption', 'sha256:a1b2c3d4e5f6...', '550e8400-e29b-41d4-a716-446655440000'),
('api-signing-key', 'rsa2048', 'api_signing', 'sha256:f6e5d4c3b2a1...', '550e8400-e29b-41d4-a716-446655440000'),
('jwt-signing-key', 'ed25519', 'jwt_signing', 'sha256:1a2b3c4d5e6f...', '550e8400-e29b-41d4-a716-446655440000');

-- Sample threat intelligence
INSERT INTO threat_intelligence (threat_type, indicator, indicator_type, threat_level, confidence_score, source, description, first_seen, last_seen) VALUES 
('ip_reputation', '192.168.1.100', 'ip', 'high', 85, 'commercial', 'Known malicious IP address', NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day'),
('domain_reputation', 'malicious-site.com', 'domain', 'critical', 95, 'government', 'C2 domain for APT group', NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days'),
('malware', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'file_hash', 'medium', 70, 'open_source', 'Suspicious file hash', NOW() - INTERVAL '14 days', NOW() - INTERVAL '5 days');
