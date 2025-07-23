import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/agents/[id]/executions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: agentId } = params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('agent_execution_logs')
      .select(`
        *,
        agents!inner (
          name,
          description
        )
      `)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: executions, error } = await query;

    if (error) {
      console.error('Error fetching executions:', error);
      return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 });
    }

    return NextResponse.json({ executions });

  } catch (error) {
    console.error('Error in executions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/agents/[id]/run
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: agentId } = params;
    const body = await request.json();
    const userId = request.headers.get('user-id'); // Assume user ID from auth

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate execution ID
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create execution log entry
    const { data: execution, error: insertError } = await supabase
      .from('agent_execution_logs')
      .insert({
        agent_id: agentId,
        user_id: userId,
        execution_id: executionId,
        status: 'pending',
        start_time: new Date().toISOString(),
        input_data: body.input_data || {},
        retry_count: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating execution:', insertError);
      return NextResponse.json({ error: 'Failed to start execution' }, { status: 500 });
    }

    // In a real implementation, you would:
    // 1. Queue the agent execution job
    // 2. Execute the agent logic
    // 3. Update the execution status
    
    // For now, simulate a quick execution
    setTimeout(async () => {
      const success = Math.random() > 0.2; // 80% success rate
      
      await supabase
        .from('agent_execution_logs')
        .update({
          status: success ? 'success' : 'failed',
          end_time: new Date().toISOString(),
          duration_ms: Math.floor(Math.random() * 5000) + 1000,
          output_data: success ? { result: 'Agent executed successfully' } : undefined,
          error_message: success ? undefined : 'Simulated execution error',
          error_code: success ? undefined : 'EXEC_ERROR'
        })
        .eq('id', execution.id);
    }, 2000);

    return NextResponse.json({ 
      execution: {
        ...execution,
        status: 'running'
      }
    });

  } catch (error) {
    console.error('Error running agent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
