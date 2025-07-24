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

export async function POST(request: NextRequest) {
  try {
    const { plan, agentId, userId } = await request.json()

    // Validate required fields
    if (!plan && !agentId) {
      return NextResponse.json(
        { error: 'Either plan or agentId is required' },
        { status: 400 }
      )
    }

    let sessionConfig: any = {
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/cancel`,
    }

    if (plan) {
      // Subscription plan checkout
      const validPrices = {
        developer_pro: process.env.STRIPE_PRICE_DEVELOPER_PRO,
        developer_enterprise: process.env.STRIPE_PRICE_DEVELOPER_ENTERPRISE,
      }

      const priceId = validPrices[plan as keyof typeof validPrices]
      if (!priceId) {
        return NextResponse.json(
          { error: 'Invalid plan selected' },
          { status: 400 }
        )
      }

      sessionConfig = {
        ...sessionConfig,
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: {
          plan: plan,
          userId: userId,
        },
      }
    } else if (agentId) {
      // Agent purchase checkout
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single()

      if (error || !agent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        )
      }

      sessionConfig = {
        ...sessionConfig,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: agent.name,
                description: agent.description || 'AI Agent',
              },
              unit_amount: (agent.price || 0) * 100, // Convert to cents
            },
            quantity: 1,
          },
        ],
        metadata: {
          agentId: agentId,
          userId: userId,
          agentName: agent.name,
          priceCharged: (agent.price || 0).toString(),
        },
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig)

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
