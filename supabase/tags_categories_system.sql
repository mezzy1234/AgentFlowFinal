-- Enhanced Tags and Categories System
-- Extension to existing AgentFlow database

-- Categories table for organizing agents
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    icon VARCHAR(50), -- Lucide icon name
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags table for flexible labeling
CREATE TABLE IF NOT EXISTS tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    usage_count INTEGER DEFAULT 0,
    is_trending BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent categories relationship
CREATE TABLE IF NOT EXISTS agent_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, category_id)
);

-- Agent tags relationship
CREATE TABLE IF NOT EXISTS agent_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    relevance_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0
    added_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, tag_id)
);

-- Tag search history for trending analysis
CREATE TABLE IF NOT EXISTS tag_search_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    search_query TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Category search history
CREATE TABLE IF NOT EXISTS category_search_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tag clustering for related tags
CREATE TABLE IF NOT EXISTS tag_clusters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    tags UUID[] NOT NULL, -- Array of tag IDs
    similarity_threshold DECIMAL(3,2) DEFAULT 0.7,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_trending ON tags(is_trending);
CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_agent_categories_agent ON agent_categories(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_categories_category ON agent_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_agent_categories_primary ON agent_categories(agent_id, is_primary);

CREATE INDEX IF NOT EXISTS idx_agent_tags_agent ON agent_tags(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tags_tag ON agent_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_agent_tags_relevance ON agent_tags(relevance_score DESC);

CREATE INDEX IF NOT EXISTS idx_tag_search_created ON tag_search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_category_search_created ON category_search_history(created_at DESC);

-- Functions for tag and category management

-- Function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags 
        SET usage_count = usage_count + 1, updated_at = NOW()
        WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags 
        SET usage_count = GREATEST(usage_count - 1, 0), updated_at = NOW()
        WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tag usage count
DROP TRIGGER IF EXISTS trigger_update_tag_usage_count ON agent_tags;
CREATE TRIGGER trigger_update_tag_usage_count
    AFTER INSERT OR DELETE ON agent_tags
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- Function to identify trending tags
CREATE OR REPLACE FUNCTION update_trending_tags()
RETURNS void AS $$
DECLARE
    trending_threshold INTEGER := 10; -- Minimum searches in last 7 days
BEGIN
    -- Reset all trending status
    UPDATE tags SET is_trending = false;
    
    -- Mark tags as trending based on recent search activity
    UPDATE tags 
    SET is_trending = true, updated_at = NOW()
    WHERE id IN (
        SELECT t.id 
        FROM tags t
        JOIN tag_search_history tsh ON t.id = tsh.tag_id
        WHERE tsh.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY t.id
        HAVING COUNT(*) >= trending_threshold
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get tag suggestions based on content
CREATE OR REPLACE FUNCTION suggest_tags_for_agent(
    agent_title TEXT,
    agent_description TEXT,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
    tag_id UUID,
    tag_name VARCHAR(50),
    relevance_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        (
            -- Title matching (higher weight)
            CASE WHEN agent_title ILIKE '%' || t.name || '%' THEN 0.8 ELSE 0.0 END +
            -- Description matching
            CASE WHEN agent_description ILIKE '%' || t.name || '%' THEN 0.6 ELSE 0.0 END +
            -- Usage popularity bonus
            LEAST(t.usage_count::DECIMAL / 100.0, 0.3)
        ) as relevance
    FROM tags t
    WHERE 
        (agent_title ILIKE '%' || t.name || '%' OR 
         agent_description ILIKE '%' || t.name || '%')
        AND t.name != ''
    ORDER BY relevance DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get related tags through clustering
CREATE OR REPLACE FUNCTION get_related_tags(input_tag_id UUID, limit_count INTEGER DEFAULT 5)
RETURNS TABLE(
    tag_id UUID,
    tag_name VARCHAR(50),
    cluster_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        tc.name
    FROM tags t
    JOIN tag_clusters tc ON t.id = ANY(tc.tags)
    WHERE tc.id IN (
        SELECT tc2.id 
        FROM tag_clusters tc2 
        WHERE input_tag_id = ANY(tc2.tags)
    )
    AND t.id != input_tag_id
    ORDER BY t.usage_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_clusters ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Only admins can manage categories" ON categories FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    (auth.jwt() ->> 'user_metadata')::json ->> 'role' = 'admin'
);

-- Tags policies  
CREATE POLICY "Tags are viewable by everyone" ON tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tags" ON tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update tags they created or admins" ON tags FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    (auth.jwt() ->> 'user_metadata')::json ->> 'role' = 'admin'
);

-- Agent categories policies
CREATE POLICY "Agent categories are viewable by everyone" ON agent_categories FOR SELECT USING (true);
CREATE POLICY "Users can manage categories for their agents" ON agent_categories FOR ALL USING (
    EXISTS (
        SELECT 1 FROM agents a 
        WHERE a.id = agent_id 
        AND a.developer_id = auth.uid()
    )
);

-- Agent tags policies
CREATE POLICY "Agent tags are viewable by everyone" ON agent_tags FOR SELECT USING (true);
CREATE POLICY "Users can manage tags for their agents" ON agent_tags FOR ALL USING (
    EXISTS (
        SELECT 1 FROM agents a 
        WHERE a.id = agent_id 
        AND a.developer_id = auth.uid()
    ) OR
    auth.uid() = added_by
);

-- Search history policies
CREATE POLICY "Users can view their own search history" ON tag_search_history FOR SELECT USING (
    user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin'
);
CREATE POLICY "Users can create their own search history" ON tag_search_history FOR INSERT WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
);

CREATE POLICY "Users can view their own search history" ON category_search_history FOR SELECT USING (
    user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin'
);
CREATE POLICY "Users can create their own search history" ON category_search_history FOR INSERT WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
);

-- Tag clusters policies
CREATE POLICY "Tag clusters are viewable by everyone" ON tag_clusters FOR SELECT USING (true);
CREATE POLICY "Only admins can manage tag clusters" ON tag_clusters FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    (auth.jwt() ->> 'user_metadata')::json ->> 'role' = 'admin'
);

