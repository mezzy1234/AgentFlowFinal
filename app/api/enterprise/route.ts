import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// Enterprise Teams and Organizations API
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
    const { action, ...actionData } = body;

    switch (action) {
      case 'create_organization':
        return await createOrganization(supabase, user.id, actionData);
      
      case 'invite_member':
        return await inviteMember(supabase, user.id, actionData);
      
      case 'accept_invitation':
        return await acceptInvitation(supabase, user.id, actionData);
      
      case 'create_workspace':
        return await createWorkspace(supabase, user.id, actionData);
      
      case 'share_agent':
        return await shareAgent(supabase, user.id, actionData);
      
      case 'create_approval_workflow':
        return await createApprovalWorkflow(supabase, user.id, actionData);
      
      case 'request_approval':
        return await requestApproval(supabase, user.id, actionData);
      
      case 'process_approval':
        return await processApproval(supabase, user.id, actionData);
      
      case 'setup_sso':
        return await setupSSO(supabase, user.id, actionData);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Enterprise teams API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// GET endpoint for enterprise data
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
    const dataType = searchParams.get('type');
    const organizationId = searchParams.get('organizationId');

    switch (dataType) {
      case 'organizations':
        return await getUserOrganizations(supabase, user.id);
      
      case 'organization_details':
        if (!organizationId) {
          return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        return await getOrganizationDetails(supabase, user.id, organizationId);
      
      case 'members':
        if (!organizationId) {
          return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        return await getOrganizationMembers(supabase, user.id, organizationId);
      
      case 'workspaces':
        if (!organizationId) {
          return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        return await getWorkspaces(supabase, user.id, organizationId);
      
      case 'shared_agents':
        if (!organizationId) {
          return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        return await getSharedAgents(supabase, user.id, organizationId);
      
      case 'usage_analytics':
        if (!organizationId) {
          return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        return await getUsageAnalytics(supabase, user.id, organizationId);
      
      case 'pending_approvals':
        if (!organizationId) {
          return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        return await getPendingApprovals(supabase, user.id, organizationId);
      
      default:
        return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Enterprise teams GET API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// Implementation functions
async function createOrganization(supabase: any, userId: string, data: any) {
  const { name, description, industry, companySize, billingEmail, subscriptionTier = 'team' } = data;

  if (!name || !billingEmail) {
    return NextResponse.json({ error: 'Name and billing email are required' }, { status: 400 });
  }

  // Generate unique slug
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const uniqueSlug = `${slug}-${randomBytes(4).toString('hex')}`;

  // Create organization
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name,
      slug: uniqueSlug,
      description,
      industry,
      company_size: companySize,
      billing_email: billingEmail,
      subscription_tier: subscriptionTier
    })
    .select()
    .single();

  if (orgError) {
    console.error('Failed to create organization:', orgError);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }

  // Add creator as owner
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: organization.id,
      user_id: userId,
      role: 'owner',
      status: 'active',
      joined_at: new Date().toISOString()
    });

  if (memberError) {
    console.error('Failed to add owner to organization:', memberError);
    return NextResponse.json({ error: 'Failed to add owner' }, { status: 500 });
  }

  // Create default workspace
  const { error: workspaceError } = await supabase
    .from('team_workspaces')
    .insert({
      organization_id: organization.id,
      name: 'General',
      description: 'Default workspace for all team members',
      workspace_type: 'shared',
      created_by: userId
    });

  if (workspaceError) {
    console.error('Failed to create default workspace:', workspaceError);
  }

  return NextResponse.json({
    success: true,
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      subscriptionTier: organization.subscription_tier
    }
  });
}

async function inviteMember(supabase: any, userId: string, data: any) {
  const { organizationId, email, role = 'member' } = data;

  // Check if user has permission to invite
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', supabase.from('profiles').select('id').eq('email', email))
    .single();

  if (existingMember) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
  }

  // Generate invitation token
  const invitationToken = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  // Create invitation
  const { data: invitation, error } = await supabase
    .from('organization_invitations')
    .insert({
      organization_id: organizationId,
      email,
      role,
      invited_by: userId,
      invitation_token: invitationToken,
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create invitation:', error);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }

  // Send invitation email via n8n webhook
  if (process.env.N8N_EMAIL_WEBHOOK_URL) {
    try {
      await fetch(process.env.N8N_EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'organization_invitation',
          to: email,
          organizationId,
          invitationToken,
          inviterName: userId, // Would get actual name from profile
          role
        })
      });
    } catch (error) {
      console.error('Failed to send invitation email:', error);
    }
  }

  return NextResponse.json({
    success: true,
    invitation: {
      id: invitation.id,
      email,
      role,
      expiresAt: invitation.expires_at
    }
  });
}

async function acceptInvitation(supabase: any, userId: string, data: any) {
  const { invitationToken } = data;

  // Get invitation details
  const { data: invitation, error: invError } = await supabase
    .from('organization_invitations')
    .select(`
      *,
      organizations(name, id)
    `)
    .eq('invitation_token', invitationToken)
    .eq('status', 'pending')
    .single();

  if (invError || !invitation) {
    return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 });
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    await supabase
      .from('organization_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id);
    
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
  }

  // Add user to organization
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role,
      status: 'active',
      invited_by: invitation.invited_by,
      invited_at: invitation.created_at,
      joined_at: new Date().toISOString()
    });

  if (memberError) {
    console.error('Failed to add member to organization:', memberError);
    return NextResponse.json({ error: 'Failed to join organization' }, { status: 500 });
  }

  // Mark invitation as accepted
  await supabase
    .from('organization_invitations')
    .update({ 
      status: 'accepted',
      accepted_at: new Date().toISOString()
    })
    .eq('id', invitation.id);

  return NextResponse.json({
    success: true,
    organization: {
      id: invitation.organization_id,
      name: invitation.organizations.name,
      role: invitation.role
    }
  });
}

