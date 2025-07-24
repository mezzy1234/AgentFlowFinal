-- ===============================================
-- AgentFlow.AI Final Production Database Setup
-- Complete schema with all production features
-- ===============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ===============================================
-- 1. USERS & AUTHENTICATION
-- ===============================================

-- Enhanced users table with comprehensive profile data
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    username VARCHAR(50) UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    location VARCHAR(100),
    company VARCHAR(100),
    website_url TEXT,
    github_username VARCHAR(100),
    twitter_username VARCHAR(100),
    linkedin_url TEXT,
    
    -- Account status
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,
    account_type VARCHAR(20) DEFAULT 'individual' CHECK (account_type IN ('individual', 'team', 'enterprise')),
    
    -- Preferences
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(20) DEFAULT 'light',
    
    -- Privacy settings
    profile_visibility VARCHAR(20) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'followers')),
    show_email BOOLEAN DEFAULT FALSE,
    show_location BOOLEAN DEFAULT TRUE,
    show_company BOOLEAN DEFAULT TRUE,
    allow_messages BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- User sessions for authentication tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 2. DEVELOPER PROFILES & SOCIAL FEATURES
-- ===============================================

-- Developer profiles with comprehensive social features
CREATE TABLE IF NOT EXISTS developer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    location VARCHAR(100),
    website_url TEXT,
    
    -- Skills and specializations
    skills TEXT[],
    specializations TEXT[],
    programming_languages TEXT[],
    frameworks TEXT[],
    
    -- Social links
    github_username VARCHAR(100),
    twitter_username VARCHAR(100),
    linkedin_url TEXT,
    discord_username VARCHAR(100),
    
    -- Profile settings
    is_public BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    show_revenue BOOLEAN DEFAULT FALSE,
    show_download_stats BOOLEAN DEFAULT TRUE,
    show_follower_count BOOLEAN DEFAULT TRUE,
    
    -- Statistics (updated by triggers)
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    agents_count INTEGER DEFAULT 0,
    total_downloads INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0.00,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Developer following relationships
CREATE TABLE IF NOT EXISTS developer_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(follower_id, following_id),
    CHECK(follower_id != following_id)
);

-- Developer achievements and badges
CREATE TABLE IF NOT EXISTS developer_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ===============================================
-- 3. AGENTS & MARKETPLACE
-- ===============================================

-- Enhanced agents table with marketplace features
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    detailed_description TEXT,
    readme TEXT,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    tags TEXT[],
    
    -- Agent configuration
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    version VARCHAR(20) DEFAULT '1.0.0',
    changelog TEXT,
    
    -- Marketplace settings
    is_public BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    price DECIMAL(10,2) DEFAULT 0.00,
    pricing_model VARCHAR(20) DEFAULT 'free' CHECK (pricing_model IN ('free', 'one_time', 'subscription', 'usage_based')),
    
    -- Media and assets
    icon_url TEXT,
    banner_url TEXT,
    screenshots TEXT[],
    demo_url TEXT,
    video_url TEXT,
    
    -- Statistics (updated by triggers)
    download_count INTEGER DEFAULT 0,
    install_count INTEGER DEFAULT 0,
    execution_count INTEGER DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    
    -- SEO and discoverability
    slug VARCHAR(255) UNIQUE,
    meta_title VARCHAR(255),
    meta_description TEXT,
    keywords TEXT[],
    
    -- Status and moderation
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'suspended')),
    moderation_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Agent ratings and reviews
CREATE TABLE IF NOT EXISTS agent_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(agent_id, user_id)
);

-- Agent downloads and installations tracking
CREATE TABLE IF NOT EXISTS agent_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    download_type VARCHAR(20) DEFAULT 'download' CHECK (download_type IN ('download', 'install', 'update')),
    ip_address INET,
    user_agent TEXT,
    country VARCHAR(2),
    referrer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 4. EXECUTION & LOGGING SYSTEM
-- ===============================================

