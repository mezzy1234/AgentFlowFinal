import { NextRequest } from 'next/server'
import { 
  getAuthenticatedUser, 
  getUserProfile,
  createErrorResponse, 
  createSuccessResponse,
  createAuthenticatedSupabaseClient 
} from '@/lib/auth'

interface RouteParams {
  params: {
    id: string
  }
}

// POST /api/agents/[id]/purchase - Purchase an agent
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser()
    const profile = await getUserProfile(user.id)

    const { id: agentId } = params
    const supabase = await createAuthenticatedSupabaseClient()

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('published', true)
      .single()

    if (agentError || !agent) {
      return createErrorResponse('Agent not found', 404)
    }

    // Check if user already owns this agent
    const { data: existingPurchase, error: purchaseCheckError } = await supabase
      .from('user_agents')
      .select('id')
      .eq('user_id', user.id)
      .eq('agent_id', agentId)
      .single()

    if (existingPurchase) {
      return createErrorResponse('Agent already purchased', 400)
    }

    // For one-time purchase, check if user has enough credits
    if (agent.price_one_time) {
      if (profile.credits < agent.price_one_time) {
        return createErrorResponse('Insufficient credits', 400)
      }

      // Deduct credits and create user_agent record
      const { error: updateCreditsError } = await supabase
        .from('users')
        .update({
          credits: profile.credits - agent.price_one_time,
          total_spent: profile.total_spent + agent.price_one_time
        })
        .eq('id', user.id)

      if (updateCreditsError) {
        console.error('Error updating user credits:', updateCreditsError)
        return createErrorResponse('Failed to process payment', 500)
      }

      // Create user_agent record
      const { data: userAgent, error: userAgentError } = await supabase
        .from('user_agents')
        .insert({
          user_id: user.id,
          agent_id: agentId,
          active: true,
          purchased_at: new Date().toISOString()
        })
        .select()
        .single()

      if (userAgentError) {
        console.error('Error creating user_agent:', userAgentError)
        return createErrorResponse('Failed to activate agent', 500)
      }

      // Update agent download count
      const { error: updateAgentError } = await supabase
        .from('agents')
        .update({
          download_count: agent.download_count + 1
        })
        .eq('id', agentId)

      if (updateAgentError) {
        console.error('Error updating agent download count:', updateAgentError)
      }

      return createSuccessResponse({
        message: 'Agent purchased successfully',
        userAgent,
        creditsRemaining: profile.credits - agent.price_one_time
      })

    } else if (agent.price_monthly) {
      // For monthly subscriptions, we'd integrate with Stripe here
      // For now, return an error asking them to upgrade subscription
      return createErrorResponse(
        'Monthly agents require an active subscription. Please upgrade your plan.',
        400
      )
    } else {
      return createErrorResponse('Agent has no valid pricing', 400)
    }

  } catch (error: any) {
    console.error('Error in POST /api/agents/[id]/purchase:', error)
    
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Authentication required', 401)
    }
    
    return createErrorResponse('Internal server error', 500)
  }
}

// POST /api/agents/[id]/toggle - Toggle agent active status
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser()
    const { id: agentId } = params
    const body = await request.json()
    const { active } = body

    const supabase = await createAuthenticatedSupabaseClient()

    // Check if user owns this agent
    const { data: userAgent, error: fetchError } = await supabase
      .from('user_agents')
      .select('*')
      .eq('user_id', user.id)
      .eq('agent_id', agentId)
      .single()

    if (fetchError || !userAgent) {
      return createErrorResponse('Agent not found in your collection', 404)
    }

    // Update active status
    const { data: updatedUserAgent, error: updateError } = await supabase
      .from('user_agents')
      .update({ active })
      .eq('id', userAgent.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating agent status:', updateError)
      return createErrorResponse('Failed to update agent status', 500)
    }

    return createSuccessResponse({
      message: `Agent ${active ? 'activated' : 'deactivated'} successfully`,
      userAgent: updatedUserAgent
    })

  } catch (error: any) {
    console.error('Error in PUT /api/agents/[id]/toggle:', error)
    
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Authentication required', 401)
    }
    
    return createErrorResponse('Internal server error', 500)
  }
}
