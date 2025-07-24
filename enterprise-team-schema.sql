-- ENTERPRISE FEATURES & TEAM MANAGEMENT SCHEMA
-- Schema for teams, organizations, role-based access, and enterprise features

-- ================================
-- ORGANIZATIONS (Enterprise Teams)
-- ================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  industry TEXT,
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
  billing_email TEXT NOT NULL,
  website_url TEXT,
  logo_url TEXT,
  subscription_tier TEXT DEFAULT 'team' CHECK (subscription_tier IN ('team', 'business', 'enterprise')),
  max_members INTEGER DEFAULT 10,
  max_agents INTEGER DEFAULT 100,
  max_executions_per_month INTEGER DEFAULT 10000,
  custom_branding BOOLEAN DEFAULT false,
  sso_enabled BOOLEAN DEFAULT false,
  audit_logs_retention_days INTEGER DEFAULT 90,
  api_access BOOLEAN DEFAULT false,
  priority_support BOOLEAN DEFAULT false,
  dedicated_account_manager BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- ORGANIZATION MEMBERS
-- ================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'developer', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'left')),
  last_active_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(organization_id, user_id)
);

-- ================================
-- TEAM WORKSPACES
-- ================================
CREATE TABLE IF NOT EXISTS team_workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  workspace_type TEXT DEFAULT 'shared' CHECK (workspace_type IN ('shared', 'private', 'department')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- WORKSPACE MEMBERS
-- ================================
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID REFERENCES team_workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'contributor', 'member', 'viewer')),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- ================================
-- ORGANIZATION AGENTS (Team Agents)
-- ================================
CREATE TABLE IF NOT EXISTS organization_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES team_workspaces(id) ON DELETE SET NULL,
  visibility TEXT DEFAULT 'organization' CHECK (visibility IN ('organization', 'workspace', 'private')),
  shared_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  usage_policy JSONB DEFAULT '{}', -- Rate limiting, approval required, etc.
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, agent_id)
);

-- ================================
-- ROLE PERMISSIONS
-- ================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL,
  permission_category TEXT NOT NULL, -- 'agents', 'billing', 'members', 'settings'
  permission_action TEXT NOT NULL, -- 'create', 'read', 'update', 'delete', 'execute'
  permission_scope TEXT DEFAULT 'organization' CHECK (permission_scope IN ('organization', 'workspace', 'own')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_name, permission_category, permission_action, permission_scope)
);

-- Insert default role permissions
INSERT INTO role_permissions (role_name, permission_category, permission_action, permission_scope) VALUES
-- Owner permissions (full access)
('owner', 'agents', 'create', 'organization'),
('owner', 'agents', 'read', 'organization'),
('owner', 'agents', 'update', 'organization'),
('owner', 'agents', 'delete', 'organization'),
('owner', 'agents', 'execute', 'organization'),
('owner', 'billing', 'read', 'organization'),
('owner', 'billing', 'update', 'organization'),
('owner', 'members', 'create', 'organization'),
('owner', 'members', 'read', 'organization'),
('owner', 'members', 'update', 'organization'),
('owner', 'members', 'delete', 'organization'),
('owner', 'settings', 'read', 'organization'),
('owner', 'settings', 'update', 'organization'),

-- Admin permissions
('admin', 'agents', 'create', 'organization'),
('admin', 'agents', 'read', 'organization'),
('admin', 'agents', 'update', 'organization'),
('admin', 'agents', 'execute', 'organization'),
('admin', 'members', 'create', 'organization'),
('admin', 'members', 'read', 'organization'),
('admin', 'members', 'update', 'organization'),
('admin', 'settings', 'read', 'organization'),

-- Developer permissions
('developer', 'agents', 'create', 'own'),
('developer', 'agents', 'read', 'organization'),
('developer', 'agents', 'update', 'own'),
('developer', 'agents', 'execute', 'organization'),

-- Member permissions
('member', 'agents', 'read', 'organization'),
('member', 'agents', 'execute', 'organization'),

-- Viewer permissions
('viewer', 'agents', 'read', 'organization')
ON CONFLICT (role_name, permission_category, permission_action, permission_scope) DO NOTHING;

-- ================================
-- ORGANIZATION USAGE TRACKING
-- ================================
CREATE TABLE IF NOT EXISTS organization_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_executions INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  total_agents_used INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  storage_used_bytes BIGINT DEFAULT 0,
  bandwidth_used_bytes BIGINT DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, date)
);

-- ================================
-- ORGANIZATION INVITATIONS
-- ================================
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'developer', 'member', 'viewer')),
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- SSO CONFIGURATIONS
-- ================================
CREATE TABLE IF NOT EXISTS sso_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('saml', 'oidc', 'google_workspace', 'microsoft_ad', 'okta')),
  provider_name TEXT NOT NULL,
  configuration JSONB NOT NULL,
  metadata_url TEXT,
  certificate TEXT,
  active BOOLEAN DEFAULT false,
  auto_provision BOOLEAN DEFAULT true,
  default_role TEXT DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- CUSTOM BRANDING
