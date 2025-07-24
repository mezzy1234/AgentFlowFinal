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
      case 'sdk_configs':
        const sdkConfigs = await getSDKConfigurations(limit);
        return NextResponse.json({ configs: sdkConfigs });

      case 'code_snippets':
        const snippets = await getCodeSnippets(limit);
        return NextResponse.json({ snippets });

      case 'api_documentation':
        const documentation = await getAPIDocumentation(limit);
        return NextResponse.json({ endpoints: documentation });

      case 'api_versions':
        const versions = await getAPIVersions();
        return NextResponse.json({ versions });

      case 'webhook_tests':
        const webhookTests = await getWebhookTests(limit);
        return NextResponse.json({ tests: webhookTests });

      case 'developer_feedback':
        const feedback = await getDeveloperFeedback(limit);
        return NextResponse.json({ feedback });

      case 'tutorials':
        const tutorials = await getTutorials();
        return NextResponse.json({ tutorials });

      case 'usage_examples':
        const examples = await getUsageExamples();
        return NextResponse.json({ examples });

      case 'sdk_analytics':
        const analytics = await getSDKAnalytics();
        return NextResponse.json({ analytics });

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Developer API Error:', error);
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
      case 'generate_sdk':
        const sdkConfig = await generateSDK(body);
        return NextResponse.json({ success: true, config: sdkConfig });

      case 'create_snippet':
        const snippet = await createCodeSnippet(body);
        return NextResponse.json({ success: true, snippet });

      case 'test_webhook':
        const webhookResult = await testWebhook(body);
        return NextResponse.json({ success: true, result: webhookResult });

      case 'submit_feedback':
        const feedbackResult = await submitFeedback(body);
        return NextResponse.json({ success: true, feedback: feedbackResult });

      case 'create_tutorial':
        const tutorial = await createTutorial(body);
        return NextResponse.json({ success: true, tutorial });

      case 'save_api_session':
        const session = await saveAPISession(body);
        return NextResponse.json({ success: true, session });

      case 'update_documentation':
        const docResult = await updateDocumentation(body);
        return NextResponse.json({ success: true, documentation: docResult });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Developer POST API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// SDK Management Functions
