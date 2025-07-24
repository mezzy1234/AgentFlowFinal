import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Security audit logging
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const body = await request.json();
    const { 
      eventType, 
      severity = 'info', 
      userId, 
      agentId, 
      ipAddress, 
      userAgent, 
      details = {},
      requestId
    } = body;

    // Validate webhook signature for internal calls
    const webhookSignature = request.headers.get('x-webhook-signature');
    const expectedSignature = process.env.INTERNAL_WEBHOOK_SECRET;
    
    if (webhookSignature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    // Log security event
    const { data: auditLog, error: auditError } = await supabase
      .from('security_audit_logs')
      .insert({
        event_type: eventType,
        severity,
        user_id: userId,
        agent_id: agentId,
        ip_address: ipAddress,
        user_agent: userAgent,
        event_details: details,
        request_id: requestId,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (auditError) {
      console.error('Failed to create audit log:', auditError);
      return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
    }

    // Check for security threats based on event patterns
    if (severity === 'high' || eventType.includes('breach') || eventType.includes('attack')) {
      // Send immediate alert
      await sendSecurityAlert(auditLog);
      
      // Auto-suspend user if necessary
      if (eventType === 'credential_breach' || eventType === 'malicious_activity') {
        await autoSuspendUser(supabase, userId, eventType);
      }
    }

    // Rate limiting and anomaly detection
    if (userId) {
      await checkUserSecurityMetrics(supabase, userId);
    }

    return NextResponse.json({
      success: true,
      auditLogId: auditLog.id,
      timestamp: auditLog.timestamp
    });

  } catch (error: any) {
    console.error('Security audit API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// GET endpoint for security reports and compliance data
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

    // Check if user has admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type, is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'overview';
    const timeframe = searchParams.get('timeframe') || '7d';
    const userId = searchParams.get('userId');

    let daysBack = 7;
    if (timeframe === '1d') daysBack = 1;
    else if (timeframe === '30d') daysBack = 30;
    else if (timeframe === '90d') daysBack = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    if (reportType === 'overview') {
      // Security overview dashboard
      const { data: threatSummary } = await supabase
        .from('security_audit_logs')
        .select('severity, event_type')
        .gte('timestamp', startDate.toISOString());

      const { data: userActivity } = await supabase
        .from('security_audit_logs')
        .select('user_id, event_type')
        .gte('timestamp', startDate.toISOString())
        .not('user_id', 'is', null);

      const { data: credentialAudits } = await supabase
        .from('credential_audit_logs')
        .select('action, provider, success')
        .gte('timestamp', startDate.toISOString());

      // Calculate metrics
      const threatCounts = {
        critical: threatSummary?.filter(t => t.severity === 'critical').length || 0,
        high: threatSummary?.filter(t => t.severity === 'high').length || 0,
        medium: threatSummary?.filter(t => t.severity === 'medium').length || 0,
        low: threatSummary?.filter(t => t.severity === 'low').length || 0
      };

      const uniqueUsers = new Set(userActivity?.map(u => u.user_id)).size;
      const credentialSuccessRate = (credentialAudits && credentialAudits.length > 0)
        ? (credentialAudits.filter(c => c.success).length / credentialAudits.length) * 100 
        : 0;

      return NextResponse.json({
        reportType: 'overview',
        timeframe,
        threatSummary: threatCounts,
        activeUsers: uniqueUsers,
        credentialSuccessRate: Math.round(credentialSuccessRate * 100) / 100,
        totalEvents: threatSummary?.length || 0,
        recentEvents: threatSummary?.slice(0, 10) || []
      });

    } else if (reportType === 'compliance') {
      // GDPR/SOC2 compliance report
      const { data: dataProcessingLogs } = await supabase
        .from('data_processing_logs')
        .select('*')
        .gte('timestamp', startDate.toISOString());

      const { data: consentLogs } = await supabase
        .from('user_consent_logs')
        .select('*')
        .gte('timestamp', startDate.toISOString());

      const { data: retentionMetrics } = await supabase
        .from('data_retention_metrics')
        .select('*')
        .gte('calculated_at', startDate.toISOString());

      return NextResponse.json({
        reportType: 'compliance',
        timeframe,
        dataProcessing: {
          totalRequests: dataProcessingLogs?.length || 0,
          lawfulBasisBreakdown: calculateLawfulBasisBreakdown(dataProcessingLogs || []),
          retentionCompliance: calculateRetentionCompliance(retentionMetrics || [])
        },
        userConsent: {
          totalConsentEvents: consentLogs?.length || 0,
          consentRates: calculateConsentRates(consentLogs || [])
        },
        certifications: [
          { name: 'SOC 2 Type II', status: 'active', expiresAt: '2024-12-31' },
          { name: 'GDPR Compliance', status: 'active', lastAudit: '2024-01-15' },
          { name: 'ISO 27001', status: 'in_progress', expectedCompletion: '2024-06-30' }
        ]
      });

    } else if (reportType === 'user' && userId) {
      // User-specific security report
      const { data: userAuditLogs } = await supabase
        .from('security_audit_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });

      const { data: userCredentials } = await supabase
        .from('credentials')
        .select('provider, created_at, last_used_at')
        .eq('user_id', userId);

      const { data: userSessions } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      return NextResponse.json({
        reportType: 'user',
        userId,
        timeframe,
        auditLogs: userAuditLogs || [],
        credentialSummary: {
          totalCredentials: userCredentials?.length || 0,
          providerBreakdown: calculateProviderBreakdown(userCredentials || []),
          lastActivity: userCredentials?.reduce((latest, cred) => {
            const lastUsed = new Date(cred.last_used_at || 0);
            return lastUsed > latest ? lastUsed : latest;
          }, new Date(0))
        },
        sessionAnalysis: {
          totalSessions: userSessions?.length || 0,
          averageSessionDuration: calculateAverageSessionDuration(userSessions || []),
          suspiciousActivity: userAuditLogs?.filter(log => log.severity === 'high' || log.severity === 'critical') || []
        }
      });

    } else {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Security report API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// Helper functions for security analysis
async function sendSecurityAlert(auditLog: any) {
  try {
    // Send to n8n webhook for security alerts
    if (process.env.N8N_SECURITY_WEBHOOK_URL) {
      await fetch(process.env.N8N_SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertType: 'security_threat',
          severity: auditLog.severity,
          eventType: auditLog.event_type,
          userId: auditLog.user_id,
          timestamp: auditLog.timestamp,
          details: auditLog.event_details
        })
      });
    }
  } catch (error) {
    console.error('Failed to send security alert:', error);
  }
}

async function autoSuspendUser(supabase: any, userId: string, reason: string) {
  try {
    await supabase
      .from('profiles')
      .update({
        account_status: 'suspended',
        suspension_reason: reason,
        suspended_at: new Date().toISOString()
      })
      .eq('id', userId);

    console.log(`User ${userId} auto-suspended for: ${reason}`);
  } catch (error) {
    console.error('Failed to auto-suspend user:', error);
  }
}

async function checkUserSecurityMetrics(supabase: any, userId: string) {
  try {
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const { data: recentEvents } = await supabase
      .from('security_audit_logs')
      .select('event_type, severity')
      .eq('user_id', userId)
      .gte('timestamp', last24Hours.toISOString());

    // Check for suspicious patterns
    const highSeverityEvents = recentEvents?.filter((e: any) => e.severity === 'high' || e.severity === 'critical').length || 0;
    const totalEvents = recentEvents?.length || 0;

    if (highSeverityEvents > 5 || totalEvents > 100) {
      // Flag for review
      await supabase
        .from('security_flags')
        .insert({
          user_id: userId,
          flag_type: 'anomalous_activity',
          details: {
            highSeverityEvents,
            totalEvents,
            timeframe: '24h'
          },
          status: 'pending_review',
          created_at: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Failed to check user security metrics:', error);
  }
}

function calculateLawfulBasisBreakdown(logs: any[]) {
  const breakdown: Record<string, number> = {};
  logs?.forEach(log => {
    const basis = log.lawful_basis || 'unknown';
    breakdown[basis] = (breakdown[basis] || 0) + 1;
  });
  return breakdown;
}

function calculateRetentionCompliance(metrics: any[]) {
  const latest = metrics?.[0];
  return {
    compliantRecords: latest?.compliant_records || 0,
    overRetentionRecords: latest?.over_retention_records || 0,
    complianceRate: latest?.compliance_rate || 0
  };
}

function calculateConsentRates(logs: any[]) {
  const consentGiven = logs?.filter(log => log.consent_given).length || 0;
  const totalRequests = logs?.length || 0;
  
  return {
    consentRate: totalRequests > 0 ? (consentGiven / totalRequests) * 100 : 0,
    totalRequests,
    consentGiven,
    consentDenied: totalRequests - consentGiven
  };
}

function calculateProviderBreakdown(credentials: any[]) {
  const breakdown: Record<string, number> = {};
  credentials?.forEach(cred => {
    breakdown[cred.provider] = (breakdown[cred.provider] || 0) + 1;
  });
  return breakdown;
}

function calculateAverageSessionDuration(sessions: any[]) {
  if (!sessions?.length) return 0;
  
  const durations = sessions
    .filter(s => s.ended_at)
    .map(s => new Date(s.ended_at).getTime() - new Date(s.created_at).getTime());
  
  if (durations.length === 0) return 0;
  
  const averageMs = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  return Math.round(averageMs / 1000 / 60); // Return in minutes
}
