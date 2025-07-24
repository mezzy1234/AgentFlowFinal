// Example: Create Runtime with the Manager Class
import { SimpleRuntimeManager } from '@/lib/runtime/simple-manager';

const createAgentRuntime = async () => {
  // Initialize the runtime manager
  const runtimeManager = new SimpleRuntimeManager(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    // Create a new runtime
    const runtime = await runtimeManager.createRuntime(
      'my-intelligent-agent',  // Runtime name
      1024                     // Memory limit in MB (optional, default 256)
    );

    console.log('✅ Agent runtime created:', runtime);
    
    // The runtime object contains:
    // - id: unique runtime ID
    // - runtime_name: the name you provided
    // - status: 'active'
    // - memory_mb: memory allocation
    // - user_id: your user ID (automatically set)
    // - created_at: timestamp
    
    return runtime;
  } catch (error) {
    console.error('❌ Failed to create runtime:', error);
  }
};

// Usage example
createAgentRuntime();
