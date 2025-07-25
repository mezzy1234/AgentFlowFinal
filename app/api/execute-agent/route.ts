import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ExecutionRequest {
  agentId: string;
  inputs?: Record<string, any>;
  metadata?: Record<string, any>;
  callbackUrl?: string;
}

interface ExecutionResponse {
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  outputs?: Record<string, any>;
  error?: string;
  executionTime?: number;
}

// Execute agent endpoint
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get('authorization');
    let user = null;
    let apiKey = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Check if it's an API key or JWT token
      if (token.startsWith('ak_')) {
        // API Key authentication
        const { data: keyData } = await supabase
          .from('api_keys')
          .select('user_id, permissions, rate_limit, is_active')
          .eq('key_id', token)
          .eq('is_active', true)
          .single();

        if (!keyData) {
          return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
        }

        // Check permissions
        if (!keyData.permissions.includes('agent:execute') && !keyData.permissions.includes('*')) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        apiKey = keyData;
        const { data: userData } = await supabase.auth.admin.getUserById(keyData.user_id);
        user = userData.user;
      } else {
        // JWT token authentication
        const { data: { user: jwtUser }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !jwtUser) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        user = jwtUser;
      }
    } else {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const body: ExecutionRequest = await request.json();
    const { agentId, inputs = {}, metadata = {}, callbackUrl } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User authentication failed' }, { status: 401 });
    }

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('status', 'published')
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found or not published' }, { status: 404 });
    }

    // Check if user has purchased the agent (if it's paid)
    if (agent.price > 0) {
      const { data: purchase } = await supabase
        .from('agent_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('agent_id', agentId)
        .eq('status', 'completed')
        .single();

      if (!purchase && agent.developer_id !== user.id) {
        return NextResponse.json({ error: 'Agent purchase required' }, { status: 402 });
      }
    }

    // Rate limiting for API keys
    if (apiKey) {
      const rateLimit = await checkRateLimit(apiKey, agentId);
      if (!rateLimit.allowed) {
        return NextResponse.json({ 
          error: 'Rate limit exceeded',
          resetTime: rateLimit.resetTime 
        }, { status: 429 });
      }
    }

    // Get required credentials
    const { data: credRequirements } = await supabase
      .from('agent_credentials')
      .select('*')
      .eq('agent_id', agentId)
      .eq('required', true);

    // Check if user has all required credentials
    const missingCredentials = [];
    const userCredentials = new Map();

    if (credRequirements?.length) {
      for (const req of credRequirements) {
        const { data: cred } = await supabase
          .from('user_credentials')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', req.service)
          .eq('status', 'active')
          .single();

        if (!cred) {
          missingCredentials.push(req.service);
        } else {
          userCredentials.set(req.service, cred);
        }
      }
    }

    if (missingCredentials.length > 0) {
      return NextResponse.json({ 
        error: 'Missing required credentials',
        missingCredentials
      }, { status: 400 });
    }

    // Create execution record
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: execution, error: execError } = await supabase
      .from('agent_execution_logs')
      .insert({
        id: executionId,
        agent_id: agentId,
        user_id: user.id,
        status: 'pending',
        inputs,
        metadata: {
          ...metadata,
          api_key_used: !!apiKey,
          callback_url: callbackUrl
        },
        execution_start: new Date().toISOString()
      })
      .select()
      .single();

    if (execError) {
      console.error('Failed to create execution log:', execError);
      return NextResponse.json({ error: 'Failed to start execution' }, { status: 500 });
    }

    // Execute agent asynchronously
    executeAgentAsync(agent, execution, userCredentials, callbackUrl);

    return NextResponse.json({
      executionId,
      status: 'pending',
      message: 'Agent execution started',
      estimatedTime: estimateExecutionTime(agent)
    });

  } catch (error) {
    console.error('Agent execution error:', error);
    return NextResponse.json({ 
      error: 'Failed to execute agent',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// GET endpoint for execution status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');
    const agentId = searchParams.get('agentId');
    const userId = searchParams.get('userId');

    if (executionId) {
      // Get specific execution
      const { data: execution } = await supabase
        .from('agent_execution_logs')
        .select('*')
        .eq('id', executionId)
        .single();

      if (!execution) {
        return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
      }

      return NextResponse.json({
        executionId: execution.id,
        status: execution.status,
        outputs: execution.outputs,
        error: execution.error_message,
        executionTime: execution.execution_time_ms,
        startTime: execution.execution_start,
        endTime: execution.execution_end
      });
    }

    if (agentId) {
      // Get recent executions for agent
      const { data: executions } = await supabase
        .from('agent_execution_logs')
        .select('*')
        .eq('agent_id', agentId)
        .order('execution_start', { ascending: false })
        .limit(10);

      return NextResponse.json({ executions });
    }

    return NextResponse.json({ error: 'ExecutionId or agentId required' }, { status: 400 });

  } catch (error) {
    console.error('Get execution status error:', error);
    return NextResponse.json({ error: 'Failed to get execution status' }, { status: 500 });
  }
}

// Async agent execution function
async function executeAgentAsync(
  agent: any, 
  execution: any, 
  userCredentials: Map<string, any>,
  callbackUrl?: string
) {
  const startTime = Date.now();
  
  try {
    // Update status to running
    await supabase
      .from('agent_execution_logs')
      .update({ status: 'running' })
      .eq('id', execution.id);

    // Prepare credentials for injection
    const credentialHeaders: Record<string, string> = {};
    const credentialBody: Record<string, any> = {};

    for (const [service, cred] of Array.from(userCredentials.entries())) {
      // Decrypt credential value
      const decryptedValue = await decryptCredential(cred.encrypted_value);
      
      // Inject based on credential type
      switch (cred.type) {
        case 'bearer':
          credentialHeaders[`Authorization`] = `Bearer ${decryptedValue}`;
          break;
        case 'api_key':
          credentialHeaders[`X-API-Key`] = decryptedValue;
          break;
        case 'oauth':
          credentialHeaders[`Authorization`] = `Bearer ${decryptedValue}`;
          break;
      }
    }

    // Execute the agent webhook
    const webhookResponse = await fetch(agent.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...credentialHeaders
      },
      body: JSON.stringify({
        ...execution.inputs,
        agentflow_execution_id: execution.id,
        agentflow_user_id: execution.user_id
      })
    });

    const executionTime = Date.now() - startTime;
    const responseData = await webhookResponse.json().catch(() => ({}));

    if (webhookResponse.ok) {
      // Success
      await supabase
        .from('agent_execution_logs')
        .update({
          status: 'completed',
          outputs: responseData,
          execution_end: new Date().toISOString(),
          execution_time_ms: executionTime,
          webhook_status_code: webhookResponse.status
        })
        .eq('id', execution.id);

      // Update agent analytics
      await updateAgentAnalytics(agent.id, true, executionTime);

      // Send callback if provided
      if (callbackUrl) {
        await sendCallback(callbackUrl, {
          executionId: execution.id,
          status: 'completed',
          outputs: responseData,
          executionTime
        });
      }

    } else {
      // Failure
      await supabase
        .from('agent_execution_logs')
        .update({
          status: 'failed',
          error_message: `Webhook failed: ${webhookResponse.status}`,
          execution_end: new Date().toISOString(),
          execution_time_ms: executionTime,
          webhook_status_code: webhookResponse.status
        })
        .eq('id', execution.id);

      await updateAgentAnalytics(agent.id, false, executionTime);

      if (callbackUrl) {
        await sendCallback(callbackUrl, {
          executionId: execution.id,
          status: 'failed',
          error: `Webhook failed: ${webhookResponse.status}`,
          executionTime
        });
      }
    }

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = (error as Error).message;

    await supabase
      .from('agent_execution_logs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        execution_end: new Date().toISOString(),
        execution_time_ms: executionTime
      })
      .eq('id', execution.id);

    await updateAgentAnalytics(agent.id, false, executionTime);

    if (callbackUrl) {
      await sendCallback(callbackUrl, {
        executionId: execution.id,
        status: 'failed',
        error: errorMessage,
        executionTime
      });
    }
  }
}

