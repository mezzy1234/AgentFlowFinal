# 🚀 AgentFlow.AI Production Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Infrastructure Requirements
- [ ] **Supabase Project**: Production instance configured
- [ ] **Vercel Account**: Pro plan for custom domains & enhanced performance  
- [ ] **Domain Setup**: Custom domain configured with SSL
- [ ] **Environment Variables**: All production secrets configured
- [ ] **Database**: Production PostgreSQL with backups enabled
- [ ] **CDN**: Asset optimization and global distribution
- [ ] **Monitoring**: Error tracking and performance monitoring
- [ ] **Security**: All API keys rotated and secured

### ✅ Environment Configuration

#### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/agentflow_prod
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication
NEXTAUTH_URL=https://agentflow.ai
NEXTAUTH_SECRET=your_super_secure_nextauth_secret

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OAuth Providers
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# System
ENCRYPTION_KEY=your_32_char_encryption_key
JWT_SECRET=your_jwt_secret
WEBHOOK_SECRET=your_webhook_secret

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
ANALYTICS_ID=your_analytics_id
```

## 🏗️ Database Deployment

### 1. Run Production Schema
```bash
# Connect to production Supabase
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Execute the complete schema
\i database/complete_production_schema.sql
```

### 2. Enable Row Level Security
```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE rowsecurity = true;

-- Create service role if needed
CREATE USER service_role WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
```

### 3. Configure Backups
```bash
# Set up automated backups
supabase db backup create production_backup_$(date +%Y%m%d)

# Schedule daily backups
echo "0 2 * * * supabase db backup create production_backup_\$(date +\%Y\%m\%d)" | crontab -
```

## 🚢 Vercel Deployment

### 1. Deploy to Production
```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod

# Set custom domain
vercel domains add agentflow.ai
vercel alias https://agentflow-xxx.vercel.app agentflow.ai
```

### 2. Configure Build Settings
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "devCommand": "npm run dev",
  "framework": "nextjs"
}
```

### 3. Environment Variables Setup
```bash
# Set production environment variables
vercel env add DATABASE_URL production
vercel env add SUPABASE_URL production
vercel env add STRIPE_SECRET_KEY production
# ... add all required env vars
```

## 🔐 Security Configuration

### 1. API Security
```typescript
// Rate limiting configuration
export const rateLimitConfig = {
  free: { requests: 100, window: '1h' },
  pro: { requests: 1000, window: '1h' },
  enterprise: { requests: 10000, window: '1h' }
};

// CORS configuration
export const corsConfig = {
  origin: [
    'https://agentflow.ai',
    'https://www.agentflow.ai',
    'https://app.agentflow.ai'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};
```

### 2. Content Security Policy
```typescript
const cspConfig = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
  'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
  'img-src': "'self' data: https: blob:",
  'font-src': "'self' https://fonts.gstatic.com",
  'connect-src': "'self' https://*.supabase.co https://api.stripe.com",
  'frame-src': "'self' https://js.stripe.com"
};
```

### 3. SSL & Headers
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
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
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};
```

## 📊 Monitoring & Analytics

### 1. Error Tracking (Sentry)
```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter sensitive data
    if (event.request?.headers?.authorization) {
      delete event.request.headers.authorization;
    }
    return event;
  }
});
```

### 2. Performance Monitoring
```typescript
// lib/analytics.ts
export const trackEvent = (eventName: string, properties: any) => {
  if (typeof window !== 'undefined') {
    // Google Analytics
    gtag('event', eventName, properties);
    
    // Custom analytics
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, properties })
    });
  }
};
```

### 3. Health Checks
```typescript
// pages/api/health.ts
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: 'connected', // Add actual DB check
    services: {
      supabase: 'operational',
      stripe: 'operational',
      oauth: 'operational'
    }
  };
  
  res.status(200).json(health);
}
```

## 🔄 CI/CD Pipeline

### 1. GitHub Actions Workflow
```yaml
# .github/workflows/production.yml
name: Production Deployment

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 2. Database Migrations
```bash
#!/bin/bash
# scripts/migrate.sh

echo "Running database migrations..."

# Backup current database
supabase db backup create pre_migration_$(date +%Y%m%d_%H%M%S)

# Run migrations
psql $DATABASE_URL -f database/migrations/latest.sql

# Verify migration
psql $DATABASE_URL -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"

echo "Migration completed successfully!"
```

## 📈 Performance Optimization

