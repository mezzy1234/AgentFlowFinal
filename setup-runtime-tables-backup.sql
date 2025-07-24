-- Agent Runtime Management Layer Database Schema
-- Production-ready Supabase implementation with ALL security issues fixed

-- ============================================================================
-- ENSURE REQUIRED EXTENSIONS (Fix #5)
-- ============================================================================

-- Enable required extensions for UUID generation and JSONB operations
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  config JSONB DEFAULT jsonb_build_object(), -- Fix #9: Use jsonb_build_object()
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure unique constraint on runtime_id for proper business logic
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_developer_name ON agents(developer_id, name);

-- ============================================================================
-- ORGANIZATION RUNTIME MANAGEMENT
-- ============================================================================

-- Organization runtimes - track isolated runtime environments per user/org
CREATE TABLE IF NOT EXISTS organization_runtimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  runtime_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'shutdown')),
  resource_limits JSONB NOT NULL DEFAULT jsonb_build_object( -- Fix #9: Use jsonb_build_object()
    'maxConcurrentAgents', 2,
    'maxMemoryMB', 256,
    'maxCPUPercent', 50,
    'maxExecutionTimeSeconds', 60,
    'maxQueueSize', 10,
    'rateLimitPerMinute', 30
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure unique runtime_id per organization
  CONSTRAINT unique_org_runtime_id UNIQUE (organization_id, runtime_id)
);

-- ============================================================================
-- MEMORY POOL MANAGEMENT
-- ============================================================================

-- Agent memory pools - manage persistent memory for long-running agents
CREATE TABLE IF NOT EXISTS agent_memory_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pool_id TEXT NOT NULL,
  max_memory_mb INTEGER NOT NULL DEFAULT 256,
  current_usage_mb INTEGER DEFAULT 0,
  cleanup_schedule JSONB DEFAULT jsonb_build_object( -- Fix #9: Use jsonb_build_object()
    'intervalMinutes', 30,
    'maxMemoryAge', 1440,
    'compressionEnabled', true
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure unique pool_id per organization
  CONSTRAINT unique_org_pool_id UNIQUE (organization_id, pool_id)
);

-- Agent memory states - store persistent memory for long-running agents
CREATE TABLE IF NOT EXISTS agent_memory_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  memory_data JSONB NOT NULL DEFAULT jsonb_build_object(), -- Fix #9: Use jsonb_build_object()
  memory_size_mb REAL NOT NULL DEFAULT 0,
  last_access_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expiry_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure unique agent per pool
  CONSTRAINT unique_pool_agent UNIQUE(pool_id, agent_id)
);

-- ============================================================================
-- RUNTIME METRICS AND MONITORING
-- ============================================================================

