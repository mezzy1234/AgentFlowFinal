-- Seed data for AgentFlow.AI
-- Run this after creating the schema to populate with sample data

-- Insert sample integrations
INSERT INTO integrations (name, category, type, auth_method, description, logo_url) VALUES
  ('Gmail', 'Email', 'both', 'oauth', 'Send and receive emails via Gmail', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/gmail.svg'),
  ('OpenAI', 'AI', 'action', 'api_key', 'Access GPT models for AI-powered automation', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/openai.svg'),
  ('Slack', 'Communication', 'both', 'oauth', 'Send messages and interact with Slack channels', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/slack.svg'),
  ('HubSpot', 'CRM', 'both', 'api_key', 'Manage contacts and deals in HubSpot', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/hubspot.svg'),
  ('Stripe', 'Payments', 'both', 'api_key', 'Process payments and manage subscriptions', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/stripe.svg'),
  ('Notion', 'Productivity', 'both', 'oauth', 'Create and update pages in Notion', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/notion.svg'),
  ('Airtable', 'Database', 'both', 'api_key', 'Manage records in Airtable bases', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/airtable.svg'),
  ('Twilio', 'Communication', 'action', 'api_key', 'Send SMS and make voice calls', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/twilio.svg'),
  ('Twitter', 'Social Media', 'both', 'oauth', 'Post tweets and interact with Twitter API', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/twitter.svg'),
  ('LinkedIn', 'Social Media', 'both', 'oauth', 'Post updates and manage LinkedIn connections', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/linkedin.svg'),
  ('Facebook', 'Social Media', 'action', 'oauth', 'Post to Facebook pages and groups', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg'),
  ('Salesforce', 'CRM', 'both', 'oauth', 'Manage leads and opportunities in Salesforce', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/salesforce.svg'),
  ('Mailchimp', 'Email Marketing', 'both', 'api_key', 'Manage email campaigns and subscribers', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/mailchimp.svg'),
  ('Zapier', 'Automation', 'both', 'api_key', 'Connect with 5000+ apps via Zapier', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/zapier.svg'),
  ('Google Sheets', 'Productivity', 'both', 'oauth', 'Read and write Google Sheets data', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlesheets.svg'),
  ('Discord', 'Communication', 'both', 'oauth', 'Send messages to Discord servers', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/discord.svg'),
  ('GitHub', 'Development', 'both', 'oauth', 'Manage repositories and issues on GitHub', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/github.svg'),
  ('Trello', 'Project Management', 'both', 'api_key', 'Create and manage Trello boards', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/trello.svg'),
  ('Asana', 'Project Management', 'both', 'oauth', 'Manage tasks and projects in Asana', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/asana.svg'),
  ('Jira', 'Development', 'both', 'api_key', 'Track issues and manage projects in Jira', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/jira.svg'),
  ('QuickBooks', 'Finance', 'both', 'oauth', 'Manage invoices and financial data', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/quickbooks.svg'),
  ('Shopify', 'E-commerce', 'both', 'api_key', 'Manage Shopify store data and orders', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/shopify.svg'),
  ('WooCommerce', 'E-commerce', 'both', 'api_key', 'Manage WooCommerce store and products', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/woocommerce.svg'),
  ('Calendly', 'Scheduling', 'both', 'api_key', 'Manage appointments and scheduling', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/calendly.svg'),
  ('Google Calendar', 'Scheduling', 'both', 'oauth', 'Create and manage calendar events', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlecalendar.svg'),
  ('Zoom', 'Video Conferencing', 'both', 'oauth', 'Create and manage Zoom meetings', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/zoom.svg'),
  ('Microsoft Teams', 'Communication', 'both', 'oauth', 'Send messages and manage Teams channels', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/microsoftteams.svg'),
  ('Dropbox', 'File Storage', 'both', 'oauth', 'Upload and manage files in Dropbox', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/dropbox.svg'),
  ('Google Drive', 'File Storage', 'both', 'oauth', 'Manage files and folders in Google Drive', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googledrive.svg'),
  ('OneDrive', 'File Storage', 'both', 'oauth', 'Access and manage OneDrive files', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/microsoftonedrive.svg'),
  ('YouTube', 'Video', 'action', 'oauth', 'Upload videos and manage YouTube channels', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/youtube.svg'),
  ('Instagram', 'Social Media', 'action', 'oauth', 'Post photos and stories to Instagram', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/instagram.svg'),
  ('TikTok', 'Social Media', 'action', 'api_key', 'Manage TikTok content and analytics', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/tiktok.svg'),
  ('Pinterest', 'Social Media', 'action', 'oauth', 'Create pins and manage Pinterest boards', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/pinterest.svg'),
  ('Reddit', 'Social Media', 'action', 'oauth', 'Post to Reddit communities', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/reddit.svg'),
  ('Webhook', 'Developer', 'both', 'none', 'Send HTTP requests to any webhook URL', NULL),
  ('HTTP Request', 'Developer', 'action', 'none', 'Make HTTP requests to any API', NULL),
  ('Email', 'Communication', 'action', 'none', 'Send emails via SMTP', NULL),
  ('SMS', 'Communication', 'action', 'api_key', 'Send SMS messages', NULL),
  ('RSS Feed', 'Content', 'trigger', 'none', 'Monitor RSS feeds for new content', NULL),
  ('Google Analytics', 'Analytics', 'both', 'oauth', 'Access website analytics data', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googleanalytics.svg'),
  ('Facebook Ads', 'Advertising', 'both', 'oauth', 'Manage Facebook advertising campaigns', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg'),
  ('Google Ads', 'Advertising', 'both', 'oauth', 'Manage Google advertising campaigns', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googleads.svg'),
  ('PayPal', 'Payments', 'both', 'api_key', 'Process PayPal payments', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/paypal.svg'),
  ('Square', 'Payments', 'both', 'api_key', 'Process Square payments', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/square.svg'),
  ('Intercom', 'Support', 'both', 'api_key', 'Manage customer conversations', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/intercom.svg'),
  ('Zendesk', 'Support', 'both', 'api_key', 'Manage support tickets and customers', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/zendesk.svg'),
  ('Freshdesk', 'Support', 'both', 'api_key', 'Handle customer support requests', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/freshworks.svg'),
  ('MongoDB', 'Database', 'both', 'api_key', 'Store and retrieve data from MongoDB', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/mongodb.svg'),
  ('PostgreSQL', 'Database', 'both', 'none', 'Connect to PostgreSQL databases', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/postgresql.svg'),
  ('MySQL', 'Database', 'both', 'none', 'Connect to MySQL databases', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/mysql.svg')
ON CONFLICT (name) DO NOTHING;

-- Create a test developer user (you'll need to sign up first to get the actual UUID)
-- This is just an example - replace with actual user IDs after signing up

-- Example agents (these would be created by developers)
-- Note: You'll need to replace developer_id with actual user UUIDs from your auth.users table

-- Insert sample agent bundles
-- INSERT INTO agent_bundles (name, description, price_one_time, developer_id) VALUES
-- ('Marketing Automation Suite', 'Complete marketing automation with email, social media, and lead generation', 99.00, 'your-developer-uuid'),
-- ('Sales Pipeline Optimizer', 'Streamline your sales process with CRM sync and lead scoring', 79.00, 'your-developer-uuid'),
-- ('Customer Support Pack', 'AI-powered support automation with multiple channels', 149.00, 'your-developer-uuid');

-- Add some sample webhook events for testing
INSERT INTO stripe_webhook_events (id, type, processed) VALUES
  ('evt_test_webhook', 'payment_intent.succeeded', true),
  ('evt_test_webhook2', 'customer.subscription.created', true)
ON CONFLICT (id) DO NOTHING;

-- Function to create sample agents for a developer (call this with a real user ID)
CREATE OR REPLACE FUNCTION create_sample_agents(dev_user_id UUID)
RETURNS VOID AS $$
DECLARE
  agent_id UUID;
  gmail_id UUID;
  openai_id UUID;
  slack_id UUID;
  hubspot_id UUID;
  stripe_id UUID;
  notion_id UUID;
BEGIN
  -- Get integration IDs
  SELECT id INTO gmail_id FROM integrations WHERE name = 'Gmail';
  SELECT id INTO openai_id FROM integrations WHERE name = 'OpenAI';
  SELECT id INTO slack_id FROM integrations WHERE name = 'Slack';
  SELECT id INTO hubspot_id FROM integrations WHERE name = 'HubSpot';
  SELECT id INTO stripe_id FROM integrations WHERE name = 'Stripe';
  SELECT id INTO notion_id FROM integrations WHERE name = 'Notion';

  -- AI Email Writer Agent
  INSERT INTO agents (
    name, description, price_one_time, webhook_url, tags, category, use_case,
    cover_image, published, developer_id, bundle_eligible
  ) VALUES (
    'AI Email Writer',
    'Generate personalized sales emails using AI. Connect Gmail + OpenAI for instant email automation that learns from your writing style.',
    49.00,
    'https://your-n8n-instance.com/webhook/ai-email-writer',
    ARRAY['Email', 'AI', 'Sales', 'Marketing'],
    'Marketing',
    'Automatically generate personalized sales emails based on prospect data and your communication style',
    'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=400&h=200&fit=crop',
    true,
    dev_user_id,
    true
  ) RETURNING id INTO agent_id;

  -- Add required integrations for AI Email Writer
  INSERT INTO agent_required_integrations (agent_id, integration_id, field_name, instructions) VALUES
    (agent_id, gmail_id, 'gmail_token', 'Connect your Gmail account to send emails'),
    (agent_id, openai_id, 'openai_api_key', 'Get your API key from OpenAI dashboard');

  -- Slack CRM Sync Agent
  INSERT INTO agents (
    name, description, price_monthly, webhook_url, tags, category, use_case,
    cover_image, published, developer_id
  ) VALUES (
    'Slack CRM Sync',
    'Automatically sync customer conversations from Slack to your CRM. Never lose track of important customer interactions again.',
    19.00,
    'https://your-n8n-instance.com/webhook/slack-crm-sync',
    ARRAY['CRM', 'Slack', 'Sales', 'Automation'],
    'Sales',
    'Keep your CRM updated with customer conversations happening in Slack channels',
    'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=200&fit=crop',
    true,
    dev_user_id
  ) RETURNING id INTO agent_id;

  -- Add required integrations for Slack CRM Sync
  INSERT INTO agent_required_integrations (agent_id, integration_id, field_name, instructions) VALUES
    (agent_id, slack_id, 'slack_token', 'Install our Slack app in your workspace'),
    (agent_id, hubspot_id, 'hubspot_api_key', 'Get your HubSpot API key from settings');

  -- Invoice Automation Agent
  INSERT INTO agents (
    name, description, price_one_time, webhook_url, tags, category, use_case,
    cover_image, published, developer_id
  ) VALUES (
    'Invoice Automation',
    'Automatically generate and send invoices when Stripe payments are received. Integrates with QuickBooks for accounting.',
    39.00,
    'https://your-n8n-instance.com/webhook/invoice-automation',
    ARRAY['Finance', 'Automation', 'Invoicing', 'Stripe'],
    'Finance',
    'Streamline your billing process with automatic invoice generation and delivery',
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop',
    true,
    dev_user_id
  ) RETURNING id INTO agent_id;

  -- Add required integrations for Invoice Automation
  INSERT INTO agent_required_integrations (agent_id, integration_id, field_name, instructions) VALUES
    (agent_id, stripe_id, 'stripe_api_key', 'Connect your Stripe account for payment webhooks'),
    (agent_id, gmail_id, 'gmail_token', 'Connect Gmail to send invoice emails');

  -- Meeting Notes AI Agent
  INSERT INTO agents (
    name, description, price_monthly, webhook_url, tags, category, use_case,
    cover_image, published, developer_id, featured
  ) VALUES (
    'Meeting Notes AI',
    'Automatically generate meeting notes and action items from Zoom recordings using AI. Saves to Notion for easy access.',
    29.00,
    'https://your-n8n-instance.com/webhook/meeting-notes-ai',
    ARRAY['AI', 'Productivity', 'Meetings', 'Notion'],
    'Productivity',
    'Turn meeting recordings into actionable notes and tasks automatically',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop',
    true,
    dev_user_id,
    true
  ) RETURNING id INTO agent_id;

  -- Add required integrations for Meeting Notes AI
  INSERT INTO agent_required_integrations (agent_id, integration_id, field_name, instructions) VALUES
    (agent_id, openai_id, 'openai_api_key', 'Get your OpenAI API key for transcription and summarization'),
    (agent_id, notion_id, 'notion_token', 'Connect Notion to save meeting notes');

END;
$$ LANGUAGE plpgsql;

-- Instructions for using this seed data:
-- 1. Create your database schema first
-- 2. Sign up a developer account in your app
-- 3. Find the user UUID in auth.users table
-- 4. Run: SELECT create_sample_agents('your-actual-user-uuid-here');

-- Create some sample reviews (you'll need actual user and agent IDs)
-- INSERT INTO agent_reviews (agent_id, user_id, rating, comment) VALUES
-- ('agent-uuid-here', 'user-uuid-here', 5, 'Amazing agent! Saves me hours every week.'),
-- ('agent-uuid-here', 'user-uuid-here', 4, 'Works great, would love more customization options.');

-- Create function to add sample reviews for an agent
CREATE OR REPLACE FUNCTION add_sample_reviews(target_agent_id UUID, reviewer_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO agent_reviews (agent_id, user_id, rating, comment) VALUES
    (target_agent_id, reviewer_user_id, 5, 'This agent is a game-changer! The AI-generated emails are incredibly natural and personalized.'),
    (target_agent_id, reviewer_user_id, 4, 'Great functionality, easy setup. Would love to see more email templates.'),
    (target_agent_id, reviewer_user_id, 5, 'Saves me 2-3 hours per day on email outreach. ROI is incredible.'),
    (target_agent_id, reviewer_user_id, 4, 'Very impressed with the quality. Minor issue with Gmail integration but support fixed it quickly.');
END;
$$ LANGUAGE plpgsql;
