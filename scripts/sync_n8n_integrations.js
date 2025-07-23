#!/usr/bin/env node

/**
 * n8n Integration Sync Script
 * Fetches the latest integrations from n8n and syncs them to our database
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// n8n integrations categories mapping
const CATEGORY_MAPPING = {
  'Communication': 'Communication',
  'CRM': 'CRM',
  'Developer Tools': 'Developer',
  'E-Commerce': 'E-commerce',
  'File Management': 'Storage',
  'Marketing': 'Marketing',
  'Productivity': 'Productivity',
  'Social Networks': 'Social Media',
  'Finance': 'Finance',
  'Analytics': 'Analytics',
  'Project Management': 'Project Management',
  'HR': 'HR',
  'Sales': 'Sales',
  'Support': 'Support',
  'Utility': 'Utilities'
};

// Auth method mapping
const AUTH_METHOD_MAPPING = {
  'OAuth2': 'oauth2',
  'OAuth 2.0': 'oauth2',
  'API Key': 'api_key',
  'Basic Auth': 'basic_auth',
  'Webhook': 'webhook',
  'None': 'none'
};

class N8nIntegrationSync {
  constructor() {
    this.baseUrl = 'https://n8n.io';
    this.integrationsUrl = `${this.baseUrl}/integrations/`;
    this.syncedCount = 0;
    this.errorCount = 0;
    this.startTime = new Date();
  }

  /**
   * Main sync function
   */
  async sync() {
    console.log('🚀 Starting n8n integration sync...');
    console.log(`📅 Start time: ${this.startTime.toISOString()}`);

    try {
      // Method 1: Try to fetch from n8n's API if available
      let integrations = await this.fetchFromAPI();
      
      // Method 2: Fall back to web scraping
      if (!integrations || integrations.length === 0) {
        console.log('📡 API fetch failed, falling back to web scraping...');
        integrations = await this.scrapeIntegrationsPage();
      }

      // Method 3: Use hardcoded list as final fallback
      if (!integrations || integrations.length === 0) {
        console.log('🔧 Scraping failed, using hardcoded integration list...');
        integrations = this.getHardcodedIntegrations();
      }

      console.log(`📊 Found ${integrations.length} integrations to process`);

      // Process integrations in batches
      const batchSize = 50;
      for (let i = 0; i < integrations.length; i += batchSize) {
        const batch = integrations.slice(i, i + batchSize);
        await this.processBatch(batch);
      }

      // Update sync statistics
      await this.updateSyncStats();

      console.log('✅ Sync completed successfully!');
      console.log(`📈 Synced: ${this.syncedCount} integrations`);
      console.log(`❌ Errors: ${this.errorCount}`);
      console.log(`⏱️  Duration: ${Date.now() - this.startTime.getTime()}ms`);

    } catch (error) {
      console.error('💥 Sync failed:', error);
      process.exit(1);
    }
  }

  /**
   * Try to fetch integrations from n8n's API
   */
  async fetchFromAPI() {
    try {
      // n8n doesn't have a public API for this, but we'll check anyway
      const response = await axios.get('https://api.n8n.io/integrations', {
        timeout: 10000,
        headers: {
          'User-Agent': 'AgentFlow-Integration-Sync/1.0'
        }
      });
      
      return response.data?.integrations || null;
    } catch (error) {
      console.log('⚠️  n8n API not available, trying alternative methods...');
      return null;
    }
  }

  /**
   * Scrape integrations from n8n website
   */
  async scrapeIntegrationsPage() {
    try {
      console.log('🕷️  Scraping n8n integrations page...');
      
      const response = await axios.get(this.integrationsUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AgentFlow-Bot/1.0)'
        }
      });

      const $ = cheerio.load(response.data);
      const integrations = [];

      // Look for integration cards/items
      $('.integration-card, .node-card, [data-testid="integration-item"]').each((index, element) => {
        const $el = $(element);
        
        const name = $el.find('h3, .integration-name, .node-name').first().text().trim();
        const description = $el.find('p, .description').first().text().trim();
        const category = $el.find('.category, .tag').first().text().trim() || 'Utilities';
        const logoSrc = $el.find('img').first().attr('src');
        
        if (name) {
          integrations.push({
            name,
            description: description || `${name} integration`,
            category: CATEGORY_MAPPING[category] || 'Utilities',
            logoUrl: logoSrc ? this.resolveUrl(logoSrc) : null,
            type: 'both', // Most integrations support both trigger and action
            authMethod: 'api_key', // Default, will be refined later
            source: 'n8n_scrape'
          });
        }
      });

      console.log(`🎯 Scraped ${integrations.length} integrations`);
      return integrations;

    } catch (error) {
      console.error('🕸️  Scraping failed:', error.message);
      return null;
    }
  }

  /**
   * Hardcoded list of popular integrations as fallback
   */
  getHardcodedIntegrations() {
    return [
      // AI & ML
      { name: 'OpenAI', category: 'AI', type: 'action', authMethod: 'api_key', description: 'Access GPT-4, DALL-E, and Whisper APIs' },
      { name: 'Anthropic Claude', category: 'AI', type: 'action', authMethod: 'api_key', description: 'Claude AI for text generation and analysis' },
      { name: 'Google Gemini', category: 'AI', type: 'action', authMethod: 'oauth2', description: 'Google\'s multimodal AI model' },
      { name: 'Hugging Face', category: 'AI', type: 'action', authMethod: 'api_key', description: 'Machine learning models and datasets' },
      { name: 'Stability AI', category: 'AI', type: 'action', authMethod: 'api_key', description: 'Image generation with Stable Diffusion' },
      { name: 'ElevenLabs', category: 'AI', type: 'action', authMethod: 'api_key', description: 'Text-to-speech and voice cloning' },
      
      // Communication
      { name: 'Gmail', category: 'Communication', type: 'both', authMethod: 'oauth2', description: 'Send and receive emails' },
      { name: 'Outlook', category: 'Communication', type: 'both', authMethod: 'oauth2', description: 'Microsoft email service' },
      { name: 'Slack', category: 'Communication', type: 'both', authMethod: 'oauth2', description: 'Team communication platform' },
      { name: 'Discord', category: 'Communication', type: 'both', authMethod: 'webhook', description: 'Gaming and community chat' },
      { name: 'Twilio', category: 'Communication', type: 'both', authMethod: 'api_key', description: 'SMS, voice, and messaging' },
      { name: 'Telegram', category: 'Communication', type: 'both', authMethod: 'api_key', description: 'Secure messaging platform' },
      { name: 'WhatsApp Business', category: 'Communication', type: 'both', authMethod: 'api_key', description: 'Business messaging' },
      
      // CRM & Sales
      { name: 'HubSpot', category: 'CRM', type: 'both', authMethod: 'oauth2', description: 'Complete CRM and marketing platform' },
      { name: 'Salesforce', category: 'CRM', type: 'both', authMethod: 'oauth2', description: 'Enterprise CRM solution' },
      { name: 'Pipedrive', category: 'CRM', type: 'both', authMethod: 'api_key', description: 'Sales-focused CRM' },
      { name: 'Zoho CRM', category: 'CRM', type: 'both', authMethod: 'oauth2', description: 'Comprehensive business suite' },
      
      // E-commerce
      { name: 'Shopify', category: 'E-commerce', type: 'both', authMethod: 'oauth2', description: 'E-commerce platform' },
      { name: 'WooCommerce', category: 'E-commerce', type: 'both', authMethod: 'api_key', description: 'WordPress e-commerce' },
      { name: 'Stripe', category: 'Finance', type: 'both', authMethod: 'api_key', description: 'Online payment processing' },
      { name: 'PayPal', category: 'Finance', type: 'both', authMethod: 'oauth2', description: 'Digital payment platform' },
      { name: 'Square', category: 'Finance', type: 'both', authMethod: 'oauth2', description: 'Point of sale and payments' },
      
      // Productivity
      { name: 'Google Sheets', category: 'Productivity', type: 'both', authMethod: 'oauth2', description: 'Cloud spreadsheet application' },
      { name: 'Google Drive', category: 'Storage', type: 'both', authMethod: 'oauth2', description: 'Cloud file storage' },
      { name: 'Notion', category: 'Productivity', type: 'both', authMethod: 'api_key', description: 'All-in-one workspace' },
      { name: 'Airtable', category: 'Productivity', type: 'both', authMethod: 'api_key', description: 'Collaborative database' },
      { name: 'Trello', category: 'Project Management', type: 'both', authMethod: 'oauth2', description: 'Visual project management' },
      { name: 'Asana', category: 'Project Management', type: 'both', authMethod: 'oauth2', description: 'Team task management' },
      
      // Social Media
      { name: 'Twitter', category: 'Social Media', type: 'both', authMethod: 'oauth2', description: 'Social media platform' },
      { name: 'Facebook', category: 'Social Media', type: 'both', authMethod: 'oauth2', description: 'Social networking' },
      { name: 'Instagram', category: 'Social Media', type: 'both', authMethod: 'oauth2', description: 'Photo and video sharing' },
      { name: 'LinkedIn', category: 'Social Media', type: 'both', authMethod: 'oauth2', description: 'Professional networking' },
      { name: 'YouTube', category: 'Social Media', type: 'both', authMethod: 'oauth2', description: 'Video sharing platform' },
      { name: 'TikTok', category: 'Social Media', type: 'both', authMethod: 'oauth2', description: 'Short-form video platform' },
      
      // Marketing
      { name: 'Mailchimp', category: 'Marketing', type: 'both', authMethod: 'api_key', description: 'Email marketing platform' },
      { name: 'ConvertKit', category: 'Marketing', type: 'both', authMethod: 'api_key', description: 'Creator marketing platform' },
      { name: 'Klaviyo', category: 'Marketing', type: 'both', authMethod: 'api_key', description: 'E-commerce email marketing' },
      { name: 'ActiveCampaign', category: 'Marketing', type: 'both', authMethod: 'api_key', description: 'Customer experience automation' },
      
      // Calendar & Scheduling
      { name: 'Google Calendar', category: 'Calendar', type: 'both', authMethod: 'oauth2', description: 'Schedule management' },
      { name: 'Outlook Calendar', category: 'Calendar', type: 'both', authMethod: 'oauth2', description: 'Microsoft calendar' },
      { name: 'Calendly', category: 'Calendar', type: 'both', authMethod: 'api_key', description: 'Meeting scheduling' },
      { name: 'Acuity Scheduling', category: 'Calendar', type: 'both', authMethod: 'api_key', description: 'Appointment booking' },
      
      // File Storage
      { name: 'Dropbox', category: 'Storage', type: 'both', authMethod: 'oauth2', description: 'File hosting service' },
      { name: 'OneDrive', category: 'Storage', type: 'both', authMethod: 'oauth2', description: 'Microsoft cloud storage' },
      { name: 'Box', category: 'Storage', type: 'both', authMethod: 'oauth2', description: 'Enterprise file sharing' },
      { name: 'AWS S3', category: 'Storage', type: 'both', authMethod: 'api_key', description: 'Amazon cloud storage' },
      
      // Developer Tools
      { name: 'GitHub', category: 'Developer', type: 'both', authMethod: 'oauth2', description: 'Code repository hosting' },
      { name: 'GitLab', category: 'Developer', type: 'both', authMethod: 'oauth2', description: 'DevOps lifecycle tool' },
      { name: 'Jira', category: 'Developer', type: 'both', authMethod: 'oauth2', description: 'Issue tracking and project management' },
      { name: 'Linear', category: 'Developer', type: 'both', authMethod: 'oauth2', description: 'Modern issue tracking' },
      
      // Utilities
      { name: 'HTTP Request', category: 'Utilities', type: 'action', authMethod: 'none', description: 'Make custom HTTP requests' },
      { name: 'Webhook', category: 'Utilities', type: 'trigger', authMethod: 'webhook', description: 'Receive webhook data' },
      { name: 'Schedule Trigger', category: 'Utilities', type: 'trigger', authMethod: 'none', description: 'Time-based triggers' },
      { name: 'Code', category: 'Utilities', type: 'action', authMethod: 'none', description: 'Execute JavaScript code' }
    ].map(integration => ({
      ...integration,
      logoUrl: `/integrations/${integration.name.toLowerCase().replace(/\s+/g, '-')}.svg`,
      source: 'hardcoded'
    }));
  }

  /**
   * Process a batch of integrations
   */
  async processBatch(integrations) {
    console.log(`🔄 Processing batch of ${integrations.length} integrations...`);

    for (const integration of integrations) {
      try {
        await this.upsertIntegration(integration);
        this.syncedCount++;
      } catch (error) {
        console.error(`❌ Failed to sync integration "${integration.name}":`, error.message);
        this.errorCount++;
      }
    }
  }

  /**
   * Upsert an integration into the database
   */
  async upsertIntegration(integration) {
    const slug = this.generateSlug(integration.name);
    
    const integrationData = {
      name: integration.name,
      slug,
      category: integration.category || 'Utilities',
      type: integration.type || 'both',
      auth_method: integration.authMethod || 'api_key',
      logo_url: integration.logoUrl,
      description: integration.description || `${integration.name} integration`,
      is_popular: this.isPopularIntegration(integration.name),
      sync_source: integration.source || 'n8n',
      last_synced: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('integrations')
      .upsert(integrationData, {
        onConflict: 'slug',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Generate a URL-friendly slug from integration name
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }

  /**
   * Determine if an integration is popular
   */
  isPopularIntegration(name) {
    const popularIntegrations = [
      'OpenAI', 'Gmail', 'Slack', 'Google Sheets', 'Notion', 'Airtable',
      'HubSpot', 'Salesforce', 'Shopify', 'Stripe', 'Google Drive',
      'Twilio', 'Mailchimp', 'Google Calendar', 'Calendly', 'Dropbox',
      'Twitter', 'Facebook', 'Instagram', 'LinkedIn', 'YouTube'
    ];
    
    return popularIntegrations.some(popular => 
      name.toLowerCase().includes(popular.toLowerCase())
    );
  }

  /**
   * Resolve relative URLs to absolute URLs
   */
  resolveUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `${this.baseUrl}${url}`;
    return url;
  }

  /**
   * Update sync statistics
   */
  async updateSyncStats() {
    const { error } = await supabase
      .from('system_stats')
      .upsert({
        key: 'last_integration_sync',
        value: {
          timestamp: new Date().toISOString(),
          synced_count: this.syncedCount,
          error_count: this.errorCount,
          duration_ms: Date.now() - this.startTime.getTime()
        }
      });

    if (error) {
      console.warn('⚠️  Failed to update sync stats:', error.message);
    }
  }
}

// CLI execution
if (require.main === module) {
  const sync = new N8nIntegrationSync();
  sync.sync().catch(console.error);
}

module.exports = N8nIntegrationSync;
