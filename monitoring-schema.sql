-- AgentFlow.AI Performance & Monitoring Database Schema
-- Chunk 7: Performance Monitoring, Analytics, and System Health

-- System Performance Metrics
CREATE TABLE system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(50) NOT NULL, -- 'cpu', 'memory', 'disk', 'network', 'database'
  metric_name VARCHAR(100) NOT NULL,
  value DECIMAL(10,4) NOT NULL,
  unit VARCHAR(20) NOT NULL, -- '%', 'MB', 'GB', 'ms', 'req/s'
  node_id VARCHAR(100), -- For distributed systems
  environment VARCHAR(50) DEFAULT 'production', -- 'development', 'staging', 'production'
  recorded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Application Performance Monitoring (APM)
CREATE TABLE apm_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id VARCHAR(100) NOT NULL,
  span_id VARCHAR(100) NOT NULL,
  parent_span_id VARCHAR(100),
  operation_name VARCHAR(200) NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_ms INTEGER,
  status VARCHAR(20) DEFAULT 'ok', -- 'ok', 'error', 'timeout'
  tags JSONB DEFAULT '{}',
  logs JSONB DEFAULT '{}',
  user_id UUID,
  session_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Error Tracking and Monitoring
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  file_path VARCHAR(500),
  line_number INTEGER,
  function_name VARCHAR(200),
  user_id UUID,
  session_id VARCHAR(100),
  request_id VARCHAR(100),
  user_agent TEXT,
  ip_address INET,
  url TEXT,
  http_method VARCHAR(10),
  status_code INTEGER,
  environment VARCHAR(50) DEFAULT 'production',
  severity VARCHAR(20) DEFAULT 'error', -- 'debug', 'info', 'warning', 'error', 'fatal'
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by UUID,
  tags JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Real-time System Health Monitoring
CREATE TABLE health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(100) NOT NULL,
  endpoint_url VARCHAR(500),
  check_type VARCHAR(50) NOT NULL, -- 'http', 'database', 'redis', 'external_api'
  status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'unhealthy'
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  check_config JSONB DEFAULT '{}',
  last_checked TIMESTAMP DEFAULT NOW(),
  consecutive_failures INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Performance Alerts and Notifications
CREATE TABLE performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL, -- 'threshold', 'anomaly', 'error_rate', 'latency'
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  title VARCHAR(200) NOT NULL,
  description TEXT,
  metric_name VARCHAR(100),
  threshold_value DECIMAL(10,4),
  current_value DECIMAL(10,4),
  service_name VARCHAR(100),
  environment VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'muted'
  triggered_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by UUID,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_channels TEXT[], -- ['email', 'slack', 'webhook']
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Analytics and Behavior Tracking
CREATE TABLE user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL, -- 'page_view', 'click', 'form_submit', 'api_call'
  event_name VARCHAR(200) NOT NULL,
  page_url TEXT,
  referrer_url TEXT,
  user_agent TEXT,
  ip_address INET,
  country VARCHAR(2),
  city VARCHAR(100),
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
  browser VARCHAR(50),
  operating_system VARCHAR(50),
  properties JSONB DEFAULT '{}',
  duration_ms INTEGER,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- API Performance Metrics
CREATE TABLE api_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  user_id UUID,
  api_key_id UUID,
  rate_limited BOOLEAN DEFAULT FALSE,
  cached BOOLEAN DEFAULT FALSE,
  user_agent TEXT,
  ip_address INET,
  request_id VARCHAR(100),
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Database Performance Monitoring
CREATE TABLE database_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash VARCHAR(64) NOT NULL,
  query_text TEXT,
  execution_time_ms DECIMAL(10,4) NOT NULL,
  rows_examined INTEGER,
  rows_returned INTEGER,
  database_name VARCHAR(100),
  table_names TEXT[],
  query_type VARCHAR(20), -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
  index_usage JSONB DEFAULT '{}',
  explain_plan JSONB,
  user_id UUID,
  application_context VARCHAR(200),
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Resource Usage Tracking
CREATE TABLE resource_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type VARCHAR(50) NOT NULL, -- 'cpu', 'memory', 'storage', 'bandwidth', 'api_calls'
  user_id UUID,
  organization_id UUID,
  agent_id UUID,
  usage_amount DECIMAL(15,4) NOT NULL,
  usage_unit VARCHAR(20) NOT NULL, -- 'bytes', 'requests', 'minutes', 'tokens'
  cost_amount DECIMAL(10,4),
  cost_currency VARCHAR(3) DEFAULT 'USD',
  billing_period DATE,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Performance Dashboards Configuration
