import React, { useState, useEffect } from 'react';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded shadow border ${className}`}>{children}</div>;
}

function Button({ children, size = 'md', variant = 'primary', disabled = false, ...props }: any) {
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-4 py-2';
  const variantClass = variant === 'destructive' ? 'bg-red-600 text-white' : variant === 'outline' ? 'bg-white border text-gray-700' : 'bg-blue-600 text-white';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
  return <button className={`rounded ${sizeClass} ${variantClass} ${disabledClass}`} disabled={disabled} {...props}>{children}</button>;
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) {
  const variantClass = variant === 'destructive' ? 'bg-red-100 text-red-800' : variant === 'success' ? 'bg-green-100 text-green-800' : variant === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800';
  return <span className={`inline-block px-2 py-1 text-xs rounded mr-1 ${variantClass}`}>{children}</span>;
}

function Tabs({ children, value, onValueChange }: any) {
  return <div>{children}</div>;
}

function TabsList({ children }: any) {
  return <div className="flex space-x-1 bg-gray-100 p-1 rounded mb-4">{children}</div>;
}

function TabsTrigger({ children, value, isActive, onClick }: any) {
  return (
    <button 
      className={`flex-1 px-3 py-2 rounded text-sm font-medium ${isActive ? 'bg-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TabsContent({ children, value, activeValue }: any) {
  return value === activeValue ? <div>{children}</div> : null;
}

interface SystemHealth {
  service: string;
  status: 'healthy' | 'warning' | 'critical' | 'down';
  uptime: number;
  response_time: number;
  last_check: string;
  error_rate: number;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface SystemAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  service: string;
  message: string;
  created_at: string;
  resolved: boolean;
}

export default function SystemMonitoringDashboard() {
  const [healthData, setHealthData] = useState<SystemHealth[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchSystemData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSystemData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchSystemData = async () => {
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch system health
      const healthResponse = await fetch('/api/admin?type=system_health', { headers });
      if (healthResponse.ok) {
        const healthDataResponse = await healthResponse.json();
        setHealthData(healthDataResponse.health || []);
      }

      // Fetch performance metrics
      const performanceResponse = await fetch('/api/admin?type=performance_metrics', { headers });
      if (performanceResponse.ok) {
        const performanceDataResponse = await performanceResponse.json();
        setPerformanceData(performanceDataResponse.metrics || []);
      }

      // Fetch system alerts
      const alertsResponse = await fetch('/api/admin?type=system_alerts', { headers });
      if (alertsResponse.ok) {
        const alertsDataResponse = await alertsResponse.json();
        setAlerts(alertsDataResponse.alerts || []);
      }

    } catch (error) {
      console.error('Failed to fetch system data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem('supabase.auth.token');
      await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'resolve_alert',
          alertId
        })
      });
      
      await fetchSystemData(); // Refresh data
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': case 'good': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': case 'good': return '✅';
      case 'warning': return '⚠️';
      case 'critical': case 'down': return '🔴';
      default: return '⚪';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical' && !alert.resolved);
  const systemStatus = healthData.every(service => service.status === 'healthy') ? 'healthy' : 
                     healthData.some(service => service.status === 'critical' || service.status === 'down') ? 'critical' : 'warning';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Monitoring</h2>
          <p className="text-gray-600 mt-1">Real-time system health and performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => setAutoRefresh(!autoRefresh)} 
            variant={autoRefresh ? 'primary' : 'outline'}
            size="sm"
          >
            {autoRefresh ? '⏸️' : '▶️'} Auto Refresh
          </Button>
          <Button onClick={fetchSystemData} variant="outline">
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">System Status</h3>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemStatus)}`}>
              {getStatusIcon(systemStatus)} {systemStatus.toUpperCase()}
            </span>
            <span className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>

        {criticalAlerts.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <div className="flex items-center">
              <span className="text-red-600 mr-2">🚨</span>
              <span className="font-medium text-red-800">
                {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {healthData.filter(s => s.status === 'healthy').length}
            </div>
            <div className="text-sm text-gray-600">Services Online</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {healthData.length > 0 ? (healthData.reduce((acc, s) => acc + s.uptime, 0) / healthData.length).toFixed(1) : '0'}%
            </div>
            <div className="text-sm text-gray-600">Average Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {healthData.length > 0 ? Math.round(healthData.reduce((acc, s) => acc + s.response_time, 0) / healthData.length) : '0'}ms
            </div>
            <div className="text-sm text-gray-600">Avg Response Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {alerts.filter(a => !a.resolved).length}
            </div>
            <div className="text-sm text-gray-600">Active Alerts</div>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger 
            value="overview" 
            isActive={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="services" 
            isActive={activeTab === 'services'}
            onClick={() => setActiveTab('services')}
          >
            Services
          </TabsTrigger>
          <TabsTrigger 
            value="performance" 
            isActive={activeTab === 'performance'}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </TabsTrigger>
          <TabsTrigger 
            value="alerts" 
            isActive={activeTab === 'alerts'}
            onClick={() => setActiveTab('alerts')}
          >
            Alerts ({alerts.filter(a => !a.resolved).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" activeValue={activeTab}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Health Summary */}
            <Card>
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Service Health</h3>
              </div>
              <div className="p-4 space-y-3">
                {healthData.slice(0, 6).map((service) => (
                  <div key={service.service} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getStatusIcon(service.status)}</span>
                      <span className="font-medium">{service.service}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{service.uptime.toFixed(1)}%</span>
                      <Badge variant={service.status === 'healthy' ? 'success' : service.status === 'warning' ? 'warning' : 'destructive'}>
                        {service.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Alerts */}
            <Card>
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Recent Alerts</h3>
              </div>
              <div className="p-4 space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'warning' ? 'warning' : 'default'}>
                          {alert.severity}
                        </Badge>
                        <span className="text-sm font-medium">{alert.service}</span>
                      </div>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!alert.resolved && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No recent alerts</p>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" activeValue={activeTab}>
          <Card>
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Service Status</h3>
            </div>
            <div className="divide-y">
              {healthData.map((service) => (
                <div key={service.service} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{getStatusIcon(service.status)}</span>
                      <div>
                        <h4 className="font-semibold">{service.service}</h4>
                        <p className="text-sm text-gray-600">
                          Last check: {new Date(service.last_check).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={service.status === 'healthy' ? 'success' : service.status === 'warning' ? 'warning' : 'destructive'}>
                      {service.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Uptime:</span>
                      <span className="ml-2 font-medium">{service.uptime.toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Response Time:</span>
                      <span className="ml-2 font-medium">{service.response_time}ms</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Error Rate:</span>
                      <span className="ml-2 font-medium">{service.error_rate.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="performance" activeValue={activeTab}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {performanceData.map((metric) => (
              <Card key={metric.name}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{metric.name}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getTrendIcon(metric.trend)}</span>
                      <Badge variant={metric.status === 'good' ? 'success' : metric.status === 'warning' ? 'warning' : 'destructive'}>
                        {metric.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {metric.value} {metric.unit}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" activeValue={activeTab}>
          <Card>
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">System Alerts</h3>
            </div>
            <div className="divide-y">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'warning' ? 'warning' : 'default'}>
                          {alert.severity}
                        </Badge>
                        <span className="font-medium">{alert.service}</span>
                        {alert.resolved && (
                          <Badge variant="success">Resolved</Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-700 mb-2">{alert.message}</p>
                      
                      <p className="text-sm text-gray-500">
                        Created: {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    
                    {!alert.resolved && (
                      <Button 
                        size="sm"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {alerts.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <span className="text-4xl mb-4 block">✅</span>
                  <p>No system alerts</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
