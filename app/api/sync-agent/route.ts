import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AgentSyncData {
  name: string;
  description?: string;
  webhook_url: string;
  schema: any;
  category?: string;
  tags?: string[];
  price?: number;
  credentials_required?: CredentialRequirement[];
  logo_url?: string;
  documentation?: string;
}

interface CredentialRequirement {
  service: string;
  type: 'oauth' | 'api_key' | 'bearer' | 'basic_auth';
  scopes?: string[];
  required: boolean;
}

// Sync agent from various sources
export async function POST(request: NextRequest) {
  try {
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
    const { syncType, source, agentData } = body;

    let agentConfig: AgentSyncData;

    switch (syncType) {
      case 'github_gist':
        agentConfig = await syncFromGitHub(source);
        break;
      case 'n8n_webhook':
        agentConfig = await syncFromN8N(source);
        break;
      case 'direct_json':
        agentConfig = validateDirectJSON(agentData);
        break;
      default:
        return NextResponse.json({ error: 'Invalid sync type' }, { status: 400 });
    }

    // Validate agent configuration
    const validation = validateAgentConfig(agentConfig);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'Invalid agent configuration', 
        details: validation.errors 
      }, { status: 400 });
    }

    // Save agent to database
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        name: agentConfig.name,
        description: agentConfig.description || '',
        webhook_url: agentConfig.webhook_url,
        schema: agentConfig.schema,
        category: agentConfig.category || 'automation',
        tags: agentConfig.tags || [],
        price: agentConfig.price || 0,
        logo_url: agentConfig.logo_url,
        documentation: agentConfig.documentation,
        created_by: user.id,
        developer_id: user.id,
        status: 'draft',
        is_public: false
      })
      .select()
      .single();

    if (agentError) {
      console.error('Failed to save agent:', agentError);
      return NextResponse.json({ error: 'Failed to save agent' }, { status: 500 });
    }

    // Save credential requirements
    if (agentConfig.credentials_required?.length) {
      const credentialInserts = agentConfig.credentials_required.map(cred => ({
        agent_id: agent.id,
        service: cred.service,
        type: cred.type,
        scopes: cred.scopes || [],
        required: cred.required
      }));

      await supabase
        .from('agent_credentials')
        .insert(credentialInserts);
    }

    // Test webhook connectivity
    const webhookTest = await testWebhookConnectivity(agentConfig.webhook_url);

    return NextResponse.json({
      success: true,
      agent,
      webhookTest,
      message: 'Agent synced successfully'
    });

  } catch (error) {
    console.error('Agent sync error:', error);
    return NextResponse.json({ 
      error: 'Failed to sync agent', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

// GET endpoint for agent sync status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const syncId = searchParams.get('syncId');

    if (agentId) {
      const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      const { data: lastSync } = await supabase
        .from('agent_sync_logs')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return NextResponse.json({
        agent,
        lastSync,
        status: agent?.status || 'unknown'
      });
    }

    return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });

  } catch (error) {
    console.error('Get sync status error:', error);
    return NextResponse.json({ error: 'Failed to get sync status' }, { status: 500 });
  }
}

// Sync from GitHub Gist
async function syncFromGitHub(gistUrl: string): Promise<AgentSyncData> {
  try {
    const gistId = extractGistId(gistUrl);
    const response = await fetch(`https://api.github.com/gists/${gistId}`);
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const gist = await response.json();
    const files = Object.values(gist.files) as any[];
    
    // Find the agent configuration file
    const configFile = files.find(file => 
      file.filename.includes('agent') || 
      file.filename.includes('workflow') ||
      file.filename.endsWith('.json')
    );

    if (!configFile) {
      throw new Error('No agent configuration found in gist');
    }

    const agentData = JSON.parse(configFile.content);
    return transformGitHubAgent(agentData);

  } catch (error) {
    throw new Error(`Failed to sync from GitHub: ${(error as Error).message}`);
  }
}

// Sync from N8N webhook
async function syncFromN8N(webhookUrl: string): Promise<AgentSyncData> {
  try {
    // Extract n8n workflow info from webhook URL
    const workflowId = extractN8NWorkflowId(webhookUrl);
    
    // Test webhook connectivity
    const testResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true, source: 'agentflow_sync' })
    });

    if (!testResponse.ok) {
      throw new Error(`N8N webhook test failed: ${testResponse.status}`);
    }

    // Create agent config from webhook
    const agentConfig: AgentSyncData = {
      name: `N8N Workflow ${workflowId}`,
      description: 'Synced from N8N workflow',
      webhook_url: webhookUrl,
      schema: {
        type: 'n8n_workflow',
        webhook_url: webhookUrl,
        workflow_id: workflowId
      },
      category: 'automation',
      tags: ['n8n', 'workflow', 'automation']
    };

    return agentConfig;

  } catch (error) {
    throw new Error(`Failed to sync from N8N: ${(error as Error).message}`);
  }
}

// Validate direct JSON input
function validateDirectJSON(agentData: any): AgentSyncData {
  if (!agentData || typeof agentData !== 'object') {
    throw new Error('Invalid JSON data');
  }

  if (!agentData.name || !agentData.webhook_url) {
    throw new Error('Name and webhook_url are required');
  }

  return {
    name: agentData.name,
    description: agentData.description,
    webhook_url: agentData.webhook_url,
    schema: agentData.schema || agentData,
    category: agentData.category,
    tags: agentData.tags,
    price: agentData.price,
    credentials_required: agentData.credentials_required,
    logo_url: agentData.logo_url,
    documentation: agentData.documentation
  };
}

// Validate agent configuration
function validateAgentConfig(config: AgentSyncData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name?.trim()) {
    errors.push('Agent name is required');
  }

  if (!config.webhook_url?.trim()) {
    errors.push('Webhook URL is required');
  } else if (!isValidUrl(config.webhook_url)) {
    errors.push('Invalid webhook URL format');
  }

  if (config.price && (isNaN(config.price) || config.price < 0)) {
    errors.push('Price must be a non-negative number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Test webhook connectivity
async function testWebhookConnectivity(webhookUrl: string): Promise<{
  success: boolean;
  responseTime: number;
  status?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        test: true, 
        source: 'agentflow_connectivity_test',
        timestamp: new Date().toISOString()
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    return {
      success: response.ok,
      responseTime,
      status: response.status
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      error: (error as Error).message
    };
  }
}

// Helper functions
function extractGistId(gistUrl: string): string {
  const match = gistUrl.match(/gist\.github\.com\/[^\/]+\/([a-f0-9]+)/);
  if (!match) {
    throw new Error('Invalid GitHub Gist URL');
  }
  return match[1];
}

function extractN8NWorkflowId(webhookUrl: string): string {
  const match = webhookUrl.match(/webhook\/([a-f0-9-]+)/);
  return match ? match[1] : 'unknown';
}

function transformGitHubAgent(gistData: any): AgentSyncData {
  return {
    name: gistData.name || 'GitHub Agent',
    description: gistData.description || 'Synced from GitHub Gist',
    webhook_url: gistData.webhook_url || gistData.webhookUrl,
    schema: gistData.schema || gistData,
    category: gistData.category || 'automation',
    tags: gistData.tags || ['github', 'synced'],
    price: gistData.price || 0,
    credentials_required: gistData.credentials_required || gistData.credentialsRequired,
    logo_url: gistData.logo_url || gistData.logoUrl,
    documentation: gistData.documentation
  };
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}
