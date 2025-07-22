-- Enhanced agent execution logging and monitoring
-- This extends the existing production_extensions.sql with detailed logging

-- Agent run logs table for detailed execution tracking
CREATE TABLE IF NOT EXISTS agent_run_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  execution_step TEXT, -- 'init', 'auth', 'execute', 'webhook', 'complete'
  latency_ms INTEGER,
  memory_usage_mb INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent health tracking
CREATE TABLE IF NOT EXISTS agent_health_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  health_score DECIMAL(5,2) NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  success_rate DECIMAL(5,2) NOT NULL,
  avg_response_time_ms INTEGER NOT NULL,
  error_rate DECIMAL(5,2) NOT NULL,
  uptime_percentage DECIMAL(5,2) NOT NULL,
  last_successful_run TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  total_runs_24h INTEGER DEFAULT 0,
  successful_runs_24h INTEGER DEFAULT 0,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent failure alerts tracking
CREATE TABLE IF NOT EXISTS agent_failure_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  developer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  failure_count INTEGER NOT NULL,
  time_window_minutes INTEGER NOT NULL DEFAULT 60,
  first_failure_at TIMESTAMPTZ NOT NULL,
  last_failure_at TIMESTAMPTZ NOT NULL,
  alert_sent BOOLEAN DEFAULT FALSE,
  alert_sent_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration connection status tracking
CREATE TABLE IF NOT EXISTS integration_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  integration_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('connected', 'expired', 'error', 'setup_incomplete')),
  last_check_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  error_message TEXT,
  connection_data JSONB DEFAULT '{}',
  auto_refresh_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, integration_name)
);

-- Audit log for comprehensive activity tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- 'agent', 'user', 'payment', 'integration'
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_run_logs_agent_run_id ON agent_run_logs(agent_run_id);
CREATE INDEX IF NOT EXISTS idx_agent_run_logs_timestamp ON agent_run_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_run_logs_level ON agent_run_logs(level);

CREATE INDEX IF NOT EXISTS idx_agent_health_scores_agent_id ON agent_health_scores(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_health_scores_calculated_at ON agent_health_scores(calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_failure_alerts_agent_id ON agent_failure_alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_failure_alerts_developer_id ON agent_failure_alerts(developer_id);
CREATE INDEX IF NOT EXISTS idx_agent_failure_alerts_resolved ON agent_failure_alerts(resolved);

CREATE INDEX IF NOT EXISTS idx_integration_status_user_id ON integration_status(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_status_status ON integration_status(status);
CREATE INDEX IF NOT EXISTS idx_integration_status_expires_at ON integration_status(expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS Policies
ALTER TABLE agent_run_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_failure_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Agent run logs policies
CREATE POLICY "Users can view their agent run logs" ON agent_run_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agent_runs ar
      JOIN agents a ON ar.agent_id = a.id
      JOIN user_agents ua ON a.id = ua.agent_id
      WHERE ar.id = agent_run_logs.agent_run_id
      AND (ua.user_id = auth.uid() OR a.developer_id = auth.uid())
    )
  );

CREATE POLICY "Developers can view their agent health scores" ON agent_health_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_health_scores.agent_id
      AND a.developer_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their integration status" ON integration_status
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Developers can view their failure alerts" ON agent_failure_alerts
  FOR SELECT USING (developer_id = auth.uid());

CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT USING (user_id = auth.uid());

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_integration_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_integration_status_updated_at
  BEFORE UPDATE ON integration_status
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_status_timestamp();

-- Function to calculate agent health score
CREATE OR REPLACE FUNCTION calculate_agent_health_score(agent_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  success_rate DECIMAL(5,2);
  avg_response_time INTEGER;
  error_rate DECIMAL(5,2);
  uptime_percentage DECIMAL(5,2);
  health_score DECIMAL(5,2);
  total_runs INTEGER;
  successful_runs INTEGER;
BEGIN
  -- Get stats for last 24 hours
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    AVG(duration),
    COUNT(*) FILTER (WHERE status IN ('failed', 'timeout', 'error'))
  INTO total_runs, successful_runs, avg_response_time, error_rate
  FROM agent_runs
  WHERE agent_id = agent_uuid
    AND created_at >= NOW() - INTERVAL '24 hours';

  IF total_runs = 0 THEN
    RETURN 100.0; -- New agents start with perfect score
  END IF;

  success_rate := (successful_runs::DECIMAL / total_runs) * 100;
  error_rate := ((total_runs - successful_runs)::DECIMAL / total_runs) * 100;
  
  -- Simple uptime calculation (can be enhanced)
  uptime_percentage := success_rate;
  
  -- Calculate weighted health score
  health_score := (
    success_rate * 0.5 +  -- 50% weight on success rate
    GREATEST(0, 100 - (avg_response_time / 100)) * 0.3 +  -- 30% weight on response time
    (100 - error_rate) * 0.2  -- 20% weight on low error rate
  );
  
  -- Insert health score record
  INSERT INTO agent_health_scores (
    agent_id, health_score, success_rate, avg_response_time_ms,
    error_rate, uptime_percentage, total_runs_24h, successful_runs_24h
  ) VALUES (
    agent_uuid, health_score, success_rate, COALESCE(avg_response_time, 0),
    error_rate, uptime_percentage, total_runs, successful_runs
  );
  
  RETURN health_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for failure patterns and create alerts
CREATE OR REPLACE FUNCTION check_agent_failure_alerts()
RETURNS VOID AS $$
DECLARE
  agent_record RECORD;
  failure_count INTEGER;
  first_failure TIMESTAMPTZ;
  last_failure TIMESTAMPTZ;
BEGIN
  FOR agent_record IN
    SELECT DISTINCT a.id as agent_id, a.developer_id
    FROM agents a
    JOIN agent_runs ar ON a.id = ar.agent_id
    WHERE ar.status IN ('failed', 'timeout', 'error')
      AND ar.created_at >= NOW() - INTERVAL '1 hour'
  LOOP
    -- Count failures in last hour
    SELECT COUNT(*), MIN(created_at), MAX(created_at)
    INTO failure_count, first_failure, last_failure
    FROM agent_runs
    WHERE agent_id = agent_record.agent_id
      AND status IN ('failed', 'timeout', 'error')
      AND created_at >= NOW() - INTERVAL '1 hour';
    
    -- Create alert if 3+ failures and no existing unresolved alert
    IF failure_count >= 3 AND NOT EXISTS (
      SELECT 1 FROM agent_failure_alerts
      WHERE agent_id = agent_record.agent_id
        AND resolved = FALSE
        AND created_at >= NOW() - INTERVAL '2 hours'
    ) THEN
      INSERT INTO agent_failure_alerts (
        agent_id, developer_id, failure_count, time_window_minutes,
        first_failure_at, last_failure_at
      ) VALUES (
        agent_record.agent_id, agent_record.developer_id, failure_count, 60,
        first_failure, last_failure
      );
      
      -- Insert notification for developer
      INSERT INTO notifications (
        user_id, title, message, type, created_at
      ) VALUES (
        agent_record.developer_id,
        'Agent Health Alert',
        'Your agent has failed ' || failure_count || ' times in the last hour. Please check the logs.',
        'agent_status',
        NOW()
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
