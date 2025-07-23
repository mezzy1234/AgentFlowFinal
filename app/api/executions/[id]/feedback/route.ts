import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/executions/[id]/feedback
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: executionId } = params;
    const { feedback, comment } = await request.json();
    const userId = request.headers.get('user-id'); // Assume user ID from auth

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate feedback value
    if (!['worked', 'failed'].includes(feedback)) {
      return NextResponse.json({ error: 'Invalid feedback value' }, { status: 400 });
    }

    // Update execution with feedback
    const { data, error } = await supabase
      .from('agent_execution_logs')
      .update({
        user_feedback: feedback,
        user_feedback_comment: comment || null,
        user_feedback_at: new Date().toISOString()
      })
      .eq('id', executionId)
      .eq('user_id', userId) // Ensure user can only update their own executions
      .select()
      .single();

    if (error) {
      console.error('Error updating execution feedback:', error);
      return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    // Check if agent should be disabled due to consecutive failures
    if (feedback === 'failed') {
      const { data: recentExecutions } = await supabase
        .from('agent_execution_logs')
        .select('user_feedback')
        .eq('agent_id', data.agent_id)
        .order('created_at', { ascending: false })
        .limit(5);

      const recentFailures = recentExecutions?.filter(e => e.user_feedback === 'failed').length || 0;
      
      if (recentFailures >= 3) {
        // Disable agent temporarily
        await supabase
          .from('agents')
          .update({
            is_active: false,
            disabled_reason: 'Consecutive failures reported by users',
            disabled_at: new Date().toISOString()
          })
          .eq('id', data.agent_id);
      }
    }

    return NextResponse.json({ success: true, execution: data });

  } catch (error) {
    console.error('Error in execution feedback API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
