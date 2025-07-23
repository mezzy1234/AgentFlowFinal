-- Final Production Enhancements Database Schema
-- Agent execution feedback, reviews, integration testing, and dependencies

-- Agent execution logs with feedback loop
CREATE TABLE agent_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    execution_id VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed', 'timeout')),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    error_message TEXT,
    error_code VARCHAR(50),
    user_feedback VARCHAR(20) CHECK (user_feedback IN ('worked', 'failed', 'no_feedback')),
    user_feedback_comment TEXT,
    user_feedback_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    webhook_url TEXT,
    webhook_response_code INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced reviews system with developer responses
CREATE TABLE agent_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    execution_log_id UUID REFERENCES agent_execution_logs(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    helpful_count INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,
    developer_response TEXT,
    developer_response_at TIMESTAMP WITH TIME ZONE,
    developer_id UUID REFERENCES auth.users(id),
    is_verified_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(agent_id, user_id) -- One review per user per agent
);

-- Review helpfulness tracking
CREATE TABLE review_helpfulness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES agent_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(review_id, user_id)
);

-- Complete integrations system (n8n-style)
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('trigger', 'action', 'both')),
    auth_method VARCHAR(20) NOT NULL CHECK (auth_method IN ('oauth2', 'api_key', 'webhook', 'basic_auth', 'none', 'custom')),
    logo_url TEXT,
    description TEXT,
    documentation_url TEXT,
    is_popular BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    sync_source VARCHAR(50) DEFAULT 'manual', -- 'n8n', 'zapier', 'manual'
    last_synced TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration test logs
CREATE TABLE integration_test_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('connection', 'auth', 'api_call')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
    request_data JSONB DEFAULT '{}',
    response_data JSONB DEFAULT '{}',
    error_message TEXT,
    test_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent required integrations
CREATE TABLE agent_required_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL, -- e.g., 'OPENAI_API_KEY', 'GMAIL_ACCESS_TOKEN'
    is_required BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(agent_id, integration_id, field_name)
);

-- User credentials (encrypted storage)
CREATE TABLE user_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    encrypted_value TEXT NOT NULL, -- Encrypted credential value
    credential_type VARCHAR(20) NOT NULL CHECK (credential_type IN ('api_key', 'oauth_token', 'refresh_token', 'webhook_url', 'username', 'password')),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    last_tested TIMESTAMP WITH TIME ZONE,
    test_status VARCHAR(20) CHECK (test_status IN ('pending', 'success', 'failed', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, integration_id, field_name)
);

-- Agent dependencies and triggers
CREATE TABLE agent_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    trigger_type VARCHAR(20) NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'webhook', 'event')),
    trigger_config JSONB NOT NULL DEFAULT '{}', -- Schedule, webhook URL, event type
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled agent runs queue
CREATE TABLE agent_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trigger_id UUID REFERENCES agent_triggers(id),
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    input_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral system
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code VARCHAR(20) NOT NULL UNIQUE,
    commission_rate DECIMAL(5,4) DEFAULT 0.1000, -- 10%
    total_earned DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(referrer_id, referred_id)
);

-- Referral earnings tracking
CREATE TABLE referral_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id),
    amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,4) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Newsletter subscriptions
CREATE TABLE newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    subscription_types JSONB NOT NULL DEFAULT '{"new_agents": true, "trending": true, "updates": true}',
    is_active BOOLEAN DEFAULT true,
    unsubscribe_token VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(email)
);

-- A/B testing system
CREATE TABLE ab_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    traffic_percentage DECIMAL(5,2) DEFAULT 50.0 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
    variants JSONB NOT NULL, -- Array of variant configurations
    goals JSONB NOT NULL, -- Conversion goals to track
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B test assignments
CREATE TABLE ab_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    session_id VARCHAR(100),
    variant_id VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(experiment_id, user_id)
);

-- A/B test conversions
CREATE TABLE ab_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES ab_assignments(id) ON DELETE CASCADE,
    goal_name VARCHAR(100) NOT NULL,
    goal_value DECIMAL(10,2),
    converted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_agent_execution_logs_agent_id ON agent_execution_logs(agent_id);
CREATE INDEX idx_agent_execution_logs_user_id ON agent_execution_logs(user_id);
CREATE INDEX idx_agent_execution_logs_status ON agent_execution_logs(status);
CREATE INDEX idx_agent_execution_logs_created_at ON agent_execution_logs(created_at);

CREATE INDEX idx_agent_reviews_agent_id ON agent_reviews(agent_id);
CREATE INDEX idx_agent_reviews_user_id ON agent_reviews(user_id);
CREATE INDEX idx_agent_reviews_rating ON agent_reviews(rating);

CREATE INDEX idx_integrations_category ON integrations(category);
CREATE INDEX idx_integrations_auth_method ON integrations(auth_method);
CREATE INDEX idx_integrations_is_popular ON integrations(is_popular);

