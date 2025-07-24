-- ULTRA-SIMPLE Runtime Schema - No Custom Functions
-- Uses basic Supabase patterns that always work

-- Basic runtime table - no complex relationships
CREATE TABLE IF NOT EXISTS runtime_data (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT DEFAULT auth.uid()::text,
    runtime_name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    memory_mb INTEGER DEFAULT 256,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE runtime_data ENABLE ROW LEVEL SECURITY;

-- Ultra-simple policy - just check user_id matches
CREATE POLICY runtime_user_policy ON runtime_data
    FOR ALL 
    USING (user_id = auth.uid()::text);

-- Service role policy
CREATE POLICY runtime_service_policy ON runtime_data
    FOR ALL TO service_role
    USING (true);

-- Grant permissions
GRANT ALL ON runtime_data TO authenticated;
GRANT ALL ON runtime_data TO service_role;
GRANT USAGE, SELECT ON SEQUENCE runtime_data_id_seq TO authenticated;

SELECT 'Ultra-Simple Runtime Schema Ready!' as status;
