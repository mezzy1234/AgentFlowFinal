-- Agent Test Mode System
-- Handles agent testing, simulation, and preview functionality

-- Agent Test Sessions
CREATE TABLE IF NOT EXISTS agent_test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID, -- NULL for uploaded/draft agents
  upload_session_id UUID REFERENCES agent_upload_sessions(id), -- For testing uploads
  agent_data JSONB NOT NULL, -- The agent configuration being tested
  test_name VARCHAR(100),
  test_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'automated', 'scenario'
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'failed', 'paused'
  test_environment VARCHAR(20) DEFAULT 'sandbox', -- 'sandbox', 'staging'
  webhook_url TEXT, -- Test webhook URL
  test_token VARCHAR(100), -- For authenticated testing
  max_executions INTEGER DEFAULT 10, -- Limit test executions
  executions_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 hours'),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Test Executions
CREATE TABLE IF NOT EXISTS agent_test_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_session_id UUID NOT NULL REFERENCES agent_test_sessions(id),
  execution_id VARCHAR(100), -- From n8n or execution system
  trigger_type VARCHAR(50) NOT NULL, -- 'webhook', 'manual', 'scheduled', 'api'
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  execution_status VARCHAR(20) DEFAULT 'running', -- 'running', 'success', 'failed', 'timeout'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  steps_executed INTEGER DEFAULT 0,
  steps_total INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}' -- Store execution context, user agent, etc.
);

-- Agent Test Scenarios
CREATE TABLE IF NOT EXISTS agent_test_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  scenario_type VARCHAR(50) NOT NULL, -- 'api_test', 'webhook_test', 'integration_test', 'performance_test'
  agent_categories TEXT[] DEFAULT '{}', -- Which agent types this applies to
  test_data JSONB NOT NULL, -- Test inputs and expected outputs
  validation_rules JSONB DEFAULT '[]', -- Rules to validate test results
  is_default BOOLEAN DEFAULT FALSE, -- Default scenarios for new agents
  created_by UUID,
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage of successful tests
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Performance Metrics (collected during testing)
CREATE TABLE IF NOT EXISTS agent_test_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_session_id UUID NOT NULL REFERENCES agent_test_sessions(id),
  execution_id UUID REFERENCES agent_test_executions(id),
  metric_name VARCHAR(50) NOT NULL, -- 'response_time', 'memory_usage', 'cpu_usage', 'api_calls'
  metric_value DECIMAL(10,2) NOT NULL,
  metric_unit VARCHAR(20), -- 'ms', 'mb', 'percent', 'count'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Agent Test Feedback
CREATE TABLE IF NOT EXISTS agent_test_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_session_id UUID NOT NULL REFERENCES agent_test_sessions(id),
  user_id UUID NOT NULL,
  feedback_type VARCHAR(20) DEFAULT 'general', -- 'general', 'bug_report', 'feature_request', 'performance'
  rating INTEGER, -- 1-5 stars
  feedback_text TEXT,
  suggestions JSONB DEFAULT '[]',
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Environment Configuration
CREATE TABLE IF NOT EXISTS test_environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  base_url TEXT NOT NULL, -- Base URL for this environment
  webhook_proxy_url TEXT, -- Webhook proxy endpoint
  api_rate_limits JSONB DEFAULT '{}', -- Rate limits for this environment
  environment_variables JSONB DEFAULT '{}', -- Test environment variables
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_test_sessions_user_id ON agent_test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_test_sessions_status ON agent_test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_test_executions_session_id ON agent_test_executions(test_session_id);
CREATE INDEX IF NOT EXISTS idx_agent_test_executions_status ON agent_test_executions(execution_status);
CREATE INDEX IF NOT EXISTS idx_agent_test_metrics_session_id ON agent_test_metrics(test_session_id);
CREATE INDEX IF NOT EXISTS idx_agent_test_metrics_timestamp ON agent_test_metrics(timestamp);

-- PostgreSQL Functions for Agent Testing

