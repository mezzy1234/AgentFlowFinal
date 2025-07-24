import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AgentToggleRequest {
  agent_id: string
  user_id: string
  action: 'start' | 'stop'
  auto_schedule?: boolean
  schedule_interval?: number // minutes
}

class AgentRunner {
  async toggleAgent(request: AgentToggleRequest) {
    const { agent_id, user_id, action, auto_schedule, schedule_interval } = request

    try {
      // Verify user owns the agent or has access
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agent_id)
        .eq('developer_id', user_id)
        .single()

      if (agentError || !agent) {
        throw new Error('Agent not found or access denied')
      }

      if (action === 'start') {
        return await this.startAgent(agent, user_id, auto_schedule, schedule_interval)
      } else {
        return await this.stopAgent(agent, user_id)
      }
    } catch (error) {
      console.error('Agent toggle error:', error)
      throw error
    }
  }

  async startAgent(agent: any, userId: string, autoSchedule?: boolean, scheduleInterval?: number) {
    // Update agent status to active
    const { error: updateError } = await supabase
      .from('agents')
      .update({ 
        status: 'active',
        is_running: true,
        last_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', agent.id)

    if (updateError) throw updateError

    // Create or update agent runtime configuration
    await supabase
      .from('agent_runtime_config')
      .upsert({
        agent_id: agent.id,
        user_id: userId,
        is_active: true,
        auto_schedule: autoSchedule || false,
        schedule_interval_minutes: scheduleInterval || 60,
        last_toggle_at: new Date().toISOString()
      })

    // If auto-schedule is enabled, create scheduled runs
    if (autoSchedule && scheduleInterval) {
      await this.createScheduledRuns(agent.id, userId, scheduleInterval)
    }

    // Log the start event
    await this.logAgentEvent(agent.id, userId, 'agent_started', {
      auto_schedule: autoSchedule,
      schedule_interval: scheduleInterval
    })

    return {
      success: true,
      status: 'running',
      message: `Agent ${agent.name} is now running`,
      auto_schedule: autoSchedule,
      next_run: autoSchedule ? new Date(Date.now() + (scheduleInterval || 60) * 60000).toISOString() : null
    }
  }

  async stopAgent(agent: any, userId: string) {
    // Update agent status to inactive
    const { error: updateError } = await supabase
      .from('agents')
      .update({ 
        status: 'inactive',
        is_running: false,
        last_stopped_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', agent.id)

    if (updateError) throw updateError

    // Update runtime configuration
    await supabase
      .from('agent_runtime_config')
      .update({
        is_active: false,
        last_toggle_at: new Date().toISOString()
      })
      .eq('agent_id', agent.id)

    // Cancel any pending executions
    await supabase
      .from('agent_execution_queue')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('agent_id', agent.id)
      .eq('status', 'pending')

    // Log the stop event
    await this.logAgentEvent(agent.id, userId, 'agent_stopped', {})

    return {
      success: true,
      status: 'stopped',
      message: `Agent ${agent.name} has been stopped`
    }
  }

  async createScheduledRuns(agentId: string, userId: string, intervalMinutes: number) {
    // Create next 24 hours of scheduled runs
    const runs = []
    const now = new Date()
    
    for (let i = 1; i <= 24; i++) {
      const scheduledTime = new Date(now.getTime() + i * intervalMinutes * 60000)
      runs.push({
        agent_id: agentId,
        user_id: userId,
        status: 'pending',
        priority: 1,
        scheduled_at: scheduledTime.toISOString(),
        payload: { automated: true },
        retry_count: 0,
        max_retries: 3
      })
    }

    await supabase
      .from('agent_execution_queue')
      .insert(runs)
  }

  async logAgentEvent(agentId: string, userId: string, eventType: string, metadata: any) {
    await supabase
      .from('agent_run_logs')
      .insert({
        agent_id: agentId,
        user_id: userId,
        execution_id: `event_${Date.now()}_${agentId}`,
        status: 'info',
        input_data: { event_type: eventType, metadata },
        output_data: null,
        execution_time_ms: 0,
        created_at: new Date().toISOString()
      })
  }

  async getAgentStatus(agentId: string, userId: string) {
    // Get agent details
    const { data: agent } = await supabase
      .from('agents')
      .select('*, agent_runtime_config(*)')
      .eq('id', agentId)
      .eq('developer_id', userId)
      .single()

    if (!agent) {
      throw new Error('Agent not found')
    }

    // Get pending executions count
    const { count: pendingCount } = await supabase
      .from('agent_execution_queue')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('status', 'pending')

    // Get recent executions
    const { data: recentExecutions } = await supabase
      .from('agent_run_logs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Get next scheduled run
    const { data: nextRun } = await supabase
      .from('agent_execution_queue')
      .select('scheduled_at')
      .eq('agent_id', agentId)
      .eq('status', 'pending')
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .single()

    return {
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        is_running: agent.is_running,
        last_started_at: agent.last_started_at,
        last_stopped_at: agent.last_stopped_at
      },
      runtime_config: agent.agent_runtime_config?.[0] || null,
      pending_executions: pendingCount || 0,
      recent_executions: recentExecutions || [],
      next_scheduled_run: nextRun?.scheduled_at || null
    }
  }
}

const agentRunner = new AgentRunner()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await agentRunner.toggleAgent(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Agent runner POST error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const userId = searchParams.get('user_id')

    if (!agentId || !userId) {
      return NextResponse.json({ error: 'Missing agent_id or user_id' }, { status: 400 })
    }

    const status = await agentRunner.getAgentStatus(agentId, userId)
    return NextResponse.json(status)
  } catch (error) {
    console.error('Agent runner GET error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 400 })
  }
}
