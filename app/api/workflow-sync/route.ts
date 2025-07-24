import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface WorkflowSyncConfig {
  agent_id: string
  developer_id: string
  sync_type: 'webhook' | 'github_gist' | 'n8n_api'
  sync_url: string
  sync_interval_minutes: number
  auth_header?: string
  auto_update: boolean
}

interface WorkflowData {
  workflow_definition: any
  webhook_url?: string
  required_integrations?: string[]
  metadata?: any
  version: string
  last_modified: string
}

class WorkflowSyncManager {
  async setupSync(config: WorkflowSyncConfig) {
    try {
      // Validate the sync URL first
      const validationResult = await this.validateSyncSource(config)
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error
        }
      }

      // Store sync configuration
      const { data, error } = await supabase
        .from('agent_workflow_sync')
        .upsert({
          agent_id: config.agent_id,
          developer_id: config.developer_id,
          sync_type: config.sync_type,
          sync_url: config.sync_url,
          sync_interval_minutes: config.sync_interval_minutes,
          auth_header: config.auth_header,
          auto_update: config.auto_update,
          status: 'active',
          last_sync_at: null,
          next_sync_at: new Date(Date.now() + config.sync_interval_minutes * 60000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()

      if (error) throw error

      // Perform initial sync
      const initialSync = await this.syncWorkflow(config.agent_id)

      return {
        success: true,
        sync_config: data[0],
        initial_sync: initialSync,
        message: 'Workflow sync configured successfully'
      }
    } catch (error) {
      console.error('Workflow sync setup error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async validateSyncSource(config: WorkflowSyncConfig) {
    try {
      const headers: any = {
        'User-Agent': 'AgentFlow-Sync/1.0'
      }

      if (config.auth_header) {
        headers['Authorization'] = config.auth_header
      }

      const response = await fetch(config.sync_url, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        return {
          valid: false,
          error: `Unable to access sync URL: ${response.status} ${response.statusText}`
        }
      }

      // Try to parse the response
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        return {
          valid: false,
          error: 'Sync URL must return JSON content'
        }
      }

      const data = await response.json()
      
      // Basic validation for workflow structure
      if (config.sync_type === 'n8n_api' && !data.nodes) {
        return {
          valid: false,
          error: 'Invalid n8n workflow format - missing nodes'
        }
      }

      return { valid: true }
    } catch (error) {
      return {
        valid: false,
        error: `Sync validation failed: ${(error as Error).message}`
      }
    }
  }

  async syncWorkflow(agentId: string) {
    try {
      // Get sync configuration
      const { data: syncConfig, error: configError } = await supabase
        .from('agent_workflow_sync')
        .select('*')
        .eq('agent_id', agentId)
        .eq('status', 'active')
        .single()

      if (configError || !syncConfig) {
        return {
          success: false,
          error: 'Sync configuration not found'
        }
      }

      // Fetch latest workflow data
      const workflowData = await this.fetchWorkflowData(syncConfig)
      if (!workflowData.success) {
        return workflowData
      }

      // Get current agent data for comparison
      const { data: currentAgent } = await supabase
        .from('agents')
        .select('metadata, webhook_url, required_integrations, workflow_version')
        .eq('id', agentId)
        .single()

      // Check if workflow has changed
      const hasChanged = this.hasWorkflowChanged(currentAgent, workflowData.data!)
      
      if (!hasChanged && !syncConfig.force_update) {
        // Update sync timestamp but don't modify agent
        await this.updateSyncStatus(agentId, 'no_changes', null)
        return {
          success: true,
          changed: false,
          message: 'No changes detected'
        }
      }

      // Update agent with new workflow data
      const updateResult = await this.updateAgentWorkflow(agentId, workflowData.data!)
      
      if (updateResult.success) {
        await this.updateSyncStatus(agentId, 'success', null)
        
        // Log the sync event
        await this.logSyncEvent(agentId, 'workflow_updated', {
          old_version: currentAgent?.workflow_version,
          new_version: workflowData.data!.version,
          changes_detected: hasChanged
        })
      } else {
        await this.updateSyncStatus(agentId, 'error', updateResult.error || null)
      }

      return updateResult
    } catch (error) {
      console.error('Workflow sync error:', error)
      await this.updateSyncStatus(agentId, 'error', (error as Error).message)
      
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async fetchWorkflowData(syncConfig: any): Promise<{ success: boolean; data?: WorkflowData; error?: string }> {
    try {
      const headers: any = {
        'User-Agent': 'AgentFlow-Sync/1.0'
      }

      if (syncConfig.auth_header) {
        headers['Authorization'] = syncConfig.auth_header
      }

      const response = await fetch(syncConfig.sync_url, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status} ${response.statusText}`)
      }

      const rawData = await response.json()

      // Transform based on sync type
      let workflowData: WorkflowData

      switch (syncConfig.sync_type) {
        case 'n8n_api':
          workflowData = this.transformN8nWorkflow(rawData)
          break
        case 'github_gist':
          workflowData = this.transformGithubGist(rawData)
          break
        case 'webhook':
          workflowData = this.transformWebhookResponse(rawData)
          break
        default:
          throw new Error(`Unsupported sync type: ${syncConfig.sync_type}`)
      }

      return { success: true, data: workflowData }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  transformN8nWorkflow(n8nData: any): WorkflowData {
    // Extract webhook URL from n8n workflow
    const webhookNode = n8nData.nodes?.find((node: any) => node.type === 'n8n-nodes-base.webhook')
    const webhookUrl = webhookNode?.webhookId ? `https://your-n8n-instance.com/webhook/${webhookNode.webhookId}` : undefined

    // Extract required integrations from nodes
    const requiredIntegrations = this.extractRequiredIntegrationsFromN8n(n8nData.nodes || [])

    return {
      workflow_definition: n8nData,
      webhook_url: webhookUrl,
      required_integrations: requiredIntegrations,
      metadata: {
        workflow_name: n8nData.name,
        description: n8nData.description || '',
        node_count: n8nData.nodes?.length || 0,
        sync_source: 'n8n'
      },
      version: n8nData.versionId?.toString() || Date.now().toString(),
      last_modified: n8nData.updatedAt || new Date().toISOString()
    }
  }

  transformGithubGist(gistData: any): WorkflowData {
    // Assume the gist contains a workflow.json file
    const workflowFile = gistData.files['workflow.json'] || gistData.files[Object.keys(gistData.files)[0]]
    const workflow = JSON.parse(workflowFile.content)

    return {
      workflow_definition: workflow,
      webhook_url: workflow.webhook_url,
      required_integrations: workflow.required_integrations || [],
      metadata: {
        gist_id: gistData.id,
        description: gistData.description,
        sync_source: 'github_gist'
      },
      version: gistData.history[0]?.version || Date.now().toString(),
      last_modified: gistData.updated_at
    }
  }

  transformWebhookResponse(webhookData: any): WorkflowData {
    return {
      workflow_definition: webhookData.workflow || webhookData,
      webhook_url: webhookData.webhook_url,
      required_integrations: webhookData.required_integrations || [],
      metadata: {
        sync_source: 'webhook',
        ...webhookData.metadata
      },
      version: webhookData.version || Date.now().toString(),
      last_modified: webhookData.last_modified || new Date().toISOString()
    }
  }

  extractRequiredIntegrationsFromN8n(nodes: any[]): string[] {
    const integrations = new Set<string>()
    
    nodes.forEach(node => {
      const nodeType = node.type || ''
      
      if (nodeType.includes('slack')) integrations.add('slack')
      if (nodeType.includes('google')) integrations.add('google')
      if (nodeType.includes('notion')) integrations.add('notion')
      if (nodeType.includes('airtable')) integrations.add('airtable')
      if (nodeType.includes('hubspot')) integrations.add('hubspot')
      if (nodeType.includes('trello')) integrations.add('trello')
      if (nodeType.includes('discord')) integrations.add('discord')
    })

    return Array.from(integrations)
  }

  hasWorkflowChanged(currentAgent: any, newWorkflow: WorkflowData): boolean {
    if (!currentAgent) return true
    
    // Compare versions
    if (currentAgent.workflow_version !== newWorkflow.version) return true
    
    // Compare webhook URLs
    if (currentAgent.webhook_url !== newWorkflow.webhook_url) return true
    
    // Compare required integrations
    const currentIntegrations = currentAgent.required_integrations || []
    const newIntegrations = newWorkflow.required_integrations || []
    
    if (JSON.stringify(currentIntegrations.sort()) !== JSON.stringify(newIntegrations.sort())) {
      return true
    }

    return false
  }

  async updateAgentWorkflow(agentId: string, workflowData: WorkflowData) {
    try {
      const { error } = await supabase
        .from('agents')
        .update({
          metadata: {
            ...workflowData.metadata,
            workflow_definition: workflowData.workflow_definition
          },
          webhook_url: workflowData.webhook_url,
          required_integrations: workflowData.required_integrations,
          workflow_version: workflowData.version,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId)

      if (error) throw error

      return {
        success: true,
        message: 'Agent workflow updated successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async updateSyncStatus(agentId: string, status: string, error: string | null) {
    const nextSyncInterval = 10 // minutes - get from config
    
    await supabase
      .from('agent_workflow_sync')
      .update({
        last_sync_at: new Date().toISOString(),
        next_sync_at: new Date(Date.now() + nextSyncInterval * 60000).toISOString(),
        last_sync_status: status,
        last_sync_error: error,
        updated_at: new Date().toISOString()
      })
      .eq('agent_id', agentId)
  }

  async logSyncEvent(agentId: string, eventType: string, metadata: any) {
    await supabase
      .from('agent_run_logs')
      .insert({
        agent_id: agentId,
        user_id: 'system',
        execution_id: `sync_${Date.now()}_${agentId}`,
        status: 'info',
        input_data: { event_type: eventType, metadata },
        output_data: null,
        execution_time_ms: 0,
        created_at: new Date().toISOString()
      })
  }

  async processScheduledSyncs() {
    try {
      // Get all agents that need syncing
      const { data: syncConfigs } = await supabase
        .from('agent_workflow_sync')
        .select('agent_id')
        .eq('status', 'active')
        .eq('auto_update', true)
        .lte('next_sync_at', new Date().toISOString())

      if (!syncConfigs?.length) {
        return { processed: 0, message: 'No syncs due' }
      }

      const results = []
      for (const config of syncConfigs) {
        const result = await this.syncWorkflow(config.agent_id)
        results.push({ agent_id: config.agent_id, result })
      }

      return {
        processed: results.length,
        results: results
      }
    } catch (error) {
      console.error('Scheduled sync processing error:', error)
      return { error: (error as Error).message }
    }
  }
}

const syncManager = new WorkflowSyncManager()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'setup_sync':
        const setupResult = await syncManager.setupSync(body.config)
        return NextResponse.json(setupResult)

      case 'sync_now':
        const syncResult = await syncManager.syncWorkflow(body.agent_id)
        return NextResponse.json(syncResult)

      case 'process_scheduled':
        const processResult = await syncManager.processScheduledSyncs()
        return NextResponse.json(processResult)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Workflow sync POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')

    if (!agentId) {
      return NextResponse.json({ error: 'Missing agent_id' }, { status: 400 })
    }

    const { data: syncConfig } = await supabase
      .from('agent_workflow_sync')
      .select('*')
      .eq('agent_id', agentId)
      .single()

    return NextResponse.json({ sync_config: syncConfig })
  } catch (error) {
    console.error('Workflow sync GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
