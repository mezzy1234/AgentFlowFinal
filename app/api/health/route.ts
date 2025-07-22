import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        api: true,
        database: false,
        stripe: false
      }
    }

    // Database health check
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
        .single()

      if (!error) {
        health.checks.database = true
      }
    } catch (dbError) {
      console.error('Database health check failed:', dbError)
    }

    // Stripe health check
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
      await stripe.accounts.retrieve()
      health.checks.stripe = true
    } catch (stripeError) {
      console.error('Stripe health check failed:', stripeError)
    }

    // Determine overall status
    const allChecksHealthy = Object.values(health.checks).every(check => check === true)
    health.status = allChecksHealthy ? 'healthy' : 'degraded'

    return NextResponse.json(health, {
      status: allChecksHealthy ? 200 : 503
    })

  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}
