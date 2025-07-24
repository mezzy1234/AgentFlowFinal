// Test Supabase Connection
import { SimpleRuntimeManager } from '@/lib/runtime/simple-manager'

export default function TestConnection() {
  const testConnection = async () => {
    try {
      console.log('🔄 Testing Supabase connection...')
      
      const runtimeManager = new SimpleRuntimeManager(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Test basic connection
      const runtimes = await runtimeManager.getRuntimes()
      console.log('✅ Connection successful! Runtimes:', runtimes)
      
      // Test creating a runtime
      const newRuntime = await runtimeManager.createRuntime('test-runtime-001', 512)
      console.log('✅ Runtime created:', newRuntime)
      
      // Test metrics
      const metrics = await runtimeManager.getRuntimeMetrics()
      console.log('✅ Metrics retrieved:', metrics)
      
      alert('🎉 Supabase connection test successful! Check console for details.')
      
    } catch (error) {
      console.error('❌ Connection test failed:', error)
      alert('❌ Connection test failed. Check console for details.')
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      <button 
        onClick={testConnection}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Test Connection
      </button>
      <div className="mt-4 text-sm text-gray-600">
        <p>Project URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        <p>Schema: ultra-simple-schema.sql (deployed)</p>
      </div>
    </div>
  )
}
