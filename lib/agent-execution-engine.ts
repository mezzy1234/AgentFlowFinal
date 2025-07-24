import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ExecutionPayload {
  user_id: string
  agent_id: string
  input_data?: Record<string, any>
  execution_type?: 'manual' | 'scheduled' | 'webhook' | 'test'
}

interface WebhookResponse {
  success: boolean
  data?: any
  error?: string
  status_code: number
  duration_ms: number
}

export class AgentExecutionEngine {
  
  /**
   * Execute an agent for a specific user
   */
  async executeAgent(payload: ExecutionPayload): Promise<WebhookResponse> {
    const startTime = Date.now()
    let execution_id: string | null = null
    
    try {
      // 1. Create execution record
      const { data: execution, error: execError } = await supabase
        .from('agent_executions')
        .insert({
          user_id: payload.user_id,
          agent_id: payload.agent_id,
          execution_type: payload.execution_type || 'manual',
          status: 'running',
          input_payload: payload.input_data || {},
          executed_at: new Date().toISOString()
        })
        .select('id')
        .single()
      
      if (execError || !execution) {
        throw new Error(`Failed to create execution record: ${execError?.message}`)
      }
      
      execution_id = execution.id
      
      // 2. Get agent details
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', payload.agent_id)
        .eq('status', 'active')
        .single()
      
      if (agentError || !agent) {
        throw new Error(`Agent not found or inactive: ${agentError?.message}`)
      }
      
      // 3. Verify user has installed this agent
      const { data: userAgent, error: userAgentError } = await supabase
        .from('user_agents')
        .select('*')
        .eq('user_id', payload.user_id)
        .eq('agent_id', payload.agent_id)
        .eq('status', 'active')
        .single()
      
      if (userAgentError || !userAgent) {
        throw new Error('Agent not installed or not active for this user')
      }
      
      // 4. Get required credentials for this agent
      const { data: requiredCreds, error: credsError } = await supabase
        .from('agent_credentials')
        .select('*')
        .eq('agent_id', payload.agent_id)
        .eq('required', true)
      
      if (credsError) {
        throw new Error(`Failed to fetch required credentials: ${credsError.message}`)
      }
      
      // 5. Get user's credentials
      const userCredentials: Record<string, string> = {}
      
      for (const reqCred of requiredCreds || []) {
        const { data: userCred, error: userCredError } = await supabase
          .from('user_credentials')
          .select('encrypted_token, provider')
          .eq('user_id', payload.user_id)
          .eq('provider', reqCred.provider)
          .eq('status', 'active')
          .single()
        
        if (userCredError || !userCred) {
          throw new Error(`Missing required credential: ${reqCred.provider}`)
        }
        
        // Decrypt credential
        try {
          const decryptedToken = this.decryptCredential(userCred.encrypted_token)
          userCredentials[reqCred.provider] = decryptedToken
        } catch (decryptError) {
          throw new Error(`Failed to decrypt credential for ${reqCred.provider}`)
        }
      }
      
      // 6. Build webhook payload
      const webhookPayload = this.buildWebhookPayload(
        agent,
        userCredentials,
        payload.input_data || {}
      )
      
      // 7. Execute webhook
      const webhookResult = await this.callWebhook(agent.webhook_url, webhookPayload)
      
      // 8. Update execution record with results
      const duration = Date.now() - startTime
      await supabase
        .from('agent_executions')
        .update({
          status: webhookResult.success ? 'success' : 'failed',
          output_data: webhookResult.data,
          error_message: webhookResult.error,
          duration_ms: duration,
          webhook_response_code: webhookResult.status_code,
          completed_at: new Date().toISOString()
        })
        .eq('id', execution_id)
      
      return {
        success: webhookResult.success,
        data: webhookResult.data,
        error: webhookResult.error,
        status_code: webhookResult.status_code,
        duration_ms: duration
      }
      
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Update execution record with error
      if (execution_id) {
        await supabase
          .from('agent_executions')
          .update({
            status: 'failed',
            error_message: errorMessage,
            duration_ms: duration,
            completed_at: new Date().toISOString()
          })
          .eq('id', execution_id)
      }
      
      return {
        success: false,
        error: errorMessage,
        status_code: 500,
        duration_ms: duration
      }
    }
  }
  
