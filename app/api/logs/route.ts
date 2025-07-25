import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LogQuery {
  agentId?: string;
  userId?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  startDate?: string;
  endDate?: string;
  limit: number;
  offset: number;
  includeMetadata?: boolean;
}

// GET execution logs
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let user = null;
    let isApiKey = false;

    // Check if it's an API key or JWT token
    if (token.startsWith('ak_')) {
      // API Key authentication
      const { data: keyData } = await supabase
        .from('api_keys')
        .select('user_id, permissions, is_active')
        .eq('key_id', token)
        .eq('is_active', true)
        .single();

      if (!keyData) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }

      // Check permissions
      if (!keyData.permissions.includes('logs:read') && !keyData.permissions.includes('*')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      isApiKey = true;
      const { data: userData } = await supabase.auth.admin.getUserById(keyData.user_id);
      user = userData.user;
    } else {
      // JWT token authentication
      const { data: { user: jwtUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !jwtUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      user = jwtUser;
    }

    const { searchParams } = new URL(request.url);
    
    const query: LogQuery = {
      agentId: searchParams.get('agentId') || undefined,
      userId: searchParams.get('userId') || undefined,
      status: (searchParams.get('status') as any) || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: Math.max(1, parseInt(searchParams.get('limit') || '50')) || 50,
      offset: Math.max(0, parseInt(searchParams.get('offset') || '0')) || 0,
      includeMetadata: searchParams.get('includeMetadata') === 'true'
    };

    // Build query
    let logsQuery = supabase
      .from('agent_execution_logs')
      .select(`
        id,
        agent_id,
        user_id,
        status,
        inputs,
        outputs,
        error_message,
        execution_start,
        execution_end,
        execution_time_ms,
        webhook_status_code,
        ${query.includeMetadata ? 'metadata,' : ''}
        agents!inner(name, category, developer_id)
      `);

    // Apply filters
    if (query.agentId) {
      logsQuery = logsQuery.eq('agent_id', query.agentId);
    }

    if (query.userId) {
      logsQuery = logsQuery.eq('user_id', query.userId);
    } else if (!isApiKey && user?.id) {
      // Regular users can only see their own logs unless they're the developer
      logsQuery = logsQuery.or(`user_id.eq.${user.id},agents.developer_id.eq.${user.id}`);
    }

    if (query.status) {
      logsQuery = logsQuery.eq('status', query.status);
    }

    if (query.startDate) {
      logsQuery = logsQuery.gte('execution_start', query.startDate);
    }

    if (query.endDate) {
      logsQuery = logsQuery.lte('execution_start', query.endDate);
    }

    // Apply pagination and ordering
    logsQuery = logsQuery
      .order('execution_start', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1);

    const { data: logs, error: logsError, count } = await logsQuery;

    if (logsError) {
      console.error('Failed to fetch logs:', logsError);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    // Get aggregate statistics
    const stats = user?.id ? await getExecutionStats(user.id, query, isApiKey) : null;

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        offset: query.offset,
        limit: query.limit,
        total: count || 0
      },
      stats,
      query
    });

  } catch (error) {
    console.error('Get logs error:', error);
    return NextResponse.json({ 
      error: 'Failed to get logs',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// POST endpoint for creating manual log entries (admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      agent_id,
      user_id,
      status,
      inputs,
      outputs,
      error_message,
      execution_time_ms,
      metadata
    } = body;

    const { data: log, error: logError } = await supabase
      .from('agent_execution_logs')
      .insert({
        agent_id,
        user_id,
        status,
        inputs: inputs || {},
        outputs: outputs || {},
        error_message,
        execution_start: new Date().toISOString(),
        execution_end: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
        execution_time_ms,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create log entry:', logError);
      return NextResponse.json({ error: 'Failed to create log entry' }, { status: 500 });
    }

    return NextResponse.json({ success: true, log });

  } catch (error) {
    console.error('Create log error:', error);
    return NextResponse.json({ 
      error: 'Failed to create log',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// DELETE endpoint for cleaning up old logs
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('logId');
    const olderThan = searchParams.get('olderThan'); // ISO date string
    const agentId = searchParams.get('agentId');

    // Check if user is admin for bulk operations
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();

    if (logId) {
      // Delete specific log (user can delete their own logs)
      const { error: deleteError } = await supabase
        .from('agent_execution_logs')
        .delete()
        .eq('id', logId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Failed to delete log:', deleteError);
        return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Log deleted' });
    }

    if (olderThan && profile?.is_admin) {
      // Bulk delete old logs (admin only)
      const { error: bulkDeleteError, count } = await supabase
        .from('agent_execution_logs')
        .delete()
        .lt('execution_start', olderThan);

      if (bulkDeleteError) {
        console.error('Failed to bulk delete logs:', bulkDeleteError);
        return NextResponse.json({ error: 'Failed to bulk delete logs' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Deleted ${count} old log entries`,
        deletedCount: count
      });
    }

    return NextResponse.json({ error: 'Invalid delete operation' }, { status: 400 });

  } catch (error) {
    console.error('Delete logs error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete logs',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// Get execution statistics
async function getExecutionStats(userId: string, query: LogQuery, isApiKey: boolean) {
  try {
    let statsQuery = supabase
      .from('agent_execution_logs')
      .select('status, execution_time_ms, execution_start, agents!inner(developer_id)');

    // Apply same filters as main query
    if (query.agentId) {
      statsQuery = statsQuery.eq('agent_id', query.agentId);
    }

    if (query.userId) {
      statsQuery = statsQuery.eq('user_id', query.userId);
    } else if (!isApiKey) {
      statsQuery = statsQuery.or(`user_id.eq.${userId},agents.developer_id.eq.${userId}`);
    }

    if (query.startDate) {
      statsQuery = statsQuery.gte('execution_start', query.startDate);
    }

    if (query.endDate) {
      statsQuery = statsQuery.lte('execution_start', query.endDate);
    }

    const { data: allLogs } = await statsQuery;

    if (!allLogs?.length) {
      return {
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        running: 0,
        successRate: 0,
        averageExecutionTime: 0,
        totalExecutionTime: 0
      };
    }

    const stats = {
      total: allLogs.length,
      completed: allLogs.filter(l => l.status === 'completed').length,
      failed: allLogs.filter(l => l.status === 'failed').length,
      pending: allLogs.filter(l => l.status === 'pending').length,
      running: allLogs.filter(l => l.status === 'running').length,
      successRate: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0
    };

    const completedLogs = allLogs.filter(l => l.status === 'completed' || l.status === 'failed');
    if (completedLogs.length > 0) {
      stats.successRate = (stats.completed / completedLogs.length) * 100;
    }

    const executionTimes = allLogs
      .filter(l => l.execution_time_ms && l.execution_time_ms > 0)
      .map(l => l.execution_time_ms);

    if (executionTimes.length > 0) {
      stats.totalExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0);
      stats.averageExecutionTime = stats.totalExecutionTime / executionTimes.length;
    }

    return stats;

  } catch (error) {
    console.error('Failed to get execution stats:', error);
    return {
      total: 0,
      completed: 0,
      failed: 0,
      pending: 0,
      running: 0,
      successRate: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0
    };
  }
}
