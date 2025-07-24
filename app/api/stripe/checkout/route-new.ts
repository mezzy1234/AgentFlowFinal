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
    const { plan, userId } = await request.json()

    // Validate required fields
    if (!plan || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate plan
    const validPlans = ['developer_pro', 'developer_enterprise']
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create or retrieve Stripe customer
    let customerId: string
    
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name || user.email,
        metadata: {
          supabase_user_id: userId,
        },
      })

      customerId = customer.id

      // Store customer ID in database
      await supabase
        .from('stripe_customers')
        .insert({
          user_id: userId,
          stripe_customer_id: customerId,
          email: user.email,
        })
    }

    // Define pricing
    const planPricing = {
      developer_pro: {
        name: 'Developer Pro',
        price: 9900, // $99.00
        description: 'Unlimited agents, analytics, and revenue sharing'
      },
      developer_enterprise: {
        name: 'Developer Enterprise',
        price: 29900, // $299.00
        description: 'Custom infrastructure and white-label dashboard'
      }
    }

    const selectedPlan = planPricing[plan as keyof typeof planPricing]

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPlan.name,
              description: selectedPlan.description,
            },
            unit_amount: selectedPlan.price,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?payment=success&plan=${plan}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?payment=cancelled`,
      metadata: {
        user_id: userId,
        plan: plan,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    })

    return NextResponse.json({ 
      sessionId: session.id, 
      url: session.url 
    })

  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
