import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { priceType } = await request.json() // 'one_time' or 'monthly'
    const { id: agentId } = params

    // Get current user - this would need to be implemented with proper auth
    // For now, we'll expect user_id in the request body or headers
    const userId = request.headers.get('x-user-id') || request.headers.get('authorization')?.split(' ')[1]
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        id,
        name,
        description,
        price_one_time,
        price_monthly,
        developer_id,
        published,
        cover_image
      `)
      .eq('id', agentId)
      .eq('published', true)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Check if user already owns this agent
    const { data: existingPurchase } = await supabase
      .from('user_agents')
      .select('id')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .single()

    if (existingPurchase) {
      return NextResponse.json({ error: 'You already own this agent' }, { status: 400 })
    }

    // Get user details for Stripe
    const { data: userData } = await supabase
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', userId)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User data not found' }, { status: 400 })
    }

    // Determine price and create Stripe session
    let price: number
    let mode: 'payment' | 'subscription'

    if (priceType === 'monthly' && agent.price_monthly) {
      price = Math.round(agent.price_monthly * 100) // Convert to cents
      mode = 'subscription'
    } else if (priceType === 'one_time' && agent.price_one_time) {
      price = Math.round(agent.price_one_time * 100) // Convert to cents
      mode = 'payment'
    } else {
      return NextResponse.json({ error: 'Invalid price type' }, { status: 400 })
    }

    // Create or get Stripe customer
    let customerId = userData.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          userId: userId,
        },
      })
      customerId = customer.id

      // Update user with Stripe customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    }

    // Create Stripe Checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      mode,
      success_url: `${request.nextUrl.origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/marketplace`,
      metadata: {
        userId: userId,
        agentId,
        priceType,
      },
    }

    if (mode === 'payment') {
      // One-time payment
      sessionParams.line_items = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: agent.name,
              description: agent.description.substring(0, 500), // Stripe limit
              images: agent.cover_image ? [agent.cover_image] : [],
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ]
    } else {
      // Subscription
      sessionParams.line_items = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: agent.name,
              description: agent.description.substring(0, 500), // Stripe limit
              images: agent.cover_image ? [agent.cover_image] : [],
            },
            unit_amount: price,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ]
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ 
      checkoutUrl: session.url,
      sessionId: session.id 
    })

  } catch (error) {
    console.error('Purchase error:', error)
    return NextResponse.json(
      { error: 'Failed to create purchase session' },
      { status: 500 }
    )
  }
}

// PATCH /api/agents/[id]/purchase - Toggle agent activation
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { active } = await request.json()
    const { id: agentId } = params

    // Get current user - this would need to be implemented with proper auth
    const userId = request.headers.get('x-user-id') || request.headers.get('authorization')?.split(' ')[1]
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user agent
    const { data: userAgent, error: userAgentError } = await supabase
      .from('user_agents')
      .select('id, agent_id')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .single()

    if (userAgentError || !userAgent) {
      return NextResponse.json({ error: 'Agent not owned by user' }, { status: 404 })
    }

    // Update activation status
    const { data: updatedUserAgent, error: updateError } = await supabase
      .from('user_agents')
      .update({ active })
      .eq('id', userAgent.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update agent status' }, { status: 500 })
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: active ? 'agent_activated' : 'agent_paused',
      title: active ? 'Agent Activated' : 'Agent Paused',
      message: `Your agent has been ${active ? 'activated and is now running' : 'paused and stopped'}`,
      data: { agentId, userAgentId: userAgent.id }
    })

    return NextResponse.json({
      message: `Agent ${active ? 'activated' : 'deactivated'} successfully`,
      userAgent: updatedUserAgent
    })

  } catch (error) {
    console.error('Toggle agent error:', error)
    return NextResponse.json(
      { error: 'Failed to toggle agent status' },
      { status: 500 }
    )
  }
}
