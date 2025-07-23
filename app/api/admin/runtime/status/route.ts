// API endpoint for runtime status monitoring
import { NextRequest, NextResponse } from 'next/server';
import { agentRuntimeManager } from '@/lib/runtime/manager';

export async function GET(request: NextRequest) {
  try {
    // Get runtime status from manager
    const runtimeStatus = agentRuntimeManager.getRuntimeStatus();
    
    // Return runtime information
    return NextResponse.json({
      success: true,
      runtimes: runtimeStatus,
      timestamp: new Date().toISOString(),
      summary: {
        totalRuntimes: runtimeStatus.length,
        activeRuntimes: runtimeStatus.filter(r => r.status === 'active').length,
        totalContainers: runtimeStatus.reduce((sum, r) => sum + r.activeContainers, 0),
        totalMemoryUsage: runtimeStatus.reduce((sum, r) => sum + r.memoryUsage, 0)
      }
    });

  } catch (error) {
    console.error('Failed to get runtime status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve runtime status',
      runtimes: []
    }, { status: 500 });
  }
}
