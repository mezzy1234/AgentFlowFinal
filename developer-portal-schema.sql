-- Chunk 5: Developer Portal Enhancements Database Schema
-- Advanced developer tools, SDK generation, API versioning, documentation

-- API Versions Management
CREATE TABLE IF NOT EXISTS api_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'sunset')),
    release_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deprecation_date TIMESTAMP WITH TIME ZONE,
    sunset_date TIMESTAMP WITH TIME ZONE,
    breaking_changes BOOLEAN DEFAULT false,
    changelog JSONB DEFAULT '{}',
    migration_guide TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SDK Configurations
CREATE TABLE IF NOT EXISTS sdk_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    package_name VARCHAR(100),
    version VARCHAR(20),
    target_platform VARCHAR(50),
    config_options JSONB DEFAULT '{}',
    generation_status VARCHAR(20) DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
    download_url TEXT,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Code Snippets Library
CREATE TABLE IF NOT EXISTS code_snippets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    language VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    code_content TEXT NOT NULL,
    api_endpoint VARCHAR(200),
    api_version VARCHAR(20) REFERENCES api_versions(version),
    use_cases TEXT[],
    tags TEXT[],
    author_id UUID REFERENCES auth.users(id),
    is_official BOOLEAN DEFAULT false,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interactive Documentation
CREATE TABLE IF NOT EXISTS api_documentation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_path VARCHAR(500) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    api_version VARCHAR(20) REFERENCES api_versions(version),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    request_schema JSONB,
    response_schema JSONB,
    examples JSONB DEFAULT '[]',
    rate_limits JSONB,
    authentication_required BOOLEAN DEFAULT true,
    scopes_required TEXT[],
    is_deprecated BOOLEAN DEFAULT false,
    deprecation_notice TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Explorer Sessions
CREATE TABLE IF NOT EXISTS api_explorer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_name VARCHAR(200),
    saved_requests JSONB DEFAULT '[]',
    environment_variables JSONB DEFAULT '{}',
    collection_id UUID,
    is_shared BOOLEAN DEFAULT false,
    share_token VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Testing
CREATE TABLE IF NOT EXISTS webhook_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    test_name VARCHAR(200) NOT NULL,
    webhook_url TEXT NOT NULL,
    payload_template JSONB,
    headers JSONB DEFAULT '{}',
    test_status VARCHAR(20) DEFAULT 'pending' CHECK (test_status IN ('pending', 'sent', 'delivered', 'failed', 'timeout')),
    response_status INTEGER,
    response_body TEXT,
    response_time INTEGER,
    error_message TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SDK Analytics
CREATE TABLE IF NOT EXISTS sdk_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sdk_config_id UUID REFERENCES sdk_configurations(id) ON DELETE CASCADE,
    language VARCHAR(50),
    version VARCHAR(20),
    downloads_today INTEGER DEFAULT 0,
    downloads_week INTEGER DEFAULT 0,
    downloads_month INTEGER DEFAULT 0,
    downloads_total INTEGER DEFAULT 0,
    error_reports INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.00,
    last_download TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Developer Feedback
CREATE TABLE IF NOT EXISTS developer_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('bug_report', 'feature_request', 'documentation', 'sdk_issue', 'api_issue')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    affected_endpoint VARCHAR(200),
    sdk_language VARCHAR(50),
    error_details JSONB,
    reproduction_steps TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    environment_info JSONB,
    attachments TEXT[],
    upvotes INTEGER DEFAULT 0,
    admin_response TEXT,
    resolved_in_version VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Usage Examples
CREATE TABLE IF NOT EXISTS api_usage_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty_level VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    use_case TEXT,
    full_example JSONB NOT NULL,
    languages_supported TEXT[],
    api_endpoints TEXT[],
    estimated_time INTEGER, -- in minutes
    prerequisites TEXT[],
    learning_objectives TEXT[],
    is_featured BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Developer Portal Analytics
CREATE TABLE IF NOT EXISTS developer_portal_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    unique_visitors INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    documentation_views INTEGER DEFAULT 0,
    api_explorer_sessions INTEGER DEFAULT 0,
    sdk_downloads INTEGER DEFAULT 0,
    code_snippet_views INTEGER DEFAULT 0,
    feedback_submissions INTEGER DEFAULT 0,
    avg_session_duration INTEGER, -- in seconds
    bounce_rate DECIMAL(5,2) DEFAULT 0.00,
    top_endpoints TEXT[],
    top_sdk_languages TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(date)
);

