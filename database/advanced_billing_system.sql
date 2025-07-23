-- Advanced Billing Management Schema
-- Comprehensive subscription, usage tracking, and billing system

-- Subscription plans table
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    features JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}', -- agent_count, api_calls, storage_gb, etc.
    is_active BOOLEAN DEFAULT true,
    trial_days INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, cancelled, expired, paused
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_end TIMESTAMPTZ,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, status) WHERE status = 'active'
);

-- Usage tracking
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    resource_type VARCHAR(50) NOT NULL, -- api_calls, storage, agents, executions
    resource_id VARCHAR(255), -- specific agent/integration ID if applicable
    quantity DECIMAL(12,4) NOT NULL DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'count', -- count, bytes, minutes, etc.
    cost DECIMAL(10,6), -- cost per unit
    metadata JSONB DEFAULT '{}',
    tracked_at TIMESTAMPTZ DEFAULT NOW(),
    billing_period DATE -- YYYY-MM-DD format for aggregation
);

-- Create index for efficient usage queries
CREATE INDEX idx_usage_tracking_user_period ON usage_tracking(user_id, billing_period);
CREATE INDEX idx_usage_tracking_resource ON usage_tracking(resource_type, tracked_at);

-- Billing invoices
CREATE TABLE billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, void
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    stripe_invoice_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    payment_method JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice line items
CREATE TABLE billing_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES billing_invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(12,4) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,6) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    resource_type VARCHAR(50), -- subscription, usage, one_time
    resource_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment methods
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(30) NOT NULL, -- card, bank_account, paypal
    brand VARCHAR(30), -- visa, mastercard, etc.
    last_four VARCHAR(4),
    exp_month INTEGER,
    exp_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    billing_address JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing settings
CREATE TABLE billing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    billing_email VARCHAR(255),
    company_name VARCHAR(255),
    tax_id VARCHAR(100),
    billing_address JSONB DEFAULT '{}',
    currency VARCHAR(3) DEFAULT 'USD',
    invoice_frequency VARCHAR(20) DEFAULT 'monthly', -- monthly, quarterly, yearly
    auto_pay BOOLEAN DEFAULT true,
    usage_alerts JSONB DEFAULT '{}', -- thresholds for usage alerts
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Credits and wallet system
CREATE TABLE user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(12,4) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, currency)
);

-- Credit transactions
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credit_id UUID NOT NULL REFERENCES user_credits(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL, -- purchase, usage, refund, bonus, expire
    amount DECIMAL(12,4) NOT NULL, -- positive for credits, negative for usage
    balance_after DECIMAL(12,4) NOT NULL,
    description TEXT,
    reference_type VARCHAR(50), -- invoice, agent_execution, refund, etc.
    reference_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discounts and coupons
CREATE TABLE discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL, -- percentage, fixed_amount, free_trial
    value DECIMAL(10,4) NOT NULL, -- percentage (0-100) or fixed amount
    currency VARCHAR(3) DEFAULT 'USD',
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    user_limit INTEGER DEFAULT 1, -- uses per user
    minimum_amount DECIMAL(10,2), -- minimum purchase amount
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    applicable_plans UUID[], -- specific plan IDs, null for all
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discount redemptions
CREATE TABLE discount_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    discount_code_id UUID NOT NULL REFERENCES discount_codes(id),
    subscription_id UUID REFERENCES user_subscriptions(id),
    invoice_id UUID REFERENCES billing_invoices(id),
    discount_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, discount_code_id) -- One use per user per code by default
);

-- Tax rates and configuration
CREATE TABLE tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    country VARCHAR(2) NOT NULL, -- ISO country code
    state VARCHAR(10), -- state/province code
    tax_type VARCHAR(30) NOT NULL, -- vat, gst, sales_tax
    rate DECIMAL(8,6) NOT NULL, -- tax rate as decimal (e.g., 0.20 for 20%)
    is_active BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing history and audit log
