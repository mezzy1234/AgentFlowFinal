// Agent Runtime Management Layer - Core Orchestration
// Provides distributed, multi-tenant agent runtime with isolation, memory pools, and metrics

import { createClient } from '@supabase/supabase-js';
import { RuntimeContainer, ContainerConfig, ContainerState } from './container';
import { RuntimeMetrics, MetricsCollector } from './metrics';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Core interfaces
export interface OrganizationRuntime {
  organizationId: string;
  runtimeId: string;
  containers: Map<string, RuntimeContainer>;
  memoryPool: AgentMemoryPool;
  resourceLimits: ResourceLimits;
  metrics: RuntimeMetrics;
  status: 'active' | 'paused' | 'shutdown';
  createdAt: Date;
  lastActivity: Date;
}

export interface ResourceLimits {
  maxConcurrentAgents: number;
  maxMemoryMB: number;
  maxCPUPercent: number;
  maxExecutionTimeSeconds: number;
  maxQueueSize: number;
  rateLimitPerMinute: number;
}

export interface AgentMemoryPool {
  poolId: string;
  organizationId: string;
  maxMemoryMB: number;
  currentUsageMB: number;
  longRunningAgents: Map<string, AgentMemoryState>;
  memoryCleanupSchedule: CleanupSchedule;
}

export interface AgentMemoryState {
  agentId: string;
  conversationHistory: ConversationTurn[];
  contextVariables: Record<string, any>;
  sessionData: Record<string, any>;
  lastAccessTime: Date;
  expiryTime: Date;
  memorySize: number;
}

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CleanupSchedule {
  intervalMinutes: number;
  maxMemoryAge: number;
  compressionEnabled: boolean;
}

export interface AgentExecutionRequest {
  agentId: string;
  organizationId: string;
  userId: string;
  runId: string;
  config: AgentRunConfig;
  priority: 'low' | 'normal' | 'high';
  requiresMemory: boolean;
}

export interface AgentRunConfig {
  userAgentId: string;
  webhookUrl: string;
  inputPayload: any;
  credentials: Record<string, string>;
  maxRetries?: number;
  timeoutMs?: number;
  memoryConfig?: MemoryConfig;
}

export interface MemoryConfig {
  persistMemory: boolean;
  maxMemoryMB: number;
  compressionEnabled: boolean;
  expiryHours: number;
}

/**
 * Core Agent Runtime Manager
 * Orchestrates multi-tenant agent execution with isolation and resource management
 */
