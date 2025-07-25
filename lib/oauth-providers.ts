export interface ProviderConfig {
  name: string;
  type: 'oauth1' | 'oauth2' | 'api_key' | 'bot_token' | 'service_account';
  authUrl: string;
  tokenUrl?: string;
  scopes?: string[];
  clientId?: string;
  clientSecret?: string;
  description?: string;
}

// Comprehensive OAuth provider configurations
export const OAUTH_PROVIDERS: Record<string, ProviderConfig> = {
  // Communication & Messaging
  slack: {
    name: 'Slack',
    type: 'oauth2',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['channels:read', 'chat:write', 'users:read'],
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET
  },
  discord: {
    name: 'Discord',
    type: 'oauth2',
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    scopes: ['bot', 'messages.read'],
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET
  },
  telegram: {
    name: 'Telegram',
    type: 'bot_token',
    authUrl: 'https://core.telegram.org/bots',
    description: 'Use BotFather to create a bot and get token'
  },
  whatsapp: {
    name: 'WhatsApp Business',
    type: 'oauth2',
    authUrl: 'https://developers.facebook.com/docs/whatsapp',
    tokenUrl: 'https://graph.facebook.com/oauth/access_token',
    scopes: ['whatsapp_business_messaging'],
    clientId: process.env.WHATSAPP_CLIENT_ID,
    clientSecret: process.env.WHATSAPP_CLIENT_SECRET
  },

  // Productivity & Collaboration
  notion: {
    name: 'Notion',
    type: 'oauth2',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: ['read', 'write'],
    clientId: process.env.NOTION_CLIENT_ID,
    clientSecret: process.env.NOTION_CLIENT_SECRET
  },
  airtable: {
    name: 'Airtable',
    type: 'oauth2',
    authUrl: 'https://airtable.com/oauth2/v1/authorize',
    tokenUrl: 'https://airtable.com/oauth2/v1/token',
    scopes: ['data.records:read', 'data.records:write'],
    clientId: process.env.AIRTABLE_CLIENT_ID,
    clientSecret: process.env.AIRTABLE_CLIENT_SECRET
  },
  trello: {
    name: 'Trello',
    type: 'oauth1',
    authUrl: 'https://trello.com/1/authorize',
    tokenUrl: 'https://trello.com/1/OAuthGetAccessToken',
    scopes: ['read', 'write'],
    clientId: process.env.TRELLO_CLIENT_ID,
    clientSecret: process.env.TRELLO_CLIENT_SECRET
  },

  // Development & Code
  github: {
    name: 'GitHub',
    type: 'oauth2',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'user'],
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET
  },
  gitlab: {
    name: 'GitLab',
    type: 'oauth2',
    authUrl: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token',
    scopes: ['api', 'read_user'],
    clientId: process.env.GITLAB_CLIENT_ID,
    clientSecret: process.env.GITLAB_CLIENT_SECRET
  },

  // Social Media & Marketing
  twitter: {
    name: 'Twitter/X',
    type: 'oauth2',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'tweet.write', 'users.read'],
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET
  },
  linkedin: {
    name: 'LinkedIn',
    type: 'oauth2',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['r_liteprofile', 'w_member_social'],
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET
  },
  facebook: {
    name: 'Facebook',
    type: 'oauth2',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: ['pages_manage_posts', 'pages_read_engagement'],
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET
  },
  instagram: {
    name: 'Instagram',
    type: 'oauth2',
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scopes: ['user_profile', 'user_media'],
    clientId: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET
  },

  // E-commerce & Payments
  shopify: {
    name: 'Shopify',
    type: 'oauth2',
    authUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize',
    tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token',
    scopes: ['read_products', 'write_products', 'read_orders'],
    clientId: process.env.SHOPIFY_CLIENT_ID,
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET
  },
  stripe: {
    name: 'Stripe',
    type: 'oauth2',
    authUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    scopes: ['read_write'],
    clientId: process.env.STRIPE_CLIENT_ID,
    clientSecret: process.env.STRIPE_CLIENT_SECRET
  },
  paypal: {
    name: 'PayPal',
    type: 'oauth2',
    authUrl: 'https://www.paypal.com/signin/authorize',
    tokenUrl: 'https://api.paypal.com/v1/oauth2/token',
    scopes: ['openid', 'profile'],
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET
  },

  // Cloud Services & Storage
  google_drive: {
    name: 'Google Drive',
    type: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/drive'],
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  },
  google_sheets: {
    name: 'Google Sheets',
    type: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  },
  dropbox: {
    name: 'Dropbox',
    type: 'oauth2',
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    scopes: ['files.content.read', 'files.content.write'],
    clientId: process.env.DROPBOX_CLIENT_ID,
    clientSecret: process.env.DROPBOX_CLIENT_SECRET
  },

  // Email & Communication
  gmail: {
    name: 'Gmail',
    type: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  },
  outlook: {
    name: 'Outlook',
    type: 'oauth2',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['https://graph.microsoft.com/Mail.Send'],
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET
  },

  // Analytics & Marketing
  google_analytics: {
    name: 'Google Analytics',
    type: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  },
  hubspot: {
    name: 'HubSpot',
    type: 'oauth2',
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    scopes: ['contacts', 'content'],
    clientId: process.env.HUBSPOT_CLIENT_ID,
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET
  },
  mailchimp: {
    name: 'Mailchimp',
    type: 'oauth2',
    authUrl: 'https://login.mailchimp.com/oauth2/authorize',
    tokenUrl: 'https://login.mailchimp.com/oauth2/token',
    scopes: ['read', 'write'],
    clientId: process.env.MAILCHIMP_CLIENT_ID,
    clientSecret: process.env.MAILCHIMP_CLIENT_SECRET
  },

  // AI & API Services
  openai: {
    name: 'OpenAI',
    type: 'api_key',
    authUrl: 'https://platform.openai.com/api-keys',
    description: 'Get your API key from OpenAI platform'
  },
  anthropic: {
    name: 'Anthropic',
    type: 'api_key',
    authUrl: 'https://console.anthropic.com/',
    description: 'Get your API key from Anthropic console'
  },
  replicate: {
    name: 'Replicate',
    type: 'api_key',
    authUrl: 'https://replicate.com/account/api-tokens',
    description: 'Get your API token from Replicate'
  },

  // Customer Support
  zendesk: {
    name: 'Zendesk',
    type: 'oauth2',
    authUrl: 'https://{subdomain}.zendesk.com/oauth/authorizations/new',
    tokenUrl: 'https://{subdomain}.zendesk.com/oauth/tokens',
    scopes: ['read', 'write'],
    clientId: process.env.ZENDESK_CLIENT_ID,
    clientSecret: process.env.ZENDESK_CLIENT_SECRET
  },
  intercom: {
    name: 'Intercom',
    type: 'oauth2',
    authUrl: 'https://app.intercom.com/oauth',
    tokenUrl: 'https://api.intercom.io/auth/eagle/token',
    scopes: ['read', 'write'],
    clientId: process.env.INTERCOM_CLIENT_ID,
    clientSecret: process.env.INTERCOM_CLIENT_SECRET
  },

  // Database & Backend
  mongodb: {
    name: 'MongoDB Atlas',
    type: 'api_key',
    authUrl: 'https://cloud.mongodb.com/',
    description: 'Use connection string with credentials'
  },
  supabase: {
    name: 'Supabase',
    type: 'api_key',
    authUrl: 'https://supabase.com/dashboard/project/_/settings/api',
    description: 'Get your API key and URL from project settings'
  },
  firebase: {
    name: 'Firebase',
    type: 'service_account',
    authUrl: 'https://console.firebase.google.com/',
    description: 'Download service account key from project settings'
  }
};

export type OAuthProvider = keyof typeof OAUTH_PROVIDERS;

export function getProviderConfig(provider: string): ProviderConfig | null {
  return OAUTH_PROVIDERS[provider as OAuthProvider] || null;
}

export function getAllProviders(): Record<string, ProviderConfig> {
  return OAUTH_PROVIDERS;
}

export function getProvidersByType(type: ProviderConfig['type']): Record<string, ProviderConfig> {
  return Object.fromEntries(
    Object.entries(OAUTH_PROVIDERS).filter(([_, config]) => config.type === type)
  );
}
