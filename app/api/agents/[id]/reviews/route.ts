import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/agents/[id]/reviews
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: agentId } = params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || 'newest';
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('agent_reviews')
      .select(`
        *,
        users (
          name,
          avatar_url,
          badge
        ),
        agent_review_responses (
          id,
          message,
          created_at,
          developer_name,
          developer_avatar
        )
      `)
      .eq('agent_id', agentId)
      .eq('flagged', false); // Don't show flagged reviews

    // Add search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,comment.ilike.%${search}%`);
    }

    // Add rating filter
    if (filter !== 'all') {
      if (filter === 'verified') {
        query = query.eq('is_verified_purchase', true);
      } else {
        const rating = parseInt(filter);
        if (rating >= 1 && rating <= 5) {
          query = query.eq('rating', rating);
        }
      }
    }

    // Add sorting
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'highest':
        query = query.order('rating', { ascending: false });
        break;
      case 'lowest':
        query = query.order('rating', { ascending: true });
        break;
      case 'helpful':
        query = query.order('helpful_count', { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data: reviews, error } = await query;

    if (error) {
      console.error('Error fetching reviews:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    // Transform the data to match expected format
    const transformedReviews = reviews?.map((review: any) => ({
      ...review,
      user_name: review.users?.name || 'Anonymous',
      user_avatar: review.users?.avatar_url,
      user_badge: review.users?.badge,
      developer_response: review.agent_review_responses?.[0] || undefined
    })) || [];

    return NextResponse.json({ reviews: transformedReviews });

  } catch (error) {
    console.error('Error in reviews API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/agents/[id]/reviews - Submit new review
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: agentId } = params;
    const body = await request.json();
    const userId = request.headers.get('user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      rating,
      title,
      comment,
      pros,
      cons,
      use_case,
      recommendation,
      execution_id
    } = body;

    // Validate required fields
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }

    if (!comment || comment.trim().length < 10) {
      return NextResponse.json({ error: 'Comment must be at least 10 characters' }, { status: 400 });
    }

    // Check if user already reviewed this agent
    const { data: existingReview } = await supabase
      .from('agent_reviews')
      .select('id')
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .single();

    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this agent' }, { status: 400 });
    }

    // Check if this is a verified purchase (user has executed the agent)
    let isVerifiedPurchase = false;
    if (execution_id) {
      const { data: execution } = await supabase
        .from('agent_execution_logs')
        .select('id')
        .eq('id', execution_id)
        .eq('user_id', userId)
        .eq('agent_id', agentId)
        .single();
      
      isVerifiedPurchase = !!execution;
    }

    // Insert review
    const { data: review, error } = await supabase
      .from('agent_reviews')
      .insert({
        agent_id: agentId,
        user_id: userId,
        rating,
        title: title?.trim() || null,
        comment: comment.trim(),
        pros: pros || [],
        cons: cons || [],
        use_case: use_case?.trim() || null,
        recommendation: recommendation || null,
        execution_id: execution_id || null,
        is_verified_purchase: isVerifiedPurchase,
        helpful_count: 0,
        not_helpful_count: 0,
        flagged: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating review:', error);
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
    }

    // Update agent average rating
    await updateAgentAverageRating(agentId);

    return NextResponse.json({ review });

  } catch (error) {
    console.error('Error in create review API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to update agent average rating
async function updateAgentAverageRating(agentId: string) {
  const { data: reviews } = await supabase
    .from('agent_reviews')
    .select('rating')
    .eq('agent_id', agentId)
    .eq('flagged', false);

  if (reviews && reviews.length > 0) {
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const reviewCount = reviews.length;

    await supabase
      .from('agents')
      .update({
        average_rating: averageRating,
        review_count: reviewCount
      })
      .eq('id', agentId);
  }
}