CREATE INDEX idx_user_credentials_user_id ON user_credentials(user_id);
CREATE INDEX idx_user_credentials_integration_id ON user_credentials(integration_id);
CREATE INDEX idx_user_credentials_expires_at ON user_credentials(expires_at);

CREATE INDEX idx_agent_queue_scheduled_for ON agent_queue(scheduled_for);
CREATE INDEX idx_agent_queue_status ON agent_queue(status);
CREATE INDEX idx_agent_queue_priority ON agent_queue(priority);

CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referral_code ON referrals(referral_code);

-- Triggers for automatic failure detection
CREATE OR REPLACE FUNCTION check_agent_failures()
RETURNS TRIGGER AS $$
DECLARE
    failure_count INTEGER;
    agent_uuid UUID;
BEGIN
    -- Get the agent_id from the new record
    agent_uuid := NEW.agent_id;
    
    -- Count recent failures (last 3 executions)
    SELECT COUNT(*)
    INTO failure_count
    FROM (
        SELECT status
        FROM agent_execution_logs
        WHERE agent_id = agent_uuid
        ORDER BY created_at DESC
        LIMIT 3
    ) recent_logs
    WHERE status = 'failed';
    
    -- If 3 consecutive failures, disable the agent
    IF failure_count >= 3 AND NEW.status = 'failed' THEN
        UPDATE agents
        SET is_active = false, 
            updated_at = NOW()
        WHERE id = agent_uuid;
        
        -- Optionally notify the developer (could trigger notification system)
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT 
            creator_id,
            'agent_disabled',
            'Agent Disabled Due to Failures',
            'Your agent "' || name || '" has been disabled after 3 consecutive failures.',
            jsonb_build_object('agent_id', agent_uuid)
        FROM agents 
        WHERE id = agent_uuid;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_failure_check
    AFTER INSERT OR UPDATE ON agent_execution_logs
    FOR EACH ROW
    EXECUTE FUNCTION check_agent_failures();

-- Function to update review helpfulness counts
CREATE OR REPLACE FUNCTION update_review_helpfulness()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.helpful THEN
            UPDATE agent_reviews 
            SET helpful_count = helpful_count + 1
            WHERE id = NEW.review_id;
        ELSE
            UPDATE agent_reviews 
            SET unhelpful_count = unhelpful_count + 1
            WHERE id = NEW.review_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle change in helpfulness vote
        IF OLD.helpful != NEW.helpful THEN
            IF NEW.helpful THEN
                UPDATE agent_reviews 
                SET helpful_count = helpful_count + 1,
                    unhelpful_count = unhelpful_count - 1
                WHERE id = NEW.review_id;
            ELSE
                UPDATE agent_reviews 
                SET helpful_count = helpful_count - 1,
                    unhelpful_count = unhelpful_count + 1
                WHERE id = NEW.review_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.helpful THEN
            UPDATE agent_reviews 
            SET helpful_count = helpful_count - 1
            WHERE id = OLD.review_id;
        ELSE
            UPDATE agent_reviews 
            SET unhelpful_count = unhelpful_count - 1
            WHERE id = OLD.review_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_helpfulness_update
    AFTER INSERT OR UPDATE OR DELETE ON review_helpfulness
    FOR EACH ROW
    EXECUTE FUNCTION update_review_helpfulness();

-- Row Level Security Policies
ALTER TABLE agent_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpfulness ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_test_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own execution logs
CREATE POLICY "Users can view own execution logs" ON agent_execution_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Agent creators can view logs for their agents
CREATE POLICY "Creators can view agent logs" ON agent_execution_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_execution_logs.agent_id 
            AND agents.creator_id = auth.uid()
        )
    );

-- Users can manage their own reviews
CREATE POLICY "Users can manage own reviews" ON agent_reviews
    FOR ALL USING (auth.uid() = user_id);

-- Everyone can read reviews
CREATE POLICY "Anyone can read reviews" ON agent_reviews
    FOR SELECT USING (true);

-- Users can manage their own credentials
CREATE POLICY "Users can manage own credentials" ON user_credentials
    FOR ALL USING (auth.uid() = user_id);

-- Users can manage their own referrals
CREATE POLICY "Users can manage own referrals" ON referrals
    FOR ALL USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Seed popular integrations
INSERT INTO integrations (name, slug, category, type, auth_method, logo_url, description, is_popular) VALUES
-- AI & NLP
('OpenAI', 'openai', 'AI', 'action', 'api_key', '/integrations/openai.svg', 'Connect to GPT-4, DALL-E, and Whisper APIs', true),
('Anthropic Claude', 'anthropic', 'AI', 'action', 'api_key', '/integrations/anthropic.svg', 'Access Claude AI models for text generation', true),
('Google Gemini', 'google-gemini', 'AI', 'action', 'oauth2', '/integrations/google.svg', 'Use Google Gemini AI models', true),
('ElevenLabs', 'elevenlabs', 'AI', 'action', 'api_key', '/integrations/elevenlabs.svg', 'Text-to-speech and voice cloning', true),

