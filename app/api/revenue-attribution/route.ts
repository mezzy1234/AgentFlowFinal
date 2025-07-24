import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RevenueTransaction {
  transaction_type: string
  revenue_source_id: string
  agent_id?: string
  user_id: string
  developer_id?: string
  gross_amount_cents: number
  stripe_payment_intent_id?: string
  bundle_id?: string
  referral_source?: string
  campaign_id?: string
  session_id?: string
  metadata?: any
}

interface PayoutRequest {
  developer_id: string
  period_start: string
  period_end: string
  payout_method?: string
  payout_account_id?: string
}

class RevenueAttributionManager {
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
  }

  async createRevenueTransaction(
    transactionData: RevenueTransaction
  ): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('create_revenue_transaction', {
        p_transaction_type: transactionData.transaction_type,
        p_revenue_source_id: transactionData.revenue_source_id,
        p_agent_id: transactionData.agent_id,
        p_user_id: transactionData.user_id,
        p_developer_id: transactionData.developer_id,
        p_gross_amount_cents: transactionData.gross_amount_cents,
        p_stripe_payment_intent_id: transactionData.stripe_payment_intent_id,
        p_metadata: transactionData.metadata || {}
      })

      if (error) {
        console.error('Revenue transaction creation error:', error)
        return { success: false, error: 'Failed to create revenue transaction' }
      }

      return { success: true, transaction_id: data }
    } catch (error) {
      console.error('Revenue transaction exception:', error)
      return { success: false, error: 'Revenue transaction creation failed' }
    }
  }

  async processRevenueTransaction(
    transactionId: string,
    status: string = 'completed',
    stripeChargeId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('revenue_transactions')
        .update({
          status,
          stripe_charge_id: stripeChargeId,
          processed_at: new Date().toISOString()
        })
        .eq('id', transactionId)

      if (error) {
        return { success: false, error: 'Failed to update transaction status' }
      }

      // Update commission tracking status
      await supabase
        .from('commission_tracking')
        .update({ status: status === 'completed' ? 'paid' : 'failed' })
        .eq('transaction_id', transactionId)

      return { success: true }
    } catch (error) {
      console.error('Transaction processing error:', error)
      return { success: false, error: 'Transaction processing failed' }
    }
  }

  async createDeveloperPayout(
    payoutData: PayoutRequest
  ): Promise<{ success: boolean; payout_id?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('create_developer_payout', {
        p_developer_id: payoutData.developer_id,
        p_period_start: payoutData.period_start,
        p_period_end: payoutData.period_end
      })

      if (error) {
        console.error('Developer payout creation error:', error)
        return { success: false, error: 'Failed to create developer payout' }
      }

      // Update payout details if provided
      if (payoutData.payout_method || payoutData.payout_account_id) {
        await supabase
          .from('developer_payouts')
          .update({
            payout_method: payoutData.payout_method,
            payout_account_id: payoutData.payout_account_id
          })
          .eq('id', data)
      }

      return { success: true, payout_id: data }
    } catch (error) {
      console.error('Developer payout exception:', error)
      return { success: false, error: 'Developer payout creation failed' }
    }
  }

  async processDeveloperPayout(
    payoutId: string,
    status: string,
    stripeTransferId?: string,
    failureReason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      }

      if (status === 'processing') {
        updateData.initiated_at = new Date().toISOString()
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
        updateData.stripe_transfer_id = stripeTransferId
      } else if (status === 'failed') {
        updateData.failure_reason = failureReason
      }

      const { error } = await supabase
        .from('developer_payouts')
        .update(updateData)
        .eq('id', payoutId)

      if (error) {
        return { success: false, error: 'Failed to update payout status' }
      }

      return { success: true }
    } catch (error) {
      console.error('Payout processing error:', error)
      return { success: false, error: 'Payout processing failed' }
    }
  }

  async getRevenueAnalytics(
    entityType: string,
    entityId?: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('get_revenue_analytics', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_period_start: periodStart,
        p_period_end: periodEnd
      })

      if (error || !data || data.length === 0) {
        return { success: false, error: 'Failed to fetch revenue analytics' }
      }

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Revenue analytics error:', error)
      return { success: false, error: 'Failed to fetch revenue analytics' }
    }
  }

  async getDeveloperRevenue(
    developerId: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: transactions, error } = await supabase
        .from('revenue_transactions')
        .select(`
          id, transaction_type, gross_amount_cents, developer_amount_cents, 
          platform_fee_cents, stripe_fee_cents, status, created_at,
          agent_id, bundle_id, agents(name), agent_bundles(name)
        `)
        .eq('developer_id', developerId)
        .eq('status', 'completed')
        .gte('created_at', periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lte('created_at', periodEnd || new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: 'Failed to fetch developer revenue' }
      }

      // Calculate totals
      const totals = transactions.reduce((acc, txn) => {
        acc.total_gross += txn.gross_amount_cents || 0
        acc.total_developer += txn.developer_amount_cents || 0
        acc.total_platform_fees += txn.platform_fee_cents || 0
        acc.total_stripe_fees += txn.stripe_fee_cents || 0
        acc.transaction_count += 1
        return acc
      }, {
        total_gross: 0,
        total_developer: 0,
        total_platform_fees: 0,
        total_stripe_fees: 0,
        transaction_count: 0
      })

      // Group by agent/bundle
      const byEntity = transactions.reduce((acc: any, txn: any) => {
        const key = txn.agent_id || txn.bundle_id || 'other'
        const name = (Array.isArray(txn.agents) ? txn.agents[0]?.name : txn.agents?.name) || 
                    (Array.isArray(txn.agent_bundles) ? txn.agent_bundles[0]?.name : txn.agent_bundles?.name) || 
                    'Other'
        
        if (!acc[key]) {
          acc[key] = {
            entity_id: key,
            entity_name: name,
            entity_type: txn.agent_id ? 'agent' : txn.bundle_id ? 'bundle' : 'other',
            revenue: 0,
            transactions: 0
          }
        }
        
        acc[key].revenue += txn.developer_amount_cents || 0
        acc[key].transactions += 1
        return acc
      }, {})

      return {
        success: true,
        data: {
          ...totals,
          transactions,
          breakdown_by_entity: Object.values(byEntity)
        }
      }
    } catch (error) {
      console.error('Developer revenue error:', error)
      return { success: false, error: 'Failed to fetch developer revenue' }
    }
  }

  async getDeveloperPayouts(
    developerId: string,
    status?: string,
    limit: number = 20
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      let query = supabase
        .from('developer_payouts')
        .select('*')
        .eq('developer_id', developerId)

      if (status) {
        query = query.eq('status', status)
      }

      const { data: payouts, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        return { success: false, error: 'Failed to fetch developer payouts' }
      }

      return { success: true, data: payouts }
    } catch (error) {
      console.error('Developer payouts error:', error)
      return { success: false, error: 'Failed to fetch developer payouts' }
    }
  }

  async getPlatformRevenue(
    periodStart?: string,
    periodEnd?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const analytics = await this.getRevenueAnalytics('platform', undefined, periodStart, periodEnd)
      
      if (!analytics.success) {
        return analytics
      }

      // Get additional platform metrics using raw queries
      const { data: topDevelopers } = await supabase
        .rpc('get_top_revenue_developers', {
          p_period_start: periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_period_end: periodEnd || new Date().toISOString().split('T')[0],
          p_limit: 10
        })

      const { data: topAgents } = await supabase
        .rpc('get_top_revenue_agents', {
          p_period_start: periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_period_end: periodEnd || new Date().toISOString().split('T')[0],
          p_limit: 10
        })

      return {
        success: true,
        data: {
          ...analytics.data,
          top_developers: topDevelopers || [],
          top_agents: topAgents || []
        }
      }
    } catch (error) {
      console.error('Platform revenue error:', error)
      return { success: false, error: 'Failed to fetch platform revenue' }
    }
  }

  async createRevenueSource(
    name: string,
    sourceType: string,
    commissionRate: number = 0.15,
    developerRate: number = 0.85
  ): Promise<{ success: boolean; source_id?: string; error?: string }> {
    try {
      const sourceId = this.generateId('rs')

      const { error } = await supabase
        .from('revenue_sources')
        .insert({
          id: sourceId,
          name,
          source_type: sourceType,
          commission_rate: commissionRate,
          developer_rate: developerRate,
          created_at: new Date().toISOString()
        })

      if (error) {
        return { success: false, error: 'Failed to create revenue source' }
      }

      return { success: true, source_id: sourceId }
    } catch (error) {
      console.error('Revenue source creation error:', error)
      return { success: false, error: 'Revenue source creation failed' }
    }
  }
}