-- Function to start agent test session
CREATE OR REPLACE FUNCTION start_agent_test_session(
  p_user_id UUID,
  p_agent_data JSONB,
  p_test_name VARCHAR(100) DEFAULT NULL,
  p_test_type VARCHAR(50) DEFAULT 'manual',
  p_agent_id UUID DEFAULT NULL,
  p_upload_session_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  session_id UUID;
  test_webhook_url TEXT;
  test_token VARCHAR(100);
BEGIN
  -- Generate test webhook URL and token
  test_webhook_url := 'https://api.agentflow.ai/test/webhook/' || gen_random_uuid();
  test_token := encode(gen_random_bytes(32), 'base64');
  
  -- Create test session
  INSERT INTO agent_test_sessions (
    user_id, agent_id, upload_session_id, agent_data, test_name, 
    test_type, webhook_url, test_token
  )
  VALUES (
    p_user_id, p_agent_id, p_upload_session_id, p_agent_data, 
    p_test_name, p_test_type, test_webhook_url, test_token
  )
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record test execution
CREATE OR REPLACE FUNCTION record_test_execution(
  p_session_id UUID,
  p_execution_id VARCHAR(100),
  p_trigger_type VARCHAR(50),
  p_input_data JSONB DEFAULT '{}',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  execution_uuid UUID;
BEGIN
  -- Check if session exists and is active
  IF NOT EXISTS(
    SELECT 1 FROM agent_test_sessions 
    WHERE id = p_session_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Test session not found or not active';
  END IF;
  
  -- Check execution limit
  IF (
    SELECT executions_count FROM agent_test_sessions WHERE id = p_session_id
  ) >= (
    SELECT max_executions FROM agent_test_sessions WHERE id = p_session_id
  ) THEN
    RAISE EXCEPTION 'Maximum test executions reached';
  END IF;
  
  -- Create execution record
  INSERT INTO agent_test_executions (
    test_session_id, execution_id, trigger_type, input_data, metadata
  )
  VALUES (
    p_session_id, p_execution_id, p_trigger_type, p_input_data, p_metadata
  )
  RETURNING id INTO execution_uuid;
  
  -- Increment execution count
  UPDATE agent_test_sessions 
  SET executions_count = executions_count + 1
  WHERE id = p_session_id;
  
  RETURN execution_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to complete test execution
CREATE OR REPLACE FUNCTION complete_test_execution(
  p_execution_uuid UUID,
  p_status VARCHAR(20),
  p_output_data JSONB DEFAULT '{}',
  p_duration_ms INTEGER DEFAULT NULL,
  p_steps_executed INTEGER DEFAULT 0,
  p_steps_total INTEGER DEFAULT 0,
  p_error_message TEXT DEFAULT NULL,
  p_error_details JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE agent_test_executions 
  SET 
    execution_status = p_status,
    output_data = p_output_data,
    completed_at = NOW(),
    duration_ms = p_duration_ms,
    steps_executed = p_steps_executed,
    steps_total = p_steps_total,
    error_message = p_error_message,
    error_details = p_error_details
  WHERE id = p_execution_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to record test metrics
CREATE OR REPLACE FUNCTION record_test_metric(
  p_session_id UUID,
  p_execution_id UUID,
  p_metric_name VARCHAR(50),
  p_metric_value DECIMAL(10,2),
  p_metric_unit VARCHAR(20) DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  metric_id UUID;
BEGIN
  INSERT INTO agent_test_metrics (
    test_session_id, execution_id, metric_name, metric_value, metric_unit, metadata
  )
  VALUES (
    p_session_id, p_execution_id, p_metric_name, p_metric_value, p_metric_unit, p_metadata
  )
  RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get test session summary
CREATE OR REPLACE FUNCTION get_test_session_summary(p_session_id UUID)
RETURNS TABLE(
  session_status VARCHAR(20),
  total_executions INTEGER,
  successful_executions INTEGER,
  failed_executions INTEGER,
  average_duration_ms INTEGER,
  webhook_url TEXT,
  test_token VARCHAR(100),
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ats.status,
    ats.executions_count,
    COALESCE((
      SELECT COUNT(*)::INTEGER 
      FROM agent_test_executions 
      WHERE test_session_id = p_session_id AND execution_status = 'success'
    ), 0),
    COALESCE((
      SELECT COUNT(*)::INTEGER 
      FROM agent_test_executions 
      WHERE test_session_id = p_session_id AND execution_status = 'failed'
    ), 0),
    COALESCE((
      SELECT AVG(duration_ms)::INTEGER 
      FROM agent_test_executions 
      WHERE test_session_id = p_session_id AND duration_ms IS NOT NULL
    ), 0),
    ats.webhook_url,
    ats.test_token,
    ats.expires_at
  FROM agent_test_sessions ats
  WHERE ats.id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to end test session
CREATE OR REPLACE FUNCTION end_test_session(
  p_session_id UUID,
  p_user_id UUID,
  p_feedback TEXT DEFAULT NULL,
  p_rating INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update session status
  UPDATE agent_test_sessions 
  SET 
    status = 'completed',
    completed_at = NOW()
  WHERE id = p_session_id AND user_id = p_user_id;
  
  -- Add feedback if provided
  IF p_feedback IS NOT NULL OR p_rating IS NOT NULL THEN
    INSERT INTO agent_test_feedback (test_session_id, user_id, feedback_text, rating)
    VALUES (p_session_id, p_user_id, p_feedback, p_rating);
  END IF;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired test sessions
CREATE OR REPLACE FUNCTION cleanup_expired_test_sessions()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  -- Mark expired sessions as completed
  UPDATE agent_test_sessions 
  SET status = 'completed', completed_at = NOW()
  WHERE status = 'active' AND expires_at < NOW();
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default test environments
INSERT INTO test_environments (name, description, base_url, webhook_proxy_url, api_rate_limits) VALUES
('sandbox', 'Sandbox testing environment with limited resources', 
 'https://sandbox.agentflow.ai', 
 'https://sandbox.agentflow.ai/webhook-proxy',
 '{"requests_per_minute": 30, "requests_per_hour": 100}'),

('staging', 'Staging environment for pre-production testing',
 'https://staging.agentflow.ai',
 'https://staging.agentflow.ai/webhook-proxy', 
 '{"requests_per_minute": 100, "requests_per_hour": 500}')

ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  base_url = EXCLUDED.base_url,
  webhook_proxy_url = EXCLUDED.webhook_proxy_url,
  api_rate_limits = EXCLUDED.api_rate_limits;

-- Insert default test scenarios
INSERT INTO agent_test_scenarios (name, description, scenario_type, agent_categories, test_data, validation_rules) VALUES
('Basic Webhook Test', 'Test basic webhook functionality', 'webhook_test', ARRAY['api', 'automation'], 
 '{
   "input": {"test_data": "hello world", "timestamp": "2024-01-01T00:00:00Z"},
   "expected_output": {"status": "success"},
   "timeout_ms": 5000
 }',
 '[
   {"type": "response_time", "max_ms": 5000},
   {"type": "status_check", "expected": "success"},
   {"type": "output_format", "required_fields": ["status"]}
 ]'),

('API Integration Test', 'Test external API integration', 'integration_test', ARRAY['api', 'data_processing'],
 '{
   "input": {"api_endpoint": "https://httpbin.org/json", "method": "GET"},
   "expected_output": {"slideshow": {"title": "Sample"}},
   "timeout_ms": 10000
 }',
 '[
   {"type": "response_time", "max_ms": 10000},
   {"type": "api_success", "expected": true},
   {"type": "data_validation", "schema": "object"}
 ]'),

('Performance Test', 'Test agent performance under load', 'performance_test', ARRAY['api', 'automation'],
 '{
   "concurrent_requests": 5,
   "total_requests": 25,
   "input": {"load_test": true},
   "timeout_ms": 30000
 }',
 '[
   {"type": "response_time", "max_ms": 2000, "percentile": 95},
   {"type": "success_rate", "min_percent": 90},
   {"type": "throughput", "min_rps": 2}
 ]')

ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  test_data = EXCLUDED.test_data,
  validation_rules = EXCLUDED.validation_rules;
