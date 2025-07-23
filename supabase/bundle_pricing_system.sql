-- Agent Bundle System
-- Extension to existing AgentFlow database

-- Agent bundles table
CREATE TABLE IF NOT EXISTS agent_bundles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    
    -- Bundle configuration
    bundle_type VARCHAR(50) DEFAULT 'collection' CHECK (bundle_type IN ('collection', 'workflow', 'themed', 'developer')),
    is_featured BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    
    -- Pricing
    individual_total DECIMAL(10,2) NOT NULL DEFAULT 0, -- Sum of individual agent prices
    bundle_price DECIMAL(10,2) NOT NULL,
    savings_amount DECIMAL(10,2) GENERATED ALWAYS AS (individual_total - bundle_price) STORED,
    savings_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN individual_total > 0 THEN ((individual_total - bundle_price) / individual_total) * 100
            ELSE 0
        END
    ) STORED,
    
    -- Stripe integration
    stripe_price_id VARCHAR(255),
    stripe_product_id VARCHAR(255),
    
    -- Usage stats
    purchase_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    
    -- SEO and metadata
    image_url TEXT,
    tags TEXT[], -- Array of tag names
    category_ids UUID[], -- Array of category IDs
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT positive_prices CHECK (bundle_price > 0 AND individual_total >= 0),
    CONSTRAINT valid_savings CHECK (bundle_price <= individual_total)
);

-- Bundle agents relationship (many-to-many)
CREATE TABLE IF NOT EXISTS bundle_agents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bundle_id UUID REFERENCES agent_bundles(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_featured_in_bundle BOOLEAN DEFAULT false,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bundle_id, agent_id)
);

-- Bundle purchases
CREATE TABLE IF NOT EXISTS bundle_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bundle_id UUID REFERENCES agent_bundles(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Purchase details
    purchase_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Stripe payment details
    stripe_session_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'requires_action', 'failed', 'cancelled')),
    
    -- Revenue sharing (calculated at purchase time)
    platform_fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    developer_payout_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    
    -- Unique constraint to prevent duplicate purchases
    UNIQUE(bundle_id, user_id, stripe_session_id)
);

-- Bundle reviews and ratings
CREATE TABLE IF NOT EXISTS bundle_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bundle_id UUID REFERENCES agent_bundles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    purchase_id UUID REFERENCES bundle_purchases(id) ON DELETE CASCADE,
    
    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text TEXT,
    
    -- Review metadata
    is_verified_purchase BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    helpful_count INTEGER DEFAULT 0,
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT false,
    moderation_status VARCHAR(50) DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One review per purchase
    UNIQUE(purchase_id)
);

-- Bundle analytics
CREATE TABLE IF NOT EXISTS bundle_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bundle_id UUID REFERENCES agent_bundles(id) ON DELETE CASCADE,
    
    -- Date tracking
    date DATE NOT NULL,
    
    -- Metrics
    views INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    purchases INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    
    -- Conversion metrics
    view_to_click_rate DECIMAL(5,2) DEFAULT 0,
    click_to_purchase_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(bundle_id, date)
);

