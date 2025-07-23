#!/bin/bash

# Runtime Management Schema Deployment Script
# This script deploys the runtime tables directly to Supabase

echo "🚀 Deploying Runtime Management Schema to Supabase..."
echo ""

# Load environment variables
source .env.local

# Extract database URL from Supabase URL
SUPABASE_DB_URL="postgresql://postgres:4FdZEHwfO6kgMQPY@db.axaabtqsoksxrcgndtcq.supabase.co:5432/postgres"

echo "📄 Executing setup-runtime-tables.sql..."

# Execute the SQL file directly
if command -v psql &> /dev/null; then
    psql "$SUPABASE_DB_URL" -f setup-runtime-tables.sql
    echo ""
    echo "✅ Schema deployment completed via psql!"
else
    echo "⚠️  psql not found, using Node.js deployment script..."
    node scripts/deploy-runtime-schema.js
fi

echo ""
echo "🎉 Runtime Management System is ready!"
echo ""
echo "📋 Next steps:"
echo "   1. Start the development server: npm run dev"
echo "   2. Access Runtime Dashboard: http://localhost:3000/admin/runtime"
echo "   3. Test the system with: npm run test:runtime"
