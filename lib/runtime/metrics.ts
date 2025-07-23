// Runtime Metrics - Comprehensive monitoring and analytics for agent runtime
// Provides real-time metrics collection, historical analysis, and performance insights

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface RuntimeMetrics {
  organizationId: string;
  runtimeId: string;
  currentExecutions: number;
  queueLength: number;
  executionsPerMinute: number;
  avgExecutionTime: number;
  errorRate: number;
  memoryUtilization: number;
  cpuUtilization: number;
  successRate: number;
  lastUpdated: Date;
  historicalData: MetricsSnapshot[];
}

export interface MetricsSnapshot {
  timestamp: Date;
  executionCount: number;
  errorCount: number;
  avgResponseTime: number;
  memoryUsageMB: number;
  cpuUsagePercent: number;
  activeContainers: number;
}

export interface ContainerExecutionMetric {
  executionId: string;
  success: boolean;
  executionTimeMs: number;
  memoryUsedMB: number;
  cpuUsedPercent: number;
  timestamp: Date;
}

export interface ContainerTimeoutMetric {
  executionId: string;
  timeoutMs: number;
  timestamp: Date;
}

export interface ContainerErrorMetric {
  executionId: string;
  error: string;
  executionTimeMs: number;
  timestamp: Date;
}

export interface ExecutionMetric {
  agentId: string;
  executionId: string;
  timestamp: Date;
  status: 'started' | 'completed' | 'failed' | 'timeout';
}

export interface DashboardMetrics {
  // Real-time metrics
  totalExecutions: number;
  activeRuntimes: number;
  currentQueueDepth: number;
  overallErrorRate: number;
  avgExecutionTime: number;
  
  // Resource utilization
  totalMemoryUsage: number;
  avgCpuUsage: number;
  containerUtilization: number;
  
  // Performance trends
  executionTrends: TimeSeries[];
  errorTrends: TimeSeries[];
  performanceTrends: TimeSeries[];
  
  // Organization breakdown
  organizationMetrics: OrganizationMetrics[];
  
  // Top performers and issues
  topPerformingAgents: AgentPerformance[];
  problematicAgents: AgentIssue[];
}

export interface TimeSeries {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface OrganizationMetrics {
  organizationId: string;
  organizationName: string;
  activeAgents: number;
  totalExecutions: number;
  errorRate: number;
  avgExecutionTime: number;
  memoryUsage: number;
  subscriptionTier: string;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  executionCount: number;
  successRate: number;
  avgExecutionTime: number;
  healthScore: number;
}

export interface AgentIssue {
  agentId: string;
  agentName: string;
  issueType: 'high_error_rate' | 'slow_performance' | 'memory_leak' | 'timeout_frequent';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedExecutions: number;
  lastOccurrence: Date;
}

/**
 * MetricsCollector - Comprehensive metrics collection and analysis
 */
export class MetricsCollector {
  private metricsBuffer: Map<string, RuntimeMetrics> = new Map();
  private executionBuffer: Map<string, ContainerExecutionMetric[]> = new Map();
  private persistInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startMetricsPersistence();
  }

  /**
   * Initialize runtime metrics for new runtime
   */
  async initializeRuntimeMetrics(organizationId: string, runtimeId: string): Promise<RuntimeMetrics> {
    const metrics: RuntimeMetrics = {
      organizationId,
      runtimeId,
      currentExecutions: 0,
      queueLength: 0,
      executionsPerMinute: 0,
      avgExecutionTime: 0,
      errorRate: 0,
      memoryUtilization: 0,
      cpuUtilization: 0,
      successRate: 100,
      lastUpdated: new Date(),
      historicalData: []
    };

    this.metricsBuffer.set(runtimeId, metrics);
    return metrics;
  }

