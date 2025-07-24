import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
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

    if (agent.status !== 'active') {
      return NextResponse.json({ error: 'Agent is not active' }, { status: 400 });
    }

    // Check if already installed
    const { data: existingInstall } = await supabase
      .from('user_agents')
      .select('*')
      .eq('user_id', user.id)
      .eq('agent_id', agentId)
      .single();

    if (existingInstall) {
      return NextResponse.json({ 
        success: true,
        message: 'Agent already installed',
        installation: existingInstall 
      });
    }

    // Install the agent
    const { data: installation, error: installError } = await supabase
      .from('user_agents')
      .insert({
        user_id: user.id,
        agent_id: agentId,
        status: 'installed',
        custom_settings: {},
        installed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (installError) {
      console.error('Failed to install agent:', installError);
      return NextResponse.json({ error: 'Failed to install agent' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Agent installed successfully',
      installation
    });

  } catch (error: any) {
    console.error('Agent install API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// GET endpoint to check installation status
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

    if (!agentId) {
      // Return all installed agents for user
      const { data: installations, error } = await supabase
        .from('user_agents')
        .select(`
          *,
          agents(
            id,
            name,
            description,
            category,
            status,
            total_runs,
            success_rate
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to fetch installations:', error);
        return NextResponse.json({ error: 'Failed to fetch installations' }, { status: 500 });
      }

      return NextResponse.json({
        installations: installations || []
      });
    }

    // Check specific agent installation
    const { data: installation, error } = await supabase
      .from('user_agents')
      .select(`
        *,
        agents(
          id,
          name,
          description,
          category,
          status,
          total_runs,
          success_rate
        )
      `)
      .eq('user_id', user.id)
      .eq('agent_id', agentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to check installation:', error);
      return NextResponse.json({ error: 'Failed to check installation' }, { status: 500 });
    }

    return NextResponse.json({
      installed: !!installation,
      installation
    });

  } catch (error: any) {
    console.error('Agent install check API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE endpoint to uninstall agent
export async function DELETE(request: NextRequest) {
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

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    // Uninstall the agent
    const { error } = await supabase
      .from('user_agents')
      .delete()
      .eq('user_id', user.id)
      .eq('agent_id', agentId);

    if (error) {
      console.error('Failed to uninstall agent:', error);
      return NextResponse.json({ error: 'Failed to uninstall agent' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Agent uninstalled successfully'
    });

  } catch (error: any) {
    console.error('Agent uninstall API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
