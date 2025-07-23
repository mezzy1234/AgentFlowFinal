// Runtime Container - Isolated execution environment for agents
// Provides memory isolation, resource monitoring, and execution control

export interface ContainerConfig {
  containerId: string;
  agentId: string;
  organizationId: string;
  memoryLimitMB: number;
  timeoutMs: number;
  enableLogging: boolean;
  enableMetrics: boolean;
}

export interface ContainerState {
  containerId: string;
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'error';
  startTime: Date | null;
  endTime: Date | null;
  executionCount: number;
  memoryUsageMB: number;
  cpuUsagePercent: number;
  lastExecution: Date | null;
  errorCount: number;
  lastError: string | null;
}

export interface ExecutionContext {
  runId: string;
  config: any; // AgentRunConfig from manager
  memory: any | null; // AgentMemoryState from manager
  organizationId: string;
}

export interface ExecutionResult {
  executionId: string;
  success: boolean;
  output?: any;
  error?: string;
  executionTimeMs: number;
  memoryUsedMB: number;
  cpuUsedPercent: number;
}

/**
 * Runtime Container - Isolated execution environment for agents
 * Simulates container-like isolation with memory and resource tracking
 */
export class RuntimeContainer {
  private state: ContainerState;
  private executionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private memorySnapshot: any = null;
  private metricsCollector: any; // MetricsCollector type

  constructor(
    private config: ContainerConfig,
    metricsCollector: any
  ) {
    this.metricsCollector = metricsCollector;
    this.state = {
      containerId: config.containerId,
      status: 'idle',
      startTime: null,
      endTime: null,
      executionCount: 0,
      memoryUsageMB: 0,
      cpuUsagePercent: 0,
      lastExecution: null,
      errorCount: 0,
      lastError: null
    };
  }

  /**
   * Execute agent in isolated container environment
   */
  async execute(context: ExecutionContext): Promise<string> {
    const executionId = `exec_${context.runId}_${Date.now()}`;
    const startTime = Date.now();

    try {
      // Update container state
      this.state.status = 'running';
      this.state.startTime = new Date();
      this.state.executionCount++;
      this.state.lastExecution = new Date();

      // Set execution timeout
      const timeoutHandle = setTimeout(() => {
        this.handleExecutionTimeout(executionId);
      }, this.config.timeoutMs);
      
      this.executionTimeouts.set(executionId, timeoutHandle);

      // Capture memory snapshot before execution
      this.captureMemorySnapshot();

      // Log execution start
      if (this.config.enableLogging) {
        console.log(`Container ${this.config.containerId}: Starting execution ${executionId}`);
      }

      // Perform the actual agent execution
      const result = await this.performIsolatedExecution(context, executionId);

      // Clear timeout
      const timeout = this.executionTimeouts.get(executionId);
      if (timeout) {
        clearTimeout(timeout);
        this.executionTimeouts.delete(executionId);
      }

      // Calculate execution metrics
      const executionTimeMs = Date.now() - startTime;
      const memoryUsed = this.calculateMemoryUsage();
      const cpuUsed = this.calculateCPUUsage();

      // Update container state
      this.state.status = 'idle';
      this.state.endTime = new Date();
      this.state.memoryUsageMB = memoryUsed;
      this.state.cpuUsagePercent = cpuUsed;

      // Record execution metrics
      if (this.config.enableMetrics) {
        await this.metricsCollector.recordContainerExecution(this.config.containerId, {
          executionId,
          success: result.success,
          executionTimeMs,
          memoryUsedMB: memoryUsed,
          cpuUsedPercent: cpuUsed,
          timestamp: new Date()
        });
      }

      // Log execution completion
      if (this.config.enableLogging) {
        console.log(`Container ${this.config.containerId}: Completed execution ${executionId} in ${executionTimeMs}ms`);
      }

      return executionId;

    } catch (error) {
      // Handle execution error
      const executionTimeMs = Date.now() - startTime;
      await this.handleExecutionError(executionId, error as Error, executionTimeMs);
      throw error;
    }
  }