async function createWorkspace(supabase: any, userId: string, data: any) {
  const { organizationId, name, description, workspaceType = 'shared' } = data;

  // Check permissions
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Create workspace
  const { data: workspace, error } = await supabase
    .from('team_workspaces')
    .insert({
      organization_id: organizationId,
      name,
      description,
      workspace_type: workspaceType,
      created_by: userId
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create workspace:', error);
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      workspaceType: workspace.workspace_type
    }
  });
}

async function shareAgent(supabase: any, userId: string, data: any) {
  const { organizationId, agentId, workspaceId, visibility = 'organization', usagePolicy = {} } = data;

  // Check if user owns the agent or has admin rights
  const { data: agent } = await supabase
    .from('agents')
    .select('created_by')
    .eq('id', agentId)
    .single();

  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!agent || (agent.created_by !== userId && !['owner', 'admin'].includes(member?.role))) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Share agent with organization
  const { data: sharedAgent, error } = await supabase
    .from('organization_agents')
    .insert({
      organization_id: organizationId,
      agent_id: agentId,
      workspace_id: workspaceId,
      visibility,
      shared_by: userId,
      usage_policy: usagePolicy
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to share agent:', error);
    return NextResponse.json({ error: 'Failed to share agent' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    sharedAgent: {
      id: sharedAgent.id,
      agentId,
      visibility,
      sharedAt: sharedAgent.shared_at
    }
  });
}

async function createApprovalWorkflow(supabase: any, userId: string, data: any) {
  const { 
    organizationId, 
    workflowName, 
    triggerType, 
    approvalType = 'single',
    requiredApprovers = 1,
    approverRoles = ['admin'],
    autoApproveConditions = {},
    timeoutHours = 24
  } = data;

  // Check permissions
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Create workflow
  const { data: workflow, error } = await supabase
    .from('approval_workflows')
    .insert({
      organization_id: organizationId,
      workflow_name: workflowName,
      trigger_type: triggerType,
      approval_type: approvalType,
      required_approvers: requiredApprovers,
      approver_roles: approverRoles,
      auto_approve_conditions: autoApproveConditions,
      timeout_hours: timeoutHours
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create approval workflow:', error);
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    workflow: {
      id: workflow.id,
      name: workflow.workflow_name,
      triggerType: workflow.trigger_type
    }
  });
}

async function requestApproval(supabase: any, userId: string, data: any) {
  const { workflowId, requestType, requestData } = data;

  // Get workflow details
  const { data: workflow } = await supabase
    .from('approval_workflows')
    .select('*')
    .eq('id', workflowId)
    .single();

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + workflow.timeout_hours);

  // Create approval request
  const { data: request, error } = await supabase
    .from('approval_requests')
    .insert({
      workflow_id: workflowId,
      organization_id: workflow.organization_id,
      requested_by: userId,
      request_type: requestType,
      request_data: requestData,
      required_approvals: workflow.required_approvers,
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create approval request:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    request: {
      id: request.id,
      status: request.status,
      expiresAt: request.expires_at
    }
  });
}

