import { NextRequest } from 'next/server'
import { 
  getAuthenticatedUser, 
  requireDeveloperRole,
  createErrorResponse, 
  createSuccessResponse,
  createAuthenticatedSupabaseClient 
} from '@/lib/auth'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/agents/[id] - Get specific agent details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params
    const supabase = await createAuthenticatedSupabaseClient()
    
    const { data: agent, error } = await supabase
      .from('agents')
      .select(`
        *,
        developer:users!agents_developer_id_fkey(email),
        reviews:agent_reviews(
          rating, 
          comment, 
          created_at,
          user:users(email)
        ),
        required_integrations:agent_required_integrations(
          field_name,
          instructions,
          integration:integrations(*)
        )
      `)
      .eq('id', id)
      .eq('published', true)
      .single()

    if (error) {
      console.error('Error fetching agent:', error)
      return createErrorResponse('Agent not found', 404)
    }

    return createSuccessResponse({ agent })

  } catch (error) {
    console.error('Error in GET /api/agents/[id]:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// PUT /api/agents/[id] - Update agent (developer only, own agents)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser()
    await requireDeveloperRole(user.id)

    const { id } = params
    const body = await request.json()
    const {
      name,
      description,
      price_one_time,
      price_monthly,
      webhook_url,
      tags,
      category,
      use_case,
      cover_image,
      bundle_eligible,
      published
    } = body

    const supabase = await createAuthenticatedSupabaseClient()

    // Check if agent exists and belongs to the developer
    const { data: existingAgent, error: fetchError } = await supabase
      .from('agents')
      .select('id, developer_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingAgent) {
      return createErrorResponse('Agent not found', 404)
    }

    if (existingAgent.developer_id !== user.id) {
      return createErrorResponse('Not authorized to update this agent', 403)
    }

    // Update the agent
    const { data: agent, error: updateError } = await supabase
      .from('agents')
      .update({
        name,
        description,
        price_one_time,
        price_monthly,
        webhook_url,
        tags,
        category,
        use_case,
        cover_image,
        bundle_eligible,
        published,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating agent:', updateError)
      return createErrorResponse('Failed to update agent', 500)
    }

    return createSuccessResponse({ agent })

  } catch (error: any) {
    console.error('Error in PUT /api/agents/[id]:', error)
    
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Authentication required', 401)
    }
    
    if (error.message === 'Developer role required') {
      return createErrorResponse('Developer account required', 403)
    }
    
    return createErrorResponse('Internal server error', 500)
  }
}

// DELETE /api/agents/[id] - Delete agent (developer only, own agents)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser()
    await requireDeveloperRole(user.id)

    const { id } = params
    const supabase = await createAuthenticatedSupabaseClient()

    // Check if agent exists and belongs to the developer
    const { data: existingAgent, error: fetchError } = await supabase
      .from('agents')
      .select('id, developer_id, name')
      .eq('id', id)
      .single()

    if (fetchError || !existingAgent) {
      return createErrorResponse('Agent not found', 404)
    }

    if (existingAgent.developer_id !== user.id) {
      return createErrorResponse('Not authorized to delete this agent', 403)
    }

    // Check if agent has any active users
    const { data: userAgents, error: userAgentsError } = await supabase
      .from('user_agents')
      .select('id')
      .eq('agent_id', id)
      .eq('active', true)

    if (userAgentsError) {
      console.error('Error checking user agents:', userAgentsError)
      return createErrorResponse('Failed to check agent usage', 500)
    }

    if (userAgents && userAgents.length > 0) {
      return createErrorResponse(
        'Cannot delete agent with active users. Please contact support.',
        400
      )
    }

    // Delete the agent (CASCADE will handle related records)
    const { error: deleteError } = await supabase
      .from('agents')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting agent:', deleteError)
      return createErrorResponse('Failed to delete agent', 500)
    }

    return createSuccessResponse({ 
      message: `Agent "${existingAgent.name}" deleted successfully` 
    })

  } catch (error: any) {
    console.error('Error in DELETE /api/agents/[id]:', error)
    
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Authentication required', 401)
    }
    
    if (error.message === 'Developer role required') {
      return createErrorResponse('Developer account required', 403)
    }
    
    return createErrorResponse('Internal server error', 500)
  }
}
