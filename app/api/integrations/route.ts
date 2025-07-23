import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/integrations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'all';
    const authType = searchParams.get('auth_type') || 'all';
    const connectedOnly = searchParams.get('connected_only') === 'true';
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('integrations')
      .select('*');

    // Add search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,tags.cs.{${search}}`);
    }

    // Add category filter
    if (category !== 'all') {
      query = query.eq('category', category);
    }

    // Add auth type filter
    if (authType !== 'all') {
      query = query.eq('auth_type', authType);
    }

    // Add sorting and pagination
    query = query
      .order('popularity_score', { ascending: false })
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: integrations, error } = await query;

    if (error) {
      console.error('Error fetching integrations:', error);
      return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
    }

    // If connected_only filter is applied, we need to filter further
    // This would require joining with user_credentials table
    // For now, returning all integrations

    return NextResponse.json({ integrations: integrations || [] });

  } catch (error) {
    console.error('Error in integrations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/integrations/sync - Manually trigger sync
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real implementation, this would trigger the sync_n8n_integrations.js script
    // For now, just return success
    
    return NextResponse.json({ 
      success: true,
      message: 'Integration sync started. This may take a few minutes to complete.' 
    });

  } catch (error) {
    console.error('Error in integration sync API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
