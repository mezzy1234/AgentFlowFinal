import React, { useState, useEffect } from 'react';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded shadow border ${className}`}>{children}</div>;
}

function Button({ children, size = 'md', variant = 'primary', ...props }: any) {
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-4 py-2';
  const variantClass = variant === 'destructive' ? 'bg-red-600' : variant === 'outline' ? 'bg-white border text-gray-700' : 'bg-blue-600 text-white';
  return <button className={`rounded ${sizeClass} ${variantClass}`} {...props}>{children}</button>;
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) {
  const variantClass = variant === 'destructive' ? 'bg-red-100 text-red-800' : variant === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800';
  return <span className={`inline-block px-2 py-1 text-xs rounded mr-1 ${variantClass}`}>{children}</span>;
}

function Alert({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) {
  const variantClass = variant === 'destructive' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800';
  return <div className={`p-4 border rounded ${variantClass}`}>{children}</div>;
}

interface FraudAlert {
  id: string;
  type: 'payment' | 'account' | 'usage' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  user_id?: string;
  agent_id?: string;
  transaction_id?: string;
  confidence_score: number;
  status: 'pending' | 'investigating' | 'resolved' | 'false_positive';
  created_at: string;
  updated_at: string;
  metadata?: any;
  user_email?: string;
  agent_name?: string;
}

interface FraudStats {
  total_alerts: number;
  high_priority_alerts: number;
  resolved_today: number;
  false_positive_rate: number;
  blocked_transactions: number;
  prevented_loss: number;
}

export default function FraudDetectionDashboard() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'high_priority'>('pending');

  useEffect(() => {
    fetchFraudData();
  }, []);

  const fetchFraudData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch fraud alerts
      const alertsResponse = await fetch('/api/admin?type=fraud_alerts', { headers });
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.alerts || []);
      }

      // Fetch fraud stats
      const statsResponse = await fetch('/api/admin?type=fraud_stats', { headers });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

    } catch (error) {
      console.error('Failed to fetch fraud data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertAction = async (alertId: string, action: string, resolution?: string) => {
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'handle_fraud_alert',
          alertId,
          alertAction: action,
          resolution
        })
      });

      if (response.ok) {
        await fetchFraudData(); // Refresh data
      }
    } catch (error) {
      console.error('Error handling fraud alert:', error);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'pending') return alert.status === 'pending';
    if (filter === 'high_priority') return alert.severity === 'high' || alert.severity === 'critical';
    return true;
  });

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment': return '💳';
      case 'account': return '👤';
      case 'usage': return '📊';
      case 'suspicious_activity': return '⚠️';
      default: return '🔍';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fraud Detection</h2>
          <p className="text-gray-600 mt-1">Monitor and investigate suspicious activities</p>
        </div>
        <Button onClick={fetchFraudData} variant="outline">
          🔄 Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🚨</span>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Alerts</p>
              <p className="text-xl font-bold text-gray-900">{stats?.total_alerts || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🔥</span>
            <div>
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-xl font-bold text-red-600">{stats?.high_priority_alerts || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <div>
              <p className="text-sm font-medium text-gray-600">Resolved Today</p>
              <p className="text-xl font-bold text-green-600">{stats?.resolved_today || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🎯</span>
            <div>
              <p className="text-sm font-medium text-gray-600">Accuracy</p>
              <p className="text-xl font-bold text-blue-600">
                {stats?.false_positive_rate ? (100 - stats.false_positive_rate).toFixed(1) : '0'}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🛡️</span>
            <div>
              <p className="text-sm font-medium text-gray-600">Blocked Txns</p>
              <p className="text-xl font-bold text-orange-600">{stats?.blocked_transactions || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">💰</span>
            <div>
              <p className="text-sm font-medium text-gray-600">Loss Prevented</p>
              <p className="text-xl font-bold text-green-600">${stats?.prevented_loss?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex space-x-2">
        <Button 
          onClick={() => setFilter('all')} 
          variant={filter === 'all' ? 'primary' : 'outline'}
        >
          All Alerts
        </Button>
        <Button 
          onClick={() => setFilter('pending')} 
          variant={filter === 'pending' ? 'primary' : 'outline'}
        >
          Pending
        </Button>
        <Button 
          onClick={() => setFilter('high_priority')} 
          variant={filter === 'high_priority' ? 'primary' : 'outline'}
        >
          High Priority
        </Button>
      </div>

      {/* Alerts List */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Fraud Alerts ({filteredAlerts.length})</h3>
        </div>
        <div className="divide-y">
          {filteredAlerts.map((alert) => (
            <div key={alert.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-lg">{getTypeIcon(alert.type)}</span>
                    <span className="font-medium capitalize">{alert.type.replace('_', ' ')}</span>
                    <Badge variant={getSeverityBadgeVariant(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <Badge>{alert.status}</Badge>
                    <span className="text-sm text-gray-500">
                      Confidence: {(alert.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {alert.user_email && <span>User: {alert.user_email}</span>}
                    {alert.agent_name && <span>Agent: {alert.agent_name}</span>}
                    <span>Created: {new Date(alert.created_at).toLocaleString()}</span>
                  </div>
                  
                  {alert.metadata && (
                    <div className="mt-2 text-xs bg-gray-100 p-2 rounded">
                      <strong>Details:</strong> {JSON.stringify(alert.metadata, null, 2)}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {alert.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAlertAction(alert.id, 'investigate')}
                      >
                        🔍 Investigate
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAlertAction(alert.id, 'block_user')}
                      >
                        🚫 Block
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAlertAction(alert.id, 'mark_false_positive')}
                      >
                        ❌ False Positive
                      </Button>
                    </>
                  )}
                  
                  {alert.status === 'investigating' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAlertAction(alert.id, 'resolve', 'Investigation completed')}
                      >
                        ✅ Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAlertAction(alert.id, 'escalate')}
                      >
                        ⬆️ Escalate
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {filteredAlerts.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <span className="text-4xl mb-4 block">🛡️</span>
              <p>No fraud alerts found for this filter</p>
            </div>
          )}
        </div>
      </Card>

      {/* Recent Patterns */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Fraud Patterns & Insights</h3>
        </div>
        <div className="p-4 space-y-4">
          <Alert>
            <div className="flex items-center">
              <span className="mr-2">📈</span>
              <div>
                <strong>Trend Alert:</strong> 15% increase in payment fraud attempts over the last 7 days.
                <p className="text-sm mt-1">Recommendation: Review payment verification rules.</p>
              </div>
            </div>
          </Alert>
          
          <Alert variant="destructive">
            <div className="flex items-center">
              <span className="mr-2">🎯</span>
              <div>
                <strong>Pattern Detected:</strong> Multiple accounts created from same IP range in short timeframe.
                <p className="text-sm mt-1">5 accounts flagged for investigation.</p>
              </div>
            </div>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">$12,450</div>
              <div className="text-sm text-gray-600">Suspicious transactions blocked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">98.2%</div>
              <div className="text-sm text-gray-600">Detection accuracy rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">2.3min</div>
              <div className="text-sm text-gray-600">Average response time</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
