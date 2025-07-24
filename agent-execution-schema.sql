-- AGENT EXECUTION ENGINE SCHEMA
-- Complete database schema for agent execution, runs, and webhooks

-- ================================
-- AGENTS TABLE (Core Agent Registry)
-- ================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  webhook_url TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pricing_tier TEXT DEFAULT 'free' CHECK (pricing_tier IN ('free', 'paid', 'subscription')),
  price_cents INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive', 'suspended')),
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  setup_instructions TEXT,
  accepts_files BOOLEAN DEFAULT false,
  requires_custom_inputs BOOLEAN DEFAULT false,
  total_runs INTEGER DEFAULT 0,
  success_rate FLOAT DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- AGENT CREDENTIALS (Required Integrations)
-- ================================
CREATE TABLE IF NOT EXISTS agent_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'gmail', 'openai', 'slack', etc.
  credential_type TEXT NOT NULL CHECK (credential_type IN ('oauth', 'api_key', 'basic_auth')),
  required BOOLEAN DEFAULT true,
  inject_method TEXT DEFAULT 'headers' CHECK (inject_method IN ('headers', 'body', 'query')),
  field_name TEXT DEFAULT 'Authorization',
  format_template TEXT DEFAULT 'Bearer {{token}}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- AGENT FIELDS (Custom Input Fields)
-- ================================
CREATE TABLE IF NOT EXISTS agent_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'email', 'url', 'textarea', 'select', 'file')),
  field_options JSONB, -- For select fields: {"options": ["Option 1", "Option 2"]}
  required BOOLEAN DEFAULT false,
  placeholder TEXT,
  help_text TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- USER AGENTS (Installed Agents)
-- ================================
CREATE TABLE IF NOT EXISTS user_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'installed' CHECK (status IN ('installed', 'active', 'paused', 'uninstalled')),
  custom_settings JSONB DEFAULT '{}',
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_run_at TIMESTAMP WITH TIME ZONE,
  total_runs INTEGER DEFAULT 0,
  UNIQUE(user_id, agent_id)
);

-- ================================
-- AGENT EXECUTIONS (Run History)
-- ================================
CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  execution_type TEXT DEFAULT 'manual' CHECK (execution_type IN ('manual', 'scheduled', 'webhook', 'test')),
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed', 'timeout')),
  input_payload JSONB,
  output_data JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  webhook_response_code INTEGER,
  webhook_response_headers JSONB,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ================================
-- WEBHOOK TEMPLATES (Credential Injection)
-- ================================
CREATE TABLE IF NOT EXISTS webhook_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT UNIQUE NOT NULL,
  inject_method TEXT NOT NULL CHECK (inject_method IN ('headers', 'body', 'query')),
  field_name TEXT NOT NULL,
  format_template TEXT NOT NULL,
  example_usage TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default webhook templates
INSERT INTO webhook_templates (provider, inject_method, field_name, format_template, example_usage) VALUES
('openai', 'headers', 'Authorization', 'Bearer {{token}}', 'OpenAI API key injection'),
('gmail', 'headers', 'Authorization', 'Bearer {{token}}', 'Gmail OAuth token'),
('slack', 'headers', 'Authorization', 'Bearer {{token}}', 'Slack OAuth token'),
('stripe', 'headers', 'Authorization', 'Bearer {{token}}', 'Stripe API key'),
('hubspot', 'headers', 'Authorization', 'Bearer {{token}}', 'HubSpot OAuth token'),
('shopify', 'headers', 'X-Shopify-Access-Token', '{{token}}', 'Shopify private app token'),
('airtable', 'headers', 'Authorization', 'Bearer {{token}}', 'Airtable personal access token'),
('notion', 'headers', 'Authorization', 'Bearer {{token}}', 'Notion integration token'),
('google_sheets', 'headers', 'Authorization', 'Bearer {{token}}', 'Google Sheets OAuth token'),
('discord', 'headers', 'Authorization', 'Bot {{token}}', 'Discord bot token'),
('twitter', 'headers', 'Authorization', 'Bearer {{token}}', 'Twitter API v2 bearer token'),
('facebook', 'headers', 'Authorization', 'Bearer {{token}}', 'Facebook Graph API token'),
('linkedin', 'headers', 'Authorization', 'Bearer {{token}}', 'LinkedIn OAuth token'),
('zoom', 'headers', 'Authorization', 'Bearer {{token}}', 'Zoom OAuth token'),
('microsoft', 'headers', 'Authorization', 'Bearer {{token}}', 'Microsoft Graph API token'),
('salesforce', 'headers', 'Authorization', 'Bearer {{token}}', 'Salesforce OAuth token'),
('mailchimp', 'headers', 'Authorization', 'Bearer {{token}}', 'Mailchimp OAuth token'),
('sendgrid', 'headers', 'Authorization', 'Bearer {{token}}', 'SendGrid API key'),
('twilio', 'headers', 'Authorization', 'Basic {{token}}', 'Twilio API credentials (base64 encoded)'),
('github', 'headers', 'Authorization', 'Bearer {{token}}', 'GitHub personal access token')
ON CONFLICT (provider) DO NOTHING;

