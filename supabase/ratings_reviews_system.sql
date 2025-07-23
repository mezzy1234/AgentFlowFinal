-- Ratings and Reviews System
-- Extension to existing AgentFlow database

-- Agent ratings table (separate from reviews for performance)
CREATE TABLE IF NOT EXISTS agent_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    purchase_id UUID REFERENCES agent_purchases(id) ON DELETE SET NULL,
    
    -- Rating details
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    rating_aspects JSONB DEFAULT '{}'::jsonb, -- e.g., {"ease_of_use": 4, "effectiveness": 5, "documentation": 3}
    
    -- Metadata
    is_verified_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(agent_id, user_id) -- One rating per user per agent
);

-- Agent reviews table
CREATE TABLE IF NOT EXISTS agent_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    purchase_id UUID REFERENCES agent_purchases(id) ON DELETE SET NULL,
    rating_id UUID REFERENCES agent_ratings(id) ON DELETE CASCADE,
    
    -- Review content
    title VARCHAR(255),
    review_text TEXT,
    pros TEXT[], -- Array of positive points
    cons TEXT[], -- Array of negative points
    
    -- Review metadata
    is_verified_purchase BOOLEAN DEFAULT false,
    use_case TEXT, -- How they used the agent
    experience_level VARCHAR(50) CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    
    -- Engagement metrics
    helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    helpful_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_votes > 0 THEN (helpful_votes::DECIMAL / total_votes) * 100
            ELSE 0
        END
    ) STORED,
    
    -- Moderation
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    is_flagged BOOLEAN DEFAULT false,
    moderation_status VARCHAR(50) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
    moderated_by UUID REFERENCES auth.users(id),
    moderated_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(agent_id, user_id) -- One review per user per agent
);

-- Review helpfulness votes
CREATE TABLE IF NOT EXISTS review_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id UUID REFERENCES agent_reviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('helpful', 'not_helpful', 'spam', 'inappropriate')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(review_id, user_id) -- One vote per user per review
);

-- Review responses (from developers)
CREATE TABLE IF NOT EXISTS review_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id UUID REFERENCES agent_reviews(id) ON DELETE CASCADE,
    responder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    
    -- Verification that responder owns the agent
    is_verified_developer BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent rating summary (materialized for performance)
CREATE TABLE IF NOT EXISTS agent_rating_summary (
    agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Rating statistics
    total_ratings INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    rating_distribution JSONB DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb,
    
    -- Review statistics
    total_reviews INTEGER DEFAULT 0,
    verified_reviews INTEGER DEFAULT 0,
    featured_reviews INTEGER DEFAULT 0,
    
    -- Aspect ratings (averages)
    aspect_ratings JSONB DEFAULT '{}'::jsonb,
    
    -- Engagement statistics
    total_helpful_votes INTEGER DEFAULT 0,
    average_helpfulness DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Review reminders/prompts
CREATE TABLE IF NOT EXISTS review_prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    purchase_id UUID REFERENCES agent_purchases(id) ON DELETE CASCADE,
    
    -- Prompt configuration
    prompt_type VARCHAR(50) DEFAULT 'post_usage' CHECK (prompt_type IN ('immediate', 'post_usage', 'periodic', 'follow_up')),
    days_after_purchase INTEGER DEFAULT 7,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'dismissed', 'expired')),
    sent_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    reminder_count INTEGER DEFAULT 0,
    max_reminders INTEGER DEFAULT 3,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_ratings_agent ON agent_ratings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_ratings_user ON agent_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_ratings_rating ON agent_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_agent_ratings_verified ON agent_ratings(is_verified_purchase) WHERE is_verified_purchase = true;