async function processApproval(supabase: any, userId: string, data: any) {
  const { requestId, action, comment } = data;

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Get request details
  const { data: request } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!request || request.status !== 'pending') {
    return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 });
  }

  // Check if user can approve
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', request.organization_id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  const { data: workflow } = await supabase
    .from('approval_workflows')
    .select('approver_roles')
    .eq('id', request.workflow_id)
    .single();

  if (!member || !workflow?.approver_roles.includes(member.role)) {
    return NextResponse.json({ error: 'Insufficient permissions to approve' }, { status: 403 });
  }

  // Record approval action
  const { error: actionError } = await supabase
    .from('approval_actions')
    .insert({
      request_id: requestId,
      approver_id: userId,
      action,
      comment
    });

  if (actionError) {
    console.error('Failed to record approval action:', actionError);
    return NextResponse.json({ error: 'Failed to record action' }, { status: 500 });
  }

  // Update request status
  const newApprovals = action === 'approve' ? request.current_approvals + 1 : request.current_approvals;
  const newStatus = action === 'reject' ? 'rejected' : 
                   (newApprovals >= request.required_approvals ? 'approved' : 'pending');

  const { error: updateError } = await supabase
    .from('approval_requests')
    .update({
      current_approvals: newApprovals,
      status: newStatus,
      approved_at: newStatus === 'approved' ? new Date().toISOString() : null,
      rejected_at: newStatus === 'rejected' ? new Date().toISOString() : null
    })
    .eq('id', requestId);

  if (updateError) {
    console.error('Failed to update approval request:', updateError);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    status: newStatus,
    currentApprovals: newApprovals,
    requiredApprovals: request.required_approvals
  });
}