  /**
   * Perform isolated execution with resource monitoring
   */
  private async performIsolatedExecution(
    context: ExecutionContext, 
    executionId: string
  ): Promise<ExecutionResult> {
    try {
      // Simulate isolated execution environment
      // In production, this would use Docker, Firecracker, or similar
      
      // Create isolated execution context
      const isolatedContext = {
        executionId,
        runId: context.runId,
        agentId: this.config.agentId,
        organizationId: context.organizationId,
        memoryLimit: this.config.memoryLimitMB,
        timeoutMs: this.config.timeoutMs,
        restoreMemory: context.memory,
        config: context.config
      };

      // Execute agent workflow
      const result = await this.executeAgentWorkflow(isolatedContext);

      return {
        executionId,
        success: true,
        output: result,
        executionTimeMs: 0, // Will be calculated by caller
        memoryUsedMB: this.calculateMemoryUsage(),
        cpuUsedPercent: this.calculateCPUUsage()
      };

    } catch (error) {
      return {
        executionId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: 0, // Will be calculated by caller
        memoryUsedMB: this.calculateMemoryUsage(),
        cpuUsedPercent: this.calculateCPUUsage()
      };
    }
  }

  /**
   * Execute agent workflow with monitoring
   */
  private async executeAgentWorkflow(isolatedContext: any): Promise<any> {
    // This is where the actual agent execution happens
    // For now, simulate with webhook call like the existing system
    
    if (isolatedContext.config.webhookUrl) {
      const payload = {
        ...isolatedContext.config.inputPayload,
        credentials: isolatedContext.config.credentials,
        metadata: {
          executionId: isolatedContext.executionId,
          agentId: isolatedContext.agentId,
          organizationId: isolatedContext.organizationId,
          containerInfo: {
            containerId: this.config.containerId,
            memoryLimit: this.config.memoryLimitMB,
            timeoutMs: this.config.timeoutMs
          },
          restoreMemory: isolatedContext.restoreMemory,
          timestamp: new Date().toISOString()
        }
      };

      const response = await fetch(isolatedContext.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AgentFlow-RuntimeContainer/1.0',
          'X-Container-Id': this.config.containerId,
          'X-Organization-Id': isolatedContext.organizationId
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeoutMs)
      });

