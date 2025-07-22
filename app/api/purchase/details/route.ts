import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Get session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer']
    })

    if (!session.metadata?.user_id || !session.metadata?.agent_id) {
      return NextResponse.json(
        { error: 'Invalid session metadata' },
        { status: 400 }
      )
    }

    const userId = session.metadata.user_id
    const agentId = session.metadata.agent_id

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        id,
        name,
        description,
        cover_image,
        required_integrations
      `)
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      console.error('Error fetching agent:', agentError)
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Get user agent details
    const { data: userAgent, error: userAgentError } = await supabase
      .from('user_agents')
      .select('id, active, status')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .single()

    if (userAgentError || !userAgent) {
      console.error('Error fetching user agent:', userAgentError)
      return NextResponse.json(
        { error: 'User agent not found' },
        { status: 404 }
      )
    }

    // Get receipt details
    const { data: receipt, error: receiptError } = await supabase
      .from('purchase_receipts')
      .select('amount_cents, currency, receipt_url')
      .eq('stripe_session_id', sessionId)
      .single()

    if (receiptError || !receipt) {
      console.error('Error fetching receipt:', receiptError)
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      agent,
      userAgent,
      receipt
    })

  } catch (error) {
    console.error('Error fetching purchase details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
