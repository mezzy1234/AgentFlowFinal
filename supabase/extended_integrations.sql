-- Extended integration system for AgentFlow.AI
-- Add additional integrations like n8n has

-- Add more integration categories
INSERT INTO integrations (name, category, type, auth_method, description, logo_url) VALUES
  -- Email & Communication
  ('Outlook', 'Email', 'both', 'oauth', 'Send and receive emails via Microsoft Outlook', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/microsoftoutlook.svg'),
  ('Mailgun', 'Email', 'action', 'api_key', 'Transactional email delivery service', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/mailgun.svg'),
  ('SendGrid', 'Email Marketing', 'action', 'api_key', 'Email delivery and marketing platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/sendgrid.svg'),
  ('Telegram', 'Communication', 'both', 'api_key', 'Send messages via Telegram bots', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/telegram.svg'),
  ('WhatsApp Business', 'Communication', 'both', 'api_key', 'Send WhatsApp messages via Business API', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/whatsapp.svg'),
  ('Microsoft Teams', 'Communication', 'both', 'oauth', 'Send messages and manage Teams channels', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/microsoftteams.svg'),
  
  -- CRM & Sales
  ('Pipedrive', 'CRM', 'both', 'api_key', 'Manage deals and contacts in Pipedrive', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/pipedrive.svg'),
  ('Zoho CRM', 'CRM', 'both', 'oauth', 'Manage customer relationships with Zoho', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/zoho.svg'),
  ('Close.com', 'CRM', 'both', 'api_key', 'Sales CRM for inside sales teams', NULL),
  ('ActiveCampaign', 'CRM', 'both', 'api_key', 'Email marketing and CRM automation', NULL),
  ('ConvertKit', 'Email Marketing', 'both', 'api_key', 'Email marketing for creators', NULL),
  
  -- Project Management
  ('Monday.com', 'Project Management', 'both', 'oauth', 'Work management platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/monday.svg'),
  ('ClickUp', 'Project Management', 'both', 'api_key', 'All-in-one workspace for teams', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/clickup.svg'),
  ('Basecamp', 'Project Management', 'both', 'oauth', 'Project management and team collaboration', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/basecamp.svg'),
  ('Linear', 'Development', 'both', 'api_key', 'Issue tracking for software teams', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/linear.svg'),
  
  -- E-commerce & Payments
  ('WooCommerce', 'E-commerce', 'both', 'api_key', 'WordPress e-commerce platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/woocommerce.svg'),
  ('Magento', 'E-commerce', 'both', 'api_key', 'Enterprise e-commerce platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/magento.svg'),
  ('BigCommerce', 'E-commerce', 'both', 'api_key', 'Enterprise e-commerce solution', NULL),
  ('Square', 'Payments', 'both', 'oauth', 'Payment processing and POS system', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/square.svg'),
  ('Razorpay', 'Payments', 'both', 'api_key', 'Payment gateway for India', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/razorpay.svg'),
  
  -- Marketing & Analytics
  ('Google Analytics 4', 'Analytics', 'trigger', 'oauth', 'Website and app analytics', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googleanalytics.svg'),
  ('Mixpanel', 'Analytics', 'both', 'api_key', 'Product analytics platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/mixpanel.svg'),
  ('Amplitude', 'Analytics', 'both', 'api_key', 'Digital analytics platform', NULL),
  ('Hotjar', 'Analytics', 'trigger', 'api_key', 'User behavior analytics', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/hotjar.svg'),
  ('Facebook Pixel', 'Advertising', 'action', 'api_key', 'Facebook advertising pixel', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg'),
  
  -- File Storage & Documents
  ('Box', 'File Storage', 'both', 'oauth', 'Enterprise file sharing platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/box.svg'),
  ('SharePoint', 'File Storage', 'both', 'oauth', 'Microsoft collaboration platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/microsoftsharepoint.svg'),
  ('Adobe Creative Cloud', 'Design', 'both', 'oauth', 'Creative design tools integration', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/adobe.svg'),
  ('Figma', 'Design', 'both', 'oauth', 'Collaborative design tool', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/figma.svg'),
  
  -- AI & Machine Learning
  ('Anthropic Claude', 'AI', 'action', 'api_key', 'Claude AI assistant API', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/anthropic.svg'),
  ('Google Gemini', 'AI', 'action', 'api_key', 'Google Gemini AI models', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/google.svg'),
  ('Cohere', 'AI', 'action', 'api_key', 'Language model API', NULL),
  ('Hugging Face', 'AI', 'both', 'api_key', 'Open source AI model hub', NULL),
  ('Replicate', 'AI', 'action', 'api_key', 'Run AI models in the cloud', NULL),
  ('ElevenLabs', 'AI', 'action', 'api_key', 'AI voice generation', NULL),
  ('Whisper API', 'AI', 'action', 'api_key', 'Speech-to-text transcription', NULL),
  
  -- Social Media Extended
  ('TikTok Business', 'Social Media', 'action', 'oauth', 'TikTok advertising and content', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/tiktok.svg'),
  ('Snapchat Ads', 'Advertising', 'action', 'oauth', 'Snapchat advertising platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/snapchat.svg'),
  ('Buffer', 'Social Media', 'action', 'oauth', 'Social media scheduling tool', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/buffer.svg'),
  ('Hootsuite', 'Social Media', 'action', 'oauth', 'Social media management platform', NULL),
  
  -- Video & Content
  ('Vimeo', 'Video', 'both', 'oauth', 'Professional video hosting', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/vimeo.svg'),
  ('Loom', 'Video', 'both', 'oauth', 'Screen recording and sharing', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/loom.svg'),
  ('Canva', 'Design', 'both', 'oauth', 'Graphic design platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/canva.svg'),
  
  -- Developer Tools
  ('GitLab', 'Development', 'both', 'oauth', 'DevOps platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/gitlab.svg'),
  ('Bitbucket', 'Development', 'both', 'oauth', 'Git repository hosting', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/bitbucket.svg'),
  ('Jenkins', 'Development', 'both', 'api_key', 'CI/CD automation server', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/jenkins.svg'),
  ('Docker', 'Development', 'both', 'api_key', 'Container platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/docker.svg'),
  ('AWS', 'Cloud', 'both', 'api_key', 'Amazon Web Services', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/amazonaws.svg'),
  ('Google Cloud', 'Cloud', 'both', 'oauth', 'Google Cloud Platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlecloud.svg'),
  ('Azure', 'Cloud', 'both', 'oauth', 'Microsoft Azure', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/microsoftazure.svg'),
  
  -- Productivity Tools
  ('Todoist', 'Productivity', 'both', 'oauth', 'Task management application', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/todoist.svg'),
  ('Evernote', 'Productivity', 'both', 'oauth', 'Note-taking application', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/evernote.svg'),
  ('OneNote', 'Productivity', 'both', 'oauth', 'Microsoft note-taking app', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/microsoftonenote.svg'),
  ('Obsidian', 'Productivity', 'both', 'none', 'Knowledge management tool', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/obsidian.svg'),
  
  -- Finance & Accounting
  ('Xero', 'Finance', 'both', 'oauth', 'Cloud accounting software', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/xero.svg'),
  ('FreshBooks', 'Finance', 'both', 'oauth', 'Accounting software for small business', NULL),
  ('Wave Accounting', 'Finance', 'both', 'oauth', 'Free accounting software', NULL),
  ('Plaid', 'Finance', 'both', 'api_key', 'Financial data connectivity', NULL),
  ('Mint', 'Finance', 'trigger', 'oauth', 'Personal finance management', NULL),
  
  -- Event & Booking
  ('Eventbrite', 'Events', 'both', 'oauth', 'Event management platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/eventbrite.svg'),
  ('Meetup', 'Events', 'both', 'oauth', 'Event organization platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/meetup.svg'),
  ('Acuity Scheduling', 'Scheduling', 'both', 'api_key', 'Online appointment scheduling', NULL),
  ('Bookly', 'Scheduling', 'both', 'api_key', 'WordPress booking plugin', NULL),
  
  -- Survey & Forms
  ('Typeform', 'Forms', 'both', 'oauth', 'Online form builder', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/typeform.svg'),
  ('SurveyMonkey', 'Forms', 'both', 'oauth', 'Online survey platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/surveymonkey.svg'),
  ('Google Forms', 'Forms', 'both', 'oauth', 'Free form builder from Google', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googleforms.svg'),
  ('JotForm', 'Forms', 'both', 'api_key', 'Online form builder', NULL),
  
  -- Real Estate & Location
  ('Zillow', 'Real Estate', 'trigger', 'api_key', 'Real estate listings and data', NULL),
  ('Google Maps', 'Location', 'both', 'api_key', 'Maps and location services', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlemaps.svg'),
  ('Mapbox', 'Location', 'both', 'api_key', 'Custom maps platform', NULL),
  
  -- Health & Fitness
  ('Fitbit', 'Health', 'trigger', 'oauth', 'Fitness tracker integration', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/fitbit.svg'),
  ('MyFitnessPal', 'Health', 'trigger', 'oauth', 'Nutrition tracking app', NULL),
  ('Strava', 'Health', 'trigger', 'oauth', 'Fitness activity tracker', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/strava.svg'),
  
  -- Travel & Transportation
  ('Uber', 'Transportation', 'action', 'oauth', 'Ride-sharing service', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/uber.svg'),
  ('Lyft', 'Transportation', 'action', 'oauth', 'Ride-sharing platform', NULL),
  ('Airbnb', 'Travel', 'both', 'oauth', 'Home sharing platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/airbnb.svg'),
  
  -- News & Content
  ('RSS', 'Content', 'trigger', 'none', 'RSS feed monitoring', NULL),
  ('Reddit API', 'Social Media', 'both', 'oauth', 'Reddit content integration', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/reddit.svg'),
  ('Medium', 'Content', 'action', 'oauth', 'Publishing platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/medium.svg'),
  ('Substack', 'Content', 'action', 'api_key', 'Newsletter platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/substack.svg'),
  
  -- Crypto & Blockchain
  ('Coinbase', 'Crypto', 'both', 'oauth', 'Cryptocurrency exchange', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/coinbase.svg'),
  ('Binance', 'Crypto', 'both', 'api_key', 'Cryptocurrency trading platform', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/binance.svg'),
  ('Ethereum', 'Blockchain', 'both', 'api_key', 'Ethereum blockchain integration', 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/ethereum.svg'),
  
  -- Weather & Environment
  ('OpenWeatherMap', 'Weather', 'trigger', 'api_key', 'Weather data and forecasts', NULL),
  ('AccuWeather', 'Weather', 'trigger', 'api_key', 'Weather information service', NULL),
  
  -- Generic/Utility
  ('Webhook Incoming', 'Developer', 'trigger', 'none', 'Receive HTTP webhooks from any source', NULL),
  ('Webhook Outgoing', 'Developer', 'action', 'none', 'Send HTTP requests to any endpoint', NULL),
  ('Schedule', 'Automation', 'trigger', 'none', 'Time-based triggers (cron, intervals)', NULL),
  ('Wait/Delay', 'Automation', 'action', 'none', 'Add delays between actions', NULL),
  ('Code Executor', 'Developer', 'action', 'none', 'Run JavaScript/Python code', NULL),
  ('If/Else Logic', 'Automation', 'action', 'none', 'Conditional logic branching', NULL),
  ('Data Transform', 'Automation', 'action', 'none', 'Transform and manipulate data', NULL),
  ('Email Parser', 'Email', 'trigger', 'none', 'Parse structured data from emails', NULL),
  ('PDF Generator', 'Documents', 'action', 'none', 'Generate PDF documents', NULL),
  ('QR Code Generator', 'Utilities', 'action', 'none', 'Generate QR codes', NULL),
  ('URL Shortener', 'Utilities', 'action', 'none', 'Shorten URLs', NULL),
  ('Text-to-Speech', 'AI', 'action', 'api_key', 'Convert text to speech', NULL),
  ('OCR Text Recognition', 'AI', 'action', 'api_key', 'Extract text from images', NULL)
ON CONFLICT (name) DO NOTHING;

-- Update agent_required_integrations table to support more flexible credential definitions
ALTER TABLE agent_required_integrations 
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS credential_type VARCHAR(50) DEFAULT 'api_key',
ADD COLUMN IF NOT EXISTS oauth_scopes TEXT[],
ADD COLUMN IF NOT EXISTS placeholder_text TEXT,
ADD COLUMN IF NOT EXISTS validation_regex TEXT;
