// Enhanced Agent execution engine with comprehensive logging and monitoring
// Handles queued runs, retries, timeouts, health monitoring, and detailed logging

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AgentExecutionLogger {
  info(message: string, data?: any, step?: string, latency?: number): Promise<void>;
  warn(message: string, data?: any, step?: string, latency?: number): Promise<void>;
  error(message: string, data?: any, step?: string, latency?: number): Promise<void>;
  debug(message: string, data?: any, step?: string, latency?: number): Promise<void>;
}

class ExecutionLogger implements AgentExecutionLogger {
  constructor(private agentRunId: string) {}

  async info(message: string, data?: any, step?: string, latency?: number): Promise<void> {
    await this.log('info', message, data, step, latency);
  }

  async warn(message: string, data?: any, step?: string, latency?: number): Promise<void> {
    await this.log('warn', message, data, step, latency);
  }

  async error(message: string, data?: any, step?: string, latency?: number): Promise<void> {
    await this.log('error', message, data, step, latency);
  }

  async debug(message: string, data?: any, step?: string, latency?: number): Promise<void> {
    await this.log('debug', message, data, step, latency);
  }

  private async log(level: string, message: string, data?: any, step?: string, latency?: number): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      await supabase
        .from('agent_run_logs')
        .insert({
          agent_run_id: this.agentRunId,
          level,
          message,
          data: data || {},
          execution_step: step,
          latency_ms: latency,
          memory_usage_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024)
        });
    } catch (error) {
      console.error('Failed to log execution event:', error);
    }
  }
}

export interface AgentRunConfig {
  userAgentId: string;
  webhookUrl: string;
  inputPayload: any;
  credentials: Record<string, string>;
  maxRetries?: number;
  timeoutMs?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface AgentRunResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTimeMs: number;
  retryCount: number;
  healthImpact: 'positive' | 'neutral' | 'negative';
}

export interface AgentHealthMetrics {
  agentId: string;
  healthScore: number;
  successRate: number;
  avgResponseTime: number;
  errorRate: number;
  lastUpdated: Date;
}

export class EnhancedAgentExecutionEngine {
  private runQueue: Map<string, { config: AgentRunConfig; priority: number; queuedAt: Date }> = new Map();
  private runningJobs: Map<string, { startTime: Date; config: AgentRunConfig }> = new Map();
  private healthScores: Map<string, AgentHealthMetrics> = new Map();
  private isProcessing = false;

  constructor(
    private maxConcurrentRuns: number = 10,
    private defaultTimeout: number = 30000,
    private healthCheckInterval: number = 60000 // 1 minute
  ) {
    this.startQueueProcessor();
    this.startHealthMonitoring();
    this.startFailureAlertChecking();
  }

  /**
   * Queue an agent run with priority and enhanced logging
   */
  async queueRun(config: AgentRunConfig): Promise<string> {
    const startTime = Date.now();
    let logger: ExecutionLogger;

    try {
      // Create agent run record
      const { data: run, error } = await supabase
        .from('agent_runs')
        .insert({
          user_agent_id: config.userAgentId,
          webhook_url: config.webhookUrl,
          input_payload: config.inputPayload,
          status: 'pending',
          max_retries: config.maxRetries || 3,
          timeout_ms: config.timeoutMs || this.defaultTimeout
        })
        .select()
        .single();

      if (error) throw error;

      logger = new ExecutionLogger(run.id);
      await logger.info('Agent run queued', {
        userAgentId: config.userAgentId,
        priority: config.priority || 'normal',
        timeoutMs: config.timeoutMs || this.defaultTimeout
      }, 'init');

      // Calculate priority score
      const priorityScore = this.calculatePriorityScore(config);
      
      // Add to queue
      this.runQueue.set(run.id, {
        config,
        priority: priorityScore,
        queuedAt: new Date()
      });

      await logger.info(`Added to execution queue (position: ${this.runQueue.size})`, {
        priorityScore,
        queueSize: this.runQueue.size
      }, 'init');

      return run.id;
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (logger!) {
        await logger.error('Failed to queue agent run', { error: errorMessage }, 'init', latency);
      }
      throw error;
    }
  }

