-- AgentFlow.AI Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('customer', 'developer', 'admin')) DEFAULT 'customer',
  plan TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  subscription_id TEXT,
  active_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Integrations table (stores all available integrations)
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  type TEXT NOT NULL, -- 'trigger', 'action', 'both'
  auth_method TEXT NOT NULL, -- 'oauth', 'api_key', 'webhook', 'none'
  logo_url TEXT,
  description TEXT,
  hidden BOOLEAN DEFAULT FALSE,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agents table (marketplace agents)
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_one_time DECIMAL(10,2),
  price_monthly DECIMAL(10,2),
  webhook_url TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  category TEXT NOT NULL,
  use_case TEXT NOT NULL,
  warnings TEXT,
  cover_image TEXT,
  published BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  developer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bundle_eligible BOOLEAN DEFAULT FALSE,
  version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agent required integrations (many-to-many)
CREATE TABLE IF NOT EXISTS agent_required_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  required BOOLEAN DEFAULT TRUE,
  field_name TEXT, -- The field name in the agent's webhook payload
  field_type TEXT DEFAULT 'api_key', -- 'api_key', 'oauth_token', 'webhook_url', etc.
  instructions TEXT, -- Instructions for users on how to get this credential
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(agent_id, integration_id)
);

-- User purchased agents
CREATE TABLE IF NOT EXISTS user_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  subscription_id TEXT,
  stripe_payment_id TEXT,
  active BOOLEAN DEFAULT TRUE,
  status TEXT CHECK (status IN ('pending', 'ready', 'running', 'error')) DEFAULT 'pending',
  nickname TEXT, -- User can rename their agent instance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, agent_id)
);

-- User credentials (encrypted storage)
CREATE TABLE IF NOT EXISTS user_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  value TEXT NOT NULL, -- This should be encrypted in production
  oauth_refresh_token TEXT, -- For OAuth integrations
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, integration_id, key_name)
);

-- Agent reviews and ratings
CREATE TABLE IF NOT EXISTS agent_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, agent_id)
);

-- Agent execution logs
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_agent_id UUID REFERENCES user_agents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'run', 'success', 'error', 'timeout'
  message TEXT,
  payload JSONB, -- Store webhook request/response data
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agent bundles
CREATE TABLE IF NOT EXISTS agent_bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_one_time DECIMAL(10,2),
  price_monthly DECIMAL(10,2),
  cover_image TEXT,
  featured BOOLEAN DEFAULT FALSE,
  developer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bundle agents (many-to-many)
CREATE TABLE IF NOT EXISTS bundle_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_id UUID REFERENCES agent_bundles(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(bundle_id, agent_id)
);

-- User feedback
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'bug', 'feature', 'general'
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Developer analytics (aggregated data)
CREATE TABLE IF NOT EXISTS developer_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  developer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  agent_views INTEGER DEFAULT 0,
  agent_purchases INTEGER DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(developer_id, date)
);

-- Stripe webhook events (for idempotency)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY, -- Stripe event ID
  type TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_developer_id ON agents(developer_id);
CREATE INDEX IF NOT EXISTS idx_agents_published ON agents(published);
CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category);
CREATE INDEX IF NOT EXISTS idx_agents_tags ON agents USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_user_agents_user_id ON user_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_agent_id ON user_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_status ON user_agents(status);

CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credentials_integration_id ON user_credentials(integration_id);

CREATE INDEX IF NOT EXISTS idx_agent_logs_user_agent_id ON agent_logs(user_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_logs_event_type ON agent_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_agent_reviews_agent_id ON agent_reviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_reviews_rating ON agent_reviews(rating);

-- Create Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Agents are publicly readable when published
CREATE POLICY "Published agents are publicly readable" ON agents
  FOR SELECT USING (published = TRUE);

CREATE POLICY "Developers can manage own agents" ON agents
  FOR ALL USING (auth.uid() = developer_id);

-- User agents are private to each user
CREATE POLICY "Users can view own agents" ON user_agents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own agents" ON user_agents
  FOR UPDATE USING (auth.uid() = user_id);

-- User credentials are private
CREATE POLICY "Users can manage own credentials" ON user_credentials
  FOR ALL USING (auth.uid() = user_id);

-- Reviews are publicly readable
CREATE POLICY "Reviews are publicly readable" ON agent_reviews
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage own reviews" ON agent_reviews
  FOR ALL USING (auth.uid() = user_id);

-- Agent logs are private to the user
CREATE POLICY "Users can view own agent logs" ON agent_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_agents ua 
      WHERE ua.id = agent_logs.user_agent_id 
      AND ua.user_id = auth.uid()
    )
  );

-- User feedback is private
CREATE POLICY "Users can manage own feedback" ON user_feedback
  FOR ALL USING (auth.uid() = user_id);

-- Developer analytics are private to developers
CREATE POLICY "Developers can view own analytics" ON developer_analytics
  FOR SELECT USING (auth.uid() = developer_id);

-- Functions for common operations
CREATE OR REPLACE FUNCTION get_agent_rating(agent_uuid UUID)
RETURNS TABLE(avg_rating DECIMAL, review_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rating)::DECIMAL, 1) as avg_rating,
    COUNT(*) as review_count
  FROM agent_reviews 
  WHERE agent_id = agent_uuid;
END;
$$ LANGUAGE plpgsql;
