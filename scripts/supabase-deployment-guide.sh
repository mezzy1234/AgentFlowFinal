#!/bin/bash

# Supabase Runtime Tables Deployment Guide
# This will help you deploy the Agent Runtime Management tables

echo "🚀 Supabase Runtime Tables Deployment Guide"
echo "============================================="
echo ""

echo "📋 OPTION 1: Using Supabase Dashboard (Recommended)"
echo "1. Go to https://supabase.com/dashboard"
echo "2. Select your project: axaabtqsoksxrcgndtcq"
echo "3. Go to 'SQL Editor' in the left sidebar"
echo "4. Click 'New Query'"
echo "5. Copy and paste the contents of setup-runtime-tables.sql"
echo "6. Click 'Run' to execute the SQL"
echo ""

echo "📋 OPTION 2: Using Supabase CLI"
echo "1. Install Supabase CLI: npm install -g supabase"
echo "2. Login: supabase login"
echo "3. Link project: supabase link --project-ref axaabtqsoksxrcgndtcq"
echo "4. Run: supabase db push"
echo ""

echo "📋 OPTION 3: Direct SQL Execution (Advanced)"
echo "1. Use psql with connection string"
echo "2. Or use any PostgreSQL client"
echo ""

echo "✅ After deployment, you'll have these tables:"
echo "   • organization_runtimes - Runtime instances per org"
echo "   • agent_memory_pools - Memory management"
echo "   • agent_memory_states - Agent memory persistence"
echo "   • runtime_metrics - Performance data"
echo "   • runtime_execution_events - Execution logs"
echo "   • container_execution_metrics - Container performance"
echo "   • container_timeout_events - Timeout tracking"
echo "   • container_error_events - Error logging"
echo ""

echo "🎯 What to do next:"
echo "1. Deploy the tables using one of the options above"
echo "2. Your app is already configured with the correct Supabase credentials"
echo "3. Visit http://localhost:3000/admin/runtime to see the dashboard"
echo "4. The system will automatically create runtime instances as needed"
echo ""

echo "Need help? The setup-runtime-tables.sql file is ready to copy-paste!"
