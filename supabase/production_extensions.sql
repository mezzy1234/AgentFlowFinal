-- Production-Ready Database Extensions for AgentFlow.AI
-- Run this after the main schema to add missing production features

-- Agent execution runs tracking
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_agent_id UUID REFERENCES user_agents(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  input_payload JSONB NOT NULL,
  output_payload JSONB,
  status TEXT CHECK (status IN ('pending', 'running', 'success', 'failed', 'timeout')) DEFAULT 'pending',
  error_message TEXT,
  execution_time_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agent failures for detailed error tracking
CREATE TABLE IF NOT EXISTS agent_failures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
  error_code TEXT NOT NULL,
  error_type TEXT CHECK (error_type IN ('timeout', 'http_error', 'auth_error', 'validation_error', 'network_error', 'rate_limit')) NOT NULL,
  error_details JSONB,
  stack_trace TEXT,
  retry_after INTEGER, -- seconds to wait before retry
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Integration configurations (standardized JSON configs)
CREATE TABLE IF NOT EXISTS integration_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  config JSONB NOT NULL, -- Standardized config format
  version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(integration_id, version)
);

-- Notifications system
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('agent_activated', 'agent_failed', 'subscription_expiring', 'review_received', 'billing_error', 'agent_success', 'system_alert')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data for the notification
  read BOOLEAN DEFAULT FALSE,
  channels TEXT[] DEFAULT ARRAY['in_app'], -- 'in_app', 'email', 'sms'
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  in_app BOOLEAN DEFAULT TRUE,
  email BOOLEAN DEFAULT TRUE,
  sms BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, type)
);

-- Agent heartbeat tracking
CREATE TABLE IF NOT EXISTS agent_heartbeats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_agent_id UUID REFERENCES user_agents(id) ON DELETE CASCADE,
  last_ping TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT CHECK (status IN ('healthy', 'warning', 'critical', 'offline')) DEFAULT 'healthy',
  response_time_ms INTEGER,
  error_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 100.00, -- percentage
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Credential refresh tokens (for OAuth)
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_credential_id UUID REFERENCES user_credentials(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  token_type TEXT DEFAULT 'Bearer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agent purchase receipts
CREATE TABLE IF NOT EXISTS purchase_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_agent_id UUID REFERENCES user_agents(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  receipt_url TEXT,
  invoice_pdf TEXT,
  refunded BOOLEAN DEFAULT FALSE,
  refund_amount_cents INTEGER,
  refund_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  refunded_at TIMESTAMP WITH TIME ZONE
);

-- Admin actions log
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'agent', 'user', 'review', etc.
  target_id UUID NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Platform analytics (aggregated daily)
CREATE TABLE IF NOT EXISTS platform_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  daily_active_users INTEGER DEFAULT 0,
  agent_activations INTEGER DEFAULT 0,
  agent_runs INTEGER DEFAULT 0,
  agent_failures INTEGER DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  new_agents INTEGER DEFAULT 0,
  churn_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User sessions for security tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_runs_user_agent_id ON agent_runs(user_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON agent_runs(created_at);

CREATE INDEX IF NOT EXISTS idx_agent_failures_agent_run_id ON agent_failures(agent_run_id);
CREATE INDEX IF NOT EXISTS idx_agent_failures_error_type ON agent_failures(error_type);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_user_agent_id ON agent_heartbeats(user_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_status ON agent_heartbeats(status);
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_last_ping ON agent_heartbeats(last_ping);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_credential_id ON oauth_tokens(user_credential_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_purchase_receipts_user_agent_id ON purchase_receipts(user_agent_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_stripe_payment_intent_id ON purchase_receipts(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_user_id ON admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_type ON admin_actions(target_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Enable RLS on new tables
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own agent runs
CREATE POLICY "Users can view own agent runs" ON agent_runs
  FOR SELECT USING (
    user_agent_id IN (
      SELECT id FROM user_agents WHERE user_id = auth.uid()
    )
  );

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Users can only see their own heartbeat data
CREATE POLICY "Users can view own agent heartbeats" ON agent_heartbeats
  FOR SELECT USING (
    user_agent_id IN (
      SELECT id FROM user_agents WHERE user_id = auth.uid()
    )
  );

-- Users can only see their own OAuth tokens
CREATE POLICY "Users can view own oauth tokens" ON oauth_tokens
  FOR SELECT USING (
    user_credential_id IN (
      SELECT id FROM user_credentials WHERE user_id = auth.uid()
    )
  );

-- Users can only see their own purchase receipts
CREATE POLICY "Users can view own purchase receipts" ON purchase_receipts
  FOR SELECT USING (
    user_agent_id IN (
      SELECT id FROM user_agents WHERE user_id = auth.uid()
    )
  );

-- Admin policies
CREATE POLICY "Admins can view all admin actions" ON admin_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert admin actions" ON admin_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view platform analytics" ON platform_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_agent_heartbeat()
RETURNS TRIGGER AS $$
BEGIN
  -- Update heartbeat when agent runs
  INSERT INTO agent_heartbeats (user_agent_id, last_ping, response_time_ms)
  VALUES (NEW.user_agent_id, NEW.started_at, NEW.execution_time_ms)
  ON CONFLICT (user_agent_id) 
  DO UPDATE SET 
    last_ping = NEW.started_at,
    response_time_ms = NEW.execution_time_ms,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agent_heartbeat
  AFTER INSERT ON agent_runs
  FOR EACH ROW EXECUTE FUNCTION update_agent_heartbeat();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL,
  p_channels TEXT[] DEFAULT ARRAY['in_app']
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data, channels)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_channels)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;
