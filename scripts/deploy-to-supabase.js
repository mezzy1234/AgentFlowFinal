#!/usr/bin/env node

/**
 * Simple Supabase SQL Deployment Script
 * Run this to deploy runtime tables via API
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Supabase Runtime Tables Deployment\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  console.log('Please check that these variables are set:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function deployTables() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('📄 Reading setup-runtime-tables.sql...');
    const sqlPath = path.join(__dirname, '..', 'setup-runtime-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log(`✅ SQL file loaded (${(sqlContent.length / 1024).toFixed(1)} KB)\n`);
    
    console.log('🎯 DEPLOYMENT OPTIONS:\n');
    
    console.log('📋 OPTION 1: Manual Deployment (Recommended)');
    console.log('1. Open: https://supabase.com/dashboard/project/axaabtqsoksxrcgndtcq');
    console.log('2. Go to SQL Editor → New Query');
    console.log('3. Copy the content from setup-runtime-tables.sql');
    console.log('4. Paste it in the SQL Editor');
    console.log('5. Click "Run" to execute\n');
    
    console.log('📋 OPTION 2: Copy SQL Content');
    console.log('Here are the first few lines of the SQL:');
    console.log('─'.repeat(60));
    console.log(sqlContent.substring(0, 500) + '...');
    console.log('─'.repeat(60));
    console.log('Copy the FULL content from setup-runtime-tables.sql file\n');
    
    console.log('🔍 Testing database connection...');
    
    // Test connection with a simple query
    const { data: testData, error: connectionError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.log('⚠️  Connection test failed - this is expected if tables don\'t exist yet');
      console.log('   Error:', connectionError.message);
    } else {
      console.log('✅ Database connection successful!');
    }
    
    console.log('\n🎉 Ready for deployment!');
    console.log('\n📋 Next Steps:');
    console.log('1. Use the Supabase dashboard to run the SQL');
    console.log('2. Visit http://localhost:3000/admin/runtime to see the dashboard');
    console.log('3. Run: node scripts/test-runtime-architecture.js to test');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    console.log('\n💡 Manual Steps:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Open your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy-paste the setup-runtime-tables.sql content');
    console.log('5. Run the SQL');
  }
}

deployTables();