async function setupSSO(supabase: any, userId: string, data: any) {
  const { 
    organizationId, 
    provider, 
    providerName, 
    configuration, 
    metadataUrl, 
    certificate,
    autoProvision = true,
    defaultRole = 'member'
  } = data;

  // Check permissions
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!member || member.role !== 'owner') {
    return NextResponse.json({ error: 'Only organization owners can setup SSO' }, { status: 403 });
  }

  // Create SSO configuration
  const { data: ssoConfig, error } = await supabase
    .from('sso_configurations')
    .insert({
      organization_id: organizationId,
      provider,
      provider_name: providerName,
      configuration,
      metadata_url: metadataUrl,
      certificate,
      auto_provision: autoProvision,
      default_role: defaultRole,
      active: false // Starts inactive until tested
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create SSO configuration:', error);
    return NextResponse.json({ error: 'Failed to setup SSO' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    ssoConfig: {
      id: ssoConfig.id,
      provider: ssoConfig.provider,
      providerName: ssoConfig.provider_name,
      active: ssoConfig.active
    }
  });
}

// GET implementation functions
async function getUserOrganizations(supabase: any, userId: string) {
  const { data: organizations, error } = await supabase
    .from('organization_members')
    .select(`
      role,
      status,
      joined_at,
      organizations(
        id,
        name,
        slug,
        description,
        subscription_tier,
        max_members,
        created_at
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch user organizations:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }

  return NextResponse.json({
    organizations: organizations?.map((org: any) => ({
      ...org.organizations,
      userRole: org.role,
      joinedAt: org.joined_at
    })) || []
  });
}

async function getOrganizationDetails(supabase: any, userId: string, organizationId: string) {
  // Check membership
  const { data: member } = await supabase
    .from('organization_members')
    .select('role, status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get organization details
  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (error) {
    console.error('Failed to fetch organization details:', error);
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
  }

  return NextResponse.json({
    organization: {
      ...organization,
      userRole: member.role
    }
  });
}

async function getOrganizationMembers(supabase: any, userId: string, organizationId: string) {
  // Check membership
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get organization members
  const { data: members, error } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      status,
      invited_at,
      joined_at,
      last_active_at,
      profiles(
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('organization_id', organizationId)
    .in('status', ['active', 'pending'])
    .order('joined_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch organization members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }

  return NextResponse.json({
    members: members || [],
    userRole: member.role
  });
}

async function getWorkspaces(supabase: any, userId: string, organizationId: string) {
  // Check membership
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get workspaces
  const { data: workspaces, error } = await supabase
    .from('team_workspaces')
    .select(`
      *,
      workspace_members(user_id, role),
      organization_agents(agent_id)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch workspaces:', error);
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
  }

  return NextResponse.json({
    workspaces: workspaces?.map((workspace: any) => ({
      ...workspace,
      memberCount: workspace.workspace_members?.length || 0,
      agentCount: workspace.organization_agents?.length || 0
    })) || []
  });
}

async function getSharedAgents(supabase: any, userId: string, organizationId: string) {
  // Check membership
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get shared agents
  const { data: sharedAgents, error } = await supabase
    .from('organization_agents')
    .select(`
      *,
      agents(
        id,
        name,
        description,
        category,
        status,
        total_runs,
        success_rate,
        created_at
      ),
      profiles!organization_agents_shared_by_fkey(
        full_name,
        email
      )
    `)
    .eq('organization_id', organizationId)
    .order('shared_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch shared agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }

  return NextResponse.json({
    sharedAgents: sharedAgents || []
  });
}

async function getUsageAnalytics(supabase: any, userId: string, organizationId: string) {
  // Check membership
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get usage data for last 30 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const { data: usage, error } = await supabase
    .from('organization_usage')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    console.error('Failed to fetch usage analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
  }

  // Calculate totals
  const totalExecutions = usage?.reduce((sum: number, day: any) => sum + (day.total_executions || 0), 0) || 0;
  const totalUniqueUsers = new Set(usage?.flatMap((day: any) => day.unique_users || [])).size;
  const avgDailyExecutions = usage?.length > 0 ? totalExecutions / usage.length : 0;

  return NextResponse.json({
    usage: usage || [],
    summary: {
      totalExecutions,
      totalUniqueUsers,
      avgDailyExecutions: Math.round(avgDailyExecutions)
    }
  });
}

async function getPendingApprovals(supabase: any, userId: string, organizationId: string) {
  // Check membership
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Get pending approvals (either requested by user or can be approved by user)
  const { data: pendingApprovals, error } = await supabase
    .from('approval_requests')
    .select(`
      *,
      approval_workflows(workflow_name, approver_roles),
      profiles!approval_requests_requested_by_fkey(full_name, email)
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch pending approvals:', error);
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 });
  }

  // Filter approvals user can act on
  const actionableApprovals = pendingApprovals?.filter((approval: any) => 
    approval.requested_by === userId || 
    approval.approval_workflows?.approver_roles?.includes(member.role)
  ) || [];

  return NextResponse.json({
    pendingApprovals: actionableApprovals,
    userRole: member.role
  });
}