  /**
   * Execute a single agent run with comprehensive monitoring
   */
  async executeRun(runId: string): Promise<AgentRunResult> {
    const startTime = Date.now();
    const logger = new ExecutionLogger(runId);
    let result: AgentRunResult;

    try {
      // Get run details
      const { data: run, error: runError } = await supabase
        .from('agent_runs')
        .select(`
          *,
          user_agents!inner(
            agent_id,
            user_id,
            agents!inner(
              id,
              name,
              config,
              developer_id
            )
          )
        `)
        .eq('id', runId)
        .single();

      if (runError || !run) {
        throw new Error(`Run not found: ${runError?.message}`);
      }

      await logger.info('Starting agent execution', {
        agentId: run.user_agents.agent_id,
        agentName: run.user_agents.agents.name
      }, 'execute');

      // Update status to running
      await supabase
        .from('agent_runs')
        .update({ 
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', runId);

      // Track as running job
      this.runningJobs.set(runId, {
        startTime: new Date(),
        config: {
          userAgentId: run.user_agent_id,
          webhookUrl: run.webhook_url,
          inputPayload: run.input_payload,
          credentials: {}
        }
      });

      // Get user credentials for integrations
      const credentials = await this.getUserCredentials(run.user_agents.user_id);
      await logger.debug('Retrieved user credentials', {
        credentialCount: Object.keys(credentials).length
      }, 'auth');

      // Execute with timeout
      const timeoutMs = run.timeout_ms || this.defaultTimeout;
      const executionPromise = this.performExecution(run, credentials, logger);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeoutMs)
      );

      const output = await Promise.race([executionPromise, timeoutPromise]);
      const executionTime = Date.now() - startTime;

      await logger.info('Agent execution completed successfully', {
        executionTimeMs: executionTime,
        outputSize: JSON.stringify(output).length
      }, 'complete', executionTime);

      // Update run as completed
      await supabase
        .from('agent_runs')
        .update({
          status: 'completed',
          output: output,
          completed_at: new Date().toISOString(),
          duration: executionTime
        })
        .eq('id', runId);

      result = {
        success: true,
        output,
        executionTimeMs: executionTime,
        retryCount: run.retry_count || 0,
        healthImpact: executionTime < 5000 ? 'positive' : 'neutral'
      };

      // Update health metrics
      await this.updateAgentHealth(run.user_agents.agent_id, result);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await logger.error('Agent execution failed', {
        error: errorMsg,
        executionTimeMs: executionTime
      }, 'error', executionTime);

      // Update run as failed
      const errorMessage2 = error instanceof Error ? error.message : 'Unknown error';
      await supabase
        .from('agent_runs')
        .update({
          status: 'failed',
          error: errorMessage2,
          completed_at: new Date().toISOString(),
          duration: executionTime
        })
        .eq('id', runId);

      result = {
        success: false,
        error: errorMessage2,
        executionTimeMs: executionTime,
        retryCount: 0,
        healthImpact: 'negative'
      };

    } finally {
      // Remove from running jobs
      this.runningJobs.delete(runId);
    }

    return result;
  }

  /**
   * Get user credentials for integrations
   */
  private async getUserCredentials(userId: string): Promise<Record<string, string>> {
    try {
      const { data: credentials } = await supabase
        .from('oauth_tokens')
        .select('integration_name, access_token')
        .eq('user_id', userId)
        .eq('is_active', true);

      return credentials?.reduce((acc, cred) => {
        acc[cred.integration_name] = cred.access_token;
        return acc;
      }, {} as Record<string, string>) || {};
    } catch (error) {
      console.error('Failed to get user credentials:', error);
      return {};
    }
  }

