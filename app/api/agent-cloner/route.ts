import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CloneRequest {
  source_agent_id: string
  developer_id: string
  new_name?: string
  clone_type: 'full' | 'template' | 'fork'
  include_data: {
    metadata: boolean
    webhook_url: boolean
    integrations: boolean
    pricing: boolean
    reviews: boolean
  }
}

interface CloneResult {
  success: boolean
  cloned_agent_id?: string
  original_agent?: any
  cloned_agent?: any
  error?: string
  warnings?: string[]
}

class AgentCloner {
  async cloneAgent(request: CloneRequest): Promise<CloneResult> {
    try {
      // Validate clone request
      const validation = await this.validateCloneRequest(request)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Get original agent
      const originalAgent = await this.getOriginalAgent(request.source_agent_id, request.developer_id)
      if (!originalAgent) {
        return {
          success: false,
          error: 'Original agent not found or access denied'
        }
      }

      // Generate new agent data
      const clonedAgentData = await this.generateClonedAgentData(originalAgent, request)

      // Create cloned agent
      const { data: clonedAgent, error: createError } = await supabase
        .from('agents')
        .insert(clonedAgentData)
        .select()
        .single()

      if (createError) throw createError

      // Clone additional data if requested
      const warnings = []
      
      if (request.include_data.reviews && request.clone_type === 'full') {
        const reviewResult = await this.cloneReviews(request.source_agent_id, clonedAgent.id)
        if (!reviewResult.success) {
          warnings.push(`Failed to clone reviews: ${reviewResult.error}`)
        }
      }

      // Create clone relationship record
      await this.createCloneRelationship(request.source_agent_id, clonedAgent.id, request.clone_type)

      // Log clone event
      await this.logCloneEvent(request.source_agent_id, clonedAgent.id, request.developer_id, request.clone_type)

      return {
        success: true,
        cloned_agent_id: clonedAgent.id,
        original_agent: originalAgent,
        cloned_agent: clonedAgent,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    } catch (error) {
      console.error('Agent cloning error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async validateCloneRequest(request: CloneRequest) {
    // Check if developer has permission to clone
    const hasPermission = await this.checkClonePermission(request.developer_id, request.source_agent_id)
    if (!hasPermission) {
      return {
        valid: false,
        error: 'No permission to clone this agent. You must own the agent or it must be publicly cloneable.'
      }
    }

    // Check clone limits
    const cloneCount = await this.getCloneCount(request.developer_id)
    const maxClones = await this.getMaxClones(request.developer_id)
    
    if (cloneCount >= maxClones) {
      return {
        valid: false,
        error: `Clone limit reached. Maximum ${maxClones} clones allowed.`
      }
    }

    return { valid: true }
  }

  async checkClonePermission(developerId: string, sourceAgentId: string): Promise<boolean> {
    // Check if developer owns the original agent
    const { data: ownedAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('id', sourceAgentId)
      .eq('developer_id', developerId)
      .single()

    if (ownedAgent) return true

    // Check if agent is publicly cloneable
    const { data: publicAgent } = await supabase
      .from('agents')
      .select('id, clone_permissions')
      .eq('id', sourceAgentId)
      .eq('status', 'active')
      .single()

    if (publicAgent?.clone_permissions?.public_clone === true) return true

    // Check if developer has purchased the agent
    const { data: purchase } = await supabase
      .from('agent_purchases')
      .select('id')
      .eq('agent_id', sourceAgentId)
      .eq('user_id', developerId)
      .eq('status', 'active')
      .single()

    if (purchase) return true

    return false
  }

  async getCloneCount(developerId: string): Promise<number> {
    const { count } = await supabase
      .from('agent_clones')
      .select('*', { count: 'exact', head: true })
      .eq('cloner_id', developerId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

    return count || 0
  }

  async getMaxClones(developerId: string): Promise<number> {
    // Get developer's plan limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type, subscription_tier')
      .eq('id', developerId)
      .single()

    if (profile?.account_type === 'enterprise') return 100
    if (profile?.subscription_tier === 'pro') return 50
    return 10 // Free tier
  }

  async getOriginalAgent(sourceAgentId: string, developerId: string) {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', sourceAgentId)
      .single()

    if (error) return null

    // Check if developer has access to view this agent
    if (data.developer_id !== developerId && data.status !== 'active') {
      return null
    }

    return data
  }

  async generateClonedAgentData(originalAgent: any, request: CloneRequest) {
    const generateId = () => `agent_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
    const clonedId = generateId()

    const baseName = request.new_name || originalAgent.name
    const clonedName = request.clone_type === 'fork' 
      ? `${baseName} (Fork)` 
      : `${baseName} (Clone)`

    const clonedData: any = {
      id: clonedId,
      name: clonedName,
      description: `${originalAgent.description}\n\nCloned from: ${originalAgent.name}`,
      developer_id: request.developer_id,
      status: 'draft', // Cloned agents start as drafts
      is_published: false,
      clone_source_id: originalAgent.id,
      clone_type: request.clone_type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Always copy these basic fields
      category: originalAgent.category,
      tags: originalAgent.tags || [],
      
      // Conditional copying based on include_data settings
      metadata: request.include_data.metadata ? originalAgent.metadata : {},
      webhook_url: request.include_data.webhook_url ? originalAgent.webhook_url : null,
      required_integrations: request.include_data.integrations ? originalAgent.required_integrations : [],
      
      // Pricing - only copy if specifically requested and it's a full clone
      pricing_model: request.include_data.pricing && request.clone_type === 'full' 
        ? originalAgent.pricing_model 
        : 'free',
      price_cents: request.include_data.pricing && request.clone_type === 'full' 
        ? originalAgent.price_cents 
        : 0,
    }

    // For template clones, remove specific implementation details
    if (request.clone_type === 'template') {
      clonedData.webhook_url = null
      clonedData.metadata = {
        ...clonedData.metadata,
        webhook_url: null,
        api_keys: {},
        specific_configs: {}
      }
    }

    // For forks, maintain connection to original but allow independent development
    if (request.clone_type === 'fork') {
      clonedData.fork_parent_id = originalAgent.id
      clonedData.description = `${originalAgent.description}\n\nForked from: ${originalAgent.name} - Independent development branch`
    }

    return clonedData
  }

  async cloneReviews(sourceAgentId: string, clonedAgentId: string) {
    try {
      // Only clone positive reviews (4+ stars) for template/fork clones
      const { data: reviews, error } = await supabase
        .from('agent_reviews')
        .select('*')
        .eq('agent_id', sourceAgentId)
        .gte('rating', 4)
        .limit(10) // Limit to top 10 positive reviews

      if (error) throw error

      if (reviews && reviews.length > 0) {
        const clonedReviews = reviews.map(review => ({
          ...review,
          id: undefined, // Let DB generate new ID
          agent_id: clonedAgentId,
          cloned_from_review_id: review.id,
          created_at: new Date().toISOString()
        }))

        await supabase
          .from('agent_reviews')
          .insert(clonedReviews)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async createCloneRelationship(sourceAgentId: string, clonedAgentId: string, cloneType: string) {
    await supabase
      .from('agent_clones')
      .insert({
        source_agent_id: sourceAgentId,
        cloned_agent_id: clonedAgentId,
        cloner_id: '', // Will be set from the cloned agent's developer_id
        clone_type: cloneType,
        created_at: new Date().toISOString()
      })
  }

  async logCloneEvent(sourceAgentId: string, clonedAgentId: string, developerId: string, cloneType: string) {
    await supabase
      .from('agent_run_logs')
      .insert({
        agent_id: sourceAgentId,
        user_id: developerId,
        execution_id: `clone_${Date.now()}_${sourceAgentId}`,
        status: 'info',
        input_data: { 
          event_type: 'agent_cloned',
          clone_type: cloneType,
          cloned_agent_id: clonedAgentId
        },
        output_data: null,
        execution_time_ms: 0,
        created_at: new Date().toISOString()
      })
  }

  async getCloneHistory(developerId: string, agentId?: string) {
    let query = supabase
      .from('agent_clones')
      .select(`
        *,
        source_agents:agents!agent_clones_source_agent_id_fkey(id, name, developer_id),
        cloned_agents:agents!agent_clones_cloned_agent_id_fkey(id, name, status)
      `)

    // If agentId provided, get clones of that specific agent
    if (agentId) {
      query = query.eq('source_agent_id', agentId)
    } else {
      // Otherwise get all clones created by this developer
      query = query.eq('cloner_id', developerId)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return data || []
  }

  async updateCloneSettings(agentId: string, developerId: string, settings: any) {
    try {
      const { data, error } = await supabase
        .from('agents')
        .update({
          clone_permissions: settings.clone_permissions,
          clone_settings: settings.clone_settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId)
        .eq('developer_id', developerId)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        agent: data
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async getCloneStats(agentId: string, developerId: string) {
    // Verify ownership
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .eq('developer_id', developerId)
      .single()

    if (!agent) {
      return { success: false, error: 'Agent not found or access denied' }
    }

    // Get clone statistics
    const { data: cloneStats } = await supabase
      .from('agent_clones')
      .select('clone_type, created_at')
      .eq('source_agent_id', agentId)

    const stats = {
      total_clones: cloneStats?.length || 0,
      clone_types: {
        full: cloneStats?.filter(c => c.clone_type === 'full').length || 0,
        template: cloneStats?.filter(c => c.clone_type === 'template').length || 0,
        fork: cloneStats?.filter(c => c.clone_type === 'fork').length || 0
      },
      recent_clones: cloneStats?.filter(c => 
        new Date(c.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length || 0
    }

    return {
      success: true,
      stats: stats
    }
  }
}

const agentCloner = new AgentCloner()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'clone_agent':
        const cloneResult = await agentCloner.cloneAgent(body.clone_request)
        return NextResponse.json(cloneResult)

      case 'update_clone_settings':
        const updateResult = await agentCloner.updateCloneSettings(body.agent_id, body.developer_id, body.settings)
        return NextResponse.json(updateResult)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Agent cloner POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const developerId = searchParams.get('developer_id')
    const agentId = searchParams.get('agent_id')

    if (!developerId) {
      return NextResponse.json({ error: 'Missing developer_id' }, { status: 400 })
    }

    switch (type) {
      case 'clone_history':
        const history = await agentCloner.getCloneHistory(developerId, agentId || undefined)
        return NextResponse.json({ clone_history: history })

      case 'clone_stats':
        if (!agentId) {
          return NextResponse.json({ error: 'Missing agent_id for stats' }, { status: 400 })
        }
        const stats = await agentCloner.getCloneStats(agentId, developerId)
        return NextResponse.json(stats)

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Agent cloner GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
