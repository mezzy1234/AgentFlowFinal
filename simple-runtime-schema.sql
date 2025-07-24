-- SIMPLE Agent Runtime Schema - Zero UUID Casting Issues
-- This approach uses text-based IDs and simpler RLS policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Simple profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    email TEXT,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization runtimes with text IDs
CREATE TABLE IF NOT EXISTS organization_runtimes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    runtime_id TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    memory_limit_mb INTEGER DEFAULT 256,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, runtime_id)
);

-- Agent memory pools with text IDs
CREATE TABLE IF NOT EXISTS agent_memory_pools (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    pool_id TEXT NOT NULL,
    max_memory_mb INTEGER DEFAULT 256,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, pool_id)
);

-- Simple function without UUID casting
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT COALESCE(current_setting('request.jwt.claims', true)::json->>'sub', 'anonymous');
$$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_runtimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_pools ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies using our function
CREATE POLICY profiles_policy ON profiles
    FOR ALL TO authenticated
    USING (id = get_current_user_id())
    WITH CHECK (id = get_current_user_id());

CREATE POLICY runtimes_policy ON organization_runtimes
    FOR ALL TO authenticated
    USING (user_id = get_current_user_id())
    WITH CHECK (user_id = get_current_user_id());

CREATE POLICY memory_pools_policy ON agent_memory_pools
    FOR ALL TO authenticated
    USING (user_id = get_current_user_id())
    WITH CHECK (user_id = get_current_user_id());

-- Service role access
CREATE POLICY profiles_service ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY runtimes_service ON organization_runtimes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY pools_service ON agent_memory_pools FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON organization_runtimes TO authenticated;
GRANT ALL ON agent_memory_pools TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;

-- Service role permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_runtimes_user_id ON organization_runtimes(user_id);
CREATE INDEX IF NOT EXISTS idx_pools_user_id ON agent_memory_pools(user_id);

SELECT 'Simple Runtime Schema Created Successfully!' as result;