  /**
   * Perform the actual agent execution
   */
  private async performExecution(run: any, credentials: Record<string, string>, logger: ExecutionLogger): Promise<any> {
    // Simulate agent execution - replace with actual execution logic
    await logger.debug('Executing agent workflow', {
      inputKeys: Object.keys(run.input_payload || {}).length,
      credentialServices: Object.keys(credentials)
    }, 'execute');

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));

    // Simulate webhook call if configured
    if (run.webhook_url) {
      await logger.info('Calling webhook', { url: run.webhook_url }, 'webhook');
      
      const webhookResponse = await fetch(run.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AgentFlow-Executor/1.0'
        },
        body: JSON.stringify({
          runId: run.id,
          agentId: run.user_agents.agent_id,
          input: run.input_payload,
          timestamp: new Date().toISOString()
        })
      });

      if (!webhookResponse.ok) {
        throw new Error(`Webhook failed: ${webhookResponse.status}`);
      }

      await logger.debug('Webhook completed successfully', {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText
      }, 'webhook');
    }

    return {
      message: 'Agent execution completed',
      timestamp: new Date().toISOString(),
      data: run.input_payload
    };
  }

  /**
   * Calculate priority score for queue ordering
   */
  private calculatePriorityScore(config: AgentRunConfig): number {
    let score = 100; // Base score

    // Priority adjustment
    switch (config.priority) {
      case 'high': score += 50; break;
      case 'low': score -= 25; break;
      default: break; // normal priority
    }

    // Timeout adjustment (shorter timeout = higher priority)
    const timeoutMs = config.timeoutMs || this.defaultTimeout;
    score += Math.max(0, (60000 - timeoutMs) / 1000); // Up to 60 points for urgency

    return score;
  }

  /**
   * Start the queue processor
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.runningJobs.size >= this.maxConcurrentRuns) {
        return;
      }

      this.isProcessing = true;

      try {
        // Get highest priority pending run
        const entries = Array.from(this.runQueue.entries());
        if (entries.length === 0) {
          return;
        }

        // Sort by priority (highest first)
        entries.sort((a, b) => b[1].priority - a[1].priority);
        const [runId, queueItem] = entries[0];

        // Remove from queue and execute
        this.runQueue.delete(runId);
        this.executeRun(runId).catch(error => {
          console.error(`Failed to execute run ${runId}:`, error);
        });

      } catch (error) {
        console.error('Queue processor error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Check queue every second
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        // Get all agents that have recent runs
        const { data: agents } = await supabase
          .from('agents')
          .select('id')
          .in('id', Array.from(this.runningJobs.values()).map(job => job.config.userAgentId));

        if (agents) {
          for (const agent of agents) {
            await supabase.rpc('calculate_agent_health_score', { agent_uuid: agent.id });
          }
        }
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, this.healthCheckInterval);
  }

  /**
   * Start failure alert checking
   */
  private startFailureAlertChecking(): void {
    setInterval(async () => {
      try {
        await supabase.rpc('check_agent_failure_alerts');
      } catch (error) {
        console.error('Failure alert checking error:', error);
      }
    }, 300000); // Check every 5 minutes
  }

  /**
   * Update agent health metrics
   */
  private async updateAgentHealth(agentId: string, result: AgentRunResult): Promise<void> {
    try {
      const existing = this.healthScores.get(agentId);
      const now = new Date();

      if (!existing || (now.getTime() - existing.lastUpdated.getTime()) > 300000) { // 5 minutes
        // Recalculate health score
        const { data: healthData } = await supabase
          .from('agent_health_scores')
          .select('*')
          .eq('agent_id', agentId)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .single();

        if (healthData) {
          this.healthScores.set(agentId, {
            agentId,
            healthScore: parseFloat(healthData.health_score),
            successRate: parseFloat(healthData.success_rate),
            avgResponseTime: healthData.avg_response_time_ms,
            errorRate: parseFloat(healthData.error_rate),
            lastUpdated: now
          });
        }
      }
    } catch (error) {
      console.error('Failed to update agent health:', error);
    }
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): {
    pendingRuns: number;
    runningRuns: number;
    maxConcurrent: number;
    queueItems: Array<{ runId: string; priority: number; queuedAt: Date }>;
  } {
    return {
      pendingRuns: this.runQueue.size,
      runningRuns: this.runningJobs.size,
      maxConcurrent: this.maxConcurrentRuns,
      queueItems: Array.from(this.runQueue.entries()).map(([runId, item]) => ({
        runId,
        priority: item.priority,
        queuedAt: item.queuedAt
      }))
    };
  }

  /**
   * Get agent health metrics
   */
  getAgentHealth(agentId: string): AgentHealthMetrics | null {
    return this.healthScores.get(agentId) || null;
  }

  /**
   * Emergency stop all running jobs
   */
  async emergencyStop(): Promise<void> {
    console.warn('Emergency stop triggered - stopping all running jobs');
    
    for (const [runId] of Array.from(this.runningJobs)) {
      await supabase
        .from('agent_runs')
        .update({
          status: 'cancelled',
          error: 'Emergency stop triggered',
          completed_at: new Date().toISOString()
        })
        .eq('id', runId);
    }

    this.runningJobs.clear();
    this.runQueue.clear();
  }
}

// Export singleton instance
export const agentExecutionEngine = new EnhancedAgentExecutionEngine();
