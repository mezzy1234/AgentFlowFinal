// API endpoint for runtime metrics
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeIntegratedEngine } from '@/lib/runtime/integration';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get runtime integrated engine
    const runtimeEngine = getRuntimeIntegratedEngine(supabase);
    
    // Get runtime metrics
    const metrics = await runtimeEngine.getRuntimeMetrics();
    
    return NextResponse.json({
      success: true,
      ...metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to get runtime metrics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve runtime metrics',
      totalExecutions: 0,
      activeRuntimes: 0,
      memoryUtilization: 0,
      errorRate: 0,
      avgExecutionTime: 0
    }, { status: 500 });
  }
}