export class AgentRuntimeManager {
  private organizationRuntimes: Map<string, OrganizationRuntime> = new Map();
  private metricsCollector: MetricsCollector;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.metricsCollector = new MetricsCollector();
    this.startHealthMonitoring();
    this.startMemoryCleanup();
  }

  /**
   * Get or create organization runtime with proper isolation
   */
  async getOrganizationRuntime(organizationId: string): Promise<OrganizationRuntime> {
    let runtime = this.organizationRuntimes.get(organizationId);
    
    if (!runtime) {
      runtime = await this.createOrganizationRuntime(organizationId);
      this.organizationRuntimes.set(organizationId, runtime);
    }

    // Update last activity
    runtime.lastActivity = new Date();
    
    return runtime;
  }

  /**
   * Create new isolated runtime for organization
   */
  private async createOrganizationRuntime(organizationId: string): Promise<OrganizationRuntime> {
    try {
      // Generate unique runtime ID
      const runtimeId = `runtime_${organizationId}_${Date.now()}`;
      
      // Get organization limits from database
      const resourceLimits = await this.getOrganizationLimits(organizationId);
      
      // Create memory pool
      const memoryPool = await this.createMemoryPool(organizationId, resourceLimits);
      
      // Initialize runtime metrics
      const metrics = await this.metricsCollector.initializeRuntimeMetrics(organizationId, runtimeId);
      
      const runtime: OrganizationRuntime = {
        organizationId,
        runtimeId,
        containers: new Map(),
        memoryPool,
        resourceLimits,
        metrics,
        status: 'active',
        createdAt: new Date(),
        lastActivity: new Date()
      };

      // Store runtime configuration in database
      await this.persistRuntimeConfiguration(runtime);
      
      console.log(`Created runtime ${runtimeId} for organization ${organizationId}`);
      return runtime;
      
    } catch (error) {
      console.error(`Failed to create runtime for organization ${organizationId}:`, error);
      throw new Error(`Runtime creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute agent with runtime isolation and memory management
   */
  async executeAgent(request: AgentExecutionRequest): Promise<string> {
    try {
      // Get organization runtime
      const runtime = await this.getOrganizationRuntime(request.organizationId);
      
      // Check resource limits
      if (!this.canExecuteInRuntime(runtime, request)) {
        throw new Error('Resource limits exceeded - execution rejected');
      }
      
      // Create or reuse container for agent
      let container = runtime.containers.get(request.agentId);
      
      if (!container) {
        container = await this.createAgentContainer(runtime, request);
        runtime.containers.set(request.agentId, container);
      }
      
      // Restore agent memory if needed
      let agentMemory: AgentMemoryState | null = null;
      if (request.requiresMemory) {
        agentMemory = await this.restoreAgentMemory(runtime.memoryPool, request.agentId);
      }
      
      // Execute in container with isolation
      const executionId = await container.execute({
        runId: request.runId,
        config: request.config,
        memory: agentMemory,
        organizationId: request.organizationId
      });
      
      // Update runtime metrics
      await this.metricsCollector.recordExecution(runtime.metrics, {
        agentId: request.agentId,
        executionId,
        timestamp: new Date(),
        status: 'started'
      });
      
      return executionId;
      
    } catch (error) {
      console.error(`Failed to execute agent ${request.agentId}:`, error);
      throw error;
    }
  }

  /**
   * Check if execution can proceed within resource limits
   */
  private canExecuteInRuntime(runtime: OrganizationRuntime, request: AgentExecutionRequest): boolean {
    const activeContainers = Array.from(runtime.containers.values())
      .filter(container => container.getState().status === 'running').length;
    
    const memoryUsage = runtime.memoryPool.currentUsageMB;
    
    // Check limits
    if (activeContainers >= runtime.resourceLimits.maxConcurrentAgents) {
      console.warn(`Max concurrent agents reached for org ${runtime.organizationId}`);
      return false;
    }
    
    if (memoryUsage >= runtime.resourceLimits.maxMemoryMB) {
      console.warn(`Memory limit reached for org ${runtime.organizationId}`);
      return false;
    }
    
    return true;
  }

  /**
   * Create new isolated container for agent execution
   */
  private async createAgentContainer(
    runtime: OrganizationRuntime, 
    request: AgentExecutionRequest
  ): Promise<RuntimeContainer> {
    const containerId = `container_${request.agentId}_${Date.now()}`;
    
    const containerConfig: ContainerConfig = {
      containerId,
      agentId: request.agentId,
      organizationId: runtime.organizationId,
      memoryLimitMB: Math.min(256, runtime.resourceLimits.maxMemoryMB / 4), // 1/4 of org limit per container
      timeoutMs: runtime.resourceLimits.maxExecutionTimeSeconds * 1000,
      enableLogging: true,
      enableMetrics: true
    };
    
    return new RuntimeContainer(containerConfig, this.metricsCollector);
  }

  /**
   * Restore agent memory from pool
   */
  private async restoreAgentMemory(
    memoryPool: AgentMemoryPool, 
    agentId: string
  ): Promise<AgentMemoryState | null> {
    try {
      const memoryState = memoryPool.longRunningAgents.get(agentId);
      
      if (!memoryState) {
        // Try to restore from database
        const { data: persistedMemory } = await supabase
          .from('agent_memory_states')
          .select('*')
          .eq('pool_id', memoryPool.poolId)
          .eq('agent_id', agentId)
          .gt('expiry_time', new Date().toISOString())
          .single();
        
        if (persistedMemory) {
          const restored: AgentMemoryState = {
            agentId,
            conversationHistory: persistedMemory.memory_data.conversationHistory || [],
            contextVariables: persistedMemory.memory_data.contextVariables || {},
            sessionData: persistedMemory.memory_data.sessionData || {},
            lastAccessTime: new Date(),
            expiryTime: new Date(persistedMemory.expiry_time),
            memorySize: persistedMemory.memory_size_mb
          };
          
          // Cache in memory pool
          memoryPool.longRunningAgents.set(agentId, restored);
          return restored;
        }
      }
      
      if (memoryState) {
        // Update last access time
        memoryState.lastAccessTime = new Date();
        return memoryState;
      }
      
      return null;
      
    } catch (error) {
      console.error(`Failed to restore memory for agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Store agent memory in pool
   */
  async storeAgentMemory(
    memoryPool: AgentMemoryPool, 
    agentId: string, 
    memoryState: AgentMemoryState
  ): Promise<void> {
    try {
      // Update memory pool
      memoryPool.longRunningAgents.set(agentId, memoryState);
      memoryPool.currentUsageMB += memoryState.memorySize;
      
      // Persist to database
      await supabase
        .from('agent_memory_states')
        .upsert({
          pool_id: memoryPool.poolId,
          agent_id: agentId,
          memory_data: {
            conversationHistory: memoryState.conversationHistory,
            contextVariables: memoryState.contextVariables,
            sessionData: memoryState.sessionData
          },
          memory_size_mb: memoryState.memorySize,
          last_access_time: memoryState.lastAccessTime.toISOString(),
          expiry_time: memoryState.expiryTime.toISOString()
        }, {
          onConflict: 'pool_id,agent_id'
        });
      
    } catch (error) {
      console.error(`Failed to store memory for agent ${agentId}:`, error);
    }
  }

  /**
   * Get organization resource limits
   */
  private async getOrganizationLimits(organizationId: string): Promise<ResourceLimits> {
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('subscription_tier, custom_limits')
        .eq('id', organizationId)
        .single();
      
      if (org?.custom_limits) {
        return org.custom_limits;
      }
      
      // Default limits based on subscription tier
      const tierLimits: Record<string, ResourceLimits> = {
        'free': {
          maxConcurrentAgents: 2,
          maxMemoryMB: 256,
          maxCPUPercent: 50,
          maxExecutionTimeSeconds: 60,
          maxQueueSize: 10,
          rateLimitPerMinute: 30
        },
        'pro': {
          maxConcurrentAgents: 10,
          maxMemoryMB: 1024,
          maxCPUPercent: 80,
          maxExecutionTimeSeconds: 300,
          maxQueueSize: 100,
          rateLimitPerMinute: 300
        },
        'enterprise': {
          maxConcurrentAgents: 50,
          maxMemoryMB: 4096,
          maxCPUPercent: 90,
          maxExecutionTimeSeconds: 1800,
          maxQueueSize: 1000,
          rateLimitPerMinute: 1000
        }
      };
      
      return tierLimits[org?.subscription_tier || 'free'];
      
    } catch (error) {
      console.error(`Failed to get limits for organization ${organizationId}:`, error);
      // Return safe defaults
      return {
        maxConcurrentAgents: 1,
        maxMemoryMB: 128,
        maxCPUPercent: 30,
        maxExecutionTimeSeconds: 30,
        maxQueueSize: 5,
        rateLimitPerMinute: 10
      };
    }
  }

  /**
   * Create memory pool for organization
   */
  private async createMemoryPool(
    organizationId: string, 
    limits: ResourceLimits
  ): Promise<AgentMemoryPool> {
    const poolId = `pool_${organizationId}_${Date.now()}`;
    
    const memoryPool: AgentMemoryPool = {
      poolId,
      organizationId,
      maxMemoryMB: limits.maxMemoryMB,
      currentUsageMB: 0,
      longRunningAgents: new Map(),
      memoryCleanupSchedule: {
        intervalMinutes: 30,
        maxMemoryAge: 24 * 60, // 24 hours
        compressionEnabled: true
      }
    };
    
    // Store in database
    await supabase
      .from('agent_memory_pools')
      .insert({
        pool_id: poolId,
        organization_id: organizationId,
        max_memory_mb: limits.maxMemoryMB,
        current_usage_mb: 0,
        cleanup_schedule: memoryPool.memoryCleanupSchedule
      });
    
    return memoryPool;
  }

  /**
   * Persist runtime configuration
   */
  private async persistRuntimeConfiguration(runtime: OrganizationRuntime): Promise<void> {
    await supabase
      .from('organization_runtimes')
      .insert({
        runtime_id: runtime.runtimeId,
        organization_id: runtime.organizationId,
        status: runtime.status,
        resource_limits: runtime.resourceLimits,
        created_at: runtime.createdAt.toISOString(),
        updated_at: new Date().toISOString()
      });
  }

  /**
   * Start health monitoring for all runtimes
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const runtimes = Array.from(this.organizationRuntimes.values());
        for (const runtime of runtimes) {
          await this.performHealthCheck(runtime);
        }
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Start memory cleanup process
   */
  private startMemoryCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        const runtimes = Array.from(this.organizationRuntimes.values());
        for (const runtime of runtimes) {
          await this.cleanupExpiredMemory(runtime.memoryPool);
        }
      } catch (error) {
        console.error('Memory cleanup error:', error);
      }
    }, 30 * 60 * 1000); // Clean every 30 minutes
  }

  /**
   * Perform health check on runtime
   */
  private async performHealthCheck(runtime: OrganizationRuntime): Promise<void> {
    try {
      const activeContainers = Array.from(runtime.containers.values())
        .filter(container => container.getState().status === 'running').length;
      
      const memoryUsage = runtime.memoryPool.currentUsageMB;
      const memoryPercent = (memoryUsage / runtime.memoryPool.maxMemoryMB) * 100;
      
      // Update runtime metrics
      runtime.metrics.currentExecutions = activeContainers;
      runtime.metrics.memoryUtilization = memoryPercent;
      runtime.metrics.lastUpdated = new Date();
      
      // Check for issues
      if (memoryPercent > 90) {
        console.warn(`High memory usage in runtime ${runtime.runtimeId}: ${memoryPercent}%`);
      }
      
      if (activeContainers >= runtime.resourceLimits.maxConcurrentAgents) {
        console.warn(`Max concurrent agents reached in runtime ${runtime.runtimeId}`);
      }
      
      // Persist metrics
      await this.metricsCollector.persistRuntimeMetrics(runtime.metrics);
      
    } catch (error) {
      console.error(`Health check failed for runtime ${runtime.runtimeId}:`, error);
    }
  }

  /**
   * Clean up expired memory from pool
   */
  private async cleanupExpiredMemory(memoryPool: AgentMemoryPool): Promise<void> {
    try {
      const now = new Date();
      let freedMemoryMB = 0;
      
      // Clean expired memory states
      const memoryEntries = Array.from(memoryPool.longRunningAgents.entries());
      for (const [agentId, memoryState] of memoryEntries) {
        if (memoryState.expiryTime < now) {
          memoryPool.longRunningAgents.delete(agentId);
          freedMemoryMB += memoryState.memorySize;
          
          // Remove from database
          await supabase
            .from('agent_memory_states')
            .delete()
            .eq('pool_id', memoryPool.poolId)
            .eq('agent_id', agentId);
        }
      }
      
      // Update current usage
      memoryPool.currentUsageMB = Math.max(0, memoryPool.currentUsageMB - freedMemoryMB);
      
      if (freedMemoryMB > 0) {
        console.log(`Cleaned up ${freedMemoryMB}MB from memory pool ${memoryPool.poolId}`);
      }
      
    } catch (error) {
      console.error(`Memory cleanup failed for pool ${memoryPool.poolId}:`, error);
    }
  }

  /**
   * Get runtime status for all organizations
   */
  getRuntimeStatus(): Array<{
    organizationId: string;
    runtimeId: string;
    status: string;
    activeContainers: number;
    memoryUsage: number;
    memoryPercent: number;
    lastActivity: Date;
  }> {
    return Array.from(this.organizationRuntimes.entries()).map(([orgId, runtime]) => {
      const activeContainers = Array.from(runtime.containers.values())
        .filter(container => container.getState().status === 'running').length;
      
      return {
        organizationId: orgId,
        runtimeId: runtime.runtimeId,
        status: runtime.status,
        activeContainers,
        memoryUsage: runtime.memoryPool.currentUsageMB,
        memoryPercent: (runtime.memoryPool.currentUsageMB / runtime.memoryPool.maxMemoryMB) * 100,
        lastActivity: runtime.lastActivity
      };
    });
  }

  /**
   * Shutdown runtime manager gracefully
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Agent Runtime Manager...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Shutdown all runtimes
    const runtimeEntries = Array.from(this.organizationRuntimes.entries());
    for (const [orgId, runtime] of runtimeEntries) {
      runtime.status = 'shutdown';
      
      // Shutdown all containers
      const containerEntries = Array.from(runtime.containers.entries());
      for (const [agentId, container] of containerEntries) {
        await container.shutdown();
      }
    }
    
    console.log('Agent Runtime Manager shutdown complete');
  }
}

// Export singleton instance
export const agentRuntimeManager = new AgentRuntimeManager();
