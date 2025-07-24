import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface EarningsFilter {
  start_date?: string
  end_date?: string
  agent_id?: string
  payment_status?: 'pending' | 'paid' | 'processing'
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly'
}

interface PayoutRequest {
  developer_id: string
  amount_cents: number
  payment_method: 'stripe' | 'paypal' | 'bank_transfer'
  currency: string
}

class DeveloperEarningsEngine {
  async getDeveloperEarnings(developerId: string, filter: EarningsFilter = {}) {
    try {
      // Get basic earnings summary
      const earningsSummary = await this.getEarningsSummary(developerId, filter)
      
      // Get detailed earnings breakdown
      const earningsBreakdown = await this.getEarningsBreakdown(developerId, filter)
      
      // Get agent performance data
      const agentPerformance = await this.getAgentPerformance(developerId, filter)
      
      // Get pending payouts
      const pendingPayouts = await this.getPendingPayouts(developerId)
      
      // Get payment history
      const paymentHistory = await this.getPaymentHistory(developerId, filter)

      // Get earnings trends
      const earningsTrends = await this.getEarningsTrends(developerId, filter)

      return {
        success: true,
        data: {
          earnings_summary: earningsSummary,
          earnings_breakdown: earningsBreakdown,
          agent_performance: agentPerformance,
          pending_payouts: pendingPayouts,
          payment_history: paymentHistory,
          earnings_trends: earningsTrends,
          generated_at: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Developer earnings error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async getEarningsSummary(developerId: string, filter: EarningsFilter) {
    // Build date filter
    let dateFilter = ''
    let params: any = { developer_id: developerId }
    
    if (filter.start_date) {
      dateFilter += ' AND created_at >= :start_date'
      params.start_date = filter.start_date
    }
    
    if (filter.end_date) {
      dateFilter += ' AND created_at <= :end_date'
      params.end_date = filter.end_date
    }

    // Get total earnings
    const { data: totalData } = await supabase.rpc('get_developer_earnings_summary', {
      p_developer_id: developerId,
      p_start_date: filter.start_date || null,
      p_end_date: filter.end_date || null
    })

    // Get this month vs last month comparison
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString()
    const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString()

    const { data: thisMonthData } = await supabase.rpc('get_developer_earnings_summary', {
      p_developer_id: developerId,
      p_start_date: thisMonthStart,
      p_end_date: null
    })

    const { data: lastMonthData } = await supabase.rpc('get_developer_earnings_summary', {
      p_developer_id: developerId,
      p_start_date: lastMonthStart,
      p_end_date: lastMonthEnd
    })

    return {
      total_earnings_cents: totalData?.[0]?.total_earnings || 0,
      total_purchases: totalData?.[0]?.total_purchases || 0,
      total_active_agents: totalData?.[0]?.active_agents || 0,
      average_price_cents: totalData?.[0]?.avg_price || 0,
      this_month: {
        earnings_cents: thisMonthData?.[0]?.total_earnings || 0,
        purchases: thisMonthData?.[0]?.total_purchases || 0,
        new_agents: thisMonthData?.[0]?.new_agents || 0
      },
      last_month: {
        earnings_cents: lastMonthData?.[0]?.total_earnings || 0,
        purchases: lastMonthData?.[0]?.total_purchases || 0
      },
      growth_rate: this.calculateGrowthRate(
        thisMonthData?.[0]?.total_earnings || 0,
        lastMonthData?.[0]?.total_earnings || 0
      )
    }
  }

  async getEarningsBreakdown(developerId: string, filter: EarningsFilter) {
    let query = supabase
      .from('agent_purchases')
      .select(`
        *,
        agents:agent_id(id, name, category, price_cents),
        users:user_id(id, email, display_name)
      `)
      .eq('agents.developer_id', developerId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    // Apply filters
    if (filter.start_date) {
      query = query.gte('created_at', filter.start_date)
    }
    
    if (filter.end_date) {
      query = query.lte('created_at', filter.end_date)
    }
    
    if (filter.agent_id) {
      query = query.eq('agent_id', filter.agent_id)
    }

    const { data, error } = await query.limit(100)

    if (error) throw error

    // Group by category and agent
    const breakdown = {
      by_agent: {} as Record<string, any>,
      by_category: {} as Record<string, any>,
      by_month: {} as Record<string, any>,
      recent_purchases: data || []
    }

    data?.forEach(purchase => {
      const agent = purchase.agents
      const category = agent?.category || 'uncategorized'
      const month = purchase.created_at.substring(0, 7) // YYYY-MM
      const agentId = agent?.id

      // By agent
      if (agentId) {
        if (!breakdown.by_agent[agentId]) {
          breakdown.by_agent[agentId] = {
            agent_name: agent.name,
            total_earnings: 0,
            purchase_count: 0,
            average_price: 0
          }
        }
        breakdown.by_agent[agentId].total_earnings += purchase.amount_cents
        breakdown.by_agent[agentId].purchase_count += 1
        breakdown.by_agent[agentId].average_price = 
          breakdown.by_agent[agentId].total_earnings / breakdown.by_agent[agentId].purchase_count
      }

      // By category
      if (!breakdown.by_category[category]) {
        breakdown.by_category[category] = {
          total_earnings: 0,
          purchase_count: 0,
          agent_count: new Set()
        }
      }
      breakdown.by_category[category].total_earnings += purchase.amount_cents
      breakdown.by_category[category].purchase_count += 1
      if (agentId) breakdown.by_category[category].agent_count.add(agentId)

      // By month
      if (!breakdown.by_month[month]) {
        breakdown.by_month[month] = {
          total_earnings: 0,
          purchase_count: 0
        }
      }
      breakdown.by_month[month].total_earnings += purchase.amount_cents
      breakdown.by_month[month].purchase_count += 1
    })

    // Convert Sets to counts for category data
    Object.keys(breakdown.by_category).forEach(category => {
      breakdown.by_category[category].agent_count = breakdown.by_category[category].agent_count.size
    })

    return breakdown
  }

  async getAgentPerformance(developerId: string, filter: EarningsFilter) {
    const { data, error } = await supabase
      .from('agents')
      .select(`
        id,
        name,
        category,
        price_cents,
        status,
        created_at,
        agent_purchases!inner(
          id,
          amount_cents,
          created_at,
          status
        ),
        agent_run_logs(
          id
        )
      `)
      .eq('developer_id', developerId)
      .eq('agent_purchases.status', 'completed')

    if (error) throw error

    const performance = data?.map(agent => {
      const purchases = agent.agent_purchases || []
      const totalEarnings = purchases.reduce((sum, p) => sum + p.amount_cents, 0)
      const totalRuns = agent.agent_run_logs?.length || 0

      return {
        agent_id: agent.id,
        agent_name: agent.name,
        category: agent.category,
        price_cents: agent.price_cents,
        status: agent.status,
        total_earnings: totalEarnings,
        total_purchases: purchases.length,
        total_runs: totalRuns,
        conversion_rate: totalRuns > 0 ? (purchases.length / totalRuns) * 100 : 0,
        average_monthly_earnings: this.calculateMonthlyAverage(purchases, agent.created_at),
        performance_score: this.calculatePerformanceScore(totalEarnings, purchases.length, totalRuns)
      }
    }) || []

    return performance.sort((a, b) => b.total_earnings - a.total_earnings)
  }

  async getPendingPayouts(developerId: string) {
    const { data, error } = await supabase
      .from('developer_payouts')
      .select('*')
      .eq('developer_id', developerId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  }

  async getPaymentHistory(developerId: string, filter: EarningsFilter) {
    let query = supabase
      .from('developer_payouts')
      .select('*')
      .eq('developer_id', developerId)
      .order('created_at', { ascending: false })

    if (filter.start_date) {
      query = query.gte('created_at', filter.start_date)
    }
    
    if (filter.end_date) {
      query = query.lte('created_at', filter.end_date)
    }

    if (filter.payment_status) {
      query = query.eq('status', filter.payment_status)
    }

    const { data, error } = await query.limit(50)

    if (error) throw error

    return data || []
  }

  async getEarningsTrends(developerId: string, filter: EarningsFilter) {
    const period = filter.period || 'monthly'
    const endDate = new Date(filter.end_date || new Date())
    let startDate = new Date()

    // Set start date based on period
    switch (period) {
      case 'daily':
        startDate.setDate(endDate.getDate() - 30) // Last 30 days
        break
      case 'weekly':
        startDate.setDate(endDate.getDate() - 12 * 7) // Last 12 weeks
        break
      case 'monthly':
        startDate.setMonth(endDate.getMonth() - 12) // Last 12 months
        break
      case 'yearly':
        startDate.setFullYear(endDate.getFullYear() - 5) // Last 5 years
        break
    }

    const { data, error } = await supabase.rpc('get_earnings_trends', {
      p_developer_id: developerId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
      p_period: period
    })

    if (error) throw error

    return data || []
  }

  async requestPayout(payoutRequest: PayoutRequest) {
    try {
      // Validate payout request
      const validation = await this.validatePayoutRequest(payoutRequest)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Create payout record
      const { data: payout, error } = await supabase
        .from('developer_payouts')
        .insert({
          developer_id: payoutRequest.developer_id,
          amount_cents: payoutRequest.amount_cents,
          currency: payoutRequest.currency,
          payment_method: payoutRequest.payment_method,
          status: 'pending',
          requested_at: new Date().toISOString(),
          metadata: {
            request_source: 'developer_dashboard',
            ip_address: null, // Would come from request in real implementation
            user_agent: null
          }
        })
        .select()
        .single()

      if (error) throw error

      // Send notification to admin
      await this.notifyAdminOfPayoutRequest(payout)

      // Log payout request
      await this.logPayoutRequest(payoutRequest.developer_id, payout.id)

      return {
        success: true,
        payout_id: payout.id,
        estimated_processing_time: '3-5 business days'
      }
    } catch (error) {
      console.error('Payout request error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async validatePayoutRequest(request: PayoutRequest) {
    // Check minimum payout amount ($10)
    if (request.amount_cents < 1000) {
      return {
        valid: false,
        error: 'Minimum payout amount is $10.00'
      }
    }

    // Check if developer has sufficient balance
    const balance = await this.getDeveloperBalance(request.developer_id)
    if (balance < request.amount_cents) {
      return {
        valid: false,
        error: 'Insufficient balance for payout request'
      }
    }

    // Check for pending payouts
    const { data: pendingPayouts } = await supabase
      .from('developer_payouts')
      .select('id')
      .eq('developer_id', request.developer_id)
      .in('status', ['pending', 'processing'])

    if (pendingPayouts && pendingPayouts.length > 0) {
      return {
        valid: false,
        error: 'You have a pending payout request. Please wait for it to be processed.'
      }
    }

    return { valid: true }
  }

  async getDeveloperBalance(developerId: string): Promise<number> {
    // Calculate total earnings
    const { data: earnings } = await supabase
      .from('agent_purchases')
      .select('amount_cents')
      .eq('agents.developer_id', developerId)
      .eq('status', 'completed')

    const totalEarnings = earnings?.reduce((sum, e) => sum + e.amount_cents, 0) || 0

    // Calculate total payouts
    const { data: payouts } = await supabase
      .from('developer_payouts')
      .select('amount_cents')
      .eq('developer_id', developerId)
      .in('status', ['paid', 'processing'])

    const totalPayouts = payouts?.reduce((sum, p) => sum + p.amount_cents, 0) || 0

    return totalEarnings - totalPayouts
  }

  async notifyAdminOfPayoutRequest(payout: any) {
    // In a real implementation, this would send an email or Slack notification
    console.log(`New payout request: ${payout.id} for $${payout.amount_cents / 100}`)
  }

  async logPayoutRequest(developerId: string, payoutId: string) {
    await supabase
      .from('developer_activity_logs')
      .insert({
        developer_id: developerId,
        activity_type: 'payout_requested',
        metadata: {
          payout_id: payoutId,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
  }

  calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  calculateMonthlyAverage(purchases: any[], createdAt: string): number {
    const agentAge = Date.now() - new Date(createdAt).getTime()
    const monthsActive = Math.max(1, agentAge / (30 * 24 * 60 * 60 * 1000))
    const totalEarnings = purchases.reduce((sum, p) => sum + p.amount_cents, 0)
    return totalEarnings / monthsActive
  }

  calculatePerformanceScore(earnings: number, purchases: number, runs: number): number {
    // Simple performance score algorithm
    const earningsScore = Math.min(earnings / 10000, 100) // Max 100 for $100+ earnings
    const purchaseScore = Math.min(purchases * 10, 100) // Max 100 for 10+ purchases
    const conversionScore = runs > 0 ? Math.min((purchases / runs) * 1000, 100) : 0
    
    return Math.round((earningsScore + purchaseScore + conversionScore) / 3)
  }
}

const earningsEngine = new DeveloperEarningsEngine()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const developerId = searchParams.get('developer_id')
    const type = searchParams.get('type')

    if (!developerId) {
      return NextResponse.json({ error: 'Missing developer_id' }, { status: 400 })
    }

    const filter: EarningsFilter = {
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      agent_id: searchParams.get('agent_id') || undefined,
      payment_status: searchParams.get('payment_status') as any || undefined,
      period: searchParams.get('period') as any || 'monthly'
    }

    switch (type) {
      case 'dashboard':
        const dashboardData = await earningsEngine.getDeveloperEarnings(developerId, filter)
        return NextResponse.json(dashboardData)

      case 'balance':
        const balance = await earningsEngine.getDeveloperBalance(developerId)
        return NextResponse.json({ 
          success: true, 
          balance_cents: balance,
          balance_formatted: `$${(balance / 100).toFixed(2)}`
        })

      default:
        const earningsData = await earningsEngine.getDeveloperEarnings(developerId, filter)
        return NextResponse.json(earningsData)
    }
  } catch (error) {
    console.error('Developer earnings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'request_payout':
        const payoutResult = await earningsEngine.requestPayout(body.payout_request)
        return NextResponse.json(payoutResult)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Developer earnings POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
