-- Create API keys table for user API key management
CREATE TABLE IF NOT EXISTS api_keys (
    id VARCHAR(16) PRIMARY KEY, -- Using the key ID as primary key
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(50) NOT NULL,
    key_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of the full API key
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    rate_limits JSONB NOT NULL DEFAULT '{
        "requests_per_minute": 60,
        "requests_per_hour": 1000,
        "requests_per_day": 10000,
        "burst_limit": 10
    }'::jsonb,
    usage_stats JSONB NOT NULL DEFAULT '{
        "total_requests": 0,
        "requests_today": 0,
        "requests_this_month": 0,
        "most_used_endpoint": "",
        "error_rate": 0
    }'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create API key usage tracking table
CREATE TABLE IF NOT EXISTS api_key_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id VARCHAR(16) NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    user_agent TEXT,
    ip_address INET,
    request_size_bytes INTEGER DEFAULT 0,
    response_size_bytes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_id ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_created_at ON api_key_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_endpoint ON api_key_usage(endpoint);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_time ON api_key_usage(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_status ON api_keys(user_id, status);

-- Create function to clean up expired API keys
CREATE OR REPLACE FUNCTION cleanup_expired_api_keys()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE api_keys 
    SET status = 'expired', updated_at = NOW()
    WHERE expires_at < NOW() AND status = 'active';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old usage records (optional retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_api_usage(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_key_usage 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for API key analytics
CREATE OR REPLACE VIEW api_key_analytics AS
SELECT 
    ak.id,
    ak.name,
    ak.user_id,
    ak.status,
    COUNT(aku.id) as total_requests,
    COUNT(CASE WHEN aku.status_code < 400 THEN 1 END) as successful_requests,
    COUNT(CASE WHEN aku.status_code >= 400 THEN 1 END) as error_requests,
    ROUND(
        (COUNT(CASE WHEN aku.status_code < 400 THEN 1 END)::DECIMAL / NULLIF(COUNT(aku.id), 0)) * 100, 
        2
    ) as success_rate,
    AVG(aku.response_time_ms)::INTEGER as avg_response_time_ms,
    MIN(aku.created_at) as first_used_at,
    MAX(aku.created_at) as last_used_at,
    COUNT(CASE 
        WHEN aku.created_at >= CURRENT_DATE - INTERVAL '1 day' 
        THEN 1 
    END) as requests_last_24h,
    COUNT(CASE 
        WHEN aku.created_at >= CURRENT_DATE - INTERVAL '7 days' 
        THEN 1 
    END) as requests_last_7d,
    COUNT(CASE 
        WHEN aku.created_at >= CURRENT_DATE - INTERVAL '30 days' 
        THEN 1 
    END) as requests_last_30d
FROM api_keys ak
LEFT JOIN api_key_usage aku ON ak.id = aku.api_key_id
GROUP BY ak.id, ak.name, ak.user_id, ak.status;

-- Create function to update API key usage stats
CREATE OR REPLACE FUNCTION update_api_key_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update usage stats in the api_keys table
    UPDATE api_keys 
    SET 
        usage_stats = jsonb_set(
            jsonb_set(
                usage_stats,
                '{total_requests}',
                to_jsonb((usage_stats->>'total_requests')::integer + 1)
            ),
            '{last_request_at}',
            to_jsonb(NEW.created_at::text)
        ),
        last_used_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.api_key_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stats on usage
CREATE TRIGGER trigger_update_api_key_stats
    AFTER INSERT ON api_key_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_api_key_stats();

-- Create function for rate limiting checks (to be used by application)
CREATE OR REPLACE FUNCTION check_rate_limit(
    key_id VARCHAR(16),
    window_minutes INTEGER DEFAULT 1,
    max_requests INTEGER DEFAULT 60
) RETURNS TABLE(
    allowed BOOLEAN,
    current_count INTEGER,
    remaining INTEGER,
    reset_time TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    window_start TIMESTAMP WITH TIME ZONE;
    request_count INTEGER;
    next_reset TIMESTAMP WITH TIME ZONE;
BEGIN
    window_start := NOW() - INTERVAL '1 minute' * window_minutes;
    next_reset := DATE_TRUNC('minute', NOW()) + INTERVAL '1 minute' * window_minutes;
    
    SELECT COUNT(*) INTO request_count
    FROM api_key_usage
    WHERE api_key_id = key_id 
    AND created_at >= window_start;
    
    RETURN QUERY SELECT 
        request_count < max_requests as allowed,
        request_count as current_count,
        GREATEST(0, max_requests - request_count) as remaining,
        next_reset as reset_time;
END;
$$ LANGUAGE plpgsql;
