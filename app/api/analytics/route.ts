import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// UX Intelligence and Analytics API
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const body = await request.json();
    const { 
      eventType, 
      userId, 
      sessionId,
      agentId,
      pageUrl,
      elementId,
      eventData = {},
      timestamp = new Date().toISOString()
    } = body;

    // Track user interaction event
    const { data: event, error: eventError } = await supabase
      .from('user_analytics_events')
      .insert({
        event_type: eventType,
        user_id: userId,
        session_id: sessionId,
        agent_id: agentId,
        page_url: pageUrl,
        element_id: elementId,
        event_data: eventData,
        timestamp
      })
      .select()
      .single();

    if (eventError) {
      console.error('Failed to track analytics event:', eventError);
      return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
    }

    // Real-time analytics processing
    await processAnalyticsEvent(supabase, event);

    return NextResponse.json({
      success: true,
      eventId: event.id
    });

  } catch (error: any) {
    console.error('Analytics tracking API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// GET endpoint for analytics dashboards
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get auth token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dashboardType = searchParams.get('type') || 'overview';
    const timeframe = searchParams.get('timeframe') || '7d';
    const agentId = searchParams.get('agentId');

    let daysBack = 7;
    if (timeframe === '1d') daysBack = 1;
    else if (timeframe === '30d') daysBack = 30;
    else if (timeframe === '90d') daysBack = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    if (dashboardType === 'overview') {
      // Platform overview analytics
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, account_type')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      // User engagement metrics
      const { data: userMetrics } = await supabase
        .from('user_analytics_events')
        .select('user_id, event_type, timestamp')
        .gte('timestamp', startDate.toISOString());

      // Agent performance metrics
      const { data: agentMetrics } = await supabase
        .from('agent_executions')
        .select('agent_id, status, duration_ms, executed_at')
        .gte('executed_at', startDate.toISOString());

      // Revenue metrics
      const { data: revenueMetrics } = await supabase
        .from('revenue_transactions')
        .select('total_amount_cents, developer_revenue_cents, processed_at')
        .gte('processed_at', startDate.toISOString());

      // Calculate metrics
      const activeUsers = new Set(userMetrics?.map(m => m.user_id)).size;
      const totalEvents = userMetrics?.length || 0;
      const totalExecutions = agentMetrics?.length || 0;
      const successfulExecutions = agentMetrics?.filter(m => m.status === 'success').length || 0;
      const avgExecutionTime = (agentMetrics && agentMetrics.length > 0)
        ? agentMetrics.reduce((sum, m) => sum + (m.duration_ms || 0), 0) / agentMetrics.length 
        : 0;
      const totalRevenue = revenueMetrics?.reduce((sum, r) => sum + (r.total_amount_cents || 0), 0) || 0;

      // Daily breakdown for charts
      const dailyMetrics = calculateDailyMetrics(userMetrics || [], agentMetrics || [], revenueMetrics || [], daysBack);

      return NextResponse.json({
        dashboardType: 'overview',
        timeframe,
        summary: {
          activeUsers,
          totalEvents,
          totalExecutions,
          successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
          avgExecutionTimeMs: Math.round(avgExecutionTime),
          totalRevenueCents: totalRevenue
        },
        chartData: dailyMetrics
      });

    } else if (dashboardType === 'user_journey') {
      // User journey and funnel analysis
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, account_type')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      // Funnel analysis
      const { data: funnelData } = await supabase
        .from('user_analytics_events')
        .select('event_type, user_id, timestamp')
        .gte('timestamp', startDate.toISOString())
        .in('event_type', ['page_view', 'agent_browse', 'agent_install', 'agent_execute', 'purchase']);

      // User journey paths
      const { data: journeyData } = await supabase
        .from('user_analytics_events')
        .select('user_id, event_type, page_url, timestamp')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      const funnelMetrics = calculateFunnelMetrics(funnelData || []);
      const journeyPaths = calculateJourneyPaths(journeyData || []);

      return NextResponse.json({
        dashboardType: 'user_journey',
        timeframe,
        funnel: funnelMetrics,
        journeyPaths: journeyPaths.slice(0, 10), // Top 10 paths
        conversionRate: funnelMetrics.conversionRate
      });

    } else if (dashboardType === 'agent_performance' && agentId) {
      // Agent-specific performance analytics
      const { data: agent } = await supabase
        .from('agents')
        .select('created_by, name')
        .eq('id', agentId)
        .single();

      if (!agent || (agent.created_by !== user.id && !await isAdmin(supabase, user.id))) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Agent execution analytics
      const { data: executions } = await supabase
        .from('agent_executions')
        .select('*')
        .eq('agent_id', agentId)
        .gte('executed_at', startDate.toISOString())
        .order('executed_at', { ascending: true });

      // User interaction analytics for this agent
      const { data: interactions } = await supabase
        .from('user_analytics_events')
        .select('*')
        .eq('agent_id', agentId)
        .gte('timestamp', startDate.toISOString());

      // Revenue analytics for this agent
      const { data: revenue } = await supabase
        .from('revenue_transactions')
        .select('*')
        .eq('agent_id', agentId)
        .gte('processed_at', startDate.toISOString());

      const performanceMetrics = calculateAgentPerformanceMetrics(executions || [], interactions || [], revenue || []);

      return NextResponse.json({
        dashboardType: 'agent_performance',
        agentId,
        agentName: agent.name,
        timeframe,
        ...performanceMetrics
      });

    } else if (dashboardType === 'developer_insights') {
      // Developer-specific insights
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', user.id)
        .single();

      if (profile?.account_type !== 'developer') {
        return NextResponse.json({ error: 'Developer access required' }, { status: 403 });
      }

      // Get developer's agents
      const { data: developerAgents } = await supabase
        .from('agents')
        .select('id, name, created_at, total_runs, success_rate')
        .eq('created_by', user.id);

      const agentIds = developerAgents?.map(a => a.id) || [];

      // Aggregate analytics across all developer's agents
      const { data: allExecutions } = await supabase
        .from('agent_executions')
        .select('*')
        .in('agent_id', agentIds)
        .gte('executed_at', startDate.toISOString());

      const { data: allRevenue } = await supabase
        .from('revenue_transactions')
        .select('*')
        .in('agent_id', agentIds)
        .gte('processed_at', startDate.toISOString());

      const developerInsights = calculateDeveloperInsights(developerAgents || [], allExecutions || [], allRevenue || []);

      return NextResponse.json({
        dashboardType: 'developer_insights',
        timeframe,
        ...developerInsights
      });

    } else {
      return NextResponse.json({ error: 'Invalid dashboard type' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Analytics dashboard API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// Helper functions for analytics calculations
async function processAnalyticsEvent(supabase: any, event: any) {
  try {
    // Update real-time metrics
    const today = new Date().toISOString().split('T')[0];
    
    await supabase
      .from('daily_analytics')
      .upsert({
        date: today,
        event_type: event.event_type,
        event_count: supabase.raw('event_count + 1'),
        unique_users: supabase.raw(`
          CASE WHEN '${event.user_id}' = ANY(unique_user_ids) 
          THEN unique_users 
          ELSE unique_users + 1 END
        `),
        unique_user_ids: supabase.raw(`
          CASE WHEN '${event.user_id}' = ANY(unique_user_ids) 
          THEN unique_user_ids 
          ELSE array_append(unique_user_ids, '${event.user_id}') END
        `)
      }, {
        onConflict: 'date,event_type'
      });

    // Trigger real-time analytics updates
    if (process.env.N8N_ANALYTICS_WEBHOOK_URL) {
      await fetch(process.env.N8N_ANALYTICS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'analytics_update',
          eventType: event.event_type,
          userId: event.user_id,
          timestamp: event.timestamp
        })
      });
    }
  } catch (error) {
    console.error('Failed to process analytics event:', error);
  }
}

function calculateDailyMetrics(userMetrics: any[], agentMetrics: any[], revenueMetrics: any[], daysBack: number) {
  const dailyData: Record<string, any> = {};
  
  // Initialize days
  for (let i = 0; i < daysBack; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyData[dateStr] = {
      date: dateStr,
      users: new Set(),
      events: 0,
      executions: 0,
      successfulExecutions: 0,
      revenue: 0
    };
  }

  // Aggregate user metrics
  userMetrics?.forEach(metric => {
    const date = metric.timestamp.split('T')[0];
    if (dailyData[date]) {
      dailyData[date].users.add(metric.user_id);
      dailyData[date].events++;
    }
  });

  // Aggregate agent metrics
  agentMetrics?.forEach(metric => {
    const date = metric.executed_at.split('T')[0];
    if (dailyData[date]) {
      dailyData[date].executions++;
      if (metric.status === 'success') {
        dailyData[date].successfulExecutions++;
      }
    }
  });

  // Aggregate revenue metrics
  revenueMetrics?.forEach(metric => {
    const date = metric.processed_at.split('T')[0];
    if (dailyData[date]) {
      dailyData[date].revenue += metric.total_amount_cents || 0;
    }
  });

  // Convert to array and calculate final metrics
  return Object.values(dailyData).map((day: any) => ({
    ...day,
    users: day.users.size,
    successRate: day.executions > 0 ? (day.successfulExecutions / day.executions) * 100 : 0
  })).reverse();
}

function calculateFunnelMetrics(funnelData: any[]) {
  const steps = ['page_view', 'agent_browse', 'agent_install', 'agent_execute', 'purchase'];
  const usersByStep: Record<string, Set<string>> = {};
  
  steps.forEach(step => {
    usersByStep[step] = new Set();
  });

  funnelData?.forEach(event => {
    if (usersByStep[event.event_type]) {
      usersByStep[event.event_type].add(event.user_id);
    }
  });

  const funnelCounts = steps.map(step => ({
    step,
    users: usersByStep[step].size
  }));

  const conversionRate = funnelCounts[0]?.users > 0 
    ? (funnelCounts[funnelCounts.length - 1]?.users / funnelCounts[0]?.users) * 100 
    : 0;

  return {
    steps: funnelCounts,
    conversionRate: Math.round(conversionRate * 100) / 100
  };
}

function calculateJourneyPaths(journeyData: any[]) {
  const userJourneys: Record<string, string[]> = {};
  
  journeyData?.forEach(event => {
    if (!userJourneys[event.user_id]) {
      userJourneys[event.user_id] = [];
    }
    userJourneys[event.user_id].push(event.event_type);
  });

  const pathCounts: Record<string, number> = {};
  
  Object.values(userJourneys).forEach(journey => {
    const pathKey = journey.slice(0, 5).join(' -> '); // First 5 steps
    pathCounts[pathKey] = (pathCounts[pathKey] || 0) + 1;
  });

  return Object.entries(pathCounts)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count);
}

function calculateAgentPerformanceMetrics(executions: any[], interactions: any[], revenue: any[]) {
  const totalExecutions = executions?.length || 0;
  const successfulExecutions = executions?.filter(e => e.status === 'success').length || 0;
  const averageDuration = executions?.length > 0 
    ? executions.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / executions.length 
    : 0;

  const uniqueUsers = new Set(executions?.map(e => e.user_id)).size;
  const totalRevenue = revenue?.reduce((sum, r) => sum + (r.total_amount_cents || 0), 0) || 0;

  const dailyBreakdown = calculateDailyExecutionBreakdown(executions);
  const errorAnalysis = calculateErrorAnalysis(executions);
  const userEngagement = calculateUserEngagement(interactions);

  return {
    summary: {
      totalExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      averageDurationMs: Math.round(averageDuration),
      uniqueUsers,
      totalRevenueCents: totalRevenue
    },
    dailyBreakdown,
    errorAnalysis,
    userEngagement
  };
}

function calculateDeveloperInsights(agents: any[], executions: any[], revenue: any[]) {
  const totalAgents = agents?.length || 0;
  const totalExecutions = executions?.length || 0;
  const totalRevenue = revenue?.reduce((sum, r) => sum + (r.developer_revenue_cents || 0), 0) || 0;

  const topPerformingAgents = agents
    ?.sort((a, b) => (b.total_runs || 0) - (a.total_runs || 0))
    .slice(0, 5) || [];

  const monthlyTrends = calculateMonthlyTrends(executions, revenue);

  return {
    summary: {
      totalAgents,
      totalExecutions,
      totalRevenueCents: totalRevenue,
      averageSuccessRate: agents?.length > 0 
        ? agents.reduce((sum, a) => sum + (a.success_rate || 0), 0) / agents.length 
        : 0
    },
    topPerformingAgents,
    monthlyTrends
  };
}

function calculateDailyExecutionBreakdown(executions: any[]) {
  const dailyData: Record<string, { successful: number; failed: number }> = {};
  
  executions?.forEach(execution => {
    const date = execution.executed_at.split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = { successful: 0, failed: 0 };
    }
    
    if (execution.status === 'success') {
      dailyData[date].successful++;
    } else {
      dailyData[date].failed++;
    }
  });

  return Object.entries(dailyData).map(([date, data]) => ({
    date,
    ...data
  }));
}

