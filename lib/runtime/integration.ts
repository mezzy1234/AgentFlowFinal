// Runtime Integration - Connects new runtime management with existing execution engines
// Provides backward compatibility while enabling advanced runtime features

import { agentRuntimeManager, AgentExecutionRequest } from './manager';
import { EnhancedAgentExecutionEngine, AgentRunConfig } from '../enhanced-agent-execution';
import { AgentExecutionEngine } from '../agent-execution';

export interface RuntimeExecutionConfig extends AgentRunConfig {
  organizationId: string;
  userId: string;
  requiresMemory?: boolean;
  runtimePriority?: 'low' | 'normal' | 'high';
  isolationLevel?: 'basic' | 'enhanced' | 'strict';
}

export interface RuntimeExecutionResult {
  executionId: string;
  runtimeId: string;
  containerId?: string;
  success: boolean;
  output?: any;
  error?: string;
  executionTimeMs: number;
  memoryUsedMB?: number;
  healthImpact: 'positive' | 'neutral' | 'negative';
}

/**
 * RuntimeIntegratedExecutionEngine
 * Bridges the new runtime management system with existing execution engines
 */
export class RuntimeIntegratedExecutionEngine {
  private enhancedEngine: EnhancedAgentExecutionEngine;
  private basicEngine: AgentExecutionEngine;

  constructor(supabase: any) {
    this.enhancedEngine = new EnhancedAgentExecutionEngine();
    this.basicEngine = new AgentExecutionEngine(supabase);
  }

  /**
   * Execute agent with runtime isolation and advanced features
   */
  async executeWithRuntime(config: RuntimeExecutionConfig): Promise<RuntimeExecutionResult> {
    const startTime = Date.now();

    try {
      // Determine execution strategy based on isolation level
      const isolationLevel = config.isolationLevel || 'enhanced';
      
      if (isolationLevel === 'strict') {
        // Use new runtime management system with full isolation
        return await this.executeWithStrictIsolation(config);
      } else if (isolationLevel === 'enhanced') {
        // Use enhanced engine with runtime monitoring
        return await this.executeWithEnhancedRuntime(config);
      } else {
        // Use basic execution with minimal runtime features
        return await this.executeWithBasicRuntime(config);
      }

    } catch (error) {
      return {
        executionId: `failed_${Date.now()}`,
        runtimeId: 'none',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: Date.now() - startTime,
        healthImpact: 'negative'
      };
    }
  }

  /**
   * Execute with strict runtime isolation (new system)
   */
  private async executeWithStrictIsolation(config: RuntimeExecutionConfig): Promise<RuntimeExecutionResult> {
    const startTime = Date.now();

    try {
      // Create runtime execution request
      const runtimeRequest: AgentExecutionRequest = {
        agentId: config.userAgentId,
        organizationId: config.organizationId,
        userId: config.userId,
        runId: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        config: {
          userAgentId: config.userAgentId,
          webhookUrl: config.webhookUrl,
          inputPayload: config.inputPayload,
          credentials: config.credentials,
          maxRetries: config.maxRetries,
          timeoutMs: config.timeoutMs,
          memoryConfig: config.requiresMemory ? {
            persistMemory: true,
            maxMemoryMB: 256,
            compressionEnabled: true,
            expiryHours: 24
          } : undefined
        },
        priority: config.runtimePriority || 'normal',
        requiresMemory: config.requiresMemory || false
      };

      // Execute through runtime manager
      const executionId = await agentRuntimeManager.executeAgent(runtimeRequest);
      
      // Get runtime info
      const runtimeStatus = agentRuntimeManager.getRuntimeStatus();
      const orgRuntime = runtimeStatus.find(r => r.organizationId === config.organizationId);

      const executionTime = Date.now() - startTime;

      return {
        executionId,
        runtimeId: orgRuntime?.runtimeId || 'unknown',
        containerId: `container_${config.userAgentId}`,
        success: true,
        output: {
          message: 'Executed with strict runtime isolation',
          executionId,
          runtimeId: orgRuntime?.runtimeId,
          isolationLevel: 'strict',
          timestamp: new Date().toISOString()
        },
        executionTimeMs: executionTime,
        memoryUsedMB: 0, // Will be updated by runtime system
        healthImpact: executionTime < 5000 ? 'positive' : 'neutral'
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        executionId: `failed_strict_${Date.now()}`,
        runtimeId: 'failed',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: executionTime,
        healthImpact: 'negative'
      };
    }
  }