CREATE TABLE performance_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  dashboard_type VARCHAR(50) NOT NULL, -- 'system', 'application', 'business', 'user'
  owner_id UUID NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  widgets JSONB NOT NULL DEFAULT '[]',
  layout JSONB DEFAULT '{}',
  refresh_interval INTEGER DEFAULT 300, -- seconds
  time_range VARCHAR(50) DEFAULT '24h', -- '1h', '24h', '7d', '30d'
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Custom Metrics and KPIs
CREATE TABLE custom_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- 'counter', 'gauge', 'histogram', 'timer'
  value DECIMAL(15,4) NOT NULL,
  tags JSONB DEFAULT '{}',
  user_id UUID,
  organization_id UUID,
  source VARCHAR(100), -- 'agent', 'integration', 'manual', 'api'
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Uptime Monitoring
CREATE TABLE uptime_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  url VARCHAR(500) NOT NULL,
  method VARCHAR(10) DEFAULT 'GET',
  headers JSONB DEFAULT '{}',
  body TEXT,
  timeout_ms INTEGER DEFAULT 30000,
  interval_minutes INTEGER DEFAULT 5,
  expected_status_codes INTEGER[] DEFAULT ARRAY[200],
  expected_content TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Uptime Check Results
CREATE TABLE uptime_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES uptime_monitors(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL, -- 'up', 'down', 'timeout', 'error'
  response_time_ms INTEGER,
  status_code INTEGER,
  response_body_size INTEGER,
  error_message TEXT,
  checked_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_system_metrics_type_time ON system_metrics(metric_type, recorded_at);
CREATE INDEX idx_system_metrics_node_time ON system_metrics(node_id, recorded_at);
CREATE INDEX idx_apm_traces_trace_id ON apm_traces(trace_id);
CREATE INDEX idx_apm_traces_service_time ON apm_traces(service_name, start_time);
CREATE INDEX idx_apm_traces_operation ON apm_traces(operation_name, start_time);
CREATE INDEX idx_error_logs_type_time ON error_logs(error_type, created_at);
CREATE INDEX idx_error_logs_user_time ON error_logs(user_id, created_at);
CREATE INDEX idx_error_logs_severity ON error_logs(severity, created_at);
CREATE INDEX idx_health_checks_service ON health_checks(service_name, last_checked);
CREATE INDEX idx_performance_alerts_status ON performance_alerts(status, triggered_at);
CREATE INDEX idx_performance_alerts_severity ON performance_alerts(severity, triggered_at);
CREATE INDEX idx_user_analytics_user_time ON user_analytics(user_id, timestamp);
CREATE INDEX idx_user_analytics_event_time ON user_analytics(event_type, timestamp);
CREATE INDEX idx_user_analytics_session ON user_analytics(session_id, timestamp);
CREATE INDEX idx_api_metrics_endpoint_time ON api_metrics(endpoint, timestamp);
CREATE INDEX idx_api_metrics_user_time ON api_metrics(user_id, timestamp);
CREATE INDEX idx_api_metrics_status ON api_metrics(status_code, timestamp);
CREATE INDEX idx_database_metrics_hash ON database_metrics(query_hash, timestamp);
CREATE INDEX idx_database_metrics_time ON database_metrics(execution_time_ms DESC, timestamp);
CREATE INDEX idx_resource_usage_user_period ON resource_usage(user_id, billing_period);
CREATE INDEX idx_resource_usage_type_time ON resource_usage(resource_type, recorded_at);
CREATE INDEX idx_custom_metrics_name_time ON custom_metrics(metric_name, timestamp);
CREATE INDEX idx_uptime_checks_monitor_time ON uptime_checks(monitor_id, checked_at);

-- Create partitions for time-series data (PostgreSQL 11+)
-- Partition system_metrics by month
CREATE TABLE system_metrics_y2024m01 PARTITION OF system_metrics
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE system_metrics_y2024m02 PARTITION OF system_metrics
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Functions for monitoring and alerts
CREATE OR REPLACE FUNCTION record_system_metric(
  p_metric_type VARCHAR(50),
  p_metric_name VARCHAR(100),
  p_value DECIMAL(10,4),
  p_unit VARCHAR(20),
  p_node_id VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  metric_id UUID;
BEGIN
  INSERT INTO system_metrics (metric_type, metric_name, value, unit, node_id)
  VALUES (p_metric_type, p_metric_name, p_value, p_unit, p_node_id)
  RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_performance_thresholds()
RETURNS void AS $$
DECLARE
  cpu_threshold DECIMAL := 85.0;
  memory_threshold DECIMAL := 90.0;
  response_time_threshold INTEGER := 5000;
BEGIN
  -- Check CPU usage
  INSERT INTO performance_alerts (alert_type, severity, title, description, metric_name, threshold_value, current_value)
  SELECT 
    'threshold',
    CASE 
      WHEN value > 95 THEN 'critical'
      WHEN value > cpu_threshold THEN 'high'
      ELSE 'medium'
    END,
    'High CPU Usage Detected',
    'CPU usage has exceeded threshold on ' || COALESCE(node_id, 'unknown node'),
    'cpu_usage',
    cpu_threshold,
    value
  FROM system_metrics 
  WHERE metric_type = 'cpu' 
    AND metric_name = 'usage_percent'
    AND value > cpu_threshold
    AND recorded_at > NOW() - INTERVAL '5 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM performance_alerts 
      WHERE alert_type = 'threshold' 
        AND metric_name = 'cpu_usage'
        AND status = 'active'
        AND triggered_at > NOW() - INTERVAL '10 minutes'
    );
    
  -- Check memory usage
  INSERT INTO performance_alerts (alert_type, severity, title, description, metric_name, threshold_value, current_value)
  SELECT 
    'threshold',
    CASE 
      WHEN value > 95 THEN 'critical'
      WHEN value > memory_threshold THEN 'high'
      ELSE 'medium'
    END,
    'High Memory Usage Detected',
    'Memory usage has exceeded threshold on ' || COALESCE(node_id, 'unknown node'),
    'memory_usage',
    memory_threshold,
    value
  FROM system_metrics 
  WHERE metric_type = 'memory' 
    AND metric_name = 'usage_percent'
    AND value > memory_threshold
    AND recorded_at > NOW() - INTERVAL '5 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM performance_alerts 
      WHERE alert_type = 'threshold' 
        AND metric_name = 'memory_usage'
        AND status = 'active'
        AND triggered_at > NOW() - INTERVAL '10 minutes'
    );
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing
INSERT INTO system_metrics (metric_type, metric_name, value, unit, node_id) VALUES 
('cpu', 'usage_percent', 45.2, '%', 'node-1'),
('memory', 'usage_percent', 67.8, '%', 'node-1'),
('disk', 'usage_percent', 34.5, '%', 'node-1'),
('network', 'throughput_mbps', 125.3, 'Mbps', 'node-1'),
('database', 'connection_count', 23, 'connections', 'db-primary');

INSERT INTO health_checks (service_name, endpoint_url, check_type, status, response_time_ms) VALUES 
('api-gateway', 'https://api.agentflow.ai/health', 'http', 'healthy', 145),
('auth-service', 'https://auth.agentflow.ai/health', 'http', 'healthy', 89),
('database', 'postgresql://localhost:5432', 'database', 'healthy', 12),
('redis-cache', 'redis://localhost:6379', 'redis', 'healthy', 5),
('stripe-api', 'https://api.stripe.com/v1', 'external_api', 'healthy', 234);

INSERT INTO uptime_monitors (name, url, method, interval_minutes, created_by) VALUES 
('Main Website', 'https://agentflow.ai', 'GET', 5, '550e8400-e29b-41d4-a716-446655440000'),
('API Health Check', 'https://api.agentflow.ai/health', 'GET', 1, '550e8400-e29b-41d4-a716-446655440000'),
('Dashboard Application', 'https://app.agentflow.ai', 'GET', 5, '550e8400-e29b-41d4-a716-446655440000');
