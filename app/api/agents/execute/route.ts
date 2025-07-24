import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key!!';

// Decrypt credential helper
function decryptCredential(encryptedData: string, key: string): string {
  try {
    const [ivHex, encryptedHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt credential:', error);
    throw new Error('Invalid credential data');
  }
}

// Inject credentials into webhook payload
async function injectCredentials(
  supabase: any,
  userId: string,
  agentId: string,
  payload: any
): Promise<{ headers: Record<string, string>; body: any; query: Record<string, string> }> {
  // Get required credentials for this agent
  const { data: agentCreds } = await supabase
    .from('agent_credentials')
    .select('*')
    .eq('agent_id', agentId);

  // Get user's stored credentials
  const { data: userCreds } = await supabase
    .from('credentials')
    .select('*')
    .eq('user_id', userId);

  const injectedHeaders: Record<string, string> = {};
  const injectedQuery: Record<string, string> = {};
  let injectedBody = { ...payload };

  for (const agentCred of agentCreds || []) {
    // Find matching user credential
    const userCred = userCreds?.find((c: any) => c.provider === agentCred.provider);
    
    if (!userCred && agentCred.required) {
      throw new Error(`Missing required credential: ${agentCred.provider}`);
    }

    if (userCred) {
      // Decrypt the credential
      const decryptedValue = decryptCredential(userCred.encrypted_value, ENCRYPTION_KEY);
      
      // Format the credential using the template
      const formattedValue = agentCred.format_template.replace('{{token}}', decryptedValue);

      // Inject based on method
      if (agentCred.inject_method === 'headers') {
        injectedHeaders[agentCred.field_name] = formattedValue;
      } else if (agentCred.inject_method === 'query') {
        injectedQuery[agentCred.field_name] = formattedValue;
      } else if (agentCred.inject_method === 'body') {
        injectedBody[agentCred.field_name] = formattedValue;
      }
    }
  }

  return {
    headers: injectedHeaders,
    body: injectedBody,
    query: injectedQuery
  };
}

// Main webhook execution function
async function executeWebhook(
  webhookUrl: string,
  headers: Record<string, string>,
  body: any,
  query: Record<string, string>
): Promise<{
  success: boolean;
  responseCode: number;
  responseHeaders: Record<string, string>;
  responseData: any;
  duration: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // Build query string
    const queryString = new URLSearchParams(query).toString();
    const fullUrl = queryString ? `${webhookUrl}?${queryString}` : webhookUrl;

    // Execute webhook
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AgentFlow/1.0',
        ...headers
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    const responseData = await response.json().catch(() => ({}));
    const duration = Date.now() - startTime;

    return {
      success: response.ok,
      responseCode: response.status,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseData,
      duration,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      responseCode: 0,
      responseHeaders: {},
      responseData: null,
      duration,
      error: error.message || 'Unknown error occurred'
    };
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { agentId, inputData, executionType = 'manual', testMode = false } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.status !== 'active') {
      return NextResponse.json({ error: 'Agent is not active' }, { status: 400 });
    }

    // Check if user has this agent installed (unless it's a test)
    if (!testMode) {
      const { data: userAgent } = await supabase
        .from('user_agents')
        .select('*')
        .eq('user_id', user.id)
        .eq('agent_id', agentId)
        .single();

      if (!userAgent) {
        return NextResponse.json({ error: 'Agent not installed' }, { status: 403 });
      }
    }

    // Create execution record
    const { data: execution, error: executionError } = await supabase
      .from('agent_executions')
      .insert({
        user_id: user.id,
        agent_id: agentId,
        execution_type: testMode ? 'test' : executionType,
        status: 'running',
        input_payload: inputData || {},
        executed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (executionError) {
      console.error('Failed to create execution record:', executionError);
      return NextResponse.json({ error: 'Failed to start execution' }, { status: 500 });
    }

    try {
      // Inject credentials into webhook payload
      const { headers, body: webhookBody, query } = await injectCredentials(
        supabase,
        user.id,
        agentId,
        inputData || {}
      );

      // Execute the webhook
      const result = await executeWebhook(
        agent.webhook_url,
        headers,
        webhookBody,
        query
      );

      // Update execution record with results
      const { error: updateError } = await supabase
        .from('agent_executions')
        .update({
          status: result.success ? 'success' : 'failed',
          output_data: result.responseData,
          error_message: result.error,
          duration_ms: result.duration,
          webhook_response_code: result.responseCode,
          webhook_response_headers: result.responseHeaders,
          completed_at: new Date().toISOString()
        })
        .eq('id', execution.id);

      if (updateError) {
        console.error('Failed to update execution record:', updateError);
      }

      // Return execution results
      return NextResponse.json({
        executionId: execution.id,
        success: result.success,
        output: result.responseData,
        duration: result.duration,
        status: result.success ? 'success' : 'failed',
        error: result.error
      });

    } catch (error: any) {
      // Update execution record with error
      await supabase
        .from('agent_executions')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', execution.id);

      console.error('Agent execution failed:', error);
      return NextResponse.json({
        executionId: execution.id,
        success: false,
        error: error.message,
        status: 'failed'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Agent execution API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// GET endpoint to check execution status
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
    const executionId = searchParams.get('executionId');

    if (!executionId) {
      return NextResponse.json({ error: 'Execution ID is required' }, { status: 400 });
    }

    // Get execution details
    const { data: execution, error } = await supabase
      .from('agent_executions')
      .select(`
        *,
        agents(name, description)
      `)
      .eq('id', executionId)
      .eq('user_id', user.id)
      .single();

    if (error || !execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: execution.id,
      agentId: execution.agent_id,
      agentName: execution.agents?.name,
      status: execution.status,
      executionType: execution.execution_type,
      input: execution.input_payload,
      output: execution.output_data,
      error: execution.error_message,
      duration: execution.duration_ms,
      executedAt: execution.executed_at,
      completedAt: execution.completed_at
    });

  } catch (error: any) {
    console.error('Get execution status error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
