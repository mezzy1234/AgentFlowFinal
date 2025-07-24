-- REVENUE TRACKING AND MONETIZATION SCHEMA
-- Schema for tracking revenue, developer payouts, and monetization

-- ================================
-- REVENUE TRANSACTIONS
-- ================================
CREATE TABLE IF NOT EXISTS revenue_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,
  transaction_type TEXT DEFAULT 'execution' CHECK (transaction_type IN ('execution', 'subscription', 'bundle', 'refund')),
  pricing_tier TEXT DEFAULT 'free' CHECK (pricing_tier IN ('free', 'paid', 'subscription')),
  total_amount_cents INTEGER NOT NULL DEFAULT 0,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  developer_revenue_cents INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'credits' CHECK (payment_method IN ('credits', 'stripe', 'paypal', 'crypto')),
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  refunded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- DEVELOPER BALANCES
-- ================================
CREATE TABLE IF NOT EXISTS developer_balances (
  developer_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  available_balance_cents INTEGER DEFAULT 0,
  pending_payout_cents INTEGER DEFAULT 0,
  total_earned_cents INTEGER DEFAULT 0,
  total_withdrawn_cents INTEGER DEFAULT 0,
  minimum_payout_cents INTEGER DEFAULT 1000, -- $10 minimum
  payout_method TEXT DEFAULT 'stripe' CHECK (payout_method IN ('stripe', 'paypal', 'bank_transfer')),
  payout_details JSONB DEFAULT '{}',
  last_payout_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- PAYOUT REQUESTS
-- ================================
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  payout_method TEXT NOT NULL CHECK (payout_method IN ('stripe', 'paypal', 'bank_transfer')),
  payout_details JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  stripe_transfer_id TEXT,
  external_transaction_id TEXT,
  failure_reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ================================
-- USER CREDITS SYSTEM
-- ================================
CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  available_credits INTEGER DEFAULT 0,
  total_purchased_credits INTEGER DEFAULT 0,
  total_spent_credits INTEGER DEFAULT 0,
  last_purchase_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- CREDIT TRANSACTIONS
-- ================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'spend', 'refund', 'bonus')),
  amount_credits INTEGER NOT NULL,
  amount_cents INTEGER DEFAULT 0,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  description TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- SUBSCRIPTION PLANS
-- ================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  credits_included INTEGER DEFAULT 0,
  unlimited_executions BOOLEAN DEFAULT false,
  max_executions_per_month INTEGER,
  priority_support BOOLEAN DEFAULT false,
  custom_branding BOOLEAN DEFAULT false,
  api_access BOOLEAN DEFAULT false,
  stripe_price_id TEXT UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price_cents, credits_included, max_executions_per_month, stripe_price_id) VALUES
('Starter', 'Perfect for individuals getting started', 999, 100, 100, 'price_starter_monthly'),
('Professional', 'For power users and small teams', 2999, 500, 1000, 'price_pro_monthly'),
('Enterprise', 'Unlimited usage for large teams', 9999, 0, NULL, 'price_enterprise_monthly')
ON CONFLICT (stripe_price_id) DO NOTHING;

-- ================================
-- USER SUBSCRIPTIONS
-- ================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'paused')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plan_id)
);

-- ================================
-- AGENT BUNDLES (Monetization Feature)
-- ================================
CREATE TABLE IF NOT EXISTS agent_bundles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  bundle_price_cents INTEGER NOT NULL,
  discount_percentage INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- BUNDLE AGENTS (Junction Table)
-- ================================
CREATE TABLE IF NOT EXISTS bundle_agents (
  bundle_id UUID REFERENCES agent_bundles(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  PRIMARY KEY (bundle_id, agent_id)
);

-- ================================
-- USER BUNDLE PURCHASES
-- ================================
CREATE TABLE IF NOT EXISTS user_bundle_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  bundle_id UUID REFERENCES agent_bundles(id) ON DELETE CASCADE,
  purchase_price_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, bundle_id)
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_agent_id ON revenue_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_user_id ON revenue_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_processed_at ON revenue_transactions(processed_at);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_status ON revenue_transactions(status);