  /**
   * Record agent execution event
   */
  async recordExecution(metrics: RuntimeMetrics, execution: ExecutionMetric): Promise<void> {
    try {
      // Update real-time metrics
      if (execution.status === 'started') {
        metrics.currentExecutions++;
      } else if (execution.status === 'completed' || execution.status === 'failed') {
        metrics.currentExecutions = Math.max(0, metrics.currentExecutions - 1);
      }

      metrics.lastUpdated = new Date();

      // Store execution event
      await supabase
        .from('runtime_execution_events')
        .insert({
          runtime_id: metrics.runtimeId,
          organization_id: metrics.organizationId,
          agent_id: execution.agentId,
          execution_id: execution.executionId,
          status: execution.status,
          timestamp: execution.timestamp.toISOString()
        });

    } catch (error) {
      console.error('Failed to record execution:', error);
    }
  }

  /**
   * Record container execution metrics
   */
  async recordContainerExecution(containerId: string, metric: ContainerExecutionMetric): Promise<void> {
    try {
      // Add to buffer
      if (!this.executionBuffer.has(containerId)) {
        this.executionBuffer.set(containerId, []);
      }
      
      const buffer = this.executionBuffer.get(containerId)!;
      buffer.push(metric);

      // Keep buffer size manageable
      if (buffer.length > 100) {
        buffer.splice(0, 50); // Remove oldest 50 entries
      }

      // Store in database
      await supabase
        .from('container_execution_metrics')
        .insert({
          container_id: containerId,
          execution_id: metric.executionId,
          success: metric.success,
          execution_time_ms: metric.executionTimeMs,
          memory_used_mb: metric.memoryUsedMB,
          cpu_used_percent: metric.cpuUsedPercent,
          timestamp: metric.timestamp.toISOString()
        });

    } catch (error) {
      console.error('Failed to record container execution:', error);
    }
  }

  /**
   * Record container timeout event
   */
  async recordContainerTimeout(containerId: string, metric: ContainerTimeoutMetric): Promise<void> {
    try {
      await supabase
        .from('container_timeout_events')
        .insert({
          container_id: containerId,
          execution_id: metric.executionId,
          timeout_ms: metric.timeoutMs,
          timestamp: metric.timestamp.toISOString()
        });

    } catch (error) {
      console.error('Failed to record container timeout:', error);
    }
  }

  /**
   * Record container error event
   */
  async recordContainerError(containerId: string, metric: ContainerErrorMetric): Promise<void> {
    try {
      await supabase
        .from('container_error_events')
        .insert({
          container_id: containerId,
          execution_id: metric.executionId,
          error_message: metric.error,
          execution_time_ms: metric.executionTimeMs,
          timestamp: metric.timestamp.toISOString()
        });

    } catch (error) {
      console.error('Failed to record container error:', error);
    }
  }

  /**
   * Calculate and update runtime metrics
   */
  async calculateRuntimeMetrics(runtimeId: string): Promise<RuntimeMetrics | null> {
    try {
      const metrics = this.metricsBuffer.get(runtimeId);
      if (!metrics) return null;

      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      const oneHourAgo = new Date(now.getTime() - 3600000);

      // Get recent execution data
      const { data: recentExecutions } = await supabase
        .from('runtime_execution_events')
        .select('*')
        .eq('runtime_id', runtimeId)
        .gte('timestamp', oneHourAgo.toISOString())
        .order('timestamp', { ascending: false });

      if (recentExecutions) {
        // Calculate executions per minute
        const lastMinuteExecutions = recentExecutions.filter(
          e => new Date(e.timestamp) >= oneMinuteAgo
        ).length;
        metrics.executionsPerMinute = lastMinuteExecutions;

        // Calculate success rate and error rate
        const completedExecutions = recentExecutions.filter(
          e => e.status === 'completed' || e.status === 'failed'
        );
        
        if (completedExecutions.length > 0) {
          const successfulExecutions = completedExecutions.filter(e => e.status === 'completed').length;
          metrics.successRate = (successfulExecutions / completedExecutions.length) * 100;
          metrics.errorRate = ((completedExecutions.length - successfulExecutions) / completedExecutions.length) * 100;
        }

        // Get average execution time
        const { data: avgTime } = await supabase
          .rpc('get_avg_execution_time', { 
            p_runtime_id: runtimeId, 
            p_since: oneHourAgo.toISOString() 
          });

        if (avgTime && avgTime.length > 0) {
          metrics.avgExecutionTime = avgTime[0].avg_time || 0;
        }
      }

      // Create historical snapshot
      const snapshot: MetricsSnapshot = {
        timestamp: now,
        executionCount: metrics.executionsPerMinute,
        errorCount: Math.round((metrics.errorRate / 100) * metrics.executionsPerMinute),
        avgResponseTime: metrics.avgExecutionTime,
        memoryUsageMB: metrics.memoryUtilization,
        cpuUsagePercent: metrics.cpuUtilization,
        activeContainers: metrics.currentExecutions
      };

      metrics.historicalData.push(snapshot);

      // Keep only last 60 snapshots (1 hour if collected every minute)
      if (metrics.historicalData.length > 60) {
        metrics.historicalData.splice(0, metrics.historicalData.length - 60);
      }

      metrics.lastUpdated = now;
      return metrics;

    } catch (error) {
      console.error(`Failed to calculate metrics for runtime ${runtimeId}:`, error);
      return null;
    }
  }

