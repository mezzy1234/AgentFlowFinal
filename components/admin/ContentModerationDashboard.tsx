'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Flag, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  MessageSquare,
  Image,
  FileText,
  Clock,
  User,
  Shield,
  TrendingUp
} from 'lucide-react';

interface ContentReport {
  id: string;
  content_type: 'agent' | 'comment' | 'profile' | 'message';
  content_id: string;
  reporter_id: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  resolution?: string;
  content_preview?: string;
  reporter_email?: string;
}

interface ModerationStats {
  pending_reports: number;
  resolved_today: number;
  average_resolution_time: number;
  high_priority_reports: number;
  false_positive_rate: number;
}

export default function ContentModerationDashboard() {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewing' | 'resolved'>('pending');

  useEffect(() => {
    fetchModerationData();
  }, []);

  const fetchModerationData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch content reports
      const reportsResponse = await fetch('/api/admin?type=content_reports', {
        headers
      });
      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        setReports(reportsData.reports || []);
      }

      // Fetch moderation stats
      const statsResponse = await fetch('/api/admin?type=moderation_stats', {
        headers
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

    } catch (error) {
      console.error('Failed to fetch moderation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportAction = async (reportId: string, action: string, resolution?: string) => {
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'moderate_content',
          reportId,
          moderationAction: action,
          resolution
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Moderation action completed:', result);
        await fetchModerationData(); // Refresh data
        setSelectedReport(null);
      } else {
        console.error('Failed to execute moderation action');
      }
    } catch (error) {
      console.error('Error executing moderation action:', error);
    }
  };

  const filteredReports = reports.filter(report => 
    filter === 'all' || report.status === filter
  );

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'destructive';
      case 'reviewing': return 'default';
      case 'resolved': return 'default';
      case 'dismissed': return 'secondary';
      default: return 'secondary';
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'agent': return <FileText className="h-4 w-4" />;
      case 'comment': return <MessageSquare className="h-4 w-4" />;
      case 'profile': return <User className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="h-6 w-6 animate-spin mr-2" />
        <span>Loading moderation dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Moderation</h2>
          <p className="text-gray-600 mt-1">Review and moderate reported content</p>
        </div>
        <Button onClick={fetchModerationData} variant="outline">
          <Shield className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Flag className="h-6 w-6 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending Reports</p>
                <p className="text-xl font-bold text-gray-900">{stats?.pending_reports || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Resolved Today</p>
                <p className="text-xl font-bold text-gray-900">{stats?.resolved_today || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats?.average_resolution_time || 0}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-xl font-bold text-gray-900">{stats?.high_priority_reports || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Accuracy Rate</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats?.false_positive_rate ? (100 - stats.false_positive_rate).toFixed(1) : '0'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs defaultValue={filter} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Reports</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="reviewing">Reviewing</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Reports ({filteredReports.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {getContentTypeIcon(report.content_type)}
                          <span className="font-medium capitalize">{report.content_type} Report</span>
                          <Badge variant={getPriorityBadgeColor(report.priority)}>
                            {report.priority}
                          </Badge>
                          <Badge variant={getStatusBadgeColor(report.status)}>
                            {report.status}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Reason:</strong> {report.reason}
                        </p>
                        
                        {report.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Description:</strong> {report.description}
                          </p>
                        )}
                        
                        {report.content_preview && (
                          <div className="bg-gray-100 p-2 rounded text-sm mb-2">
                            <strong>Content Preview:</strong> {report.content_preview}
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Reported by: {report.reporter_email || 'Anonymous'}</span>
                          <span>•</span>
                          <span>{new Date(report.created_at).toLocaleString()}</span>
                          {report.assigned_to && (
                            <>
                              <span>•</span>
                              <span>Assigned to: {report.assigned_to}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Dialog>
                          <DialogTrigger>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedReport(report)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Content Report Details</DialogTitle>
                            </DialogHeader>
                            <ReportDetailsModal 
                              report={report} 
                              onAction={handleReportAction}
                            />
                          </DialogContent>
                        </Dialog>
                        
                        {report.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleReportAction(report.id, 'assign')}
                            >
                              Assign to Me
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReportAction(report.id, 'dismiss', 'No action needed')}
                            >
                              Dismiss
                            </Button>
                          </>
                        )}
                        
                        {report.status === 'reviewing' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleReportAction(report.id, 'resolve', 'Content moderated successfully')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReportAction(report.id, 'escalate')}
                            >
                              <Flag className="h-4 w-4 mr-1" />
                              Escalate
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredReports.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No content reports found for this filter</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Report Details Modal Component
function ReportDetailsModal({ 
  report, 
  onAction 
}: { 
  report: ContentReport; 
  onAction: (reportId: string, action: string, resolution?: string) => void;
}) {
  const [resolution, setResolution] = useState('');
  const [actionType, setActionType] = useState<string>('');

  const handleAction = () => {
    if (actionType) {
      onAction(report.id, actionType, resolution || undefined);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700">Content Type</p>
          <p className="text-sm text-gray-900 capitalize">{report.content_type}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Priority</p>
          <Badge variant={getPriorityBadgeColor(report.priority)}>
            {report.priority}
          </Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Status</p>
          <Badge variant={getStatusBadgeColor(report.status)}>
            {report.status}
          </Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Reported</p>
          <p className="text-sm text-gray-900">
            {new Date(report.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">Reason</p>
        <p className="text-sm text-gray-900">{report.reason}</p>
      </div>

      {report.description && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
          <p className="text-sm text-gray-900">{report.description}</p>
        </div>
      )}

      {report.content_preview && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Content Preview</p>
          <div className="bg-gray-100 p-3 rounded text-sm">
            {report.content_preview}
          </div>
        </div>
      )}

      {report.status === 'pending' || report.status === 'reviewing' ? (
        <div className="border-t pt-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Resolution Notes</label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                rows={3}
                placeholder="Enter resolution notes..."
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  setActionType('assign');
                  handleAction();
                }}
                variant="outline"
                size="sm"
              >
                Assign to Me
              </Button>
              <Button
                onClick={() => {
                  setActionType('resolve');
                  handleAction();
                }}
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Resolve
              </Button>
              <Button
                onClick={() => {
                  setActionType('escalate');
                  handleAction();
                }}
                variant="destructive"
                size="sm"
              >
                <Flag className="h-4 w-4 mr-1" />
                Escalate
              </Button>
              <Button
                onClick={() => {
                  setActionType('dismiss');
                  handleAction();
                }}
                variant="outline"
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t pt-4">
          {report.resolution && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Resolution</p>
              <p className="text-sm text-gray-900">{report.resolution}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getPriorityBadgeColor(priority: string) {
  switch (priority) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'secondary';
  }
}

function getStatusBadgeColor(status: string) {
  switch (status) {
    case 'pending': return 'destructive';
    case 'reviewing': return 'default';
    case 'resolved': return 'default';
    case 'dismissed': return 'secondary';
    default: return 'secondary';
  }
}