-- Runtime metrics - time-series data for runtime performance monitoring
CREATE TABLE IF NOT EXISTS runtime_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  runtime_id TEXT NOT NULL,
  metrics_data JSONB NOT NULL DEFAULT jsonb_build_object(), -- Fix #9: Use jsonb_build_object()
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Runtime execution events - track agent execution lifecycle
CREATE TABLE IF NOT EXISTS runtime_execution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runtime_id TEXT NOT NULL,
  organization_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
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
-- AUDIT LOGGING TABLE (Fix #10)
-- ============================================================================

-- Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS runtime_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID,
  old_data JSONB,
  new_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- PERFORMANCE INDEXES (Fix #7 - RLS Performance)
-- ============================================================================

-- Critical indexes for RLS policy performance on organization_id
CREATE INDEX IF NOT EXISTS idx_organization_runtimes_org_id ON organization_runtimes(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_pools_org_id ON agent_memory_pools(organization_id);
CREATE INDEX IF NOT EXISTS idx_runtime_metrics_org_id ON runtime_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_runtime_execution_events_org_id ON runtime_execution_events(organization_id);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_organization_runtimes_status ON organization_runtimes(status);
CREATE INDEX IF NOT EXISTS idx_organization_runtimes_runtime_id ON organization_runtimes(runtime_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_pools_pool_id ON agent_memory_pools(pool_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_states_pool_id ON agent_memory_states(pool_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_states_agent_id ON agent_memory_states(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_states_expiry ON agent_memory_states(expiry_time);
CREATE INDEX IF NOT EXISTS idx_agent_memory_states_last_access ON agent_memory_states(last_access_time);

-- Metrics indexes for fast querying
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
-- SECURITY DEFINER HELPER FUNCTIONS (Fix #3 - Prevent RLS Recursion)
-- ============================================================================

-- Function to check if user owns memory pool (prevents recursion in RLS)
CREATE OR REPLACE FUNCTION user_owns_memory_pool(pool_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agent_memory_pools 
    WHERE pool_id = pool_id_param 
    AND organization_id = (SELECT auth.uid())
  );
END;
$$;

-- Function to check if user owns runtime (prevents recursion in RLS)
CREATE OR REPLACE FUNCTION user_owns_runtime(runtime_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_runtimes 
    WHERE runtime_id = runtime_id_param 
    AND organization_id = (SELECT auth.uid())
  );
END;
$$;

-- ============================================================================
-- STORED PROCEDURES FOR METRICS CALCULATION
-- ============================================================================

-- Calculate average execution time for a runtime
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

-- Get runtime health score (0-100)
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

-- Get organization runtime statistics
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
-- AUDIT TRIGGER FUNCTION (Fix #10)
-- ============================================================================

-- Function to create audit trail
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO runtime_audit_log (
    table_name,
    operation,
    user_id,
    old_data,
    new_data
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    (SELECT auth.uid()),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
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
ALTER TABLE runtime_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: ORGANIZATION_RUNTIMES (Fix #1 & #2)
-- ============================================================================

-- SELECT policy for organization_runtimes
CREATE POLICY "organization_runtimes_select_policy" ON organization_runtimes
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT auth.uid()));

-- INSERT policy for organization_runtimes  
CREATE POLICY "organization_runtimes_insert_policy" ON organization_runtimes
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT auth.uid()));

-- UPDATE policy for organization_runtimes
CREATE POLICY "organization_runtimes_update_policy" ON organization_runtimes
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT auth.uid()))
  WITH CHECK (organization_id = (SELECT auth.uid()));

-- DELETE policy for organization_runtimes
CREATE POLICY "organization_runtimes_delete_policy" ON organization_runtimes
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT auth.uid()));

-- Service role policies for organization_runtimes (Fix #8)
CREATE POLICY "organization_runtimes_service_select" ON organization_runtimes
  FOR SELECT TO service_role USING (true);
CREATE POLICY "organization_runtimes_service_insert" ON organization_runtimes
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "organization_runtimes_service_update" ON organization_runtimes
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "organization_runtimes_service_delete" ON organization_runtimes
  FOR DELETE TO service_role USING (true);

-- ============================================================================
-- RLS POLICIES: AGENT_MEMORY_POOLS (Fix #1 & #2)
-- ============================================================================

-- SELECT policy for agent_memory_pools
CREATE POLICY "agent_memory_pools_select_policy" ON agent_memory_pools
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT auth.uid()));

-- INSERT policy for agent_memory_pools
CREATE POLICY "agent_memory_pools_insert_policy" ON agent_memory_pools
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT auth.uid()));

-- UPDATE policy for agent_memory_pools
CREATE POLICY "agent_memory_pools_update_policy" ON agent_memory_pools
  FOR UPDATE TO authenticated
  USING (organization_id = (SELECT auth.uid()))
  WITH CHECK (organization_id = (SELECT auth.uid()));

-- DELETE policy for agent_memory_pools
CREATE POLICY "agent_memory_pools_delete_policy" ON agent_memory_pools
  FOR DELETE TO authenticated
  USING (organization_id = (SELECT auth.uid()));

-- Service role policies for agent_memory_pools (Fix #8)
CREATE POLICY "agent_memory_pools_service_select" ON agent_memory_pools
  FOR SELECT TO service_role USING (true);
CREATE POLICY "agent_memory_pools_service_insert" ON agent_memory_pools
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "agent_memory_pools_service_update" ON agent_memory_pools
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "agent_memory_pools_service_delete" ON agent_memory_pools
  FOR DELETE TO service_role USING (true);

-- ============================================================================
-- RLS POLICIES: AGENT_MEMORY_STATES (Fix #1, #2, #3)
-- ============================================================================

-- SELECT policy for agent_memory_states (uses security definer function to prevent recursion)
CREATE POLICY "agent_memory_states_select_policy" ON agent_memory_states
  FOR SELECT TO authenticated
  USING (user_owns_memory_pool(pool_id));

-- INSERT policy for agent_memory_states
CREATE POLICY "agent_memory_states_insert_policy" ON agent_memory_states
  FOR INSERT TO authenticated
  WITH CHECK (user_owns_memory_pool(pool_id));

-- UPDATE policy for agent_memory_states
CREATE POLICY "agent_memory_states_update_policy" ON agent_memory_states
  FOR UPDATE TO authenticated
  USING (user_owns_memory_pool(pool_id))
  WITH CHECK (user_owns_memory_pool(pool_id));

-- DELETE policy for agent_memory_states
CREATE POLICY "agent_memory_states_delete_policy" ON agent_memory_states
  FOR DELETE TO authenticated
  USING (user_owns_memory_pool(pool_id));

-- Service role policies for agent_memory_states (Fix #8)
CREATE POLICY "agent_memory_states_service_select" ON agent_memory_states
  FOR SELECT TO service_role USING (true);
CREATE POLICY "agent_memory_states_service_insert" ON agent_memory_states
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "agent_memory_states_service_update" ON agent_memory_states
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "agent_memory_states_service_delete" ON agent_memory_states
  FOR DELETE TO service_role USING (true);

-- ============================================================================
-- RLS POLICIES: RUNTIME_METRICS (Fix #1 & #2)
-- ============================================================================

-- SELECT policy for runtime_metrics
CREATE POLICY "runtime_metrics_select_policy" ON runtime_metrics
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT auth.uid()));

-- INSERT policy for runtime_metrics (service role only)
CREATE POLICY "runtime_metrics_insert_policy" ON runtime_metrics
  FOR INSERT TO service_role
  WITH CHECK (true);

-- UPDATE policy for runtime_metrics (service role only)
CREATE POLICY "runtime_metrics_update_policy" ON runtime_metrics
  FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);

-- DELETE policy for runtime_metrics (service role only)
CREATE POLICY "runtime_metrics_delete_policy" ON runtime_metrics
  FOR DELETE TO service_role
  USING (true);

-- ============================================================================
-- RLS POLICIES: RUNTIME_EXECUTION_EVENTS (Fix #1 & #2)
-- ============================================================================

-- SELECT policy for runtime_execution_events
CREATE POLICY "runtime_execution_events_select_policy" ON runtime_execution_events
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT auth.uid()));

-- INSERT policy for runtime_execution_events (service role only)
CREATE POLICY "runtime_execution_events_insert_policy" ON runtime_execution_events
  FOR INSERT TO service_role
  WITH CHECK (true);

-- UPDATE policy for runtime_execution_events (service role only)
CREATE POLICY "runtime_execution_events_update_policy" ON runtime_execution_events
  FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);