  /**
   * Persist runtime metrics to database
   */
  async persistRuntimeMetrics(metrics: RuntimeMetrics): Promise<void> {
    try {
      await supabase
        .from('runtime_metrics')
        .insert({
          organization_id: metrics.organizationId,
          runtime_id: metrics.runtimeId,
          metrics_data: {
            currentExecutions: metrics.currentExecutions,
            queueLength: metrics.queueLength,
            executionsPerMinute: metrics.executionsPerMinute,
            avgExecutionTime: metrics.avgExecutionTime,
            errorRate: metrics.errorRate,
            memoryUtilization: metrics.memoryUtilization,
            cpuUtilization: metrics.cpuUtilization,
            successRate: metrics.successRate
          },
          collected_at: metrics.lastUpdated.toISOString()
        });

    } catch (error) {
      console.error('Failed to persist runtime metrics:', error);
    }
  }

  /**
   * Get dashboard metrics for admin interface
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      const oneDayAgo = new Date(now.getTime() - 86400000);

      // Get real-time metrics
      const { data: realtimeData } = await supabase
        .rpc('get_realtime_dashboard_metrics');

      // Get execution trends (last 24 hours)
      const { data: trendData } = await supabase
        .rpc('get_execution_trends', { 
          p_since: oneDayAgo.toISOString() 
        });

      // Get organization metrics
      const { data: orgMetrics } = await supabase
        .rpc('get_organization_metrics', { 
          p_since: oneHourAgo.toISOString() 
        });

      // Get agent performance data
      const { data: agentPerformance } = await supabase
        .rpc('get_agent_performance_metrics', { 
          p_since: oneDayAgo.toISOString() 
        });

      // Get problematic agents
      const { data: problematicAgents } = await supabase
        .rpc('get_problematic_agents', { 
          p_since: oneHourAgo.toISOString() 
        });

      const dashboardMetrics: DashboardMetrics = {
        // Real-time metrics
        totalExecutions: realtimeData?.[0]?.total_executions || 0,
        activeRuntimes: realtimeData?.[0]?.active_runtimes || 0,
        currentQueueDepth: realtimeData?.[0]?.queue_depth || 0,
        overallErrorRate: realtimeData?.[0]?.error_rate || 0,
        avgExecutionTime: realtimeData?.[0]?.avg_execution_time || 0,

        // Resource utilization
        totalMemoryUsage: realtimeData?.[0]?.memory_usage || 0,
        avgCpuUsage: realtimeData?.[0]?.cpu_usage || 0,
        containerUtilization: realtimeData?.[0]?.container_utilization || 0,

        // Trends
        executionTrends: (trendData || []).map((t: any) => ({
          timestamp: new Date(t.timestamp),
          value: t.execution_count,
          label: 'Executions'
        })),
        
        errorTrends: (trendData || []).map((t: any) => ({
          timestamp: new Date(t.timestamp),
          value: t.error_count,
          label: 'Errors'
        })),

        performanceTrends: (trendData || []).map((t: any) => ({
          timestamp: new Date(t.timestamp),
          value: t.avg_response_time,
          label: 'Response Time (ms)'
        })),

        // Organization breakdown
        organizationMetrics: (orgMetrics || []).map((org: any) => ({
          organizationId: org.organization_id,
          organizationName: org.organization_name || 'Unknown',
          activeAgents: org.active_agents || 0,
          totalExecutions: org.total_executions || 0,
          errorRate: org.error_rate || 0,
          avgExecutionTime: org.avg_execution_time || 0,
          memoryUsage: org.memory_usage || 0,
          subscriptionTier: org.subscription_tier || 'free'
        })),

        // Performance insights
        topPerformingAgents: (agentPerformance || [])
          .filter((a: any) => a.success_rate >= 90)
          .map((agent: any) => ({
            agentId: agent.agent_id,
            agentName: agent.agent_name || 'Unknown',
            executionCount: agent.execution_count || 0,
            successRate: agent.success_rate || 0,
            avgExecutionTime: agent.avg_execution_time || 0,
            healthScore: agent.health_score || 0
          })),

        problematicAgents: (problematicAgents || []).map((agent: any) => ({
          agentId: agent.agent_id,
          agentName: agent.agent_name || 'Unknown',
          issueType: agent.issue_type || 'unknown',
          severity: agent.severity || 'medium',
          description: agent.description || 'No description',
          affectedExecutions: agent.affected_executions || 0,
          lastOccurrence: new Date(agent.last_occurrence || now)
        }))
      };

      return dashboardMetrics;

    } catch (error) {
      console.error('Failed to get dashboard metrics:', error);
      
      // Return empty metrics on error
      return {
        totalExecutions: 0,
        activeRuntimes: 0,
        currentQueueDepth: 0,
        overallErrorRate: 0,
        avgExecutionTime: 0,
        totalMemoryUsage: 0,
        avgCpuUsage: 0,
        containerUtilization: 0,
        executionTrends: [],
        errorTrends: [],
        performanceTrends: [],
        organizationMetrics: [],
        topPerformingAgents: [],
        problematicAgents: []
      };
    }
  }

  /**
   * Get runtime metrics history
   */
  async getRuntimeMetricsHistory(
    runtimeId: string, 
    startTime: Date, 
    endTime: Date
  ): Promise<MetricsSnapshot[]> {
    try {
      const { data: metricsHistory } = await supabase
        .from('runtime_metrics')
        .select('*')
        .eq('runtime_id', runtimeId)
        .gte('collected_at', startTime.toISOString())
        .lte('collected_at', endTime.toISOString())
        .order('collected_at', { ascending: true });

      return (metricsHistory || []).map(m => ({
        timestamp: new Date(m.collected_at),
        executionCount: m.metrics_data.currentExecutions || 0,
        errorCount: Math.round((m.metrics_data.errorRate || 0) / 100 * (m.metrics_data.executionsPerMinute || 0)),
        avgResponseTime: m.metrics_data.avgExecutionTime || 0,
        memoryUsageMB: m.metrics_data.memoryUtilization || 0,
        cpuUsagePercent: m.metrics_data.cpuUtilization || 0,
        activeContainers: m.metrics_data.currentExecutions || 0
      }));

    } catch (error) {
      console.error(`Failed to get metrics history for runtime ${runtimeId}:`, error);
      return [];
    }
  }

  /**
   * Start automatic metrics persistence
   */
  private startMetricsPersistence(): void {
    this.persistInterval = setInterval(async () => {
      try {
        // Persist all buffered metrics
        const persistPromises = Array.from(this.metricsBuffer.values())
          .map(metrics => this.persistRuntimeMetrics(metrics));
        
        await Promise.all(persistPromises);
        
      } catch (error) {
        console.error('Metrics persistence error:', error);
      }
    }, 60000); // Persist every minute
  }

  /**
   * Stop metrics collection and persistence
   */
  async shutdown(): Promise<void> {
    if (this.persistInterval) {
      clearInterval(this.persistInterval);
      this.persistInterval = null;
    }

    // Final persist of all buffered metrics
    try {
      const persistPromises = Array.from(this.metricsBuffer.values())
        .map(metrics => this.persistRuntimeMetrics(metrics));
      
      await Promise.all(persistPromises);
      console.log('MetricsCollector shutdown complete');
      
    } catch (error) {
      console.error('Error during metrics collector shutdown:', error);
    }
  }
}
