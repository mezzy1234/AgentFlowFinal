// Agent execution engine for AgentFlow.AI
// Handles queued runs, retries, timeouts, and logging

interface AgentRunConfig {
  userAgentId: string
  webhookUrl: string
  inputPayload: any
  credentials: Record<string, string>
  maxRetries?: number
  timeoutMs?: number
}

interface AgentRunResult {
  success: boolean
  output?: any
  error?: string
  executionTimeMs: number
  retryCount: number
}

export class AgentExecutionEngine {
  private runQueue: Map<string, AgentRunConfig> = new Map()
  private runningJobs: Set<string> = new Set()

  constructor(
    private supabase: any,
    private maxConcurrentRuns: number = 10,
    private defaultTimeout: number = 30000
  ) {
    // Start the queue processor
    this.processQueue()
  }

  /**
   * Queue an agent run for execution
   */
  async queueRun(config: AgentRunConfig): Promise<string> {
    try {
      // Create agent run record
      const { data: run, error } = await this.supabase
        .from('agent_runs')
        .insert({
          user_agent_id: config.userAgentId,
          webhook_url: config.webhookUrl,
          input_payload: config.inputPayload,
          status: 'pending',
          max_retries: config.maxRetries || 3
        })
        .select()
        .single()

      if (error) throw error

      // Add to queue
      this.runQueue.set(run.id, config)

      // Create notification
      await this.createNotification(
        run.user_agent_id,
        'agent_activated',
        'Agent Started',
        'Your agent has been queued for execution'
      )

      return run.id
    } catch (error) {
      console.error('Failed to queue agent run:', error)
      throw error
    }
  }

  /**
   * Process the run queue
   */
  private async processQueue() {
    while (true) {
      try {
        // Check if we can process more jobs
        if (this.runningJobs.size >= this.maxConcurrentRuns) {
          await this.sleep(1000)
          continue
        }

        // Get next job from queue
        const [runId, config] = Array.from(this.runQueue.entries())[0] || []
        if (!runId) {
          await this.sleep(1000)
          continue
        }

        // Remove from queue and add to running jobs
        this.runQueue.delete(runId)
        this.runningJobs.add(runId)

        // Execute the job (non-blocking)
        this.executeRun(runId, config).finally(() => {
          this.runningJobs.delete(runId)
        })

      } catch (error) {
        console.error('Queue processor error:', error)
        await this.sleep(5000)
      }
    }
  }

  /**
   * Execute a single agent run
   */
  private async executeRun(runId: string, config: AgentRunConfig): Promise<void> {
    const startTime = Date.now()

    try {
      // Update status to running
      await this.updateRunStatus(runId, 'running')

      // Execute the webhook
      const result = await this.executeWebhook(config)

      if (result.success) {
        // Success - update database
        await this.supabase
          .from('agent_runs')
          .update({
            status: 'success',
            output_payload: result.output,
            execution_time_ms: result.executionTimeMs,
            completed_at: new Date().toISOString()
          })
          .eq('id', runId)

        // Update heartbeat
        await this.updateHeartbeat(config.userAgentId, 'healthy', result.executionTimeMs)

        // Create success notification
        await this.createNotification(
          config.userAgentId,
          'agent_success',
          'Agent Completed Successfully',
          `Your agent executed successfully in ${result.executionTimeMs}ms`
        )

      } else {
        // Handle failure
        await this.handleRunFailure(runId, config, result.error!, result.retryCount)
      }

    } catch (error) {
      await this.handleRunFailure(runId, config, error as string, 0)
    }
  }

