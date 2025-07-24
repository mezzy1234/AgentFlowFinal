import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function GET(req: NextRequest, { params }: { params: { agentId: string } }) {
  return handleWebhookRequest(req, params.agentId, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: { agentId: string } }) {
  return handleWebhookRequest(req, params.agentId, 'POST');
}

export async function PUT(req: NextRequest, { params }: { params: { agentId: string } }) {
  return handleWebhookRequest(req, params.agentId, 'PUT');
}

export async function DELETE(req: NextRequest, { params }: { params: { agentId: string } }) {
  return handleWebhookRequest(req, params.agentId, 'DELETE');
}

async function handleWebhookRequest(req: NextRequest, agentId: string, method: string) {
  const startTime = Date.now();
  const clientIp = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || '';

  try {
    // Get webhook configuration
    const { data: webhook, error: webhookError } = await supabase
      .from('agent_webhooks')
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .single();

    if (webhookError || !webhook) {
      await logWebhookAttempt(agentId, method, clientIp, 404, 'Webhook not found', null, Date.now() - startTime);
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Check if method is supported
    if (!webhook.supported_methods.includes(method)) {
      await logWebhookAttempt(agentId, method, clientIp, 405, 'Method not allowed', webhook.user_id, Date.now() - startTime);
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Rate limiting check
    const rateLimitResult = await checkRateLimit(agentId, clientIp, webhook);
    if (rateLimitResult.exceeded) {
      await logWebhookAttempt(agentId, method, clientIp, 429, 'Rate limit exceeded', webhook.user_id, Date.now() - startTime);
      return NextResponse.json(
        { error: 'Rate limit exceeded', retry_after: rateLimitResult.retryAfter },
        { status: 429, headers: { 'Retry-After': rateLimitResult.retryAfter.toString() } }
      );
    }

    // Verify webhook signature if secret is configured
    if (webhook.webhook_secret) {
      const signatureHeader = req.headers.get('x-webhook-signature') || req.headers.get('x-hub-signature-256');
      if (!signatureHeader) {
        await logWebhookAttempt(agentId, method, clientIp, 401, 'Missing signature', webhook.user_id, Date.now() - startTime);
        return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
      }

      const body = method !== 'GET' ? await req.text() : '';
      const isValidSignature = await verifyWebhookSignature(body, webhook.webhook_secret, signatureHeader);
      
      if (!isValidSignature) {
        await logWebhookAttempt(agentId, method, clientIp, 401, 'Invalid signature', webhook.user_id, Date.now() - startTime);
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    // Parse request body for POST/PUT requests
    let requestBody = null;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        const bodyText = await req.text();
        requestBody = bodyText ? JSON.parse(bodyText) : null;
      } catch (error) {
        await logWebhookAttempt(agentId, method, clientIp, 400, 'Invalid JSON', webhook.user_id, Date.now() - startTime);
        return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
    }

    // Extract query parameters
    const queryParams = Object.fromEntries(new URL(req.url).searchParams.entries());

    // Enqueue agent execution
    const executionResult = await enqueueAgentExecution(webhook, {
      method,
      headers: Object.fromEntries(req.headers.entries()),
      query: queryParams,
      body: requestBody,
      ip: clientIp,
      userAgent
    });

    // Log successful webhook
    await logWebhookAttempt(
      agentId, 
      method, 
      clientIp, 
      202, 
      'Accepted', 
      webhook.user_id, 
      Date.now() - startTime,
      { execution_id: executionResult.execution_id }
    );

    // Update webhook stats
    await updateWebhookStats(webhook.id, true);

    return NextResponse.json({
      success: true,
      message: 'Webhook received and agent execution queued',
      execution_id: executionResult.execution_id
    }, { status: 202 });

  } catch (error) {
    console.error('Webhook proxy error:', error);
    
    await logWebhookAttempt(
      agentId, 
      method, 
      clientIp, 
      500, 
      error instanceof Error ? error.message : 'Internal server error',
      null,
      Date.now() - startTime
    );

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function checkRateLimit(agentId: string, clientIp: string, webhook: any) {
  const minuteKey = `${agentId}:${clientIp}:minute`;
  const hourKey = `${agentId}:${clientIp}:hour`;
  const now = Date.now();

  // Check per-minute limit
  const minuteData = rateLimitStore.get(minuteKey);
  if (minuteData && minuteData.resetTime > now) {
    if (minuteData.count >= webhook.rate_limit_per_minute) {
      return { exceeded: true, retryAfter: Math.ceil((minuteData.resetTime - now) / 1000) };
    }
  } else {
    // Reset minute counter
    rateLimitStore.set(minuteKey, { count: 0, resetTime: now + 60000 });
  }

  // Check per-hour limit
  const hourData = rateLimitStore.get(hourKey);
  if (hourData && hourData.resetTime > now) {
    if (hourData.count >= webhook.rate_limit_per_hour) {
      return { exceeded: true, retryAfter: Math.ceil((hourData.resetTime - now) / 1000) };
    }
  } else {
    // Reset hour counter
    rateLimitStore.set(hourKey, { count: 0, resetTime: now + 3600000 });
  }

  // Increment counters
  const newMinuteData = rateLimitStore.get(minuteKey)!;
  const newHourData = rateLimitStore.get(hourKey)!;
  
  rateLimitStore.set(minuteKey, { ...newMinuteData, count: newMinuteData.count + 1 });
  rateLimitStore.set(hourKey, { ...newHourData, count: newHourData.count + 1 });

  return { exceeded: false, retryAfter: 0 };
}

async function verifyWebhookSignature(body: string, secret: string, signature: string): Promise<boolean> {
  try {
    // Support GitHub-style signatures (sha256=...)
    const expectedSignature = signature.startsWith('sha256=') 
      ? signature 
      : `sha256=${signature}`;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body, 'utf8');
    const computedSignature = `sha256=${hmac.digest('hex')}`;

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(computedSignature, 'utf8')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

async function enqueueAgentExecution(webhook: any, requestData: any) {
  // Prepare trigger data
  const triggerData = {
    webhook: {
      method: requestData.method,
      headers: filterSensitiveHeaders(requestData.headers),
      query: requestData.query,
      body: requestData.body,
      metadata: {
        ip: requestData.ip,
        user_agent: requestData.userAgent,
        timestamp: new Date().toISOString()
      }
    }
  };

  // Enqueue execution
  const { data: executionId } = await supabase.rpc('enqueue_agent_execution', {
    p_agent_id: webhook.agent_id,
    p_user_id: webhook.user_id,
    p_execution_type: 'webhook',
    p_trigger_data: triggerData,
    p_priority: 3 // Higher priority for webhooks
  });

  return { execution_id: executionId };
}

async function logWebhookAttempt(
  agentId: string, 
  method: string, 
  clientIp: string, 
  statusCode: number, 
  message: string,
  userId: string | null,
  duration: number,
  metadata: any = {}
) {
  try {
    await supabase
      .from('webhook_access_logs')
      .insert({
        agent_id: agentId,
        user_id: userId,
        method,
        ip_address: clientIp,
        status_code: statusCode,
        response_message: message,
        duration_ms: duration,
        metadata,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging webhook attempt:', error);
  }
}

async function updateWebhookStats(webhookId: string, success: boolean) {
  try {
    if (success) {
      await supabase.rpc('increment_webhook_success', { webhook_id: webhookId });
    } else {
      await supabase.rpc('increment_webhook_failure', { webhook_id: webhookId });
    }
  } catch (error) {
    console.error('Error updating webhook stats:', error);
  }
}

function getClientIP(req: NextRequest): string {
  // Try various headers for the real IP
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIp || cfConnectingIp || 'unknown';
}

function filterSensitiveHeaders(headers: { [key: string]: string }): { [key: string]: string } {
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-webhook-secret'
  ];

  const filtered: { [key: string]: string } = {};
  
  for (const [key, value] of Object.entries(headers)) {
    if (!sensitiveHeaders.includes(key.toLowerCase())) {
      filtered[key] = value;
    } else {
      filtered[key] = '[REDACTED]';
    }
  }

  return filtered;
}

// Cleanup old rate limit entries
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  rateLimitStore.forEach((data, key) => {
    if (data.resetTime < now) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}, 60000); // Cleanup every minute
