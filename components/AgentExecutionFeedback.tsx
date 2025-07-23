'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play,
  Square,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Activity,
  Zap,
  Settings,
  Eye,
  Copy,
  Download,
  Share2,
  MoreHorizontal,
  Timer,
  BarChart3,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';

// Types
export interface AgentExecution {
  id: string;
  agent_id: string;
  user_id: string;
  execution_id: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'timeout';
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  input_data: any;
  output_data?: any;
  error_message?: string;
  error_code?: string;
  user_feedback?: 'worked' | 'failed' | 'no_feedback';
  user_feedback_comment?: string;
  user_feedback_at?: string;
  retry_count: number;
  webhook_url?: string;
  webhook_response_code?: number;
  created_at: string;
}

export interface ExecutionSummary {
  total_executions: number;
  success_rate: number;
  average_duration: number;
  last_24h: number;
  total_feedback: number;
  positive_feedback_rate: number;
}

// Main Agent Execution Dashboard
export function AgentExecutionDashboard({ agentId }: { agentId: string }) {
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [summary, setSummary] = useState<ExecutionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recent' | 'analytics' | 'feedback'>('recent');
  const [runningAgent, setRunningAgent] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<AgentExecution | null>(null);

  useEffect(() => {
    fetchExecutions();
    fetchSummary();
  }, [agentId]);

  const fetchExecutions = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/executions`);
      if (!response.ok) throw new Error('Failed to fetch executions');
      
      const data = await response.json();
      setExecutions(data.executions || []);
    } catch (error) {
      console.error('Error fetching executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/executions/summary`);
      if (!response.ok) throw new Error('Failed to fetch summary');
      
      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleRunAgent = async () => {
    setRunningAgent(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) throw new Error('Failed to run agent');
      
      const data = await response.json();
      
      // Refresh executions list
      await fetchExecutions();
      await fetchSummary();
      
      // Show execution details
      setSelectedExecution(data.execution);
      
    } catch (error) {
      console.error('Error running agent:', error);
    } finally {
      setRunningAgent(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Run Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Agent Execution</h2>
        <button
          onClick={handleRunAgent}
          disabled={runningAgent}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {runningAgent ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>Run Agent</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title="Total Runs"
            value={summary.total_executions}
            subtitle="All time"
            icon={Activity}
            color="blue"
          />
          <SummaryCard
            title="Success Rate"
            value={`${summary.success_rate.toFixed(1)}%`}
            subtitle="Success rate"
            icon={CheckCircle}
            color="green"
          />
          <SummaryCard
            title="Avg Duration"
            value={`${(summary.average_duration / 1000).toFixed(1)}s`}
            subtitle="Response time"
            icon={Timer}
            color="purple"
          />
          <SummaryCard
            title="User Feedback"
            value={`${summary.positive_feedback_rate.toFixed(1)}%`}
            subtitle={`${summary.total_feedback} reviews`}
            icon={ThumbsUp}
            color="yellow"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {([
            { id: 'recent', label: 'Recent Executions', icon: Activity },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'feedback', label: 'User Feedback', icon: MessageSquare }
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'recent' && (
          <RecentExecutionsTab 
            executions={executions}
            loading={loading}
            onExecutionSelect={setSelectedExecution}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab agentId={agentId} />
        )}
        {activeTab === 'feedback' && (
          <FeedbackTab agentId={agentId} />
        )}
      </div>

      {/* Execution Details Modal */}
      {selectedExecution && (
        <ExecutionDetailsModal
          execution={selectedExecution}
          onClose={() => setSelectedExecution(null)}
          onFeedbackSubmit={fetchExecutions}
        />
      )}
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    red: 'text-red-600 bg-red-100'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

// Recent Executions Tab
function RecentExecutionsTab({
  executions,
  loading,
  onExecutionSelect
}: {
  executions: AgentExecution[];
  loading: boolean;
  onExecutionSelect: (execution: AgentExecution) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Loading executions...</span>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Executions Yet</h3>
        <p className="text-gray-600">Run your agent to see execution history here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {executions.map((execution) => (
        <ExecutionCard
          key={execution.id}
          execution={execution}
          onSelect={() => onExecutionSelect(execution)}
        />
      ))}
    </div>
  );
}

// Execution Card Component
function ExecutionCard({
  execution,
  onSelect
}: {
  execution: AgentExecution;
  onSelect: () => void;
}) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return CheckCircle;
      case 'failed': return XCircle;
      case 'running': return RefreshCw;
      case 'pending': return Clock;
      case 'timeout': return AlertCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'timeout': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const StatusIcon = getStatusIcon(execution.status);
  const statusColor = getStatusColor(execution.status);

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-center justify-between" onClick={onSelect}>
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${statusColor}`}>
            <StatusIcon className={`h-4 w-4 ${execution.status === 'running' ? 'animate-spin' : ''}`} />
          </div>
          
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900 capitalize">{execution.status}</span>
              {execution.retry_count > 0 && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                  Retry {execution.retry_count}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
              <span>{new Date(execution.start_time).toLocaleString()}</span>
              <span>Duration: {formatDuration(execution.duration_ms)}</span>
              {execution.webhook_response_code && (
                <span>HTTP {execution.webhook_response_code}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* User Feedback */}
          {execution.user_feedback === 'worked' && (
            <div className="flex items-center space-x-1 text-green-600">
              <ThumbsUp className="h-4 w-4" />
              <span className="text-sm">Worked</span>
            </div>
          )}
          {execution.user_feedback === 'failed' && (
            <div className="flex items-center space-x-1 text-red-600">
              <ThumbsDown className="h-4 w-4" />
              <span className="text-sm">Failed</span>
            </div>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Error Message Preview */}
      {execution.error_message && (
        <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
          {execution.error_message.substring(0, 100)}
          {execution.error_message.length > 100 && '...'}
        </div>
      )}
    </div>
  );
}

// Execution Details Modal
function ExecutionDetailsModal({
  execution,
  onClose,
  onFeedbackSubmit
}: {
  execution: AgentExecution;
  onClose: () => void;
  onFeedbackSubmit: () => void;
}) {
  const [feedback, setFeedback] = useState(execution.user_feedback || 'no_feedback');
  const [comment, setComment] = useState(execution.user_feedback_comment || '');
  const [submitting, setSubmitting] = useState(false);

  const handleFeedbackSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/executions/${execution.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback,
          comment: comment.trim() || undefined
        })
      });

      if (!response.ok) throw new Error('Failed to submit feedback');
      
      onFeedbackSubmit();
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Execution Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Timing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-sm font-medium capitalize ${
                  execution.status === 'success' ? 'bg-green-100 text-green-700' :
                  execution.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {execution.status}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Duration</label>
              <p className="mt-1 text-sm text-gray-900">
                {execution.duration_ms ? `${(execution.duration_ms / 1000).toFixed(2)}s` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Input/Output Data */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Input Data</label>
              <pre className="mt-1 p-3 bg-gray-50 rounded-lg text-sm overflow-x-auto">
                {JSON.stringify(execution.input_data, null, 2)}
              </pre>
            </div>

            {execution.output_data && (
              <div>
                <label className="text-sm font-medium text-gray-500">Output Data</label>
                <pre className="mt-1 p-3 bg-gray-50 rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify(execution.output_data, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Error Details */}
          {execution.error_message && (
            <div>
              <label className="text-sm font-medium text-gray-500">Error Message</label>
              <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{execution.error_message}</p>
                {execution.error_code && (
                  <p className="text-xs text-red-600 mt-1">Code: {execution.error_code}</p>
                )}
              </div>
            </div>
          )}

          {/* User Feedback Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Feedback</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  Did this execution work as expected?
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setFeedback('worked')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      feedback === 'worked'
                        ? 'bg-green-100 border-green-300 text-green-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span>Yes, it worked</span>
                  </button>
                  
                  <button
                    onClick={() => setFeedback('failed')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      feedback === 'failed'
                        ? 'bg-red-100 border-red-300 text-red-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    <span>No, it failed</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Additional Comments (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Describe what happened or what you expected..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          
          <button
            onClick={handleFeedbackSubmit}
            disabled={submitting || feedback === 'no_feedback'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Analytics Tab (placeholder)
function AnalyticsTab({ agentId }: { agentId: string }) {
  return (
    <div className="text-center py-12">
      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Coming Soon</h3>
      <p className="text-gray-600">Detailed execution analytics and trends will be available here.</p>
    </div>
  );
}

// Feedback Tab (placeholder)
function FeedbackTab({ agentId }: { agentId: string }) {
  return (
    <div className="text-center py-12">
      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">User Feedback</h3>
      <p className="text-gray-600">All user feedback and reviews will be displayed here.</p>
    </div>
  );
}
