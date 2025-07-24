-- Backoffice Tools & Admin Dashboard Schema
-- Comprehensive platform management and administrative tools

-- Admin Dashboard Analytics
CREATE TABLE admin_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type TEXT NOT NULL, -- revenue, users, agents, executions, errors
    metric_value DECIMAL(15,2) NOT NULL,
    metric_metadata JSONB DEFAULT '{}',
    time_period TEXT NOT NULL, -- hourly, daily, weekly, monthly
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_metric_type CHECK (metric_type IN ('revenue', 'users', 'agents', 'executions', 'errors', 'storage', 'bandwidth'))
);

-- Platform Configuration Management
CREATE TABLE platform_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    config_type TEXT NOT NULL DEFAULT 'general', -- general, feature_flags, limits, pricing
    description TEXT,
    last_updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_config_type CHECK (config_type IN ('general', 'feature_flags', 'limits', 'pricing', 'security', 'integration'))
);

-- System Health Monitoring
CREATE TABLE system_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    status TEXT NOT NULL DEFAULT 'healthy', -- healthy, warning, critical
    threshold_config JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_status CHECK (status IN ('healthy', 'warning', 'critical', 'unknown'))
);

-- User Management & Support
CREATE TABLE user_support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    ticket_type TEXT NOT NULL DEFAULT 'general', -- general, billing, technical, abuse
    priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    agent_id UUID REFERENCES agents(id),
    assigned_to UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_ticket_type CHECK (ticket_type IN ('general', 'billing', 'technical', 'abuse', 'feature_request')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'escalated'))
);

-- Admin User Management
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
    admin_level TEXT NOT NULL DEFAULT 'support', -- support, admin, super_admin
    permissions JSONB DEFAULT '[]',
    department TEXT,
    active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_admin_level CHECK (admin_level IN ('support', 'admin', 'super_admin', 'developer'))
);

-- Financial Management
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    agent_id UUID REFERENCES agents(id),
    transaction_type TEXT NOT NULL, -- subscription, usage, refund, payout, fee
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    stripe_transaction_id TEXT,
    stripe_invoice_id TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('subscription', 'usage', 'refund', 'payout', 'fee', 'credit')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'disputed'))
);

-- Content Moderation
CREATE TABLE content_moderation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL, -- agent, user_profile, support_ticket
    content_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    moderation_reason TEXT NOT NULL,
    content_data JSONB NOT NULL,
    flagged_by TEXT, -- user_report, automated, admin
    severity TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, escalated
    reviewed_by UUID REFERENCES auth.users(id),
    review_notes TEXT,
    action_taken TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_content_type CHECK (content_type IN ('agent', 'user_profile', 'support_ticket', 'comment', 'review')),
    CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'escalated'))
);

-- System Announcements
CREATE TABLE system_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    announcement_type TEXT NOT NULL DEFAULT 'info', -- info, warning, maintenance, feature
    target_audience TEXT NOT NULL DEFAULT 'all', -- all, developers, customers, admins
    display_location TEXT[] DEFAULT '{"dashboard"}', -- dashboard, popup, email, banner
    active BOOLEAN DEFAULT true,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ends_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_announcement_type CHECK (announcement_type IN ('info', 'warning', 'maintenance', 'feature', 'security'))
);

-- API Usage Analytics
CREATE TABLE api_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    agent_id UUID REFERENCES agents(id),
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    ip_address INET,
    user_agent TEXT,
    api_key_id UUID,
    rate_limited BOOLEAN DEFAULT false,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    INDEX idx_api_usage_user_id (user_id),
    INDEX idx_api_usage_agent_id (agent_id),
    INDEX idx_api_usage_recorded_at (recorded_at),
    INDEX idx_api_usage_endpoint (endpoint),
    INDEX idx_api_usage_status_code (status_code)
);

-- Feature Flag Management
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_name TEXT NOT NULL UNIQUE,
    description TEXT,
    enabled BOOLEAN DEFAULT false,
    rollout_percentage INTEGER DEFAULT 0,
    target_users UUID[],
    target_user_types TEXT[],
    conditions JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_rollout_percentage CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100)
);

-- Backup & Recovery Management
CREATE TABLE backup_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type TEXT NOT NULL, -- full, incremental, agents, users
    status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    backup_location TEXT,
    backup_size_bytes BIGINT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retention_days INTEGER DEFAULT 30,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_backup_type CHECK (backup_type IN ('full', 'incremental', 'agents', 'users', 'analytics')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))
);

