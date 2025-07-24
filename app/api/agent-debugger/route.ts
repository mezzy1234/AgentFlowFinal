import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ErrorLogFilter {
  agent_id?: string
  developer_id: string
  status?: string
  date_from?: string
  date_to?: string
  error_type?: string
  limit?: number
  offset?: number
}

interface ErrorAnalysis {
  error_message: string
  frequency: number
  first_occurrence: string
  last_occurrence: string
  affected_agents: string[]
  suggested_fix?: string
}

class AgentErrorViewer {
  async getAgentLogs(filter: ErrorLogFilter) {
    try {
      let query = supabase
        .from('agent_run_logs')
        .select(`
          *,
          agents!inner(id, name, developer_id)
        `)
        .eq('agents.developer_id', filter.developer_id)

      // Apply filters
      if (filter.agent_id) {
        query = query.eq('agent_id', filter.agent_id)
      }

      if (filter.status) {
        query = query.eq('status', filter.status)
      }

      if (filter.date_from) {
        query = query.gte('created_at', filter.date_from)
      }

      if (filter.date_to) {
        query = query.lte('created_at', filter.date_to)
      }

      // Order by most recent first
      query = query.order('created_at', { ascending: false })

      // Apply pagination
      if (filter.limit) {
        query = query.limit(filter.limit)
      }

      if (filter.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) throw error

      return {
        success: true,
        logs: data || [],
        total_count: data?.length || 0
      }
    } catch (error) {
      console.error('Error fetching agent logs:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async getErrorAnalysis(developerId: string, agentId?: string, days: number = 30) {
    try {
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      let query = supabase
        .from('agent_run_logs')
        .select(`
          error_message,
          created_at,
          agent_id,
          agents!inner(name, developer_id)
        `)
        .eq('agents.developer_id', developerId)
        .eq('status', 'error')
        .gte('created_at', dateFrom)
        .not('error_message', 'is', null)

      if (agentId) {
        query = query.eq('agent_id', agentId)
      }

      const { data, error } = await query

      if (error) throw error

      // Group errors by message and analyze
      const errorGroups: { [key: string]: ErrorAnalysis } = {}

      data?.forEach(log => {
        const errorKey = log.error_message || 'Unknown error'
        
        if (!errorGroups[errorKey]) {
          errorGroups[errorKey] = {
            error_message: errorKey,
            frequency: 0,
            first_occurrence: log.created_at,
            last_occurrence: log.created_at,
            affected_agents: [],
            suggested_fix: this.getSuggestedFix(errorKey)
          }
        }

        const group = errorGroups[errorKey]
        group.frequency++
        
        if (log.created_at < group.first_occurrence) {
          group.first_occurrence = log.created_at
        }
        
        if (log.created_at > group.last_occurrence) {
          group.last_occurrence = log.created_at
        }

        if (!group.affected_agents.includes(log.agent_id)) {
          group.affected_agents.push(log.agent_id)
        }
      })

      // Sort by frequency
      const sortedErrors = Object.values(errorGroups)
        .sort((a, b) => b.frequency - a.frequency)

      return {
        success: true,
        error_analysis: sortedErrors,
        total_errors: data?.length || 0,
        unique_error_types: sortedErrors.length
      }
    } catch (error) {
      console.error('Error analysis failed:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  getSuggestedFix(errorMessage: string): string {
    const error = errorMessage.toLowerCase()

    if (error.includes('timeout') || error.includes('timed out')) {
      return 'Consider increasing timeout settings or optimizing your webhook response time'
    }
    
    if (error.includes('unauthorized') || error.includes('401')) {
      return 'Check your API credentials and ensure they have not expired'
    }
    
    if (error.includes('rate limit') || error.includes('429')) {
      return 'Implement request throttling or contact the service provider about rate limits'
    }
    
    if (error.includes('webhook') && error.includes('failed')) {
      return 'Verify your webhook URL is accessible and returning proper responses'
    }
    
    if (error.includes('network') || error.includes('connection')) {
      return 'Check network connectivity and service availability'
    }
    
    if (error.includes('json') || error.includes('parse')) {
      return 'Ensure your webhook returns valid JSON responses'
    }
    
    if (error.includes('credentials') || error.includes('authentication')) {
      return 'Reconnect your integrations and verify credentials are still valid'
    }

    return 'Review the error details and check agent configuration'
  }

  async getAgentPerformanceMetrics(developerId: string, agentId?: string, days: number = 30) {
    try {
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      let query = supabase
        .from('agent_run_logs')
        .select(`
          status,
          execution_time_ms,
          created_at,
          agent_id,
          agents!inner(name, developer_id)
        `)
        .eq('agents.developer_id', developerId)
        .gte('created_at', dateFrom)

      if (agentId) {
        query = query.eq('agent_id', agentId)
      }

      const { data, error } = await query

      if (error) throw error

      // Calculate metrics
      const total = data?.length || 0
      const successful = data?.filter(log => log.status === 'success').length || 0
      const failed = data?.filter(log => log.status === 'error').length || 0
      const successRate = total > 0 ? (successful / total) * 100 : 0

      // Calculate average execution time
      const executionTimes = data?.filter(log => log.execution_time_ms > 0).map(log => log.execution_time_ms) || []
      const avgExecutionTime = executionTimes.length > 0 
        ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
        : 0

      // Group by day for trend analysis
      const dailyStats: { [key: string]: { total: number, successful: number, failed: number } } = {}
      
      data?.forEach(log => {
        const day = log.created_at.split('T')[0]
        if (!dailyStats[day]) {
          dailyStats[day] = { total: 0, successful: 0, failed: 0 }
        }
        
        dailyStats[day].total++
        if (log.status === 'success') {
          dailyStats[day].successful++
        } else if (log.status === 'error') {
          dailyStats[day].failed++
        }
      })

      const trendData = Object.entries(dailyStats)
        .map(([date, stats]) => ({
          date,
          ...stats,
          success_rate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return {
        success: true,
        metrics: {
          total_executions: total,
          successful_executions: successful,
          failed_executions: failed,
          success_rate: successRate,
          avg_execution_time_ms: avgExecutionTime,
          trend_data: trendData
        }
      }
    } catch (error) {
      console.error('Performance metrics error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async getDebugDetails(logId: string, developerId: string) {
    try {
      const { data, error } = await supabase
        .from('agent_run_logs')
        .select(`
          *,
          agents!inner(id, name, developer_id, webhook_url, metadata)
        `)
        .eq('id', logId)
        .eq('agents.developer_id', developerId)
        .single()

      if (error || !data) {
        return {
          success: false,
          error: 'Log entry not found or access denied'
        }
      }

      // Get related queue item if exists
      const { data: queueItem } = await supabase
        .from('agent_execution_queue')
        .select('*')
        .eq('agent_id', data.agent_id)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return {
        success: true,
        log_details: data,
        queue_item: queueItem,
        debug_info: {
          webhook_url: data.agents.webhook_url,
          agent_metadata: data.agents.metadata,
          input_payload: data.input_data,
          output_response: data.output_data,
          execution_duration: data.execution_time_ms,
          error_trace: data.error_message
        }
      }
    } catch (error) {
      console.error('Debug details error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }
}

const errorViewer = new AgentErrorViewer()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const developerId = searchParams.get('developer_id')

    if (!developerId) {
      return NextResponse.json({ error: 'Missing developer_id' }, { status: 400 })
    }

    switch (type) {
      case 'logs':
        const filter: ErrorLogFilter = {
          developer_id: developerId,
          agent_id: searchParams.get('agent_id') || undefined,
          status: searchParams.get('status') || undefined,
          date_from: searchParams.get('date_from') || undefined,
          date_to: searchParams.get('date_to') || undefined,
          limit: parseInt(searchParams.get('limit') || '50'),
          offset: parseInt(searchParams.get('offset') || '0')
        }
        
        const logsResult = await errorViewer.getAgentLogs(filter)
        return NextResponse.json(logsResult)

      case 'error_analysis':
        const agentId = searchParams.get('agent_id') || undefined
        const days = parseInt(searchParams.get('days') || '30')
        
        const analysisResult = await errorViewer.getErrorAnalysis(developerId, agentId, days)
        return NextResponse.json(analysisResult)

      case 'performance':
        const perfAgentId = searchParams.get('agent_id') || undefined
        const perfDays = parseInt(searchParams.get('days') || '30')
        
        const perfResult = await errorViewer.getAgentPerformanceMetrics(developerId, perfAgentId, perfDays)
        return NextResponse.json(perfResult)

      case 'debug':
        const logId = searchParams.get('log_id')
        if (!logId) {
          return NextResponse.json({ error: 'Missing log_id' }, { status: 400 })
        }
        
        const debugResult = await errorViewer.getDebugDetails(logId, developerId)
        return NextResponse.json(debugResult)

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Agent error viewer GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
