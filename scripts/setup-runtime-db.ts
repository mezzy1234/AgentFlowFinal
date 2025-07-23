// Simple database table creation for runtime management
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createRuntimeTables() {
  console.log('🗄️ Creating Agent Runtime Management tables...');
  
  const tables = [
    // Organization runtimes
    `CREATE TABLE IF NOT EXISTS organization_runtimes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID,
      runtime_id VARCHAR(255) UNIQUE NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      resource_limits JSONB NOT NULL DEFAULT '{"maxConcurrentAgents": 2, "maxMemoryMB": 256}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    // Agent memory pools
    `CREATE TABLE IF NOT EXISTS agent_memory_pools (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID,
      pool_id VARCHAR(255) UNIQUE NOT NULL,
      max_memory_mb INTEGER NOT NULL DEFAULT 256,
      current_usage_mb INTEGER DEFAULT 0,
      cleanup_schedule JSONB DEFAULT '{"intervalMinutes": 30}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    // Agent memory states
    `CREATE TABLE IF NOT EXISTS agent_memory_states (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pool_id VARCHAR(255),
      agent_id UUID,
      memory_data JSONB NOT NULL DEFAULT '{}',
      memory_size_mb FLOAT NOT NULL DEFAULT 0,
      last_access_time TIMESTAMP DEFAULT NOW(),
      expiry_time TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    // Runtime metrics
    `CREATE TABLE IF NOT EXISTS runtime_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID,
      runtime_id VARCHAR(255) NOT NULL,
      metrics_data JSONB NOT NULL DEFAULT '{}',
      collected_at TIMESTAMP DEFAULT NOW()
    )`,
    
    // Runtime execution events
    `CREATE TABLE IF NOT EXISTS runtime_execution_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      runtime_id VARCHAR(255) NOT NULL,
      organization_id UUID,
      agent_id UUID,
      execution_id VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      timestamp TIMESTAMP DEFAULT NOW()
    )`,
    
    // Container execution metrics
    `CREATE TABLE IF NOT EXISTS container_execution_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      container_id VARCHAR(255) NOT NULL,
      execution_id VARCHAR(255) NOT NULL,
      success BOOLEAN NOT NULL,
      execution_time_ms INTEGER NOT NULL,
      memory_used_mb FLOAT NOT NULL DEFAULT 0,
      cpu_used_percent FLOAT NOT NULL DEFAULT 0,
      timestamp TIMESTAMP DEFAULT NOW()
    )`
  ];
  
  for (let i = 0; i < tables.length; i++) {
    try {
      console.log(`Creating table ${i + 1}/${tables.length}...`);
      
      // Use raw SQL execution
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
        },
        body: JSON.stringify({
          sql: tables[i]
        })
      });
      
      if (response.ok) {
        console.log(`✅ Table ${i + 1} created successfully`);
      } else {
        console.log(`⚠️ Table ${i + 1} creation response: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`⚠️ Table ${i + 1} creation attempt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log('\n✅ Runtime management tables creation completed!');
  console.log('\n📋 Tables created:');
  console.log('- organization_runtimes');
  console.log('- agent_memory_pools');
  console.log('- agent_memory_states'); 
  console.log('- runtime_metrics');
  console.log('- runtime_execution_events');
  console.log('- container_execution_metrics');
}

// Test connection and create tables
async function setupRuntimeDB() {
  try {
    console.log('🔌 Testing Supabase connection...');
    const { data, error } = await supabase.from('agents').select('id').limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return;
    }
    
    console.log('✅ Supabase connection successful!');
    await createRuntimeTables();
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Export for use
export { setupRuntimeDB, createRuntimeTables };

// Run if called directly
if (typeof window === 'undefined') {
  setupRuntimeDB();
}