### 1. Next.js Configuration
```javascript
// next.config.js
module.exports = {
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['@supabase/ssr']
  },
  images: {
    domains: [
      'cdn.agentflow.ai',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com'
    ],
    formats: ['image/webp', 'image/avif']
  },
  async rewrites() {
    return [
      {
        source: '/api/webhook/:path*',
        destination: '/api/webhooks/:path*'
      }
    ];
  }
};
```

### 2. Caching Strategy
```typescript
// lib/cache.ts
export const cacheConfig = {
  static: 'public, max-age=31536000, immutable',
  api: 'public, max-age=60, s-maxage=300',
  dynamic: 'public, max-age=0, s-maxage=60',
  private: 'private, no-cache, no-store, must-revalidate'
};

// API route caching
export function withCache(handler: Function, ttl = 300) {
  return async (req: any, res: any) => {
    res.setHeader('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}`);
    return handler(req, res);
  };
}
```

### 3. Database Optimization
```sql
-- Create indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_search 
ON agents USING gin(to_tsvector('english', name || ' ' || description));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_executions_recent 
ON agent_executions(created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';

-- Optimize queries with EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT * FROM agents WHERE is_public = true ORDER BY download_count DESC LIMIT 20;
```

## 🔒 Backup & Recovery

### 1. Automated Backups
```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backups/agentflow"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump $DATABASE_URL > "$BACKUP_DIR/db_backup_$DATE.sql"

# File system backup (if using local storage)
tar -czf "$BACKUP_DIR/files_backup_$DATE.tar.gz" /var/www/uploads

# Upload to cloud storage
aws s3 cp "$BACKUP_DIR/db_backup_$DATE.sql" s3://agentflow-backups/
aws s3 cp "$BACKUP_DIR/files_backup_$DATE.tar.gz" s3://agentflow-backups/

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

### 2. Disaster Recovery Plan
```markdown
## Disaster Recovery Checklist

### Immediate Response (0-15 minutes)
1. Assess the scope of the outage
2. Activate incident response team
3. Communicate with stakeholders
4. Switch to maintenance mode if needed

### Short-term Recovery (15-60 minutes)
1. Restore from latest backup
2. Verify data integrity
3. Test critical functionality
4. Monitor system performance

### Long-term Recovery (1-24 hours)
1. Full system verification
2. Performance optimization
3. Post-incident analysis
4. Update recovery procedures
```

## 📱 Mobile & PWA

### 1. PWA Configuration
```json
// public/manifest.json
{
  "name": "AgentFlow.AI",
  "short_name": "AgentFlow",
  "description": "AI Automation Platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#0070f3",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 2. Service Worker
```typescript
// public/sw.js
const CACHE_NAME = 'agentflow-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/marketplace',
  '/static/css/main.css',
  '/static/js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

## 🎯 Go-Live Checklist

### Final Pre-Launch Steps
- [ ] **DNS Configuration**: A records pointing to Vercel
- [ ] **SSL Certificate**: Valid SSL certificate installed
- [ ] **Error Pages**: Custom 404, 500 error pages
- [ ] **Sitemap**: XML sitemap generated and submitted
- [ ] **Analytics**: Google Analytics/Mixpanel configured
- [ ] **Performance**: Core Web Vitals optimized
- [ ] **Security**: Security headers and CSP configured
- [ ] **Backup**: Initial production backup created
- [ ] **Monitoring**: Uptime monitoring configured
- [ ] **Documentation**: API docs published
- [ ] **Legal**: Privacy policy and terms updated

### Post-Launch Monitoring
- [ ] **24h Monitoring**: Watch for errors and performance issues
- [ ] **User Feedback**: Monitor support channels
- [ ] **Performance**: Track Core Web Vitals
- [ ] **Security**: Monitor for security incidents
- [ ] **Backup Verification**: Ensure backups are working
- [ ] **Load Testing**: Monitor under real traffic
- [ ] **Feature Flags**: Gradual rollout of new features

---

## 🚀 Launch Commands

```bash
# Final production deployment
npm run build
npm run test
vercel --prod

# Verify deployment
curl -f https://agentflow.ai/api/health || echo "Health check failed"

# Monitor logs
vercel logs agentflow.ai

echo "🎉 AgentFlow.AI is now live in production!"
```

---

*Production deployment guide for AgentFlow.AI - Enterprise SaaS Platform*
*Last updated: January 15, 2025*