// Rate limiting check
async function checkRateLimit(apiKey: any, agentId: string): Promise<{
  allowed: boolean;
  resetTime?: number;
}> {
  const window = apiKey.rate_limit?.windowMs || 60000; // 1 minute default
  const maxRequests = apiKey.rate_limit?.maxRequests || 100;
  
  const windowStart = new Date(Date.now() - window);
  
  const { count } = await supabase
    .from('api_key_usage')
    .select('*', { count: 'exact' })
    .eq('api_key_id', apiKey.key_id)
    .eq('agent_id', agentId)
    .gte('created_at', windowStart.toISOString());

  return {
    allowed: (count || 0) < maxRequests,
    resetTime: Date.now() + window
  };
}

// Update agent analytics
async function updateAgentAnalytics(agentId: string, success: boolean, executionTime: number) {
  const today = new Date().toISOString().split('T')[0];
  
  await supabase
    .from('agent_analytics')
    .upsert({
      agent_id: agentId,
      date: today,
      total_executions: 1,
      successful_executions: success ? 1 : 0,
      failed_executions: success ? 0 : 1,
      avg_execution_time_ms: executionTime
    }, {
      onConflict: 'agent_id,date',
      ignoreDuplicates: false
    });
}

// Send callback webhook
async function sendCallback(callbackUrl: string, data: any) {
  try {
    await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.error('Failed to send callback:', error);
  }
}

// Decrypt credential (placeholder - implement with your encryption)
async function decryptCredential(encryptedValue: string): Promise<string> {
  // TODO: Implement proper decryption using your encryption key
  // For now, assuming base64 encoding
  try {
    return Buffer.from(encryptedValue, 'base64').toString('utf-8');
  } catch {
    return encryptedValue; // Fallback if not encrypted
  }
}

// Estimate execution time based on agent complexity
function estimateExecutionTime(agent: any): number {
  const baseTime = 2000; // 2 seconds base
  const complexityMultiplier = agent.schema?.nodes?.length || 1;
  return Math.min(baseTime * complexityMultiplier, 30000); // Max 30 seconds
}