  /**
   * Build webhook payload with credentials and input data
   */
  private buildWebhookPayload(
    agent: any,
    credentials: Record<string, string>,
    inputData: Record<string, any>
  ): Record<string, any> {
    return {
      agent_id: agent.id,
      agent_name: agent.name,
      inputs: inputData,
      credentials: credentials,
      timestamp: new Date().toISOString(),
      execution_id: crypto.randomUUID()
    }
  }
  
  /**
   * Call the agent's webhook URL
   */
  private async callWebhook(
    webhookUrl: string,
    payload: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string; status_code: number }> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AgentFlow-Executor/1.0'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      let responseData: any
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = { message: await response.text() }
      }
      
      return {
        success: response.ok,
        data: responseData,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        status_code: response.status
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Webhook execution timed out (30s)',
          status_code: 408
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        status_code: 500
      }
    }
  }
  
  /**
   * Decrypt user credential
   */
  private decryptCredential(encryptedToken: string): string {
    try {
      const algorithm = 'aes-256-gcm'
      const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
      
      // Parse the encrypted data
      const parts = encryptedToken.split(':')
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted token format')
      }
      
      const iv = Buffer.from(parts[0], 'hex')
      const authTag = Buffer.from(parts[1], 'hex')
      const encrypted = Buffer.from(parts[2], 'hex')
      
      // Decrypt
      const decipher = crypto.createDecipherGCM(algorithm, key)
      decipher.setAuthTag(authTag)
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
      
    } catch (error) {
      throw new Error('Failed to decrypt credential')
    }
  }
  
  /**
   * Test agent execution (dry run)
   */
  async testAgent(payload: ExecutionPayload): Promise<WebhookResponse> {
    // Use test execution type to avoid affecting real metrics
    return this.executeAgent({
      ...payload,
      execution_type: 'test'
    })
  }
  
  /**
   * Get agent execution history for a user
   */
  async getExecutionHistory(
    user_id: string,
    agent_id?: string,
    limit: number = 50
  ): Promise<any[]> {
    let query = supabase
      .from('agent_executions')
      .select(`
        *,
        agents:agent_id (
          name,
          description
        )
      `)
      .eq('user_id', user_id)
      .order('executed_at', { ascending: false })
      .limit(limit)
    
    if (agent_id) {
      query = query.eq('agent_id', agent_id)
    }
    
    const { data, error } = await query
    
    if (error) {
      throw new Error(`Failed to fetch execution history: ${error.message}`)
    }
    
    return data || []
  }
  
  /**
   * Get agent analytics for developers
   */
  async getAgentAnalytics(
    agent_id: string,
    created_by: string,
    days: number = 30
  ): Promise<any> {
    // Verify ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agent_id)
      .eq('created_by', created_by)
      .single()
    
    if (agentError || !agent) {
      throw new Error('Agent not found or unauthorized')
    }
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const { data: analytics, error } = await supabase
      .from('agent_analytics')
      .select('*')
      .eq('agent_id', agent_id)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true })
    
    if (error) {
      throw new Error(`Failed to fetch analytics: ${error.message}`)
    }
    
    // Calculate totals
    const totals = analytics?.reduce(
      (acc, day) => ({
        total_runs: acc.total_runs + day.total_runs,
        successful_runs: acc.successful_runs + day.successful_runs,
        failed_runs: acc.failed_runs + day.failed_runs,
        unique_users: Math.max(acc.unique_users, day.unique_users),
        avg_duration_ms: (acc.avg_duration_ms + day.avg_duration_ms) / 2
      }),
      { total_runs: 0, successful_runs: 0, failed_runs: 0, unique_users: 0, avg_duration_ms: 0 }
    ) || { total_runs: 0, successful_runs: 0, failed_runs: 0, unique_users: 0, avg_duration_ms: 0 }
    
    return {
      daily_analytics: analytics,
      totals,
      success_rate: totals.total_runs > 0 ? (totals.successful_runs / totals.total_runs) * 100 : 0
    }
  }
}

// Export singleton instance
export const agentExecutor = new AgentExecutionEngine()
