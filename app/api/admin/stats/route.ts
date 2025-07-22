import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function GET() {
  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // Get total agents
    const { count: totalAgents } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })

    // Get active agents
    const { count: activeAgents } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')

    // Get pending agents
    const { count: pendingAgents } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Get total revenue
    const { data: revenueData } = await supabase
      .from('purchase_receipts')
      .select('amount_cents')

    const totalRevenue = revenueData?.reduce((sum, receipt) => sum + receipt.amount_cents, 0) || 0

    // Get current month revenue
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const { data: monthlyRevenueData } = await supabase
      .from('purchase_receipts')
      .select('amount_cents')
      .gte('created_at', currentMonth.toISOString())

    const monthlyRevenue = monthlyRevenueData?.reduce((sum, receipt) => sum + receipt.amount_cents, 0) || 0

    // Get previous month for growth calculation
    const previousMonth = new Date(currentMonth)
    previousMonth.setMonth(previousMonth.getMonth() - 1)

    const { data: previousMonthRevenueData } = await supabase
      .from('purchase_receipts')
      .select('amount_cents')
      .gte('created_at', previousMonth.toISOString())
      .lt('created_at', currentMonth.toISOString())

    const previousMonthRevenue = previousMonthRevenueData?.reduce((sum, receipt) => sum + receipt.amount_cents, 0) || 0

    // Calculate growth percentages
    const revenueGrowth = previousMonthRevenue > 0 
      ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : monthlyRevenue > 0 ? 100 : 0

    // Get user growth (simplified - comparing this month vs last month new users)
    const { count: currentMonthUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', currentMonth.toISOString())

    const { count: previousMonthUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', previousMonth.toISOString())
      .lt('created_at', currentMonth.toISOString())

    const userGrowth = (previousMonthUsers || 0) > 0 
      ? (((currentMonthUsers || 0) - (previousMonthUsers || 0)) / (previousMonthUsers || 0)) * 100
      : (currentMonthUsers || 0) > 0 ? 100 : 0

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalAgents: totalAgents || 0,
      activeAgents: activeAgents || 0,
      pendingAgents: pendingAgents || 0,
      totalRevenue,
      monthlyRevenue,
      userGrowth: Math.round(userGrowth * 10) / 10,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10
    })

  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
