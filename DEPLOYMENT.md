# Production Deployment Guide for AgentFlow.AI

## Overview
AgentFlow.AI is a production-ready SaaS platform built with Next.js 14, Supabase, and Stripe. This guide covers deployment to Vercel with all necessary configurations.

## Pre-Deployment Checklist

### 1. Environment Variables
Create a `.env.production` file with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Database
DATABASE_URL=postgresql://your_production_database_url

# App Configuration
NEXTAUTH_SECRET=your_nextauth_secret_32_chars_min
NEXTAUTH_URL=https://your-domain.com
NODE_ENV=production

# Email Configuration (Optional)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
FROM_EMAIL=noreply@yourdomain.com

# Analytics (Optional)
GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
POSTHOG_KEY=your_posthog_key
SENTRY_DSN=your_sentry_dsn

# Security
CORS_ORIGIN=https://your-domain.com
API_RATE_LIMIT=100
```

### 2. Database Setup
Run the production database migrations:

```sql
-- Apply production extensions
\i supabase/production_extensions.sql

-- Verify all tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
-- ... (enable for all tables)

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_developer_id ON agents(developer_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_user_id ON user_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_user_id ON purchase_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
```

### 3. Build Configuration
Optimize the build for production:

```json
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  images: {
    domains: [
      'localhost',
      'your-domain.com',
      'supabase-storage-domain.com',
      'avatars.githubusercontent.com'
    ],
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co'
      }
    ]
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.CORS_ORIGIN || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  }
}

module.exports = nextConfig
```

## Deployment Steps

### 1. Vercel Deployment

#### A. Install Vercel CLI
```bash
npm i -g vercel
vercel login
```

#### B. Connect Repository
```bash
# In your project root
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your personal account or team
# - Link to existing project? No (for first deployment)
# - What's your project's name? agentflow-ai
# - In which directory is your code located? ./
```

#### C. Configure Environment Variables
```bash
# Set production environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add STRIPE_SECRET_KEY production
# ... add all environment variables
```

#### D. Deploy
```bash
vercel --prod
```

### 2. Domain Configuration

#### A. Custom Domain Setup
```bash
# Add custom domain
vercel domains add yourdomain.com

# Configure DNS records:
# Type: CNAME
# Name: @ (or www)
# Value: cname.vercel-dns.com
```

#### B. SSL Certificate
Vercel automatically provisions SSL certificates for custom domains.

### 3. Database Optimization

#### A. Connection Pooling
Configure Supabase connection pooling:

```javascript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-my-custom-header': 'my-app-name',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// For server-side operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

### 4. Stripe Webhook Configuration

#### A. Production Webhook Setup
1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook secret to environment variables

#### B. Test Webhook
```bash
# Test webhook endpoint
curl -X POST https://yourdomain.com/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test" \
  -d '{"test": true}'
```

### 5. Performance Optimization

#### A. Bundle Analysis
```bash
# Install bundle analyzer
npm install @next/bundle-analyzer

# Analyze bundle
ANALYZE=true npm run build
```

#### B. CDN Configuration
Vercel automatically serves static assets from CDN.

#### C. Database Queries Optimization
- Add database indexes for frequently queried fields
- Use connection pooling
- Implement query caching where appropriate

### 6. Monitoring Setup

#### A. Error Tracking (Sentry)
```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})
```

#### B. Analytics (Vercel Analytics)
```bash
npm install @vercel/analytics
```

```javascript
// pages/_app.tsx
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
```

### 7. Security Configuration

#### A. Content Security Policy
```javascript
// next.config.js
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' js.stripe.com;
  child-src 'none';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  media-src 'none';
  connect-src 'self' *.supabase.co api.stripe.com;
  font-src 'self';
`

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'false'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      }
    ]
  },
}
```

## Post-Deployment Tasks

### 1. Health Checks
```bash
# API health check
curl https://yourdomain.com/api/health

# Database connectivity
curl https://yourdomain.com/api/health/db

# Stripe connection
curl https://yourdomain.com/api/health/stripe
```

### 2. Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Run load test
artillery quick --count 10 --num 25 https://yourdomain.com
```

### 3. SEO Setup
- Configure sitemap.xml
- Set up robots.txt
- Add Google Search Console
- Configure OpenGraph tags

### 4. Backup Strategy
- Supabase automatic backups (enabled by default)
- Export important configuration
- Document recovery procedures

## Scaling Considerations

### 1. Database Scaling
- Monitor connection count
- Consider read replicas for heavy read workloads
- Implement caching strategy (Redis)

### 2. Application Scaling
- Vercel automatically scales
- Monitor function execution times
- Optimize cold start times

### 3. CDN and Caching
- Implement appropriate cache headers
- Use Vercel Edge Functions for global distribution
- Consider implementing service worker for offline capability

## Maintenance

### 1. Regular Updates
```bash
# Update dependencies monthly
npm audit
npm update
```

### 2. Security Monitoring
- Monitor Supabase logs
- Set up Vercel security notifications
- Regular security audits

### 3. Performance Monitoring
- Core Web Vitals monitoring
- Database performance metrics
- API response time monitoring

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check environment variables
   - Verify TypeScript compilation
   - Review build logs

2. **Database Connection Issues**
   - Verify connection string
   - Check connection limits
   - Review RLS policies

3. **Stripe Webhook Issues**
   - Verify webhook secret
   - Check endpoint URL
   - Review webhook logs in Stripe Dashboard

### Emergency Procedures

1. **Rollback Deployment**
   ```bash
   vercel rollback
   ```

2. **Database Emergency Access**
   - Use Supabase dashboard
   - Direct SQL access via psql
   - Backup restoration procedures

This deployment guide ensures a production-ready, secure, and scalable deployment of AgentFlow.AI.
