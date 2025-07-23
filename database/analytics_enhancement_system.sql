-- Analytics Enhancement Database Schema
-- Advanced reporting, business intelligence, and comprehensive analytics

-- Events tracking table for detailed analytics
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    session_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- 'page_view', 'click', 'purchase', 'search', etc.
    event_category VARCHAR(50) NOT NULL, -- 'user_behavior', 'commerce', 'engagement', etc.
    event_action VARCHAR(100) NOT NULL,
    event_label VARCHAR(255),
    event_value DECIMAL(10,2),
    page_url TEXT,
    page_title VARCHAR(255),
    referrer_url TEXT,
    user_agent TEXT,
    ip_address INET,
    device_type VARCHAR(20), -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(50),
    os VARCHAR(50),
    screen_resolution VARCHAR(20),
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions for comprehensive user journey tracking
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    page_views INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    bounce BOOLEAN DEFAULT false,
    conversion BOOLEAN DEFAULT false,
    conversion_value DECIMAL(10,2),
    traffic_source VARCHAR(100),
    campaign VARCHAR(100),
    medium VARCHAR(50),
    device_type VARCHAR(20),
    country VARCHAR(2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent performance metrics
CREATE TABLE agent_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    unique_views INTEGER DEFAULT 0,
    purchases INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    search_appearances INTEGER DEFAULT 0,
    search_clicks INTEGER DEFAULT 0,
    time_spent_average INTEGER DEFAULT 0, -- in seconds
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    refund_count INTEGER DEFAULT 0,
    refund_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(agent_id, date)
);

-- User behavior funnel tracking
CREATE TABLE conversion_funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    steps JSONB NOT NULL, -- Array of step definitions
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Funnel step completions
CREATE TABLE funnel_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID NOT NULL REFERENCES conversion_funnels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    session_id UUID NOT NULL,
    step_index INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    properties JSONB DEFAULT '{}'
);

-- A/B test configurations
CREATE TABLE ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    traffic_percentage DECIMAL(5,2) DEFAULT 50.0,
    variants JSONB NOT NULL, -- Array of variant configurations
    goals JSONB NOT NULL, -- Array of goal metrics
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B test participant assignments
CREATE TABLE ab_test_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    session_id UUID,
    variant_id VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(test_id, user_id)
);

-- A/B test conversions
CREATE TABLE ab_test_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES ab_test_assignments(id) ON DELETE CASCADE,
    goal_name VARCHAR(100) NOT NULL,
    goal_value DECIMAL(10,2),
    converted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    properties JSONB DEFAULT '{}'
);

-- Custom dashboard configurations
CREATE TABLE analytics_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    layout JSONB NOT NULL, -- Dashboard layout and widget configurations
    filters JSONB DEFAULT '{}',
    is_shared BOOLEAN DEFAULT false,
    share_token VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report templates and scheduled reports
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL, -- 'agent_performance', 'user_behavior', 'revenue', etc.
    configuration JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled report jobs
CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    schedule_pattern VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
    delivery_method VARCHAR(20) NOT NULL, -- 'email', 'dashboard', 'webhook'
    delivery_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business intelligence metrics (pre-calculated KPIs)
CREATE TABLE bi_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_category VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    hour INTEGER, -- For hourly metrics (0-23)
    value DECIMAL(15,4) NOT NULL,
    previous_value DECIMAL(15,4),
    change_percent DECIMAL(8,4),
    dimensions JSONB DEFAULT '{}', -- For segmentation
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(metric_name, date, hour, dimensions)
);

-- Create indexes for performance
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_country ON analytics_events(country);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_created_at ON user_sessions(created_at);
CREATE INDEX idx_user_sessions_traffic_source ON user_sessions(traffic_source);

CREATE INDEX idx_agent_analytics_agent_id ON agent_analytics(agent_id);
CREATE INDEX idx_agent_analytics_date ON agent_analytics(date);

CREATE INDEX idx_funnel_completions_funnel_id ON funnel_completions(funnel_id);
CREATE INDEX idx_funnel_completions_user_id ON funnel_completions(user_id);
CREATE INDEX idx_funnel_completions_completed_at ON funnel_completions(completed_at);

CREATE INDEX idx_ab_test_assignments_test_id ON ab_test_assignments(test_id);
CREATE INDEX idx_ab_test_assignments_user_id ON ab_test_assignments(user_id);

CREATE INDEX idx_bi_metrics_metric_name_date ON bi_metrics(metric_name, date);
CREATE INDEX idx_bi_metrics_category_date ON bi_metrics(metric_category, date);