      if (!response.ok) {
        throw new Error(`Webhook execution failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } else {
      // Direct execution simulation
      return {
        message: 'Agent executed successfully in isolated container',
        executionId: isolatedContext.executionId,
        containerId: this.config.containerId,
        timestamp: new Date().toISOString(),
        memoryRestored: !!isolatedContext.restoreMemory
      };
    }
  }

  /**
   * Handle execution timeout
   */
  private async handleExecutionTimeout(executionId: string): Promise<void> {
    console.warn(`Container ${this.config.containerId}: Execution ${executionId} timed out`);
    
    this.state.status = 'error';
    this.state.errorCount++;
    this.state.lastError = 'Execution timeout';
    this.state.endTime = new Date();

    // Record timeout metric
    if (this.config.enableMetrics) {
      await this.metricsCollector.recordContainerTimeout(this.config.containerId, {
        executionId,
        timeoutMs: this.config.timeoutMs,
        timestamp: new Date()
      });
    }

    // Cleanup timeout
    this.executionTimeouts.delete(executionId);
  }

  /**
   * Handle execution error
   */
  private async handleExecutionError(
    executionId: string, 
    error: Error, 
    executionTimeMs: number
  ): Promise<void> {
    console.error(`Container ${this.config.containerId}: Execution ${executionId} failed:`, error);
    
    this.state.status = 'error';
    this.state.errorCount++;
    this.state.lastError = error.message;
    this.state.endTime = new Date();

    // Clear any pending timeout
    const timeout = this.executionTimeouts.get(executionId);
    if (timeout) {
      clearTimeout(timeout);
      this.executionTimeouts.delete(executionId);
    }

    // Record error metric
    if (this.config.enableMetrics) {
      await this.metricsCollector.recordContainerError(this.config.containerId, {
        executionId,
        error: error.message,
        executionTimeMs,
        timestamp: new Date()
      });
    }
  }

  /**
   * Capture memory snapshot for monitoring
   */
  private captureMemorySnapshot(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.memorySnapshot = process.memoryUsage();
    } else {
      // Fallback for browser environment
      this.memorySnapshot = {
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        arrayBuffers: 0
      };
    }
  }

  /**
   * Calculate current memory usage in MB
   */
  private calculateMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage && this.memorySnapshot) {
      const current = process.memoryUsage();
      const usedBytes = current.heapUsed - this.memorySnapshot.heapUsed;
      return Math.max(0, Math.round(usedBytes / 1024 / 1024 * 100) / 100);
    }
    
    // Simulate memory usage for demo
    return Math.round(Math.random() * 50 * 100) / 100; // 0-50MB
  }

  /**
   * Calculate current CPU usage percentage
   */
  private calculateCPUUsage(): number {
    // In production, this would measure actual CPU usage
    // For now, simulate based on execution characteristics
    const baseUsage = Math.random() * 30; // 0-30% base
    const executionLoad = this.state.executionCount > 0 ? Math.random() * 40 : 0; // 0-40% additional
    return Math.round((baseUsage + executionLoad) * 100) / 100;
  }

  /**
   * Pause container execution
   */
  async pause(): Promise<void> {
    if (this.state.status === 'running') {
      console.log(`Container ${this.config.containerId}: Pausing execution`);
      this.state.status = 'paused';
    }
  }

  /**
   * Resume container execution
   */
  async resume(): Promise<void> {
    if (this.state.status === 'paused') {
      console.log(`Container ${this.config.containerId}: Resuming execution`);
      this.state.status = 'idle';
    }
  }

  /**
   * Stop container and cleanup resources
   */
  async stop(): Promise<void> {
    console.log(`Container ${this.config.containerId}: Stopping`);
    
    // Clear all pending timeouts
    this.executionTimeouts.forEach(timeout => clearTimeout(timeout));
    this.executionTimeouts.clear();
    
    this.state.status = 'stopped';
    this.state.endTime = new Date();
  }

  /**
   * Graceful shutdown of container
   */
  async shutdown(): Promise<void> {
    console.log(`Container ${this.config.containerId}: Shutting down`);
    
    // Wait for running executions to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.state.status === 'running' && Date.now() - startTime < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Force stop if still running
    if (this.state.status === 'running') {
      console.warn(`Container ${this.config.containerId}: Force stopping due to shutdown timeout`);
    }
    
    await this.stop();
  }

  /**
   * Get current container state
   */
  getState(): ContainerState {
    return { ...this.state };
  }

  /**
   * Get container configuration
   */
  getConfig(): ContainerConfig {
    return { ...this.config };
  }

  /**
   * Check if container is healthy
   */
  isHealthy(): boolean {
    const errorRate = this.state.executionCount > 0 ? 
      this.state.errorCount / this.state.executionCount : 0;
    
    return this.state.status !== 'error' && 
           errorRate < 0.5 && // Less than 50% error rate
           this.state.memoryUsageMB < this.config.memoryLimitMB;
  }

  /**
   * Get container health score (0-100)
   */
  getHealthScore(): number {
    if (this.state.executionCount === 0) return 100; // New container is healthy
    
    let score = 100;
    
    // Penalize for errors
    const errorRate = this.state.errorCount / this.state.executionCount;
    score -= errorRate * 50; // Up to -50 points for errors
    
    // Penalize for high memory usage
    const memoryPercent = (this.state.memoryUsageMB / this.config.memoryLimitMB) * 100;
    if (memoryPercent > 80) {
      score -= (memoryPercent - 80) * 2; // -2 points per % over 80%
    }
    
    // Penalize for high CPU usage
    if (this.state.cpuUsagePercent > 80) {
      score -= (this.state.cpuUsagePercent - 80) * 1; // -1 point per % over 80%
    }
    
    // Status penalties
    if (this.state.status === 'error') score -= 30;
    if (this.state.status === 'stopped') score = 0;
    
    return Math.max(0, Math.round(score));
  }
}
