-- Chunk 6: Advanced Integrations Database Schema
-- Third-party integrations, marketplace, custom connectors, monitoring

-- Integration Categories
CREATE TABLE IF NOT EXISTS integration_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Available Integrations (Marketplace)
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    long_description TEXT,
    category_id UUID REFERENCES integration_categories(id),
    provider VARCHAR(100) NOT NULL,
    version VARCHAR(20) DEFAULT '1.0.0',
    logo_url TEXT,
    banner_url TEXT,
    website_url TEXT,
    documentation_url TEXT,
    support_url TEXT,
    pricing_model VARCHAR(50) DEFAULT 'free' CHECK (pricing_model IN ('free', 'freemium', 'paid', 'usage_based')),
    pricing_details JSONB DEFAULT '{}',
    features TEXT[],
    requirements TEXT[],
    supported_platforms TEXT[],
    oauth_config JSONB,
    webhook_config JSONB,
    api_config JSONB,
    connection_schema JSONB NOT NULL,
    action_schemas JSONB DEFAULT '[]',
    trigger_schemas JSONB DEFAULT '[]',
    is_official BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    install_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Integration Installations
CREATE TABLE IF NOT EXISTS user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
    connection_name VARCHAR(200) NOT NULL,
    connection_config JSONB NOT NULL,
    credentials JSONB, -- Encrypted credentials
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'suspended')),
    last_sync TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
    error_message TEXT,
    rate_limit_info JSONB,
    usage_stats JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, integration_id, connection_name)
);

-- Integration Actions (What users can do with integrations)
CREATE TABLE IF NOT EXISTS integration_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    description TEXT,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('create', 'read', 'update', 'delete', 'send', 'fetch', 'sync')),
    input_schema JSONB NOT NULL,
    output_schema JSONB NOT NULL,
    example_payload JSONB,
    rate_limits JSONB,
    required_scopes TEXT[],
    is_premium BOOLEAN DEFAULT false,
    execution_timeout INTEGER DEFAULT 30,
    retry_config JSONB DEFAULT '{"max_retries": 3, "backoff": "exponential"}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(integration_id, slug)
);

-- Integration Triggers (What can trigger agent actions)
CREATE TABLE IF NOT EXISTS integration_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('webhook', 'polling', 'event', 'schedule')),
    event_schema JSONB NOT NULL,
    webhook_config JSONB,
    polling_config JSONB,
    required_scopes TEXT[],
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(integration_id, slug)
);

-- Agent Integration Workflows
CREATE TABLE IF NOT EXISTS agent_integration_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    user_integration_id UUID REFERENCES user_integrations(id) ON DELETE CASCADE,
    workflow_name VARCHAR(200) NOT NULL,
    trigger_config JSONB,
    action_steps JSONB NOT NULL, -- Array of action configurations
    condition_logic JSONB,
    error_handling JSONB DEFAULT '{"on_error": "stop", "retry_count": 3}',
    is_active BOOLEAN DEFAULT true,
    execution_count INTEGER DEFAULT 0,
    last_execution TIMESTAMP WITH TIME ZONE,
    last_execution_status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration Execution Logs
CREATE TABLE IF NOT EXISTS integration_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES agent_integration_workflows(id) ON DELETE CASCADE,
    user_integration_id UUID REFERENCES user_integrations(id) ON DELETE CASCADE,
    execution_type VARCHAR(50) NOT NULL CHECK (execution_type IN ('action', 'trigger', 'sync')),
    action_name VARCHAR(200),
    input_data JSONB,
    output_data JSONB,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'success', 'error', 'timeout', 'cancelled')),
    error_message TEXT,
    error_code VARCHAR(50),
    duration_ms INTEGER,
    tokens_used INTEGER DEFAULT 0,
    api_calls_made INTEGER DEFAULT 0,
    rate_limit_hit BOOLEAN DEFAULT false,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Connectors (User-created integrations)
CREATE TABLE IF NOT EXISTS custom_connectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    base_url TEXT NOT NULL,
    authentication_type VARCHAR(50) NOT NULL CHECK (authentication_type IN ('none', 'api_key', 'bearer_token', 'oauth2', 'basic_auth')),
    auth_config JSONB NOT NULL,
    headers JSONB DEFAULT '{}',
    endpoints JSONB NOT NULL, -- Array of endpoint definitions
    test_endpoint JSONB,
    documentation TEXT,
    is_shared BOOLEAN DEFAULT false,
    share_token VARCHAR(100) UNIQUE,
    usage_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'testing', 'active', 'deprecated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration Marketplace Reviews
CREATE TABLE IF NOT EXISTS integration_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_title VARCHAR(200),
    review_text TEXT,
    pros TEXT[],
    cons TEXT[],
    use_case VARCHAR(500),
    helpful_votes INTEGER DEFAULT 0,
    is_verified_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(integration_id, user_id)
);

-- Integration Analytics
CREATE TABLE IF NOT EXISTS integration_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    installs INTEGER DEFAULT 0,
    uninstalls INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    avg_execution_time DECIMAL(10,2) DEFAULT 0,
    total_api_calls INTEGER DEFAULT 0,
    unique_agents_used INTEGER DEFAULT 0,
    revenue_generated DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(integration_id, date)
);

-- Integration Rate Limits
CREATE TABLE IF NOT EXISTS integration_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_integration_id UUID REFERENCES user_integrations(id) ON DELETE CASCADE,
    limit_type VARCHAR(50) NOT NULL CHECK (limit_type IN ('requests_per_minute', 'requests_per_hour', 'requests_per_day', 'data_transfer')),
    limit_value INTEGER NOT NULL,
    current_usage INTEGER DEFAULT 0,
    reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
    exceeded_count INTEGER DEFAULT 0,
    last_exceeded TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Endpoints for Integrations