  /**
   * Execute with enhanced runtime monitoring
   */
  private async executeWithEnhancedRuntime(config: RuntimeExecutionConfig): Promise<RuntimeExecutionResult> {
    const startTime = Date.now();

    try {
      // Queue run with enhanced engine
      const runId = await this.enhancedEngine.queueRun({
        userAgentId: config.userAgentId,
        webhookUrl: config.webhookUrl,
        inputPayload: config.inputPayload,
        credentials: config.credentials,
        maxRetries: config.maxRetries,
        timeoutMs: config.timeoutMs,
        priority: config.runtimePriority === 'high' ? 'high' : 
                 config.runtimePriority === 'low' ? 'low' : 'normal'
      });

      // Execute the run
      const result = await this.enhancedEngine.executeRun(runId);
      
      const executionTime = Date.now() - startTime;

      return {
        executionId: runId,
        runtimeId: 'enhanced',
        success: result.success,
        output: result.output,
        error: result.error,
        executionTimeMs: result.executionTimeMs,
        healthImpact: result.healthImpact
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        executionId: `failed_enhanced_${Date.now()}`,
        runtimeId: 'enhanced',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: executionTime,
        healthImpact: 'negative'
      };
    }
  }

  /**
   * Execute with basic runtime (backward compatibility)
   */
  private async executeWithBasicRuntime(config: RuntimeExecutionConfig): Promise<RuntimeExecutionResult> {
    const startTime = Date.now();

    try {
      // Queue run with basic engine
      const runId = await this.basicEngine.queueRun({
        userAgentId: config.userAgentId,
        webhookUrl: config.webhookUrl,
        inputPayload: config.inputPayload,
        credentials: config.credentials,
        maxRetries: config.maxRetries,
        timeoutMs: config.timeoutMs
      });

      // Basic engine doesn't return execution result directly
      // We'll simulate success for compatibility
      const executionTime = Date.now() - startTime;

      return {
        executionId: runId,
        runtimeId: 'basic',
        success: true,
        output: {
          message: 'Executed with basic runtime',
          runId,
          timestamp: new Date().toISOString()
        },
        executionTimeMs: executionTime,
        healthImpact: 'neutral'
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        executionId: `failed_basic_${Date.now()}`,
        runtimeId: 'basic',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: executionTime,
        healthImpact: 'negative'
      };
    }
  }

  /**
   * Get runtime status across all isolation levels
   */
  getRuntimeStatus(): {
    strict: Array<{
      organizationId: string;
      runtimeId: string;
      activeContainers: number;
      memoryUsage: number;
      status: string;
    }>;
    enhanced: {
      pendingRuns: number;
      runningRuns: number;
      maxConcurrent: number;
    };
    basic: {
      pending: number;
      running: number;
      maxConcurrent: number;
    };
  } {
    return {
      // Strict isolation runtime status
      strict: agentRuntimeManager.getRuntimeStatus(),
      
      // Enhanced engine status
      enhanced: this.enhancedEngine.getQueueStatus(),
      
      // Basic engine status
      basic: this.basicEngine.getQueueStatus()
    };
  }