-- Agent executions with comprehensive tracking
CREATE TABLE IF NOT EXISTS agent_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Execution metadata
    execution_id VARCHAR(100) UNIQUE NOT NULL,
    trigger_type VARCHAR(50) NOT NULL,
    trigger_data JSONB DEFAULT '{}'::jsonb,
    input_data JSONB DEFAULT '{}'::jsonb,
    output_data JSONB DEFAULT '{}'::jsonb,
    
    -- Status and timing
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'timeout')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Performance metrics
    cpu_usage_percent DECIMAL(5,2),
    memory_usage_mb INTEGER,
    api_calls_count INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0,
    
    -- Error handling
    error_message TEXT,
    error_code VARCHAR(50),
    error_stack TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Execution steps for detailed step-by-step tracking
CREATE TABLE IF NOT EXISTS execution_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID REFERENCES agent_executions(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    step_type VARCHAR(100) NOT NULL,
    step_order INTEGER NOT NULL,
    
    -- Step status and timing
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Step data
    input_data JSONB DEFAULT '{}'::jsonb,
    output_data JSONB DEFAULT '{}'::jsonb,
    
    -- Performance
    api_calls_count INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0,
    
    -- Error handling
    error_message TEXT,
    error_code VARCHAR(50),
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 5. OAUTH & INTEGRATIONS
-- ===============================================

-- OAuth providers configuration
CREATE TABLE IF NOT EXISTS oauth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id VARCHAR(50) UNIQUE NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    
    -- OAuth configuration
    oauth_version VARCHAR(10) NOT NULL DEFAULT '2.0',
    authorize_url TEXT NOT NULL,
    token_url TEXT NOT NULL,
    user_info_url TEXT,
    revoke_url TEXT,
    
    -- Supported features
    supported_scopes TEXT[],
    default_scopes TEXT[],
    supports_refresh BOOLEAN DEFAULT TRUE,
    supports_pkce BOOLEAN DEFAULT FALSE,
    
    -- Provider metadata
    icon_url TEXT,
    description TEXT,
    documentation_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth states for security
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    redirect_uri TEXT NOT NULL,
    code_verifier VARCHAR(128),
    scopes TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User integrations with encrypted credentials
CREATE TABLE IF NOT EXISTS user_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255),
    
    -- Integration metadata
    integration_name VARCHAR(255),
    workspace_name VARCHAR(255),
    workspace_id VARCHAR(255),
    avatar_url TEXT,
    
    -- Encrypted credentials
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Scopes and permissions
    granted_scopes TEXT[],
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, provider, provider_user_id)
);

-- ===============================================
-- 6. API KEYS & SECURITY
-- ===============================================

-- API keys with granular permissions
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    
    -- Permissions
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Rate limiting
    rate_limit_requests_per_minute INTEGER DEFAULT 100,
    rate_limit_requests_per_hour INTEGER DEFAULT 5000,
    rate_limit_requests_per_day INTEGER DEFAULT 50000,
    
    -- Usage tracking
    total_requests INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_by_ip INET,
    created_by_user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API key usage tracking for rate limiting
CREATE TABLE IF NOT EXISTS api_key_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 7. GDPR COMPLIANCE & DATA MANAGEMENT
-- ===============================================

