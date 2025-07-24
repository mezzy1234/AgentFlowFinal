import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PublishRequest {
  agent_id: string
  developer_id: string
  publish_to_marketplace: boolean
  test_webhook_url?: string
  required_integrations: string[]
  pricing_model: 'free' | 'pay_per_use' | 'subscription'
  price_cents?: number
  description: string
  tags: string[]
}

class AgentDeploymentFinalizer {
  async validateAgentForPublishing(agentId: string, developerId: string) {
    const validationResults = {
      valid_webhook: false,
      integrations_connected: false,
      required_credentials_defined: false,
      test_execution_successful: false,
      metadata_complete: false,
      errors: [] as string[]
    }

    try {
      // Get agent details
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .eq('developer_id', developerId)
        .single()

      if (error || !agent) {
        validationResults.errors.push('Agent not found or access denied')
        return validationResults
      }

      // Check webhook URL
      if (agent.webhook_url && this.isValidUrl(agent.webhook_url)) {
        validationResults.valid_webhook = true
      } else {
        validationResults.errors.push('Valid webhook URL is required')
      }

      // Check metadata completeness
      if (agent.name && agent.description && agent.metadata) {
        validationResults.metadata_complete = true
      } else {
        validationResults.errors.push('Agent name, description, and metadata are required')
      }

      // Check required integrations
      const requiredIntegrations = agent.required_integrations || []
      if (requiredIntegrations.length > 0) {
        const { data: integrations } = await supabase
          .from('oauth_integrations')
          .select('service_name')
          .in('service_name', requiredIntegrations)

        if (integrations && integrations.length === requiredIntegrations.length) {
          validationResults.integrations_connected = true
          validationResults.required_credentials_defined = true
        } else {
          validationResults.errors.push('Some required integrations are not properly configured')
        }
      } else {
        validationResults.integrations_connected = true
        validationResults.required_credentials_defined = true
      }

      return validationResults
    } catch (error) {
      validationResults.errors.push('Validation failed: ' + (error as Error).message)
      return validationResults
    }
  }