-- Email & Messaging
('Gmail', 'gmail', 'Email', 'both', 'oauth2', '/integrations/gmail.svg', 'Send and receive emails via Gmail', true),
('Outlook', 'outlook', 'Email', 'both', 'oauth2', '/integrations/outlook.svg', 'Microsoft Outlook email integration', true),
('Twilio', 'twilio', 'Messaging', 'both', 'api_key', '/integrations/twilio.svg', 'SMS, voice, and messaging services', true),
('Slack', 'slack', 'Messaging', 'both', 'oauth2', '/integrations/slack.svg', 'Team communication and notifications', true),
('Discord', 'discord', 'Messaging', 'both', 'webhook', '/integrations/discord.svg', 'Gaming and community chat platform', false),

-- CRM & Sales
('HubSpot', 'hubspot', 'CRM', 'both', 'oauth2', '/integrations/hubspot.svg', 'Complete CRM and marketing platform', true),
('Salesforce', 'salesforce', 'CRM', 'both', 'oauth2', '/integrations/salesforce.svg', 'Enterprise CRM solution', true),
('Pipedrive', 'pipedrive', 'CRM', 'both', 'api_key', '/integrations/pipedrive.svg', 'Sales-focused CRM platform', false),

-- E-commerce
('Shopify', 'shopify', 'E-commerce', 'both', 'oauth2', '/integrations/shopify.svg', 'E-commerce platform and store management', true),
('Stripe', 'stripe', 'Payments', 'both', 'api_key', '/integrations/stripe.svg', 'Online payment processing', true),
('WooCommerce', 'woocommerce', 'E-commerce', 'both', 'api_key', '/integrations/woocommerce.svg', 'WordPress e-commerce plugin', false),

-- File Storage
('Google Drive', 'google-drive', 'Storage', 'both', 'oauth2', '/integrations/google-drive.svg', 'Cloud file storage and sharing', true),
('Dropbox', 'dropbox', 'Storage', 'both', 'oauth2', '/integrations/dropbox.svg', 'File hosting and synchronization', true),
('OneDrive', 'onedrive', 'Storage', 'both', 'oauth2', '/integrations/onedrive.svg', 'Microsoft cloud storage', false),

-- Productivity
('Google Sheets', 'google-sheets', 'Productivity', 'both', 'oauth2', '/integrations/google-sheets.svg', 'Cloud spreadsheet application', true),
('Notion', 'notion', 'Productivity', 'both', 'api_key', '/integrations/notion.svg', 'All-in-one workspace', true),
('Airtable', 'airtable', 'Productivity', 'both', 'api_key', '/integrations/airtable.svg', 'Collaborative database platform', true),

-- Social Media
('Twitter/X', 'twitter', 'Social Media', 'both', 'oauth2', '/integrations/twitter.svg', 'Social media platform', true),
('Facebook', 'facebook', 'Social Media', 'both', 'oauth2', '/integrations/facebook.svg', 'Social networking platform', true),
('Instagram', 'instagram', 'Social Media', 'both', 'oauth2', '/integrations/instagram.svg', 'Photo and video sharing', true),
('LinkedIn', 'linkedin', 'Social Media', 'both', 'oauth2', '/integrations/linkedin.svg', 'Professional networking', false),

-- Calendar & Scheduling
('Google Calendar', 'google-calendar', 'Calendar', 'both', 'oauth2', '/integrations/google-calendar.svg', 'Schedule and calendar management', true),
('Calendly', 'calendly', 'Calendar', 'both', 'api_key', '/integrations/calendly.svg', 'Meeting scheduling platform', true),

-- Marketing
('Mailchimp', 'mailchimp', 'Marketing', 'both', 'api_key', '/integrations/mailchimp.svg', 'Email marketing platform', true),
('ConvertKit', 'convertkit', 'Marketing', 'both', 'api_key', '/integrations/convertkit.svg', 'Creator marketing platform', false);

-- Comments for documentation
COMMENT ON TABLE agent_execution_logs IS 'Tracks all agent executions with user feedback and failure detection';
COMMENT ON TABLE agent_reviews IS 'User reviews and ratings for agents with developer response capability';
COMMENT ON TABLE integrations IS 'Master list of available integrations (synced from n8n and other sources)';
COMMENT ON TABLE user_credentials IS 'Encrypted storage of user credentials for integrations';
COMMENT ON TABLE agent_triggers IS 'Defines when and how agents should be executed';
COMMENT ON TABLE referrals IS 'Referral program for user acquisition and revenue sharing';
COMMENT ON TABLE ab_experiments IS 'A/B testing framework for platform optimization';
