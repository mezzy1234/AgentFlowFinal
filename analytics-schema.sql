-- Analytics & Reporting System
-- Comprehensive analytics for agents, users, and platform metrics

-- Agent Analytics Events
CREATE TABLE IF NOT EXISTS agent_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(100) NOT NULL UNIQUE,
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL,
  developer_id UUID NOT NULL, -- Agent creator
  event_type VARCHAR(50) NOT NULL, -- 'execution', 'download', 'install', 'uninstall', 'error', 'rating'
  event_category VARCHAR(50), -- 'usage', 'performance', 'engagement', 'revenue'
  session_id VARCHAR(100), -- For grouping related events
  properties JSONB DEFAULT '{}', -- Event-specific data
  metrics JSONB DEFAULT '{}', -- Numerical metrics (response_time, memory, etc.)
  user_agent TEXT,
  ip_address INET,
  country_code VARCHAR(2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE
);

-- Agent Performance Metrics (aggregated)
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  metric_date DATE NOT NULL,
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  avg_memory_usage_mb DECIMAL(8,2) DEFAULT 0,
  avg_cpu_usage_percent DECIMAL(5,2) DEFAULT 0,
  total_api_calls INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  total_revenue_cents INTEGER DEFAULT 0, -- Revenue generated
  popularity_score DECIMAL(8,4) DEFAULT 0, -- Calculated popularity
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, metric_type, metric_date)
);

-- User Analytics Summary
CREATE TABLE IF NOT EXISTS user_analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  summary_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  summary_date DATE NOT NULL,
  agents_used INTEGER DEFAULT 0,
  total_executions INTEGER DEFAULT 0,
  total_spend_cents INTEGER DEFAULT 0,
  favorite_categories TEXT[] DEFAULT '{}',
  most_used_agent_id UUID,
  usage_pattern JSONB DEFAULT '{}', -- Time-based usage patterns
  engagement_score DECIMAL(8,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, summary_type, summary_date)
);

-- Developer Analytics Summary
CREATE TABLE IF NOT EXISTS developer_analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL,
  summary_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  summary_date DATE NOT NULL,
  total_agents INTEGER DEFAULT 0,
  active_agents INTEGER DEFAULT 0,
  total_downloads INTEGER DEFAULT 0,
  total_executions INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  total_revenue_cents INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  top_performing_agent_id UUID,
  revenue_by_agent JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(developer_id, summary_type, summary_date)
);

-- Platform Analytics Summary
CREATE TABLE IF NOT EXISTS platform_analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  summary_date DATE NOT NULL,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_developers INTEGER DEFAULT 0,
  active_developers INTEGER DEFAULT 0,
  total_agents INTEGER DEFAULT 0,
  public_agents INTEGER DEFAULT 0,
  total_executions INTEGER DEFAULT 0,
  total_revenue_cents INTEGER DEFAULT 0,
  top_categories JSONB DEFAULT '[]',
  growth_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(summary_type, summary_date)
);

-- Custom Dashboard Configurations
CREATE TABLE IF NOT EXISTS analytics_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  dashboard_name VARCHAR(100) NOT NULL,
  dashboard_type VARCHAR(50) DEFAULT 'custom', -- 'custom', 'developer', 'admin', 'user'
  widgets JSONB NOT NULL, -- Widget configurations
  filters JSONB DEFAULT '{}', -- Default filters
  refresh_interval INTEGER DEFAULT 300, -- Seconds
  is_public BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled Analytics Reports
CREATE TABLE IF NOT EXISTS analytics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  report_name VARCHAR(100) NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- 'agent_performance', 'revenue', 'usage', 'custom'
  schedule_type VARCHAR(20) DEFAULT 'manual', -- 'manual', 'daily', 'weekly', 'monthly'
  report_config JSONB NOT NULL, -- Report parameters and filters
  delivery_method VARCHAR(20) DEFAULT 'dashboard', -- 'dashboard', 'email', 'webhook'
  delivery_config JSONB DEFAULT '{}', -- Email addresses, webhook URLs, etc.
  last_generated TIMESTAMP WITH TIME ZONE,
  next_scheduled TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Cache (for expensive queries)
CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  cache_data JSONB NOT NULL,
  cache_tags TEXT[] DEFAULT '{}', -- For cache invalidation
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_analytics_events_agent_id ON agent_analytics_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_events_user_id ON agent_analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_events_developer_id ON agent_analytics_events(developer_id);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_events_timestamp ON agent_analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_events_type ON agent_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_events_processed ON agent_analytics_events(processed) WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent_id ON agent_performance_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_date ON agent_performance_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_type ON agent_performance_metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_user_analytics_summary_user_id ON user_analytics_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_summary_date ON user_analytics_summary(summary_date);

CREATE INDEX IF NOT EXISTS idx_developer_analytics_summary_developer_id ON developer_analytics_summary(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_analytics_summary_date ON developer_analytics_summary(summary_date);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);

-- PostgreSQL functions for analytics operations
CREATE OR REPLACE FUNCTION track_analytics_event(
    p_event_id VARCHAR,
    p_agent_id VARCHAR,
    p_user_id VARCHAR,
    p_developer_id VARCHAR,
    p_event_type VARCHAR,
    p_event_category VARCHAR DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL,
    p_properties JSONB DEFAULT '{}',
    p_metrics JSONB DEFAULT '{}',
    p_user_agent VARCHAR DEFAULT NULL,
    p_ip_address VARCHAR DEFAULT NULL,
    p_country_code VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO agent_analytics_events (
        event_id, agent_id, user_id, developer_id, event_type, event_category,
        session_id, properties, metrics, user_agent, ip_address, country_code,
        created_at
    ) VALUES (
        p_event_id, p_agent_id, p_user_id, p_developer_id, p_event_type, p_event_category,
        p_session_id, p_properties, p_metrics, p_user_agent, p_ip_address, p_country_code,
        NOW()
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to get agent analytics summary
CREATE OR REPLACE FUNCTION get_agent_analytics_summary(
    p_agent_id VARCHAR,
    p_date_from DATE,
    p_date_to DATE
)
RETURNS TABLE(
    total_executions BIGINT,
    successful_executions BIGINT,
    success_rate NUMERIC,
    avg_response_time_ms NUMERIC,
    unique_users BIGINT,
    total_revenue_cents BIGINT,
    daily_trend JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE event_type = 'agent_execution') as total_executions,
        COUNT(*) FILTER (WHERE event_type = 'agent_execution' AND (properties->>'success')::boolean = true) as successful_executions,
        CASE 
            WHEN COUNT(*) FILTER (WHERE event_type = 'agent_execution') > 0 THEN
                ROUND(COUNT(*) FILTER (WHERE event_type = 'agent_execution' AND (properties->>'success')::boolean = true) * 100.0 / 
                      COUNT(*) FILTER (WHERE event_type = 'agent_execution'), 2)
            ELSE 0
        END as success_rate,
        ROUND(AVG((metrics->>'response_time_ms')::numeric) FILTER (WHERE event_type = 'agent_execution'), 2) as avg_response_time_ms,
        COUNT(DISTINCT user_id) as unique_users,
        COALESCE(SUM((metrics->>'revenue_cents')::bigint) FILTER (WHERE event_type = 'agent_execution'), 0) as total_revenue_cents,
        (
            SELECT COALESCE(json_agg(daily_data ORDER BY metric_date), '[]'::json)::jsonb
            FROM (
                SELECT 
                    DATE(created_at) as metric_date,
                    COUNT(*) FILTER (WHERE event_type = 'agent_execution') as executions,
                    COUNT(*) FILTER (WHERE event_type = 'agent_execution' AND (properties->>'success')::boolean = true) as successes,
                    COUNT(DISTINCT user_id) as users,
                    COALESCE(SUM((metrics->>'revenue_cents')::bigint), 0) as revenue
                FROM agent_analytics_events
                WHERE agent_id = p_agent_id
                    AND DATE(created_at) BETWEEN p_date_from AND p_date_to
                GROUP BY DATE(created_at)
                ORDER BY metric_date
            ) daily_data
        ) as daily_trend
    FROM agent_analytics_events
    WHERE agent_id = p_agent_id
        AND DATE(created_at) BETWEEN p_date_from AND p_date_to;
END;
$$ LANGUAGE plpgsql;

-- Function to get developer revenue analytics
CREATE OR REPLACE FUNCTION get_developer_revenue_analytics(
    p_developer_id VARCHAR,
    p_date_from DATE,
    p_date_to DATE
)
RETURNS TABLE(
    total_revenue_cents BIGINT,
    total_executions BIGINT,
    avg_revenue_per_execution NUMERIC,
    top_agents JSONB,
    daily_revenue JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM((metrics->>'revenue_cents')::bigint), 0) as total_revenue_cents,
        COUNT(*) FILTER (WHERE event_type = 'agent_execution') as total_executions,
        CASE 
            WHEN COUNT(*) FILTER (WHERE event_type = 'agent_execution') > 0 THEN
                ROUND(COALESCE(SUM((metrics->>'revenue_cents')::bigint), 0) / 
                      COUNT(*) FILTER (WHERE event_type = 'agent_execution'), 2)
            ELSE 0
        END as avg_revenue_per_execution,
        (
            SELECT COALESCE(json_agg(agent_data ORDER BY revenue DESC), '[]'::json)::jsonb
            FROM (
                SELECT 
                    agent_id,
                    COUNT(*) as executions,
                    COALESCE(SUM((metrics->>'revenue_cents')::bigint), 0) as revenue
                FROM agent_analytics_events
                WHERE developer_id = p_developer_id
                    AND event_type = 'agent_execution'
                    AND DATE(created_at) BETWEEN p_date_from AND p_date_to
                GROUP BY agent_id
                ORDER BY revenue DESC
                LIMIT 10
            ) agent_data
        ) as top_agents,
        (
            SELECT COALESCE(json_agg(daily_data ORDER BY metric_date), '[]'::json)::jsonb
            FROM (
                SELECT 
                    DATE(created_at) as metric_date,
                    COALESCE(SUM((metrics->>'revenue_cents')::bigint), 0) as revenue,
                    COUNT(*) as executions
                FROM agent_analytics_events
                WHERE developer_id = p_developer_id
                    AND event_type = 'agent_execution'
                    AND DATE(created_at) BETWEEN p_date_from AND p_date_to
                GROUP BY DATE(created_at)
                ORDER BY metric_date
            ) daily_data
        ) as daily_revenue
    FROM agent_analytics_events
    WHERE developer_id = p_developer_id
        AND DATE(created_at) BETWEEN p_date_from AND p_date_to;
END;
$$ LANGUAGE plpgsql;

-- Function to get top agents analytics
CREATE OR REPLACE FUNCTION get_top_agents_analytics(
    p_metric VARCHAR,
    p_limit INTEGER,
    p_date_from DATE,
    p_date_to DATE
)
RETURNS TABLE(
    agent_id VARCHAR,
    agent_name VARCHAR,
    agent_description VARCHAR,
    agent_category VARCHAR,
    developer_id VARCHAR,
    total_executions BIGINT,
    successful_executions BIGINT,
    success_rate NUMERIC,
    total_revenue_cents BIGINT,
    unique_users BIGINT,
    avg_response_time_ms NUMERIC
) AS $$
DECLARE
    order_clause TEXT;
BEGIN
    -- Set order clause based on metric
    CASE p_metric
        WHEN 'revenue' THEN order_clause := 'total_revenue_cents DESC';
        WHEN 'users' THEN order_clause := 'unique_users DESC';
        WHEN 'success_rate' THEN order_clause := 'success_rate DESC';
        WHEN 'performance' THEN order_clause := 'avg_response_time_ms ASC';
        ELSE order_clause := 'total_executions DESC';
    END CASE;

    RETURN QUERY EXECUTE format('
        SELECT
            e.agent_id,
            a.name as agent_name,
            a.description as agent_description,
            a.category as agent_category,
            a.user_id as developer_id,
            COUNT(*) FILTER (WHERE e.event_type = ''agent_execution'') as total_executions,
            COUNT(*) FILTER (WHERE e.event_type = ''agent_execution'' AND (e.properties->>''success'')::boolean = true) as successful_executions,
            CASE 
                WHEN COUNT(*) FILTER (WHERE e.event_type = ''agent_execution'') > 0 THEN
                    ROUND(COUNT(*) FILTER (WHERE e.event_type = ''agent_execution'' AND (e.properties->>''success'')::boolean = true) * 100.0 / 
                          COUNT(*) FILTER (WHERE e.event_type = ''agent_execution''), 2)
                ELSE 0
            END as success_rate,
            COALESCE(SUM((e.metrics->>''revenue_cents'')::bigint), 0) as total_revenue_cents,
            COUNT(DISTINCT e.user_id) as unique_users,
            ROUND(AVG((e.metrics->>''response_time_ms'')::numeric) FILTER (WHERE e.event_type = ''agent_execution''), 2) as avg_response_time_ms
        FROM agent_analytics_events e
        LEFT JOIN agents a ON e.agent_id = a.id
        WHERE DATE(e.created_at) BETWEEN $1 AND $2
            AND a.id IS NOT NULL
        GROUP BY e.agent_id, a.name, a.description, a.category, a.user_id
        HAVING COUNT(*) FILTER (WHERE e.event_type = ''agent_execution'') > 0
        ORDER BY %s
        LIMIT $3
    ', order_clause)
    USING p_date_from, p_date_to, p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get cached analytics
CREATE OR REPLACE FUNCTION get_cached_analytics(p_cache_key VARCHAR)
RETURNS JSONB AS $$
DECLARE
    cached_data JSONB;
BEGIN
    SELECT data INTO cached_data
    FROM analytics_cache
    WHERE cache_key = p_cache_key
        AND expires_at > NOW();
    
    RETURN cached_data;
END;
$$ LANGUAGE plpgsql;

-- Function to cache analytics query
CREATE OR REPLACE FUNCTION cache_analytics_query(
    p_cache_key VARCHAR,
    p_data JSONB,
    p_ttl_seconds INTEGER,
    p_tags TEXT[]
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO analytics_cache (cache_key, data, expires_at, tags, created_at)
    VALUES (p_cache_key, p_data, NOW() + INTERVAL '1 second' * p_ttl_seconds, p_tags, NOW())
    ON CONFLICT (cache_key)
    DO UPDATE SET
        data = EXCLUDED.data,
        expires_at = EXCLUDED.expires_at,
        tags = EXCLUDED.tags,
        updated_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate daily agent metrics
CREATE OR REPLACE FUNCTION aggregate_daily_agent_metrics(p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  agent_record RECORD;
  metrics_record RECORD;
  rows_processed INTEGER := 0;
BEGIN
  -- Process each agent with events on the given date
  FOR agent_record IN 
    SELECT DISTINCT agent_id, developer_id
    FROM agent_analytics_events 
    WHERE DATE(timestamp) = p_date
  LOOP
    -- Calculate metrics for this agent on this date
    SELECT 
      COUNT(*) FILTER (WHERE event_type = 'execution') as total_executions,
      COUNT(*) FILTER (WHERE event_type = 'execution' AND properties->>'status' = 'success') as successful_executions,
      COUNT(*) FILTER (WHERE event_type = 'execution' AND properties->>'status' = 'failed') as failed_executions,
      COALESCE(AVG((metrics->>'response_time_ms')::INTEGER) FILTER (WHERE metrics ? 'response_time_ms'), 0) as avg_response_time,
      COALESCE(AVG((metrics->>'memory_usage_mb')::DECIMAL) FILTER (WHERE metrics ? 'memory_usage_mb'), 0) as avg_memory_usage,
      COALESCE(AVG((metrics->>'cpu_usage_percent')::DECIMAL) FILTER (WHERE metrics ? 'cpu_usage_percent'), 0) as avg_cpu_usage,
      COUNT(*) FILTER (WHERE event_type = 'api_call') as total_api_calls,
      COUNT(DISTINCT user_id) as unique_users,
      COALESCE(SUM((properties->>'revenue_cents')::INTEGER) FILTER (WHERE properties ? 'revenue_cents'), 0) as total_revenue_cents
    INTO metrics_record
    FROM agent_analytics_events
    WHERE agent_id = agent_record.agent_id 
      AND DATE(timestamp) = p_date;
    
    -- Insert or update daily metrics
    INSERT INTO agent_performance_metrics (
      agent_id, metric_type, metric_date, total_executions, successful_executions, 
      failed_executions, avg_response_time_ms, avg_memory_usage_mb, avg_cpu_usage_percent,
      total_api_calls, unique_users, total_revenue_cents
    )
    VALUES (
      agent_record.agent_id, 'daily', p_date, metrics_record.total_executions,
      metrics_record.successful_executions, metrics_record.failed_executions,
      metrics_record.avg_response_time::INTEGER, metrics_record.avg_memory_usage,
      metrics_record.avg_cpu_usage, metrics_record.total_api_calls,
      metrics_record.unique_users, metrics_record.total_revenue_cents
    )
    ON CONFLICT (agent_id, metric_type, metric_date) DO UPDATE SET
      total_executions = EXCLUDED.total_executions,
      successful_executions = EXCLUDED.successful_executions,
      failed_executions = EXCLUDED.failed_executions,
      avg_response_time_ms = EXCLUDED.avg_response_time_ms,
      avg_memory_usage_mb = EXCLUDED.avg_memory_usage_mb,
      avg_cpu_usage_percent = EXCLUDED.avg_cpu_usage_percent,
      total_api_calls = EXCLUDED.total_api_calls,
      unique_users = EXCLUDED.unique_users,
      total_revenue_cents = EXCLUDED.total_revenue_cents,
      updated_at = NOW();
    
    rows_processed := rows_processed + 1;
  END LOOP;
  
  -- Mark events as processed
  UPDATE agent_analytics_events 
  SET processed = TRUE 
  WHERE DATE(timestamp) = p_date AND processed = FALSE;
  
  RETURN rows_processed;
END;
$$ LANGUAGE plpgsql;

-- Function to get agent analytics summary
CREATE OR REPLACE FUNCTION get_agent_analytics_summary(
  p_agent_id UUID,
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_executions BIGINT,
  successful_executions BIGINT,
  success_rate DECIMAL(5,2),
  avg_response_time_ms INTEGER,
  unique_users BIGINT,
  total_revenue_cents BIGINT,
  daily_trend JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_metrics AS (
    SELECT 
      metric_date,
      SUM(total_executions) as day_executions,
      SUM(successful_executions) as day_successful,
      AVG(avg_response_time_ms) as day_response_time,
      SUM(unique_users) as day_users,
      SUM(total_revenue_cents) as day_revenue
    FROM agent_performance_metrics
    WHERE agent_id = p_agent_id 
      AND metric_type = 'daily'
      AND metric_date BETWEEN p_date_from AND p_date_to
    GROUP BY metric_date
    ORDER BY metric_date
  ),
  totals AS (
    SELECT 
      SUM(day_executions) as total_exec,
      SUM(day_successful) as total_success,
      CASE 
        WHEN SUM(day_executions) > 0 
        THEN (SUM(day_successful)::DECIMAL / SUM(day_executions) * 100)::DECIMAL(5,2)
        ELSE 0 
      END as success_rt,
      AVG(day_response_time)::INTEGER as avg_response,
      SUM(day_users) as total_unique_users,
      SUM(day_revenue) as total_rev
    FROM daily_metrics
  ),
  trend_data AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', metric_date,
        'executions', day_executions,
        'success_rate', CASE 
          WHEN day_executions > 0 
          THEN (day_successful::DECIMAL / day_executions * 100)::DECIMAL(5,2)
          ELSE 0 
        END,
        'response_time', day_response_time,
        'users', day_users,
        'revenue', day_revenue
      ) ORDER BY metric_date
    ) as trend
    FROM daily_metrics
  )
  SELECT 
    t.total_exec,
    t.total_success,
    t.success_rt,
    t.avg_response,
    t.total_unique_users,
    t.total_rev,
    COALESCE(td.trend, '[]'::jsonb)
  FROM totals t
  CROSS JOIN trend_data td;
END;
$$ LANGUAGE plpgsql;

-- Function to get developer revenue analytics
CREATE OR REPLACE FUNCTION get_developer_revenue_analytics(
  p_developer_id UUID,
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_revenue_cents BIGINT,
  total_executions BIGINT,
  revenue_per_execution DECIMAL(8,4),
  top_agent_id UUID,
  top_agent_revenue BIGINT,
  revenue_trend JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_revenue AS (
    SELECT 
      das.summary_date,
      das.total_revenue_cents as day_revenue,
      das.total_executions as day_executions
    FROM developer_analytics_summary das
    WHERE das.developer_id = p_developer_id
      AND das.summary_type = 'daily'
      AND das.summary_date BETWEEN p_date_from AND p_date_to
    ORDER BY das.summary_date
  ),
  agent_revenue AS (
    SELECT 
      apm.agent_id,
      SUM(apm.total_revenue_cents) as agent_total_revenue
    FROM agent_performance_metrics apm
    JOIN agents a ON a.id = apm.agent_id
    WHERE a.user_id = p_developer_id
      AND apm.metric_type = 'daily'
      AND apm.metric_date BETWEEN p_date_from AND p_date_to
    GROUP BY apm.agent_id
    ORDER BY agent_total_revenue DESC
    LIMIT 1
  ),
  totals AS (
    SELECT 
      SUM(day_revenue) as total_rev,
      SUM(day_executions) as total_exec,
      CASE 
        WHEN SUM(day_executions) > 0 
        THEN (SUM(day_revenue)::DECIMAL / SUM(day_executions))::DECIMAL(8,4)
        ELSE 0 
      END as rev_per_exec
    FROM daily_revenue
  )
  SELECT 
    t.total_rev,
    t.total_exec,
    t.rev_per_exec,
    ar.agent_id,
    ar.agent_total_revenue,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', summary_date,
          'revenue', day_revenue,
          'executions', day_executions
        ) ORDER BY summary_date
      )
      FROM daily_revenue
    ), '[]'::jsonb)
  FROM totals t
  LEFT JOIN agent_revenue ar ON true;
END;
$$ LANGUAGE plpgsql;

-- Function to cache analytics query
CREATE OR REPLACE FUNCTION cache_analytics_query(
  p_cache_key VARCHAR(255),
  p_data JSONB,
  p_ttl_seconds INTEGER DEFAULT 3600,
  p_tags TEXT[] DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO analytics_cache (cache_key, cache_data, cache_tags, expires_at)
  VALUES (p_cache_key, p_data, p_tags, NOW() + INTERVAL '1 second' * p_ttl_seconds)
  ON CONFLICT (cache_key) DO UPDATE SET
    cache_data = EXCLUDED.cache_data,
    cache_tags = EXCLUDED.cache_tags,
    expires_at = EXCLUDED.expires_at,
    created_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get cached analytics data
CREATE OR REPLACE FUNCTION get_cached_analytics(p_cache_key VARCHAR(255))
RETURNS JSONB AS $$
DECLARE
  cached_data JSONB;
BEGIN
  SELECT cache_data INTO cached_data
  FROM analytics_cache
  WHERE cache_key = p_cache_key 
    AND expires_at > NOW();
  
  RETURN cached_data;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_analytics_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM analytics_cache 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
