import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Revenue tracking and monetization API
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const body = await request.json();
    const { 
      agentId, 
      userId, 
      executionId, 
      pricingTier, 
      amountCents, 
      paymentMethod = 'credits',
      transactionType = 'execution'
    } = body;

    // Validate webhook signature for internal calls
    const webhookSignature = request.headers.get('x-webhook-signature');
    const expectedSignature = process.env.INTERNAL_WEBHOOK_SECRET;
    
    if (webhookSignature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Calculate revenue amounts
    const totalAmountCents = amountCents || agent.price_cents || 0;
    const platformFeeCents = Math.round(totalAmountCents * 0.3); // 30% platform fee
    const developerRevenueCents = totalAmountCents - platformFeeCents;

    // Record the transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('revenue_transactions')
      .insert({
        agent_id: agentId,
        user_id: userId,
        execution_id: executionId,
        transaction_type: transactionType,
        pricing_tier: pricingTier,
        total_amount_cents: totalAmountCents,
        platform_fee_cents: platformFeeCents,
        developer_revenue_cents: developerRevenueCents,
        payment_method: paymentMethod,
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Failed to record revenue transaction:', transactionError);
      return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 });
    }

    // Update agent analytics with revenue
    const today = new Date().toISOString().split('T')[0];
    
    // Get existing analytics for today
    const { data: existingAnalytics } = await supabase
      .from('agent_analytics')
      .select('revenue_cents, total_runs')
      .eq('agent_id', agentId)
      .eq('date', today)
      .single();

    const newRevenue = (existingAnalytics?.revenue_cents || 0) + developerRevenueCents;
    const newTotalRuns = (existingAnalytics?.total_runs || 0) + 1;

    const { error: analyticsError } = await supabase
      .from('agent_analytics')
      .upsert({
        agent_id: agentId,
        date: today,
        revenue_cents: newRevenue,
        total_runs: newTotalRuns
      }, {
        onConflict: 'agent_id,date'
      });

    if (analyticsError) {
      console.error('Failed to update agent analytics:', analyticsError);
    }

    // Update developer balance
    const { data: existingBalance } = await supabase
      .from('developer_balances')
      .select('available_balance_cents, total_earned_cents')
      .eq('developer_id', agent.created_by)
      .single();

    const newAvailableBalance = (existingBalance?.available_balance_cents || 0) + developerRevenueCents;
    const newTotalEarned = (existingBalance?.total_earned_cents || 0) + developerRevenueCents;

    const { error: balanceError } = await supabase
      .from('developer_balances')
      .upsert({
        developer_id: agent.created_by,
        available_balance_cents: newAvailableBalance,
        total_earned_cents: newTotalEarned,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'developer_id'
      });

    if (balanceError) {
      console.error('Failed to update developer balance:', balanceError);
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        totalAmount: totalAmountCents,
        platformFee: platformFeeCents,
        developerRevenue: developerRevenueCents,
        status: transaction.status
      }
    });

  } catch (error: any) {
    console.error('Revenue tracking API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// GET endpoint for revenue analytics
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get auth token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const timeframe = searchParams.get('timeframe') || '30d';
    const isDeveloper = searchParams.get('developer') === 'true';

    let daysBack = 30;
    if (timeframe === '7d') daysBack = 7;
    else if (timeframe === '90d') daysBack = 90;
    else if (timeframe === '1y') daysBack = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    if (isDeveloper) {
      // Developer revenue analytics
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', user.id)
        .single();

      if (profile?.account_type !== 'developer') {
        return NextResponse.json({ error: 'Developer access required' }, { status: 403 });
      }

      // Get developer's balance
      const { data: balance } = await supabase
        .from('developer_balances')
        .select('*')
        .eq('developer_id', user.id)
        .single();

      // Get developer's agent IDs first
      const { data: developerAgents } = await supabase
        .from('agents')
        .select('id')
        .eq('created_by', user.id);

      const agentIds = developerAgents?.map(a => a.id) || [];

      // Get recent transactions
      const { data: transactions, error: transError } = await supabase
        .from('revenue_transactions')
        .select(`
          *,
          agents(name)
        `)
        .gte('processed_at', startDate.toISOString())
        .in('agent_id', agentIds)
        .order('processed_at', { ascending: false })
        .limit(100);

      if (transError) {
        console.error('Failed to fetch developer transactions:', transError);
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
      }

      // Calculate summary stats
      const totalRevenue = transactions?.reduce((sum, t) => sum + (t.developer_revenue_cents || 0), 0) || 0;
      const totalTransactions = transactions?.length || 0;
      const avgRevenuePerTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Group by date for chart data
      const dailyRevenue: Record<string, number> = {};
      transactions?.forEach(t => {
        const date = t.processed_at?.split('T')[0];
        if (date) {
          dailyRevenue[date] = (dailyRevenue[date] || 0) + (t.developer_revenue_cents || 0);
        }
      });

      return NextResponse.json({
        balance: balance || {
          available_balance_cents: 0,
          total_earned_cents: 0,
          pending_payout_cents: 0
        },
        summary: {
          totalRevenueCents: totalRevenue,
          totalTransactions,
          avgRevenuePerTransactionCents: Math.round(avgRevenuePerTransaction),
          timeframe
        },
        transactions: transactions || [],
        chartData: Object.entries(dailyRevenue).map(([date, revenue]) => ({
          date,
          revenue
        }))
      });

    } else if (agentId) {
      // Agent-specific revenue analytics
      const { data: agent } = await supabase
        .from('agents')
        .select('created_by')
        .eq('id', agentId)
        .single();

      if (!agent || agent.created_by !== user.id) {
        return NextResponse.json({ error: 'Agent not found or access denied' }, { status: 403 });
      }

      const { data: analytics, error: analyticsError } = await supabase
        .from('agent_analytics')
        .select('*')
        .eq('agent_id', agentId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (analyticsError) {
        console.error('Failed to fetch agent analytics:', analyticsError);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
      }

      const totalRevenue = analytics?.reduce((sum, a) => sum + (a.revenue_cents || 0), 0) || 0;
      const totalRuns = analytics?.reduce((sum, a) => sum + (a.total_runs || 0), 0) || 0;
      const avgRevenuePerRun = totalRuns > 0 ? totalRevenue / totalRuns : 0;

      return NextResponse.json({
        agentId,
        summary: {
          totalRevenueCents: totalRevenue,
          totalRuns,
          avgRevenuePerRunCents: Math.round(avgRevenuePerRun),
          timeframe
        },
        chartData: analytics?.map(a => ({
          date: a.date,
          revenue: a.revenue_cents || 0,
          runs: a.total_runs || 0,
          uniqueUsers: a.unique_users || 0
        })) || []
      });

    } else {
      return NextResponse.json({ error: 'agentId parameter required for non-developer requests' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Revenue analytics API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
