-- Agent Upload & Validation System
-- Handles agent uploads, validation, publishing, and version management

-- Agent Upload Sessions
CREATE TABLE IF NOT EXISTS agent_upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  upload_type VARCHAR(20) DEFAULT 'json', -- 'json', 'n8n_workflow', 'zip'
  original_filename TEXT,
  file_size INTEGER,
  file_path TEXT, -- Where the uploaded file is stored
  upload_status VARCHAR(20) DEFAULT 'uploading', -- 'uploading', 'uploaded', 'validating', 'validated', 'failed', 'published'
  validation_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'passed', 'failed'
  validation_errors JSONB DEFAULT '[]',
  validation_warnings JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}', -- Store extracted agent metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Agent Validation Rules
CREATE TABLE IF NOT EXISTS agent_validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(100) NOT NULL UNIQUE,
  rule_type VARCHAR(50) NOT NULL, -- 'required_field', 'format_check', 'security_check', 'api_validation'
  rule_category VARCHAR(50) NOT NULL, -- 'structure', 'security', 'performance', 'compatibility'
  severity VARCHAR(20) DEFAULT 'error', -- 'error', 'warning', 'info'
  description TEXT NOT NULL,
  validation_logic JSONB NOT NULL, -- JSON defining the validation logic
  error_message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  applies_to TEXT[] DEFAULT ARRAY['json', 'n8n_workflow'], -- Upload types this rule applies to
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Version History
CREATE TABLE IF NOT EXISTS agent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL,
  version_number VARCHAR(20) NOT NULL, -- '1.0.0', '1.1.0', etc.
  version_type VARCHAR(20) DEFAULT 'minor', -- 'major', 'minor', 'patch', 'beta', 'alpha'
  changelog TEXT,
  agent_data JSONB NOT NULL, -- Complete agent configuration
  validation_results JSONB DEFAULT '{}',
  upload_session_id UUID REFERENCES agent_upload_sessions(id),
  is_published BOOLEAN DEFAULT FALSE,
  is_latest BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, version_number)
);

-- Agent Publication Queue
CREATE TABLE IF NOT EXISTS agent_publication_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL,
  version_id UUID NOT NULL REFERENCES agent_versions(id),
  publication_type VARCHAR(20) DEFAULT 'update', -- 'new', 'update', 'patch'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'published', 'failed', 'cancelled'
  priority INTEGER DEFAULT 5, -- 1-10, higher = more priority
  scheduled_for TIMESTAMP WITH TIME ZONE,
  processing_started TIMESTAMP WITH TIME ZONE,
  processing_completed TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Upload Statistics
CREATE TABLE IF NOT EXISTS agent_upload_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  upload_session_id UUID REFERENCES agent_upload_sessions(id),
  agent_id UUID,
  event_type VARCHAR(50) NOT NULL, -- 'upload_started', 'validation_completed', 'published', 'download'
  file_size INTEGER,
  processing_time_ms INTEGER,
  validation_errors_count INTEGER DEFAULT 0,
  validation_warnings_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Templates (for validation and scaffolding)
CREATE TABLE IF NOT EXISTS agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  template_type VARCHAR(50) NOT NULL, -- 'basic', 'api', 'automation', 'data_processing'
  category VARCHAR(50), -- 'productivity', 'marketing', 'development', etc.
  template_data JSONB NOT NULL, -- The template structure
  validation_rules UUID[] DEFAULT '{}', -- References to validation_rules
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_upload_sessions_user_id ON agent_upload_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_upload_sessions_status ON agent_upload_sessions(upload_status);
CREATE INDEX IF NOT EXISTS idx_agent_versions_agent_id ON agent_versions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_versions_latest ON agent_versions(agent_id, is_latest) WHERE is_latest = true;
CREATE INDEX IF NOT EXISTS idx_agent_publication_queue_status ON agent_publication_queue(status);
CREATE INDEX IF NOT EXISTS idx_agent_publication_queue_priority ON agent_publication_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_upload_stats_user_id ON agent_upload_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_upload_stats_timestamp ON agent_upload_stats(timestamp);

-- PostgreSQL Functions for Agent Upload Management

-- Function to start agent upload session
CREATE OR REPLACE FUNCTION start_agent_upload_session(
  p_user_id UUID,
  p_upload_type VARCHAR(20),
  p_filename TEXT,
  p_file_size INTEGER
)
RETURNS UUID AS $$
DECLARE
  session_id UUID;
BEGIN
  INSERT INTO agent_upload_sessions (
    user_id, upload_type, original_filename, file_size, upload_status
  )
  VALUES (
    p_user_id, p_upload_type, p_filename, p_file_size, 'uploading'
  )
  RETURNING id INTO session_id;
  
  -- Log upload started
  INSERT INTO agent_upload_stats (
    user_id, upload_session_id, event_type, file_size
  )
  VALUES (
    p_user_id, session_id, 'upload_started', p_file_size
  );
  
  RETURN session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate agent structure
