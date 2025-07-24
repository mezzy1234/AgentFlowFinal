-- NO-AUTH Runtime Schema - Manual User Management
-- Completely bypasses Supabase auth system issues

-- Simple user management
CREATE TABLE IF NOT EXISTS app_users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Runtime management without auth dependencies
CREATE TABLE IF NOT EXISTS app_runtimes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES app_users(id),
    runtime_name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    memory_limit INTEGER DEFAULT 256,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory pools
CREATE TABLE IF NOT EXISTS app_memory_pools (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES app_users(id),
    pool_name TEXT NOT NULL,
    max_memory INTEGER DEFAULT 256,
    current_usage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- No RLS - handle security in application layer
-- This is often more reliable than fighting with RLS

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_runtimes_user ON app_runtimes(user_id);
CREATE INDEX IF NOT EXISTS idx_pools_user ON app_memory_pools(user_id);

-- Grant basic permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Insert a test user
INSERT INTO app_users (username, email) 
VALUES ('testuser', 'test@example.com') 
ON CONFLICT (username) DO NOTHING;

SELECT 'Application-Level Security Schema Ready!' as status;
