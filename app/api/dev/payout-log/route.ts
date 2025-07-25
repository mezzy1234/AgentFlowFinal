import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PayoutLogEntry {
  developer_id: string;
  amount_cents: number;
  stripe_transfer_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  currency: string;
  payout_method: 'stripe' | 'paypal' | 'bank_transfer';
  metadata?: Record<string, any>;
  fee_cents?: number;
  net_amount_cents?: number;
}

// GET payout logs
export async function GET(request: NextRequest) {
  try {
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
    const developerId = searchParams.get('developerId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check if user is admin or requesting their own data
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.is_admin;
    const requestedUserId = developerId || user.id;

    if (!isAdmin && requestedUserId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from('payout_logs')
      .select(`
        *,
        developer_profiles!inner(
          user_id,
          display_name,
          stripe_account_id
        )
      `);

    // Apply filters
    if (requestedUserId && requestedUserId !== 'all') {
      query = query.eq('developer_id', requestedUserId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: payoutLogs, error: logsError, count } = await query;

    if (logsError) {
      console.error('Failed to fetch payout logs:', logsError);
      return NextResponse.json({ error: 'Failed to fetch payout logs' }, { status: 500 });
    }

    // Get summary statistics
    const stats = await getPayoutStats(
      requestedUserId, 
      startDate || undefined, 
      endDate || undefined
    );

    return NextResponse.json({
      payoutLogs: payoutLogs || [],
      pagination: {
        offset,
        limit,
        total: count || 0
      },
      stats
    });

  } catch (error) {
    console.error('Get payout logs error:', error);
    return NextResponse.json({ 
      error: 'Failed to get payout logs',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// POST endpoint for creating payout entries
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body: PayoutLogEntry = await request.json();
    const {
      developer_id,
      amount_cents,
      stripe_transfer_id,
      status = 'pending',
      currency = 'usd',
      payout_method,
      metadata = {},
      fee_cents = 0,
      net_amount_cents
    } = body;

    if (!developer_id || !amount_cents || !payout_method) {
      return NextResponse.json({ 
        error: 'Developer ID, amount, and payout method are required' 
      }, { status: 400 });
    }

    // Validate developer exists
    const { data: developer } = await supabase
      .from('developer_profiles')
      .select('user_id, stripe_account_id')
      .eq('user_id', developer_id)
      .single();

    if (!developer) {
      return NextResponse.json({ error: 'Developer not found' }, { status: 404 });
    }

    // Calculate net amount if not provided
    const calculatedNetAmount = net_amount_cents || (amount_cents - fee_cents);

    // Create payout log entry
    const { data: payoutLog, error: payoutError } = await supabase
      .from('payout_logs')
      .insert({
        developer_id,
        amount_cents,
        stripe_transfer_id,
        status,
        currency,
        payout_method,
        metadata,
        fee_cents,
        net_amount_cents: calculatedNetAmount,
        processed_by: user.id,
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (payoutError) {
      console.error('Failed to create payout log:', payoutError);
      return NextResponse.json({ error: 'Failed to create payout log' }, { status: 500 });
    }

    // Update developer balance if payout is completed
    if (status === 'completed') {
      await updateDeveloperBalance(developer_id, -calculatedNetAmount);
    }

    // Send notification to developer
    await sendPayoutNotification(developer_id, payoutLog);

    return NextResponse.json({ 
      success: true, 
      payoutLog,
      message: 'Payout log created successfully'
    });

  } catch (error) {
    console.error('Create payout log error:', error);
    return NextResponse.json({ 
      error: 'Failed to create payout log',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// PUT endpoint for updating payout status
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { payoutId, status, stripe_transfer_id, error_message, metadata } = body;

    if (!payoutId || !status) {
      return NextResponse.json({ error: 'Payout ID and status are required' }, { status: 400 });
    }

    // Get existing payout log
    const { data: existingPayout } = await supabase
      .from('payout_logs')
      .select('*')
      .eq('id', payoutId)
      .single();

    if (!existingPayout) {
      return NextResponse.json({ error: 'Payout log not found' }, { status: 404 });
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    if (stripe_transfer_id) {
      updateData.stripe_transfer_id = stripe_transfer_id;
    }

    if (error_message) {
      updateData.error_message = error_message;
    }

    if (metadata) {
      updateData.metadata = { ...existingPayout.metadata, ...metadata };
    }

    // Update payout log
    const { data: updatedPayout, error: updateError } = await supabase
      .from('payout_logs')
      .update(updateData)
      .eq('id', payoutId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update payout log:', updateError);
      return NextResponse.json({ error: 'Failed to update payout log' }, { status: 500 });
    }

    // Handle status changes
    if (existingPayout.status !== status) {
      await handlePayoutStatusChange(existingPayout, status, user.id);
    }

    return NextResponse.json({ 
      success: true, 
      payoutLog: updatedPayout,
      message: 'Payout log updated successfully'
    });

  } catch (error) {
    console.error('Update payout log error:', error);
    return NextResponse.json({ 
      error: 'Failed to update payout log',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// Get payout statistics
async function getPayoutStats(developerId?: string, startDate?: string, endDate?: string) {
  try {
    let query = supabase
      .from('payout_logs')
      .select('status, amount_cents, net_amount_cents, fee_cents, created_at');

    if (developerId && developerId !== 'all') {
      query = query.eq('developer_id', developerId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: payouts } = await query;

    if (!payouts?.length) {
      return {
        totalPayouts: 0,
        totalAmount: 0,
        totalFees: 0,
        totalNet: 0,
        completedPayouts: 0,
        pendingPayouts: 0,
        failedPayouts: 0,
        averageAmount: 0
      };
    }

    const stats = {
      totalPayouts: payouts.length,
      totalAmount: payouts.reduce((sum, p) => sum + p.amount_cents, 0),
      totalFees: payouts.reduce((sum, p) => sum + (p.fee_cents || 0), 0),
      totalNet: payouts.reduce((sum, p) => sum + (p.net_amount_cents || 0), 0),
      completedPayouts: payouts.filter(p => p.status === 'completed').length,
      pendingPayouts: payouts.filter(p => p.status === 'pending' || p.status === 'processing').length,
      failedPayouts: payouts.filter(p => p.status === 'failed').length,
      averageAmount: 0
    };

    stats.averageAmount = stats.totalPayouts > 0 ? stats.totalAmount / stats.totalPayouts : 0;

    return stats;

  } catch (error) {
    console.error('Failed to get payout stats:', error);
    return {
      totalPayouts: 0,
      totalAmount: 0,
      totalFees: 0,
      totalNet: 0,
      completedPayouts: 0,
      pendingPayouts: 0,
      failedPayouts: 0,
      averageAmount: 0
    };
  }
}

// Update developer balance
async function updateDeveloperBalance(developerId: string, amountChange: number) {
  try {
    const { data: balance } = await supabase
      .from('developer_balances')
      .select('available_balance_cents, total_earned_cents')
      .eq('developer_id', developerId)
      .single();

    if (balance) {
      await supabase
        .from('developer_balances')
        .update({
          available_balance_cents: balance.available_balance_cents + amountChange,
          updated_at: new Date().toISOString()
        })
        .eq('developer_id', developerId);
    }
  } catch (error) {
    console.error('Failed to update developer balance:', error);
  }
}

// Handle payout status changes
async function handlePayoutStatusChange(payout: any, newStatus: string, updatedBy: string) {
  try {
    switch (newStatus) {
      case 'completed':
        // Deduct from developer balance if not already done
        if (payout.status !== 'completed') {
          await updateDeveloperBalance(payout.developer_id, -payout.net_amount_cents);
        }
        break;
      
      case 'failed':
      case 'cancelled':
        // Restore to developer balance if previously completed
        if (payout.status === 'completed') {
          await updateDeveloperBalance(payout.developer_id, payout.net_amount_cents);
        }
        break;
    }

    // Log the status change
    await supabase
      .from('payout_status_history')
      .insert({
        payout_id: payout.id,
        from_status: payout.status,
        to_status: newStatus,
        changed_by: updatedBy,
        changed_at: new Date().toISOString()
      });

  } catch (error) {
    console.error('Failed to handle payout status change:', error);
  }
}

// Send payout notification
async function sendPayoutNotification(developerId: string, payout: any) {
  try {
    await supabase
      .from('notifications')
      .insert({
        user_id: developerId,
        type: 'payout_update',
        title: `Payout ${payout.status}`,
        message: `Your payout of $${(payout.net_amount_cents / 100).toFixed(2)} is ${payout.status}`,
        data: {
          payout_id: payout.id,
          amount_cents: payout.net_amount_cents,
          status: payout.status
        },
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to send payout notification:', error);
  }
}
