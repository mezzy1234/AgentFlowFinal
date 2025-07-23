-- Agent Runtime Management Layer Database Schema
-- Phase 1: Core tables for runtime isolation, memory pools, and metrics

-- ============================================================================
-- ORGANIZATION RUNTIME MANAGEMENT
-- ============================================================================

-- Organization runtimes - track isolated runtime environments per org
CREATE TABLE IF NOT EXISTS organization_runtimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  runtime_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'shutdown')),
  resource_limits JSONB NOT NULL DEFAULT '{
    "maxConcurrentAgents": 2,
    "maxMemoryMB": 256,
    "maxCPUPercent": 50,
    "maxExecutionTimeSeconds": 60,
    "maxQueueSize": 10,
    "rateLimitPerMinute": 30
  }',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- MEMORY POOL MANAGEMENT
-- ============================================================================

-- Agent memory pools - manage persistent memory for long-running agents
CREATE TABLE IF NOT EXISTS agent_memory_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  pool_id VARCHAR(255) UNIQUE NOT NULL,
  max_memory_mb INTEGER NOT NULL DEFAULT 256,
  current_usage_mb INTEGER DEFAULT 0,
  cleanup_schedule JSONB DEFAULT '{
    "intervalMinutes": 30,
    "maxMemoryAge": 1440,
    "compressionEnabled": true
  }',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent memory states - store persistent memory for long-running agents
CREATE TABLE IF NOT EXISTS agent_memory_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id VARCHAR(255) REFERENCES agent_memory_pools(pool_id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  memory_data JSONB NOT NULL DEFAULT '{}',
  memory_size_mb FLOAT NOT NULL DEFAULT 0,
  last_access_time TIMESTAMP DEFAULT NOW(),
  expiry_time TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pool_id, agent_id)
);

-- ============================================================================
-- RUNTIME METRICS AND MONITORING
-- ============================================================================

-- Runtime metrics - time-series data for runtime performance monitoring
CREATE TABLE IF NOT EXISTS runtime_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  runtime_id VARCHAR(255) NOT NULL,
  metrics_data JSONB NOT NULL DEFAULT '{}',
  collected_at TIMESTAMP DEFAULT NOW()
);

-- Runtime execution events - track agent execution lifecycle
CREATE TABLE IF NOT EXISTS runtime_execution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runtime_id VARCHAR(255) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  execution_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'timeout')),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Container execution metrics - detailed execution performance data
CREATE TABLE IF NOT EXISTS container_execution_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id VARCHAR(255) NOT NULL,
  execution_id VARCHAR(255) NOT NULL,
  success BOOLEAN NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  memory_used_mb FLOAT NOT NULL DEFAULT 0,
  cpu_used_percent FLOAT NOT NULL DEFAULT 0,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Container timeout events - track execution timeouts
CREATE TABLE IF NOT EXISTS container_timeout_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id VARCHAR(255) NOT NULL,
  execution_id VARCHAR(255) NOT NULL,
  timeout_ms INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Container error events - track execution errors
CREATE TABLE IF NOT EXISTS container_error_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id VARCHAR(255) NOT NULL,
  execution_id VARCHAR(255) NOT NULL,
  error_message TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Runtime management indexes