  async testAgentExecution(agentId: string, developerId: string, testPayload?: any) {
    try {
      // Get agent
      const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .eq('developer_id', developerId)
        .single()

      if (!agent) {
        throw new Error('Agent not found')
      }

      // Create test execution
      const testPayloadData = testPayload || { test: true, timestamp: new Date().toISOString() }
      
      const { data: testExecution, error } = await supabase
        .from('agent_execution_queue')
        .insert({
          agent_id: agentId,
          user_id: developerId,
          status: 'pending',
          priority: 10, // High priority for tests
          scheduled_at: new Date().toISOString(),
          payload: testPayloadData,
          retry_count: 0,
          max_retries: 1,
          is_test: true
        })
        .select()
        .single()

      if (error) throw error

      // Wait for execution to complete (with timeout)
      let attempts = 0
      const maxAttempts = 30 // 30 seconds
      
      while (attempts < maxAttempts) {
        const { data: execution } = await supabase
          .from('agent_execution_queue')
          .select('status, result, last_error')
          .eq('id', testExecution.id)
          .single()

        if (execution?.status === 'completed') {
          return {
            success: true,
            result: execution.result,
            message: 'Test execution completed successfully'
          }
        } else if (execution?.status === 'failed') {
          return {
            success: false,
            error: execution.last_error,
            message: 'Test execution failed'
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
      }

      return {
        success: false,
        error: 'Test execution timed out',
        message: 'Test execution did not complete within 30 seconds'
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        message: 'Test execution failed'
      }
    }
  }

  async publishAgent(request: PublishRequest) {
    try {
      const { agent_id, developer_id, publish_to_marketplace, pricing_model, price_cents, description, tags } = request

      // First validate the agent
      const validation = await this.validateAgentForPublishing(agent_id, developer_id)
      
      if (validation.errors.length > 0) {
        return {
          success: false,
          errors: validation.errors,
          message: 'Agent validation failed'
        }
      }

      // Update agent with publishing details
      const { error: updateError } = await supabase
        .from('agents')
        .update({
          status: publish_to_marketplace ? 'pending_approval' : 'active',
          is_published: publish_to_marketplace,
          pricing_model: pricing_model,
          price_cents: price_cents || 0,
          description: description,
          tags: tags,
          published_at: publish_to_marketplace ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', agent_id)
        .eq('developer_id', developer_id)

      if (updateError) throw updateError

      // Create publication record
      await supabase
        .from('agent_publications')
        .insert({
          agent_id: agent_id,
          developer_id: developer_id,
          publication_type: publish_to_marketplace ? 'marketplace' : 'private',
          status: publish_to_marketplace ? 'pending_review' : 'published',
          pricing_model: pricing_model,
          price_cents: price_cents || 0,
          validation_results: validation,
          created_at: new Date().toISOString()
        })

      // If publishing to marketplace, notify admin for review
      if (publish_to_marketplace) {
        await this.notifyAdminForReview(agent_id, developer_id)
      }

      // Log publication event
      await supabase
        .from('agent_run_logs')
        .insert({
          agent_id: agent_id,
          user_id: developer_id,
          execution_id: `publish_${Date.now()}_${agent_id}`,
          status: 'info',
          input_data: { action: 'agent_published', marketplace: publish_to_marketplace },
          output_data: { pricing_model, price_cents },
          execution_time_ms: 0,
          created_at: new Date().toISOString()
        })

      return {
        success: true,
        message: publish_to_marketplace 
          ? 'Agent submitted for marketplace review' 
          : 'Agent published successfully',
        status: publish_to_marketplace ? 'pending_approval' : 'published',
        validation_results: validation
      }
    } catch (error) {
      console.error('Agent publishing error:', error)
      return {
        success: false,
        error: (error as Error).message,
        message: 'Publishing failed'
      }
    }
  }

  async notifyAdminForReview(agentId: string, developerId: string) {
    try {
      // Create admin notification
      await supabase
        .from('admin_notifications')
        .insert({
          type: 'agent_review_required',
          title: 'New Agent Pending Review',
          message: `Agent ${agentId} submitted for marketplace approval`,
          data: { agent_id: agentId, developer_id: developerId },
          priority: 'normal',
          created_at: new Date().toISOString()
        })

      // Create moderation queue entry
      await supabase
        .from('content_moderation_queue')
        .insert({
          content_type: 'agent',
          content_id: agentId,
          submitter_id: developerId,
          status: 'pending',
          priority: 'normal',
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Admin notification error:', error)
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return url.startsWith('http://') || url.startsWith('https://')
    } catch {
      return false
    }
  }

  async getPublicationStatus(agentId: string, developerId: string) {
    const { data: publication } = await supabase
      .from('agent_publications')
      .select('*')
      .eq('agent_id', agentId)
      .eq('developer_id', developerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: agent } = await supabase
      .from('agents')
      .select('status, is_published, published_at')
      .eq('id', agentId)
      .single()

    return {
      agent_status: agent?.status,
      is_published: agent?.is_published,
      published_at: agent?.published_at,
      publication_record: publication
    }
  }
}

const deploymentFinalizer = new AgentDeploymentFinalizer()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'validate':
        const validation = await deploymentFinalizer.validateAgentForPublishing(body.agent_id, body.developer_id)
        return NextResponse.json(validation)

      case 'test':
        const testResult = await deploymentFinalizer.testAgentExecution(body.agent_id, body.developer_id, body.test_payload)
        return NextResponse.json(testResult)

      case 'publish':
        const publishResult = await deploymentFinalizer.publishAgent(body)
        return NextResponse.json(publishResult)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Deployment finalizer POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const developerId = searchParams.get('developer_id')

    if (!agentId || !developerId) {
      return NextResponse.json({ error: 'Missing agent_id or developer_id' }, { status: 400 })
    }

    const status = await deploymentFinalizer.getPublicationStatus(agentId, developerId)
    return NextResponse.json(status)
  } catch (error) {
    console.error('Deployment finalizer GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
