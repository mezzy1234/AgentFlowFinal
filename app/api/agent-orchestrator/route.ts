import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AgentQueueItem {
  id: string
  agent_id: string
  user_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: number
  scheduled_at: string
  webhook_url?: string
  payload?: any
  credentials?: any
  retry_count: number
  max_retries: number
}

class AgentOrchestrator {
  private isProcessing = false
  private processingInterval: NodeJS.Timeout | null = null

  async startWorker() {
    if (this.isProcessing) return

    this.isProcessing = true
    this.processingInterval = setInterval(async () => {
      await this.processQueue()
    }, 5000) // Check every 5 seconds

    console.log('Agent orchestrator worker started')
  }

  async stopWorker() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    this.isProcessing = false
    console.log('Agent orchestrator worker stopped')
  }

  async processQueue() {
    try {
      // Get pending queue items
      const { data: queueItems, error } = await supabase
        .from('agent_execution_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(5)

      if (error || !queueItems?.length) return

      // Process each queue item
      for (const item of queueItems) {
        await this.executeAgent(item)
      }
    } catch (error) {
      console.error('Queue processing error:', error)
    }
  }

  async executeAgent(queueItem: AgentQueueItem) {
    try {
      // Mark as running
      await supabase
        .from('agent_execution_queue')
        .update({ 
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', queueItem.id)

      // Get agent details
      const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('id', queueItem.agent_id)
        .single()

      if (!agent || agent.status !== 'active') {
        throw new Error('Agent not found or inactive')
      }

      // Get user credentials
      const credentials = await this.getUserCredentials(queueItem.user_id, agent.required_integrations)

      // Execute webhook or HTTP request
      const result = await this.callAgentWebhook(agent, queueItem.payload, credentials)

      // Log successful execution
      await this.logExecution(queueItem, result, 'success')

      // Mark as completed
      await supabase
        .from('agent_execution_queue')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: result
        })
        .eq('id', queueItem.id)

    } catch (error) {
      console.error(`Agent execution failed for queue item ${queueItem.id}:`, error)
      await this.handleExecutionError(queueItem, error)
    }
  }

  async callAgentWebhook(agent: any, payload: any, credentials: any) {
    const webhookUrl = agent.webhook_url || agent.metadata?.webhook_url

    if (!webhookUrl) {
      throw new Error('No webhook URL configured for agent')
    }

    // Inject credentials into payload
    const enrichedPayload = {
      ...payload,
      credentials: credentials,
      agent_metadata: agent.metadata
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AgentFlow-Orchestrator/1.0'
      },
      body: JSON.stringify(enrichedPayload)
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  async getUserCredentials(userId: string, requiredIntegrations: string[]) {
    if (!requiredIntegrations?.length) return {}

    const { data: credentials } = await supabase
      .from('user_integrations')
      .select('service_name, encrypted_credentials')
      .eq('user_id', userId)
      .in('service_name', requiredIntegrations)
      .eq('status', 'connected')

    const credentialMap: any = {}
    credentials?.forEach(cred => {
      credentialMap[cred.service_name] = cred.encrypted_credentials
    })

    return credentialMap
  }

  async logExecution(queueItem: AgentQueueItem, result: any, status: string) {
    await supabase.from('agent_run_logs').insert({
      agent_id: queueItem.agent_id,
      user_id: queueItem.user_id,
      execution_id: `exec_${Date.now()}_${queueItem.id}`,
      status: status,
      input_data: queueItem.payload,
      output_data: result,
      execution_time_ms: 0, // Calculate this properly
      error_message: status === 'error' ? result?.error : null,
      created_at: new Date().toISOString()
    })
  }

  async handleExecutionError(queueItem: AgentQueueItem, error: any) {
    const retryCount = queueItem.retry_count + 1

    if (retryCount < queueItem.max_retries) {
      // Retry with exponential backoff
      const retryDelay = Math.pow(2, retryCount) * 60000 // 2^n minutes
      const retryAt = new Date(Date.now() + retryDelay).toISOString()

      await supabase
        .from('agent_execution_queue')
        .update({
          status: 'pending',
          retry_count: retryCount,
          scheduled_at: retryAt,
          last_error: error.message
        })
        .eq('id', queueItem.id)
    } else {
      // Mark as failed
      await supabase
        .from('agent_execution_queue')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          last_error: error.message
        })
        .eq('id', queueItem.id)

      // Log failed execution
      await this.logExecution(queueItem, { error: error.message }, 'error')
    }
  }

  async queueAgentExecution(agentId: string, userId: string, payload: any, priority: number = 1, scheduledAt?: string) {
    const { data, error } = await supabase
      .from('agent_execution_queue')
      .insert({
        agent_id: agentId,
        user_id: userId,
        status: 'pending',
        priority: priority,
        scheduled_at: scheduledAt || new Date().toISOString(),
        payload: payload,
        retry_count: 0,
        max_retries: 3
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

const orchestrator = new AgentOrchestrator()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'start_worker':
        await orchestrator.startWorker()
        return NextResponse.json({ success: true, message: 'Worker started' })

      case 'stop_worker':
        await orchestrator.stopWorker()
        return NextResponse.json({ success: true, message: 'Worker stopped' })

      case 'queue_execution':
        const { agent_id, user_id, payload, priority, scheduled_at } = body
        const queueItem = await orchestrator.queueAgentExecution(agent_id, user_id, payload, priority, scheduled_at)
        return NextResponse.json({ success: true, queue_item: queueItem })

      case 'process_queue':
        await orchestrator.processQueue()
        return NextResponse.json({ success: true, message: 'Queue processed' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Orchestrator API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    switch (type) {
      case 'queue_status':
        const { data: queueStats } = await supabase.rpc('get_queue_statistics')
        return NextResponse.json(queueStats)

      case 'running_agents':
        const { data: runningAgents } = await supabase
          .from('agent_execution_queue')
          .select('*, agents(name)')
          .eq('status', 'running')
        return NextResponse.json({ running_agents: runningAgents })

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Orchestrator GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