CREATE OR REPLACE FUNCTION validate_agent_structure(
  p_session_id UUID,
  p_agent_data JSONB
)
RETURNS TABLE(
  is_valid BOOLEAN,
  errors JSONB,
  warnings JSONB
) AS $$
DECLARE
  validation_errors JSONB := '[]'::jsonb;
  validation_warnings JSONB := '[]'::jsonb;
  rule_record RECORD;
  is_valid_result BOOLEAN := TRUE;
BEGIN
  -- Get all active validation rules
  FOR rule_record IN 
    SELECT * FROM agent_validation_rules 
    WHERE is_active = TRUE
  LOOP
    -- Basic validation logic (simplified - would be more complex in reality)
    CASE rule_record.rule_type
      WHEN 'required_field' THEN
        IF NOT (p_agent_data ? (rule_record.validation_logic->>'field_name')) THEN
          IF rule_record.severity = 'error' THEN
            validation_errors := validation_errors || jsonb_build_object(
              'rule', rule_record.rule_name,
              'message', rule_record.error_message,
              'severity', rule_record.severity
            );
            is_valid_result := FALSE;
          ELSE
            validation_warnings := validation_warnings || jsonb_build_object(
              'rule', rule_record.rule_name,
              'message', rule_record.error_message,
              'severity', rule_record.severity
            );
          END IF;
        END IF;
      
      WHEN 'format_check' THEN
        -- Check specific field formats
        CONTINUE; -- Placeholder for format validation
      
      WHEN 'security_check' THEN
        -- Check for security issues
        CONTINUE; -- Placeholder for security validation
    END CASE;
  END LOOP;
  
  -- Update session with validation results
  UPDATE agent_upload_sessions 
  SET 
    validation_status = CASE WHEN is_valid_result THEN 'passed' ELSE 'failed' END,
    validation_errors = validation_errors,
    validation_warnings = validation_warnings,
    metadata = metadata || jsonb_build_object('validated_at', NOW()),
    updated_at = NOW()
  WHERE id = p_session_id;
  
  RETURN QUERY SELECT is_valid_result, validation_errors, validation_warnings;
END;
$$ LANGUAGE plpgsql;