-- Rate Limiting Configuration
CREATE TABLE rate_limit_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_pattern TEXT NOT NULL,
    user_type TEXT NOT NULL DEFAULT 'free', -- free, pro, enterprise
    requests_per_minute INTEGER NOT NULL,
    requests_per_hour INTEGER NOT NULL,
    requests_per_day INTEGER NOT NULL,
    burst_allowance INTEGER DEFAULT 10,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT unique_endpoint_user_type UNIQUE(endpoint_pattern, user_type)
);

-- System Notifications
CREATE TABLE system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES auth.users(id),
    notification_type TEXT NOT NULL, -- system, billing, security, feature
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
    read BOOLEAN DEFAULT false,
    email_sent BOOLEAN DEFAULT false,
    push_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    read_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_notification_type CHECK (notification_type IN ('system', 'billing', 'security', 'feature', 'support')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Create indexes for performance
CREATE INDEX idx_admin_analytics_metric_type ON admin_analytics(metric_type);
CREATE INDEX idx_admin_analytics_recorded_at ON admin_analytics(recorded_at DESC);
CREATE INDEX idx_platform_config_type ON platform_config(config_type);
CREATE INDEX idx_system_health_service ON system_health_metrics(service_name);
CREATE INDEX idx_system_health_recorded_at ON system_health_metrics(recorded_at DESC);
CREATE INDEX idx_support_tickets_user_id ON user_support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON user_support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON user_support_tickets(assigned_to);
CREATE INDEX idx_financial_transactions_user_id ON financial_transactions(user_id);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX idx_financial_transactions_created_at ON financial_transactions(created_at DESC);
CREATE INDEX idx_content_moderation_status ON content_moderation_queue(status);
CREATE INDEX idx_content_moderation_flagged_by ON content_moderation_queue(flagged_by);
CREATE INDEX idx_announcements_active ON system_announcements(active);
CREATE INDEX idx_announcements_target ON system_announcements(target_audience);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);
CREATE INDEX idx_backup_jobs_status ON backup_jobs(status);
CREATE INDEX idx_backup_jobs_created_at ON backup_jobs(created_at DESC);
CREATE INDEX idx_notifications_recipient ON system_notifications(recipient_id);
CREATE INDEX idx_notifications_read ON system_notifications(read);
CREATE INDEX idx_notifications_created_at ON system_notifications(created_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE admin_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin access
CREATE POLICY "Admins can view all analytics" ON admin_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND active = true
        )
    );

CREATE POLICY "Super admins can manage platform config" ON platform_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND admin_level = 'super_admin' AND active = true
        )
    );

CREATE POLICY "Admins can view system health" ON system_health_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND active = true
        )
    );

CREATE POLICY "Users can view their own support tickets" ON user_support_tickets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create support tickets" ON user_support_tickets
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Support staff can manage tickets" ON user_support_tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND active = true
        )
    );

CREATE POLICY "Super admins can manage admin users" ON admin_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND admin_level = 'super_admin' AND active = true
        )
    );

CREATE POLICY "Users can view their financial transactions" ON financial_transactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all financial transactions" ON financial_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND active = true
        )
    );

CREATE POLICY "Admins can manage content moderation" ON content_moderation_queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND active = true
        )
    );

CREATE POLICY "Users can view active announcements" ON system_announcements
    FOR SELECT USING (active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));

CREATE POLICY "Admins can manage announcements" ON system_announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND active = true
        )
    );

CREATE POLICY "Admins can view API usage analytics" ON api_usage_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND active = true
        )
    );

CREATE POLICY "Users can view their own API usage" ON api_usage_analytics
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage feature flags" ON feature_flags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND admin_level IN ('admin', 'super_admin') AND active = true
        )
    );

CREATE POLICY "Admins can manage backups" ON backup_jobs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND admin_level IN ('admin', 'super_admin') AND active = true
        )
    );

CREATE POLICY "Admins can manage rate limits" ON rate_limit_configs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND admin_level IN ('admin', 'super_admin') AND active = true
        )
    );

CREATE POLICY "Users can view their notifications" ON system_notifications
    FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON system_notifications
    FOR UPDATE USING (recipient_id = auth.uid());

