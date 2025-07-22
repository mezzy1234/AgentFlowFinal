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
    // Get daily revenue data for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: receipts, error } = await supabase
      .from('purchase_receipts')
      .select(`
        created_at,
        amount_cents,
        developer_amount_cents,
        platform_amount_cents
      `)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching revenue data:', error)
      return NextResponse.json(
        { error: 'Failed to fetch revenue data' },
        { status: 500 }
      )
    }

    // Group by date and sum amounts
    const revenueMap = new Map<string, {
      amount: number
      developer_amount: number
      platform_amount: number
    }>()

    receipts?.forEach(receipt => {
      const date = new Date(receipt.created_at).toISOString().split('T')[0]
      const existing = revenueMap.get(date) || {
        amount: 0,
        developer_amount: 0,
        platform_amount: 0
      }
      
      revenueMap.set(date, {
        amount: existing.amount + receipt.amount_cents,
        developer_amount: existing.developer_amount + receipt.developer_amount_cents,
        platform_amount: existing.platform_amount + receipt.platform_amount_cents
      })
    })

    // Convert to array format
    const revenue = Array.from(revenueMap.entries()).map(([date, data]) => ({
      date,
      amount: data.amount,
      developer_amount: data.developer_amount,
      platform_amount: data.platform_amount
    }))

    // Fill in missing dates with zero values
    const fullRevenue: Array<{
      date: string
      amount: number
      developer_amount: number
      platform_amount: number
    }> = []
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const existingData = revenue.find(r => r.date === dateStr)
      fullRevenue.push({
        date: dateStr,
        amount: existingData?.amount || 0,
        developer_amount: existingData?.developer_amount || 0,
        platform_amount: existingData?.platform_amount || 0
      })
    }

    return NextResponse.json({
      revenue: fullRevenue
    })

  } catch (error) {
    console.error('Error in revenue API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