-- Initial seed data for categories
INSERT INTO categories (name, slug, description, color, icon, sort_order) VALUES
('AI & Machine Learning', 'ai-ml', 'Agents powered by artificial intelligence and machine learning', '#3B82F6', 'Brain', 1),
('Automation', 'automation', 'Workflow and process automation agents', '#10B981', 'Zap', 2),
('Data Processing', 'data-processing', 'Data analysis, transformation, and processing', '#8B5CF6', 'Database', 3),
('Content Creation', 'content-creation', 'Text, image, and multimedia content generation', '#F59E0B', 'Edit', 4),
('Business & Finance', 'business-finance', 'Business process and financial analysis tools', '#EF4444', 'TrendingUp', 5),
('Communication', 'communication', 'Messaging, email, and communication automation', '#06B6D4', 'MessageSquare', 6),
('Development', 'development', 'Software development and coding assistance', '#6366F1', 'Code', 7),
('Marketing', 'marketing', 'Marketing automation and campaign management', '#EC4899', 'Megaphone', 8),
('Analytics', 'analytics', 'Data analytics and reporting tools', '#84CC16', 'BarChart', 9),
('Integration', 'integration', 'Third-party service integrations', '#F97316', 'Link', 10)
ON CONFLICT (slug) DO NOTHING;

-- Initial seed data for common tags
INSERT INTO tags (name, slug, description, color) VALUES
('automation', 'automation', 'Workflow and process automation', '#10B981'),
('ai', 'ai', 'Artificial intelligence powered', '#3B82F6'),
('data-analysis', 'data-analysis', 'Data processing and analysis', '#8B5CF6'),
('content', 'content', 'Content creation and management', '#F59E0B'),
('nlp', 'nlp', 'Natural language processing', '#06B6D4'),
('api', 'api', 'API integration and management', '#6366F1'),
('webhook', 'webhook', 'Webhook processing', '#EC4899'),
('scheduling', 'scheduling', 'Task and event scheduling', '#84CC16'),
('notification', 'notification', 'Notification and alerting', '#F97316'),
('report', 'report', 'Reporting and analytics', '#EF4444'),
('email', 'email', 'Email processing and automation', '#06B6D4'),
('slack', 'slack', 'Slack integration', '#6366F1'),
('discord', 'discord', 'Discord bot functionality', '#8B5CF6'),
('twitter', 'twitter', 'Twitter/X integration', '#3B82F6'),
('github', 'github', 'GitHub integration', '#6366F1'),
('stripe', 'stripe', 'Payment processing', '#8B5CF6'),
('csv', 'csv', 'CSV file processing', '#10B981'),
('json', 'json', 'JSON data handling', '#F59E0B'),
('image', 'image', 'Image processing', '#EC4899'),
('pdf', 'pdf', 'PDF document handling', '#EF4444')
ON CONFLICT (slug) DO NOTHING;
