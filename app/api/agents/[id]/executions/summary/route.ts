import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/agents/[id]/executions/summary
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: agentId } = params;

    // Get execution summary statistics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_agent_execution_summary', { agent_id_param: agentId });

    if (statsError) {
      console.error('Error fetching execution summary:', statsError);
      return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
    }

    // If RPC doesn't exist, fallback to manual queries
    if (!stats || stats.length === 0) {
      // Get total executions
      const { count: totalExecutions } = await supabase
        .from('agent_execution_logs')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId);

      // Get success rate
      const { count: successfulExecutions } = await supabase
        .from('agent_execution_logs')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('status', 'success');

      // Get average duration
      const { data: durations } = await supabase
        .from('agent_execution_logs')
        .select('duration_ms')
        .eq('agent_id', agentId)
        .not('duration_ms', 'is', null);

      const averageDuration = durations && durations.length > 0
        ? durations.reduce((sum, d) => sum + (d.duration_ms || 0), 0) / durations.length
        : 0;

      // Get executions in last 24h
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: last24h } = await supabase
        .from('agent_execution_logs')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .gte('created_at', twentyFourHoursAgo);

      // Get feedback stats
      const { count: totalFeedback } = await supabase
        .from('agent_execution_logs')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .not('user_feedback', 'is', null);

      const { count: positiveFeedback } = await supabase
        .from('agent_execution_logs')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('user_feedback', 'worked');

      const summary = {
        total_executions: totalExecutions || 0,
        success_rate: (totalExecutions || 0) > 0 ? ((successfulExecutions || 0) / (totalExecutions || 1)) * 100 : 0,
        average_duration: averageDuration,
        last_24h: last24h || 0,
        total_feedback: totalFeedback || 0,
        positive_feedback_rate: (totalFeedback || 0) > 0 ? ((positiveFeedback || 0) / (totalFeedback || 1)) * 100 : 0
      };

      return NextResponse.json({ summary });
    }

    return NextResponse.json({ summary: stats[0] });

  } catch (error) {
    console.error('Error in execution summary API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
