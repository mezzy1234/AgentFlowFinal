#!/usr/bin/env node

/**
 * Deploy Runtime Management Schema to Supabase
 * This script executes the setup-runtime-tables.sql file on the Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deploySchema() {
  console.log('🚀 Deploying Runtime Management Schema to Supabase...\n');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'setup-runtime-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Reading setup-runtime-tables.sql...');
    console.log(`   File size: ${(sqlContent.length / 1024).toFixed(1)} KB\n`);
    
    // Split SQL into individual statements (basic approach)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let skipCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comment-only statements
      if (statement.startsWith('--') || statement.trim() === '') {
        continue;
      }
      
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        // Execute the SQL statement
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });
        
        if (error) {
          // Some errors are expected (like "relation already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key') ||
              error.message.includes('already defined')) {
            console.log(`   ⚠️  Skipped (already exists): ${error.message.substring(0, 80)}...`);
            skipCount++;
          } else {
            console.error(`   ❌ Error: ${error.message}`);
            console.error(`   Statement: ${statement.substring(0, 100)}...`);
          }
        } else {
          console.log(`   ✅ Success`);
          successCount++;
        }
        
      } catch (err) {
        console.error(`   ❌ Execution error: ${err.message}`);
        console.error(`   Statement: ${statement.substring(0, 100)}...`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 DEPLOYMENT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successful executions: ${successCount}`);
    console.log(`⚠️  Skipped (existing): ${skipCount}`);
    console.log(`❌ Failed executions: ${statements.length - successCount - skipCount}`);
    console.log('='.repeat(60));
    
    // Test basic connectivity
    console.log('\n🔍 Testing database connectivity...');
    const { data: testData, error: testError } = await supabase
      .from('organization_runtimes')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log(`   ⚠️  Table access test failed: ${testError.message}`);
    } else {
      console.log(`   ✅ Database connection and table access confirmed!`);
    }
    
    console.log('\n🎉 Runtime Management Schema deployment completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test the runtime system with: npm run test:runtime');
    console.log('   2. Start the development server: npm run dev');
    console.log('   3. Access the Runtime Dashboard at: /admin/runtime');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Execute deployment
deploySchema();
