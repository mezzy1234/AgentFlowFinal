import { NextRequest } from 'next/server'
import { 
  getAuthenticatedUser, 
  getUserProfile,
  createErrorResponse, 
  createSuccessResponse,
  createAuthenticatedSupabaseClient 
} from '@/lib/auth'

// GET /api/dashboard - Get user dashboard data
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const profile = await getUserProfile(user.id)
    const supabase = await createAuthenticatedSupabaseClient()

    if (profile.role === 'customer') {
      // Customer dashboard data
      const { data: userAgents, error: userAgentsError } = await supabase
        .from('user_agents')
        .select(`
          *,
          agent:agents(
            id,
            name,
            description,
            tags,
            category,
            cover_image,
            price_one_time,
            price_monthly
          )
        `)
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false })

      if (userAgentsError) {
        console.error('Error fetching user agents:', userAgentsError)
        return createErrorResponse('Failed to fetch agents', 500)
      }

      // Get recent activity logs
      const userAgentIds = userAgents?.map(ua => ua.id) || []
      let recentActivity = []

      if (userAgentIds.length > 0) {
        const { data: logs, error: logsError } = await supabase
          .from('agent_logs')
          .select(`
            *,
            user_agent:user_agents(
              agent:agents(name)
            )
          `)
          .in('user_agent_id', userAgentIds)
          .order('created_at', { ascending: false })
          .limit(10)

        if (!logsError) {
          recentActivity = logs || []
        }
      }

      const stats = {
        totalAgents: userAgents?.length || 0,
        activeAgents: userAgents?.filter(ua => ua.active).length || 0,
        totalRuns: userAgents?.reduce((sum, ua) => sum + ua.run_count, 0) || 0,
        creditsRemaining: profile.credits
      }

      return createSuccessResponse({
        role: 'customer',
        stats,
        agents: userAgents || [],
        recentActivity,
        profile: {
          email: profile.email,
          credits: profile.credits,
          totalSpent: profile.total_spent,
          subscriptionPlan: profile.subscription_plan,
          subscriptionActive: profile.subscription_active
        }
      })

    } else if (profile.role === 'developer') {
      // Developer dashboard data
      const { data: myAgents, error: agentsError } = await supabase
        .from('agents')
        .select(`
          *,
          user_agents(id, active, run_count),
          reviews:agent_reviews(rating)
        `)
        .eq('developer_id', user.id)
        .order('created_at', { ascending: false })

      if (agentsError) {
        console.error('Error fetching developer agents:', agentsError)
        return createErrorResponse('Failed to fetch agents', 500)
      }

      // Calculate developer stats
      const totalDownloads = myAgents?.reduce((sum, agent) => 
        sum + (agent.user_agents?.length || 0), 0) || 0
      
      const totalRevenue = myAgents?.reduce((sum, agent) => {
        const downloads = agent.user_agents?.length || 0
        const price = agent.price_one_time || 0
        return sum + (downloads * price)
      }, 0) || 0

      const avgRating = myAgents?.reduce((sum, agent) => {
        const reviews = agent.reviews || []
        if (reviews.length === 0) return sum
        const agentAvg = reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
        return sum + agentAvg
      }, 0) / (myAgents?.length || 1) || 0

      const stats = {
        totalAgents: myAgents?.length || 0,
        publishedAgents: myAgents?.filter(a => a.published).length || 0,
        totalDownloads,
        totalRevenue,
        averageRating: Math.round(avgRating * 10) / 10
      }

      return createSuccessResponse({
        role: 'developer',
        stats,
        agents: myAgents || [],
        profile: {
          email: profile.email,
          subscriptionPlan: profile.subscription_plan,
          subscriptionActive: profile.subscription_active
        }
      })
    }

    return createErrorResponse('Invalid user role', 400)

  } catch (error: any) {
    console.error('Error in GET /api/dashboard:', error)
    
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Authentication required', 401)
    }
    
    return createErrorResponse('Internal server error', 500)
  }
}