-- ================================
-- AGENT ANALYTICS (Performance Tracking)
-- ================================
CREATE TABLE IF NOT EXISTS agent_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  failed_runs INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  avg_duration_ms FLOAT DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, date)
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_created_by ON agents(created_by);
CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category);
CREATE INDEX IF NOT EXISTS idx_user_agents_user_id ON user_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_agent_id ON user_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_user_id ON agent_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_executed_at ON agent_executions(executed_at);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_agent_id ON agent_analytics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_date ON agent_analytics(date);

-- ================================
-- ROW LEVEL SECURITY (RLS)
-- ================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_analytics ENABLE ROW LEVEL SECURITY;

-- ================================
-- RLS POLICIES
-- ================================

-- Agents: Public read for active agents, creators can manage their own
CREATE POLICY "Public agents are viewable by everyone" ON agents
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create agents" ON agents
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own agents" ON agents
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own agents" ON agents
  FOR DELETE USING (auth.uid() = created_by);

-- Agent credentials: Only visible to agent creators
CREATE POLICY "Agent creators can manage credentials" ON agent_credentials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_credentials.agent_id 
      AND agents.created_by = auth.uid()
    )
  );

-- Agent fields: Only visible to agent creators
CREATE POLICY "Agent creators can manage fields" ON agent_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_fields.agent_id 
      AND agents.created_by = auth.uid()
    )
  );

-- User agents: Users can only see their own installed agents
CREATE POLICY "Users can manage their own agent installations" ON user_agents
  FOR ALL USING (auth.uid() = user_id);

-- Agent executions: Users can only see their own executions
CREATE POLICY "Users can view their own agent executions" ON agent_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create agent executions" ON agent_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Webhook templates: Public read
CREATE POLICY "Webhook templates are publicly readable" ON webhook_templates
  FOR SELECT USING (true);

-- Agent analytics: Creators can see their agent analytics
CREATE POLICY "Agent creators can view analytics" ON agent_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_analytics.agent_id 
      AND agents.created_by = auth.uid()
    )
  );

-- ================================
-- FUNCTIONS & TRIGGERS
-- ================================

-- Function to update agent success rate
CREATE OR REPLACE FUNCTION update_agent_success_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the agent's total runs and success rate
  UPDATE agents SET
    total_runs = (
      SELECT COUNT(*) 
      FROM agent_executions 
      WHERE agent_id = NEW.agent_id 
      AND status IN ('success', 'failed')
    ),
    success_rate = (
      SELECT COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'success')::FLOAT / 
           NULLIF(COUNT(*) FILTER (WHERE status IN ('success', 'failed')), 0)
          ) * 100, 2
        ), 0
      )
      FROM agent_executions 
      WHERE agent_id = NEW.agent_id
    ),
    updated_at = NOW()
  WHERE id = NEW.agent_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update agent stats when execution completes
CREATE TRIGGER trigger_update_agent_success_rate
  AFTER INSERT OR UPDATE OF status ON agent_executions
  FOR EACH ROW
  WHEN (NEW.status IN ('success', 'failed'))
  EXECUTE FUNCTION update_agent_success_rate();

-- Function to update user agent stats
CREATE OR REPLACE FUNCTION update_user_agent_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user agent last run and total runs
  UPDATE user_agents SET
    last_run_at = NEW.executed_at,
    total_runs = (
      SELECT COUNT(*) 
      FROM agent_executions 
      WHERE user_id = NEW.user_id 
      AND agent_id = NEW.agent_id
    )
  WHERE user_id = NEW.user_id 
  AND agent_id = NEW.agent_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user agent stats
CREATE TRIGGER trigger_update_user_agent_stats
  AFTER INSERT ON agent_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_agent_stats();

-- Function to create daily analytics
CREATE OR REPLACE FUNCTION create_daily_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agent_analytics (
    agent_id, 
    date, 
    total_runs, 
    successful_runs, 
    failed_runs,
    unique_users,
    avg_duration_ms
  )
  SELECT 
    NEW.agent_id,
    DATE(NEW.executed_at),
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'success'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COUNT(DISTINCT user_id),
    AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL)
  FROM agent_executions
  WHERE agent_id = NEW.agent_id 
  AND DATE(executed_at) = DATE(NEW.executed_at)
  GROUP BY agent_id, DATE(executed_at)
  ON CONFLICT (agent_id, date) 
  DO UPDATE SET
    total_runs = EXCLUDED.total_runs,
    successful_runs = EXCLUDED.successful_runs,
    failed_runs = EXCLUDED.failed_runs,
    unique_users = EXCLUDED.unique_users,
    avg_duration_ms = EXCLUDED.avg_duration_ms;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create daily analytics
CREATE TRIGGER trigger_create_daily_analytics
  AFTER INSERT OR UPDATE OF status ON agent_executions
  FOR EACH ROW
  WHEN (NEW.status IN ('success', 'failed'))
  EXECUTE FUNCTION create_daily_analytics();

-- ================================
-- SEED DATA (Sample Agents)
-- ================================

-- Insert sample webhook templates and agents for testing
-- (This would be populated by actual agent uploads)

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