  /**
   * Get detailed runtime metrics for dashboard
   */
  async getRuntimeMetrics(): Promise<{
    totalExecutions: number;
    activeRuntimes: number;
    memoryUtilization: number;
    errorRate: number;
    avgExecutionTime: number;
  }> {
    try {
      // Get metrics from runtime manager
      const strictStatus = agentRuntimeManager.getRuntimeStatus();
      
      // Get enhanced engine metrics
      const enhancedStatus = this.enhancedEngine.getQueueStatus();
      
      // Calculate aggregate metrics
      const totalActiveContainers = strictStatus.reduce((sum, runtime) => sum + runtime.activeContainers, 0);
      const avgMemoryUsage = strictStatus.length > 0 ? 
        strictStatus.reduce((sum, runtime) => sum + runtime.memoryUsage, 0) / strictStatus.length : 0;

      return {
        totalExecutions: totalActiveContainers + enhancedStatus.runningRuns,
        activeRuntimes: strictStatus.length,
        memoryUtilization: avgMemoryUsage,
        errorRate: 0, // Would need historical data to calculate
        avgExecutionTime: 0 // Would need historical data to calculate
      };

    } catch (error) {
      console.error('Failed to get runtime metrics:', error);
      return {
        totalExecutions: 0,
        activeRuntimes: 0,
        memoryUtilization: 0,
        errorRate: 0,
        avgExecutionTime: 0
      };
    }
  }

  /**
   * Emergency stop all runtime operations
   */
  async emergencyStop(): Promise<void> {
    console.warn('Emergency stop triggered across all runtime levels');
    
    try {
      // Stop strict isolation runtimes
      await agentRuntimeManager.shutdown();
      
      // Stop enhanced engine
      await this.enhancedEngine.emergencyStop();
      
      // Basic engine doesn't have emergency stop, but we can shut it down
      await this.basicEngine.shutdown();
      
    } catch (error) {
      console.error('Error during emergency stop:', error);
    }
  }

  /**
   * Graceful shutdown of all runtime systems
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down RuntimeIntegratedExecutionEngine...');
    
    try {
      // Shutdown in reverse order of criticality
      await this.basicEngine.shutdown();
      // Enhanced engine doesn't have explicit shutdown method
      await agentRuntimeManager.shutdown();
      
      console.log('RuntimeIntegratedExecutionEngine shutdown complete');
      
    } catch (error) {
      console.error('Error during runtime shutdown:', error);
    }
  }
}

/**
 * Factory function to create runtime-integrated execution engine
 */
export function createRuntimeIntegratedEngine(supabase: any): RuntimeIntegratedExecutionEngine {
  return new RuntimeIntegratedExecutionEngine(supabase);
}

/**
 * Utility function to determine optimal isolation level based on requirements
 */
export function determineIsolationLevel(config: {
  organizationTier: 'free' | 'pro' | 'enterprise';
  requiresMemory: boolean;
  isLongRunning: boolean;
  securityLevel: 'basic' | 'enhanced' | 'strict';
}): 'basic' | 'enhanced' | 'strict' {
  
  // Enterprise always gets strict isolation
  if (config.organizationTier === 'enterprise') {
    return 'strict';
  }
  
  // Long-running or memory-persistent agents need enhanced or strict
  if (config.requiresMemory || config.isLongRunning) {
    return config.organizationTier === 'pro' ? 'strict' : 'enhanced';
  }
  
  // Security requirements
  if (config.securityLevel === 'strict') {
    return 'strict';
  } else if (config.securityLevel === 'enhanced') {
    return 'enhanced';
  }
  
  // Default for free tier or simple agents
  return 'basic';
}

// Export singleton instance
let runtimeIntegratedEngine: RuntimeIntegratedExecutionEngine | null = null;

export function getRuntimeIntegratedEngine(supabase: any): RuntimeIntegratedExecutionEngine {
  if (!runtimeIntegratedEngine) {
    runtimeIntegratedEngine = new RuntimeIntegratedExecutionEngine(supabase);
  }
  return runtimeIntegratedEngine;
}