-- Data export requests
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('full_export', 'agent_data', 'execution_logs', 'personal_data')),
    
    -- Request details
    export_format VARCHAR(20) DEFAULT 'json' CHECK (export_format IN ('json', 'csv', 'xml')),
    include_metadata BOOLEAN DEFAULT TRUE,
    date_range_start TIMESTAMP WITH TIME ZONE,
    date_range_end TIMESTAMP WITH TIME ZONE,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
    progress_percent INTEGER DEFAULT 0,
    
    -- Results
    file_path TEXT,
    file_size_bytes BIGINT,
    download_url TEXT,
    download_expires_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0,
    
    -- Error handling
    error_message TEXT,
    
    -- Timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Data deletion requests
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    deletion_type VARCHAR(50) NOT NULL CHECK (deletion_type IN ('account_deletion', 'specific_data', 'anonymization')),
    
    -- Deletion scope
    data_categories TEXT[] NOT NULL,
    retain_financial BOOLEAN DEFAULT TRUE,
    retain_published_agents BOOLEAN DEFAULT FALSE,
    
    -- Request details
    reason TEXT,
    confirmation_token VARCHAR(255) UNIQUE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled')),
    progress_percent INTEGER DEFAULT 0,
    
    -- Results
    deleted_records_count INTEGER DEFAULT 0,
    anonymized_records_count INTEGER DEFAULT 0,
    
    -- Timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Consent management
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('granted', 'denied', 'withdrawn')),
    version VARCHAR(20) NOT NULL,
    
    -- Consent metadata
    ip_address INET,
    user_agent TEXT,
    consent_method VARCHAR(50) DEFAULT 'web_form',
    
    -- Legal basis
    legal_basis VARCHAR(100),
    purpose TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, consent_type, version)
);

-- ===============================================
-- 8. FINANCIAL & REVENUE TRACKING
-- ===============================================

-- Revenue tracking for developers
CREATE TABLE IF NOT EXISTS developer_revenue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('sale', 'subscription', 'usage', 'commission', 'refund')),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    commission_rate DECIMAL(5,4) DEFAULT 0.7000,
    platform_fee_cents INTEGER NOT NULL,
    developer_payout_cents INTEGER NOT NULL,
    
    -- Payment processing
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    payment_status VARCHAR(20) DEFAULT 'pending',
    
    -- Payout tracking
    payout_id UUID,
    payout_status VARCHAR(20) DEFAULT 'pending',
    payout_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    buyer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Developer payouts
CREATE TABLE IF NOT EXISTS developer_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Payout details
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payout_method VARCHAR(50) NOT NULL,
    
    -- Stripe details
    stripe_transfer_id VARCHAR(255),
    stripe_account_id VARCHAR(255),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
    
    -- Timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_message TEXT,
    failure_reason VARCHAR(255)
);

-- ===============================================
-- 9. SYSTEM MONITORING & ERROR HANDLING
-- ===============================================

