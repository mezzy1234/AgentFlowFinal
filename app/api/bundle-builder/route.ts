import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Bundle {
  id: string
  name: string
  description?: string
  category?: string
  creator_id: string
  is_public: boolean
  bundle_config: any
  pricing_model: string
  price_cents: number
  tags?: string[]
}

interface BundleAgent {
  agent_id: string
  position: number
  config?: any
  dependencies?: string[]
  triggers?: any
  conditions?: any
}

interface BundleWorkflow {
  name: string
  description?: string
  workflow_type: string
  workflow_config: any
}

class BundleBuilderManager {
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
  }

  async createBundle(
    creatorId: string,
    bundleData: Omit<Bundle, 'id' | 'creator_id'>,
    agents: BundleAgent[],
    workflows: BundleWorkflow[]
  ): Promise<{ success: boolean; bundle_id?: string; error?: string }> {
    try {
      const bundleId = this.generateId('bundle')

      // Create bundle
      const { error: bundleError } = await supabase
        .from('agent_bundles')
        .insert({
          id: bundleId,
          creator_id: creatorId,
          ...bundleData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (bundleError) {
        return { success: false, error: 'Failed to create bundle' }
      }

      // Add agents to bundle
      if (agents.length > 0) {
        const bundleAgents = agents.map((agent, index) => ({
          id: this.generateId('ba'),
          bundle_id: bundleId,
          position: index + 1,
          agent_id: agent.agent_id,
          config: agent.config || {},
          dependencies: agent.dependencies || [],
          triggers: agent.triggers || {},
          conditions: agent.conditions || {},
          created_at: new Date().toISOString()
        }))

        const { error: agentsError } = await supabase
          .from('bundle_agents')
          .insert(bundleAgents)

        if (agentsError) {
          // Cleanup bundle if agents failed
          await supabase.from('agent_bundles').delete().eq('id', bundleId)
          return { success: false, error: 'Failed to add agents to bundle' }
        }
      }

      // Add workflows to bundle
      if (workflows.length > 0) {
        const bundleWorkflows = workflows.map(workflow => ({
          id: this.generateId('wf'),
          bundle_id: bundleId,
          ...workflow,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        const { error: workflowsError } = await supabase
          .from('bundle_workflows')
          .insert(bundleWorkflows)

        if (workflowsError) {
          // Cleanup bundle and agents if workflows failed
          await supabase.from('bundle_agents').delete().eq('bundle_id', bundleId)
          await supabase.from('agent_bundles').delete().eq('id', bundleId)
          return { success: false, error: 'Failed to add workflows to bundle' }
        }
      }

      return { success: true, bundle_id: bundleId }
    } catch (error) {
      console.error('Bundle creation error:', error)
      return { success: false, error: 'Bundle creation failed' }
    }
  }

  async getBundle(bundleId: string, includeAgents: boolean = true, includeWorkflows: boolean = true): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Get bundle details
      const { data: bundle, error: bundleError } = await supabase
        .from('agent_bundles')
        .select('*')
        .eq('id', bundleId)
        .single()

      if (bundleError || !bundle) {
        return { success: false, error: 'Bundle not found' }
      }

      const result: any = { ...bundle }

      // Get bundle agents if requested
      if (includeAgents) {
        const { data: agents, error: agentsError } = await supabase
          .from('bundle_agents')
          .select('*')
          .eq('bundle_id', bundleId)
          .order('position')

        if (!agentsError) {
          result.agents = agents
        }
      }

      // Get bundle workflows if requested
      if (includeWorkflows) {
        const { data: workflows, error: workflowsError } = await supabase
          .from('bundle_workflows')
          .select('*')
          .eq('bundle_id', bundleId)
          .eq('is_active', true)

        if (!workflowsError) {
          result.workflows = workflows
        }
      }

      return { success: true, data: result }
    } catch (error) {
      console.error('Bundle fetch error:', error)
      return { success: false, error: 'Failed to fetch bundle' }
    }
  }

  async updateBundle(
    bundleId: string,
    userId: string,
    updates: Partial<Bundle>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify ownership
      const { data: bundle, error: fetchError } = await supabase
        .from('agent_bundles')
        .select('creator_id')
        .eq('id', bundleId)
        .single()

      if (fetchError || !bundle) {
        return { success: false, error: 'Bundle not found' }
      }

      if (bundle.creator_id !== userId) {
        return { success: false, error: 'Unauthorized to update this bundle' }
      }

      // Update bundle
      const { error: updateError } = await supabase
        .from('agent_bundles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', bundleId)

      if (updateError) {
        return { success: false, error: 'Failed to update bundle' }
      }

      return { success: true }
    } catch (error) {
      console.error('Bundle update error:', error)
      return { success: false, error: 'Bundle update failed' }
    }
  }

  async publishBundle(bundleId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify ownership
      const { data: bundle, error: fetchError } = await supabase
        .from('agent_bundles')
        .select('creator_id')
        .eq('id', bundleId)
        .single()

      if (fetchError || !bundle) {
        return { success: false, error: 'Bundle not found' }
      }

      if (bundle.creator_id !== userId) {
        return { success: false, error: 'Unauthorized to publish this bundle' }
      }

      // Update bundle status and published date
      const { error } = await supabase
        .from('agent_bundles')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', bundleId)

      if (error) {
        return { success: false, error: 'Failed to publish bundle' }
      }

      return { success: true }
    } catch (error) {
      console.error('Bundle publish error:', error)
      return { success: false, error: 'Bundle publish failed' }
    }
  }

  async installBundle(
    bundleId: string,
    userId: string,
    config: any = {}
  ): Promise<{ success: boolean; installation_id?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('install_bundle', {
        p_bundle_id: bundleId,
        p_user_id: userId,
        p_config: config
      })

      if (error) {
        return { success: false, error: 'Failed to install bundle' }
      }

      return { success: true, installation_id: data }
    } catch (error) {
      console.error('Bundle installation error:', error)
      return { success: false, error: 'Bundle installation failed' }
    }
  }

  async executeBundle(
    bundleId: string,
    installationId: string,
    userId: string,
    inputData: any = {}
  ): Promise<{ success: boolean; execution_id?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('execute_bundle_workflow', {
        p_bundle_id: bundleId,
        p_installation_id: installationId,
        p_user_id: userId,
        p_input_data: inputData
      })

      if (error) {
        return { success: false, error: 'Failed to execute bundle' }
      }

      return { success: true, execution_id: data }
    } catch (error) {
      console.error('Bundle execution error:', error)
      return { success: false, error: 'Bundle execution failed' }
    }
  }

  async getBundlesByUser(
    userId: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ success: boolean; data?: any[]; total?: number; error?: string }> {
    try {
      let query = supabase
        .from('agent_bundles')
        .select('*, bundle_installations(count)', { count: 'exact' })
        .eq('creator_id', userId)

      if (status) {
        query = query.eq('status', status)
      }

      const { data: bundles, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return { success: false, error: 'Failed to fetch user bundles' }
      }

      return { success: true, data: bundles, total: count || 0 }
    } catch (error) {
      console.error('User bundles fetch error:', error)
      return { success: false, error: 'Failed to fetch user bundles' }
    }
  }

  async getPublicBundles(
    category?: string,
    searchTerm?: string,
    sortBy: string = 'created_at',
    limit: number = 20,
    offset: number = 0
  ): Promise<{ success: boolean; data?: any[]; total?: number; error?: string }> {
    try {
      let query = supabase
        .from('agent_bundles')
        .select('*', { count: 'exact' })
        .eq('is_public', true)
        .eq('status', 'published')

      if (category) {
        query = query.eq('category', category)
      }

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

      // Sort options
      switch (sortBy) {
        case 'popular':
          query = query.order('total_installs', { ascending: false })
          break
        case 'rating':
          query = query.order('avg_rating', { ascending: false })
          break
        case 'revenue':
          query = query.order('total_revenue_cents', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      const { data: bundles, error, count } = await query
        .range(offset, offset + limit - 1)

      if (error) {
        return { success: false, error: 'Failed to fetch public bundles' }
      }

      return { success: true, data: bundles, total: count || 0 }
    } catch (error) {
      console.error('Public bundles fetch error:', error)
      return { success: false, error: 'Failed to fetch public bundles' }
    }
  }

  async getBundleTemplates(
    category?: string,
    difficulty?: string
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      let query = supabase
        .from('bundle_templates')
        .select('*')

      if (category) {
        query = query.eq('category', category)
      }

      if (difficulty) {
        query = query.eq('difficulty_level', difficulty)
      }

      const { data: templates, error } = await query
        .order('is_featured', { ascending: false })
        .order('total_uses', { ascending: false })

      if (error) {
        return { success: false, error: 'Failed to fetch bundle templates' }
      }

      return { success: true, data: templates }
    } catch (error) {
      console.error('Bundle templates fetch error:', error)
      return { success: false, error: 'Failed to fetch bundle templates' }
    }
  }

  async createBundleFromTemplate(
    templateId: string,
    userId: string,
    bundleName: string,
    customizations: any = {}
  ): Promise<{ success: boolean; bundle_id?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('create_bundle_from_template', {
        p_template_id: templateId,
        p_user_id: userId,
        p_bundle_name: bundleName,
        p_customizations: customizations
      })

      if (error) {
        return { success: false, error: 'Failed to create bundle from template' }
      }

      return { success: true, bundle_id: data }
    } catch (error) {
      console.error('Bundle template creation error:', error)
      return { success: false, error: 'Bundle template creation failed' }
    }
  }
}