CREATE POLICY "Admins can create notifications" ON system_notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() AND active = true
        )
    );

-- Functions for analytics calculations
CREATE OR REPLACE FUNCTION calculate_daily_revenue()
RETURNS void AS $$
BEGIN
    INSERT INTO admin_analytics (metric_type, metric_value, time_period, recorded_at)
    SELECT 
        'revenue',
        COALESCE(SUM(amount), 0),
        'daily',
        DATE_TRUNC('day', now())
    FROM financial_transactions 
    WHERE DATE_TRUNC('day', created_at) = DATE_TRUNC('day', now())
    AND status = 'completed'
    AND transaction_type IN ('subscription', 'usage')
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_user_metrics()
RETURNS void AS $$
BEGIN
    -- Daily active users
    INSERT INTO admin_analytics (metric_type, metric_value, time_period, recorded_at)
    SELECT 
        'users',
        COUNT(DISTINCT user_id),
        'daily',
        DATE_TRUNC('day', now())
    FROM api_usage_analytics 
    WHERE DATE_TRUNC('day', recorded_at) = DATE_TRUNC('day', now())
    ON CONFLICT DO NOTHING;
    
    -- New signups
    INSERT INTO admin_analytics (metric_type, metric_value, time_period, recorded_at)
    SELECT 
        'signups',
        COUNT(*),
        'daily',
        DATE_TRUNC('day', now())
    FROM auth.users 
    WHERE DATE_TRUNC('day', created_at) = DATE_TRUNC('day', now())
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update support ticket timestamps
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        NEW.resolved_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_ticket_timestamp
    BEFORE UPDATE ON user_support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_support_ticket_updated_at();

-- Function to check feature flag access
CREATE OR REPLACE FUNCTION check_feature_flag(flag_name TEXT, user_id UUID DEFAULT auth.uid())
RETURNS boolean AS $$
DECLARE
    flag_record RECORD;
    user_profile RECORD;
    random_val INTEGER;
BEGIN
    -- Get feature flag
    SELECT * INTO flag_record FROM feature_flags WHERE feature_flags.flag_name = check_feature_flag.flag_name;
    
    IF NOT FOUND OR NOT flag_record.enabled THEN
        RETURN false;
    END IF;
    
    -- Check if user is specifically targeted
    IF user_id = ANY(flag_record.target_users) THEN
        RETURN true;
    END IF;
    
    -- Get user profile for type checking
    SELECT account_type INTO user_profile FROM profiles WHERE id = user_id;
    
    -- Check if user type is targeted
    IF user_profile.account_type = ANY(flag_record.target_user_types) THEN
        RETURN true;
    END IF;
    
    -- Check rollout percentage
    IF flag_record.rollout_percentage > 0 THEN
        random_val := (EXTRACT(EPOCH FROM now()) + user_id::text::bigint) % 100;
        RETURN random_val < flag_record.rollout_percentage;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Materialized view for admin dashboard
CREATE MATERIALIZED VIEW admin_dashboard_summary AS
SELECT 
    -- Revenue metrics
    (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions 
     WHERE status = 'completed' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', now())) as monthly_revenue,
    
    -- User metrics
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM auth.users WHERE DATE_TRUNC('day', created_at) = DATE_TRUNC('day', now())) as new_users_today,
    
    -- Agent metrics
    (SELECT COUNT(*) FROM agents) as total_agents,
    (SELECT COUNT(*) FROM agents WHERE status = 'active') as active_agents,
    
    -- Support metrics
    (SELECT COUNT(*) FROM user_support_tickets WHERE status = 'open') as open_tickets,
    (SELECT COUNT(*) FROM user_support_tickets WHERE status = 'in_progress') as in_progress_tickets,
    
    -- System health
    (SELECT COUNT(*) FROM system_health_metrics 
     WHERE status = 'critical' AND recorded_at > now() - interval '1 hour') as critical_alerts,
    
    -- Current timestamp
    now() as last_updated;

-- Index for the materialized view
CREATE UNIQUE INDEX idx_admin_dashboard_summary_last_updated ON admin_dashboard_summary(last_updated);

-- Function to refresh dashboard
CREATE OR REPLACE FUNCTION refresh_admin_dashboard()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY admin_dashboard_summary;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
