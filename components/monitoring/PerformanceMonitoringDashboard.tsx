'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Activity, Cpu, HardDrive, Wifi, Database, 
  AlertTriangle, CheckCircle, XCircle, Clock,
  Users, Globe, Zap, TrendingUp, Server,
  RefreshCw, Settings, Download, Eye
} from 'lucide-react';

interface SystemMetric {
  id: string;
  metric_type: string;
  metric_name: string;
  value: number;
  unit: string;
  node_id?: string;
  recorded_at: string;
}

interface HealthCheck {
  id: string;
  service_name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time_ms: number;
  last_checked: string;
  consecutive_failures: number;
}

interface PerformanceAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  status: 'active' | 'resolved' | 'muted';
  triggered_at: string;
}

interface UserAnalytics {
  active_users: number;
  page_views: number;
  api_calls: number;
  avg_session_duration: number;
}

const PerformanceMonitoringDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics>({
    active_users: 0,
    page_views: 0,
    api_calls: 0,
    avg_session_duration: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    loadMonitoringData();
    const interval = setInterval(loadMonitoringData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadMonitoringData = async () => {
    setRefreshing(true);
    try {
      // Simulate API calls
      await Promise.all([
        loadSystemMetrics(),
        loadHealthChecks(),
        loadAlerts(),
        loadUserAnalytics()
      ]);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadSystemMetrics = async () => {
    // Simulate real-time metrics data
    const mockMetrics: SystemMetric[] = [
      { id: '1', metric_type: 'cpu', metric_name: 'usage_percent', value: 65.4, unit: '%', node_id: 'node-1', recorded_at: new Date().toISOString() },
      { id: '2', metric_type: 'memory', metric_name: 'usage_percent', value: 78.2, unit: '%', node_id: 'node-1', recorded_at: new Date().toISOString() },
      { id: '3', metric_type: 'disk', metric_name: 'usage_percent', value: 45.8, unit: '%', node_id: 'node-1', recorded_at: new Date().toISOString() },
      { id: '4', metric_type: 'network', metric_name: 'throughput_mbps', value: 156.7, unit: 'Mbps', node_id: 'node-1', recorded_at: new Date().toISOString() },
      { id: '5', metric_type: 'database', metric_name: 'connection_count', value: 47, unit: 'connections', recorded_at: new Date().toISOString() }
    ];
    setSystemMetrics(mockMetrics);
  };

  const loadHealthChecks = async () => {
    const mockHealthChecks: HealthCheck[] = [
      { id: '1', service_name: 'API Gateway', status: 'healthy', response_time_ms: 145, last_checked: new Date().toISOString(), consecutive_failures: 0 },
      { id: '2', service_name: 'Auth Service', status: 'healthy', response_time_ms: 89, last_checked: new Date().toISOString(), consecutive_failures: 0 },
      { id: '3', service_name: 'Database', status: 'healthy', response_time_ms: 12, last_checked: new Date().toISOString(), consecutive_failures: 0 },
      { id: '4', service_name: 'Redis Cache', status: 'degraded', response_time_ms: 234, last_checked: new Date().toISOString(), consecutive_failures: 2 },
      { id: '5', service_name: 'AI Service', status: 'healthy', response_time_ms: 567, last_checked: new Date().toISOString(), consecutive_failures: 0 }
    ];
    setHealthChecks(mockHealthChecks);
  };

  const loadAlerts = async () => {
    const mockAlerts: PerformanceAlert[] = [
      {
        id: '1',
        alert_type: 'threshold',
        severity: 'medium',
        title: 'High Memory Usage',
        description: 'Memory usage exceeded 75% on node-1',
        status: 'active',
        triggered_at: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: '2',
        alert_type: 'latency',
        severity: 'low',
        title: 'Increased Response Time',
        description: 'API response time increased to 567ms',
        status: 'resolved',
        triggered_at: new Date(Date.now() - 1800000).toISOString()
      }
    ];
    setAlerts(mockAlerts);
  };

  const loadUserAnalytics = async () => {
    setUserAnalytics({
      active_users: 1247,
      page_views: 8932,
      api_calls: 15678,
      avg_session_duration: 342
    });
  };

  const generateTimeSeriesData = (metric: string, hours: number = 24) => {
    const data = [];
    const now = new Date();
    for (let i = hours; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        time: time.toLocaleTimeString(),
        [metric]: Math.floor(Math.random() * 100) + 20 + Math.sin(i / 4) * 20
      });
    }
    return data;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const systemOverviewData = [
    { name: 'CPU', value: 65.4, color: '#3B82F6' },
    { name: 'Memory', value: 78.2, color: '#10B981' },
    { name: 'Disk', value: 45.8, color: '#F59E0B' },
    { name: 'Network', value: 82.3, color: '#EF4444' }
  ];

  const apiPerformanceData = generateTimeSeriesData('response_time', 24);
  const userActivityData = generateTimeSeriesData('active_users', 24);
  const errorRateData = generateTimeSeriesData('error_rate', 24);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Monitoring</h1>
          <p className="text-gray-600 mt-1">Real-time system health and performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button 
            onClick={loadMonitoringData} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.filter(alert => alert.status === 'active').length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <strong>{alerts.filter(alert => alert.status === 'active').length} active alerts</strong>
            {' - '}
            {alerts.filter(alert => alert.status === 'active')[0]?.title}
            <Button variant="link" className="h-auto p-0 ml-2 text-yellow-600">
              View All
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="application">Application</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="uptime">Uptime</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">98.7%</div>
                <p className="text-xs text-muted-foreground">+2.1% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userAnalytics.active_users.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+12.5% from yesterday</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Calls</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userAnalytics.api_calls.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+8.3% from yesterday</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">142ms</div>
                <p className="text-xs text-muted-foreground">-15ms from last hour</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
                <CardDescription>Current resource utilization across all nodes</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={systemOverviewData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {systemOverviewData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Usage']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
                <CardDescription>Response time trends over the last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={apiPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="response_time" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Service Health */}
          <Card>
            <CardHeader>
              <CardTitle>Service Health Status</CardTitle>
              <CardDescription>Real-time status of all critical services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {healthChecks.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(service.status)}
                      <div>
                        <div className="font-medium">{service.service_name}</div>
                        <div className="text-sm text-gray-500">{service.response_time_ms}ms</div>
                      </div>
                    </div>
                    <Badge variant={service.status === 'healthy' ? 'default' : 'destructive'}>
                      {service.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Infrastructure Tab */}
        <TabsContent value="infrastructure" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Cpu className="h-5 w-5 mr-2" />
                  CPU Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={generateTimeSeriesData('cpu', 24)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="cpu" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HardDrive className="h-5 w-5 mr-2" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={generateTimeSeriesData('memory', 24)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="memory" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wifi className="h-5 w-5 mr-2" />
                  Network Throughput
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={generateTimeSeriesData('network', 24)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="network" stroke="#F59E0B" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Database Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={generateTimeSeriesData('queries', 24)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="queries" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Application Tab */}
        <TabsContent value="application" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Error Rate</CardTitle>
                <CardDescription>Application error trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={errorRateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="error_rate" stroke="#EF4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request Volume</CardTitle>
                <CardDescription>API request volume over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={generateTimeSeriesData('requests', 24)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="requests" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Analytics Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Users</CardTitle>
                <CardDescription>User activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={userActivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="active_users" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Page Views</CardTitle>
                <CardDescription>Traffic patterns and engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={generateTimeSeriesData('page_views', 24)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="page_views" fill="#EC4899" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>Performance alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`} />
                      <div>
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-gray-500">{alert.description}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(alert.triggered_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={alert.status === 'active' ? 'destructive' : 'secondary'}>
                        {alert.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Uptime Tab */}
        <TabsContent value="uptime" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Uptime Monitoring</CardTitle>
              <CardDescription>Service availability and response times</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthChecks.map((service) => (
                  <div key={service.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(service.status)}
                        <span className="font-medium">{service.service_name}</span>
                      </div>
                      <Badge variant={service.status === 'healthy' ? 'default' : 'destructive'}>
                        {service.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Response Time:</span>
                        <div className="font-medium">{service.response_time_ms}ms</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Uptime:</span>
                        <div className="font-medium">99.9%</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Check:</span>
                        <div className="font-medium">
                          {new Date(service.last_checked).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceMonitoringDashboard;