-- System error reports
CREATE TABLE IF NOT EXISTS system_error_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_type VARCHAR(100) NOT NULL,
    error_code VARCHAR(50),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    
    -- Context
    component VARCHAR(100),
    endpoint VARCHAR(255),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    request_id VARCHAR(100),
    
    -- Severity and status
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    
    -- Environment
    environment VARCHAR(20) DEFAULT 'production',
    version VARCHAR(20),
    
    -- Occurrence tracking
    occurrence_count INTEGER DEFAULT 1,
    first_occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System health metrics
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit VARCHAR(20),
    
    -- Categorization
    component VARCHAR(100),
    environment VARCHAR(20) DEFAULT 'production',
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 10. INDEXES FOR PERFORMANCE
-- ===============================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- Developer profile indexes
CREATE INDEX IF NOT EXISTS idx_developer_profiles_username ON developer_profiles(username);
CREATE INDEX IF NOT EXISTS idx_developer_profiles_public ON developer_profiles(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_developer_profiles_verified ON developer_profiles(is_verified) WHERE is_verified = true;

-- Agent indexes
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category);
CREATE INDEX IF NOT EXISTS idx_agents_public ON agents(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_agents_featured ON agents(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at);
CREATE INDEX IF NOT EXISTS idx_agents_download_count ON agents(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_agents_rating ON agents(average_rating DESC);

-- Execution indexes
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_user_id ON agent_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_created_at ON agent_executions(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_executions_execution_id ON agent_executions(execution_id);

-- OAuth and integration indexes
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_provider ON user_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_user_integrations_active ON user_integrations(is_active) WHERE is_active = true;

-- API key indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_key_usage_api_key_id ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_created_at ON api_key_usage(created_at);

-- System indexes
CREATE INDEX IF NOT EXISTS idx_system_error_reports_severity ON system_error_reports(severity);
CREATE INDEX IF NOT EXISTS idx_system_error_reports_status ON system_error_reports(status);
CREATE INDEX IF NOT EXISTS idx_system_error_reports_created_at ON system_error_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_component ON system_health_metrics(component);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_recorded_at ON system_health_metrics(recorded_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agents_public_category ON agents(is_public, category) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_agent_executions_user_agent ON agent_executions(user_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_date_status ON agent_executions(created_at, status);

-- ===============================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ===============================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_revenue ENABLE ROW LEVEL SECURITY;

-- User access policies
CREATE POLICY "Users can view their own data" ON users
    FOR ALL USING (auth.uid() = id);

-- Agent access policies
CREATE POLICY "Public agents are viewable by all" ON agents
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can manage their own agents" ON agents
    FOR ALL USING (auth.uid() = user_id);

-- Execution access policies
CREATE POLICY "Users can view their own executions" ON agent_executions
    FOR ALL USING (auth.uid() = user_id);

-- Integration access policies
CREATE POLICY "Users can manage their own integrations" ON user_integrations
    FOR ALL USING (auth.uid() = user_id);

-- API key access policies
CREATE POLICY "Users can manage their own API keys" ON api_keys
    FOR ALL USING (auth.uid() = user_id);

-- ===============================================
-- 12. TRIGGERS FOR AUTOMATED UPDATES
-- ===============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_developer_profiles_updated_at BEFORE UPDATE ON developer_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update agent statistics
CREATE OR REPLACE FUNCTION update_agent_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
        UPDATE agents 
        SET execution_count = execution_count + 1
        WHERE id = NEW.agent_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update agent execution count
CREATE TRIGGER update_agent_execution_stats AFTER INSERT ON agent_executions
    FOR EACH ROW EXECUTE FUNCTION update_agent_stats();

-- Function to update developer profile stats
CREATE OR REPLACE FUNCTION update_developer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE developer_profiles 
        SET followers_count = followers_count + 1
        WHERE user_id = NEW.following_id;
        
        UPDATE developer_profiles 
        SET following_count = following_count + 1
        WHERE user_id = NEW.follower_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE developer_profiles 
        SET followers_count = followers_count - 1
        WHERE user_id = OLD.following_id;
        
        UPDATE developer_profiles 
        SET following_count = following_count - 1
        WHERE user_id = OLD.follower_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger to update follower counts
CREATE TRIGGER update_developer_follow_stats 
    AFTER INSERT OR DELETE ON developer_follows
    FOR EACH ROW EXECUTE FUNCTION update_developer_stats();

-- ===============================================
-- 13. INSERT INITIAL DATA
-- ===============================================

-- Insert OAuth providers
INSERT INTO oauth_providers (provider_id, provider_name, category, oauth_version, authorize_url, token_url, user_info_url, supported_scopes, default_scopes, icon_url) VALUES
('slack', 'Slack', 'communication', '2.0', 'https://slack.com/oauth/v2/authorize', 'https://slack.com/api/oauth.v2.access', 'https://slack.com/api/users.identity', ARRAY['channels:read', 'chat:write', 'users:read', 'users:read.email'], ARRAY['channels:read', 'chat:write'], 'https://cdn.agentflow.ai/icons/slack.png'),
('discord', 'Discord', 'communication', '2.0', 'https://discord.com/api/oauth2/authorize', 'https://discord.com/api/oauth2/token', 'https://discord.com/api/users/@me', ARRAY['identify', 'email', 'guilds', 'bot'], ARRAY['identify', 'email'], 'https://cdn.agentflow.ai/icons/discord.png'),
('google', 'Google', 'productivity', '2.0', 'https://accounts.google.com/o/oauth2/v2/auth', 'https://oauth2.googleapis.com/token', 'https://www.googleapis.com/oauth2/v2/userinfo', ARRAY['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/drive'], ARRAY['openid', 'email', 'profile'], 'https://cdn.agentflow.ai/icons/google.png'),
('github', 'GitHub', 'development', '2.0', 'https://github.com/login/oauth/authorize', 'https://github.com/login/oauth/access_token', 'https://api.github.com/user', ARRAY['repo', 'user', 'user:email', 'workflow'], ARRAY['user', 'user:email'], 'https://cdn.agentflow.ai/icons/github.png'),
('salesforce', 'Salesforce', 'crm', '2.0', 'https://login.salesforce.com/services/oauth2/authorize', 'https://login.salesforce.com/services/oauth2/token', 'https://login.salesforce.com/services/oauth2/userinfo', ARRAY['api', 'refresh_token', 'offline_access'], ARRAY['api', 'refresh_token'], 'https://cdn.agentflow.ai/icons/salesforce.png')
ON CONFLICT (provider_id) DO NOTHING;

-- Add more OAuth providers
INSERT INTO oauth_providers (provider_id, provider_name, category, oauth_version, authorize_url, token_url, user_info_url, supported_scopes, default_scopes, icon_url) VALUES
('microsoft', 'Microsoft', 'productivity', '2.0', 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', 'https://login.microsoftonline.com/common/oauth2/v2.0/token', 'https://graph.microsoft.com/v1.0/me', ARRAY['openid', 'profile', 'email', 'offline_access', 'https://graph.microsoft.com/mail.read'], ARRAY['openid', 'profile', 'email'], 'https://cdn.agentflow.ai/icons/microsoft.png'),
('linkedin', 'LinkedIn', 'social', '2.0', 'https://www.linkedin.com/oauth/v2/authorization', 'https://www.linkedin.com/oauth/v2/accessToken', 'https://api.linkedin.com/v2/me', ARRAY['r_liteprofile', 'r_emailaddress', 'w_member_social'], ARRAY['r_liteprofile', 'r_emailaddress'], 'https://cdn.agentflow.ai/icons/linkedin.png'),
('twitter', 'Twitter', 'social', '2.0', 'https://twitter.com/i/oauth2/authorize', 'https://api.twitter.com/2/oauth2/token', 'https://api.twitter.com/2/users/me', ARRAY['tweet.read', 'tweet.write', 'users.read'], ARRAY['tweet.read', 'users.read'], 'https://cdn.agentflow.ai/icons/twitter.png'),
('shopify', 'Shopify', 'ecommerce', '2.0', 'https://{shop}.myshopify.com/admin/oauth/authorize', 'https://{shop}.myshopify.com/admin/oauth/access_token', 'https://{shop}.myshopify.com/admin/api/2023-10/shop.json', ARRAY['read_products', 'write_products', 'read_orders', 'read_customers'], ARRAY['read_products', 'read_orders'], 'https://cdn.agentflow.ai/icons/shopify.png'),
('hubspot', 'HubSpot', 'crm', '2.0', 'https://app.hubspot.com/oauth/authorize', 'https://api.hubapi.com/oauth/v1/token', 'https://api.hubapi.com/oauth/v1/access-tokens/', ARRAY['contacts', 'content', 'automation'], ARRAY['contacts'], 'https://cdn.agentflow.ai/icons/hubspot.png')
ON CONFLICT (provider_id) DO NOTHING;

-- Create admin user for system operations (if needed)
-- INSERT INTO users (id, email, first_name, last_name, is_active, account_type) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'admin@agentflow.ai', 'System', 'Admin', true, 'enterprise')
-- ON CONFLICT (id) DO NOTHING;

-- ===============================================
-- COMPLETE DATABASE SETUP
-- ===============================================

-- Refresh materialized views (if any exist)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY IF EXISTS agent_stats_mv;

-- Update table statistics for query optimization
ANALYZE;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'AgentFlow.AI production database setup completed successfully at %', NOW();
END
$$;