CREATE INDEX IF NOT EXISTS idx_payout_requests_developer_id ON payout_requests(developer_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_requested_at ON payout_requests(requested_at);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- ================================
-- ROW LEVEL SECURITY (RLS)
-- ================================
ALTER TABLE revenue_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bundle_purchases ENABLE ROW LEVEL SECURITY;

-- ================================
-- RLS POLICIES
-- ================================

-- Revenue transactions: Developers can see their agent revenue, users can see their spending
CREATE POLICY "Developers can view their agent revenue" ON revenue_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = revenue_transactions.agent_id 
      AND agents.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view their own transactions" ON revenue_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Developer balances: Only accessible by the developer themselves
CREATE POLICY "Developers can manage their own balance" ON developer_balances
  FOR ALL USING (auth.uid() = developer_id);

-- Payout requests: Only accessible by the developer themselves
CREATE POLICY "Developers can manage their own payout requests" ON payout_requests
  FOR ALL USING (auth.uid() = developer_id);

-- User credits: Only accessible by the user themselves
CREATE POLICY "Users can manage their own credits" ON user_credits
  FOR ALL USING (auth.uid() = user_id);

-- Credit transactions: Only accessible by the user themselves
CREATE POLICY "Users can view their own credit transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create credit transactions" ON credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Subscription plans: Public read
CREATE POLICY "Subscription plans are publicly readable" ON subscription_plans
  FOR SELECT USING (active = true);

-- User subscriptions: Only accessible by the user themselves
CREATE POLICY "Users can manage their own subscriptions" ON user_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Agent bundles: Public read for active bundles, creators can manage their own
CREATE POLICY "Active bundles are publicly viewable" ON agent_bundles
  FOR SELECT USING (active = true);

CREATE POLICY "Users can create bundles" ON agent_bundles
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own bundles" ON agent_bundles
  FOR UPDATE USING (auth.uid() = created_by);

-- Bundle agents: Readable by everyone, manageable by bundle creators
CREATE POLICY "Bundle agents are publicly readable" ON bundle_agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agent_bundles 
      WHERE agent_bundles.id = bundle_agents.bundle_id 
      AND agent_bundles.active = true
    )
  );

CREATE POLICY "Bundle creators can manage bundle agents" ON bundle_agents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agent_bundles 
      WHERE agent_bundles.id = bundle_agents.bundle_id 
      AND agent_bundles.created_by = auth.uid()
    )
  );

-- User bundle purchases: Only accessible by the user themselves
CREATE POLICY "Users can view their own bundle purchases" ON user_bundle_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bundle purchases" ON user_bundle_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ================================
-- FUNCTIONS & TRIGGERS
-- ================================

-- Function to update user credits after transaction
CREATE OR REPLACE FUNCTION update_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'purchase' OR NEW.transaction_type = 'bonus' THEN
    -- Add credits
    UPDATE user_credits SET
      available_credits = available_credits + NEW.amount_credits,
      total_purchased_credits = CASE 
        WHEN NEW.transaction_type = 'purchase' THEN total_purchased_credits + NEW.amount_credits
        ELSE total_purchased_credits
      END,
      last_purchase_at = CASE 
        WHEN NEW.transaction_type = 'purchase' THEN NEW.created_at
        ELSE last_purchase_at
      END,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
  ELSIF NEW.transaction_type = 'spend' THEN
    -- Deduct credits
    UPDATE user_credits SET
      available_credits = available_credits - NEW.amount_credits,
      total_spent_credits = total_spent_credits + NEW.amount_credits,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
  ELSIF NEW.transaction_type = 'refund' THEN
    -- Add credits back
    UPDATE user_credits SET
      available_credits = available_credits + NEW.amount_credits,
      total_spent_credits = total_spent_credits - NEW.amount_credits,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user credits
CREATE TRIGGER trigger_update_user_credits
  AFTER INSERT ON credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_credits();

-- Function to update developer balance after revenue transaction
CREATE OR REPLACE FUNCTION update_developer_balance()
RETURNS TRIGGER AS $$
DECLARE
  developer_user_id UUID;
BEGIN
  -- Get the developer ID from the agent
  SELECT created_by INTO developer_user_id 
  FROM agents 
  WHERE id = NEW.agent_id;
  
  IF developer_user_id IS NOT NULL THEN
    -- Update developer balance
    INSERT INTO developer_balances (developer_id, available_balance_cents, total_earned_cents)
    VALUES (developer_user_id, NEW.developer_revenue_cents, NEW.developer_revenue_cents)
    ON CONFLICT (developer_id) 
    DO UPDATE SET
      available_balance_cents = developer_balances.available_balance_cents + NEW.developer_revenue_cents,
      total_earned_cents = developer_balances.total_earned_cents + NEW.developer_revenue_cents,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update developer balance
CREATE TRIGGER trigger_update_developer_balance
  AFTER INSERT ON revenue_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_developer_balance();

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