function calculateErrorAnalysis(executions: any[]) {
  const errorCounts: Record<string, number> = {};
  
  executions?.filter(e => e.status === 'failed').forEach(execution => {
    const errorType = execution.error_message?.split(':')[0] || 'Unknown Error';
    errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
  });

  return Object.entries(errorCounts)
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count);
}

function calculateUserEngagement(interactions: any[]) {
  const engagementData: Record<string, number> = {};
  
  interactions?.forEach(interaction => {
    engagementData[interaction.event_type] = (engagementData[interaction.event_type] || 0) + 1;
  });

  return Object.entries(engagementData)
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count);
}

function calculateMonthlyTrends(executions: any[], revenue: any[]) {
  const monthlyData: Record<string, { executions: number; revenue: number }> = {};
  
  executions?.forEach(execution => {
    const month = execution.executed_at.substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { executions: 0, revenue: 0 };
    }
    monthlyData[month].executions++;
  });

  revenue?.forEach(rev => {
    const month = rev.processed_at.substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { executions: 0, revenue: 0 };
    }
    monthlyData[month].revenue += rev.developer_revenue_cents || 0;
  });

  return Object.entries(monthlyData).map(([month, data]) => ({
    month,
    ...data
  }));
}

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();
  
  return profile?.is_admin === true;
}
