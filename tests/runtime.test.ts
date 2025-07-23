/**
 * Runtime System Test Suite
 * Tests the core functionality of the Agent Runtime Management Layer
 */

import { AgentRuntimeManager } from '../lib/runtime/manager';
import { RuntimeContainer } from '../lib/runtime/container';
import { MetricsCollector } from '../lib/runtime/metrics';
import { RuntimeIntegratedExecutionEngine } from '../lib/runtime/integration';

describe('Agent Runtime Management System', () => {
  let runtimeManager: AgentRuntimeManager;
  let metricsCollector: MetricsCollector;
  
  beforeEach(() => {
    runtimeManager = new AgentRuntimeManager();
    metricsCollector = new MetricsCollector();
  });

  describe('AgentRuntimeManager', () => {
    test('should create organization runtime successfully', async () => {
      const orgId = 'test-org-123';
      const runtime = await runtimeManager.getOrganizationRuntime(orgId);
      
      expect(runtime).toBeDefined();
      expect(runtime.organizationId).toBe(orgId);
      expect(runtime.status).toBe('active');
    });

    test('should enforce memory limits', async () => {
      const orgId = 'test-org-memory';
      const runtime = await runtimeManager.getOrganizationRuntime(orgId);
      
      // Test memory allocation
      const memoryPool = runtime.memoryPools.get('default');
      expect(memoryPool).toBeDefined();
      expect(memoryPool!.maxMemoryMB).toBeGreaterThan(0);
      expect(memoryPool!.currentUsageMB).toBe(0);
    });

    test('should isolate organization data', async () => {
      const org1Runtime = await runtimeManager.getOrganizationRuntime('org-1');
      const org2Runtime = await runtimeManager.getOrganizationRuntime('org-2');
      
      expect(org1Runtime.organizationId).not.toBe(org2Runtime.organizationId);
      expect(org1Runtime.containers.size).toBe(0);
      expect(org2Runtime.containers.size).toBe(0);
    });
  });

  describe('RuntimeContainer', () => {
    test('should execute agent code in isolation', async () => {
      const container = new RuntimeContainer('test-container', 'test-org', metricsCollector);
      
      const mockAgent = {
        id: 'test-agent',
        name: 'Test Agent',
        code: 'return { result: "Hello World", timestamp: Date.now() };',
        timeout: 5000,
        memoryLimit: 128
      };
      
      const result = await container.execute(mockAgent, {});
      
      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('result');
      expect(result.result.result).toBe('Hello World');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    test('should handle timeout scenarios', async () => {
      const container = new RuntimeContainer('timeout-container', 'test-org', metricsCollector);
      
      const timeoutAgent = {
        id: 'timeout-agent',
        name: 'Timeout Agent',
        code: 'while(true) { /* infinite loop */ }',
        timeout: 100, // 100ms timeout
        memoryLimit: 128
      };
      
      const result = await container.execute(timeoutAgent, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('should track resource usage', async () => {
      const container = new RuntimeContainer('resource-container', 'test-org', metricsCollector);
      
      const agent = {
        id: 'resource-agent',
        name: 'Resource Agent',
        code: 'const data = new Array(1000).fill("test"); return { length: data.length };',
        timeout: 5000,
        memoryLimit: 256
      };
      
      const result = await container.execute(agent, {});
      
      expect(result.success).toBe(true);
      expect(container.getCurrentMemoryUsage()).toBeGreaterThan(0);
      expect(container.getHealthScore()).toBeGreaterThan(50);
    });
  });

  describe('RuntimeIntegratedExecutionEngine', () => {
    test('should choose appropriate isolation level', async () => {
      const engine = new RuntimeIntegratedExecutionEngine();
      
      // Basic execution (no isolation)
      const basicAgent = {
        id: 'basic-agent',
        organizationId: 'test-org',
        name: 'Basic Agent',
        type: 'simple' as const,
        code: 'return { message: "basic execution" };'
      };
      
      const basicResult = await engine.executeAgent(basicAgent, {});
      expect(basicResult.success).toBe(true);
      
      // Enhanced execution (monitoring)
      const enhancedAgent = {
        id: 'enhanced-agent',
        organizationId: 'test-org',
        name: 'Enhanced Agent',
        type: 'advanced' as const,
        code: 'return { message: "enhanced execution" };'
      };
      
      const enhancedResult = await engine.executeAgent(enhancedAgent, {});
      expect(enhancedResult.success).toBe(true);
      
      // Strict isolation
      const isolatedAgent = {
        id: 'isolated-agent',
        organizationId: 'test-org',
        name: 'Isolated Agent',
        type: 'enterprise' as const,
        code: 'return { message: "isolated execution" };'
      };
      
      const isolatedResult = await engine.executeAgent(isolatedAgent, {});
      expect(isolatedResult.success).toBe(true);
    });
  });

  describe('MetricsCollector', () => {
    test('should collect execution metrics', async () => {
      const metrics = new MetricsCollector();
      
      await metrics.recordExecution({
        runtimeId: 'test-runtime',
        agentId: 'test-agent',
        executionTime: 150,
        memoryUsage: 64,
        success: true,
        error: null,
        timestamp: new Date()
      });
      
      const dashboardMetrics = await metrics.getDashboardMetrics('test-org');
      
      expect(dashboardMetrics.totalExecutions).toBeGreaterThan(0);
      expect(dashboardMetrics.successRate).toBeGreaterThan(0);
    });

    test('should aggregate time-series data', async () => {
      const metrics = new MetricsCollector();
      
      // Record multiple executions
      for (let i = 0; i < 5; i++) {
        await metrics.recordExecution({
          runtimeId: 'test-runtime',
          agentId: `agent-${i}`,
          executionTime: 100 + i * 10,
          memoryUsage: 32 + i * 8,
          success: i < 4, // 4 success, 1 failure
          error: i === 4 ? 'Test error' : null,
          timestamp: new Date(Date.now() - i * 60000) // 1 minute intervals
        });
      }
      
      const timeSeriesData = await metrics.getTimeSeriesData('test-runtime', {
        startTime: new Date(Date.now() - 6 * 60000),
        endTime: new Date(),
        interval: '1m'
      });
      
      expect(timeSeriesData.length).toBeGreaterThan(0);
      expect(timeSeriesData[0]).toHaveProperty('timestamp');
      expect(timeSeriesData[0]).toHaveProperty('avgExecutionTime');
      expect(timeSeriesData[0]).toHaveProperty('executionCount');
    });
  });
});

// Integration Test Suite
describe('Runtime System Integration Tests', () => {
  test('should handle complete agent lifecycle', async () => {
    const runtimeManager = new AgentRuntimeManager();
    const orgId = 'integration-test-org';
    
    // 1. Get organization runtime
    const runtime = await runtimeManager.getOrganizationRuntime(orgId);
    expect(runtime).toBeDefined();
    
    // 2. Execute agent with monitoring
    const agent = {
      id: 'integration-agent',
      name: 'Integration Test Agent',
      code: `
        const startTime = Date.now();
        const data = { 
          message: "Integration test successful",
          timestamp: startTime,
          processInfo: typeof process !== 'undefined' ? {
            memory: process.memoryUsage?.(),
            uptime: process.uptime?.()
          } : null
        };
        return data;
      `,
      timeout: 10000,
      memoryLimit: 256
    };
    
    const result = await runtimeManager.executeAgent(orgId, agent, {});
    
    // 3. Verify execution results
    expect(result.success).toBe(true);
    expect(result.result).toHaveProperty('message');
    expect(result.result.message).toBe('Integration test successful');
    expect(result.executionTime).toBeGreaterThan(0);
    expect(result.memoryUsage).toBeGreaterThan(0);
    
    // 4. Check metrics were recorded
    const metrics = runtime.metricsCollector;
    const dashboardData = await metrics.getDashboardMetrics(orgId);
    
    expect(dashboardData.totalExecutions).toBeGreaterThan(0);
    expect(dashboardData.successRate).toBeGreaterThan(0);
    expect(dashboardData.avgExecutionTime).toBeGreaterThan(0);
  });

  test('should maintain performance under load', async () => {
    const runtimeManager = new AgentRuntimeManager();
    const orgId = 'load-test-org';
    
    const concurrentExecutions = 10;
    const promises = [];
    
    for (let i = 0; i < concurrentExecutions; i++) {
      const agent = {
        id: `load-agent-${i}`,
        name: `Load Test Agent ${i}`,
        code: `
          const iterations = 1000;
          let sum = 0;
          for (let j = 0; j < iterations; j++) {
            sum += Math.random();
          }
          return { 
            agentId: ${i}, 
            sum: sum,
            timestamp: Date.now()
          };
        `,
        timeout: 5000,
        memoryLimit: 128
      };
      
      promises.push(runtimeManager.executeAgent(orgId, agent, {}));
    }
    
    const results = await Promise.all(promises);
    
    // All executions should succeed
    results.forEach((result, index) => {
      expect(result.success).toBe(true);
      expect(result.result.agentId).toBe(index);
      expect(result.executionTime).toBeLessThan(5000);
    });
    
    // Check system health
    const runtime = await runtimeManager.getOrganizationRuntime(orgId);
    const healthScore = runtime.getHealthScore();
    expect(healthScore).toBeGreaterThan(70); // Should maintain good health
  });
});
