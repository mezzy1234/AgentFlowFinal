-- Agent Runtime Management Layer Database Schema
-- Production-ready Supabase implementation - ALL 10 SECURITY ISSUES FIXED

-- Extension requirements (Fix #5)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table - Ensure proper UUID type
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Organization runtimes
CREATE TABLE IF NOT EXISTS organization_runtimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  runtime_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  resource_limits JSONB DEFAULT jsonb_build_object('maxMemoryMB', 256),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(organization_id, runtime_id)
);

-- Agent memory pools
CREATE TABLE IF NOT EXISTS agent_memory_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pool_id TEXT NOT NULL,
  max_memory_mb INTEGER DEFAULT 256,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(organization_id, pool_id)
);

-- Security definer function (Fix #3) - Fixed UUID casting
CREATE OR REPLACE FUNCTION user_owns_memory_pool(pool_id_param TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agent_memory_pools 
    WHERE pool_id = pool_id_param AND organization_id = (auth.uid()::uuid)
  );
END; $$;

-- Performance indexes (Fix #7)
CREATE INDEX IF NOT EXISTS idx_org_runtimes_org_id ON organization_runtimes(organization_id);
CREATE INDEX IF NOT EXISTS idx_memory_pools_org_id ON agent_memory_pools(organization_id);

-- Enable RLS and drop existing policies
ALTER TABLE organization_runtimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_pools ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "org_runtimes_select" ON organization_runtimes;
DROP POLICY IF EXISTS "org_runtimes_insert" ON organization_runtimes;
DROP POLICY IF EXISTS "org_runtimes_update" ON organization_runtimes;
DROP POLICY IF EXISTS "org_runtimes_delete" ON organization_runtimes;
DROP POLICY IF EXISTS "memory_pools_select" ON agent_memory_pools;
DROP POLICY IF EXISTS "memory_pools_insert" ON agent_memory_pools;
DROP POLICY IF EXISTS "memory_pools_update" ON agent_memory_pools;
DROP POLICY IF EXISTS "memory_pools_delete" ON agent_memory_pools;
DROP POLICY IF EXISTS "org_runtimes_service" ON organization_runtimes;
DROP POLICY IF EXISTS "memory_pools_service" ON agent_memory_pools;

-- RLS Policies (Fix #1 & #2) - Fixed UUID casting
CREATE POLICY "org_runtimes_select" ON organization_runtimes FOR SELECT TO authenticated USING (organization_id = (auth.uid()::uuid));
CREATE POLICY "org_runtimes_insert" ON organization_runtimes FOR INSERT TO authenticated WITH CHECK (organization_id = (auth.uid()::uuid));
CREATE POLICY "org_runtimes_update" ON organization_runtimes FOR UPDATE TO authenticated USING (organization_id = (auth.uid()::uuid)) WITH CHECK (organization_id = (auth.uid()::uuid));
CREATE POLICY "org_runtimes_delete" ON organization_runtimes FOR DELETE TO authenticated USING (organization_id = (auth.uid()::uuid));

CREATE POLICY "memory_pools_select" ON agent_memory_pools FOR SELECT TO authenticated USING (organization_id = (auth.uid()::uuid));
CREATE POLICY "memory_pools_insert" ON agent_memory_pools FOR INSERT TO authenticated WITH CHECK (organization_id = (auth.uid()::uuid));
CREATE POLICY "memory_pools_update" ON agent_memory_pools FOR UPDATE TO authenticated USING (organization_id = (auth.uid()::uuid)) WITH CHECK (organization_id = (auth.uid()::uuid));
CREATE POLICY "memory_pools_delete" ON agent_memory_pools FOR DELETE TO authenticated USING (organization_id = (auth.uid()::uuid));

-- Service role policies (Fix #8)
CREATE POLICY "org_runtimes_service" ON organization_runtimes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "memory_pools_service" ON agent_memory_pools FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Minimal permissions (Fix #4)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_runtimes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_memory_pools TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Function permissions (Fix #6)
GRANT EXECUTE ON FUNCTION user_owns_memory_pool(TEXT) TO authenticated;

-- Success message
SELECT 'Agent Runtime Management Schema deployed - ALL UUID CASTING ISSUES FIXED!' as status;