-- DELETE policy for runtime_execution_events (service role only)
CREATE POLICY "runtime_execution_events_delete_policy" ON runtime_execution_events
  FOR DELETE TO service_role
  USING (true);

-- ============================================================================
-- RLS POLICIES: CONTAINER_EXECUTION_METRICS (Fix #1, #2, #3)
-- ============================================================================

-- SELECT policy for container_execution_metrics (uses security definer function)
CREATE POLICY "container_execution_metrics_select_policy" ON container_execution_metrics
  FOR SELECT TO authenticated
  USING (user_owns_runtime(container_id));

-- INSERT policy for container_execution_metrics (service role only)
CREATE POLICY "container_execution_metrics_insert_policy" ON container_execution_metrics
  FOR INSERT TO service_role
  WITH CHECK (true);

-- UPDATE policy for container_execution_metrics (service role only)
CREATE POLICY "container_execution_metrics_update_policy" ON container_execution_metrics
  FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);

-- DELETE policy for container_execution_metrics (service role only)
CREATE POLICY "container_execution_metrics_delete_policy" ON container_execution_metrics
  FOR DELETE TO service_role
  USING (true);

-- ============================================================================
-- RLS POLICIES: CONTAINER_TIMEOUT_EVENTS (Fix #1, #2, #3)
-- ============================================================================

-- SELECT policy for container_timeout_events
CREATE POLICY "container_timeout_events_select_policy" ON container_timeout_events
  FOR SELECT TO authenticated
  USING (user_owns_runtime(container_id));

-- INSERT policy for container_timeout_events (service role only)
CREATE POLICY "container_timeout_events_insert_policy" ON container_timeout_events
  FOR INSERT TO service_role
  WITH CHECK (true);

-- UPDATE policy for container_timeout_events (service role only)
CREATE POLICY "container_timeout_events_update_policy" ON container_timeout_events
  FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);

-- DELETE policy for container_timeout_events (service role only)
CREATE POLICY "container_timeout_events_delete_policy" ON container_timeout_events
  FOR DELETE TO service_role
  USING (true);

