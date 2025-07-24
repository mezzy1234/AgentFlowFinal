import React, { useState, useEffect } from 'react';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded shadow border ${className}`}>{children}</div>;
}

function Button({ children, size = 'md', variant = 'primary', ...props }: any) {
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-4 py-2';
  const variantClass = variant === 'destructive' ? 'bg-red-600 text-white' : variant === 'outline' ? 'bg-white border text-gray-700' : 'bg-blue-600 text-white';
  return <button className={`rounded ${sizeClass} ${variantClass}`} {...props}>{children}</button>;
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) {
  const variantClass = variant === 'destructive' ? 'bg-red-100 text-red-800' : variant === 'success' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  return <span className={`inline-block px-2 py-1 text-xs rounded mr-1 ${variantClass}`}>{children}</span>;
}

function Input({ ...props }: any) {
  return <input className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500" {...props} />;
}

function Select({ children, ...props }: any) {
  return <select className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500" {...props}>{children}</select>;
}

interface BillingTransaction {
  id: string;
  user_id: string;
  agent_id?: string;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'disputed';
  type: 'purchase' | 'subscription' | 'refund' | 'payout';
  payment_method: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  user_email?: string;
  agent_name?: string;
  developer_email?: string;
}

interface BillingStats {
  total_revenue: number;
  monthly_revenue: number;
  pending_payouts: number;
  failed_transactions: number;
  dispute_rate: number;
  refund_rate: number;
}

interface RefundRequest {
  id: string;
  transaction_id: string;
  user_id: string;
  amount_cents: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_email?: string;
  agent_name?: string;
}

export default function BillingManagementDashboard() {
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'refunds' | 'payouts'>('transactions');
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    dateRange: '30d'
  });

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch transactions
      const transactionsResponse = await fetch('/api/admin?type=billing_transactions', { headers });
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions || []);
      }

      // Fetch refund requests
      const refundsResponse = await fetch('/api/admin?type=refund_requests', { headers });
      if (refundsResponse.ok) {
        const refundsData = await refundsResponse.json();
        setRefundRequests(refundsData.refunds || []);
      }

      // Fetch billing stats
      const statsResponse = await fetch('/api/admin?type=billing_stats', { headers });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefundAction = async (refundId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'handle_refund',
          refundId,
          refundAction: action,
          reason
        })
      });

      if (response.ok) {
        await fetchBillingData(); // Refresh data
      }
    } catch (error) {
      console.error('Error handling refund:', error);
    }
  };

  const processRefund = async (transactionId: string, amount: number, reason: string) => {
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'process_refund',
          transactionId,
          amount,
          reason
        })
      });

      if (response.ok) {
        await fetchBillingData(); // Refresh data
      }
    } catch (error) {
      console.error('Error processing refund:', error);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': case 'disputed': return 'destructive';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filters.status !== 'all' && transaction.status !== filters.status) return false;
    if (filters.type !== 'all' && transaction.type !== filters.type) return false;
    return true;
  });

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
          <h2 className="text-2xl font-bold text-gray-900">Billing Management</h2>
          <p className="text-gray-600 mt-1">Manage transactions, refunds, and payouts</p>
        </div>
        <Button onClick={fetchBillingData} variant="outline">
          🔄 Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">💰</span>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-xl font-bold text-green-600">${(stats?.total_revenue || 0).toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📅</span>
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-xl font-bold text-blue-600">${(stats?.monthly_revenue || 0).toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⏳</span>
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Payouts</p>
              <p className="text-xl font-bold text-orange-600">${(stats?.pending_payouts || 0).toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">❌</span>
            <div>
              <p className="text-sm font-medium text-gray-600">Failed Txns</p>
              <p className="text-xl font-bold text-red-600">{stats?.failed_transactions || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚖️</span>
            <div>
              <p className="text-sm font-medium text-gray-600">Dispute Rate</p>
              <p className="text-xl font-bold text-red-600">{(stats?.dispute_rate || 0).toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">↩️</span>
            <div>
              <p className="text-sm font-medium text-gray-600">Refund Rate</p>
              <p className="text-xl font-bold text-yellow-600">{(stats?.refund_rate || 0).toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded">
        <Button 
          onClick={() => setActiveTab('transactions')} 
          variant={activeTab === 'transactions' ? 'primary' : 'outline'}
          className="flex-1"
        >
          Transactions
        </Button>
        <Button 
          onClick={() => setActiveTab('refunds')} 
          variant={activeTab === 'refunds' ? 'primary' : 'outline'}
          className="flex-1"
        >
          Refund Requests
        </Button>
        <Button 
          onClick={() => setActiveTab('payouts')} 
          variant={activeTab === 'payouts' ? 'primary' : 'outline'}
          className="flex-1"
        >
          Payouts
        </Button>
      </div>

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <Select 
                  value={filters.status} 
                  onChange={(e: any) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                  <option value="disputed">Disputed</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <Select 
                  value={filters.type} 
                  onChange={(e: any) => setFilters({...filters, type: e.target.value})}
                >
                  <option value="all">All Types</option>
                  <option value="purchase">Purchase</option>
                  <option value="subscription">Subscription</option>
                  <option value="refund">Refund</option>
                  <option value="payout">Payout</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <Select 
                  value={filters.dateRange} 
                  onChange={(e: any) => setFilters({...filters, dateRange: e.target.value})}
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="all">All time</option>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchBillingData} className="w-full">
                  Apply Filters
                </Button>
              </div>
            </div>
          </Card>

          {/* Transactions List */}
          <Card>
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Transactions ({filteredTransactions.length})</h3>
            </div>
            <div className="divide-y">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {transaction.id.substring(0, 8)}...
                        </span>
                        <Badge variant={getStatusBadgeVariant(transaction.status)}>
                          {transaction.status}
                        </Badge>
                        <Badge>{transaction.type}</Badge>
                        <span className="text-lg font-bold">
                          ${(transaction.amount_cents / 100).toFixed(2)} {transaction.currency}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>User: {transaction.user_email || 'Unknown'}</div>
                        {transaction.agent_name && <div>Agent: {transaction.agent_name}</div>}
                        {transaction.developer_email && <div>Developer: {transaction.developer_email}</div>}
                        <div>Payment: {transaction.payment_method}</div>
                        <div>Date: {new Date(transaction.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {transaction.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const reason = prompt('Refund reason:');
                            if (reason) {
                              processRefund(transaction.id, transaction.amount_cents, reason);
                            }
                          }}
                        >
                          ↩️ Refund
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        👁️ View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredTransactions.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <span className="text-4xl mb-4 block">💳</span>
                  <p>No transactions found</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Refunds Tab */}
      {activeTab === 'refunds' && (
        <Card>
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Refund Requests ({refundRequests.length})</h3>
          </div>
          <div className="divide-y">
            {refundRequests.map((refund) => (
              <div key={refund.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {refund.transaction_id.substring(0, 8)}...
                      </span>
                      <Badge variant={refund.status === 'pending' ? 'default' : refund.status === 'approved' ? 'success' : 'destructive'}>
                        {refund.status}
                      </Badge>
                      <span className="text-lg font-bold text-red-600">
                        -${(refund.amount_cents / 100).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>User: {refund.user_email || 'Unknown'}</div>
                      {refund.agent_name && <div>Agent: {refund.agent_name}</div>}
                      <div>Reason: {refund.reason}</div>
                      <div>Requested: {new Date(refund.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  
                  {refund.status === 'pending' && (
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleRefundAction(refund.id, 'approve')}
                      >
                        ✅ Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const reason = prompt('Rejection reason:');
                          if (reason) {
                            handleRefundAction(refund.id, 'reject', reason);
                          }
                        }}
                      >
                        ❌ Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {refundRequests.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <span className="text-4xl mb-4 block">↩️</span>
                <p>No refund requests found</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Payouts Tab */}
      {activeTab === 'payouts' && (
        <Card>
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Developer Payouts</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">${(stats?.pending_payouts || 0).toFixed(2)}</div>
                <div className="text-sm text-gray-600">Pending Payouts</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">23</div>
                <div className="text-sm text-gray-600">Developers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">$2,345</div>
                <div className="text-sm text-gray-600">Avg Payout</div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button>
                💸 Process All Payouts
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
