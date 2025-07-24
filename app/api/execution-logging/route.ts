import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ExecutionLog {
  execution_id: string
  agent_id: string
  user_id: string
  trigger_type: 'manual' | 'scheduled' | 'webhook' | 'api'
  trigger_data?: any
  execution_start: string
  execution_end?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  total_steps: number
  completed_steps: number
  error_message?: string
  performance_metrics: {
    total_duration_ms: number
    step_durations: { [stepId: string]: number }
    memory_usage?: number
    api_calls_count: number
    data_processed_bytes: number
  }
  step_logs: ExecutionStepLog[]
  metadata: {
    version: string
    environment: string
    ip_address?: string
    user_agent?: string
  }
}

interface ExecutionStepLog {
  step_id: string
  step_name: string
  step_type: string
  start_time: string
  end_time?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  input_data?: any
  output_data?: any
  error_details?: any
  duration_ms?: number
  retry_count: number
  external_api_calls: ExternalAPICall[]
}

interface ExternalAPICall {
  service: string
  endpoint: string
  method: string
  start_time: string
  end_time: string
  status_code: number
  response_time_ms: number
  request_size_bytes: number
  response_size_bytes: number
  error?: string
}

class AgentExecutionLogger {
  async startExecution(agentId: string, userId: string, triggerType: string, triggerData?: any): Promise<string> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const executionLog: Partial<ExecutionLog> = {
      execution_id: executionId,
      agent_id: agentId,
      user_id: userId,
      trigger_type: triggerType as any,
      trigger_data: triggerData,
      execution_start: new Date().toISOString(),
      status: 'pending',
      total_steps: 0,
      completed_steps: 0,
      performance_metrics: {
        total_duration_ms: 0,
        step_durations: {},
        api_calls_count: 0,
        data_processed_bytes: 0
      },
      step_logs: [],
      metadata: {
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    }

    await supabase
      .from('agent_execution_logs')
      .insert(executionLog)

    return executionId
  }

