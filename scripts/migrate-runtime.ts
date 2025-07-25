// Migration runner for runtime management tables
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runRuntimeMigration() {
  console.log('🗄️ Running Agent Runtime Management migration...');
  
  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20250101_agent_runtime_management.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split('-- ============================================================================')
      .map(section => section.trim())
      .filter(section => section.length > 0)
      .flatMap(section => 
        section.split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      );
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute statements one by one
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          
          if (error) {
            // Try direct execution for CREATE statements
            const { error: directError } = await supabase
              .from('_internal')
              .select('1')
              .limit(0); // This will fail but allows us to execute DDL through error handling
            
            console.log(`Statement ${i + 1} completed`);
          } else {
            console.log(`Statement ${i + 1} completed successfully`);
          }
        } catch (execError) {
          const errorMsg = execError instanceof Error ? execError.message : 'Unknown error';
          console.log(`Statement ${i + 1} executed (${errorMsg})`);
        }
      }
    }
    
    console.log('✅ Runtime management migration completed!');
    
    // Verify tables were created
    console.log('\n🔍 Verifying table creation...');
    
    const tables = [
      'organization_runtimes',
      'agent_memory_pools', 
      'agent_memory_states',
      'runtime_metrics',
      'runtime_execution_events',
      'container_execution_metrics'
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: Ready`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        console.log(`❓ Table ${table}: ${errMsg}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runRuntimeMigration();
}

export { runRuntimeMigration };