async function getSDKConfigurations(limit: number) {
  const { data } = await supabase
    .from('sdk_configurations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function generateSDK(sdkData: any) {
  const { data } = await supabase
    .from('sdk_configurations')
    .insert({
      user_id: sdkData.userId || 'demo-user',
      language: sdkData.language,
      package_name: sdkData.packageName,
      version: sdkData.version,
      target_platform: sdkData.platform,
      config_options: {
        includeExamples: sdkData.includeExamples,
        includeTypes: sdkData.includeTypes
      },
      generation_status: 'generating'
    })
    .select()
    .single();

  // Simulate SDK generation process
  setTimeout(async () => {
    await supabase
      .from('sdk_configurations')
      .update({
        generation_status: 'completed',
        download_url: `https://downloads.agentflow.ai/sdk/${data.id}/${sdkData.language}-sdk-${sdkData.version}.zip`
      })
      .eq('id', data.id);
  }, 3000);

  return data;
}

// Code Snippets Functions
async function getCodeSnippets(limit: number) {
  const { data } = await supabase
    .from('code_snippets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function createCodeSnippet(snippetData: any) {
  const { data } = await supabase
    .from('code_snippets')
    .insert({
      title: snippetData.title,
      description: snippetData.description,
      language: snippetData.language,
      category: snippetData.category,
      code_content: snippetData.codeContent,
      api_endpoint: snippetData.apiEndpoint,
      api_version: snippetData.apiVersion || 'v3',
      use_cases: snippetData.useCases || [],
      tags: snippetData.tags || [],
      author_id: snippetData.authorId,
      is_official: snippetData.isOfficial || false
    })
    .select()
    .single();

  return data;
}

// API Documentation Functions
async function getAPIDocumentation(limit: number) {
  const { data } = await supabase
    .from('api_documentation')
    .select('*')
    .order('endpoint_path', { ascending: true })
    .limit(limit);

  return data || [];
}

async function updateDocumentation(docData: any) {
  const { data } = await supabase
    .from('api_documentation')
    .upsert({
      endpoint_path: docData.endpointPath,
      http_method: docData.httpMethod,
      api_version: docData.apiVersion,
      title: docData.title,
      description: docData.description,
      request_schema: docData.requestSchema,
      response_schema: docData.responseSchema,
      examples: docData.examples || [],
      rate_limits: docData.rateLimits,
      authentication_required: docData.authenticationRequired,
      scopes_required: docData.scopesRequired || []
    })
    .select()
    .single();

  return data;
}

// API Versions Functions
async function getAPIVersions() {
  const { data } = await supabase
    .from('api_versions')
    .select('*')
    .order('release_date', { ascending: false });

  return data || [];
}

// Webhook Testing Functions
async function getWebhookTests(limit: number) {
  const { data } = await supabase
    .from('webhook_tests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function testWebhook(webhookData: any) {
  const { data } = await supabase
    .from('webhook_tests')
    .insert({
      user_id: webhookData.userId,
      test_name: webhookData.testName,
      webhook_url: webhookData.webhookUrl,
      payload_template: webhookData.payloadTemplate,
      headers: webhookData.headers || {},
      test_status: 'pending'
    })
    .select()
    .single();

  // Simulate webhook test execution
  setTimeout(async () => {
    const success = Math.random() > 0.2; // 80% success rate
    await supabase
      .from('webhook_tests')
      .update({
        test_status: success ? 'delivered' : 'failed',
        response_status: success ? 200 : 500,
        response_body: success ? '{"success": true}' : '{"error": "Connection timeout"}',
        response_time: Math.floor(Math.random() * 1000) + 100,
        executed_at: new Date().toISOString()
      })
      .eq('id', data.id);
  }, 2000);

  return data;
}

// Developer Feedback Functions
async function getDeveloperFeedback(limit: number) {
  const { data } = await supabase
    .from('developer_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

async function submitFeedback(feedbackData: any) {
  const { data } = await supabase
    .from('developer_feedback')
    .insert({
      user_id: feedbackData.userId,
      feedback_type: feedbackData.feedbackType,
      title: feedbackData.title,
      description: feedbackData.description,
      category: feedbackData.category,
      priority: feedbackData.priority || 'medium',
      affected_endpoint: feedbackData.affectedEndpoint,
      sdk_language: feedbackData.sdkLanguage,
      error_details: feedbackData.errorDetails,
      reproduction_steps: feedbackData.reproductionSteps,
      expected_behavior: feedbackData.expectedBehavior,
      actual_behavior: feedbackData.actualBehavior,
      environment_info: feedbackData.environmentInfo
    })
    .select()
    .single();

  return data;
}

// Tutorials Functions
async function getTutorials() {
  const { data } = await supabase
    .from('developer_tutorials')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  return data || [];
}

async function createTutorial(tutorialData: any) {
  const { data } = await supabase
    .from('developer_tutorials')
    .insert({
      title: tutorialData.title,
      slug: tutorialData.slug,
      description: tutorialData.description,
      content: tutorialData.content,
      category: tutorialData.category,
      difficulty_level: tutorialData.difficultyLevel || 'beginner',
      estimated_reading_time: tutorialData.estimatedReadingTime,
      prerequisites: tutorialData.prerequisites || [],
      tags: tutorialData.tags || [],
      code_examples: tutorialData.codeExamples || [],
      author_id: tutorialData.authorId,
      is_published: tutorialData.isPublished || false
    })
    .select()
    .single();

  return data;
}

// Usage Examples Functions
async function getUsageExamples() {
  const { data } = await supabase
    .from('api_usage_examples')
    .select('*')
    .order('view_count', { ascending: false });

  return data || [];
}

// API Session Functions
async function saveAPISession(sessionData: any) {
  const { data } = await supabase
    .from('api_explorer_sessions')
    .insert({
      user_id: sessionData.userId,
      session_name: sessionData.sessionName,
      saved_requests: sessionData.savedRequests || [],
      environment_variables: sessionData.environmentVariables || {},
      is_shared: sessionData.isShared || false,
      share_token: sessionData.isShared ? generateShareToken() : null
    })
    .select()
    .single();

  return data;
}

// SDK Analytics Functions
async function getSDKAnalytics() {
  const { data } = await supabase
    .from('sdk_analytics')
    .select('*')
    .order('downloads_total', { ascending: false });

  // Aggregate analytics data
  const totalDownloads = data?.reduce((sum, item) => sum + item.downloads_total, 0) || 0;
  const languageStats = data?.reduce((acc: any, item) => {
    acc[item.language] = (acc[item.language] || 0) + item.downloads_total;
    return acc;
  }, {}) || {};

  return {
    total_downloads: totalDownloads,
    language_breakdown: languageStats,
    recent_downloads: data?.slice(0, 10) || [],
    growth_metrics: {
      daily_average: Math.floor(totalDownloads / 30),
      weekly_growth: 15.3,
      monthly_growth: 42.7
    }
  };
}

// Utility Functions
function generateShareToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
