import { NextRequest } from 'next/server'
import { 
  getAuthenticatedUser, 
  getUserProfile, 
  requireDeveloperRole,
  createErrorResponse, 
  createSuccessResponse,
  createAuthenticatedSupabaseClient 
} from '@/lib/auth'

// GET /api/agents - List all published agents with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50)
    const offset = (page - 1) * limit

    const supabase = await createAuthenticatedSupabaseClient()
    
    let query = supabase
      .from('agents')
      .select(`
        *,
        developer:users!agents_developer_id_fkey(email),
        reviews:agent_reviews(rating, comment, created_at, user_id),
        required_integrations:agent_required_integrations(
          field_name,
          instructions,
          integration:integrations(*)
        )
      `)
      .eq('published', true)
      .order('created_at', { ascending: false })

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,tags.cs.{${search}}`)
    }
    
    if (featured) {
      query = query.eq('featured', true)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: agents, error } = await query

    if (error) {
      console.error('Error fetching agents:', error)
      return createErrorResponse('Failed to fetch agents', 500)
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('published', true)

    if (category && category !== 'all') {
      countQuery = countQuery.eq('category', category)
    }
    
    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%,tags.cs.{${search}}`)
    }
    
    if (featured) {
      countQuery = countQuery.eq('featured', true)
    }

    const { count } = await countQuery

    return createSuccessResponse({
      agents,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error in GET /api/agents:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// POST /api/agents - Create new agent (developer only)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    await requireDeveloperRole(user.id)

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
      required_integrations
    } = body

    // Validation
    if (!name || !description || !webhook_url || !category || !use_case) {
      return createErrorResponse('Missing required fields')
    }

    if (!price_one_time && !price_monthly) {
      return createErrorResponse('Must specify either one-time or monthly price')
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return createErrorResponse('Must include at least one tag')
    }

    const supabase = await createAuthenticatedSupabaseClient()

    // Create the agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        name,
        description,
        price_one_time,
        price_monthly,
        webhook_url,
        tags,
        category,
        use_case,
        cover_image,
        bundle_eligible: bundle_eligible || false,
        developer_id: user.id,
        published: false // New agents start as unpublished
      })
      .select()
      .single()

    if (agentError) {
      console.error('Error creating agent:', agentError)
      return createErrorResponse('Failed to create agent', 500)
    }

    // Add required integrations if provided
    if (required_integrations && Array.isArray(required_integrations)) {
      const integrationInserts = required_integrations.map((req: any) => ({
        agent_id: agent.id,
        integration_id: req.integration_id,
        field_name: req.field_name,
        instructions: req.instructions || null
      }))

      const { error: integrationsError } = await supabase
        .from('agent_required_integrations')
        .insert(integrationInserts)

      if (integrationsError) {
        console.error('Error adding required integrations:', integrationsError)
        // Don't fail the entire operation, just log the error
      }
    }

    return createSuccessResponse({ agent }, 201)

  } catch (error: any) {
    console.error('Error in POST /api/agents:', error)
    
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Authentication required', 401)
    }
    
    if (error.message === 'Developer role required') {
      return createErrorResponse('Developer account required', 403)
    }
    
    return createErrorResponse('Internal server error', 500)
  }
}
