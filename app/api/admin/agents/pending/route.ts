import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET() {
  try {
    const { data: agents, error } = await supabase
      .from('agents')
      .select(`
        id,
        name,
        description,
        cover_image,
        status,
        price_cents,
        created_at,
        developer_id,
        profiles!inner (
          full_name,
          email
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending agents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pending agents' },
        { status: 500 }
      )
    }

    const formattedAgents = agents?.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      cover_image: agent.cover_image,
      status: agent.status,
      price_cents: agent.price_cents,
      created_at: agent.created_at,
      developer_name: (agent.profiles as any)?.full_name || 'Unknown Developer',
      developer_email: (agent.profiles as any)?.email || 'unknown@example.com'
    })) || []

    return NextResponse.json({
      agents: formattedAgents
    })

  } catch (error) {
    console.error('Error in pending agents API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