const revenueManager = new RevenueAttributionManager()

// POST /api/revenue-attribution - Create transactions, payouts, or sources
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create_transaction':
        return await handleCreateTransaction(body)
      case 'process_transaction':
        return await handleProcessTransaction(body)
      case 'create_payout':
        return await handleCreatePayout(body)
      case 'process_payout':
        return await handleProcessPayout(body)
      case 'create_source':
        return await handleCreateSource(body)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Revenue Attribution API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleCreateTransaction(body: any) {
  const {
    transaction_type, revenue_source_id, agent_id, user_id, developer_id,
    gross_amount_cents, stripe_payment_intent_id, bundle_id, referral_source,
    campaign_id, session_id, metadata
  } = body

  if (!transaction_type || !revenue_source_id || !user_id || !gross_amount_cents) {
    return NextResponse.json({ error: 'Missing required transaction data' }, { status: 400 })
  }

  const result = await revenueManager.createRevenueTransaction({
    transaction_type,
    revenue_source_id,
    agent_id,
    user_id,
    developer_id,
    gross_amount_cents,
    stripe_payment_intent_id,
    bundle_id,
    referral_source,
    campaign_id,
    session_id,
    metadata
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ transaction_id: result.transaction_id })
}

async function handleProcessTransaction(body: any) {
  const { transaction_id, status, stripe_charge_id } = body

  if (!transaction_id || !status) {
    return NextResponse.json({ error: 'Missing transaction_id or status' }, { status: 400 })
  }

  const result = await revenueManager.processRevenueTransaction(transaction_id, status, stripe_charge_id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

async function handleCreatePayout(body: any) {
  const { developer_id, period_start, period_end, payout_method, payout_account_id } = body

  if (!developer_id || !period_start || !period_end) {
    return NextResponse.json({ error: 'Missing required payout data' }, { status: 400 })
  }

  const result = await revenueManager.createDeveloperPayout({
    developer_id,
    period_start,
    period_end,
    payout_method,
    payout_account_id
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ payout_id: result.payout_id })
}

async function handleProcessPayout(body: any) {
  const { payout_id, status, stripe_transfer_id, failure_reason } = body

  if (!payout_id || !status) {
    return NextResponse.json({ error: 'Missing payout_id or status' }, { status: 400 })
  }

  const result = await revenueManager.processDeveloperPayout(payout_id, status, stripe_transfer_id, failure_reason)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

async function handleCreateSource(body: any) {
  const { name, source_type, commission_rate, developer_rate } = body

  if (!name || !source_type) {
    return NextResponse.json({ error: 'Missing name or source_type' }, { status: 400 })
  }

  const result = await revenueManager.createRevenueSource(name, source_type, commission_rate, developer_rate)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ source_id: result.source_id })
}

// GET /api/revenue-attribution - Get revenue analytics and data
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const entityId = searchParams.get('entity_id')
  const developerId = searchParams.get('developer_id')
  const periodStart = searchParams.get('period_start')
  const periodEnd = searchParams.get('period_end')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    switch (type) {
      case 'platform_revenue':
        const platformData = await revenueManager.getPlatformRevenue(
          periodStart || undefined,
          periodEnd || undefined
        )
        if (!platformData.success) {
          return NextResponse.json({ error: platformData.error }, { status: 400 })
        }
        return NextResponse.json(platformData.data)

      case 'developer_revenue':
        if (!developerId) {
          return NextResponse.json({ error: 'Missing developer_id' }, { status: 400 })
        }
        const developerData = await revenueManager.getDeveloperRevenue(
          developerId,
          periodStart || undefined,
          periodEnd || undefined
        )
        if (!developerData.success) {
          return NextResponse.json({ error: developerData.error }, { status: 400 })
        }
        return NextResponse.json(developerData.data)

      case 'developer_payouts':
        if (!developerId) {
          return NextResponse.json({ error: 'Missing developer_id' }, { status: 400 })
        }
        const payouts = await revenueManager.getDeveloperPayouts(
          developerId,
          status || undefined,
          limit
        )
        if (!payouts.success) {
          return NextResponse.json({ error: payouts.error }, { status: 400 })
        }
        return NextResponse.json({ payouts: payouts.data })

      case 'analytics':
        const entityType = searchParams.get('entity_type') || 'platform'
        const analytics = await revenueManager.getRevenueAnalytics(
          entityType,
          entityId || undefined,
          periodStart || undefined,
          periodEnd || undefined
        )
        if (!analytics.success) {
          return NextResponse.json({ error: analytics.error }, { status: 400 })
        }
        return NextResponse.json(analytics.data)

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Revenue Attribution GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