  /**
   * Execute webhook with timeout and error handling
   */
  private async executeWebhook(config: AgentRunConfig): Promise<AgentRunResult> {
    const startTime = Date.now()
    const timeout = config.timeoutMs || this.defaultTimeout

    try {
      // Prepare payload with credentials
      const payload = {
        ...config.inputPayload,
        credentials: config.credentials,
        metadata: {
          userAgentId: config.userAgentId,
          timestamp: new Date().toISOString()
        }
      }

      // Create timeout controller
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      // Execute webhook
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AgentFlow.AI/1.0.0',
          'X-AgentFlow-Version': '1.0.0'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const executionTimeMs = Date.now() - startTime

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const output = await response.json()

      return {
        success: true,
        output,
        executionTimeMs,
        retryCount: 0
      }

    } catch (error) {
      const executionTimeMs = Date.now() - startTime

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Webhook execution timed out',
          executionTimeMs,
          retryCount: 0
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs,
        retryCount: 0
      }
    }
  }

  /**
   * Handle run failure with retry logic
   */
  private async handleRunFailure(
    runId: string,
    config: AgentRunConfig,
    error: string,
    retryCount: number
  ): Promise<void> {
    try {
      const maxRetries = config.maxRetries || 3

      // Log the failure
      await this.logFailure(runId, error, retryCount)

      if (retryCount < maxRetries) {
        // Schedule retry
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000) // Exponential backoff, max 30s
        
        await this.supabase
          .from('agent_runs')
          .update({
            status: 'pending',
            retry_count: retryCount + 1,
            error_message: error
          })
          .eq('id', runId)

        // Re-queue after delay
        setTimeout(() => {
          this.runQueue.set(runId, config)
        }, retryDelay)

      } else {
        // Max retries reached - mark as failed
        await this.supabase
          .from('agent_runs')
          .update({
            status: 'failed',
            error_message: error,
            retry_count: retryCount,
            completed_at: new Date().toISOString()
          })
          .eq('id', runId)

        // Update heartbeat status
        await this.updateHeartbeat(config.userAgentId, 'critical')

        // Create failure notification
        await this.createNotification(
          config.userAgentId,
          'agent_failed',
          'Agent Execution Failed',
          `Your agent failed after ${maxRetries} retry attempts: ${error}`
        )
      }

    } catch (err) {
      console.error('Error handling run failure:', err)
    }
  }

  /**
   * Log detailed failure information
   */
  private async logFailure(runId: string, error: string, retryCount: number): Promise<void> {
    try {
      let errorType = 'unknown'
      let errorCode = 'UNKNOWN_ERROR'

      // Classify error types
      if (error.includes('timeout') || error.includes('timed out')) {
        errorType = 'timeout'
        errorCode = 'TIMEOUT_ERROR'
      } else if (error.includes('HTTP')) {
        errorType = 'http_error'
        errorCode = error.includes('401') ? 'UNAUTHORIZED' : 
                  error.includes('403') ? 'FORBIDDEN' :
                  error.includes('404') ? 'NOT_FOUND' :
                  error.includes('429') ? 'RATE_LIMITED' : 'HTTP_ERROR'
      } else if (error.includes('network') || error.includes('fetch')) {
        errorType = 'network_error'
        errorCode = 'NETWORK_ERROR'
      }

      await this.supabase
        .from('agent_failures')
        .insert({
          agent_run_id: runId,
          error_code: errorCode,
          error_type: errorType,
          error_details: { message: error, retryCount },
          stack_trace: error
        })

    } catch (err) {
      console.error('Failed to log agent failure:', err)
    }
  }

  /**
   * Update agent heartbeat
   */
  private async updateHeartbeat(
    userAgentId: string,
    status: 'healthy' | 'warning' | 'critical' | 'offline',
    responseTimeMs?: number
  ): Promise<void> {
    try {
      await this.supabase
        .from('agent_heartbeats')
        .upsert({
          user_agent_id: userAgentId,
          last_ping: new Date().toISOString(),
          status,
          response_time_ms: responseTimeMs,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_agent_id'
        })

    } catch (error) {
      console.error('Failed to update heartbeat:', error)
    }
  }

  /**
   * Update run status
   */
  private async updateRunStatus(runId: string, status: string): Promise<void> {
    await this.supabase
      .from('agent_runs')
      .update({
        status,
        started_at: status === 'running' ? new Date().toISOString() : undefined
      })
      .eq('id', runId)
  }

  /**
   * Create user notification
   */
  private async createNotification(
    userAgentId: string,
    type: string,
    title: string,
    message: string
  ): Promise<void> {
    try {
      // Get user ID from user_agent
      const { data: userAgent } = await this.supabase
        .from('user_agents')
        .select('user_id')
        .eq('id', userAgentId)
        .single()

      if (!userAgent) return

      await this.supabase
        .from('notifications')
        .insert({
          user_id: userAgent.user_id,
          type,
          title,
          message,
          data: { userAgentId }
        })

    } catch (error) {
      console.error('Failed to create notification:', error)
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      pending: this.runQueue.size,
      running: this.runningJobs.size,
      maxConcurrent: this.maxConcurrentRuns
    }
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down agent execution engine...')
    
    // Wait for running jobs to complete (with timeout)
    const shutdownTimeout = 60000 // 60 seconds
    const startTime = Date.now()

    while (this.runningJobs.size > 0 && Date.now() - startTime < shutdownTimeout) {
      await this.sleep(1000)
    }

    console.log(`Shutdown complete. ${this.runningJobs.size} jobs were terminated.`)
  }
}

// Singleton instance
let executionEngine: AgentExecutionEngine | null = null

export function getExecutionEngine(supabase: any): AgentExecutionEngine {
  if (!executionEngine) {
    executionEngine = new AgentExecutionEngine(supabase)
  }
  return executionEngine
}
