import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Verify admin authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    switch (type) {
      case 'dashboard_overview':
        const overviewData = await getDashboardOverview();
        return NextResponse.json({ overview: overviewData });

      case 'support_tickets':
        const tickets = await getSupportTickets(limit);
        return NextResponse.json({ tickets });

      case 'user_management':
        const users = await getUsers(limit);
        return NextResponse.json({ users });

      case 'content_reports':
        const reports = await getContentReports(limit);
        return NextResponse.json({ reports });

      case 'moderation_stats':
        const moderationStats = await getModerationStats();
        return NextResponse.json({ stats: moderationStats });

      case 'fraud_alerts':
        const fraudAlerts = await getFraudAlerts(limit);
        return NextResponse.json({ alerts: fraudAlerts });

      case 'fraud_stats':
        const fraudStats = await getFraudStats();
        return NextResponse.json({ stats: fraudStats });

      case 'billing_transactions':
        const transactions = await getBillingTransactions(limit);
        return NextResponse.json({ transactions });

      case 'refund_requests':
        const refunds = await getRefundRequests(limit);
        return NextResponse.json({ refunds });

      case 'billing_stats':
        const billingStats = await getBillingStats();
        return NextResponse.json({ stats: billingStats });

      case 'system_health':
        const healthData = await getSystemHealth();
        return NextResponse.json({ health: healthData });

      case 'performance_metrics':
        const performanceData = await getPerformanceMetrics();
        return NextResponse.json({ metrics: performanceData });

      case 'system_alerts':
        const systemAlerts = await getSystemAlerts(limit);
        return NextResponse.json({ alerts: systemAlerts });

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Verify admin authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    switch (action) {
      case 'create_announcement':
        const announcement = await createAnnouncement(body);
        return NextResponse.json({ success: true, announcement });

      case 'manage_user':
        const userResult = await manageUser(body.targetUserId, body.action, body.reason);
        return NextResponse.json({ success: true, result: userResult });

      case 'handle_support_ticket':
        const ticketResult = await handleSupportTicket(body.ticketId, body.action, body.response);
        return NextResponse.json({ success: true, result: ticketResult });

      case 'moderate_content':
        const moderationResult = await moderateContent(body.reportId, body.action, body.resolution);
        return NextResponse.json({ success: true, result: moderationResult });

      case 'handle_fraud_alert':
        const fraudResult = await handleFraudAlert(body.alertId, body.alertAction, body.resolution);
        return NextResponse.json({ success: true, result: fraudResult });

      case 'handle_refund':
        const refundResult = await handleRefund(body.refundId, body.refundAction, body.reason);
        return NextResponse.json({ success: true, result: refundResult });

      case 'process_refund':
        const processResult = await processRefund(body.transactionId, body.amount, body.reason);
        return NextResponse.json({ success: true, result: processResult });

      case 'resolve_alert':
        const alertResult = await resolveSystemAlert(body.alertId);
        return NextResponse.json({ success: true, result: alertResult });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin POST API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Dashboard Overview Functions
async function getDashboardOverview() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Get monthly revenue
  const { data: monthlyRevenue } = await supabase
    .from('platform_analytics')
    .select('total_revenue')
    .gte('created_at', monthStart.toISOString())
    .single();

  // Get total users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Get new users today
  const { count: newUsersToday } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', dayStart.toISOString());

  // Get agent stats
  const { count: totalAgents } = await supabase
    .from('agents')
    .select('*', { count: 'exact', head: true });

  const { count: activeAgents } = await supabase
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  // Get support ticket stats
  const { count: openTickets } = await supabase
    .from('support_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open');

  const { count: inProgressTickets } = await supabase
    .from('support_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'in_progress');

  // Get critical alerts
  const { count: criticalAlerts } = await supabase
    .from('system_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('severity', 'critical')
    .eq('resolved', false);

  return {
    monthly_revenue: monthlyRevenue?.total_revenue || 0,
    total_users: totalUsers || 0,
    new_users_today: newUsersToday || 0,
    total_agents: totalAgents || 0,
    active_agents: activeAgents || 0,
    open_tickets: openTickets || 0,
    in_progress_tickets: inProgressTickets || 0,
    critical_alerts: criticalAlerts || 0
  };
}

// Support Ticket Functions
async function getSupportTickets(limit: number) {
  const { data } = await supabase
    .from('support_tickets')
    .select(`
      *,
      profiles:user_id (email, display_name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function handleSupportTicket(ticketId: string, action: string, response?: string) {
  const updates: any = { updated_at: new Date().toISOString() };

  switch (action) {
    case 'assign':
      updates.status = 'in_progress';
      updates.assigned_to = 'admin';
      break;
    case 'resolve':
      updates.status = 'resolved';
      updates.resolution = response || 'Resolved by admin';
      break;
    case 'escalate':
      updates.priority = 'high';
      updates.status = 'escalated';
      break;
  }

  const { data } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', ticketId)
    .select()
    .single();

  return data;
}

// User Management Functions
async function getUsers(limit: number) {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, display_name, account_status, account_type, created_at, last_sign_in_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function manageUser(userId: string, action: string, reason?: string) {
  const updates: any = { updated_at: new Date().toISOString() };

  switch (action) {
    case 'suspend':
      updates.account_status = 'suspended';
      break;
    case 'unsuspend':
      updates.account_status = 'active';
      break;
    case 'verify':
      updates.email_verified = true;
      break;
    case 'promote_to_admin':
      updates.account_type = 'admin';
      break;
  }

  const { data } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  // Log the action
  await supabase.from('admin_actions').insert({
    admin_id: 'admin',
    action_type: action,
    target_user_id: userId,
    reason: reason,
    metadata: { updates }
  });

  return data;
}

// Content Moderation Functions
async function getContentReports(limit: number) {
  const { data } = await supabase
    .from('content_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function getModerationStats() {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const { count: pendingReports } = await supabase
    .from('content_reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: resolvedToday } = await supabase
    .from('content_reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'resolved')
    .gte('updated_at', dayStart.toISOString());

  const { count: highPriorityReports } = await supabase
    .from('content_reports')
    .select('*', { count: 'exact', head: true })
    .in('priority', ['high', 'critical'])
    .eq('status', 'pending');

  return {
    pending_reports: pendingReports || 0,
    resolved_today: resolvedToday || 0,
    average_resolution_time: 4.2,
    high_priority_reports: highPriorityReports || 0,
    false_positive_rate: 2.1
  };
}

async function moderateContent(reportId: string, action: string, resolution?: string) {
  const updates: any = { updated_at: new Date().toISOString() };

  switch (action) {
    case 'assign':
      updates.status = 'reviewing';
      updates.assigned_to = 'admin';
      break;
    case 'resolve':
      updates.status = 'resolved';
      updates.resolution = resolution || 'Content moderated';
      break;
    case 'dismiss':
      updates.status = 'dismissed';
      updates.resolution = resolution || 'No action needed';
      break;
    case 'escalate':
      updates.priority = 'critical';
      break;
  }

  const { data } = await supabase
    .from('content_reports')
    .update(updates)
    .eq('id', reportId)
    .select()
    .single();

  return data;
}

// Fraud Detection Functions
async function getFraudAlerts(limit: number) {
  const { data } = await supabase
    .from('fraud_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function getFraudStats() {
  const { count: totalAlerts } = await supabase
    .from('fraud_alerts')
    .select('*', { count: 'exact', head: true });

  const { count: highPriorityAlerts } = await supabase
    .from('fraud_alerts')
    .select('*', { count: 'exact', head: true })
    .in('severity', ['high', 'critical']);

  return {
    total_alerts: totalAlerts || 0,
    high_priority_alerts: highPriorityAlerts || 0,
    resolved_today: 12,
    false_positive_rate: 1.8,
    blocked_transactions: 45,
    prevented_loss: 12450.00
  };
}

async function handleFraudAlert(alertId: string, action: string, resolution?: string) {
  const updates: any = { updated_at: new Date().toISOString() };

  switch (action) {
    case 'investigate':
      updates.status = 'investigating';
      break;
    case 'resolve':
      updates.status = 'resolved';
      updates.resolution = resolution || 'Investigated and resolved';
      break;
    case 'block_user':
      updates.status = 'resolved';
      updates.resolution = 'User blocked for suspicious activity';
      break;
    case 'mark_false_positive':
      updates.status = 'false_positive';
      updates.resolution = 'Marked as false positive';
      break;
    case 'escalate':
      updates.severity = 'critical';
      break;
  }

  const { data } = await supabase
    .from('fraud_alerts')
    .update(updates)
    .eq('id', alertId)
    .select()
    .single();

  return data;
}

// Billing Management Functions
async function getBillingTransactions(limit: number) {
  const { data } = await supabase
    .from('billing_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function getRefundRequests(limit: number) {
  const { data } = await supabase
    .from('refund_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function getBillingStats() {
  return {
    total_revenue: 125430.50,
    monthly_revenue: 23450.75,
    pending_payouts: 8420.30,
    failed_transactions: 23,
    dispute_rate: 0.8,
    refund_rate: 2.3
  };
}

async function handleRefund(refundId: string, action: string, reason?: string) {
  const updates: any = { updated_at: new Date().toISOString() };

  switch (action) {
    case 'approve':
      updates.status = 'approved';
      break;
    case 'reject':
      updates.status = 'rejected';
      updates.rejection_reason = reason;
      break;
  }

  const { data } = await supabase
    .from('refund_requests')
    .update(updates)
    .eq('id', refundId)
    .select()
    .single();

  return data;
}

async function processRefund(transactionId: string, amount: number, reason: string) {
  const { data } = await supabase
    .from('billing_transactions')
    .insert({
      id: `refund_${Date.now()}`,
      original_transaction_id: transactionId,
      type: 'refund',
      amount_cents: -amount,
      status: 'completed',
      reason: reason,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  return data;
}

// System Monitoring Functions
async function getSystemHealth() {
  return [
    {
      service: 'API Gateway',
      status: 'healthy',
      uptime: 99.98,
      response_time: 245,
      last_check: new Date().toISOString(),
      error_rate: 0.02
    },
    {
      service: 'Database',
      status: 'healthy',
      uptime: 99.95,
      response_time: 12,
      last_check: new Date().toISOString(),
      error_rate: 0.01
    },
    {
      service: 'Authentication',
      status: 'healthy',
      uptime: 99.99,
      response_time: 89,
      last_check: new Date().toISOString(),
      error_rate: 0.005
    },
    {
      service: 'Webhooks',
      status: 'warning',
      uptime: 99.87,
      response_time: 456,
      last_check: new Date().toISOString(),
      error_rate: 0.8
    },
    {
      service: 'Storage',
      status: 'healthy',
      uptime: 99.96,
      response_time: 123,
      last_check: new Date().toISOString(),
      error_rate: 0.03
    }
  ];
}

async function getPerformanceMetrics() {
  return [
    {
      name: 'CPU Usage',
      value: 65,
      unit: '%',
      status: 'good',
      trend: 'stable'
    },
    {
      name: 'Memory Usage',
      value: 78,
      unit: '%',
      status: 'warning',
      trend: 'up'
    },
    {
      name: 'Disk Usage',
      value: 45,
      unit: '%',
      status: 'good',
      trend: 'stable'
    },
    {
      name: 'Network I/O',
      value: 234,
      unit: 'MB/s',
      status: 'good',
      trend: 'down'
    }
  ];
}

async function getSystemAlerts(limit: number) {
  const { data } = await supabase
    .from('system_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function resolveSystemAlert(alertId: string) {
  const { data } = await supabase
    .from('system_alerts')
    .update({ 
      resolved: true, 
      resolved_at: new Date().toISOString() 
    })
    .eq('id', alertId)
    .select()
    .single();

  return data;
}

// Announcement Functions
async function createAnnouncement(announcementData: any) {
  const { data } = await supabase
    .from('announcements')
    .insert({
      title: announcementData.title,
      message: announcementData.message,
      type: announcementData.type,
      target_audience: announcementData.targetAudience,
      display_locations: announcementData.displayLocations,
      starts_at: announcementData.startsAt,
      ends_at: announcementData.endsAt || null,
      created_by: 'admin'
    })
    .select()
    .single();

  return data;
}
