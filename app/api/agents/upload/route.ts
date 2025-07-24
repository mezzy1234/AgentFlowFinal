import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// n8n webhook integration for developer uploads
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

    // Check if user has developer access
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('id', user.id)
      .single();

    if (profile?.account_type !== 'developer') {
      return NextResponse.json({ error: 'Developer access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      agentData,
      n8nWorkflowId,
      testPayload,
      publishImmediately = false
    } = body;

    // Validate agent data structure
    const {
      name,
      description,
      category,
      tags,
      pricingTier,
      priceCents,
      setupInstructions,
      acceptsFiles,
      requiresCustomInputs,
      requiredCredentials,
      customFields
    } = agentData;

    if (!name || !description || !category) {
      return NextResponse.json({ 
        error: 'Agent name, description, and category are required' 
      }, { status: 400 });
    }

    // Generate webhook URL for n8n integration
    const webhookUrl = n8nWorkflowId 
      ? `${process.env.N8N_WEBHOOK_BASE_URL}/webhook/${n8nWorkflowId}`
      : `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/agent/${user.id}`;

    // Create the agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        name,
        description,
        webhook_url: webhookUrl,
        created_by: user.id,
        pricing_tier: pricingTier || 'free',
        price_cents: priceCents || 0,
        category,
        tags: tags || [],
        setup_instructions: setupInstructions,
        accepts_files: acceptsFiles || false,
        requires_custom_inputs: requiresCustomInputs || false,
        status: publishImmediately ? 'active' : 'draft'
      })
      .select()
      .single();

    if (agentError) {
      console.error('Failed to create agent:', agentError);
      return NextResponse.json({ 
        error: 'Failed to create agent' 
      }, { status: 500 });
    }

    // Create required credentials if specified
    if (requiredCredentials?.length > 0) {
      const credentialInserts = requiredCredentials.map((cred: any) => ({
        agent_id: agent.id,
        provider: cred.provider,
        credential_type: cred.type || 'oauth',
        required: cred.required !== false,
        inject_method: cred.injectMethod || 'headers',
        field_name: cred.fieldName || 'Authorization',
        format_template: cred.formatTemplate || 'Bearer {{token}}'
      }));

      const { error: credsError } = await supabase
        .from('agent_credentials')
        .insert(credentialInserts);

      if (credsError) {
        console.error('Failed to create agent credentials:', credsError);
      }
    }

    // Create custom fields if specified
    if (customFields?.length > 0) {
      const fieldInserts = customFields.map((field: any, index: number) => ({
        agent_id: agent.id,
        field_name: field.name,
        field_label: field.label,
        field_type: field.type || 'text',
        field_options: field.options || null,
        required: field.required || false,
        placeholder: field.placeholder,
        help_text: field.helpText,
        order_index: index
      }));

      const { error: fieldsError } = await supabase
        .from('agent_fields')
        .insert(fieldInserts);

      if (fieldsError) {
        console.error('Failed to create agent fields:', fieldsError);
      }
    }

    // Test the webhook if test payload provided
    let testResult = null;
    if (testPayload && webhookUrl) {
      try {
        const testResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AgentFlow-Test/1.0'
          },
          body: JSON.stringify({
            test: true,
            agentId: agent.id,
            userId: user.id,
            payload: testPayload
          }),
          signal: AbortSignal.timeout(10000) // 10 second timeout for test
        });

        testResult = {
          success: testResponse.ok,
          status: testResponse.status,
          statusText: testResponse.statusText,
          responseData: await testResponse.json().catch(() => ({}))
        };

      } catch (error: any) {
        testResult = {
          success: false,
          error: error.message
        };
      }
    }

    // Send notification to n8n webhook for developer alerts
    if (process.env.N8N_DEVELOPER_WEBHOOK_URL) {
      try {
        await fetch(process.env.N8N_DEVELOPER_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'agent_uploaded',
            agentId: agent.id,
            agentName: agent.name,
            developerId: user.id,
            status: agent.status,
            testResult,
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Failed to send n8n notification:', error);
      }
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        webhookUrl: agent.webhook_url,
        createdAt: agent.created_at
      },
      testResult,
      message: publishImmediately 
        ? 'Agent created and published successfully'
        : 'Agent created in draft mode. Use the dashboard to publish when ready.'
    });

  } catch (error: any) {
    console.error('Developer upload API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// GET endpoint to get developer's upload history and stats
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

    // Check if user has developer access
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('id', user.id)
      .single();

    if (profile?.account_type !== 'developer') {
      return NextResponse.json({ error: 'Developer access required' }, { status: 403 });
    }

    // Get developer's agents with analytics
    const { data: agents, error } = await supabase
      .from('agents')
      .select(`
        *,
        agent_credentials(provider, required),
        agent_fields(field_name, field_label, field_type, required),
        agent_analytics(
          date,
          total_runs,
          successful_runs,
          failed_runs,
          unique_users,
          revenue_cents
        )
      `)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch developer agents:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch agents' 
      }, { status: 500 });
    }

    // Calculate summary stats
    const totalAgents = agents?.length || 0;
    const activeAgents = agents?.filter(a => a.status === 'active').length || 0;
    const draftAgents = agents?.filter(a => a.status === 'draft').length || 0;
    
    const totalRuns = agents?.reduce((sum, agent) => sum + (agent.total_runs || 0), 0) || 0;
    const avgSuccessRate = agents?.length > 0 
      ? agents.reduce((sum, agent) => sum + (agent.success_rate || 0), 0) / agents.length 
      : 0;

    const totalRevenue = agents?.reduce((sum, agent) => {
      const agentRevenue = agent.agent_analytics?.reduce((aSum: number, analytic: any) => 
        aSum + (analytic.revenue_cents || 0), 0) || 0;
      return sum + agentRevenue;
    }, 0) || 0;

    return NextResponse.json({
      agents: agents || [],
      summary: {
        totalAgents,
        activeAgents,
        draftAgents,
        totalRuns,
        avgSuccessRate: Math.round(avgSuccessRate * 100) / 100,
        totalRevenueCents: totalRevenue
      }
    });

  } catch (error: any) {
    console.error('Developer upload history API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
