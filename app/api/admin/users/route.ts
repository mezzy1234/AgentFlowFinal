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
    // Get users with their purchase data
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        plan,
        created_at,
        last_sign_in_at
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      )
    }

    // Get purchase data for each user
    const userIds = profiles?.map(p => p.id) || []
    
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchase_receipts')
      .select('user_id, amount_cents')
      .in('user_id', userIds)

    const { data: userAgents, error: agentsError } = await supabase
      .from('user_agents')
      .select('user_id')
      .in('user_id', userIds)

    // Aggregate purchase data by user
    const purchaseMap = new Map<string, { total_spent: number; agents_purchased: number }>()
    
    purchases?.forEach(purchase => {
      const existing = purchaseMap.get(purchase.user_id) || { total_spent: 0, agents_purchased: 0 }
      purchaseMap.set(purchase.user_id, {
        total_spent: existing.total_spent + purchase.amount_cents,
        agents_purchased: existing.agents_purchased + 1
      })
    })

    // Count agents per user
    const agentCountMap = new Map<string, number>()
    userAgents?.forEach(ua => {
      agentCountMap.set(ua.user_id, (agentCountMap.get(ua.user_id) || 0) + 1)
    })

    // Format user data
    const users = profiles?.map(profile => {
      const purchaseData = purchaseMap.get(profile.id) || { total_spent: 0, agents_purchased: 0 }
      const agentCount = agentCountMap.get(profile.id) || 0
      
      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role || 'customer',
        plan: profile.plan || 'free',
        total_spent: purchaseData.total_spent,
        agents_purchased: Math.max(purchaseData.agents_purchased, agentCount),
        last_active: profile.last_sign_in_at,
        created_at: profile.created_at
      }
    }) || []

    return NextResponse.json({
      users
    })

  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