-- Tutorials and Guides
CREATE TABLE IF NOT EXISTS developer_tutorials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    content TEXT NOT NULL, -- Markdown content
    category VARCHAR(100),
    difficulty_level VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    estimated_reading_time INTEGER, -- in minutes
    prerequisites TEXT[],
    tags TEXT[],
    code_examples JSONB DEFAULT '[]',
    related_tutorials UUID[],
    is_published BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    rating DECIMAL(3,2) DEFAULT 0.00,
    author_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_versions_status ON api_versions(status);
CREATE INDEX IF NOT EXISTS idx_sdk_configurations_user_language ON sdk_configurations(user_id, language);
CREATE INDEX IF NOT EXISTS idx_code_snippets_language_category ON code_snippets(language, category);
CREATE INDEX IF NOT EXISTS idx_api_documentation_endpoint_version ON api_documentation(endpoint_path, api_version);
CREATE INDEX IF NOT EXISTS idx_webhook_tests_user_status ON webhook_tests(user_id, test_status);
CREATE INDEX IF NOT EXISTS idx_developer_feedback_type_status ON developer_feedback(feedback_type, status);
CREATE INDEX IF NOT EXISTS idx_api_usage_examples_category_difficulty ON api_usage_examples(category, difficulty_level);
CREATE INDEX IF NOT EXISTS idx_developer_tutorials_published_category ON developer_tutorials(is_published, category);

-- Insert sample API versions
INSERT INTO api_versions (version, status, breaking_changes, changelog) VALUES
('v1', 'deprecated', false, '{"summary": "Initial API release", "changes": ["Basic CRUD operations", "Simple authentication"]}'),
('v2', 'active', true, '{"summary": "Major update with breaking changes", "changes": ["Enhanced authentication", "New webhook system", "Improved error handling"]}'),
('v3', 'active', false, '{"summary": "Latest version with new features", "changes": ["Agent execution engine", "Enterprise features", "Advanced analytics"]}')
ON CONFLICT (version) DO NOTHING;

-- Insert sample code snippets
INSERT INTO code_snippets (title, description, language, category, code_content, api_endpoint, api_version, use_cases, tags, is_official) VALUES
('Create Agent - JavaScript', 'Create a new AI agent using the JavaScript SDK', 'javascript', 'agents', 
'const agentflow = require("@agentflow/sdk");\n\nconst agent = await agentflow.agents.create({\n  name: "My Assistant",\n  type: "conversational",\n  settings: {\n    model: "gpt-4",\n    temperature: 0.7\n  }\n});', 
'/api/agents', 'v3', 
ARRAY['agent creation', 'quick start'], 
ARRAY['javascript', 'sdk', 'agents'], true),

('Execute Agent - Python', 'Execute an agent with custom parameters', 'python', 'execution', 
'import agentflow\n\nclient = agentflow.Client(api_key="your_key")\n\nresult = client.agents.execute(\n    agent_id="agent_123",\n    input_data={"message": "Hello world"},\n    parameters={"timeout": 30}\n)', 
'/api/agents/execute', 'v3', 
ARRAY['agent execution', 'automation'], 
ARRAY['python', 'sdk', 'execution'], true)
ON CONFLICT DO NOTHING;

-- Insert sample documentation
INSERT INTO api_documentation (endpoint_path, http_method, api_version, title, description, request_schema, response_schema, authentication_required) VALUES
('/api/agents', 'POST', 'v3', 'Create Agent', 'Create a new AI agent with specified configuration', 
'{"type": "object", "properties": {"name": {"type": "string"}, "type": {"type": "string"}, "settings": {"type": "object"}}}',
'{"type": "object", "properties": {"id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}}}', 
true),
('/api/agents/{id}/execute', 'POST', 'v3', 'Execute Agent', 'Execute an agent with input data and parameters',
'{"type": "object", "properties": {"input_data": {"type": "object"}, "parameters": {"type": "object"}}}',
'{"type": "object", "properties": {"execution_id": {"type": "string"}, "status": {"type": "string"}, "result": {"type": "object"}}}',
true)
ON CONFLICT DO NOTHING;