-- Materialized views for performance
CREATE MATERIALIZED VIEW daily_platform_metrics AS
SELECT 
    date,
    COUNT(DISTINCT user_id) as daily_active_users,
    COUNT(DISTINCT session_id) as total_sessions,
    COUNT(*) as total_events,
    COUNT(DISTINCT CASE WHEN event_type = 'agent_purchase' THEN user_id END) as buyers,
    SUM(CASE WHEN event_type = 'agent_purchase' THEN event_value ELSE 0 END) as daily_revenue,
    AVG(CASE WHEN event_type = 'session_end' THEN event_value ELSE NULL END) as avg_session_duration,
    COUNT(DISTINCT CASE WHEN event_type = 'user_signup' THEN user_id END) as new_signups
FROM analytics_events 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;

CREATE MATERIALIZED VIEW agent_performance_summary AS
SELECT 
    a.id,
    a.name,
    a.category,
    aa.views,
    aa.unique_views,
    aa.purchases,
    aa.revenue,
    aa.conversion_rate,
    aa.rating_average,
    aa.rating_count,
    RANK() OVER (ORDER BY aa.revenue DESC) as revenue_rank,
    RANK() OVER (ORDER BY aa.purchases DESC) as sales_rank,
    RANK() OVER (ORDER BY aa.rating_average DESC) as rating_rank
FROM agents a
LEFT JOIN agent_analytics aa ON a.id = aa.agent_id AND aa.date = CURRENT_DATE - INTERVAL '1 day'
ORDER BY aa.revenue DESC NULLS LAST;

-- Functions for analytics calculations