-- Function to create agent version
CREATE OR REPLACE FUNCTION create_agent_version(
  p_agent_id UUID,
  p_user_id UUID,
  p_version_number VARCHAR(20),
  p_agent_data JSONB,
  p_upload_session_id UUID,
  p_changelog TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  version_id UUID;
BEGIN
  -- Mark previous versions as not latest
  UPDATE agent_versions 
  SET is_latest = FALSE 
  WHERE agent_id = p_agent_id;
  
  -- Create new version
  INSERT INTO agent_versions (
    agent_id, user_id, version_number, agent_data, 
    upload_session_id, changelog, is_latest
  )
  VALUES (
    p_agent_id, p_user_id, p_version_number, p_agent_data,
    p_upload_session_id, p_changelog, TRUE
  )
  RETURNING id INTO version_id;
  
  -- Add to publication queue
  INSERT INTO agent_publication_queue (
    agent_id, user_id, version_id, publication_type
  )
  VALUES (
    p_agent_id, p_user_id, version_id, 'update'
  );
  
  RETURN version_id;
END;
$$ LANGUAGE plpgsql;

-- Function to publish agent version
CREATE OR REPLACE FUNCTION publish_agent_version(p_version_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  version_record RECORD;
BEGIN
  -- Get version details
  SELECT * INTO version_record
  FROM agent_versions
  WHERE id = p_version_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Mark version as published
  UPDATE agent_versions 
  SET is_published = TRUE
  WHERE id = p_version_id;
  
  -- Update publication queue
  UPDATE agent_publication_queue
  SET 
    status = 'published',
    processing_completed = NOW()
  WHERE version_id = p_version_id;
  
  -- Log publication
  INSERT INTO agent_upload_stats (
    user_id, agent_id, event_type, metadata
  )
  VALUES (
    version_record.user_id, 
    version_record.agent_id, 
    'published',
    jsonb_build_object('version_id', p_version_id, 'version', version_record.version_number)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get agent upload progress
CREATE OR REPLACE FUNCTION get_upload_progress(p_session_id UUID)
RETURNS TABLE(
  upload_status VARCHAR(20),
  validation_status VARCHAR(20),
  progress_percentage INTEGER,
  current_step TEXT,
  errors JSONB,
  warnings JSONB
) AS $$
DECLARE
  session_record RECORD;
  progress_pct INTEGER;
  current_step_text TEXT;
BEGIN
  SELECT * INTO session_record
  FROM agent_upload_sessions
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate progress percentage
  CASE session_record.upload_status
    WHEN 'uploading' THEN 
      progress_pct := 20;
      current_step_text := 'Uploading file...';
    WHEN 'uploaded' THEN 
      progress_pct := 40;
      current_step_text := 'File uploaded successfully';
    WHEN 'validating' THEN 
      progress_pct := 60;
      current_step_text := 'Validating agent structure...';
    WHEN 'validated' THEN 
      progress_pct := 80;
      current_step_text := 'Validation completed';
    WHEN 'published' THEN 
      progress_pct := 100;
      current_step_text := 'Agent published successfully';
    WHEN 'failed' THEN 
      progress_pct := 0;
      current_step_text := 'Upload failed';
    ELSE 
      progress_pct := 0;
      current_step_text := 'Unknown status';
  END CASE;
  
  RETURN QUERY SELECT 
    session_record.upload_status,
    session_record.validation_status,
    progress_pct,
    current_step_text,
    session_record.validation_errors,
    session_record.validation_warnings;
END;
$$ LANGUAGE plpgsql;

-- Insert default validation rules
INSERT INTO agent_validation_rules (rule_name, rule_type, rule_category, severity, description, validation_logic, error_message, applies_to) VALUES
('required_name', 'required_field', 'structure', 'error', 'Agent must have a name', '{"field_name": "name"}', 'Agent name is required', ARRAY['json', 'n8n_workflow']),
('required_description', 'required_field', 'structure', 'error', 'Agent must have a description', '{"field_name": "description"}', 'Agent description is required', ARRAY['json', 'n8n_workflow']),
('required_version', 'required_field', 'structure', 'error', 'Agent must specify a version', '{"field_name": "version"}', 'Agent version is required', ARRAY['json']),
('required_nodes', 'required_field', 'structure', 'error', 'Agent must have workflow nodes', '{"field_name": "nodes"}', 'Agent must contain workflow nodes', ARRAY['json', 'n8n_workflow']),
('name_length', 'format_check', 'structure', 'error', 'Agent name must be 3-100 characters', '{"field": "name", "min_length": 3, "max_length": 100}', 'Agent name must be between 3 and 100 characters', ARRAY['json', 'n8n_workflow']),
('description_length', 'format_check', 'structure', 'warning', 'Agent description should be at least 20 characters', '{"field": "description", "min_length": 20}', 'Agent description should be more descriptive (at least 20 characters)', ARRAY['json', 'n8n_workflow']),
('no_credentials_exposed', 'security_check', 'security', 'error', 'Agent must not contain exposed credentials', '{"check_fields": ["password", "api_key", "secret", "token"]}', 'Agent contains exposed credentials - please use environment variables', ARRAY['json', 'n8n_workflow']),
('webhook_security', 'security_check', 'security', 'warning', 'Webhook nodes should use authentication', '{"node_type": "webhook", "check_auth": true}', 'Webhook nodes should implement authentication for security', ARRAY['json', 'n8n_workflow'])

ON CONFLICT (rule_name) DO UPDATE SET
  description = EXCLUDED.description,
  validation_logic = EXCLUDED.validation_logic,
  error_message = EXCLUDED.error_message,
  updated_at = NOW();

-- Insert default agent templates
INSERT INTO agent_templates (name, description, template_type, category, template_data) VALUES
('Basic API Agent', 'Template for creating API-based automation agents', 'api', 'productivity', '{
  "name": "My API Agent",
  "description": "This agent calls an API and processes the response",
  "version": "1.0.0",
  "nodes": [
    {
      "id": "webhook",
      "type": "webhook",
      "name": "Webhook Trigger",
      "position": {"x": 100, "y": 100}
    },
    {
      "id": "http",
      "type": "http",
      "name": "API Call",
      "position": {"x": 300, "y": 100}
    },
    {
      "id": "response",
      "type": "response",
      "name": "Return Response",
      "position": {"x": 500, "y": 100}
    }
  ],
  "connections": [
    {"source": "webhook", "target": "http"},
    {"source": "http", "target": "response"}
  ]
}'),

('Data Processing Agent', 'Template for data transformation and processing', 'data_processing', 'productivity', '{
  "name": "Data Processor",
  "description": "This agent processes and transforms data",
  "version": "1.0.0",
  "nodes": [
    {
      "id": "trigger",
      "type": "manual_trigger",
      "name": "Manual Trigger",
      "position": {"x": 100, "y": 100}
    },
    {
      "id": "function",
      "type": "function",
      "name": "Process Data",
      "position": {"x": 300, "y": 100}
    },
    {
      "id": "output",
      "type": "set",
      "name": "Set Output",
      "position": {"x": 500, "y": 100}
    }
  ],
  "connections": [
    {"source": "trigger", "target": "function"},
    {"source": "function", "target": "output"}
  ]
}')

ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  template_data = EXCLUDED.template_data,
  updated_at = NOW();
