import { NextRequest, NextResponse } from 'next/server'
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action, reason } = await request.json()
    const agentId = params.id

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Update agent status
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    
    const { error: updateError } = await supabase
      .from('agents')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId)

    if (updateError) {
      console.error('Error updating agent status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update agent status' },
        { status: 500 }
      )
    }

    // Get agent details for notification
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        name,
        developer_id,
        profiles!inner (
          email,
          full_name
        )
      `)
      .eq('id', agentId)
      .single()

    if (agentError) {
      console.error('Error fetching agent details:', agentError)
      // Don't fail the main operation for notification issues
    }

    // Send notification to developer
    if (agent && (agent.profiles as any)?.email) {
      const notificationTitle = `Agent ${action === 'approve' ? 'Approved' : 'Rejected'}`
      const notificationMessage = action === 'approve'
        ? `Your agent "${agent.name}" has been approved and is now live in the marketplace!`
        : `Your agent "${agent.name}" has been rejected. ${reason ? `Reason: ${reason}` : 'Please review and resubmit if needed.'}`

      // Insert notification
      await supabase
        .from('notifications')
        .insert({
          user_id: agent.developer_id,
          title: notificationTitle,
          message: notificationMessage,
          type: 'agent_status',
          created_at: new Date().toISOString()
        })

      // TODO: Send email notification
      console.log('Email notification would be sent to:', (agent.profiles as any).email)
    }

    return NextResponse.json({
      success: true,
      message: `Agent ${action}d successfully`
    })

  } catch (error) {
    console.error('Error in agent approval API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
