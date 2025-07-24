import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const { agentId, inputData, dryRun = false, mockCredentials = {} } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        *,
        agent_credentials(*),
        agent_fields(*)
      `)
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if user is the agent creator (for testing) or has developer access
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('id', user.id)
      .single();

    const isCreator = agent.created_by === user.id;
    const isDeveloper = profile?.account_type === 'developer';

    if (!isCreator && !isDeveloper) {
      return NextResponse.json({ error: 'Access denied. Only agent creators or developers can test agents.' }, { status: 403 });
    }

    // Validate required fields and credentials
    const validationErrors: string[] = [];
    
    // Check required custom fields
    if (agent.agent_fields?.length > 0) {
      for (const field of agent.agent_fields) {
        if (field.required && (!inputData || !inputData[field.field_name])) {
          validationErrors.push(`Required field missing: ${field.field_label}`);
        }
      }
    }

    // Check required credentials (use mock if provided)
    if (agent.agent_credentials?.length > 0) {
      for (const credReq of agent.agent_credentials) {
        if (credReq.required) {
          const hasMockCred = mockCredentials[credReq.provider];
          if (!hasMockCred && !dryRun) {
            // Check if user has real credential stored
            const { data: userCred } = await supabase
              .from('credentials')
              .select('provider')
              .eq('user_id', user.id)
              .eq('provider', credReq.provider)
              .single();

            if (!userCred) {
              validationErrors.push(`Required credential missing: ${credReq.provider}`);
            }
          }
        }
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: 'Validation failed',
        validationErrors 
      }, { status: 400 });
    }

    // Create test execution record
    const { data: execution, error: executionError } = await supabase
      .from('agent_executions')
      .insert({
        user_id: user.id,
        agent_id: agentId,
        execution_type: 'test',
        status: dryRun ? 'success' : 'running',
        input_payload: inputData || {},
        executed_at: new Date().toISOString(),
        completed_at: dryRun ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (executionError) {
      console.error('Failed to create test execution record:', executionError);
      return NextResponse.json({ error: 'Failed to start test execution' }, { status: 500 });
    }

    // If dry run, just return validation success
    if (dryRun) {
      return NextResponse.json({
        testId: execution.id,
        success: true,
        message: 'Dry run validation passed',
        output: {
          message: 'This is a dry run. No actual webhook was called.',
          validatedFields: Object.keys(inputData || {}),
          requiredCredentials: agent.agent_credentials?.filter((c: any) => c.required).map((c: any) => c.provider) || [],
          mockCredentialsUsed: Object.keys(mockCredentials)
        },
        duration: 0,
        status: 'success'
      });
    }

    try {
      // Prepare test payload with mock credentials if provided
      let testHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'AgentFlow-Test/1.0',
        'X-Test-Mode': 'true'
      };

      let testBody = {
        ...inputData,
        test: true,
        agentId,
        userId: user.id,
        executionId: execution.id
      };

      // Inject mock credentials or real ones
      for (const credReq of agent.agent_credentials || []) {
        if (mockCredentials[credReq.provider]) {
          const mockValue = mockCredentials[credReq.provider];
          const formattedValue = credReq.format_template.replace('{{token}}', mockValue);
          
          if (credReq.inject_method === 'headers') {
            testHeaders[credReq.field_name] = formattedValue;
          } else if (credReq.inject_method === 'body') {
            testBody[credReq.field_name] = formattedValue;
          }
        } else if (credReq.required) {
          // Use real credential if no mock provided
          const { data: userCred } = await supabase
            .from('credentials')
            .select('encrypted_value')
            .eq('user_id', user.id)
            .eq('provider', credReq.provider)
            .single();

          if (userCred) {
            // For test mode, we'll use a placeholder instead of decrypting
            const formattedValue = credReq.format_template.replace('{{token}}', '[REDACTED_FOR_TEST]');
            
            if (credReq.inject_method === 'headers') {
              testHeaders[credReq.field_name] = formattedValue;
            } else if (credReq.inject_method === 'body') {
              testBody[credReq.field_name] = formattedValue;
            }
          }
        }
      }

      // Execute test webhook
      const startTime = Date.now();
      const response = await fetch(agent.webhook_url, {
        method: 'POST',
        headers: testHeaders,
        body: JSON.stringify(testBody),
        signal: AbortSignal.timeout(15000) // 15 second timeout for tests
      });

      const responseData = await response.json().catch(() => ({}));
      const duration = Date.now() - startTime;

      // Update execution record with results
      const { error: updateError } = await supabase
        .from('agent_executions')
        .update({
          status: response.ok ? 'success' : 'failed',
          output_data: responseData,
          error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
          duration_ms: duration,
          webhook_response_code: response.status,
          webhook_response_headers: Object.fromEntries(response.headers.entries()),
          completed_at: new Date().toISOString()
        })
        .eq('id', execution.id);

      if (updateError) {
        console.error('Failed to update test execution record:', updateError);
      }

      return NextResponse.json({
        testId: execution.id,
        success: response.ok,
        output: responseData,
        duration,
        status: response.ok ? 'success' : 'failed',
        error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
        testDetails: {
          webhookUrl: agent.webhook_url,
          requestHeaders: testHeaders,
          requestBody: testBody,
          responseCode: response.status,
          responseHeaders: Object.fromEntries(response.headers.entries())
        }
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

      console.error('Test execution failed:', error);
      return NextResponse.json({
        testId: execution.id,
        success: false,
        error: error.message,
        status: 'failed'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Agent test API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// GET endpoint to retrieve test results
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
    const testId = searchParams.get('testId');
    const agentId = searchParams.get('agentId');

    if (testId) {
      // Get specific test result
      const { data: execution, error } = await supabase
        .from('agent_executions')
        .select(`
          *,
          agents(name, description)
        `)
        .eq('id', testId)
        .eq('user_id', user.id)
        .eq('execution_type', 'test')
        .single();

      if (error || !execution) {
        return NextResponse.json({ error: 'Test execution not found' }, { status: 404 });
      }

      return NextResponse.json({
        testId: execution.id,
        agentId: execution.agent_id,
        agentName: execution.agents?.name,
        status: execution.status,
        input: execution.input_payload,
        output: execution.output_data,
        error: execution.error_message,
        duration: execution.duration_ms,
        executedAt: execution.executed_at,
        completedAt: execution.completed_at
      });

    } else if (agentId) {
      // Get all test results for an agent
      const { data: executions, error } = await supabase
        .from('agent_executions')
        .select('*')
        .eq('agent_id', agentId)
        .eq('user_id', user.id)
        .eq('execution_type', 'test')
        .order('executed_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Failed to fetch test executions:', error);
        return NextResponse.json({ error: 'Failed to fetch test executions' }, { status: 500 });
      }

      return NextResponse.json({
        testExecutions: executions || []
      });

    } else {
      return NextResponse.json({ error: 'testId or agentId parameter required' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Get test results API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