  async updateExecutionStatus(executionId: string, status: string, errorMessage?: string) {
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    }

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updateData.execution_end = new Date().toISOString()
    }

    if (errorMessage) {
      updateData.error_message = errorMessage
    }

    await supabase
      .from('agent_execution_logs')
      .update(updateData)
      .eq('execution_id', executionId)
  }

  async logStepStart(executionId: string, stepId: string, stepName: string, stepType: string, inputData?: any) {
    const stepLog: ExecutionStepLog = {
      step_id: stepId,
      step_name: stepName,
      step_type: stepType,
      start_time: new Date().toISOString(),
      status: 'running',
      input_data: inputData,
      retry_count: 0,
      external_api_calls: []
    }

    // Get current execution log
    const { data: execution } = await supabase
      .from('agent_execution_logs')
      .select('step_logs, total_steps')
      .eq('execution_id', executionId)
      .single()

    if (execution) {
      const updatedStepLogs = [...(execution.step_logs || []), stepLog]
      
      await supabase
        .from('agent_execution_logs')
        .update({
          step_logs: updatedStepLogs,
          total_steps: updatedStepLogs.length,
          status: 'running'
        })
        .eq('execution_id', executionId)
    }
  }

  async logStepEnd(executionId: string, stepId: string, status: string, outputData?: any, errorDetails?: any) {
    const endTime = new Date().toISOString()

    const { data: execution } = await supabase
      .from('agent_execution_logs')
      .select('step_logs, completed_steps, performance_metrics')
      .eq('execution_id', executionId)
      .single()

    if (execution) {
      const stepLogs = execution.step_logs || []
      const stepIndex = stepLogs.findIndex((log: ExecutionStepLog) => log.step_id === stepId)
      
      if (stepIndex !== -1) {
        const step = stepLogs[stepIndex]
        const startTime = new Date(step.start_time).getTime()
        const duration = new Date(endTime).getTime() - startTime

        stepLogs[stepIndex] = {
          ...step,
          end_time: endTime,
          status: status as any,
          output_data: outputData,
          error_details: errorDetails,
          duration_ms: duration
        }

        const completedSteps = status === 'completed' ? 
          execution.completed_steps + 1 : execution.completed_steps

        const updatedMetrics = {
          ...execution.performance_metrics,
          step_durations: {
            ...execution.performance_metrics.step_durations,
            [stepId]: duration
          }
        }

        await supabase
          .from('agent_execution_logs')
          .update({
            step_logs: stepLogs,
            completed_steps: completedSteps,
            performance_metrics: updatedMetrics
          })
          .eq('execution_id', executionId)
      }
    }
  }

  async logAPICall(executionId: string, stepId: string, apiCall: ExternalAPICall) {
    const { data: execution } = await supabase
      .from('agent_execution_logs')
      .select('step_logs, performance_metrics')
      .eq('execution_id', executionId)
      .single()

    if (execution) {
      const stepLogs = execution.step_logs || []
      const stepIndex = stepLogs.findIndex((log: ExecutionStepLog) => log.step_id === stepId)
      
      if (stepIndex !== -1) {
        stepLogs[stepIndex].external_api_calls.push(apiCall)

        const updatedMetrics = {
          ...execution.performance_metrics,
          api_calls_count: execution.performance_metrics.api_calls_count + 1,
          data_processed_bytes: execution.performance_metrics.data_processed_bytes + 
            apiCall.request_size_bytes + apiCall.response_size_bytes
        }

        await supabase
          .from('agent_execution_logs')
          .update({
            step_logs: stepLogs,
            performance_metrics: updatedMetrics
          })
          .eq('execution_id', executionId)
      }
    }
  }

  async getExecutionLog(executionId: string) {
    const { data, error } = await supabase
      .from('agent_execution_logs')
      .select('*')
      .eq('execution_id', executionId)
      .single()

    if (error) {
      throw new Error(`Failed to get execution log: ${error.message}`)
    }

    return data
  }

  async getExecutionLogs(userId: string, filters: {
    agent_id?: string
    status?: string
    trigger_type?: string
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  } = {}) {
    let query = supabase
      .from('agent_execution_logs')
      .select('*')
      .eq('user_id', userId)
      .order('execution_start', { ascending: false })

    if (filters.agent_id) {
      query = query.eq('agent_id', filters.agent_id)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.trigger_type) {
      query = query.eq('trigger_type', filters.trigger_type)
    }

    if (filters.start_date) {
      query = query.gte('execution_start', filters.start_date)
    }

    if (filters.end_date) {
      query = query.lte('execution_start', filters.end_date)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get execution logs: ${error.message}`)
    }

    return data
  }

  async getExecutionAnalytics(userId: string, timeframe: '24h' | '7d' | '30d' = '7d') {
    const timeframes = {
      '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
      '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }

    const startDate = timeframes[timeframe].toISOString()

    const { data: executions } = await supabase
      .from('agent_execution_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('execution_start', startDate)

    if (!executions) return null

    // Calculate analytics
    const totalExecutions = executions.length
    const completedExecutions = executions.filter(e => e.status === 'completed').length
    const failedExecutions = executions.filter(e => e.status === 'failed').length
    const successRate = totalExecutions > 0 ? (completedExecutions / totalExecutions) * 100 : 0

    const totalDuration = executions
      .filter(e => e.execution_end)
      .reduce((sum, e) => {
        const start = new Date(e.execution_start).getTime()
        const end = new Date(e.execution_end).getTime()
        return sum + (end - start)
      }, 0)

    const avgDuration = completedExecutions > 0 ? totalDuration / completedExecutions : 0

    const totalAPICallsCount = executions.reduce((sum, e) => 
      sum + (e.performance_metrics?.api_calls_count || 0), 0)

    const totalDataProcessed = executions.reduce((sum, e) => 
      sum + (e.performance_metrics?.data_processed_bytes || 0), 0)

    // Agent performance breakdown
    const agentStats = executions.reduce((acc, e) => {
      if (!acc[e.agent_id]) {
        acc[e.agent_id] = {
          total: 0,
          completed: 0,
          failed: 0,
          total_duration: 0
        }
      }
      acc[e.agent_id].total++
      if (e.status === 'completed') acc[e.agent_id].completed++
      if (e.status === 'failed') acc[e.agent_id].failed++
      if (e.execution_end) {
        const duration = new Date(e.execution_end).getTime() - new Date(e.execution_start).getTime()
        acc[e.agent_id].total_duration += duration
      }
      return acc
    }, {} as any)

    // Daily execution trends
    const dailyStats = executions.reduce((acc, e) => {
      const date = new Date(e.execution_start).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { total: 0, completed: 0, failed: 0 }
      }
      acc[date].total++
      if (e.status === 'completed') acc[date].completed++
      if (e.status === 'failed') acc[date].failed++
      return acc
    }, {} as any)

    return {
      overview: {
        total_executions: totalExecutions,
        completed_executions: completedExecutions,
        failed_executions: failedExecutions,
        success_rate: Math.round(successRate * 100) / 100,
        average_duration_ms: Math.round(avgDuration),
        total_api_calls: totalAPICallsCount,
        total_data_processed_bytes: totalDataProcessed
      },
      agent_performance: Object.entries(agentStats).map(([agentId, stats]: [string, any]) => ({
        agent_id: agentId,
        ...stats,
        success_rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        avg_duration_ms: stats.completed > 0 ? Math.round(stats.total_duration / stats.completed) : 0
      })),
      daily_trends: Object.entries(dailyStats).map(([date, stats]: [string, any]) => ({
        date,
        ...stats,
        success_rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      })).sort((a, b) => a.date.localeCompare(b.date))
    }
  }

  async exportExecutionLogs(userId: string, format: 'json' | 'csv', filters: any = {}) {
    const logs = await this.getExecutionLogs(userId, filters)

    if (format === 'csv') {
      return this.convertToCSV(logs)
    }

    return JSON.stringify(logs, null, 2)
  }

  private convertToCSV(logs: any[]): string {
    if (logs.length === 0) return ''

    const headers = [
      'execution_id',
      'agent_id',
      'trigger_type',
      'execution_start',
      'execution_end',
      'status',
      'total_steps',
      'completed_steps',
      'duration_ms',
      'api_calls_count',
      'data_processed_bytes',
      'error_message'
    ]

    const csvRows = [headers.join(',')]

    logs.forEach(log => {
      const duration = log.execution_end ? 
        new Date(log.execution_end).getTime() - new Date(log.execution_start).getTime() : 0

      const row = [
        log.execution_id,
        log.agent_id,
        log.trigger_type,
        log.execution_start,
        log.execution_end || '',
        log.status,
        log.total_steps,
        log.completed_steps,
        duration,
        log.performance_metrics?.api_calls_count || 0,
        log.performance_metrics?.data_processed_bytes || 0,
        (log.error_message || '').replace(/,/g, ';')
      ]
      csvRows.push(row.join(','))
    })

    return csvRows.join('\n')
  }
}

const executionLogger = new AgentExecutionLogger()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'start_execution':
        const { agent_id, user_id, trigger_type, trigger_data } = body
        const executionId = await executionLogger.startExecution(agent_id, user_id, trigger_type, trigger_data)
        return NextResponse.json({ success: true, execution_id: executionId })

      case 'update_status':
        const { execution_id, status, error_message } = body
        await executionLogger.updateExecutionStatus(execution_id, status, error_message)
        return NextResponse.json({ success: true })

      case 'log_step_start':
        const { execution_id: execId1, step_id, step_name, step_type, input_data } = body
        await executionLogger.logStepStart(execId1, step_id, step_name, step_type, input_data)
        return NextResponse.json({ success: true })

      case 'log_step_end':
        const { execution_id: execId2, step_id: stepId2, status: stepStatus, output_data, error_details } = body
        await executionLogger.logStepEnd(execId2, stepId2, stepStatus, output_data, error_details)
        return NextResponse.json({ success: true })

      case 'log_api_call':
        const { execution_id: execId3, step_id: stepId3, api_call } = body
        await executionLogger.logAPICall(execId3, stepId3, api_call)
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Execution logging error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const userId = searchParams.get('user_id')
    const executionId = searchParams.get('execution_id')

    if (!userId && !executionId) {
      return NextResponse.json({ error: 'Missing user_id or execution_id' }, { status: 400 })
    }

    switch (type) {
      case 'execution_log':
        if (!executionId) {
          return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 })
        }
        const log = await executionLogger.getExecutionLog(executionId)
        return NextResponse.json({ success: true, log })

      case 'execution_logs':
        if (!userId) {
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
        }
        const filters = {
          agent_id: searchParams.get('agent_id') || undefined,
          status: searchParams.get('status') || undefined,
          trigger_type: searchParams.get('trigger_type') || undefined,
          start_date: searchParams.get('start_date') || undefined,
          end_date: searchParams.get('end_date') || undefined,
          limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
          offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
        }
        const logs = await executionLogger.getExecutionLogs(userId, filters)
        return NextResponse.json({ success: true, logs })

      case 'analytics':
        if (!userId) {
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
        }
        const timeframe = (searchParams.get('timeframe') as '24h' | '7d' | '30d') || '7d'
        const analytics = await executionLogger.getExecutionAnalytics(userId, timeframe)
        return NextResponse.json({ success: true, analytics })

      case 'export':
        if (!userId) {
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
        }
        const format = (searchParams.get('format') as 'json' | 'csv') || 'json'
        const exportFilters = {
          agent_id: searchParams.get('agent_id') || undefined,
          status: searchParams.get('status') || undefined,
          start_date: searchParams.get('start_date') || undefined,
          end_date: searchParams.get('end_date') || undefined
        }
        const exportData = await executionLogger.exportExecutionLogs(userId, format, exportFilters)
        
        const contentType = format === 'csv' ? 'text/csv' : 'application/json'
        const filename = `agent_logs_${Date.now()}.${format}`
        
        return new NextResponse(exportData, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Execution logging GET error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}
