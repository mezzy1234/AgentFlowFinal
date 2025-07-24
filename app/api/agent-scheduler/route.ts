import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ScheduleConfig {
  agent_id: string
  user_id: string
  schedule_type: 'interval' | 'cron' | 'webhook_trigger'
  interval_minutes?: number
  cron_expression?: string
  webhook_endpoint?: string
  timezone: string
  enabled: boolean
  max_executions_per_day?: number
  retry_on_failure: boolean
  notification_preferences?: {
    on_success: boolean
    on_failure: boolean
    email: boolean
    webhook: boolean
  }
}

interface ScheduleExecution {
  schedule_id: string
  agent_id: string
  user_id: string
  scheduled_for: string
  status: 'scheduled' | 'executing' | 'completed' | 'failed' | 'skipped'
  execution_result?: any
  execution_time_ms?: number
  error_message?: string
}

class AgentScheduler {
  async createSchedule(config: ScheduleConfig) {
    try {
      // Validate schedule configuration
      const validation = this.validateScheduleConfig(config)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Check if user has permission to schedule this agent
      const { data: agent } = await supabase
        .from('agents')
        .select('developer_id, status')
        .eq('id', config.agent_id)
        .single()

      if (!agent) {
        return { success: false, error: 'Agent not found' }
      }

      // Users can schedule agents they own or have purchased
      const hasPermission = await this.checkSchedulePermission(config.user_id, config.agent_id)
      if (!hasPermission) {
        return { success: false, error: 'No permission to schedule this agent' }
      }

      // Create schedule record
      const { data: schedule, error } = await supabase
        .from('agent_schedules')
        .insert({
          agent_id: config.agent_id,
          user_id: config.user_id,
          schedule_type: config.schedule_type,
          interval_minutes: config.interval_minutes,
          cron_expression: config.cron_expression,
          webhook_endpoint: config.webhook_endpoint,
          timezone: config.timezone,
          enabled: config.enabled,
          max_executions_per_day: config.max_executions_per_day || 100,
          retry_on_failure: config.retry_on_failure,
          notification_preferences: config.notification_preferences || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Generate initial scheduled executions
      if (config.enabled) {
        await this.generateScheduledExecutions(schedule.id, config)
      }

      return {
        success: true,
        schedule: schedule,
        message: 'Schedule created successfully'
      }
    } catch (error) {
      console.error('Schedule creation error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  validateScheduleConfig(config: ScheduleConfig): { valid: boolean; error?: string } {
    if (config.schedule_type === 'interval') {
      if (!config.interval_minutes || config.interval_minutes < 1) {
        return { valid: false, error: 'Interval must be at least 1 minute' }
      }
      if (config.interval_minutes < 5) {
        return { valid: false, error: 'Minimum interval is 5 minutes to prevent abuse' }
      }
    }

    if (config.schedule_type === 'cron') {
      if (!config.cron_expression) {
        return { valid: false, error: 'Cron expression is required' }
      }
      // Basic cron validation - in production use a proper cron parser
      const cronParts = config.cron_expression.split(' ')
      if (cronParts.length !== 5) {
        return { valid: false, error: 'Invalid cron expression format' }
      }
    }

    if (config.schedule_type === 'webhook_trigger') {
      if (!config.webhook_endpoint) {
        return { valid: false, error: 'Webhook endpoint is required' }
      }
    }

    return { valid: true }
  }

  async checkSchedulePermission(userId: string, agentId: string): Promise<boolean> {
    // Check if user owns the agent
    const { data: ownedAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .eq('developer_id', userId)
      .single()

    if (ownedAgent) return true

    // Check if user has purchased the agent
    const { data: purchase } = await supabase
      .from('agent_purchases')
      .select('id')
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    return !!purchase
  }

  async generateScheduledExecutions(scheduleId: string, config: ScheduleConfig) {
    try {
      const executions: any[] = []
      const now = new Date()
      const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Next 24 hours

      if (config.schedule_type === 'interval' && config.interval_minutes) {
        let nextExecution = new Date(now.getTime() + config.interval_minutes * 60000)
        
        while (nextExecution <= endTime && executions.length < (config.max_executions_per_day || 100)) {
          executions.push({
            schedule_id: scheduleId,
            agent_id: config.agent_id,
            user_id: config.user_id,
            scheduled_for: nextExecution.toISOString(),
            status: 'scheduled',
            created_at: now.toISOString()
          })
          
          nextExecution = new Date(nextExecution.getTime() + config.interval_minutes * 60000)
        }
      } else if (config.schedule_type === 'cron' && config.cron_expression) {
        // For cron, we'd need a proper cron parser library
        // For now, create a placeholder execution
        executions.push({
          schedule_id: scheduleId,
          agent_id: config.agent_id,
          user_id: config.user_id,
          scheduled_for: new Date(now.getTime() + 60000).toISOString(), // 1 minute from now
          status: 'scheduled',
          created_at: now.toISOString()
        })
      }

      if (executions.length > 0) {
        await supabase
          .from('scheduled_executions')
          .insert(executions)
      }

      return executions.length
    } catch (error) {
      console.error('Error generating scheduled executions:', error)
      return 0
    }
  }

  async processScheduledExecutions() {
    try {
      // Get executions due for processing
      const { data: dueExecutions } = await supabase
        .from('scheduled_executions')
        .select(`
          *,
          agent_schedules!inner(enabled, retry_on_failure, notification_preferences),
          agents!inner(name, webhook_url, required_integrations)
        `)
        .eq('status', 'scheduled')
        .lte('scheduled_for', new Date().toISOString())
        .eq('agent_schedules.enabled', true)
        .limit(50) // Process in batches

      if (!dueExecutions?.length) {
        return { processed: 0, message: 'No executions due' }
      }

      const results = []
      for (const execution of dueExecutions) {
        const result = await this.executeScheduledAgent(execution)
        results.push(result)
      }

      return {
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results: results
      }
    } catch (error) {
      console.error('Scheduled execution processing error:', error)
      return { error: (error as Error).message }
    }
  }

  async executeScheduledAgent(execution: any) {
    try {
      // Mark as executing
      await supabase
        .from('scheduled_executions')
        .update({ 
          status: 'executing',
          started_at: new Date().toISOString()
        })
        .eq('id', execution.id)

      const startTime = Date.now()

      // Queue the agent execution
      const { data: queueItem, error: queueError } = await supabase
        .from('agent_execution_queue')
        .insert({
          agent_id: execution.agent_id,
          user_id: execution.user_id,
          status: 'pending',
          priority: 5, // Medium priority for scheduled executions
          scheduled_at: new Date().toISOString(),
          payload: { 
            scheduled: true, 
            schedule_execution_id: execution.id,
            triggered_by: 'scheduler'
          },
          retry_count: 0,
          max_retries: execution.agent_schedules.retry_on_failure ? 3 : 0
        })
        .select()
        .single()

      if (queueError) throw queueError

      // Wait for execution to complete (with timeout)
      const executionResult = await this.waitForExecutionCompletion(queueItem.id, 60000) // 1 minute timeout

      const executionTime = Date.now() - startTime

      // Update scheduled execution record
      await supabase
        .from('scheduled_executions')
        .update({
          status: executionResult.success ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          execution_result: executionResult.result,
          execution_time_ms: executionTime,
          error_message: executionResult.error
        })
        .eq('id', execution.id)

      // Send notifications if configured
      if (execution.agent_schedules.notification_preferences) {
        await this.sendScheduleNotification(execution, executionResult)
      }

      return {
        success: executionResult.success,
        execution_id: execution.id,
        agent_id: execution.agent_id,
        execution_time_ms: executionTime,
        error: executionResult.error
      }
    } catch (error) {
      // Mark as failed
      await supabase
        .from('scheduled_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: (error as Error).message
        })
        .eq('id', execution.id)

      return {
        success: false,
        execution_id: execution.id,
        agent_id: execution.agent_id,
        error: (error as Error).message
      }
    }
  }

  async waitForExecutionCompletion(queueItemId: string, timeoutMs: number) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      const { data: queueItem } = await supabase
        .from('agent_execution_queue')
        .select('status, result, last_error')
        .eq('id', queueItemId)
        .single()

      if (queueItem?.status === 'completed') {
        return { success: true, result: queueItem.result }
      } else if (queueItem?.status === 'failed') {
        return { success: false, error: queueItem.last_error }
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return { success: false, error: 'Execution timed out' }
  }

  async sendScheduleNotification(execution: any, result: any) {
    try {
      const notifications = execution.agent_schedules.notification_preferences
      
      if ((result.success && notifications.on_success) || (!result.success && notifications.on_failure)) {
        if (notifications.email) {
          // Send email notification via email system
          await fetch('/api/email-system', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'send_email',
              email_request: {
                type: 'system_alert',
                recipient_email: execution.user_email, // Would need to join user data
                data: {
                  alert_type: 'Scheduled Agent Execution',
                  severity: result.success ? 'info' : 'warning',
                  description: `Agent ${execution.agents.name} ${result.success ? 'completed successfully' : 'failed'}: ${result.error || 'Success'}`,
                  dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
                }
              }
            })
          })
        }

        if (notifications.webhook) {
          // Send webhook notification
          // Implementation would go here
        }
      }
    } catch (error) {
      console.error('Schedule notification error:', error)
    }
  }

  async getScheduleStatus(scheduleId: string, userId: string) {
    const { data: schedule } = await supabase
      .from('agent_schedules')
      .select(`
        *,
        agents(name, status),
        scheduled_executions(status, scheduled_for, completed_at, error_message)
      `)
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .single()

    if (!schedule) {
      return { success: false, error: 'Schedule not found' }
    }

    // Get execution statistics
    const { data: stats } = await supabase
      .from('scheduled_executions')
      .select('status')
      .eq('schedule_id', scheduleId)

    const totalExecutions = stats?.length || 0
    const completedExecutions = stats?.filter(s => s.status === 'completed').length || 0
    const failedExecutions = stats?.filter(s => s.status === 'failed').length || 0

    return {
      success: true,
      schedule: schedule,
      statistics: {
        total_executions: totalExecutions,
        completed_executions: completedExecutions,
        failed_executions: failedExecutions,
        success_rate: totalExecutions > 0 ? (completedExecutions / totalExecutions) * 100 : 0
      }
    }
  }

  async updateSchedule(scheduleId: string, userId: string, updates: Partial<ScheduleConfig>) {
    try {
      const { data, error } = await supabase
        .from('agent_schedules')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      // If schedule is being disabled, cancel pending executions
      if (updates.enabled === false) {
        await supabase
          .from('scheduled_executions')
          .update({ status: 'skipped' })
          .eq('schedule_id', scheduleId)
          .eq('status', 'scheduled')
      }

      // If schedule is being re-enabled, generate new executions
      if (updates.enabled === true) {
        await this.generateScheduledExecutions(scheduleId, data as ScheduleConfig)
      }

      return {
        success: true,
        schedule: data,
        message: 'Schedule updated successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }
}

const scheduler = new AgentScheduler()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create_schedule':
        const createResult = await scheduler.createSchedule(body.config)
        return NextResponse.json(createResult)

      case 'update_schedule':
        const updateResult = await scheduler.updateSchedule(body.schedule_id, body.user_id, body.updates)
        return NextResponse.json(updateResult)

      case 'process_scheduled':
        const processResult = await scheduler.processScheduledExecutions()
        return NextResponse.json(processResult)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Scheduler POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get('schedule_id')
    const userId = searchParams.get('user_id')

    if (!scheduleId || !userId) {
      return NextResponse.json({ error: 'Missing schedule_id or user_id' }, { status: 400 })
    }

    const status = await scheduler.getScheduleStatus(scheduleId, userId)
    return NextResponse.json(status)
  } catch (error) {
    console.error('Scheduler GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
