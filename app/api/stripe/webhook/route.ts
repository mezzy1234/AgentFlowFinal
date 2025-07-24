import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = headers().get('Stripe-Signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription)
        break
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { userId, agentId, priceType } = session.metadata!

  try {
    // Create user_agents record
    const { data: userAgent, error: userAgentError } = await supabaseAdmin
      .from('user_agents')
      .insert({
        user_id: userId,
        agent_id: agentId,
        purchase_date: new Date().toISOString(),
        subscription_id: session.subscription as string || null,
        active: false, // User needs to set up credentials first
        status: 'pending'
      })
      .select()
      .single()

    if (userAgentError) throw userAgentError

    // Create purchase receipt
    await supabaseAdmin
      .from('purchase_receipts')
      .insert({
        user_agent_id: userAgent.id,
        stripe_payment_intent_id: session.payment_intent as string,
        amount_cents: session.amount_total!,
        currency: session.currency!,
        receipt_url: null // Will be populated by Stripe email
      })

    // Calculate developer revenue (70% split)
    const platformFee = Math.round(session.amount_total! * 0.30)
    const developerRevenue = session.amount_total! - platformFee

    // Update developer analytics
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('developer_id')
      .eq('id', agentId)
      .single()

    if (agent) {
      await supabaseAdmin
        .from('developer_analytics')
        .upsert({
          developer_id: agent.developer_id,
          date: new Date().toISOString().split('T')[0],
          agent_purchases: 1,
          revenue_cents: developerRevenue
        }, {
          onConflict: 'developer_id,date',
          ignoreDuplicates: false
        })
    }

    // Create notifications
    await supabaseAdmin.from('notifications').insert([
      {
        user_id: userId,
        type: 'agent_purchased',
        title: 'Agent Purchased Successfully!',
        message: 'Your agent purchase is complete. Set up credentials to activate.',
        data: { agentId, userAgentId: userAgent.id },
        channels: ['in_app', 'email']
      }
    ])

    // Update platform analytics
    await supabaseAdmin
      .from('platform_analytics')
      .upsert({
        date: new Date().toISOString().split('T')[0],
        agent_activations: 1,
        revenue_cents: session.amount_total!
      }, {
        onConflict: 'date',
        ignoreDuplicates: false
      })

    console.log(`Purchase completed: User ${userId} bought agent ${agentId}`)

  } catch (error) {
    console.error('Error handling checkout completion:', error)
    
    // Create error notification
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type: 'billing_error',
      title: 'Purchase Processing Error',
      message: 'There was an issue processing your purchase. Please contact support.',
      data: { agentId, sessionId: session.id },
      channels: ['in_app', 'email']
    })
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Handle recurring subscription payments
  if (!invoice.subscription) return

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const { userId, agentId } = subscription.metadata

  try {
    // Calculate developer revenue (70% split)
    const platformFee = Math.round(invoice.amount_paid * 0.30)
    const developerRevenue = invoice.amount_paid - platformFee

    // Update developer analytics
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('developer_id')
      .eq('id', agentId)
      .single()

    if (agent) {
      await supabaseAdmin
        .from('developer_analytics')
        .upsert({
          developer_id: agent.developer_id,
          date: new Date().toISOString().split('T')[0],
          revenue_cents: developerRevenue
        }, {
          onConflict: 'developer_id,date',
          ignoreDuplicates: false
        })
    }

    // Update platform analytics
    await supabaseAdmin
      .from('platform_analytics')
      .upsert({
        date: new Date().toISOString().split('T')[0],
        revenue_cents: invoice.amount_paid
      }, {
        onConflict: 'date',
        ignoreDuplicates: false
      })

    console.log(`Subscription payment: User ${userId} paid for agent ${agentId}`)

  } catch (error) {
    console.error('Error handling payment succeeded:', error)
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const { userId, agentId } = subscription.metadata

  try {
    // Deactivate the agent
    await supabaseAdmin
      .from('user_agents')
      .update({ 
        active: false, 
        status: 'cancelled',
        subscription_id: null
      })
      .eq('user_id', userId)
      .eq('agent_id', agentId)

    // Create notification
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type: 'subscription_cancelled',
      title: 'Subscription Cancelled',
      message: 'Your agent subscription has been cancelled and the agent has been deactivated.',
      data: { agentId },
      channels: ['in_app', 'email']
    })

    console.log(`Subscription cancelled: User ${userId} cancelled agent ${agentId}`)

  } catch (error) {
    console.error('Error handling subscription cancellation:', error)
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Extract user info from payment intent metadata if available
  const { userId, agentId } = paymentIntent.metadata

  if (userId) {
    try {
      // Create billing error notification
      await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        type: 'billing_error',
        title: 'Payment Failed',
        message: 'Your payment could not be processed. Please update your payment method.',
        data: { agentId, paymentIntentId: paymentIntent.id },
        channels: ['in_app', 'email']
      })

      console.log(`Payment failed: User ${userId} payment failed for agent ${agentId}`)

    } catch (error) {
      console.error('Error handling payment failure:', error)
    }
  }
}