CREATE TABLE IF NOT EXISTS integration_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_integration_id UUID REFERENCES user_integrations(id) ON DELETE CASCADE,
    webhook_url TEXT NOT NULL,
    secret_token VARCHAR(200),
    events TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_ping TIMESTAMP WITH TIME ZONE,
    ping_status VARCHAR(20),
    delivery_attempts INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration Monitoring
CREATE TABLE IF NOT EXISTS integration_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('operational', 'degraded', 'partial_outage', 'major_outage')),
    uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
    avg_response_time INTEGER, -- in milliseconds
    incident_count INTEGER DEFAULT 0,
    last_incident TIMESTAMP WITH TIME ZONE,
    monitoring_data JSONB DEFAULT '{}',
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrations_category_active ON integrations(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_integrations_featured_rating ON integrations(is_featured, rating DESC);
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_status ON user_integrations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_integration_executions_workflow_status ON integration_executions(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_integration_executions_created_at ON integration_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_connectors_user_status ON custom_connectors(user_id, status);
CREATE INDEX IF NOT EXISTS idx_integration_analytics_date ON integration_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_integration_rate_limits_reset ON integration_rate_limits(reset_at);

-- Insert integration categories
INSERT INTO integration_categories (name, description, icon_url, sort_order) VALUES
('Communication', 'Email, chat, messaging platforms', '/icons/communication.svg', 1),
('CRM', 'Customer relationship management systems', '/icons/crm.svg', 2),
('Marketing', 'Marketing automation and analytics', '/icons/marketing.svg', 3),
('Productivity', 'Task management and collaboration tools', '/icons/productivity.svg', 4),
('E-commerce', 'Online stores and payment platforms', '/icons/ecommerce.svg', 5),
('Social Media', 'Social networking platforms', '/icons/social.svg', 6),
('Developer Tools', 'Code repositories, CI/CD, monitoring', '/icons/developer.svg', 7),
('Finance', 'Accounting, payments, financial services', '/icons/finance.svg', 8),
('Analytics', 'Data analysis and reporting tools', '/icons/analytics.svg', 9),
('Storage', 'File storage and document management', '/icons/storage.svg', 10)
ON CONFLICT (name) DO NOTHING;

-- Insert sample data
INSERT INTO integration_categories (name, description, icon, color) VALUES 
('productivity', 'Productivity and workflow automation tools', 'Briefcase', '#3B82F6'),
('communication', 'Communication and messaging platforms', 'MessageCircle', '#10B981'),
('storage', 'File storage and document management', 'HardDrive', '#F59E0B'),
('marketing', 'Marketing automation and CRM tools', 'Target', '#EF4444'),
('development', 'Developer tools and code management', 'Code', '#8B5CF6'),
('analytics', 'Analytics and data visualization', 'BarChart', '#06B6D4'),
('social', 'Social media and content management', 'Share2', '#EC4899'),
('finance', 'Financial and payment processing', 'DollarSign', '#84CC16');

-- Functions for integration management
CREATE OR REPLACE FUNCTION increment_install_count(integration_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE integrations 
  SET install_count = install_count + 1
  WHERE id = integration_id;
END;
$$ LANGUAGE plpgsql;

-- Sample integrations
INSERT INTO integrations (id, name, provider, description, category_id, logo_url, features, pricing_model, auth_type, install_count, rating, review_count, is_featured, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Slack', 'Slack Technologies', 'Team communication and collaboration platform', (SELECT id FROM integration_categories WHERE name = 'communication'), 'https://cdn.worldvectorlogo.com/logos/slack-new-logo.svg', ARRAY['messaging', 'channels', 'file_sharing', 'bot_integration'], 'free', 'oauth2', 250000, 4.8, 1240, true, true),
('550e8400-e29b-41d4-a716-446655440002', 'Gmail', 'Google', 'Email and calendar integration', (SELECT id FROM integration_categories WHERE name = 'communication'), 'https://cdn.worldvectorlogo.com/logos/gmail-icon.svg', ARRAY['email', 'calendar', 'contacts', 'automation'], 'free', 'oauth2', 180000, 4.7, 980, true, true),
('550e8400-e29b-41d4-a716-446655440003', 'Discord', 'Discord Inc.', 'Gaming and community communication', (SELECT id FROM integration_categories WHERE name = 'communication'), 'https://cdn.worldvectorlogo.com/logos/discord-6.svg', ARRAY['voice_chat', 'text_chat', 'community', 'bot_integration'], 'free', 'oauth2', 120000, 4.6, 750, true, true),
('550e8400-e29b-41d4-a716-446655440004', 'GitHub', 'GitHub Inc.', 'Code repository and collaboration', (SELECT id FROM integration_categories WHERE name = 'development'), 'https://cdn.worldvectorlogo.com/logos/github-icon-1.svg', ARRAY['repositories', 'issues', 'pull_requests', 'webhooks'], 'freemium', 'oauth2', 95000, 4.9, 1100, true, true),
('550e8400-e29b-41d4-a716-446655440005', 'Shopify', 'Shopify Inc.', 'E-commerce platform integration', (SELECT id FROM integration_categories WHERE name = 'marketing'), 'https://cdn.worldvectorlogo.com/logos/shopify.svg', ARRAY['products', 'orders', 'customers', 'inventory'], 'paid', 'api_key', 75000, 4.5, 650, false, true);
