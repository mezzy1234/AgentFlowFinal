import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/users/[id]/integrations
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: userId } = params;
    const requestUserId = request.headers.get('user-id');

    // Verify user can access their own integrations
    if (requestUserId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's connected integrations
    const { data: userIntegrations, error } = await supabase
      .from('user_credentials')
      .select(`
        *,
        integrations (
          id,
          name,
          slug,
          description,
          logo_url,
          category,
          auth_type,
          documentation_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user integrations:', error);
      return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
    }

    // Transform data to match expected format
    const transformedIntegrations = userIntegrations?.map((ui: any) => ({
      id: ui.id,
      integration_id: ui.integration_id,
      user_id: ui.user_id,
      name: ui.name,
      status: ui.status,
      auth_data_encrypted: ui.auth_data_encrypted,
      last_sync_at: ui.last_sync_at,
      error_message: ui.error_message,
      created_at: ui.created_at,
      updated_at: ui.updated_at,
      integration: ui.integrations
    })) || [];

    return NextResponse.json({ integrations: transformedIntegrations });

  } catch (error) {
    console.error('Error in user integrations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users/[id]/integrations - Connect new integration
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: userId } = params;
    const requestUserId = request.headers.get('user-id');
    const body = await request.json();

    if (requestUserId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { integration_id, name, auth_data } = body;

    if (!integration_id || !auth_data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if integration exists
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integration_id)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Check if user already has this integration connected
    const { data: existingCredential } = await supabase
      .from('user_credentials')
      .select('id')
      .eq('user_id', userId)
      .eq('integration_id', integration_id)
      .single();

    if (existingCredential) {
      return NextResponse.json({ error: 'Integration already connected' }, { status: 400 });
    }

    // In a real implementation, you would:
    // 1. Encrypt the auth_data
    // 2. Validate the credentials by testing the connection
    // 3. Store the encrypted credentials

    const { data: credential, error } = await supabase
      .from('user_credentials')
      .insert({
        user_id: userId,
        integration_id,
        name: name || integration.name,
        status: 'connected', // In real implementation, test connection first
        auth_data_encrypted: JSON.stringify(auth_data), // Should be properly encrypted
        last_sync_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating credential:', error);
      return NextResponse.json({ error: 'Failed to connect integration' }, { status: 500 });
    }

    return NextResponse.json({ credential });

  } catch (error) {
    console.error('Error in connect integration API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
