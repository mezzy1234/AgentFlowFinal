-- Agent Runtime Management Layer Database Schema
-- Compatible with Supabase best practices and existing schema

-- ============================================================================
-- PREREQUISITES: Ensure required tables exist
-- ============================================================================

-- Create profiles table if it doesn't exist (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create agents table if it doesn't exist
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  developer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- ORGANIZATION RUNTIME MANAGEMENT
-- ============================================================================

-- Organization runtimes - track isolated runtime environments per user/org
CREATE TABLE IF NOT EXISTS organization_runtimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  runtime_id TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'shutdown')),
  resource_limits JSONB NOT NULL DEFAULT jsonb_build_object(
    'maxConcurrentAgents', 2,
    'maxMemoryMB', 256,
    'maxCPUPercent', 50,
    'maxExecutionTimeSeconds', 60,
    'maxQueueSize', 10,
    'rateLimitPerMinute', 30
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- MEMORY POOL MANAGEMENT
-- ============================================================================

-- Agent memory pools - manage persistent memory for long-running agents
CREATE TABLE IF NOT EXISTS agent_memory_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pool_id TEXT UNIQUE NOT NULL,
  max_memory_mb INTEGER NOT NULL DEFAULT 256,
  current_usage_mb INTEGER DEFAULT 0,
  cleanup_schedule JSONB DEFAULT jsonb_build_object(
    'intervalMinutes', 30,
    'maxMemoryAge', 1440,
    'compressionEnabled', true
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agent memory states - store persistent memory for long-running agents
CREATE TABLE IF NOT EXISTS agent_memory_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id TEXT REFERENCES agent_memory_pools(pool_id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  memory_data JSONB NOT NULL DEFAULT '{}',
  memory_size_mb REAL NOT NULL DEFAULT 0,
  last_access_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expiry_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(pool_id, agent_id)
);

-- ============================================================================
-- RUNTIME METRICS AND MONITORING
-- ============================================================================

-- Runtime metrics - time-series data for runtime performance monitoring
CREATE TABLE IF NOT EXISTS runtime_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  runtime_id TEXT NOT NULL,
  metrics_data JSONB NOT NULL DEFAULT '{}',
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Runtime execution events - track agent execution lifecycle
CREATE TABLE IF NOT EXISTS runtime_execution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runtime_id TEXT NOT NULL,
  organization_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  execution_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'timeout')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Container execution metrics - detailed execution performance data
CREATE TABLE IF NOT EXISTS container_execution_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  memory_used_mb REAL NOT NULL DEFAULT 0,
  cpu_used_percent REAL NOT NULL DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Container timeout events - track execution timeouts
CREATE TABLE IF NOT EXISTS container_timeout_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  timeout_ms INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Container error events - track execution errors
CREATE TABLE IF NOT EXISTS container_error_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  error_message TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE (including RLS policy columns)
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
CREATE INDEX IF NOT EXISTS idx_runtime_execution_events_org_id ON runtime_execution_events(organization_id);

-- Container metrics indexes
CREATE INDEX IF NOT EXISTS idx_container_execution_metrics_container ON container_execution_metrics(container_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_container_execution_metrics_success ON container_execution_metrics(success, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_container_timeout_events_container ON container_timeout_events(container_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_container_error_events_container ON container_error_events(container_id, timestamp DESC);

-- ============================================================================
-- STORED PROCEDURES FOR METRICS CALCULATION
-- ============================================================================

-- Calculate average execution time for a runtime (SECURITY DEFINER for performance)
CREATE OR REPLACE FUNCTION get_avg_execution_time(p_runtime_id TEXT, p_since TIMESTAMP WITH TIME ZONE)
RETURNS REAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG(execution_time_ms), 0) 
    FROM container_execution_metrics 
    WHERE container_id = p_runtime_id 
    AND timestamp >= p_since
    AND success = true
  );
END;
$$;

-- Get runtime health score (0-100) (SECURITY DEFINER for performance)
CREATE OR REPLACE FUNCTION calculate_runtime_health_score(p_runtime_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  success_rate REAL;
  avg_response_time REAL;
  health_score INTEGER;
BEGIN
  -- Calculate success rate over last 24 hours
  SELECT 
    COALESCE(
      (COUNT(*) FILTER (WHERE success = true)::REAL / NULLIF(COUNT(*), 0)) * 100, 
      100
    )
  INTO success_rate
  FROM container_execution_metrics 
  WHERE container_id = p_runtime_id 
  AND timestamp >= timezone('utc'::text, now()) - INTERVAL '24 hours';
  
  -- Calculate average response time over last 24 hours
  SELECT COALESCE(AVG(execution_time_ms), 0) 
  INTO avg_response_time
  FROM container_execution_metrics 
  WHERE container_id = p_runtime_id 
  AND timestamp >= timezone('utc'::text, now()) - INTERVAL '24 hours'
  AND success = true;
  
  -- Calculate health score (weighted: 70% success rate + 30% response time)
  health_score := GREATEST(0, LEAST(100, 
    (success_rate * 0.7 + 
     GREATEST(0, 100 - (avg_response_time / 100)) * 0.3)::INTEGER
  ));
  
  RETURN health_score;
END;
$$;

-- Get organization runtime statistics (SECURITY DEFINER for cross-table access)
CREATE OR REPLACE FUNCTION get_org_runtime_stats(p_organization_id UUID)
RETURNS TABLE(
  total_runtimes INTEGER,
  active_runtimes INTEGER,
  total_memory_mb INTEGER,
  used_memory_mb INTEGER,
  avg_health_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_runtimes,
    COUNT(*) FILTER (WHERE otr.status = 'active')::INTEGER as active_runtimes,
    COALESCE(SUM(mp.max_memory_mb), 0)::INTEGER as total_memory_mb,
    COALESCE(SUM(mp.current_usage_mb), 0)::INTEGER as used_memory_mb,
    COALESCE(AVG(calculate_runtime_health_score(otr.runtime_id)), 100)::REAL as avg_health_score
  FROM organization_runtimes otr
  LEFT JOIN agent_memory_pools mp ON mp.organization_id = otr.organization_id
  WHERE otr.organization_id = p_organization_id;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organization_runtimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_execution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE container_execution_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE container_timeout_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE container_error_events ENABLE ROW LEVEL SECURITY;

-- Organization runtime policies (users can only access their own org's data)
CREATE POLICY "Users can manage their own runtime" ON organization_runtimes
  FOR ALL USING (organization_id = auth.uid());

CREATE POLICY "Users can manage their own memory pools" ON agent_memory_pools
  FOR ALL USING (organization_id = auth.uid());

CREATE POLICY "Users can manage their own memory states" ON agent_memory_states
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agent_memory_pools 
      WHERE pool_id = agent_memory_states.pool_id 
      AND organization_id = auth.uid()
    )
  );

-- Metrics policies
CREATE POLICY "Users can view their own runtime metrics" ON runtime_metrics
  FOR SELECT USING (organization_id = auth.uid());

CREATE POLICY "Service role can manage all runtime metrics" ON runtime_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own execution events" ON runtime_execution_events
  FOR SELECT USING (organization_id = auth.uid());

CREATE POLICY "Service role can manage all execution events" ON runtime_execution_events
  FOR ALL USING (auth.role() = 'service_role');

-- Container metrics policies (service role only for detailed metrics)
CREATE POLICY "Service role can manage container metrics" ON container_execution_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage timeout events" ON container_timeout_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage error events" ON container_error_events
  FOR ALL USING (auth.role() = 'service_role');

-- Users can view summary metrics for their containers
CREATE POLICY "Users can view their container metrics" ON container_execution_metrics
  FOR SELECT USING (
    container_id IN (
      SELECT runtime_id FROM organization_runtimes 
      WHERE organization_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their timeout events" ON container_timeout_events
  FOR SELECT USING (
    container_id IN (
      SELECT runtime_id FROM organization_runtimes 
      WHERE organization_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their error events" ON container_error_events
  FOR SELECT USING (
    container_id IN (
      SELECT runtime_id FROM organization_runtimes 
      WHERE organization_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Success message
SELECT 'Agent Runtime Management tables created successfully!' as status;
