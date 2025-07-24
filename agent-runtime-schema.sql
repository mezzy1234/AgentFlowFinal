-- Agent Runtime & Execution System Database Schema
-- Handles agent queuing, retries, timeouts, and execution lifecycle

-- Agent Runtime Queue
CREATE TABLE IF NOT EXISTS agent_execution_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL,
  execution_type VARCHAR(50) NOT NULL, -- 'webhook', 'schedule', 'trigger', 'manual'
  trigger_data JSONB DEFAULT '{}',
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
  max_retries INTEGER DEFAULT 3,
  retry_count INTEGER DEFAULT 0,
  timeout_seconds INTEGER DEFAULT 300, -- 5 minutes default
  status VARCHAR(20) DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed', 'timeout', 'cancelled'
  worker_id VARCHAR(100), -- Which worker picked up this job
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  execution_result JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Workers (Runtime instances)
CREATE TABLE IF NOT EXISTS agent_workers (
  id VARCHAR(100) PRIMARY KEY, -- worker hostname or container ID
  status VARCHAR(20) DEFAULT 'idle', -- 'idle', 'busy', 'offline', 'error'
  current_job_id UUID REFERENCES agent_execution_queue(id),
  max_concurrent_jobs INTEGER DEFAULT 5,
  current_job_count INTEGER DEFAULT 0,
  capabilities JSONB DEFAULT '{}', -- supported integrations, memory, etc.
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Agent Schedules (CRON-like scheduling)
CREATE TABLE IF NOT EXISTS agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL,
  schedule_name VARCHAR(200) NOT NULL,
  cron_expression VARCHAR(100) NOT NULL, -- '0 */5 * * *' for every 5 minutes
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT TRUE,
  next_run TIMESTAMP WITH TIME ZONE,
  last_run TIMESTAMP WITH TIME ZONE,
  run_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  max_failures INTEGER DEFAULT 5, -- Disable after 5 consecutive failures
  retry_config JSONB DEFAULT '{"enabled": true, "max_retries": 3, "backoff_strategy": "exponential"}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Execution History (Detailed logs)
CREATE TABLE IF NOT EXISTS agent_execution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES agent_execution_queue(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL,
  execution_phase VARCHAR(50) NOT NULL, -- 'init', 'running', 'integration_call', 'completed', 'error'
  phase_data JSONB DEFAULT '{}',
  duration_ms INTEGER,
  memory_usage_mb INTEGER,
  cpu_usage_percent DECIMAL(5,2),
  logs TEXT[],
  step_count INTEGER DEFAULT 0,
  current_step VARCHAR(200),
  error_details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Webhooks Registry
CREATE TABLE IF NOT EXISTS agent_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL,
  webhook_url TEXT NOT NULL UNIQUE, -- The public webhook URL for this agent
  internal_webhook_url TEXT NOT NULL, -- The actual n8n webhook URL
  webhook_secret VARCHAR(100), -- For signature verification
  supported_methods TEXT[] DEFAULT ARRAY['POST'], -- ['GET', 'POST', 'PUT']
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMP WITH TIME ZONE,
  total_triggers INTEGER DEFAULT 0,
  successful_triggers INTEGER DEFAULT 0,
  failed_triggers INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Access Logs
CREATE TABLE IF NOT EXISTS webhook_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  user_id UUID,
  method VARCHAR(10) NOT NULL,
  ip_address INET NOT NULL,
  status_code INTEGER NOT NULL,
  response_message TEXT,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Rate Limiting
CREATE TABLE IF NOT EXISTS agent_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL,
  limit_type VARCHAR(50) NOT NULL, -- 'executions_per_minute', 'executions_per_hour', 'executions_per_day'
  limit_value INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
  exceeded_count INTEGER DEFAULT 0,
  last_exceeded TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(agent_id, user_id, limit_type)
);

-- Agent Retry Policies
CREATE TABLE IF NOT EXISTS agent_retry_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  error_type VARCHAR(100) NOT NULL, -- 'timeout', 'rate_limit', 'api_error', 'network_error'
  max_retries INTEGER DEFAULT 3,
  backoff_strategy VARCHAR(20) DEFAULT 'exponential', -- 'fixed', 'linear', 'exponential'
  initial_delay_seconds INTEGER DEFAULT 5,
  max_delay_seconds INTEGER DEFAULT 300,
  jitter_enabled BOOLEAN DEFAULT TRUE,
  conditions JSONB DEFAULT '{}', -- Additional conditions for when to retry
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(agent_id, error_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_execution_queue_status_priority ON agent_execution_queue(status, priority, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_agent_execution_queue_user_agent ON agent_execution_queue(user_id, agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_workers_status ON agent_workers(status, last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_active_next_run ON agent_schedules(is_active, next_run);
CREATE INDEX IF NOT EXISTS idx_agent_execution_history_agent_time ON agent_execution_history(agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_webhooks_url ON agent_webhooks(webhook_url);
CREATE INDEX IF NOT EXISTS idx_agent_rate_limits_reset ON agent_rate_limits(reset_at);

-- Agent Runtime Functions
CREATE OR REPLACE FUNCTION enqueue_agent_execution(
  p_agent_id UUID,
  p_user_id UUID,
  p_execution_type VARCHAR(50),
  p_trigger_data JSONB DEFAULT '{}',
  p_scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_priority INTEGER DEFAULT 5
)
RETURNS UUID AS $$
DECLARE
  queue_id UUID;
  rate_limit_exceeded BOOLEAN := FALSE;
BEGIN
  -- Check rate limits
  SELECT check_agent_rate_limit(p_agent_id, p_user_id) INTO rate_limit_exceeded;
  
  IF rate_limit_exceeded THEN
    RAISE EXCEPTION 'Agent execution rate limit exceeded for user % agent %', p_user_id, p_agent_id;
  END IF;

  -- Insert into queue
  INSERT INTO agent_execution_queue (
    agent_id, user_id, execution_type, trigger_data, scheduled_for, priority
  ) VALUES (
    p_agent_id, p_user_id, p_execution_type, p_trigger_data, p_scheduled_for, p_priority
  ) RETURNING id INTO queue_id;

  RETURN queue_id;
END;
$$ LANGUAGE plpgsql;

-- Webhook stats functions
CREATE OR REPLACE FUNCTION increment_webhook_success(webhook_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE agent_webhooks 
  SET successful_deliveries = successful_deliveries + 1,
      total_triggers = total_triggers + 1,
      last_triggered = NOW()
  WHERE id = webhook_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_webhook_failure(webhook_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE agent_webhooks 
  SET failed_deliveries = failed_deliveries + 1,
      total_triggers = total_triggers + 1
  WHERE id = webhook_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_agent_rate_limit(
  p_agent_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  limit_record RECORD;
  exceeded BOOLEAN := FALSE;
BEGIN
  -- Check each rate limit type
  FOR limit_record IN 
    SELECT * FROM agent_rate_limits 
    WHERE agent_id = p_agent_id AND user_id = p_user_id AND reset_at > NOW()
  LOOP
    IF limit_record.current_count >= limit_record.limit_value THEN
      exceeded := TRUE;
      
      -- Update exceeded count
      UPDATE agent_rate_limits 
      SET exceeded_count = exceeded_count + 1, last_exceeded = NOW()
      WHERE id = limit_record.id;
    END IF;
  END LOOP;

  RETURN exceeded;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_agent_rate_limit(
  p_agent_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  -- Increment current count for all active rate limits
  UPDATE agent_rate_limits 
  SET current_count = current_count + 1
  WHERE agent_id = p_agent_id 
    AND user_id = p_user_id 
    AND reset_at > NOW();

  -- Reset expired rate limits
  UPDATE agent_rate_limits 
  SET current_count = 0, reset_at = CASE 
    WHEN limit_type = 'executions_per_minute' THEN NOW() + INTERVAL '1 minute'
    WHEN limit_type = 'executions_per_hour' THEN NOW() + INTERVAL '1 hour'
    WHEN limit_type = 'executions_per_day' THEN NOW() + INTERVAL '1 day'
    ELSE NOW() + INTERVAL '1 hour'
  END
  WHERE agent_id = p_agent_id 
    AND user_id = p_user_id 
    AND reset_at <= NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_next_queued_job(p_worker_id VARCHAR(100))
RETURNS UUID AS $$
DECLARE
  job_id UUID;
BEGIN
  -- Get the highest priority job that's ready to run
  SELECT id INTO job_id
  FROM agent_execution_queue
  WHERE status = 'queued' 
    AND scheduled_for <= NOW()
    AND retry_count < max_retries
  ORDER BY priority ASC, scheduled_for ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF job_id IS NOT NULL THEN
    -- Mark job as running and assign to worker
    UPDATE agent_execution_queue 
    SET status = 'running', 
        worker_id = p_worker_id,
        started_at = NOW(),
        updated_at = NOW()
    WHERE id = job_id;

    -- Update worker status
    UPDATE agent_workers 
    SET status = 'busy',
        current_job_id = job_id,
        current_job_count = current_job_count + 1,
        last_heartbeat = NOW()
    WHERE id = p_worker_id;
  END IF;

  RETURN job_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION complete_agent_job(
  p_job_id UUID,
  p_status VARCHAR(20),
  p_result JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  job_record RECORD;
  should_retry BOOLEAN := FALSE;
BEGIN
  -- Get job details
  SELECT * INTO job_record FROM agent_execution_queue WHERE id = p_job_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  -- Determine if we should retry
  IF p_status = 'failed' AND job_record.retry_count < job_record.max_retries THEN
    should_retry := TRUE;
  END IF;

  IF should_retry THEN
    -- Schedule retry with exponential backoff
    UPDATE agent_execution_queue 
    SET status = 'queued',
        retry_count = retry_count + 1,
        scheduled_for = NOW() + (INTERVAL '1 minute' * POWER(2, retry_count)),
        worker_id = NULL,
        error_message = p_error_message,
        updated_at = NOW()
    WHERE id = p_job_id;
  ELSE
    -- Mark as final status
    UPDATE agent_execution_queue 
    SET status = p_status,
        completed_at = NOW(),
        execution_result = p_result,
        error_message = p_error_message,
        updated_at = NOW()
    WHERE id = p_job_id;
  END IF;

  -- Update worker status
  UPDATE agent_workers 
  SET current_job_id = NULL,
      current_job_count = GREATEST(0, current_job_count - 1),
      status = CASE WHEN current_job_count <= 1 THEN 'idle' ELSE 'busy' END,
      last_heartbeat = NOW()
  WHERE current_job_id = p_job_id;

  -- Increment rate limits
  PERFORM increment_agent_rate_limit(job_record.agent_id, job_record.user_id);
END;
$$ LANGUAGE plpgsql;

-- Calculate next run time for scheduled agents
CREATE OR REPLACE FUNCTION calculate_next_cron_run(cron_expr TEXT, tz TEXT DEFAULT 'UTC')
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  next_run TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Simple cron calculation (for production, use a proper cron library)
  -- This is a simplified version for common patterns
  CASE 
    WHEN cron_expr = '* * * * *' THEN -- Every minute
      next_run := (NOW() AT TIME ZONE tz) + INTERVAL '1 minute';
    WHEN cron_expr = '*/5 * * * *' THEN -- Every 5 minutes
      next_run := (NOW() AT TIME ZONE tz) + INTERVAL '5 minutes';
    WHEN cron_expr = '0 * * * *' THEN -- Every hour
      next_run := date_trunc('hour', NOW() AT TIME ZONE tz) + INTERVAL '1 hour';
    WHEN cron_expr = '0 0 * * *' THEN -- Daily at midnight
      next_run := date_trunc('day', NOW() AT TIME ZONE tz) + INTERVAL '1 day';
    ELSE
      -- Default to 1 hour for unknown patterns
      next_run := (NOW() AT TIME ZONE tz) + INTERVAL '1 hour';
  END CASE;

  RETURN next_run AT TIME ZONE tz;
END;
$$ LANGUAGE plpgsql;

-- Sample data
INSERT INTO agent_workers (id, max_concurrent_jobs, capabilities) VALUES 
('worker-1', 10, '{"integrations": ["slack", "google", "stripe"], "memory_gb": 4}'),
('worker-2', 5, '{"integrations": ["webhook", "email"], "memory_gb": 2}')
ON CONFLICT (id) DO NOTHING;

-- Sample rate limits
INSERT INTO agent_rate_limits (agent_id, user_id, limit_type, limit_value, reset_at) VALUES 
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'executions_per_minute', 10, NOW() + INTERVAL '1 minute'),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'executions_per_hour', 100, NOW() + INTERVAL '1 hour'),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'executions_per_day', 1000, NOW() + INTERVAL '1 day')
ON CONFLICT (agent_id, user_id, limit_type) DO NOTHING;
