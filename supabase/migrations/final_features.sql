-- Database migrations for new AgentFlow.AI features

-- 1. Developer Profiles System
CREATE TABLE IF NOT EXISTS developer_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    website_url TEXT,
    github_url TEXT,
    twitter_handle VARCHAR(50),
    linkedin_url TEXT,
    location VARCHAR(100),
    skills TEXT[] DEFAULT '{}',
    specializations TEXT[] DEFAULT '{}',
    
    -- Privacy settings
    show_revenue BOOLEAN DEFAULT FALSE,
    show_email BOOLEAN DEFAULT FALSE,
    show_location BOOLEAN DEFAULT TRUE,
    show_real_name BOOLEAN DEFAULT FALSE,
    
    -- Profile stats (JSONB for flexibility)
    stats JSONB DEFAULT '{
        "total_agents": 0,
        "public_agents": 0,
        "total_downloads": 0,
        "total_revenue": 0,
        "avg_rating": 0,
        "total_reviews": 0,
        "joined_date": "",
        "last_active": ""
    }'::jsonb,
    
    -- Achievements
    achievements JSONB DEFAULT '[]'::jsonb,
    
    -- Social counts
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    
    -- Profile status
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    profile_completeness INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Developer Follow System
CREATE TABLE IF NOT EXISTS developer_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- 3. GDPR Compliance Tables
CREATE TABLE IF NOT EXISTS data_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    accessed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('view', 'export', 'modify', 'delete')),
    data_category VARCHAR(50) NOT NULL CHECK (data_category IN ('profile', 'credentials', 'agents', 'logs', 'revenue', 'all')),
    ip_address INET,
    user_agent TEXT,
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('privacy_policy', 'terms_of_service', 'marketing', 'analytics', 'data_processing')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('granted', 'revoked', 'expired')),
    version VARCHAR(20) NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT
);

CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('full_export', 'specific_data')),
    data_categories TEXT[] NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deletion_type VARCHAR(20) NOT NULL CHECK (deletion_type IN ('account_deletion', 'specific_data')),
    data_categories TEXT[] NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retain_financial BOOLEAN DEFAULT TRUE,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Error Reporting System
CREATE TABLE IF NOT EXISTS error_reports (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    error_type VARCHAR(50) NOT NULL CHECK (error_type IN ('credential_error', 'sync_failure', 'payout_error', 'restore_failure', 'api_error')),
    error_code VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB DEFAULT '{}'::jsonb,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
    resolution TEXT,
    first_occurred TIMESTAMP WITH TIME ZONE NOT NULL,
    last_occurred TIMESTAMP WITH TIME ZONE NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    user_impact INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Payout Logging System (enhanced)
CREATE TABLE IF NOT EXISTS payout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id VARCHAR(100),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    stripe_payout_id VARCHAR(100),
    stripe_error_code VARCHAR(100),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enhanced Agent Reviews (for developer profiles)
CREATE TABLE IF NOT EXISTS agent_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(agent_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_developer_profiles_username ON developer_profiles(username);
CREATE INDEX IF NOT EXISTS idx_developer_profiles_location ON developer_profiles(location);
CREATE INDEX IF NOT EXISTS idx_developer_profiles_skills ON developer_profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_developer_profiles_specializations ON developer_profiles USING GIN(specializations);

CREATE INDEX IF NOT EXISTS idx_developer_follows_follower ON developer_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_developer_follows_following ON developer_follows(following_id);

CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON data_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_timestamp ON data_access_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_access_type ON data_access_logs(access_type);

CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_type_status ON consent_records(consent_type, status);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_scheduled ON data_deletion_requests(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_error_reports_type_severity ON error_reports(error_type, severity);
CREATE INDEX IF NOT EXISTS idx_error_reports_status ON error_reports(status);
CREATE INDEX IF NOT EXISTS idx_error_reports_last_occurred ON error_reports(last_occurred);

CREATE INDEX IF NOT EXISTS idx_payout_logs_user_id ON payout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_logs_status ON payout_logs(status);
CREATE INDEX IF NOT EXISTS idx_payout_logs_created_at ON payout_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_agent_reviews_agent_id ON agent_reviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_reviews_rating ON agent_reviews(rating);

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('agent-assets', 'agent-assets', true),
    ('gdpr-exports', 'gdpr-exports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for new tables

-- Developer Profiles: Public read, owner write
ALTER TABLE developer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developer profiles are publicly readable"
    ON developer_profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can manage their own profile"
    ON developer_profiles FOR ALL
    USING (auth.uid() = user_id);

-- Developer Follows: Users can manage their own follows
ALTER TABLE developer_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view follows"
    ON developer_follows FOR SELECT
    USING (true);

CREATE POLICY "Users can manage their own follows"
    ON developer_follows FOR ALL
    USING (auth.uid() = follower_id);

-- GDPR Tables: Users can only access their own data
ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own access logs"
    ON data_access_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own consents"
    ON consent_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own export requests"
    ON data_export_requests FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own deletion requests"
    ON data_deletion_requests FOR ALL
    USING (auth.uid() = user_id);

-- Agent Reviews: Public read, authenticated users can write
ALTER TABLE agent_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent reviews are publicly readable"
    ON agent_reviews FOR SELECT
    USING (true);

CREATE POLICY "Users can manage their own reviews"
    ON agent_reviews FOR ALL
    USING (auth.uid() = user_id);

-- Error Reports: Admin only (no RLS for now, handled in application)
-- Payout Logs: Admin only (no RLS for now, handled in application)

-- Functions for automated tasks

-- Function to update developer profile stats
CREATE OR REPLACE FUNCTION update_developer_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be called after agent or earnings changes
    -- Update stats in developer_profiles table
    -- Implementation depends on specific triggers
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired export requests
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS void AS $$
BEGIN
    DELETE FROM data_export_requests 
    WHERE status = 'completed' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to process scheduled deletions
CREATE OR REPLACE FUNCTION process_scheduled_deletions()
RETURNS void AS $$
BEGIN
    -- This would be called by a cron job
    -- Process deletion requests where scheduled_for <= NOW()
    UPDATE data_deletion_requests 
    SET status = 'processing'
    WHERE status = 'pending' 
    AND scheduled_for <= NOW();
END;
$$ LANGUAGE plpgsql;
