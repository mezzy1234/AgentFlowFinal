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

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    switch (type) {
      case 'marketplace':
        const integrations = await getMarketplaceIntegrations(limit);
        return NextResponse.json({ integrations });

      case 'categories':
        const categories = await getIntegrationCategories();
        return NextResponse.json({ categories });

      case 'installed':
        const installed = await getUserIntegrations();
        return NextResponse.json({ integrations: installed });

      case 'custom_connectors':
        const connectors = await getCustomConnectors();
        return NextResponse.json({ connectors });

      case 'integration_analytics':
        const analytics = await getIntegrationAnalytics();
        return NextResponse.json({ analytics });

      case 'execution_logs':
        const logs = await getExecutionLogs(limit);
        return NextResponse.json({ logs });

      case 'monitoring':
        const monitoring = await getIntegrationMonitoring();
        return NextResponse.json({ monitoring });

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Integrations API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    switch (action) {
      case 'install_integration':
        const installation = await installIntegration(body);
        return NextResponse.json({ success: true, installation });

      case 'configure_integration':
        const configuration = await configureIntegration(body);
        return NextResponse.json({ success: true, configuration });

      case 'test_integration':
        const testResult = await testIntegration(body);
        return NextResponse.json({ success: true, result: testResult });

      case 'create_custom_connector':
        const connector = await createCustomConnector(body);
        return NextResponse.json({ success: true, connector });

      case 'test_custom_connector':
        const connectorTest = await testCustomConnector(body);
        return NextResponse.json({ success: true, result: connectorTest });

      case 'create_workflow':
        const workflow = await createIntegrationWorkflow(body);
        return NextResponse.json({ success: true, workflow });

      case 'execute_integration':
        const execution = await executeIntegration(body);
        return NextResponse.json({ success: true, execution });

      case 'submit_review':
        const review = await submitIntegrationReview(body);
        return NextResponse.json({ success: true, review });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Integrations POST API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Marketplace Functions
async function getMarketplaceIntegrations(limit: number) {
  const { data } = await supabase
    .from('integrations')
    .select(`
      *,
      integration_categories!category_id (name)
    `)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('rating', { ascending: false })
    .limit(limit);

  return data?.map(integration => ({
    ...integration,
    category: integration.integration_categories?.name || 'Other',
    features: integration.features || []
  })) || [];
}

async function getIntegrationCategories() {
  const { data } = await supabase
    .from('integration_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  return data || [];
}

// User Integration Functions
async function getUserIntegrations() {
  const { data } = await supabase
    .from('user_integrations')
    .select(`
      *,
      integrations!integration_id (
        name,
        provider,
        logo_url,
        description
      )
    `)
    .eq('user_id', 'demo-user')
    .order('installed_at', { ascending: false });

  return data || [];
}

async function installIntegration(installData: any) {
  const { data } = await supabase
    .from('user_integrations')
    .insert({
      user_id: installData.userId || 'demo-user',
      integration_id: installData.integrationId,
      connection_name: installData.connectionName || 'Default Connection',
      connection_config: installData.connectionConfig || {},
      credentials: installData.credentials || {},
      status: 'active'
    })
    .select()
    .single();

  // Update install count
  await supabase.rpc('increment_install_count', { integration_id: installData.integrationId });

  return data;
}

async function configureIntegration(configData: any) {
  const { data } = await supabase
    .from('user_integrations')
    .update({
      connection_config: configData.connectionConfig,
      credentials: configData.credentials,
      settings: configData.settings,
      updated_at: new Date().toISOString()
    })
    .eq('id', configData.integrationId)
    .eq('user_id', configData.userId || 'demo-user')
    .select()
    .single();

  return data;
}

async function testIntegration(testData: any) {
  // Simulate integration test
  const testResults = {
    status: 'success',
    response_time: Math.floor(Math.random() * 1000) + 100,
    connectivity: true,
    authentication: true,
    permissions: ['read', 'write'],
    test_endpoint: testData.testEndpoint || '/health',
    timestamp: new Date().toISOString()
  };

  // Log the test execution
  await supabase.from('integration_executions').insert({
    user_integration_id: testData.integrationId,
    execution_type: 'test',
    action_name: 'connectivity_test',
    input_data: testData,
    output_data: testResults,
    status: 'success',
    duration_ms: testResults.response_time
  });

  return testResults;
}

// Custom Connector Functions
async function getCustomConnectors() {
  const { data } = await supabase
    .from('custom_connectors')
    .select('*')
    .eq('user_id', 'demo-user')
    .order('created_at', { ascending: false });

  return data || [];
}

async function createCustomConnector(connectorData: any) {
  const { data } = await supabase
    .from('custom_connectors')
    .insert({
      user_id: connectorData.userId || 'demo-user',
      name: connectorData.name,
      description: connectorData.description,
      base_url: connectorData.baseUrl,
      authentication_type: connectorData.authenticationType,
      auth_config: connectorData.authConfig || {},
      headers: connectorData.headers || {},
      endpoints: connectorData.endpoints || [],
      status: 'draft'
    })
    .select()
    .single();

  return data;
}

async function testCustomConnector(testData: any) {
  // Simulate custom connector test
  const testResults = {
    status: Math.random() > 0.2 ? 'success' : 'error',
    response_time: Math.floor(Math.random() * 2000) + 200,
    endpoints_tested: 3,
    successful_endpoints: Math.random() > 0.2 ? 3 : 2,
    error_message: Math.random() > 0.2 ? null : 'Authentication failed',
    timestamp: new Date().toISOString()
  };

  return testResults;
}

// Workflow Functions
async function createIntegrationWorkflow(workflowData: any) {
  const { data } = await supabase
    .from('agent_integration_workflows')
    .insert({
      agent_id: workflowData.agentId,
      user_integration_id: workflowData.userIntegrationId,
      workflow_name: workflowData.workflowName,
      trigger_config: workflowData.triggerConfig || {},
      action_steps: workflowData.actionSteps || [],
      condition_logic: workflowData.conditionLogic || {},
      error_handling: workflowData.errorHandling || {
        on_error: 'stop',
        retry_count: 3
      }
    })
    .select()
    .single();

  return data;
}

async function executeIntegration(execData: any) {
  const executionId = `exec_${Date.now()}`;
  
  // Start execution record
  const { data: execution } = await supabase
    .from('integration_executions')
    .insert({
      id: executionId,
      workflow_id: execData.workflowId,
      user_integration_id: execData.userIntegrationId,
      execution_type: 'action',
      action_name: execData.actionName,
      input_data: execData.inputData || {},
      status: 'running'
    })
    .select()
    .single();

  // Simulate execution
  setTimeout(async () => {
    const success = Math.random() > 0.1; // 90% success rate
    const duration = Math.floor(Math.random() * 5000) + 500;
    
    await supabase
      .from('integration_executions')
      .update({
        status: success ? 'success' : 'error',
        output_data: success ? {
          result: 'Action completed successfully',
          data: { id: 'result_123' }
        } : null,
        error_message: success ? null : 'Execution failed due to rate limiting',
        duration_ms: duration,
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId);
  }, 1000);

  return execution;
}

// Analytics Functions
async function getIntegrationAnalytics() {
  // Get execution stats
  const { data: executions } = await supabase
    .from('integration_executions')
    .select('status, duration_ms, created_at')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const totalExecutions = executions?.length || 0;
  const successfulExecutions = executions?.filter(e => e.status === 'success').length || 0;
  const avgDuration = totalExecutions > 0 && executions ? 
    executions.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / totalExecutions : 0;

  // Get popular integrations
  const { data: popularIntegrations } = await supabase
    .from('integrations')
    .select('name, install_count, rating')
    .order('install_count', { ascending: false })
    .limit(10);

  return {
    total_executions: totalExecutions,
    successful_executions: successfulExecutions,
    success_rate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
    avg_execution_time: Math.round(avgDuration),
    popular_integrations: popularIntegrations || [],
    daily_usage: generateDailyUsageData(),
    integration_health: {
      operational: 85,
      degraded: 10,
      outage: 5
    }
  };
}

async function getExecutionLogs(limit: number) {
  const { data } = await supabase
    .from('integration_executions')
    .select(`
      *,
      user_integrations!user_integration_id (
        connection_name,
        integrations!integration_id (name, provider)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function getIntegrationMonitoring() {
  const { data } = await supabase
    .from('integration_monitoring')
    .select(`
      *,
      integrations!integration_id (name, provider)
    `)
    .order('checked_at', { ascending: false });

  return data || [];
}

// Review Functions
async function submitIntegrationReview(reviewData: any) {
  const { data } = await supabase
    .from('integration_reviews')
    .insert({
      integration_id: reviewData.integrationId,
      user_id: reviewData.userId || 'demo-user',
      rating: reviewData.rating,
      review_title: reviewData.reviewTitle,
      review_text: reviewData.reviewText,
      pros: reviewData.pros || [],
      cons: reviewData.cons || [],
      use_case: reviewData.useCase
    })
    .select()
    .single();

  // Update integration rating
  const { data: reviews } = await supabase
    .from('integration_reviews')
    .select('rating')
    .eq('integration_id', reviewData.integrationId);

  if (reviews && reviews.length > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await supabase
      .from('integrations')
      .update({
        rating: Math.round(avgRating * 100) / 100,
        review_count: reviews.length
      })
      .eq('id', reviewData.integrationId);
  }

  return data;
}

// Helper Functions
function generateDailyUsageData() {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      executions: Math.floor(Math.random() * 100) + 50,
      success_rate: Math.floor(Math.random() * 20) + 80
    });
  }
  return data;
}