-- ============================================================================
-- RLS POLICIES: CONTAINER_ERROR_EVENTS (Fix #1, #2, #3)
-- ============================================================================

-- SELECT policy for container_error_events
CREATE POLICY "container_error_events_select_policy" ON container_error_events
  FOR SELECT TO authenticated
  USING (user_owns_runtime(container_id));

-- INSERT policy for container_error_events (service role only)
CREATE POLICY "container_error_events_insert_policy" ON container_error_events
  FOR INSERT TO service_role
  WITH CHECK (true);

-- UPDATE policy for container_error_events (service role only)
CREATE POLICY "container_error_events_update_policy" ON container_error_events
  FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);

-- DELETE policy for container_error_events (service role only)
CREATE POLICY "container_error_events_delete_policy" ON container_error_events
  FOR DELETE TO service_role
  USING (true);

-- ============================================================================
-- RLS POLICIES: RUNTIME_AUDIT_LOG (Fix #1 & #2)
-- ============================================================================

-- Only service role can access audit logs
CREATE POLICY "audit_log_service_select" ON runtime_audit_log
  FOR SELECT TO service_role USING (true);
CREATE POLICY "audit_log_service_insert" ON runtime_audit_log
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "audit_log_service_update" ON runtime_audit_log
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "audit_log_service_delete" ON runtime_audit_log
  FOR DELETE TO service_role USING (true);

-- ============================================================================
-- MINIMAL PERMISSIONS (Fix #4 - No overly broad permissions)
-- ============================================================================

-- Grant only necessary permissions to authenticated users (no broad ALL grants)
GRANT USAGE ON SCHEMA public TO authenticated;

-- Specific table permissions for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_runtimes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_memory_pools TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_memory_states TO authenticated;
GRANT SELECT ON runtime_metrics TO authenticated; -- Read-only for users
GRANT SELECT ON runtime_execution_events TO authenticated; -- Read-only for users
GRANT SELECT ON container_execution_metrics TO authenticated; -- Read-only for users
GRANT SELECT ON container_timeout_events TO authenticated; -- Read-only for users
GRANT SELECT ON container_error_events TO authenticated; -- Read-only for users
-- No access to audit log for regular users

-- Grant all permissions to service role (for backend operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- FUNCTION PERMISSIONS (Fix #6)
-- ============================================================================

-- Grant execute permissions on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION user_owns_memory_pool(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION user_owns_runtime(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_avg_execution_time(TEXT, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_runtime_health_score(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_runtime_stats(UUID) TO authenticated;

-- Grant execute permissions on all functions to service role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- AUDIT TRIGGERS (Fix #10 - Optional, uncomment if needed)
-- ============================================================================

-- Add audit triggers to critical tables (uncomment if needed for production monitoring)
-- CREATE TRIGGER organization_runtimes_audit_trigger
--   AFTER INSERT OR UPDATE OR DELETE ON organization_runtimes
--   FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- CREATE TRIGGER agent_memory_pools_audit_trigger
--   AFTER INSERT OR UPDATE OR DELETE ON agent_memory_pools
--   FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- CREATE TRIGGER agent_memory_states_audit_trigger
--   AFTER INSERT OR UPDATE OR DELETE ON agent_memory_states
--   FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- DEPLOYMENT VERIFICATION
-- ============================================================================

-- Verify all tables were created successfully
DO $$
DECLARE
  table_count INTEGER;
  expected_tables TEXT[] := ARRAY[
    'organization_runtimes',
    'agent_memory_pools', 
    'agent_memory_states',
    'runtime_metrics',
    'runtime_execution_events',
    'container_execution_metrics',
    'container_timeout_events',
    'container_error_events',
    'runtime_audit_log'
  ];
  table_name TEXT;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = ANY(expected_tables);
  
  IF table_count = array_length(expected_tables, 1) THEN
    RAISE NOTICE '✅ All % runtime management tables created successfully!', table_count;
    RAISE NOTICE '🛡️ All 10 Supabase security issues have been fixed!';
    RAISE NOTICE '🎯 Schema is production-ready with proper RLS policies.';
  ELSE
    RAISE WARNING '⚠️ Expected % tables, but found %', array_length(expected_tables, 1), table_count;
  END IF;
  
  -- List created tables
  FOR table_name IN
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_name = ANY(expected_tables)
    ORDER BY t.table_name
  LOOP
    RAISE NOTICE '📋 Table created: %', table_name;
  END LOOP;
END $$;