CREATE TABLE billing_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(50) NOT NULL, -- subscription_created, payment_failed, etc.
    resource_type VARCHAR(30), -- subscription, invoice, payment_method
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Usage aggregation materialized view for performance
CREATE MATERIALIZED VIEW usage_summary AS
SELECT 
    user_id,
    billing_period,
    resource_type,
    SUM(quantity) as total_quantity,
    SUM(quantity * COALESCE(cost, 0)) as total_cost,
    COUNT(*) as event_count,
    MAX(tracked_at) as last_tracked
FROM usage_tracking
GROUP BY user_id, billing_period, resource_type;

-- Refresh usage summary index
CREATE INDEX idx_usage_summary_user_period ON usage_summary(user_id, billing_period);

-- Functions and triggers

-- Function to update usage summary
CREATE OR REPLACE FUNCTION refresh_usage_summary()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY usage_summary;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh usage summary after usage tracking changes
CREATE TRIGGER trigger_refresh_usage_summary
    AFTER INSERT OR UPDATE OR DELETE ON usage_tracking
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_usage_summary();

-- Function to track usage
CREATE OR REPLACE FUNCTION track_usage(
    p_user_id UUID,
    p_resource_type VARCHAR(50),
    p_quantity DECIMAL DEFAULT 1,
    p_resource_id VARCHAR DEFAULT NULL,
    p_cost DECIMAL DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_subscription_id UUID;
    v_usage_id UUID;
    v_billing_period DATE;
BEGIN
    -- Get current active subscription
    SELECT id INTO v_subscription_id
    FROM user_subscriptions 
    WHERE user_id = p_user_id 
    AND status = 'active' 
    AND current_period_start <= NOW() 
    AND current_period_end > NOW()
    LIMIT 1;
    
    -- Calculate billing period (first day of current month)
    v_billing_period := DATE_TRUNC('month', NOW())::DATE;
    
    -- Insert usage record
    INSERT INTO usage_tracking (
        user_id, 
        subscription_id, 
        resource_type, 
        resource_id,
        quantity, 
        cost,
        metadata,
        billing_period
    ) VALUES (
        p_user_id, 
        v_subscription_id, 
        p_resource_type, 
        p_resource_id,
        p_quantity, 
        p_cost,
        p_metadata,
        v_billing_period
    ) RETURNING id INTO v_usage_id;
    
    RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate subscription usage and costs
CREATE OR REPLACE FUNCTION calculate_usage_charges(
    p_user_id UUID,
    p_period_start DATE,
    p_period_end DATE
) RETURNS TABLE (
    resource_type VARCHAR,
    total_quantity DECIMAL,
    unit_cost DECIMAL,
    total_cost DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ut.resource_type,
        SUM(ut.quantity) as total_quantity,
        COALESCE(AVG(ut.cost), 0) as unit_cost,
        SUM(ut.quantity * COALESCE(ut.cost, 0)) as total_cost
    FROM usage_tracking ut
    WHERE ut.user_id = p_user_id
    AND ut.billing_period >= p_period_start
    AND ut.billing_period <= p_period_end
    GROUP BY ut.resource_type
    HAVING SUM(ut.quantity) > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limits(
    p_user_id UUID,
    p_resource_type VARCHAR(50)
) RETURNS TABLE (
    limit_value DECIMAL,
    current_usage DECIMAL,
    percentage_used DECIMAL,
    limit_exceeded BOOLEAN
) AS $$
DECLARE
    v_subscription_id UUID;
    v_plan_limits JSONB;
    v_limit_value DECIMAL;
    v_current_usage DECIMAL;
    v_billing_period DATE;
BEGIN
    -- Get current billing period
    v_billing_period := DATE_TRUNC('month', NOW())::DATE;
    
    -- Get current subscription and plan limits
    SELECT us.id, sp.limits INTO v_subscription_id, v_plan_limits
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id 
    AND us.status = 'active'
    AND us.current_period_start <= NOW() 
    AND us.current_period_end > NOW()
    LIMIT 1;
    
    -- Get limit for resource type
    v_limit_value := (v_plan_limits->p_resource_type)::DECIMAL;
    
    -- Get current usage
    SELECT COALESCE(SUM(quantity), 0) INTO v_current_usage
    FROM usage_tracking
    WHERE user_id = p_user_id
    AND resource_type = p_resource_type
    AND billing_period = v_billing_period;
    
    RETURN QUERY SELECT
        COALESCE(v_limit_value, -1) as limit_value,
        v_current_usage as current_usage,
        CASE 
            WHEN v_limit_value > 0 THEN (v_current_usage / v_limit_value * 100)
            ELSE 0 
        END as percentage_used,
        CASE 
            WHEN v_limit_value > 0 THEN v_current_usage >= v_limit_value
            ELSE false 
        END as limit_exceeded;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies

-- Subscription plans are public for browsing
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subscription plans are viewable by everyone" ON subscription_plans FOR SELECT USING (is_active = true);

-- User subscriptions are private
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions FOR ALL USING (auth.uid() = user_id);

-- Usage tracking is private
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own usage" ON usage_tracking FOR ALL USING (auth.uid() = user_id);

-- Billing invoices are private
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own invoices" ON billing_invoices FOR ALL USING (auth.uid() = user_id);

-- Invoice items follow invoice permissions
ALTER TABLE billing_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own invoice items" ON billing_invoice_items FOR ALL USING (
    EXISTS (SELECT 1 FROM billing_invoices WHERE id = invoice_id AND user_id = auth.uid())
);

-- Payment methods are private
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own payment methods" ON payment_methods FOR ALL USING (auth.uid() = user_id);

-- Billing settings are private
ALTER TABLE billing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own billing settings" ON billing_settings FOR ALL USING (auth.uid() = user_id);

-- Credits are private
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own credits" ON user_credits FOR ALL USING (auth.uid() = user_id);

-- Credit transactions are private
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own credit transactions" ON credit_transactions FOR ALL USING (auth.uid() = user_id);

-- Discount codes are viewable for validation, but not for browsing
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Discount codes are viewable for validation" ON discount_codes FOR SELECT USING (is_active = true);

-- Discount redemptions are private
ALTER TABLE discount_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own discount redemptions" ON discount_redemptions FOR ALL USING (auth.uid() = user_id);

-- Tax rates are public for calculation
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tax rates are viewable by everyone" ON tax_rates FOR SELECT USING (is_active = true);

-- Insert sample subscription plans
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features, limits) VALUES
('Free', 'Perfect for getting started', 0, 0, 
 '{"agents": "Up to 3 agents", "executions": "100 executions/month", "support": "Community support"}',
 '{"agent_count": 3, "api_calls": 100, "storage_gb": 1}'
),
('Pro', 'For serious developers', 29.99, 299.99,
 '{"agents": "Up to 25 agents", "executions": "5,000 executions/month", "integrations": "All integrations", "support": "Priority support"}',
 '{"agent_count": 25, "api_calls": 5000, "storage_gb": 10}'
),
('Team', 'For growing teams', 99.99, 999.99,
 '{"agents": "Up to 100 agents", "executions": "25,000 executions/month", "collaboration": "Team collaboration", "analytics": "Advanced analytics"}',
 '{"agent_count": 100, "api_calls": 25000, "storage_gb": 50}'
),
('Enterprise', 'For large organizations', 299.99, 2999.99,
 '{"agents": "Unlimited agents", "executions": "Unlimited executions", "sla": "99.9% SLA", "support": "Dedicated support"}',
 '{"agent_count": -1, "api_calls": -1, "storage_gb": -1}'
);

-- Insert sample tax rates
INSERT INTO tax_rates (name, country, tax_type, rate) VALUES
('US Sales Tax', 'US', 'sales_tax', 0.08),
('UK VAT', 'GB', 'vat', 0.20),
('EU VAT', 'DE', 'vat', 0.19),
('Canada GST', 'CA', 'gst', 0.05),
('Australia GST', 'AU', 'gst', 0.10);
