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
    const timeRange = searchParams.get('timeRange') || '24h';
    const limit = parseInt(searchParams.get('limit') || '100');

    switch (type) {
      case 'system_metrics':
        const metrics = await getSystemMetrics(timeRange, limit);
        return NextResponse.json({ metrics });

      case 'health_checks':
        const healthChecks = await getHealthChecks();
        return NextResponse.json({ health_checks: healthChecks });

      case 'performance_alerts':
        const alerts = await getPerformanceAlerts(limit);
        return NextResponse.json({ alerts });

      case 'user_analytics':
        const analytics = await getUserAnalytics(timeRange);
        return NextResponse.json({ analytics });

      case 'api_metrics':
        const apiMetrics = await getAPIMetrics(timeRange, limit);
        return NextResponse.json({ api_metrics: apiMetrics });

      case 'error_logs':
        const errorLogs = await getErrorLogs(timeRange, limit);
        return NextResponse.json({ error_logs: errorLogs });

      case 'uptime_status':
        const uptimeStatus = await getUptimeStatus();
        return NextResponse.json({ uptime_status: uptimeStatus });

      case 'dashboard_overview':
        const overview = await getDashboardOverview(timeRange);
        return NextResponse.json({ overview });

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Performance API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'record_metric':
        const metric = await recordSystemMetric(body);
        return NextResponse.json({ success: true, metric });

      case 'create_alert':
        const alert = await createPerformanceAlert(body);
        return NextResponse.json({ success: true, alert });

      case 'resolve_alert':
        const resolvedAlert = await resolveAlert(body.alertId);
        return NextResponse.json({ success: true, alert: resolvedAlert });

      case 'record_error':
        const errorLog = await recordErrorLog(body);
        return NextResponse.json({ success: true, error_log: errorLog });

      case 'update_health_check':
        const healthCheck = await updateHealthCheck(body);
        return NextResponse.json({ success: true, health_check: healthCheck });

      case 'record_user_event':
        const userEvent = await recordUserAnalytics(body);
        return NextResponse.json({ success: true, event: userEvent });

      case 'create_uptime_monitor':
        const monitor = await createUptimeMonitor(body);
        return NextResponse.json({ success: true, monitor });

      case 'trigger_health_check':
        const checkResult = await triggerHealthCheck(body.serviceId);
        return NextResponse.json({ success: true, result: checkResult });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Performance POST API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// System Metrics Functions
async function getSystemMetrics(timeRange: string, limit: number) {
  const timeCondition = getTimeCondition(timeRange);
  
  const { data } = await supabase
    .from('system_metrics')
    .select('*')
    .gte('recorded_at', timeCondition)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function recordSystemMetric(metricData: any) {
  const { data } = await supabase
    .from('system_metrics')
    .insert({
      metric_type: metricData.metricType,
      metric_name: metricData.metricName,
      value: metricData.value,
      unit: metricData.unit,
      node_id: metricData.nodeId,
      environment: metricData.environment || 'production'
    })
    .select()
    .single();

  // Check thresholds after recording
  await checkPerformanceThresholds();

  return data;
}

// Health Check Functions
async function getHealthChecks() {
  const { data } = await supabase
    .from('health_checks')
    .select('*')
    .order('last_checked', { ascending: false });

  return data || [];
}

async function updateHealthCheck(checkData: any) {
  const { data } = await supabase
    .from('health_checks')
    .update({
      status: checkData.status,
      response_time_ms: checkData.responseTime,
      status_code: checkData.statusCode,
      error_message: checkData.errorMessage,
      last_checked: new Date().toISOString(),
      consecutive_failures: checkData.status === 'unhealthy' ? 
        checkData.consecutiveFailures + 1 : 0
    })
    .eq('id', checkData.serviceId)
    .select()
    .single();

  return data;
}

async function triggerHealthCheck(serviceId: string) {
  // Simulate health check
  const isHealthy = Math.random() > 0.1; // 90% success rate
  const responseTime = Math.floor(Math.random() * 1000) + 50;

  const result = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    response_time_ms: responseTime,
    status_code: isHealthy ? 200 : 500,
    error_message: isHealthy ? null : 'Service unavailable',
    checked_at: new Date().toISOString()
  };

  // Update health check record
  await supabase
    .from('health_checks')
    .update({
      status: result.status,
      response_time_ms: result.response_time_ms,
      status_code: result.status_code,
      error_message: result.error_message,
      last_checked: result.checked_at,
      consecutive_failures: result.status === 'unhealthy' ? 1 : 0
    })
    .eq('id', serviceId);

  return result;
}

// Alert Functions
async function getPerformanceAlerts(limit: number) {
  const { data } = await supabase
    .from('performance_alerts')
    .select('*')
    .order('triggered_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function createPerformanceAlert(alertData: any) {
  const { data } = await supabase
    .from('performance_alerts')
    .insert({
      alert_type: alertData.alertType,
      severity: alertData.severity,
      title: alertData.title,
      description: alertData.description,
      metric_name: alertData.metricName,
      threshold_value: alertData.thresholdValue,
      current_value: alertData.currentValue,
      service_name: alertData.serviceName,
      environment: alertData.environment
    })
    .select()
    .single();

  // Send notifications based on severity
  if (alertData.severity === 'critical' || alertData.severity === 'high') {
    await sendAlertNotification(data);
  }

  return data;
}

async function resolveAlert(alertId: string) {
  const { data } = await supabase
    .from('performance_alerts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: 'system' // In real app, this would be the user ID
    })
    .eq('id', alertId)
    .select()
    .single();

  return data;
}

// User Analytics Functions
async function getUserAnalytics(timeRange: string) {
  const timeCondition = getTimeCondition(timeRange);

  // Get user activity metrics
  const { data: events } = await supabase
    .from('user_analytics')
    .select('event_type, user_id, session_id, timestamp')
    .gte('timestamp', timeCondition);

  const activeUsers = new Set(events?.map(e => e.user_id).filter(Boolean)).size;
  const totalEvents = events?.length || 0;
  const sessionCount = new Set(events?.map(e => e.session_id)).size;

  // Get API metrics
  const { data: apiCalls } = await supabase
    .from('api_metrics')
    .select('endpoint, response_time_ms, status_code')
    .gte('timestamp', timeCondition);

  const totalApiCalls = apiCalls?.length || 0;
  const avgResponseTime = apiCalls && apiCalls.length > 0 
    ? apiCalls.reduce((sum, call) => sum + call.response_time_ms, 0) / totalApiCalls 
    : 0;
  const errorRate = apiCalls && apiCalls.length > 0 
    ? (apiCalls.filter(call => call.status_code >= 400).length / totalApiCalls) * 100 
    : 0;

  return {
    active_users: activeUsers,
    total_events: totalEvents,
    total_sessions: sessionCount,
    api_calls: totalApiCalls,
    avg_response_time: Math.round(avgResponseTime),
    error_rate: Math.round(errorRate * 100) / 100,
    page_views: events?.filter(e => e.event_type === 'page_view').length || 0
  };
}

async function recordUserAnalytics(eventData: any) {
  const { data } = await supabase
    .from('user_analytics')
    .insert({
      user_id: eventData.userId,
      session_id: eventData.sessionId,
      event_type: eventData.eventType,
      event_name: eventData.eventName,
      page_url: eventData.pageUrl,
      referrer_url: eventData.referrerUrl,
      user_agent: eventData.userAgent,
      ip_address: eventData.ipAddress,
      device_type: eventData.deviceType,
      browser: eventData.browser,
      operating_system: eventData.operatingSystem,
      properties: eventData.properties || {}
    })
    .select()
    .single();

  return data;
}

// API Metrics Functions
async function getAPIMetrics(timeRange: string, limit: number) {
  const timeCondition = getTimeCondition(timeRange);

  const { data } = await supabase
    .from('api_metrics')
    .select('*')
    .gte('timestamp', timeCondition)
    .order('timestamp', { ascending: false })
    .limit(limit);

  return data || [];
}

// Error Logging Functions
async function getErrorLogs(timeRange: string, limit: number) {
  const timeCondition = getTimeCondition(timeRange);

  const { data } = await supabase
    .from('error_logs')
    .select('*')
    .gte('created_at', timeCondition)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function recordErrorLog(errorData: any) {
  const { data } = await supabase
    .from('error_logs')
    .insert({
      error_type: errorData.errorType,
      error_message: errorData.errorMessage,
      stack_trace: errorData.stackTrace,
      file_path: errorData.filePath,
      line_number: errorData.lineNumber,
      function_name: errorData.functionName,
      user_id: errorData.userId,
      session_id: errorData.sessionId,
      request_id: errorData.requestId,
      user_agent: errorData.userAgent,
      ip_address: errorData.ipAddress,
      url: errorData.url,
      http_method: errorData.httpMethod,
      status_code: errorData.statusCode,
      environment: errorData.environment || 'production',
      severity: errorData.severity || 'error',
      tags: errorData.tags || {},
      metadata: errorData.metadata || {}
    })
    .select()
    .single();

  // Create alert for critical errors
  if (errorData.severity === 'fatal') {
    await createPerformanceAlert({
      alertType: 'error',
      severity: 'critical',
      title: 'Fatal Error Detected',
      description: `Fatal error in ${errorData.filePath}: ${errorData.errorMessage}`,
      serviceName: 'application',
      environment: errorData.environment
    });
  }

  return data;
}

// Uptime Monitoring Functions
async function getUptimeStatus() {
  const { data: monitors } = await supabase
    .from('uptime_monitors')
    .select(`
      *,
      uptime_checks!monitor_id (
        status,
        response_time_ms,
        checked_at
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  return monitors?.map(monitor => {
    const recentChecks = monitor.uptime_checks?.slice(0, 100) || [];
    const upChecks = recentChecks.filter((check: any) => check.status === 'up').length;
    const uptime = recentChecks.length > 0 ? (upChecks / recentChecks.length) * 100 : 100;
    const avgResponseTime = recentChecks.reduce((sum: number, check: any) => 
      sum + (check.response_time_ms || 0), 0) / recentChecks.length || 0;

    return {
      ...monitor,
      uptime_percentage: Math.round(uptime * 100) / 100,
      avg_response_time: Math.round(avgResponseTime),
      last_check: recentChecks[0]?.checked_at,
      status: recentChecks[0]?.status || 'unknown'
    };
  }) || [];
}

async function createUptimeMonitor(monitorData: any) {
  const { data } = await supabase
    .from('uptime_monitors')
    .insert({
      name: monitorData.name,
      url: monitorData.url,
      method: monitorData.method || 'GET',
      headers: monitorData.headers || {},
      body: monitorData.body,
      timeout_ms: monitorData.timeoutMs || 30000,
      interval_minutes: monitorData.intervalMinutes || 5,
      expected_status_codes: monitorData.expectedStatusCodes || [200],
      expected_content: monitorData.expectedContent,
      created_by: monitorData.createdBy
    })
    .select()
    .single();

  return data;
}

// Dashboard Overview
async function getDashboardOverview(timeRange: string) {
  const [
    systemMetrics,
    healthChecks,
    activeAlerts,
    userAnalytics,
    errorLogs
  ] = await Promise.all([
    getSystemMetrics(timeRange, 10),
    getHealthChecks(),
    getPerformanceAlerts(10),
    getUserAnalytics(timeRange),
    getErrorLogs(timeRange, 10)
  ]);

  // Calculate system health score
  const healthyServices = healthChecks.filter(s => s.status === 'healthy').length;
  const totalServices = healthChecks.length;
  const systemHealth = totalServices > 0 ? (healthyServices / totalServices) * 100 : 100;

  // Calculate critical alerts count
  const criticalAlerts = activeAlerts.filter(a => 
    a.severity === 'critical' && a.status === 'active').length;

  return {
    system_health: Math.round(systemHealth * 100) / 100,
    active_services: totalServices,
    healthy_services: healthyServices,
    critical_alerts: criticalAlerts,
    total_alerts: activeAlerts.filter(a => a.status === 'active').length,
    error_count: errorLogs.length,
    ...userAnalytics
  };
}

// Utility Functions
function getTimeCondition(timeRange: string): string {
  const now = new Date();
  switch (timeRange) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  }
}

async function checkPerformanceThresholds() {
  // This would normally call the PostgreSQL function
  // For now, implementing basic threshold checking
  
  const recentMetrics = await getSystemMetrics('1h', 50);
  
  for (const metric of recentMetrics) {
    let shouldAlert = false;
    let severity = 'medium';
    let title = '';
    let description = '';

    switch (metric.metric_name) {
      case 'cpu_usage':
        if (metric.value > 90) {
          shouldAlert = true;
          severity = 'critical';
          title = 'Critical CPU Usage';
          description = `CPU usage is at ${metric.value}% on ${metric.node_id}`;
        } else if (metric.value > 80) {
          shouldAlert = true;
          severity = 'high';
          title = 'High CPU Usage';
          description = `CPU usage is at ${metric.value}% on ${metric.node_id}`;
        }
        break;
        
      case 'memory_usage':
        if (metric.value > 95) {
          shouldAlert = true;
          severity = 'critical';
          title = 'Critical Memory Usage';
          description = `Memory usage is at ${metric.value}% on ${metric.node_id}`;
        } else if (metric.value > 85) {
          shouldAlert = true;
          severity = 'high';
          title = 'High Memory Usage';
          description = `Memory usage is at ${metric.value}% on ${metric.node_id}`;
        }
        break;
    }

    if (shouldAlert) {
      // Check if similar alert already exists
      const { data: existingAlerts } = await supabase
        .from('performance_alerts')
        .select('id')
        .eq('metric_name', metric.metric_name)
        .eq('status', 'active')
        .gte('triggered_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

      if (!existingAlerts || existingAlerts.length === 0) {
        await createPerformanceAlert({
          alertType: 'threshold',
          severity,
          title,
          description,
          metricName: metric.metric_name,
          thresholdValue: severity === 'critical' ? 90 : 80,
          currentValue: metric.value,
          serviceName: metric.node_id,
          environment: metric.environment
        });
      }
    }
  }
}

async function sendAlertNotification(alert: any) {
  // In a real implementation, this would send notifications via:
  // - Email
  // - Slack
  // - Webhook
  // - SMS
  
  console.log(`ALERT: ${alert.title} - ${alert.description}`);
  
  // Mark notification as sent
  await supabase
    .from('performance_alerts')
    .update({ notification_sent: true })
    .eq('id', alert.id);
}
