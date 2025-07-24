import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId, plan } = await request.json()

    // Validate price ID
    const validPrices = {
      'developer_pro': process.env.STRIPE_PRICE_DEVELOPER_PRO,
      'developer_enterprise': process.env.STRIPE_PRICE_DEVELOPER_ENTERPRISE,
    }

    if (!validPrices[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Create or retrieve customer
    let customerId: string
    
    // Check if user already has a Stripe customer ID
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })

      customerId = customer.id

      // Store customer ID in database
      await supabase
        .from('stripe_customers')
        .insert({
          user_id: user.id,
          stripe_customer_id: customerId,
          email: user.email,
        })
    }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: agent.name,
              description: agent.description,
              images: agent.image ? [agent.image] : [],
            },
            unit_amount: agent.price * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/cancel`,
      metadata: {
        agentId: agentId,
        userId: userId,
        agentName: agent.name,
        priceCharged: agent.price.toString(),
      },
      customer_email: user.email,
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })

  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