-- Bundle collections (for organizing bundles)
CREATE TABLE IF NOT EXISTS bundle_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    
    -- Display settings
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    banner_image_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bundle collection membership
CREATE TABLE IF NOT EXISTS bundle_collection_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    collection_id UUID REFERENCES bundle_collections(id) ON DELETE CASCADE,
    bundle_id UUID REFERENCES agent_bundles(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(collection_id, bundle_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_bundles_created_by ON agent_bundles(created_by);
CREATE INDEX IF NOT EXISTS idx_agent_bundles_featured ON agent_bundles(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_agent_bundles_public ON agent_bundles(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_agent_bundles_type ON agent_bundles(bundle_type);
CREATE INDEX IF NOT EXISTS idx_agent_bundles_price ON agent_bundles(bundle_price);

CREATE INDEX IF NOT EXISTS idx_bundle_agents_bundle ON bundle_agents(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_agents_agent ON bundle_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_bundle_agents_order ON bundle_agents(bundle_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_bundle_purchases_user ON bundle_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_bundle_purchases_bundle ON bundle_purchases(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_purchases_status ON bundle_purchases(status);
CREATE INDEX IF NOT EXISTS idx_bundle_purchases_created ON bundle_purchases(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bundle_reviews_bundle ON bundle_reviews(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_reviews_user ON bundle_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_bundle_reviews_rating ON bundle_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_bundle_reviews_public ON bundle_reviews(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_bundle_analytics_bundle_date ON bundle_analytics(bundle_id, date DESC);

-- Functions for bundle management

-- Function to calculate and update bundle totals
CREATE OR REPLACE FUNCTION update_bundle_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update individual total when agents are added/removed
    UPDATE agent_bundles 
    SET 
        individual_total = (
            SELECT COALESCE(SUM(a.price), 0)
            FROM bundle_agents ba
            JOIN agents a ON ba.agent_id = a.id
            WHERE ba.bundle_id = COALESCE(NEW.bundle_id, OLD.bundle_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.bundle_id, OLD.bundle_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for bundle totals
DROP TRIGGER IF EXISTS trigger_update_bundle_totals ON bundle_agents;
CREATE TRIGGER trigger_update_bundle_totals
    AFTER INSERT OR DELETE ON bundle_agents
    FOR EACH ROW EXECUTE FUNCTION update_bundle_totals();

-- Function to update bundle purchase count
CREATE OR REPLACE FUNCTION update_bundle_purchase_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
        UPDATE agent_bundles 
        SET purchase_count = purchase_count + 1
        WHERE id = NEW.bundle_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
        UPDATE agent_bundles 
        SET purchase_count = purchase_count + 1
        WHERE id = NEW.bundle_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status != 'completed' THEN
        UPDATE agent_bundles 
        SET purchase_count = GREATEST(purchase_count - 1, 0)
        WHERE id = NEW.bundle_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for bundle purchase count
DROP TRIGGER IF EXISTS trigger_update_bundle_purchase_count ON bundle_purchases;
CREATE TRIGGER trigger_update_bundle_purchase_count
    AFTER INSERT OR UPDATE OF status ON bundle_purchases
    FOR EACH ROW EXECUTE FUNCTION update_bundle_purchase_count();

-- Function to get bundle recommendations
CREATE OR REPLACE FUNCTION get_bundle_recommendations(
    user_id_input UUID,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE(
    bundle_id UUID,
    bundle_title VARCHAR(255),
    relevance_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH user_interests AS (
        -- Get user's purchased agents and their categories/tags
        SELECT DISTINCT 
            unnest(a.category_ids) as category_id,
            unnest(a.tags) as tag_name
        FROM agent_purchases ap
        JOIN agents a ON ap.agent_id = a.id
        WHERE ap.user_id = user_id_input 
        AND ap.status = 'completed'
    ),
    bundle_scores AS (
        SELECT 
            ab.id,
            ab.title,
            (
                -- Category matching score (40% weight)
                0.4 * COALESCE((
                    SELECT COUNT(*)::DECIMAL / GREATEST(array_length(ab.category_ids, 1), 1)
                    FROM unnest(ab.category_ids) as bundle_cat
                    WHERE bundle_cat IN (SELECT category_id FROM user_interests)
                ), 0) +
                -- Tag matching score (30% weight)  
                0.3 * COALESCE((
                    SELECT COUNT(*)::DECIMAL / GREATEST(array_length(ab.tags, 1), 1)
                    FROM unnest(ab.tags) as bundle_tag
                    WHERE bundle_tag IN (SELECT tag_name FROM user_interests)
                ), 0) +
                -- Popularity score (20% weight)
                0.2 * LEAST(ab.purchase_count::DECIMAL / 100, 1.0) +
                -- Savings score (10% weight)
                0.1 * LEAST(ab.savings_percentage / 50, 1.0)
            ) as score
        FROM agent_bundles ab
        WHERE ab.is_public = true 
        AND ab.published_at IS NOT NULL
        -- Don't recommend bundles the user already owns
        AND ab.id NOT IN (
            SELECT bundle_id FROM bundle_purchases 
            WHERE user_id = user_id_input AND status = 'completed'
        )
    )
    SELECT 
        bs.id,
        bs.title,
        bs.score
    FROM bundle_scores bs
    WHERE bs.score > 0
    ORDER BY bs.score DESC, bs.id
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular bundles in category
CREATE OR REPLACE FUNCTION get_popular_bundles_by_category(
    category_id_input UUID,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
    bundle_id UUID,
    bundle_title VARCHAR(255),
    purchase_count INTEGER,
    savings_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ab.id,
        ab.title,
        ab.purchase_count,
        ab.savings_percentage
    FROM agent_bundles ab
    WHERE ab.is_public = true 
    AND ab.published_at IS NOT NULL
    AND category_id_input = ANY(ab.category_ids)
    ORDER BY ab.purchase_count DESC, ab.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE agent_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_collection_items ENABLE ROW LEVEL SECURITY;

-- Bundle policies
CREATE POLICY "Public bundles are viewable by everyone" ON agent_bundles FOR SELECT USING (
    is_public = true AND published_at IS NOT NULL
);
CREATE POLICY "Users can view their own bundles" ON agent_bundles FOR SELECT USING (
    created_by = auth.uid()
);
CREATE POLICY "Users can create bundles" ON agent_bundles FOR INSERT WITH CHECK (
    created_by = auth.uid()
);
CREATE POLICY "Users can update their own bundles" ON agent_bundles FOR UPDATE USING (
    created_by = auth.uid()
);
CREATE POLICY "Users can delete their own bundles" ON agent_bundles FOR DELETE USING (
    created_by = auth.uid()
);

-- Bundle agents policies
CREATE POLICY "Bundle agents are viewable with bundle" ON bundle_agents FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM agent_bundles ab 
        WHERE ab.id = bundle_id 
        AND (ab.is_public = true OR ab.created_by = auth.uid())
    )
);
CREATE POLICY "Bundle creators can manage bundle agents" ON bundle_agents FOR ALL USING (
    EXISTS (
        SELECT 1 FROM agent_bundles ab 
        WHERE ab.id = bundle_id 
        AND ab.created_by = auth.uid()
    )
);

-- Bundle purchase policies
CREATE POLICY "Users can view their own purchases" ON bundle_purchases FOR SELECT USING (
    user_id = auth.uid()
);
CREATE POLICY "Users can create their own purchases" ON bundle_purchases FOR INSERT WITH CHECK (
    user_id = auth.uid()
);
CREATE POLICY "Users can update their own purchases" ON bundle_purchases FOR UPDATE USING (
    user_id = auth.uid()
);

-- Bundle review policies
CREATE POLICY "Public reviews are viewable by everyone" ON bundle_reviews FOR SELECT USING (
    is_public = true AND moderation_status = 'approved'
);
CREATE POLICY "Users can view their own reviews" ON bundle_reviews FOR SELECT USING (
    user_id = auth.uid()
);
CREATE POLICY "Purchasers can create reviews" ON bundle_reviews FOR INSERT WITH CHECK (
    user_id = auth.uid() AND EXISTS (
        SELECT 1 FROM bundle_purchases bp 
        WHERE bp.id = purchase_id 
        AND bp.user_id = auth.uid()
        AND bp.status = 'completed'
    )
);
CREATE POLICY "Users can update their own reviews" ON bundle_reviews FOR UPDATE USING (
    user_id = auth.uid()
);

-- Bundle analytics policies (admin only)
CREATE POLICY "Bundle analytics viewable by bundle creators and admins" ON bundle_analytics FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM agent_bundles ab 
        WHERE ab.id = bundle_id 
        AND ab.created_by = auth.uid()
    ) OR
    auth.jwt() ->> 'role' = 'admin'
);

-- Bundle collections policies
CREATE POLICY "Bundle collections are viewable by everyone" ON bundle_collections FOR SELECT USING (true);
CREATE POLICY "Only admins can manage bundle collections" ON bundle_collections FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);

CREATE POLICY "Bundle collection items are viewable by everyone" ON bundle_collection_items FOR SELECT USING (true);
CREATE POLICY "Only admins can manage collection items" ON bundle_collection_items FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);

-- Sample bundle collections
INSERT INTO bundle_collections (name, description, slug, is_featured, sort_order) VALUES
('Starter Pack', 'Essential agents for new users', 'starter-pack', true, 1),
('AI Powerhouse', 'Advanced AI-powered automation agents', 'ai-powerhouse', true, 2),
('Business Essentials', 'Must-have agents for business productivity', 'business-essentials', true, 3),
('Developer Tools', 'Coding and development assistance bundles', 'developer-tools', false, 4),
('Content Creation Suite', 'Everything you need for content creation', 'content-creation', true, 5)
ON CONFLICT (slug) DO NOTHING;
