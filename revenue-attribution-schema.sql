-- Revenue Attribution System Schema
-- Tracks revenue attribution across the entire platform ecosystem

-- Revenue Sources - Define different revenue streams
CREATE TABLE revenue_sources (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    source_type VARCHAR NOT NULL, -- agent_execution, subscription, marketplace, commission
    commission_rate DECIMAL(5,4) DEFAULT 0, -- Platform commission (0.15 = 15%)
    developer_rate DECIMAL(5,4) DEFAULT 0.85, -- Developer share (0.85 = 85%)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Revenue Transactions - All revenue generating events
CREATE TABLE revenue_transactions (
    id VARCHAR PRIMARY KEY,
    transaction_type VARCHAR NOT NULL, -- charge, refund, commission, payout
    revenue_source_id VARCHAR NOT NULL REFERENCES revenue_sources(id),
    
    -- Primary entities
    agent_id VARCHAR, -- Agent that generated revenue
    user_id VARCHAR NOT NULL, -- User who paid
    developer_id VARCHAR, -- Developer who receives revenue
    bundle_id VARCHAR, -- Bundle if applicable
    
    -- Transaction details
    gross_amount_cents INTEGER NOT NULL, -- Total amount before fees
    platform_fee_cents INTEGER DEFAULT 0, -- Platform commission
    developer_amount_cents INTEGER DEFAULT 0, -- Amount to developer
    stripe_fee_cents INTEGER DEFAULT 0, -- Stripe processing fee
    net_amount_cents INTEGER DEFAULT 0, -- Final amount after all fees
    
    -- External references
    stripe_payment_intent_id VARCHAR,
    stripe_charge_id VARCHAR,
    subscription_id VARCHAR,
    
    -- Metadata
    currency VARCHAR DEFAULT 'USD',
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Attribution context
    referral_source VARCHAR, -- How user found the agent/bundle
    campaign_id VARCHAR, -- Marketing campaign attribution
    session_id VARCHAR, -- User session
    
    -- Status and timing
    status VARCHAR DEFAULT 'pending', -- pending, completed, failed, refunded
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Developer Payouts - Track payments to developers
CREATE TABLE developer_payouts (
    id VARCHAR PRIMARY KEY,
    developer_id VARCHAR NOT NULL,
    payout_period_start DATE NOT NULL,
    payout_period_end DATE NOT NULL,
    
    -- Amount calculations
    total_gross_revenue_cents INTEGER DEFAULT 0,
    total_platform_fees_cents INTEGER DEFAULT 0,
    total_stripe_fees_cents INTEGER DEFAULT 0,
    total_payout_amount_cents INTEGER DEFAULT 0,
    
    -- Transaction counts
    total_transactions INTEGER DEFAULT 0,
    refunded_transactions INTEGER DEFAULT 0,
    
    -- Payout details
    payout_method VARCHAR DEFAULT 'stripe_connect', -- stripe_connect, bank_transfer, paypal
    payout_account_id VARCHAR, -- Stripe Connect account, bank details, etc.
    stripe_transfer_id VARCHAR,
    
    -- Status
    status VARCHAR DEFAULT 'pending', -- pending, processing, completed, failed
    initiated_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metadata
    payout_breakdown JSONB DEFAULT '{}', -- Detailed breakdown by agent/bundle
    failure_reason TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Revenue Attribution Rules - Define how revenue is attributed
CREATE TABLE revenue_attribution_rules (
    id VARCHAR PRIMARY KEY,
    rule_name VARCHAR NOT NULL,
    description TEXT,
    
    -- Rule conditions
    agent_category VARCHAR, -- Apply to specific agent categories
    pricing_model VARCHAR, -- Apply to specific pricing models
    user_type VARCHAR, -- Apply to specific user types (free, premium, enterprise)
    
    -- Attribution logic
    attribution_model VARCHAR DEFAULT 'last_touch', -- last_touch, first_touch, multi_touch
    attribution_window_hours INTEGER DEFAULT 168, -- 7 days default
    
    -- Revenue splits
    platform_commission_rate DECIMAL(5,4) DEFAULT 0.15,
    developer_share_rate DECIMAL(5,4) DEFAULT 0.85,
    referrer_commission_rate DECIMAL(5,4) DEFAULT 0, -- For affiliate programs
    
    -- Conditions
    min_transaction_cents INTEGER DEFAULT 0,
    max_transaction_cents INTEGER,
    
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Higher priority rules take precedence
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Revenue Analytics Cache - Pre-computed analytics for performance
CREATE TABLE revenue_analytics_cache (
    id VARCHAR PRIMARY KEY,
    cache_key VARCHAR UNIQUE NOT NULL,
    analytics_type VARCHAR NOT NULL, -- daily, weekly, monthly, agent, developer, platform
    entity_id VARCHAR, -- agent_id, developer_id, or null for platform
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Cached metrics
    total_revenue_cents INTEGER DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    avg_transaction_cents INTEGER DEFAULT 0,
    platform_fees_cents INTEGER DEFAULT 0,
    developer_payouts_cents INTEGER DEFAULT 0,
    refund_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Growth metrics
    revenue_growth_rate DECIMAL(5,4) DEFAULT 0,
    transaction_growth_rate DECIMAL(5,4) DEFAULT 0,
    user_growth_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Additional analytics
    top_revenue_agents JSONB DEFAULT '[]',
    revenue_by_category JSONB DEFAULT '{}',
    revenue_by_pricing_model JSONB DEFAULT '{}',
    
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Commission Tracking - Track all commission flows
CREATE TABLE commission_tracking (
    id VARCHAR PRIMARY KEY,
    transaction_id VARCHAR NOT NULL REFERENCES revenue_transactions(id),
    
    -- Commission details
    commission_type VARCHAR NOT NULL, -- platform, referral, affiliate
    recipient_type VARCHAR NOT NULL, -- platform, user, developer
    recipient_id VARCHAR, -- ID of the recipient
    
    -- Amounts
    commission_rate DECIMAL(5,4) NOT NULL,
    commission_amount_cents INTEGER NOT NULL,
    
    -- Status
    status VARCHAR DEFAULT 'pending', -- pending, paid, failed
    paid_at TIMESTAMP,
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Subscription Revenue Tracking - Track recurring revenue
CREATE TABLE subscription_revenue (
    id VARCHAR PRIMARY KEY,
    subscription_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    plan_type VARCHAR NOT NULL, -- premium, enterprise, custom
    
    -- Subscription details
    subscription_status VARCHAR NOT NULL, -- active, cancelled, past_due, unpaid
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    
    -- Revenue amounts
    plan_amount_cents INTEGER NOT NULL,
    actual_amount_cents INTEGER NOT NULL, -- After discounts, coupons
    platform_fee_cents INTEGER DEFAULT 0,
    
    -- Usage-based billing
    usage_amount_cents INTEGER DEFAULT 0,
    usage_units INTEGER DEFAULT 0, -- API calls, agent executions, etc.
    
    -- Billing cycle
    billing_cycle VARCHAR DEFAULT 'monthly', -- monthly, yearly, usage
    
    -- Attribution
    signup_source VARCHAR,
    campaign_id VARCHAR,
    
    -- Stripe references
    stripe_subscription_id VARCHAR,
    stripe_invoice_id VARCHAR,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for revenue attribution system
CREATE INDEX idx_revenue_transactions_user ON revenue_transactions(user_id);
CREATE INDEX idx_revenue_transactions_developer ON revenue_transactions(developer_id);
CREATE INDEX idx_revenue_transactions_agent ON revenue_transactions(agent_id);
CREATE INDEX idx_revenue_transactions_bundle ON revenue_transactions(bundle_id);
CREATE INDEX idx_revenue_transactions_date ON revenue_transactions(created_at);
CREATE INDEX idx_revenue_transactions_status ON revenue_transactions(status);
CREATE INDEX idx_revenue_transactions_stripe_intent ON revenue_transactions(stripe_payment_intent_id);

CREATE INDEX idx_developer_payouts_developer ON developer_payouts(developer_id);
CREATE INDEX idx_developer_payouts_period ON developer_payouts(payout_period_start, payout_period_end);
CREATE INDEX idx_developer_payouts_status ON developer_payouts(status);

CREATE INDEX idx_revenue_analytics_cache_key ON revenue_analytics_cache(cache_key);
CREATE INDEX idx_revenue_analytics_cache_type ON revenue_analytics_cache(analytics_type);
CREATE INDEX idx_revenue_analytics_cache_entity ON revenue_analytics_cache(entity_id);
CREATE INDEX idx_revenue_analytics_cache_period ON revenue_analytics_cache(period_start, period_end);
CREATE INDEX idx_revenue_analytics_cache_expires ON revenue_analytics_cache(expires_at);

CREATE INDEX idx_commission_tracking_transaction ON commission_tracking(transaction_id);
CREATE INDEX idx_commission_tracking_recipient ON commission_tracking(recipient_id);
CREATE INDEX idx_commission_tracking_type ON commission_tracking(commission_type);

CREATE INDEX idx_subscription_revenue_user ON subscription_revenue(user_id);
CREATE INDEX idx_subscription_revenue_subscription ON subscription_revenue(subscription_id);
CREATE INDEX idx_subscription_revenue_status ON subscription_revenue(subscription_status);

-- PostgreSQL functions for revenue attribution
CREATE OR REPLACE FUNCTION create_revenue_transaction(
    p_transaction_type VARCHAR,
    p_revenue_source_id VARCHAR,
    p_agent_id VARCHAR,
    p_user_id VARCHAR,
    p_developer_id VARCHAR,
    p_gross_amount_cents INTEGER,
    p_stripe_payment_intent_id VARCHAR DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VARCHAR AS $$
DECLARE
    transaction_id VARCHAR;
    attribution_rule RECORD;
    platform_fee_cents INTEGER;
    developer_amount_cents INTEGER;
    stripe_fee_cents INTEGER := ROUND(p_gross_amount_cents * 0.029 + 30); -- Stripe fee estimate
BEGIN
    -- Generate transaction ID
    transaction_id := 'txn_' || EXTRACT(epoch FROM NOW()) || '_' || substr(md5(random()::text), 1, 8);
    
    -- Get applicable attribution rule
    SELECT * INTO attribution_rule
    FROM revenue_attribution_rules
    WHERE is_active = true
        AND (agent_category IS NULL OR agent_category = (SELECT category FROM agents WHERE id = p_agent_id))
        AND (min_transaction_cents IS NULL OR p_gross_amount_cents >= min_transaction_cents)
        AND (max_transaction_cents IS NULL OR p_gross_amount_cents <= max_transaction_cents)
    ORDER BY priority DESC, created_at DESC
    LIMIT 1;
    
    -- Calculate fees using attribution rule or defaults
    IF attribution_rule IS NOT NULL THEN
        platform_fee_cents := ROUND(p_gross_amount_cents * attribution_rule.platform_commission_rate);
        developer_amount_cents := ROUND(p_gross_amount_cents * attribution_rule.developer_share_rate);
    ELSE
        platform_fee_cents := ROUND(p_gross_amount_cents * 0.15); -- Default 15%
        developer_amount_cents := ROUND(p_gross_amount_cents * 0.85); -- Default 85%
    END IF;
    
    -- Create revenue transaction
    INSERT INTO revenue_transactions (
        id, transaction_type, revenue_source_id, agent_id, user_id, developer_id,
        gross_amount_cents, platform_fee_cents, developer_amount_cents, stripe_fee_cents,
        net_amount_cents, stripe_payment_intent_id, metadata, status, created_at
    ) VALUES (
        transaction_id, p_transaction_type, p_revenue_source_id, p_agent_id, p_user_id, p_developer_id,
        p_gross_amount_cents, platform_fee_cents, developer_amount_cents, stripe_fee_cents,
        p_gross_amount_cents - platform_fee_cents - stripe_fee_cents,
        p_stripe_payment_intent_id, p_metadata, 'pending', NOW()
    );
    
    -- Create commission tracking records
    INSERT INTO commission_tracking (
        id, transaction_id, commission_type, recipient_type, recipient_id,
        commission_rate, commission_amount_cents, status, created_at
    ) VALUES 
    (
        'comm_' || transaction_id || '_platform',
        transaction_id, 'platform', 'platform', 'platform',
        COALESCE(attribution_rule.platform_commission_rate, 0.15),
        platform_fee_cents, 'pending', NOW()
    ),
    (
        'comm_' || transaction_id || '_developer',
        transaction_id, 'platform', 'developer', p_developer_id,
        COALESCE(attribution_rule.developer_share_rate, 0.85),
        developer_amount_cents, 'pending', NOW()
    );
    
    RETURN transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process developer payout
CREATE OR REPLACE FUNCTION create_developer_payout(
    p_developer_id VARCHAR,
    p_period_start DATE,
    p_period_end DATE
)
RETURNS VARCHAR AS $$
DECLARE
    payout_id VARCHAR;
    total_gross INTEGER := 0;
    total_platform_fees INTEGER := 0;
    total_stripe_fees INTEGER := 0;
    total_payout INTEGER := 0;
    transaction_count INTEGER := 0;
    refund_count INTEGER := 0;
BEGIN
    -- Generate payout ID
    payout_id := 'payout_' || EXTRACT(epoch FROM NOW()) || '_' || substr(md5(random()::text), 1, 8);
    
    -- Calculate payout amounts
    SELECT 
        COALESCE(SUM(gross_amount_cents), 0),
        COALESCE(SUM(platform_fee_cents), 0),
        COALESCE(SUM(stripe_fee_cents), 0),
        COALESCE(SUM(developer_amount_cents), 0),
        COUNT(*),
        COUNT(*) FILTER (WHERE transaction_type = 'refund')
    INTO total_gross, total_platform_fees, total_stripe_fees, total_payout, transaction_count, refund_count
    FROM revenue_transactions
    WHERE developer_id = p_developer_id
        AND status = 'completed'
        AND DATE(created_at) BETWEEN p_period_start AND p_period_end;
    
    -- Create payout record
    INSERT INTO developer_payouts (
        id, developer_id, payout_period_start, payout_period_end,
        total_gross_revenue_cents, total_platform_fees_cents, total_stripe_fees_cents,
        total_payout_amount_cents, total_transactions, refunded_transactions,
        status, created_at
    ) VALUES (
        payout_id, p_developer_id, p_period_start, p_period_end,
        total_gross, total_platform_fees, total_stripe_fees,
        total_payout, transaction_count, refund_count,
        'pending', NOW()
    );
    
    RETURN payout_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get revenue analytics
CREATE OR REPLACE FUNCTION get_revenue_analytics(
    p_entity_type VARCHAR, -- 'platform', 'developer', 'agent'
    p_entity_id VARCHAR DEFAULT NULL,
    p_period_start DATE DEFAULT NULL,
    p_period_end DATE DEFAULT NULL
)
RETURNS TABLE(
    total_revenue_cents BIGINT,
    total_transactions BIGINT,
    unique_users BIGINT,
    avg_transaction_cents NUMERIC,
    platform_fees_cents BIGINT,
    developer_payouts_cents BIGINT,
    revenue_growth_rate NUMERIC,
    daily_breakdown JSONB
) AS $$
DECLARE
    where_clause TEXT := '';
    prev_period_revenue BIGINT := 0;
    current_period_revenue BIGINT := 0;
BEGIN
    -- Set default dates if not provided
    IF p_period_start IS NULL THEN
        p_period_start := CURRENT_DATE - INTERVAL '30 days';
    END IF;
    
    IF p_period_end IS NULL THEN
        p_period_end := CURRENT_DATE;
    END IF;
    
    -- Build where clause based on entity type
    CASE p_entity_type
        WHEN 'developer' THEN
            where_clause := 'developer_id = ''' || p_entity_id || '''';
        WHEN 'agent' THEN
            where_clause := 'agent_id = ''' || p_entity_id || '''';
        ELSE
            where_clause := '1=1'; -- Platform level
    END CASE;
    
    -- Calculate current period revenue for growth rate
    EXECUTE format('
        SELECT COALESCE(SUM(gross_amount_cents), 0)
        FROM revenue_transactions
        WHERE %s AND status = ''completed''
            AND DATE(created_at) BETWEEN %L AND %L
    ', where_clause, p_period_start, p_period_end)
    INTO current_period_revenue;
    
    -- Calculate previous period revenue for growth rate
    EXECUTE format('
        SELECT COALESCE(SUM(gross_amount_cents), 0)
        FROM revenue_transactions
        WHERE %s AND status = ''completed''
            AND DATE(created_at) BETWEEN %L AND %L
    ', where_clause, 
        p_period_start - (p_period_end - p_period_start),
        p_period_start - INTERVAL '1 day')
    INTO prev_period_revenue;
    
    -- Return analytics
    RETURN QUERY EXECUTE format('
        SELECT
            COALESCE(SUM(rt.gross_amount_cents), 0) as total_revenue_cents,
            COUNT(rt.id) as total_transactions,
            COUNT(DISTINCT rt.user_id) as unique_users,
            CASE 
                WHEN COUNT(rt.id) > 0 THEN
                    ROUND(AVG(rt.gross_amount_cents), 0)
                ELSE 0
            END as avg_transaction_cents,
            COALESCE(SUM(rt.platform_fee_cents), 0) as platform_fees_cents,
            COALESCE(SUM(rt.developer_amount_cents), 0) as developer_payouts_cents,
            CASE 
                WHEN %s > 0 THEN
                    ROUND((%s - %s) * 100.0 / %s, 2)
                ELSE 0
            END as revenue_growth_rate,
            (
                SELECT COALESCE(json_agg(daily_data ORDER BY revenue_date), ''[]''::json)::jsonb
                FROM (
                    SELECT 
                        DATE(rt2.created_at) as revenue_date,
                        COALESCE(SUM(rt2.gross_amount_cents), 0) as daily_revenue,
                        COUNT(rt2.id) as daily_transactions,
                        COUNT(DISTINCT rt2.user_id) as daily_users
                    FROM revenue_transactions rt2
                    WHERE %s AND rt2.status = ''completed''
                        AND DATE(rt2.created_at) BETWEEN %L AND %L
                    GROUP BY DATE(rt2.created_at)
                    ORDER BY revenue_date
                ) daily_data
            ) as daily_breakdown
        FROM revenue_transactions rt
        WHERE %s AND rt.status = ''completed''
            AND DATE(rt.created_at) BETWEEN %L AND %L
    ', 
    prev_period_revenue, current_period_revenue, prev_period_revenue, prev_period_revenue,
    where_clause, p_period_start, p_period_end,
    where_clause, p_period_start, p_period_end);
END;
$$ LANGUAGE plpgsql;

-- Function to get top revenue developers
CREATE OR REPLACE FUNCTION get_top_revenue_developers(
    p_period_start DATE,
    p_period_end DATE,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    developer_id VARCHAR,
    total_revenue BIGINT,
    total_transactions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rt.developer_id,
        SUM(rt.developer_amount_cents) as total_revenue,
        COUNT(*) as total_transactions
    FROM revenue_transactions rt
    WHERE rt.status = 'completed'
        AND rt.developer_id IS NOT NULL
        AND DATE(rt.created_at) BETWEEN p_period_start AND p_period_end
    GROUP BY rt.developer_id
    ORDER BY total_revenue DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get top revenue agents
CREATE OR REPLACE FUNCTION get_top_revenue_agents(
    p_period_start DATE,
    p_period_end DATE,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    agent_id VARCHAR,
    total_revenue BIGINT,
    total_transactions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rt.agent_id,
        SUM(rt.gross_amount_cents) as total_revenue,
        COUNT(*) as total_transactions
    FROM revenue_transactions rt
    WHERE rt.status = 'completed'
        AND rt.agent_id IS NOT NULL
        AND DATE(rt.created_at) BETWEEN p_period_start AND p_period_end
    GROUP BY rt.agent_id
    ORDER BY total_revenue DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
