'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Shield, Lock, AlertTriangle, CheckCircle, XCircle,
  Eye, FileText, Users, Database, Key, Clock,
  Download, Settings, RefreshCw, Flag, Search,
  UserCheck, Globe, Activity, Zap, TrendingUp
} from 'lucide-react';

interface SecurityEvent {
  id: string;
  event_type: string;
  event_category: string;
  user_id?: string;
  action: string;
  outcome: 'success' | 'failure' | 'blocked';
  risk_score: number;
  flagged_by_system: boolean;
  created_at: string;
  ip_address?: string;
  details: any;
}

interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  description: string;
  compliance_score: number;
  last_assessment: string;
  next_assessment: string;
  status: 'compliant' | 'non_compliant' | 'partial';
}

interface SecurityIncident {
  id: string;
  incident_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved';
  title: string;
  description: string;
  detected_at: string;
  assigned_to?: string;
}

interface ThreatIntelligence {
  id: string;
  threat_type: string;
  indicator: string;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
  source: string;
  first_seen: string;
  last_seen: string;
}

const SecurityComplianceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [complianceFrameworks, setComplianceFrameworks] = useState<ComplianceFramework[]>([]);
  const [securityIncidents, setSecurityIncidents] = useState<SecurityIncident[]>([]);
  const [threatIntel, setThreatIntel] = useState<ThreatIntelligence[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadSecurityData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadSecurityEvents(),
        loadComplianceFrameworks(),
        loadSecurityIncidents(),
        loadThreatIntelligence()
      ]);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadSecurityEvents = async () => {
    // Simulate security events data
    const mockEvents: SecurityEvent[] = [
      {
        id: '1',
        event_type: 'login',
        event_category: 'authentication',
        user_id: 'user-123',
        action: 'login_attempt',
        outcome: 'failure',
        risk_score: 45,
        flagged_by_system: true,
        created_at: new Date(Date.now() - 300000).toISOString(),
        ip_address: '192.168.1.100',
        details: { reason: 'invalid_password', attempts: 3 }
      },
      {
        id: '2',
        event_type: 'data_access',
        event_category: 'data_access',
        user_id: 'user-456',
        action: 'export',
        outcome: 'success',
        risk_score: 25,
        flagged_by_system: false,
        created_at: new Date(Date.now() - 600000).toISOString(),
        details: { data_type: 'user_profiles', count: 150 }
      }
    ];
    setSecurityEvents(mockEvents);
  };

  const loadComplianceFrameworks = async () => {
    const mockFrameworks: ComplianceFramework[] = [
      {
        id: '1',
        name: 'GDPR',
        version: '2018',
        description: 'General Data Protection Regulation',
        compliance_score: 92,
        last_assessment: '2024-01-15',
        next_assessment: '2024-07-15',
        status: 'compliant'
      },
      {
        id: '2',
        name: 'SOC 2',
        version: 'Type II',
        description: 'Service Organization Control 2',
        compliance_score: 88,
        last_assessment: '2024-02-01',
        next_assessment: '2024-08-01',
        status: 'compliant'
      },
      {
        id: '3',
        name: 'HIPAA',
        version: '2013',
        description: 'Health Insurance Portability and Accountability Act',
        compliance_score: 75,
        last_assessment: '2024-01-10',
        next_assessment: '2024-07-10',
        status: 'partial'
      }
    ];
    setComplianceFrameworks(mockFrameworks);
  };

  const loadSecurityIncidents = async () => {
    const mockIncidents: SecurityIncident[] = [
      {
        id: '1',
        incident_type: 'suspicious_activity',
        severity: 'medium',
        status: 'investigating',
        title: 'Multiple Failed Login Attempts',
        description: 'User account showing repeated failed login attempts from different IPs',
        detected_at: new Date(Date.now() - 1800000).toISOString(),
        assigned_to: 'security-team'
      },
      {
        id: '2',
        incident_type: 'data_access',
        severity: 'low',
        status: 'resolved',
        title: 'Unusual Data Export Pattern',
        description: 'User exported large amount of data outside normal business hours',
        detected_at: new Date(Date.now() - 86400000).toISOString(),
        assigned_to: 'security-team'
      }
    ];
    setSecurityIncidents(mockIncidents);
  };

  const loadThreatIntelligence = async () => {
    const mockThreatIntel: ThreatIntelligence[] = [
      {
        id: '1',
        threat_type: 'ip_reputation',
        indicator: '192.168.1.100',
        threat_level: 'high',
        confidence_score: 85,
        source: 'commercial',
        first_seen: new Date(Date.now() - 604800000).toISOString(),
        last_seen: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '2',
        threat_type: 'domain_reputation',
        indicator: 'malicious-site.com',
        threat_level: 'critical',
        confidence_score: 95,
        source: 'government',
        first_seen: new Date(Date.now() - 2592000000).toISOString(),
        last_seen: new Date(Date.now() - 172800000).toISOString()
      }
    ];
    setThreatIntel(mockThreatIntel);
  };

  const generateSecurityTrends = () => {
    const data = [];
    for (let i = 23; i >= 0; i--) {
      const time = new Date(Date.now() - i * 60 * 60 * 1000);
      data.push({
        time: time.getHours() + ':00',
        security_events: Math.floor(Math.random() * 50) + 10,
        failed_logins: Math.floor(Math.random() * 20) + 2,
        blocked_requests: Math.floor(Math.random() * 15) + 1
      });
    }
    return data;
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-orange-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
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

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600';
      case 'partial': return 'text-yellow-600';
      case 'non_compliant': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const securityTrendData = generateSecurityTrends();
  const complianceData = complianceFrameworks.map(f => ({
    name: f.name,
    score: f.compliance_score,
    color: f.status === 'compliant' ? '#10B981' : f.status === 'partial' ? '#F59E0B' : '#EF4444'
  }));

  const riskDistribution = [
    { name: 'Low Risk', value: 65, color: '#10B981' },
    { name: 'Medium Risk', value: 25, color: '#F59E0B' },
    { name: 'High Risk', value: 8, color: '#F97316' },
    { name: 'Critical Risk', value: 2, color: '#EF4444' }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security & Compliance</h1>
          <p className="text-gray-600 mt-1">Monitor security events, incidents, and compliance status</p>
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
            onClick={loadSecurityData} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {securityIncidents.filter(incident => incident.severity === 'critical' && incident.status !== 'resolved').length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <strong>Critical Security Alert:</strong> 
            {securityIncidents.filter(incident => incident.severity === 'critical' && incident.status !== 'resolved')[0]?.title}
            <Button variant="link" className="h-auto p-0 ml-2 text-red-600">
              Investigate Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="threats">Threat Intel</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Security Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Score</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">92/100</div>
                <p className="text-xs text-muted-foreground">+3 points from last week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {securityIncidents.filter(i => i.status !== 'resolved').length}
                </div>
                <p className="text-xs text-muted-foreground">2 resolved in last 24h</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {securityEvents.filter(e => e.event_type === 'login' && e.outcome === 'failure').length}
                </div>
                <p className="text-xs text-muted-foreground">-15% from yesterday</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Status</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">85%</div>
                <p className="text-xs text-muted-foreground">3 frameworks compliant</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Events Trend</CardTitle>
                <CardDescription>Security events over the last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={securityTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="security_events" stroke="#3B82F6" strokeWidth={2} />
                    <Line type="monotone" dataKey="failed_logins" stroke="#EF4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="blocked_requests" stroke="#F59E0B" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>Distribution of security events by risk level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Events']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Overview</CardTitle>
                <CardDescription>Current compliance status across frameworks</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={complianceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Compliance Score']} />
                    <Bar dataKey="score" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent High-Risk Events</CardTitle>
                <CardDescription>Security events flagged for review</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {securityEvents.filter(e => e.flagged_by_system).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getRiskColor(event.risk_score)}`} />
                        <div>
                          <div className="font-medium">{event.event_type}</div>
                          <div className="text-sm text-gray-500">Risk: {event.risk_score}/100</div>
                        </div>
                      </div>
                      <Badge variant={event.outcome === 'failure' ? 'destructive' : 'secondary'}>
                        {event.outcome}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Events Tab */}
        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Event Log</CardTitle>
              <CardDescription>Real-time security events and audit trail</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getRiskColor(event.risk_score)}`} />
                      <div>
                        <div className="font-medium">{event.event_type} - {event.action}</div>
                        <div className="text-sm text-gray-500">
                          {event.event_category} | Risk Score: {event.risk_score}/100
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(event.created_at).toLocaleString()}
                          {event.ip_address && ` | IP: ${event.ip_address}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={event.outcome === 'failure' ? 'destructive' : 'secondary'}>
                        {event.outcome}
                      </Badge>
                      {event.flagged_by_system && (
                        <Flag className="h-4 w-4 text-red-500" />
                      )}
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

        {/* Security Incidents Tab */}
        <TabsContent value="incidents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Incidents</CardTitle>
              <CardDescription>Active security incidents and investigations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityIncidents.map((incident) => (
                  <div key={incident.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(incident.severity)}`} />
                        <span className="font-medium">{incident.title}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={incident.status === 'resolved' ? 'default' : 'destructive'}>
                          {incident.status}
                        </Badge>
                        <Badge variant="outline">
                          {incident.severity}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <div className="font-medium">{incident.incident_type}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Detected:</span>
                        <div className="font-medium">
                          {new Date(incident.detected_at).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Assigned:</span>
                        <div className="font-medium">{incident.assigned_to || 'Unassigned'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {complianceFrameworks.map((framework) => (
              <Card key={framework.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {framework.name}
                    <Badge className={getComplianceColor(framework.status)}>
                      {framework.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{framework.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Compliance Score</span>
                        <span>{framework.compliance_score}%</span>
                      </div>
                      <Progress value={framework.compliance_score} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Last Assessment:</span>
                        <div className="font-medium">{framework.last_assessment}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Next Assessment:</span>
                        <div className="font-medium">{framework.next_assessment}</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      View Assessment Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Threat Intelligence Tab */}
        <TabsContent value="threats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Threat Intelligence</CardTitle>
              <CardDescription>Known threats and indicators of compromise</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {threatIntel.map((threat) => (
                  <div key={threat.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(threat.threat_level)}`} />
                      <div>
                        <div className="font-medium">{threat.indicator}</div>
                        <div className="text-sm text-gray-500">
                          {threat.threat_type} | Confidence: {threat.confidence_score}%
                        </div>
                        <div className="text-xs text-gray-400">
                          Source: {threat.source} | Last seen: {new Date(threat.last_seen).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={threat.threat_level === 'critical' ? 'destructive' : 'secondary'}>
                        {threat.threat_level}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>Complete audit log of system activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">{event.action}</div>
                        <div className="text-sm text-gray-500">
                          {event.event_category} | User: {event.user_id || 'System'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(event.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant={event.outcome === 'success' ? 'default' : 'destructive'}>
                      {event.outcome}
                    </Badge>
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

export default SecurityComplianceDashboard;
