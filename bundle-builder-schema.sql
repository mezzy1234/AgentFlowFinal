-- Bundle Builder System Schema
-- Enables users to create custom agent bundles with workflows and automation

-- Agent Bundles - Collections of agents with workflows
CREATE TABLE agent_bundles (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR,
    creator_id VARCHAR NOT NULL, -- User who created the bundle
    is_public BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    bundle_config JSONB NOT NULL, -- Workflow configuration
    pricing_model VARCHAR DEFAULT 'free', -- free, paid, subscription
    price_cents INTEGER DEFAULT 0,
    total_installs INTEGER DEFAULT 0,
    total_revenue_cents INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    status VARCHAR DEFAULT 'draft', -- draft, published, archived
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bundle Agents - Agents included in a bundle
CREATE TABLE bundle_agents (
    id VARCHAR PRIMARY KEY,
    bundle_id VARCHAR NOT NULL REFERENCES agent_bundles(id) ON DELETE CASCADE,
    agent_id VARCHAR NOT NULL,
    position INTEGER NOT NULL, -- Order in workflow
    config JSONB DEFAULT '{}', -- Agent-specific config in bundle
    dependencies TEXT[], -- Other bundle agents this depends on
    triggers JSONB DEFAULT '{}', -- When this agent should execute
    conditions JSONB DEFAULT '{}', -- Conditions for execution
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bundle Workflows - Define execution flow between agents
CREATE TABLE bundle_workflows (
    id VARCHAR PRIMARY KEY,
    bundle_id VARCHAR NOT NULL REFERENCES agent_bundles(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    description TEXT,
    workflow_type VARCHAR DEFAULT 'sequential', -- sequential, parallel, conditional, loop
    workflow_config JSONB NOT NULL, -- Step definitions, conditions, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bundle Installations - User installations of bundles
CREATE TABLE bundle_installations (
    id VARCHAR PRIMARY KEY,
    bundle_id VARCHAR NOT NULL REFERENCES agent_bundles(id),
    user_id VARCHAR NOT NULL,
    installation_config JSONB DEFAULT '{}', -- User customizations
    status VARCHAR DEFAULT 'active', -- active, paused, cancelled
    payment_status VARCHAR DEFAULT 'free', -- free, paid, trial, expired
    subscription_id VARCHAR, -- Stripe subscription ID if applicable
    installed_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- For paid subscriptions
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bundle Executions - Track bundle workflow executions
CREATE TABLE bundle_executions (
    id VARCHAR PRIMARY KEY,
    bundle_id VARCHAR NOT NULL REFERENCES agent_bundles(id),
    installation_id VARCHAR NOT NULL REFERENCES bundle_installations(id),
    user_id VARCHAR NOT NULL,
    execution_config JSONB DEFAULT '{}',
    status VARCHAR DEFAULT 'pending', -- pending, running, completed, failed, cancelled
    workflow_state JSONB DEFAULT '{}', -- Current state of workflow execution
    results JSONB DEFAULT '{}', -- Results from each step
    error_message TEXT,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    total_runtime_ms INTEGER,
    cost_cents INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bundle Execution Steps - Track individual agent executions within bundle
CREATE TABLE bundle_execution_steps (
    id VARCHAR PRIMARY KEY,
    execution_id VARCHAR NOT NULL REFERENCES bundle_executions(id) ON DELETE CASCADE,
    agent_id VARCHAR NOT NULL,
    step_name VARCHAR NOT NULL,
    step_position INTEGER NOT NULL,
    status VARCHAR DEFAULT 'pending', -- pending, running, completed, failed, skipped
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    runtime_ms INTEGER,
    cost_cents INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bundle Templates - Pre-built bundle templates
CREATE TABLE bundle_templates (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR,
    difficulty_level VARCHAR DEFAULT 'beginner', -- beginner, intermediate, advanced
    template_config JSONB NOT NULL, -- Complete bundle configuration
    required_agents TEXT[], -- Agent IDs needed for this template
    estimated_setup_time INTEGER, -- Minutes to set up
    use_cases TEXT[],
    tags TEXT[],
    thumbnail_url VARCHAR,
    demo_url VARCHAR,
    is_featured BOOLEAN DEFAULT false,
    total_uses INTEGER DEFAULT 0,
    created_by VARCHAR, -- AgentFlow team member
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bundle Reviews - User reviews for bundles
CREATE TABLE bundle_reviews (
    id VARCHAR PRIMARY KEY,
    bundle_id VARCHAR NOT NULL REFERENCES agent_bundles(id) ON DELETE CASCADE,
    user_id VARCHAR NOT NULL,
    installation_id VARCHAR REFERENCES bundle_installations(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    pros TEXT[],
    cons TEXT[],
    would_recommend BOOLEAN,
    verified_purchase BOOLEAN DEFAULT false,
    helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'published', -- published, hidden, flagged
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bundle Sharing - Share bundles with teams/organizations
CREATE TABLE bundle_shares (
    id VARCHAR PRIMARY KEY,
    bundle_id VARCHAR NOT NULL REFERENCES agent_bundles(id) ON DELETE CASCADE,
    shared_by VARCHAR NOT NULL, -- User who shared
    shared_with VARCHAR, -- User ID, team ID, or email
    share_type VARCHAR DEFAULT 'user', -- user, team, organization, public_link
    permissions JSONB DEFAULT '{}', -- view, use, edit permissions
    access_link VARCHAR, -- Unique access link
    expires_at TIMESTAMP,
    accessed_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    status VARCHAR DEFAULT 'active', -- active, revoked, expired
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for bundle system
CREATE INDEX idx_agent_bundles_creator ON agent_bundles(creator_id);
CREATE INDEX idx_agent_bundles_status ON agent_bundles(status);
CREATE INDEX idx_agent_bundles_category ON agent_bundles(category);
CREATE INDEX idx_agent_bundles_pricing ON agent_bundles(pricing_model);
CREATE INDEX idx_agent_bundles_public ON agent_bundles(is_public);
CREATE INDEX idx_agent_bundles_created ON agent_bundles(created_at);

CREATE INDEX idx_bundle_agents_bundle ON bundle_agents(bundle_id);
CREATE INDEX idx_bundle_agents_agent ON bundle_agents(agent_id);
CREATE INDEX idx_bundle_agents_position ON bundle_agents(bundle_id, position);

CREATE INDEX idx_bundle_workflows_bundle ON bundle_workflows(bundle_id);
CREATE INDEX idx_bundle_workflows_active ON bundle_workflows(is_active);

CREATE INDEX idx_bundle_installations_bundle ON bundle_installations(bundle_id);
CREATE INDEX idx_bundle_installations_user ON bundle_installations(user_id);
CREATE INDEX idx_bundle_installations_status ON bundle_installations(status);
CREATE INDEX idx_bundle_installations_payment ON bundle_installations(payment_status);

CREATE INDEX idx_bundle_executions_bundle ON bundle_executions(bundle_id);
CREATE INDEX idx_bundle_executions_installation ON bundle_executions(installation_id);
CREATE INDEX idx_bundle_executions_user ON bundle_executions(user_id);
CREATE INDEX idx_bundle_executions_status ON bundle_executions(status);
CREATE INDEX idx_bundle_executions_created ON bundle_executions(created_at);

CREATE INDEX idx_bundle_execution_steps_execution ON bundle_execution_steps(execution_id);
CREATE INDEX idx_bundle_execution_steps_agent ON bundle_execution_steps(agent_id);
CREATE INDEX idx_bundle_execution_steps_status ON bundle_execution_steps(status);

CREATE INDEX idx_bundle_templates_category ON bundle_templates(category);
CREATE INDEX idx_bundle_templates_featured ON bundle_templates(is_featured);
CREATE INDEX idx_bundle_templates_difficulty ON bundle_templates(difficulty_level);

CREATE INDEX idx_bundle_reviews_bundle ON bundle_reviews(bundle_id);
CREATE INDEX idx_bundle_reviews_user ON bundle_reviews(user_id);
CREATE INDEX idx_bundle_reviews_rating ON bundle_reviews(rating);

CREATE INDEX idx_bundle_shares_bundle ON bundle_shares(bundle_id);
CREATE INDEX idx_bundle_shares_user ON bundle_shares(shared_with);
CREATE INDEX idx_bundle_shares_type ON bundle_shares(share_type);
CREATE INDEX idx_bundle_shares_status ON bundle_shares(status);

-- PostgreSQL functions for bundle operations
CREATE OR REPLACE FUNCTION create_bundle_from_template(
    p_template_id VARCHAR,
    p_user_id VARCHAR,
    p_bundle_name VARCHAR,
    p_customizations JSONB DEFAULT '{}'
)
RETURNS VARCHAR AS $$
DECLARE
    new_bundle_id VARCHAR;
    template_config JSONB;
    bundle_config JSONB;
BEGIN
    -- Generate new bundle ID
    new_bundle_id := 'bundle_' || EXTRACT(epoch FROM NOW()) || '_' || substr(md5(random()::text), 1, 8);
    
    -- Get template configuration
    SELECT template_config INTO template_config
    FROM bundle_templates
    WHERE id = p_template_id;
    
    IF template_config IS NULL THEN
        RAISE EXCEPTION 'Template not found';
    END IF;
    
    -- Merge template config with customizations
    bundle_config := template_config || p_customizations;
    
    -- Create bundle from template
    INSERT INTO agent_bundles (
        id, name, description, category, creator_id,
        bundle_config, status, created_at
    )
    SELECT 
        new_bundle_id,
        p_bundle_name,
        description,
        category,
        p_user_id,
        bundle_config,
        'draft',
        NOW()
    FROM bundle_templates
    WHERE id = p_template_id;
    
    -- Update template usage count
    UPDATE bundle_templates
    SET total_uses = total_uses + 1
    WHERE id = p_template_id;
    
    RETURN new_bundle_id;
END;
$$ LANGUAGE plpgsql;

-- Function to install a bundle
CREATE OR REPLACE FUNCTION install_bundle(
    p_bundle_id VARCHAR,
    p_user_id VARCHAR,
    p_config JSONB DEFAULT '{}'
)
RETURNS VARCHAR AS $$
DECLARE
    installation_id VARCHAR;
    bundle_pricing VARCHAR;
    bundle_price INTEGER;
BEGIN
    -- Generate installation ID
    installation_id := 'inst_' || EXTRACT(epoch FROM NOW()) || '_' || substr(md5(random()::text), 1, 8);
    
    -- Get bundle pricing info
    SELECT pricing_model, price_cents INTO bundle_pricing, bundle_price
    FROM agent_bundles
    WHERE id = p_bundle_id AND status = 'published';
    
    IF bundle_pricing IS NULL THEN
        RAISE EXCEPTION 'Bundle not found or not published';
    END IF;
    
    -- Create installation
    INSERT INTO bundle_installations (
        id, bundle_id, user_id, installation_config,
        payment_status, installed_at, created_at
    ) VALUES (
        installation_id, p_bundle_id, p_user_id, p_config,
        CASE WHEN bundle_pricing = 'free' THEN 'free' ELSE 'pending' END,
        NOW(), NOW()
    );
    
    -- Update bundle install count
    UPDATE agent_bundles
    SET total_installs = total_installs + 1
    WHERE id = p_bundle_id;
    
    RETURN installation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to execute a bundle workflow
CREATE OR REPLACE FUNCTION execute_bundle_workflow(
    p_bundle_id VARCHAR,
    p_installation_id VARCHAR,
    p_user_id VARCHAR,
    p_input_data JSONB DEFAULT '{}'
)
RETURNS VARCHAR AS $$
DECLARE
    execution_id VARCHAR;
    workflow_config JSONB;
BEGIN
    -- Generate execution ID
    execution_id := 'exec_' || EXTRACT(epoch FROM NOW()) || '_' || substr(md5(random()::text), 1, 8);
    
    -- Get bundle workflow configuration
    SELECT bundle_config INTO workflow_config
    FROM agent_bundles
    WHERE id = p_bundle_id;
    
    -- Create execution record
    INSERT INTO bundle_executions (
        id, bundle_id, installation_id, user_id,
        execution_config, status, workflow_state,
        started_at, created_at
    ) VALUES (
        execution_id, p_bundle_id, p_installation_id, p_user_id,
        p_input_data, 'pending', '{"current_step": 0}',
        NOW(), NOW()
    );
    
    -- Update installation usage
    UPDATE bundle_installations
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = p_installation_id;
    
    RETURN execution_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get bundle analytics
CREATE OR REPLACE FUNCTION get_bundle_analytics(
    p_bundle_id VARCHAR,
    p_date_from DATE,
    p_date_to DATE
)
RETURNS TABLE(
    total_installations BIGINT,
    active_installations BIGINT,
    total_executions BIGINT,
    successful_executions BIGINT,
    success_rate NUMERIC,
    avg_runtime_ms NUMERIC,
    total_revenue_cents BIGINT,
    avg_rating NUMERIC,
    daily_stats JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM bundle_installations WHERE bundle_id = p_bundle_id) as total_installations,
        (SELECT COUNT(*) FROM bundle_installations WHERE bundle_id = p_bundle_id AND status = 'active') as active_installations,
        COUNT(be.id) as total_executions,
        COUNT(be.id) FILTER (WHERE be.status = 'completed') as successful_executions,
        CASE 
            WHEN COUNT(be.id) > 0 THEN
                ROUND(COUNT(be.id) FILTER (WHERE be.status = 'completed') * 100.0 / COUNT(be.id), 2)
            ELSE 0
        END as success_rate,
        ROUND(AVG(be.total_runtime_ms), 2) as avg_runtime_ms,
        COALESCE(SUM(be.cost_cents), 0) as total_revenue_cents,
        (SELECT avg_rating FROM agent_bundles WHERE id = p_bundle_id) as avg_rating,
        (
            SELECT COALESCE(json_agg(daily_data ORDER BY execution_date), '[]'::json)::jsonb
            FROM (
                SELECT 
                    DATE(be.created_at) as execution_date,
                    COUNT(*) as executions,
                    COUNT(*) FILTER (WHERE be.status = 'completed') as successful,
                    COALESCE(SUM(be.cost_cents), 0) as revenue
                FROM bundle_executions be
                WHERE be.bundle_id = p_bundle_id
                    AND DATE(be.created_at) BETWEEN p_date_from AND p_date_to
                GROUP BY DATE(be.created_at)
                ORDER BY execution_date
            ) daily_data
        ) as daily_stats
    FROM bundle_executions be
    WHERE be.bundle_id = p_bundle_id
        AND DATE(be.created_at) BETWEEN p_date_from AND p_date_to;
END;
$$ LANGUAGE plpgsql;
