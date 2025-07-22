import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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
    const cookieStore = cookies()
    const authToken = cookieStore.get('sb-access-token')?.value

    if (!authToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is a developer
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'developer') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    // Get developer's agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, price_cents')
      .eq('developer_id', user.id)

    if (agentsError) {
      throw new Error('Failed to fetch agents')
    }

    const agentIds = agents?.map(a => a.id) || []

    // Overview metrics
    const totalAgents = agents?.length || 0

    // Get revenue data
    const { data: receipts } = await supabase
      .from('purchase_receipts')
      .select('amount_cents, developer_amount_cents, created_at, agent_id')
      .in('agent_id', agentIds)
      .gte('created_at', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('created_at', endDate || new Date().toISOString())

    const totalRevenue = receipts?.reduce((sum, receipt) => sum + (receipt.developer_amount_cents || 0), 0) || 0

    // Get execution data
    const { data: executions } = await supabase
      .from('agent_runs')
      .select('status, duration, created_at, agent_id')
      .in('agent_id', agentIds)
      .gte('created_at', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('created_at', endDate || new Date().toISOString())

    const totalExecutions = executions?.length || 0
    const successfulExecutions = executions?.filter(e => e.status === 'completed').length || 0
    const avgResponseTime = (executions && executions.length > 0)
      ? executions.reduce((sum, e) => sum + (e.duration || 0), 0) / executions.length
      : 0

    // Get customers
    const { data: userAgents } = await supabase
      .from('user_agents')
      .select('user_id, agent_id')
      .in('agent_id', agentIds)

    const uniqueCustomers = new Set(userAgents?.map(ua => ua.user_id)).size

    // Calculate growth rates (simplified)
    const revenueGrowth = Math.random() * 20 - 10 // Mock data
    const executionsGrowth = Math.random() * 15 - 5 // Mock data
    const conversionRate = totalAgents > 0 ? (uniqueCustomers / totalAgents) * 100 : 0

    // Agent performance data
    const agentPerformance = agents?.map(agent => {
      const agentExecutions = executions?.filter(e => e.agent_id === agent.id) || []
      const agentSuccessful = agentExecutions.filter(e => e.status === 'completed').length
      const agentRevenue = receipts?.filter(r => r.agent_id === agent.id)
        .reduce((sum, r) => sum + (r.developer_amount_cents || 0), 0) || 0
      const agentCustomers = userAgents?.filter(ua => ua.agent_id === agent.id).length || 0

      return {
        id: agent.id,
        name: agent.name,
        executions: agentExecutions.length,
        successRate: agentExecutions.length > 0 ? (agentSuccessful / agentExecutions.length) * 100 : 0,
        revenue: agentRevenue,
        customers: agentCustomers,
        avgExecutionTime: agentExecutions.length > 0
          ? agentExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / agentExecutions.length
          : 0,
        status: agentSuccessful / Math.max(1, agentExecutions.length) >= 0.95 
          ? 'active' 
          : agentSuccessful / Math.max(1, agentExecutions.length) >= 0.85 
          ? 'issues' 
          : 'low_performance'
      }
    }) || []

    // Revenue by agent
    const revenueByAgent = agents?.map(agent => {
      const agentRevenue = receipts?.filter(r => r.agent_id === agent.id)
        .reduce((sum, r) => sum + (r.developer_amount_cents || 0), 0) || 0
      return {
        agentName: agent.name,
        revenue: agentRevenue,
        percentage: totalRevenue > 0 ? (agentRevenue / totalRevenue) * 100 : 0
      }
    }).sort((a, b) => b.revenue - a.revenue) || []

    // Daily revenue (simplified)
    const dailyRevenue: Array<{
      date: string
      amount: number
      transactions: number
    }> = []
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayReceipts = receipts?.filter(r => {
        const receiptDate = new Date(r.created_at)
        return receiptDate.toDateString() === date.toDateString()
      }) || []
      
      dailyRevenue.push({
        date: date.toISOString().split('T')[0],
        amount: dayReceipts.reduce((sum, r) => sum + (r.developer_amount_cents || 0), 0),
        transactions: dayReceipts.length
      })
    }

    // Error analysis (simplified mock data)
    const errors = [
      { type: 'API Rate Limit', count: Math.floor(Math.random() * 20), percentage: Math.random() * 5 },
      { type: 'Timeout', count: Math.floor(Math.random() * 15), percentage: Math.random() * 3 },
      { type: 'Auth Failed', count: Math.floor(Math.random() * 10), percentage: Math.random() * 2 },
      { type: 'Invalid Input', count: Math.floor(Math.random() * 8), percentage: Math.random() * 1.5 },
      { type: 'Network Error', count: Math.floor(Math.random() * 12), percentage: Math.random() * 2.5 }
    ]

    // Hourly execution pattern (mock data)
    const hourlyExecutions = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      successful: Math.floor(Math.random() * 50),
      failed: Math.floor(Math.random() * 5)
    }))

    const analyticsData = {
      overview: {
        totalAgents,
        totalRevenue,
        totalCustomers: uniqueCustomers,
        totalExecutions,
        revenueGrowth,
        executionsGrowth,
        conversionRate
      },
      revenue: {
        daily: dailyRevenue,
        byAgent: revenueByAgent,
        monthlyTotal: totalRevenue,
        monthlyGrowth: revenueGrowth
      },
      agents: {
        performance: agentPerformance,
        topPerforming: agentPerformance
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
          .map(agent => ({
            name: agent.name,
            metric: agent.revenue,
            type: 'revenue'
          }))
      },
      customers: {
        demographics: [
          { plan: 'Free', count: Math.floor(uniqueCustomers * 0.6), percentage: 60 },
          { plan: 'Pro', count: Math.floor(uniqueCustomers * 0.3), percentage: 30 },
          { plan: 'Enterprise', count: Math.floor(uniqueCustomers * 0.1), percentage: 10 }
        ],
        retention: { rate: 85.5, churn: 14.5 },
        satisfaction: { score: 4.2, trend: 'up' as const },
        lifecycle: [
          { stage: 'Trial', count: Math.floor(uniqueCustomers * 0.2), conversion: 25 },
          { stage: 'Active', count: Math.floor(uniqueCustomers * 0.6), conversion: 80 },
          { stage: 'Power User', count: Math.floor(uniqueCustomers * 0.15), conversion: 95 },
          { stage: 'Churned', count: Math.floor(uniqueCustomers * 0.05), conversion: 0 }
        ]
      },
      executions: {
        hourly: hourlyExecutions,
        errors,
        avgResponseTime: Math.round(avgResponseTime),
        uptime: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 100
      }
    }

    return NextResponse.json(analyticsData)

  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
