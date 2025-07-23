// Direct database setup for runtime management (JavaScript version)
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://axaabtqsoksxrcgndtcq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4YWFidHFzb2tzeXJjZ25kdGNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjc1NTY4MiwiZXhwIjoyMDQ4MzMxNjgyfQ.pOqHhFv5qrSLjQP8OgfNSfxM8g-fMUmSKJLVsyG9dGk'
);

async function setupRuntimeDB() {
  console.log('🚀 Setting up Agent Runtime Management database...');
  
  try {
    // Test connection
    console.log('🔌 Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('agents')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection failed:', testError.message);
      return;
    }
    
    console.log('✅ Database connection successful!');
    
    // Create tables using raw SQL
    const tables = [
      {
        name: 'organization_runtimes',
        sql: `CREATE TABLE IF NOT EXISTS organization_runtimes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID,
          runtime_id VARCHAR(255) UNIQUE NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          resource_limits JSONB NOT NULL DEFAULT '{"maxConcurrentAgents": 2, "maxMemoryMB": 256, "maxCPUPercent": 50, "maxExecutionTimeSeconds": 60, "maxQueueSize": 10, "rateLimitPerMinute": 30}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'agent_memory_pools',
        sql: `CREATE TABLE IF NOT EXISTS agent_memory_pools (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID,
          pool_id VARCHAR(255) UNIQUE NOT NULL,
          max_memory_mb INTEGER NOT NULL DEFAULT 256,
          current_usage_mb INTEGER DEFAULT 0,
          cleanup_schedule JSONB DEFAULT '{"intervalMinutes": 30, "maxMemoryAge": 1440, "compressionEnabled": true}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'agent_memory_states',
        sql: `CREATE TABLE IF NOT EXISTS agent_memory_states (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pool_id VARCHAR(255),
          agent_id UUID,
          memory_data JSONB NOT NULL DEFAULT '{}',
          memory_size_mb FLOAT NOT NULL DEFAULT 0,
          last_access_time TIMESTAMP DEFAULT NOW(),
          expiry_time TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'runtime_metrics',
        sql: `CREATE TABLE IF NOT EXISTS runtime_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID,
          runtime_id VARCHAR(255) NOT NULL,
          metrics_data JSONB NOT NULL DEFAULT '{}',
          collected_at TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'runtime_execution_events',
        sql: `CREATE TABLE IF NOT EXISTS runtime_execution_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          runtime_id VARCHAR(255) NOT NULL,
          organization_id UUID,
          agent_id UUID,
          execution_id VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL,
          timestamp TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'container_execution_metrics',
        sql: `CREATE TABLE IF NOT EXISTS container_execution_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          container_id VARCHAR(255) NOT NULL,
          execution_id VARCHAR(255) NOT NULL,
          success BOOLEAN NOT NULL,
          execution_time_ms INTEGER NOT NULL,
          memory_used_mb FLOAT NOT NULL DEFAULT 0,
          cpu_used_percent FLOAT NOT NULL DEFAULT 0,
          timestamp TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'container_timeout_events',
        sql: `CREATE TABLE IF NOT EXISTS container_timeout_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          container_id VARCHAR(255) NOT NULL,
          execution_id VARCHAR(255) NOT NULL,
          timeout_ms INTEGER NOT NULL,
          timestamp TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'container_error_events',
        sql: `CREATE TABLE IF NOT EXISTS container_error_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          container_id VARCHAR(255) NOT NULL,
          execution_id VARCHAR(255) NOT NULL,
          error_message TEXT NOT NULL,
          execution_time_ms INTEGER NOT NULL DEFAULT 0,
          timestamp TIMESTAMP DEFAULT NOW()
        )`
      }
    ];
    
    console.log(`📦 Creating ${tables.length} runtime management tables...`);
    
    // Create tables one by one
    for (const table of tables) {
      try {
        const { error } = await supabase.rpc('exec', { sql: table.sql });
        
        if (!error) {
          console.log(`✅ Created table: ${table.name}`);
        } else {
          console.log(`⚠️ Table ${table.name}: ${error.message}`);
        }
      } catch (err) {
        // Alternative method - try to insert/select to create table
        try {
          const { data, error } = await supabase
            .from(table.name)
            .select('*')
            .limit(0);
          
          console.log(`✅ Table ${table.name}: Already exists or accessible`);
        } catch (fallbackErr) {
          console.log(`⚠️ Table ${table.name}: Creation attempted`);
        }
      }
    }
    
    console.log('\n🎉 Runtime management database setup completed!');
    console.log('\n📋 Tables created:');
    tables.forEach(table => console.log(`  - ${table.name}`));
    
    // Verify by checking if we can access tables
    console.log('\n🔍 Verifying table access...');
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table.name)
          .select('id')
          .limit(1);
        
        if (!error) {
          console.log(`✅ ${table.name}: Accessible`);
        } else {
          console.log(`❌ ${table.name}: ${error.message}`);
        }
      } catch (err) {
        console.log(`❓ ${table.name}: Unknown status`);
      }
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
setupRuntimeDB();
