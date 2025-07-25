// Runtime Dashboard - Admin interface for monitoring agent runtime system
// Provides real-time metrics, container status, and performance insights

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Activity, Server, HardDrive, Cpu, Clock, Users, AlertCircle, PlayCircle, PauseCircle, StopCircle, RefreshCw } from 'lucide-react';

interface RuntimeStatus {
  organizationId: string;
  runtimeId: string;
  status: string;
  activeContainers: number;
  memoryUsage: number;
  memoryPercent: number;
  lastActivity: Date;
}

interface RuntimeMetrics {
  totalExecutions: number;
  activeRuntimes: number;
  memoryUtilization: number;
  errorRate: number;
  avgExecutionTime: number;
}

interface ContainerMetric {
  containerId: string;
  agentId: string;
  status: 'idle' | 'running' | 'error' | 'stopped';
  executionCount: number;
  memoryUsageMB: number;
  cpuUsagePercent: number;
  healthScore: number;
  lastExecution?: Date;
  errorCount: number;
}

interface OrganizationMetric {
  organizationId: string;
  organizationName: string;
  activeAgents: number;
  totalExecutions: number;
  errorRate: number;
  avgExecutionTime: number;
  memoryUsage: number;
  subscriptionTier: string;
}

export function RuntimeDashboard() {
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus[]>([]);
  const [metrics, setMetrics] = useState<RuntimeMetrics>({
    totalExecutions: 0,
    activeRuntimes: 0,
    memoryUtilization: 0,
    errorRate: 0,
    avgExecutionTime: 0
  });
  const [containers, setContainers] = useState<ContainerMetric[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const refreshInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchDashboardData();
    
    // Set up auto-refresh every 30 seconds
    refreshInterval.current = setInterval(fetchDashboardData, 30000);
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch runtime status
      const statusResponse = await fetch('/api/admin/runtime/status');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setRuntimeStatus(statusData.runtimes || []);
      }

      // Fetch runtime metrics
      const metricsResponse = await fetch('/api/admin/runtime/metrics');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData || {
          totalExecutions: 0,
          activeRuntimes: 0,
          memoryUtilization: 0,
          errorRate: 0,
          avgExecutionTime: 0
        });
      }

      // Simulate container data for now
      setContainers([
        {
          containerId: 'container_001',
          agentId: 'agent_123',
          status: 'running',
          executionCount: 45,
          memoryUsageMB: 128.5,
          cpuUsagePercent: 23.7,
          healthScore: 95,
          lastExecution: new Date(Date.now() - 120000),
          errorCount: 1
        },
        {
          containerId: 'container_002',
          agentId: 'agent_456',
          status: 'idle',
          executionCount: 23,
          memoryUsageMB: 64.2,
          cpuUsagePercent: 8.1,
          healthScore: 88,
          lastExecution: new Date(Date.now() - 300000),
          errorCount: 3
        },
        {
          containerId: 'container_003',
          agentId: 'agent_789',
          status: 'error',
          executionCount: 12,
          memoryUsageMB: 89.3,
          cpuUsagePercent: 15.4,
          healthScore: 45,
          lastExecution: new Date(Date.now() - 60000),
          errorCount: 8
        }
      ]);

      // Simulate organization data
      setOrganizations([
        {
          organizationId: 'org_001',
          organizationName: 'Acme Corp',
          activeAgents: 12,
          totalExecutions: 1234,
          errorRate: 2.5,
          avgExecutionTime: 1847,
          memoryUsage: 512.8,
          subscriptionTier: 'enterprise'
        },
        {
          organizationId: 'org_002',
          organizationName: 'StartupXYZ',
          activeAgents: 5,
          totalExecutions: 456,
          errorRate: 5.2,
          avgExecutionTime: 923,
          memoryUsage: 128.4,
          subscriptionTier: 'pro'
        }
      ]);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'running':
        return 'bg-green-500';
      case 'idle':
        return 'bg-blue-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'stopped':
      case 'shutdown':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 'bg-purple-100 text-purple-800';
      case 'pro':
        return 'bg-blue-100 text-blue-800';
      case 'free':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatMemory = (mb: number) => {
    if (mb < 1024) return `${mb.toFixed(1)}MB`;
    return `${(mb / 1024).toFixed(1)}GB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading runtime dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Runtime Dashboard</h1>
          <p className="text-gray-600">Monitor agent runtime performance and resource utilization</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Server className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Runtimes</p>
                <p className="text-2xl font-bold text-gray-900">{runtimeStatus.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Executions</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalExecutions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <HardDrive className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                <p className="text-2xl font-bold text-gray-900">{formatMemory(metrics.memoryUtilization)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.errorRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Exec Time</p>
                <p className="text-2xl font-bold text-gray-900">{formatTime(metrics.avgExecutionTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Runtime Overview</TabsTrigger>
          <TabsTrigger value="containers">Container Status</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
        </TabsList>

        {/* Runtime Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Runtime Status</CardTitle>
              <CardDescription>Current status of all organization runtimes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {runtimeStatus.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No active runtimes found
                  </div>
                ) : (
                  runtimeStatus.map((runtime) => (
                    <div key={runtime.runtimeId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(runtime.status)}`}></div>
                        <div>
                          <p className="font-medium text-gray-900">{runtime.runtimeId}</p>
                          <p className="text-sm text-gray-600">Org: {runtime.organizationId}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Containers</p>
                          <p className="text-lg font-semibold text-gray-900">{runtime.activeContainers}</p>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Memory</p>
                          <p className="text-lg font-semibold text-gray-900">{formatMemory(runtime.memoryUsage)}</p>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Usage</p>
                          <Progress value={runtime.memoryPercent} className="w-16" />
                        </div>
                        
                        <Badge variant={runtime.status === 'active' ? 'default' : 'secondary'}>
                          {runtime.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Container Status Tab */}
        <TabsContent value="containers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Container Status</CardTitle>
              <CardDescription>Detailed view of all agent containers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Container</th>
                      <th className="text-left p-2">Agent</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Executions</th>
                      <th className="text-left p-2">Memory</th>
                      <th className="text-left p-2">CPU</th>
                      <th className="text-left p-2">Health</th>
                      <th className="text-left p-2">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {containers.map((container) => (
                      <tr key={container.containerId} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-sm">{container.containerId}</td>
                        <td className="p-2">{container.agentId}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(container.status)}`}></div>
                            {container.status}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="text-center">
                            <div className="font-semibold">{container.executionCount}</div>
                            {container.errorCount > 0 && (
                              <div className="text-xs text-red-600">{container.errorCount} errors</div>
                            )}
                          </div>
                        </td>
                        <td className="p-2">{formatMemory(container.memoryUsageMB)}</td>
                        <td className="p-2">{container.cpuUsagePercent.toFixed(1)}%</td>
                        <td className="p-2">
                          <div className={`font-semibold ${getHealthScoreColor(container.healthScore)}`}>
                            {container.healthScore}/100
                          </div>
                        </td>
                        <td className="p-2 text-sm text-gray-600">
                          {container.lastExecution ? new Date(container.lastExecution).toLocaleTimeString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Metrics</CardTitle>
              <CardDescription>Performance breakdown by organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {organizations.map((org) => (
                  <div key={org.organizationId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{org.organizationName}</h3>
                        <p className="text-sm text-gray-600">{org.organizationId}</p>
                      </div>
                      <Badge className={getTierBadgeColor(org.subscriptionTier)}>
                        {org.subscriptionTier}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Active Agents</p>
                        <p className="text-xl font-semibold text-gray-900">{org.activeAgents}</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Executions</p>
                        <p className="text-xl font-semibold text-gray-900">{org.totalExecutions.toLocaleString()}</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Error Rate</p>
                        <p className={`text-xl font-semibold ${org.errorRate > 10 ? 'text-red-600' : org.errorRate > 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {org.errorRate.toFixed(1)}%
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Avg Time</p>
                        <p className="text-xl font-semibold text-gray-900">{formatTime(org.avgExecutionTime)}</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Memory</p>
                        <p className="text-xl font-semibold text-gray-900">{formatMemory(org.memoryUsage)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Overall system performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Memory Utilization</span>
                  <span className="text-sm text-gray-600">{formatMemory(metrics.memoryUtilization)}</span>
                </div>
                <Progress value={Math.min(100, (metrics.memoryUtilization / 1024) * 100)} />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Error Rate</span>
                  <span className="text-sm text-gray-600">{metrics.errorRate.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(100, metrics.errorRate)} className="[&>div]:bg-red-500" />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Response Time</span>
                  <span className="text-sm text-gray-600">{formatTime(metrics.avgExecutionTime)}</span>
                </div>
                <Progress value={Math.min(100, metrics.avgExecutionTime / 100)} className="[&>div]:bg-orange-500" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Allocation</CardTitle>
                <CardDescription>Runtime resource distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Organizations</span>
                    </div>
                    <span className="text-lg font-semibold">{organizations.length}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Active Runtimes</span>
                    </div>
                    <span className="text-lg font-semibold">{runtimeStatus.length}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Running Containers</span>
                    </div>
                    <span className="text-lg font-semibold">
                      {containers.filter(c => c.status === 'running').length}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">Error Containers</span>
                    </div>
                    <span className="text-lg font-semibold text-red-600">
                      {containers.filter(c => c.status === 'error').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