const bundleManager = new BundleBuilderManager()

// POST /api/bundle-builder - Create or manage bundles
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create_bundle':
        return await handleCreateBundle(body)
      case 'install_bundle':
        return await handleInstallBundle(body)
      case 'execute_bundle':
        return await handleExecuteBundle(body)
      case 'create_from_template':
        return await handleCreateFromTemplate(body)
      case 'publish_bundle':
        return await handlePublishBundle(body)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Bundle Builder API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleCreateBundle(body: any) {
  const { creator_id, bundle_data, agents, workflows } = body

  if (!creator_id || !bundle_data || !bundle_data.name) {
    return NextResponse.json({ error: 'Missing required bundle data' }, { status: 400 })
  }

  const result = await bundleManager.createBundle(
    creator_id,
    bundle_data,
    agents || [],
    workflows || []
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ bundle_id: result.bundle_id })
}

async function handleInstallBundle(body: any) {
  const { bundle_id, user_id, config } = body

  if (!bundle_id || !user_id) {
    return NextResponse.json({ error: 'Missing bundle_id or user_id' }, { status: 400 })
  }

  const result = await bundleManager.installBundle(bundle_id, user_id, config)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ installation_id: result.installation_id })
}

async function handleExecuteBundle(body: any) {
  const { bundle_id, installation_id, user_id, input_data } = body

  if (!bundle_id || !installation_id || !user_id) {
    return NextResponse.json({ error: 'Missing required execution parameters' }, { status: 400 })
  }

  const result = await bundleManager.executeBundle(bundle_id, installation_id, user_id, input_data)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ execution_id: result.execution_id })
}