-- Function to calculate user lifecycle stage
CREATE OR REPLACE FUNCTION get_user_lifecycle_stage(user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    signup_date DATE;
    last_purchase_date DATE;
    purchase_count INTEGER;
    days_since_signup INTEGER;
    days_since_last_purchase INTEGER;
BEGIN
    -- Get user data
    SELECT 
        created_at::DATE,
        (SELECT MAX(created_at)::DATE FROM transactions WHERE buyer_id = user_id),
        (SELECT COUNT(*) FROM transactions WHERE buyer_id = user_id)
    INTO signup_date, last_purchase_date, purchase_count
    FROM auth.users 
    WHERE id = user_id;
    
    days_since_signup := CURRENT_DATE - signup_date;
    days_since_last_purchase := CASE 
        WHEN last_purchase_date IS NOT NULL 
        THEN CURRENT_DATE - last_purchase_date 
        ELSE NULL 
    END;
    
    -- Determine lifecycle stage
    IF purchase_count = 0 THEN
        IF days_since_signup <= 7 THEN
            RETURN 'new_user';
        ELSIF days_since_signup <= 30 THEN
            RETURN 'exploring';
        ELSE
            RETURN 'inactive_prospect';
        END IF;
    ELSIF purchase_count = 1 THEN
        IF days_since_last_purchase <= 30 THEN
            RETURN 'first_time_buyer';
        ELSE
            RETURN 'at_risk';
        END IF;
    ELSIF purchase_count >= 2 THEN
        IF days_since_last_purchase <= 30 THEN
            RETURN 'repeat_customer';
        ELSIF days_since_last_purchase <= 90 THEN
            RETURN 'at_risk';
        ELSE
            RETURN 'churned';
        END IF;
    END IF;
    
    RETURN 'unknown';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate agent recommendation score
CREATE OR REPLACE FUNCTION calculate_agent_recommendation_score(agent_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    score DECIMAL := 0;
    views_score DECIMAL := 0;
    conversion_score DECIMAL := 0;
    rating_score DECIMAL := 0;
    recency_score DECIMAL := 0;
BEGIN
    -- Views score (normalized)
    SELECT COALESCE(
        (views / NULLIF(MAX(views) OVER (), 0)) * 30, 0
    ) INTO views_score
    FROM agent_analytics 
    WHERE agent_id = calculate_agent_recommendation_score.agent_id 
    AND date >= CURRENT_DATE - INTERVAL '7 days';
    
    -- Conversion score
    SELECT COALESCE(conversion_rate * 0.4, 0) INTO conversion_score
    FROM agent_analytics 
    WHERE agent_id = calculate_agent_recommendation_score.agent_id 
    AND date >= CURRENT_DATE - INTERVAL '7 days';
    
    -- Rating score
    SELECT COALESCE(rating_average * 10, 0) INTO rating_score
    FROM agent_analytics 
    WHERE agent_id = calculate_agent_recommendation_score.agent_id 
    AND date >= CURRENT_DATE - INTERVAL '7 days';
    
    -- Recency score (newer agents get slight boost)
    SELECT CASE 
        WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 20
        WHEN created_at >= CURRENT_DATE - INTERVAL '90 days' THEN 10
        ELSE 0
    END INTO recency_score
    FROM agents 
    WHERE id = calculate_agent_recommendation_score.agent_id;
    
    score := views_score + conversion_score + rating_score + recency_score;
    
    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Triggers for real-time analytics

-- Update session end time and duration
CREATE OR REPLACE FUNCTION update_session_end()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'session_end' THEN
        UPDATE user_sessions 
        SET 
            session_end = NEW.created_at,
            duration_minutes = EXTRACT(EPOCH FROM (NEW.created_at - session_start)) / 60,
            updated_at = NEW.created_at
        WHERE id = NEW.session_id;
    END IF;
    
    -- Update session event count
    UPDATE user_sessions 
    SET 
        events_count = events_count + 1,
        updated_at = NEW.created_at
    WHERE id = NEW.session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER analytics_events_session_update
    AFTER INSERT ON analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION update_session_end();

-- Update daily agent analytics
CREATE OR REPLACE FUNCTION update_agent_daily_analytics()
RETURNS TRIGGER AS $$
DECLARE
    target_date DATE;
    agent_uuid UUID;
BEGIN
    target_date := NEW.created_at::DATE;
    
    -- Extract agent_id from event properties
    agent_uuid := (NEW.properties->>'agent_id')::UUID;
    
    IF agent_uuid IS NOT NULL THEN
        INSERT INTO agent_analytics (agent_id, date, views, purchases, revenue)
        VALUES (agent_uuid, target_date, 
                CASE WHEN NEW.event_type = 'agent_view' THEN 1 ELSE 0 END,
                CASE WHEN NEW.event_type = 'agent_purchase' THEN 1 ELSE 0 END,
                CASE WHEN NEW.event_type = 'agent_purchase' THEN NEW.event_value ELSE 0 END)
        ON CONFLICT (agent_id, date) 
        DO UPDATE SET
            views = agent_analytics.views + (CASE WHEN NEW.event_type = 'agent_view' THEN 1 ELSE 0 END),
            purchases = agent_analytics.purchases + (CASE WHEN NEW.event_type = 'agent_purchase' THEN 1 ELSE 0 END),
            revenue = agent_analytics.revenue + (CASE WHEN NEW.event_type = 'agent_purchase' THEN NEW.event_value ELSE 0 END);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER analytics_events_agent_update
    AFTER INSERT ON analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_daily_analytics();

-- Refresh materialized views daily
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW daily_platform_metrics;
    REFRESH MATERIALIZED VIEW agent_performance_summary;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security Policies

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own analytics data
CREATE POLICY "Users can view own analytics" ON analytics_events
    FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

-- Agent owners can view their agent analytics
CREATE POLICY "Agent owners can view analytics" ON agent_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_analytics.agent_id 
            AND agents.creator_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Users can manage their own dashboards
CREATE POLICY "Users can manage own dashboards" ON analytics_dashboards
    FOR ALL USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can manage all analytics" ON analytics_events
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage all sessions" ON user_sessions
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Comments for documentation
COMMENT ON TABLE analytics_events IS 'Detailed event tracking for comprehensive user behavior analysis';
COMMENT ON TABLE user_sessions IS 'User session tracking for journey analysis and engagement metrics';
COMMENT ON TABLE agent_analytics IS 'Daily aggregated analytics for individual agent performance';
COMMENT ON TABLE conversion_funnels IS 'Definition of conversion funnels for behavior analysis';
COMMENT ON TABLE ab_tests IS 'A/B test configurations for platform optimization';
COMMENT ON TABLE analytics_dashboards IS 'Custom dashboard configurations for users';
COMMENT ON TABLE bi_metrics IS 'Pre-calculated business intelligence metrics for fast reporting';

-- Initial data for common funnels
INSERT INTO conversion_funnels (name, steps) VALUES 
('User Onboarding', '[
    {"name": "landing", "description": "Landing page visit"},
    {"name": "signup", "description": "User registration"},
    {"name": "profile", "description": "Profile completion"},
    {"name": "first_browse", "description": "First agent browse"},
    {"name": "first_purchase", "description": "First agent purchase"}
]'),
('Agent Publishing', '[
    {"name": "create_start", "description": "Started agent creation"},
    {"name": "basic_info", "description": "Completed basic information"},
    {"name": "configuration", "description": "Completed configuration"},
    {"name": "testing", "description": "Completed testing"},
    {"name": "publish", "description": "Published agent"}
]');