CREATE INDEX IF NOT EXISTS idx_organization_runtimes_org_id ON organization_runtimes(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_runtimes_status ON organization_runtimes(status);
CREATE INDEX IF NOT EXISTS idx_organization_runtimes_runtime_id ON organization_runtimes(runtime_id);

-- Memory pool indexes
CREATE INDEX IF NOT EXISTS idx_agent_memory_pools_org_id ON agent_memory_pools(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_pools_pool_id ON agent_memory_pools(pool_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_states_pool_id ON agent_memory_states(pool_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_states_agent_id ON agent_memory_states(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_states_expiry ON agent_memory_states(expiry_time);
CREATE INDEX IF NOT EXISTS idx_agent_memory_states_last_access ON agent_memory_states(last_access_time);

-- Metrics indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_runtime_metrics_org_time ON runtime_metrics(organization_id, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_metrics_runtime_time ON runtime_metrics(runtime_id, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_execution_events_runtime ON runtime_execution_events(runtime_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_execution_events_agent ON runtime_execution_events(agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_execution_events_status ON runtime_execution_events(status, timestamp DESC);

-- Container metrics indexes
CREATE INDEX IF NOT EXISTS idx_container_execution_metrics_container ON container_execution_metrics(container_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_container_execution_metrics_success ON container_execution_metrics(success, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_container_timeout_events_container ON container_timeout_events(container_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_container_error_events_container ON container_error_events(container_id, timestamp DESC);

-- ============================================================================
-- STORED PROCEDURES FOR METRICS CALCULATION
-- ============================================================================

-- Calculate average execution time for a runtime
CREATE OR REPLACE FUNCTION get_avg_execution_time(p_runtime_id VARCHAR, p_since TIMESTAMP)
RETURNS TABLE(avg_time FLOAT) AS $$
BEGIN
  RETURN QUERY
  SELECT AVG(execution_time_ms)::FLOAT as avg_time
  FROM container_execution_metrics cem
  WHERE cem.container_id LIKE p_runtime_id || '%'
    AND cem.timestamp >= p_since
    AND cem.success = true;
END;
$$ LANGUAGE plpgsql;

-- Get real-time dashboard metrics
CREATE OR REPLACE FUNCTION get_realtime_dashboard_metrics()
RETURNS TABLE(
  total_executions BIGINT,
  active_runtimes BIGINT,
  queue_depth BIGINT,
  error_rate FLOAT,
  avg_execution_time FLOAT,
  memory_usage FLOAT,
  cpu_usage FLOAT,
  container_utilization FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total executions in last hour
    (SELECT COUNT(*) FROM runtime_execution_events 
     WHERE timestamp >= NOW() - INTERVAL '1 hour') as total_executions,
    
    -- Active runtimes
    (SELECT COUNT(DISTINCT runtime_id) FROM organization_runtimes 
     WHERE status = 'active') as active_runtimes,
    
    -- Current queue depth (approximation)
    (SELECT COUNT(*) FROM runtime_execution_events 
     WHERE status = 'started' AND timestamp >= NOW() - INTERVAL '5 minutes') as queue_depth,
    
    -- Error rate in last hour
    (SELECT 
       CASE 
         WHEN COUNT(*) = 0 THEN 0::FLOAT 
         ELSE (COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / COUNT(*))::FLOAT 
       END
     FROM runtime_execution_events 
     WHERE timestamp >= NOW() - INTERVAL '1 hour') as error_rate,
    
    -- Average execution time in last hour
    (SELECT COALESCE(AVG(execution_time_ms), 0)::FLOAT 
     FROM container_execution_metrics 
     WHERE timestamp >= NOW() - INTERVAL '1 hour' AND success = true) as avg_execution_time,
    
    -- Average memory usage
    (SELECT COALESCE(AVG(memory_used_mb), 0)::FLOAT 
     FROM container_execution_metrics 
     WHERE timestamp >= NOW() - INTERVAL '1 hour') as memory_usage,
    
    -- Average CPU usage
    (SELECT COALESCE(AVG(cpu_used_percent), 0)::FLOAT 
     FROM container_execution_metrics 
     WHERE timestamp >= NOW() - INTERVAL '1 hour') as cpu_usage,
    
    -- Container utilization (active containers / total capacity)
    0::FLOAT as container_utilization; -- Placeholder for now
END;
$$ LANGUAGE plpgsql;

-- Get execution trends over time
CREATE OR REPLACE FUNCTION get_execution_trends(p_since TIMESTAMP)
RETURNS TABLE(
  timestamp TIMESTAMP,
  execution_count BIGINT,
  error_count BIGINT,
  avg_response_time FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('hour', ree.timestamp) as timestamp,
    COUNT(*) as execution_count,
    COUNT(*) FILTER (WHERE ree.status = 'failed') as error_count,
    COALESCE(AVG(cem.execution_time_ms), 0)::FLOAT as avg_response_time
  FROM runtime_execution_events ree
  LEFT JOIN container_execution_metrics cem ON ree.execution_id = cem.execution_id
  WHERE ree.timestamp >= p_since
  GROUP BY DATE_TRUNC('hour', ree.timestamp)
  ORDER BY timestamp;
END;
$$ LANGUAGE plpgsql;

-- Get organization-level metrics
CREATE OR REPLACE FUNCTION get_organization_metrics(p_since TIMESTAMP)
RETURNS TABLE(
  organization_id UUID,
  organization_name VARCHAR,
  active_agents BIGINT,
  total_executions BIGINT,
  error_rate FLOAT,
  avg_execution_time FLOAT,
  memory_usage FLOAT,
  subscription_tier VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    o.name as organization_name,
    COUNT(DISTINCT ree.agent_id) as active_agents,
    COUNT(ree.id) as total_executions,
    CASE 
      WHEN COUNT(ree.id) = 0 THEN 0::FLOAT 
      ELSE (COUNT(ree.id) FILTER (WHERE ree.status = 'failed') * 100.0 / COUNT(ree.id))::FLOAT 
    END as error_rate,
    COALESCE(AVG(cem.execution_time_ms), 0)::FLOAT as avg_execution_time,
    COALESCE(AVG(cem.memory_used_mb), 0)::FLOAT as memory_usage,
    COALESCE(o.subscription_tier, 'free') as subscription_tier
  FROM organizations o
  LEFT JOIN runtime_execution_events ree ON o.id = ree.organization_id AND ree.timestamp >= p_since
  LEFT JOIN container_execution_metrics cem ON ree.execution_id = cem.execution_id
  GROUP BY o.id, o.name, o.subscription_tier
  HAVING COUNT(ree.id) > 0
  ORDER BY total_executions DESC;
END;
$$ LANGUAGE plpgsql;

-- Get agent performance metrics
CREATE OR REPLACE FUNCTION get_agent_performance_metrics(p_since TIMESTAMP)
RETURNS TABLE(
  agent_id UUID,
  agent_name VARCHAR,
  execution_count BIGINT,
  success_rate FLOAT,
  avg_execution_time FLOAT,
  health_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as agent_id,
    a.name as agent_name,
    COUNT(ree.id) as execution_count,
    CASE 
      WHEN COUNT(ree.id) = 0 THEN 100::FLOAT 
      ELSE (COUNT(ree.id) FILTER (WHERE ree.status = 'completed') * 100.0 / COUNT(ree.id))::FLOAT 
    END as success_rate,
    COALESCE(AVG(cem.execution_time_ms), 0)::FLOAT as avg_execution_time,
    -- Health score calculation (simplified)
    CASE 
      WHEN COUNT(ree.id) = 0 THEN 100::FLOAT
      ELSE GREATEST(0, 100 - (COUNT(ree.id) FILTER (WHERE ree.status = 'failed') * 20.0))::FLOAT
    END as health_score
  FROM agents a
  LEFT JOIN runtime_execution_events ree ON a.id = ree.agent_id AND ree.timestamp >= p_since
  LEFT JOIN container_execution_metrics cem ON ree.execution_id = cem.execution_id
  GROUP BY a.id, a.name
  HAVING COUNT(ree.id) > 0
  ORDER BY execution_count DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Get problematic agents
CREATE OR REPLACE FUNCTION get_problematic_agents(p_since TIMESTAMP)
RETURNS TABLE(
  agent_id UUID,
  agent_name VARCHAR,
  issue_type VARCHAR,
  severity VARCHAR,
  description TEXT,
  affected_executions BIGINT,
  last_occurrence TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  -- High error rate agents
  SELECT 
    a.id as agent_id,
    a.name as agent_name,
    'high_error_rate'::VARCHAR as issue_type,
    CASE 
      WHEN error_rate > 50 THEN 'critical'::VARCHAR
      WHEN error_rate > 25 THEN 'high'::VARCHAR
      ELSE 'medium'::VARCHAR
    END as severity,
    ('Error rate: ' || ROUND(error_rate, 1) || '%')::TEXT as description,
    total_executions as affected_executions,
    last_error as last_occurrence
  FROM (
    SELECT 
      a.id,
      a.name,
      COUNT(ree.id) as total_executions,
      (COUNT(ree.id) FILTER (WHERE ree.status = 'failed') * 100.0 / COUNT(ree.id))::FLOAT as error_rate,
      MAX(ree.timestamp) FILTER (WHERE ree.status = 'failed') as last_error
    FROM agents a
    JOIN runtime_execution_events ree ON a.id = ree.agent_id
    WHERE ree.timestamp >= p_since
    GROUP BY a.id, a.name
    HAVING COUNT(ree.id) >= 5 AND 
           (COUNT(ree.id) FILTER (WHERE ree.status = 'failed') * 100.0 / COUNT(ree.id)) > 15
  ) problematic_agents
  
  UNION ALL
  
  -- Slow performance agents
  SELECT 
    a.id as agent_id,
    a.name as agent_name,
    'slow_performance'::VARCHAR as issue_type,
    CASE 
      WHEN avg_time > 30000 THEN 'high'::VARCHAR
      WHEN avg_time > 15000 THEN 'medium'::VARCHAR
      ELSE 'low'::VARCHAR
    END as severity,
    ('Avg execution time: ' || ROUND(avg_time/1000.0, 1) || 's')::TEXT as description,
    execution_count as affected_executions,
    last_execution as last_occurrence
  FROM (
    SELECT 
      a.id,
      a.name,
      COUNT(cem.id) as execution_count,
      AVG(cem.execution_time_ms)::FLOAT as avg_time,
      MAX(cem.timestamp) as last_execution
    FROM agents a
    JOIN runtime_execution_events ree ON a.id = ree.agent_id
    JOIN container_execution_metrics cem ON ree.execution_id = cem.execution_id
    WHERE ree.timestamp >= p_since AND cem.success = true
    GROUP BY a.id, a.name
    HAVING COUNT(cem.id) >= 3 AND AVG(cem.execution_time_ms) > 10000
  ) slow_agents
  
  ORDER BY severity DESC, affected_executions DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC MAINTENANCE
-- ============================================================================

-- Update organization runtime updated_at timestamp
CREATE OR REPLACE FUNCTION update_runtime_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organization_runtimes_updated_at
  BEFORE UPDATE ON organization_runtimes
  FOR EACH ROW EXECUTE FUNCTION update_runtime_updated_at();

-- Update memory pool updated_at timestamp
CREATE TRIGGER agent_memory_pools_updated_at
  BEFORE UPDATE ON agent_memory_pools
  FOR EACH ROW EXECUTE FUNCTION update_runtime_updated_at();

-- Update memory state updated_at timestamp
CREATE TRIGGER agent_memory_states_updated_at
  BEFORE UPDATE ON agent_memory_states
  FOR EACH ROW EXECUTE FUNCTION update_runtime_updated_at();

-- ============================================================================
-- DATA RETENTION POLICIES
-- ============================================================================

-- Function to clean up old metrics data
CREATE OR REPLACE FUNCTION cleanup_old_runtime_data()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete runtime metrics older than 30 days
  DELETE FROM runtime_metrics 
  WHERE collected_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete execution events older than 7 days
  DELETE FROM runtime_execution_events 
  WHERE timestamp < NOW() - INTERVAL '7 days';
  
  -- Delete container metrics older than 14 days
  DELETE FROM container_execution_metrics 
  WHERE timestamp < NOW() - INTERVAL '14 days';
  
  DELETE FROM container_timeout_events 
  WHERE timestamp < NOW() - INTERVAL '14 days';
  
  DELETE FROM container_error_events 
  WHERE timestamp < NOW() - INTERVAL '14 days';
  
  -- Delete expired memory states
  DELETE FROM agent_memory_states 
  WHERE expiry_time < NOW();
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA AND CONFIGURATION
-- ============================================================================

-- Insert default runtime configuration if organizations table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'organizations') THEN
    -- This will be populated when organizations are created
    -- No default data needed here
    NULL;
  END IF;
END
$$;
