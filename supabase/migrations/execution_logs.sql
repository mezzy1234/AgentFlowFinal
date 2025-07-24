-- Create agent execution logs table for comprehensive logging
CREATE TABLE IF NOT EXISTS agent_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id VARCHAR(255) UNIQUE NOT NULL,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'webhook', 'api')),
    trigger_data JSONB,
    execution_start TIMESTAMP WITH TIME ZONE NOT NULL,
    execution_end TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    total_steps INTEGER DEFAULT 0,
    completed_steps INTEGER DEFAULT 0,
    error_message TEXT,
    performance_metrics JSONB DEFAULT '{
        "total_duration_ms": 0,
        "step_durations": {},
        "memory_usage": 0,
        "api_calls_count": 0,
        "data_processed_bytes": 0
    }'::jsonb,
    step_logs JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{
        "version": "1.0.0",
        "environment": "development"
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_execution_logs_execution_id ON agent_execution_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_agent_id ON agent_execution_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_user_id ON agent_execution_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_status ON agent_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_execution_logs_trigger_type ON agent_execution_logs(trigger_type);
CREATE INDEX IF NOT EXISTS idx_execution_logs_start_time ON agent_execution_logs(execution_start);
CREATE INDEX IF NOT EXISTS idx_execution_logs_end_time ON agent_execution_logs(execution_end);

-- Create partial indexes for active executions
CREATE INDEX IF NOT EXISTS idx_execution_logs_active ON agent_execution_logs(user_id, status) 
WHERE status IN ('pending', 'running');

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_execution_logs_user_agent_time ON agent_execution_logs(user_id, agent_id, execution_start DESC);
CREATE INDEX IF NOT EXISTS idx_execution_logs_user_status_time ON agent_execution_logs(user_id, status, execution_start DESC);

-- Create function to update performance metrics automatically
CREATE OR REPLACE FUNCTION update_execution_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total duration if execution is completed
    IF NEW.execution_end IS NOT NULL AND OLD.execution_end IS NULL THEN
        NEW.performance_metrics = jsonb_set(
            NEW.performance_metrics,
            '{total_duration_ms}',
            to_jsonb(EXTRACT(EPOCH FROM (NEW.execution_end - NEW.execution_start)) * 1000)
        );
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic performance metrics updates
CREATE TRIGGER trigger_update_execution_metrics
    BEFORE UPDATE ON agent_execution_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_execution_performance_metrics();

-- Create function to clean up old execution logs (optional retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_execution_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM agent_execution_logs 
    WHERE execution_start < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for execution analytics
CREATE OR REPLACE VIEW execution_analytics AS
SELECT 
    user_id,
    agent_id,
    DATE(execution_start) as execution_date,
    COUNT(*) as total_executions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_executions,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_executions,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_executions,
    ROUND(
        (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 
        2
    ) as success_rate,
    AVG(
        CASE 
            WHEN execution_end IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (execution_end - execution_start)) * 1000 
        END
    )::INTEGER as avg_duration_ms,
    SUM((performance_metrics->>'api_calls_count')::INTEGER) as total_api_calls,
    SUM((performance_metrics->>'data_processed_bytes')::BIGINT) as total_data_processed
FROM agent_execution_logs
GROUP BY user_id, agent_id, DATE(execution_start);