async function handleCreateFromTemplate(body: any) {
  const { template_id, user_id, bundle_name, customizations } = body

  if (!template_id || !user_id || !bundle_name) {
    return NextResponse.json({ error: 'Missing required template parameters' }, { status: 400 })
  }

  const result = await bundleManager.createBundleFromTemplate(
    template_id,
    user_id,
    bundle_name,
    customizations
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ bundle_id: result.bundle_id })
}

async function handlePublishBundle(body: any) {
  const { bundle_id, user_id } = body

  if (!bundle_id || !user_id) {
    return NextResponse.json({ error: 'Missing bundle_id or user_id' }, { status: 400 })
  }

  const result = await bundleManager.publishBundle(bundle_id, user_id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

// GET /api/bundle-builder - Get bundles, templates, or analytics
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const bundleId = searchParams.get('bundle_id')
  const userId = searchParams.get('user_id')
  const category = searchParams.get('category')
  const searchTerm = searchParams.get('search')
  const sortBy = searchParams.get('sort') || 'created_at'
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    switch (type) {
      case 'bundle':
        if (!bundleId) {
          return NextResponse.json({ error: 'Missing bundle_id' }, { status: 400 })
        }
        const bundleData = await bundleManager.getBundle(bundleId)
        if (!bundleData.success) {
          return NextResponse.json({ error: bundleData.error }, { status: 404 })
        }
        return NextResponse.json(bundleData.data)

      case 'user_bundles':
        if (!userId) {
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
        }
        const userBundles = await bundleManager.getBundlesByUser(userId, undefined, limit, offset)
        if (!userBundles.success) {
          return NextResponse.json({ error: userBundles.error }, { status: 400 })
        }
        return NextResponse.json({
          bundles: userBundles.data,
          total: userBundles.total
        })

      case 'public_bundles':
        const publicBundles = await bundleManager.getPublicBundles(
          category || undefined,
          searchTerm || undefined,
          sortBy,
          limit,
          offset
        )
        if (!publicBundles.success) {
          return NextResponse.json({ error: publicBundles.error }, { status: 400 })
        }
        return NextResponse.json({
          bundles: publicBundles.data,
          total: publicBundles.total
        })

      case 'templates':
        const difficulty = searchParams.get('difficulty')
        const templates = await bundleManager.getBundleTemplates(
          category || undefined,
          difficulty || undefined
        )
        if (!templates.success) {
          return NextResponse.json({ error: templates.error }, { status: 400 })
        }
        return NextResponse.json({ templates: templates.data })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Bundle Builder GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/bundle-builder - Update bundle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { bundle_id, user_id, updates } = body

    if (!bundle_id || !user_id) {
      return NextResponse.json({ error: 'Missing bundle_id or user_id' }, { status: 400 })
    }

    const result = await bundleManager.updateBundle(bundle_id, user_id, updates)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Bundle Builder PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