-- ================================
CREATE TABLE IF NOT EXISTS organization_branding (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  custom_css TEXT,
  custom_domain TEXT UNIQUE,
  favicon_url TEXT,
  email_logo_url TEXT,
  white_label_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- APPROVAL WORKFLOWS
-- ================================
CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('agent_execution', 'agent_install', 'new_member', 'budget_limit')),
  approval_type TEXT DEFAULT 'single' CHECK (approval_type IN ('single', 'multiple', 'hierarchy')),
  required_approvers INTEGER DEFAULT 1,
  approver_roles TEXT[] DEFAULT ARRAY['admin'],
  auto_approve_conditions JSONB DEFAULT '{}',
  timeout_hours INTEGER DEFAULT 24,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- APPROVAL REQUESTS
-- ================================
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES approval_workflows(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL,
  request_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  required_approvals INTEGER NOT NULL,
  current_approvals INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- APPROVAL ACTIONS
-- ================================
CREATE TABLE IF NOT EXISTS approval_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'delegate')),
  comment TEXT,
  delegated_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- BUDGET CONTROLS
-- ================================
CREATE TABLE IF NOT EXISTS organization_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  budget_name TEXT NOT NULL,
  budget_type TEXT NOT NULL CHECK (budget_type IN ('monthly', 'quarterly', 'annual', 'project')),
  budget_amount_cents INTEGER NOT NULL,
  spent_amount_cents INTEGER DEFAULT 0,
  budget_period_start DATE NOT NULL,
  budget_period_end DATE NOT NULL,
  department TEXT,
  workspace_id UUID REFERENCES team_workspaces(id) ON DELETE SET NULL,
  alert_threshold_percentage INTEGER DEFAULT 80,
  hard_limit BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_team_workspaces_org_id ON team_workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_agents_org_id ON organization_agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_usage_org_id ON organization_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_usage_date ON organization_usage(date);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON organization_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_approval_requests_org_id ON approval_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);

-- ================================
-- ROW LEVEL SECURITY (RLS)
-- ================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_budgets ENABLE ROW LEVEL SECURITY;

-- ================================
-- RLS POLICIES
-- ================================

-- Organizations: Members can view their organizations
CREATE POLICY "Organization members can view their organization" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_members.organization_id = organizations.id 
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
    )
  );

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Organization owners/admins can update organization" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_members.organization_id = organizations.id 
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
      AND organization_members.status = 'active'
    )
  );

-- Organization members: Members can see other members in their org
CREATE POLICY "Organization members can view other members" ON organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Organization admins can manage members" ON organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    )
  );

-- Team workspaces: Organization members can see workspaces
CREATE POLICY "Organization members can view workspaces" ON team_workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_members.organization_id = team_workspaces.organization_id 
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
    )
  );

-- Organization agents: Members can see shared agents
CREATE POLICY "Organization members can view shared agents" ON organization_agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_members.organization_id = organization_agents.organization_id 
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
    )
  );

-- Other policies follow similar patterns...

-- ================================
-- FUNCTIONS & TRIGGERS
-- ================================

-- Function to update organization usage
CREATE OR REPLACE FUNCTION update_organization_usage()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  today DATE := CURRENT_DATE;
BEGIN
  -- Get organization ID from user's membership
  SELECT om.organization_id INTO org_id
  FROM organization_members om
  WHERE om.user_id = NEW.user_id
  AND om.status = 'active'
  LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    -- Update daily usage metrics
    INSERT INTO organization_usage (
      organization_id,
      date,
      total_executions,
      unique_users,
      calculated_at
    ) VALUES (
      org_id,
      today,
      1,
      1,
      NOW()
    )
    ON CONFLICT (organization_id, date)
    DO UPDATE SET
      total_executions = organization_usage.total_executions + 1,
      unique_users = CASE 
        WHEN NEW.user_id = ANY(
          SELECT DISTINCT user_id 
          FROM agent_executions 
          WHERE DATE(executed_at) = today
          AND user_id IN (
            SELECT user_id FROM organization_members 
            WHERE organization_id = org_id
          )
        ) THEN organization_usage.unique_users
        ELSE organization_usage.unique_users + 1
      END,
      calculated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update organization usage on agent executions
CREATE TRIGGER trigger_update_organization_usage
  AFTER INSERT ON agent_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_usage();

-- Function to auto-approve requests based on conditions
CREATE OR REPLACE FUNCTION process_approval_request()
RETURNS TRIGGER AS $$
DECLARE
  workflow_rec approval_workflows%ROWTYPE;
  auto_approve BOOLEAN := false;
BEGIN
  -- Get workflow details
  SELECT * INTO workflow_rec
  FROM approval_workflows
  WHERE id = NEW.workflow_id;
  
  -- Check auto-approval conditions
  IF workflow_rec.auto_approve_conditions IS NOT NULL THEN
    -- Simple auto-approval logic (can be expanded)
    IF jsonb_extract_path_text(workflow_rec.auto_approve_conditions, 'amount_limit') IS NOT NULL THEN
      IF (NEW.request_data->>'amount_cents')::INTEGER <= 
         (workflow_rec.auto_approve_conditions->>'amount_limit')::INTEGER THEN
        auto_approve := true;
      END IF;
    END IF;
  END IF;
  
  -- Auto-approve if conditions met
  IF auto_approve THEN
    UPDATE approval_requests
    SET status = 'approved',
        current_approvals = required_approvals,
        approved_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-approval processing
CREATE TRIGGER trigger_process_approval_request
  AFTER INSERT ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION process_approval_request();

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