CREATE INDEX IF NOT EXISTS idx_agent_reviews_agent ON agent_reviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_reviews_user ON agent_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_reviews_public ON agent_reviews(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_agent_reviews_featured ON agent_reviews(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_agent_reviews_created ON agent_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_reviews_helpful ON agent_reviews(helpful_percentage DESC);

CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_votes_user ON review_votes(user_id);

CREATE INDEX IF NOT EXISTS idx_review_prompts_user ON review_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_review_prompts_status ON review_prompts(status);
CREATE INDEX IF NOT EXISTS idx_review_prompts_expires ON review_prompts(expires_at);

-- Functions for ratings and reviews

-- Function to update rating summary
CREATE OR REPLACE FUNCTION update_agent_rating_summary()
RETURNS TRIGGER AS $$
DECLARE
    agent_id_to_update UUID;
BEGIN
    -- Get the agent ID from the affected row
    agent_id_to_update = COALESCE(NEW.agent_id, OLD.agent_id);
    
    -- Update or insert rating summary
    INSERT INTO agent_rating_summary (agent_id)
    VALUES (agent_id_to_update)
    ON CONFLICT (agent_id) DO NOTHING;
    
    -- Update rating statistics
    UPDATE agent_rating_summary 
    SET 
        total_ratings = (
            SELECT COUNT(*) FROM agent_ratings 
            WHERE agent_id = agent_id_to_update
        ),
        average_rating = (
            SELECT COALESCE(AVG(rating), 0) FROM agent_ratings 
            WHERE agent_id = agent_id_to_update
        ),
        rating_distribution = (
            SELECT jsonb_build_object(
                '1', COUNT(*) FILTER (WHERE rating = 1),
                '2', COUNT(*) FILTER (WHERE rating = 2),
                '3', COUNT(*) FILTER (WHERE rating = 3),
                '4', COUNT(*) FILTER (WHERE rating = 4),
                '5', COUNT(*) FILTER (WHERE rating = 5)
            )
            FROM agent_ratings 
            WHERE agent_id = agent_id_to_update
        ),
        total_reviews = (
            SELECT COUNT(*) FROM agent_reviews 
            WHERE agent_id = agent_id_to_update AND is_public = true
        ),
        verified_reviews = (
            SELECT COUNT(*) FROM agent_reviews 
            WHERE agent_id = agent_id_to_update AND is_verified_purchase = true AND is_public = true
        ),
        featured_reviews = (
            SELECT COUNT(*) FROM agent_reviews 
            WHERE agent_id = agent_id_to_update AND is_featured = true AND is_public = true
        ),
        total_helpful_votes = (
            SELECT COALESCE(SUM(helpful_votes), 0) FROM agent_reviews 
            WHERE agent_id = agent_id_to_update AND is_public = true
        ),
        average_helpfulness = (
            SELECT COALESCE(AVG(helpful_percentage), 0) FROM agent_reviews 
            WHERE agent_id = agent_id_to_update AND is_public = true AND total_votes > 0
        ),
        updated_at = NOW()
    WHERE agent_id = agent_id_to_update;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for rating summary updates
DROP TRIGGER IF EXISTS trigger_update_rating_summary_on_ratings ON agent_ratings;
CREATE TRIGGER trigger_update_rating_summary_on_ratings
    AFTER INSERT OR UPDATE OR DELETE ON agent_ratings
    FOR EACH ROW EXECUTE FUNCTION update_agent_rating_summary();

DROP TRIGGER IF EXISTS trigger_update_rating_summary_on_reviews ON agent_reviews;
CREATE TRIGGER trigger_update_rating_summary_on_reviews
    AFTER INSERT OR UPDATE OR DELETE ON agent_reviews
    FOR EACH ROW EXECUTE FUNCTION update_agent_rating_summary();

-- Function to update review helpfulness
CREATE OR REPLACE FUNCTION update_review_helpfulness()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE agent_reviews 
    SET 
        helpful_votes = (
            SELECT COUNT(*) FROM review_votes 
            WHERE review_id = COALESCE(NEW.review_id, OLD.review_id) 
            AND vote_type = 'helpful'
        ),
        total_votes = (
            SELECT COUNT(*) FROM review_votes 
            WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)
            AND vote_type IN ('helpful', 'not_helpful')
        )
    WHERE id = COALESCE(NEW.review_id, OLD.review_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for review helpfulness
DROP TRIGGER IF EXISTS trigger_update_review_helpfulness ON review_votes;
CREATE TRIGGER trigger_update_review_helpfulness
    AFTER INSERT OR UPDATE OR DELETE ON review_votes
    FOR EACH ROW EXECUTE FUNCTION update_review_helpfulness();

-- Function to create review prompts after purchase
CREATE OR REPLACE FUNCTION create_review_prompt()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create prompt for completed purchases
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        INSERT INTO review_prompts (user_id, agent_id, purchase_id, prompt_type, days_after_purchase)
        VALUES (NEW.user_id, NEW.agent_id, NEW.id, 'post_usage', 7)
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for review prompts
DROP TRIGGER IF EXISTS trigger_create_review_prompt ON agent_purchases;
CREATE TRIGGER trigger_create_review_prompt
    AFTER INSERT OR UPDATE OF status ON agent_purchases
    FOR EACH ROW EXECUTE FUNCTION create_review_prompt();

-- Function to get similar reviews (for moderation)
CREATE OR REPLACE FUNCTION get_similar_reviews(
    input_text TEXT,
    agent_id_input UUID DEFAULT NULL,
    similarity_threshold DECIMAL DEFAULT 0.7,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE(
    review_id UUID,
    review_text TEXT,
    similarity_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ar.id,
        ar.review_text,
        -- Simple similarity based on common words (can be enhanced with proper text similarity)
        (
            array_length(
                array(
                    select unnest(string_to_array(lower(input_text), ' ')) 
                    intersect 
                    select unnest(string_to_array(lower(ar.review_text), ' '))
                ), 1
            )::DECIMAL / 
            GREATEST(
                array_length(string_to_array(input_text, ' '), 1),
                array_length(string_to_array(ar.review_text, ' '), 1),
                1
            )
        ) as similarity
    FROM agent_reviews ar
    WHERE (agent_id_input IS NULL OR ar.agent_id = agent_id_input)
    AND ar.review_text IS NOT NULL
    AND ar.id != COALESCE(input_text::UUID, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
        array_length(
            array(
                select unnest(string_to_array(lower(input_text), ' ')) 
                intersect 
                select unnest(string_to_array(lower(ar.review_text), ' '))
            ), 1
        )::DECIMAL / 
        GREATEST(
            array_length(string_to_array(input_text, ' '), 1),
            array_length(string_to_array(ar.review_text, ' '), 1),
            1
        )
    ) >= similarity_threshold
    ORDER BY similarity DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE agent_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_rating_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_prompts ENABLE ROW LEVEL SECURITY;

-- Rating policies
CREATE POLICY "Ratings are viewable by everyone" ON agent_ratings FOR SELECT USING (true);
CREATE POLICY "Users can rate purchased agents" ON agent_ratings FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM agent_purchases ap 
        WHERE ap.agent_id = agent_ratings.agent_id 
        AND ap.user_id = auth.uid() 
        AND ap.status = 'completed'
    )
);
CREATE POLICY "Users can update their own ratings" ON agent_ratings FOR UPDATE USING (user_id = auth.uid());

-- Review policies
CREATE POLICY "Public approved reviews are viewable" ON agent_reviews FOR SELECT USING (
    is_public = true AND moderation_status = 'approved'
);
CREATE POLICY "Users can view their own reviews" ON agent_reviews FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create reviews for purchased agents" ON agent_reviews FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM agent_purchases ap 
        WHERE ap.agent_id = agent_reviews.agent_id 
        AND ap.user_id = auth.uid() 
        AND ap.status = 'completed'
    )
);
CREATE POLICY "Users can update their own reviews" ON agent_reviews FOR UPDATE USING (user_id = auth.uid());

-- Vote policies
CREATE POLICY "Votes are viewable with reviews" ON review_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote on reviews" ON review_votes FOR INSERT WITH CHECK (
    auth.uid() = user_id AND auth.role() = 'authenticated'
);
CREATE POLICY "Users can update their own votes" ON review_votes FOR UPDATE USING (user_id = auth.uid());

-- Response policies  
CREATE POLICY "Review responses are viewable by everyone" ON review_responses FOR SELECT USING (true);
CREATE POLICY "Agent developers can respond to reviews" ON review_responses FOR INSERT WITH CHECK (
    auth.uid() = responder_id AND
    EXISTS (
        SELECT 1 FROM agent_reviews ar
        JOIN agents a ON ar.agent_id = a.id
        WHERE ar.id = review_responses.review_id
        AND a.developer_id = auth.uid()
    )
);

-- Summary policies
CREATE POLICY "Rating summaries are viewable by everyone" ON agent_rating_summary FOR SELECT USING (true);

-- Prompt policies
CREATE POLICY "Users can view their own review prompts" ON review_prompts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own review prompts" ON review_prompts FOR UPDATE USING (user_id = auth.uid());
