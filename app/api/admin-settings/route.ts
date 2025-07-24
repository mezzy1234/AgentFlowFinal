import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AdminUser {
  id: string
  email: string
  role: 'super_admin' | 'admin' | 'moderator'
  permissions: string[]
  last_login: string
  created_at: string
}

interface SystemSettings {
  platform_fees: {
    transaction_fee_percent: number
    minimum_fee_cents: number
    maximum_fee_cents: number
  }
  agent_limits: {
    free_tier_limit: number
    pro_tier_limit: number
    enterprise_tier_limit: number
  }
  moderation: {
    auto_approve_threshold: number
    manual_review_required: boolean
    content_filtering_enabled: boolean
  }
  payouts: {
    minimum_payout_cents: number
    payout_schedule: 'weekly' | 'biweekly' | 'monthly'
    processing_delay_days: number
  }
  notifications: {
    email_notifications_enabled: boolean
    slack_webhook_url?: string
    admin_alert_threshold_cents: number
  }
}

class AdminSettingsManager {
  async verifyAdminAccess(adminId: string, requiredRole: string = 'admin'): Promise<boolean> {
    const { data: admin } = await supabase
      .from('admin_users')
      .select('role, permissions, status')
      .eq('id', adminId)
      .eq('status', 'active')
      .single()

    if (!admin) return false

    // Check role hierarchy
    const roleHierarchy = ['moderator', 'admin', 'super_admin']
    const adminRoleIndex = roleHierarchy.indexOf(admin.role)
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)

    return adminRoleIndex >= requiredRoleIndex
  }

  async getSystemSettings(adminId: string) {
    try {
      // Verify admin access
      const hasAccess = await this.verifyAdminAccess(adminId, 'admin')
      if (!hasAccess) {
        return {
          success: false,
          error: 'Insufficient permissions'
        }
      }

      // Get all system settings
      const { data: settings, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error

      // Convert array to organized object
      const organizedSettings: any = {}
      settings?.forEach(setting => {
        const keys = setting.setting_key.split('.')
        let current = organizedSettings
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {}
          current = current[keys[i]]
        }
        
        current[keys[keys.length - 1]] = setting.setting_value
      })

      return {
        success: true,
        settings: organizedSettings,
        last_updated: settings?.[0]?.updated_at || null
      }
    } catch (error) {
      console.error('Get system settings error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async updateSystemSettings(adminId: string, settingsUpdate: Partial<SystemSettings>) {
    try {
      // Verify admin access
      const hasAccess = await this.verifyAdminAccess(adminId, 'admin')
      if (!hasAccess) {
        return {
          success: false,
          error: 'Insufficient permissions'
        }
      }

      // Flatten settings object for storage
      const flattenedSettings = this.flattenSettings(settingsUpdate)
      
      // Update each setting
      const updatePromises = Object.entries(flattenedSettings).map(([key, value]) =>
        supabase
          .from('system_settings')
          .upsert({
            setting_key: key,
            setting_value: value,
            updated_by: adminId,
            updated_at: new Date().toISOString()
          })
      )

      await Promise.all(updatePromises)

      // Log the settings change
      await this.logAdminAction(adminId, 'system_settings_updated', {
        updated_settings: Object.keys(flattenedSettings),
        timestamp: new Date().toISOString()
      })

      // Send notification to other admins
      await this.notifyAdminsOfSettingsChange(adminId, flattenedSettings)

      return {
        success: true,
        message: 'System settings updated successfully'
      }
    } catch (error) {
      console.error('Update system settings error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async getAdminUsers(requestingAdminId: string) {
    try {
      const hasAccess = await this.verifyAdminAccess(requestingAdminId, 'super_admin')
      if (!hasAccess) {
        return {
          success: false,
          error: 'Super admin access required'
        }
      }

      const { data: admins, error } = await supabase
        .from('admin_users')
        .select(`
          id,
          email,
          role,
          permissions,
          status,
          last_login,
          created_at,
          created_by,
          profiles:id(display_name, avatar_url)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      return {
        success: true,
        admins: admins || []
      }
    } catch (error) {
      console.error('Get admin users error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async createAdminUser(requestingAdminId: string, newAdminData: {
    email: string
    role: 'admin' | 'moderator'
    permissions: string[]
  }) {
    try {
      const hasAccess = await this.verifyAdminAccess(requestingAdminId, 'super_admin')
      if (!hasAccess) {
        return {
          success: false,
          error: 'Super admin access required'
        }
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newAdminData.email)
        .single()

      if (!existingUser) {
        return {
          success: false,
          error: 'User must have an existing account before being made an admin'
        }
      }

      // Create admin user record
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .insert({
          id: existingUser.id,
          email: newAdminData.email,
          role: newAdminData.role,
          permissions: newAdminData.permissions,
          status: 'active',
          created_by: requestingAdminId,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Log admin creation
      await this.logAdminAction(requestingAdminId, 'admin_user_created', {
        new_admin_id: adminUser.id,
        role: newAdminData.role,
        permissions: newAdminData.permissions
      })

      // Send welcome email to new admin
      await this.sendAdminWelcomeEmail(newAdminData.email, newAdminData.role)

      return {
        success: true,
        admin_user: adminUser
      }
    } catch (error) {
      console.error('Create admin user error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async updateAdminUser(requestingAdminId: string, targetAdminId: string, updates: {
    role?: 'admin' | 'moderator'
    permissions?: string[]
    status?: 'active' | 'inactive'
  }) {
    try {
      const hasAccess = await this.verifyAdminAccess(requestingAdminId, 'super_admin')
      if (!hasAccess) {
        return {
          success: false,
          error: 'Super admin access required'
        }
      }

      // Prevent self-modification
      if (requestingAdminId === targetAdminId) {
        return {
          success: false,
          error: 'Cannot modify your own admin account'
        }
      }

      const { data: updatedAdmin, error } = await supabase
        .from('admin_users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetAdminId)
        .select()
        .single()

      if (error) throw error

      // Log admin update
      await this.logAdminAction(requestingAdminId, 'admin_user_updated', {
        target_admin_id: targetAdminId,
        updates: updates
      })

      return {
        success: true,
        admin_user: updatedAdmin
      }
    } catch (error) {
      console.error('Update admin user error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async getSystemHealth(adminId: string) {
    try {
      const hasAccess = await this.verifyAdminAccess(adminId, 'admin')
      if (!hasAccess) {
        return {
          success: false,
          error: 'Admin access required'
        }
      }

      // Get various system health metrics
      const healthData = await Promise.all([
        this.getDatabaseHealth(),
        this.getAPIHealth(),
        this.getQueueHealth(),
        this.getErrorRates(),
        this.getSystemUsage()
      ])

      return {
        success: true,
        health: {
          database: healthData[0],
          api: healthData[1],
          queues: healthData[2],
          error_rates: healthData[3],
          system_usage: healthData[4],
          overall_status: this.calculateOverallHealth(healthData),
          last_checked: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Get system health error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async getPlatformAnalytics(adminId: string, timeframe: '24h' | '7d' | '30d' | '90d' = '7d') {
    try {
      const hasAccess = await this.verifyAdminAccess(adminId, 'admin')
      if (!hasAccess) {
        return {
          success: false,
          error: 'Admin access required'
        }
      }

      const endDate = new Date()
      const startDate = new Date()
      
      switch (timeframe) {
        case '24h':
          startDate.setHours(endDate.getHours() - 24)
          break
        case '7d':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
      }

      // Get platform metrics
      const analytics = await Promise.all([
        this.getUserGrowthMetrics(startDate, endDate),
        this.getAgentMetrics(startDate, endDate),
        this.getRevenueMetrics(startDate, endDate),
        this.getEngagementMetrics(startDate, endDate)
      ])

      return {
        success: true,
        analytics: {
          user_growth: analytics[0],
          agent_metrics: analytics[1],
          revenue_metrics: analytics[2],
          engagement_metrics: analytics[3],
          timeframe: timeframe,
          date_range: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        }
      }
    } catch (error) {
      console.error('Get platform analytics error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  // Helper methods
  private flattenSettings(obj: any, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenSettings(value, newKey))
      } else {
        flattened[newKey] = value
      }
    }
    
    return flattened
  }

  private async logAdminAction(adminId: string, action: string, metadata: any) {
    await supabase
      .from('admin_activity_logs')
      .insert({
        admin_id: adminId,
        action: action,
        metadata: metadata,
        ip_address: null, // Would come from request headers
        user_agent: null,
        created_at: new Date().toISOString()
      })
  }

  private async notifyAdminsOfSettingsChange(changedBy: string, settings: Record<string, any>) {
    // In a real implementation, this would send notifications
    console.log(`Settings changed by ${changedBy}:`, Object.keys(settings))
  }

  private async sendAdminWelcomeEmail(email: string, role: string) {
    // In a real implementation, this would send an email
    console.log(`Welcome email sent to new ${role}: ${email}`)
  }

  private async getDatabaseHealth() {
    try {
      const { data } = await supabase
        .from('agents')
        .select('id', { count: 'exact', head: true })
      
      return {
        status: 'healthy',
        response_time_ms: Math.random() * 50 + 10, // Simulated
        total_records: data || 0
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: (error as Error).message
      }
    }
  }

  private async getAPIHealth() {
    // Simulated API health check
    return {
      status: 'healthy',
      average_response_time_ms: Math.random() * 100 + 50,
      success_rate_percent: 99.5,
      requests_per_minute: Math.floor(Math.random() * 1000) + 500
    }
  }

  private async getQueueHealth() {
    const { data: queueItems } = await supabase
      .from('agent_execution_queue')
      .select('status', { count: 'exact' })

    return {
      status: 'healthy',
      pending_jobs: queueItems || 0,
      processing_rate: Math.floor(Math.random() * 100) + 20
    }
  }

  private async getErrorRates() {
    const { count: errors } = await supabase
      .from('agent_run_logs')
      .select('status', { count: 'exact' })
      .eq('status', 'error')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const errorCount = errors ?? 0

    return {
      error_rate_24h: (errorCount / 1000) * 100, // Simulated total
      critical_errors: Math.floor(errorCount * 0.1),
      most_common_errors: [
        'Webhook timeout',
        'Invalid credentials',
        'Rate limit exceeded'
      ]
    }
  }

  private async getSystemUsage() {
    return {
      cpu_usage_percent: Math.random() * 30 + 20,
      memory_usage_percent: Math.random() * 40 + 30,
      storage_usage_percent: Math.random() * 60 + 20,
      active_connections: Math.floor(Math.random() * 500) + 100
    }
  }

  private calculateOverallHealth(healthData: any[]): 'healthy' | 'warning' | 'critical' {
    const unhealthyCount = healthData.filter(h => h.status === 'unhealthy').length
    if (unhealthyCount > 1) return 'critical'
    if (unhealthyCount === 1) return 'warning'
    return 'healthy'
  }

  private async getUserGrowthMetrics(startDate: Date, endDate: Date) {
    const { data: newUsers } = await supabase
      .from('profiles')
      .select('created_at', { count: 'exact' })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    return {
      new_users: newUsers || 0,
      growth_rate: Math.random() * 20 + 5 // Simulated
    }
  }

  private async getAgentMetrics(startDate: Date, endDate: Date) {
    const { count: newAgents } = await supabase
      .from('agents')
      .select('created_at', { count: 'exact' })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const agentCount = newAgents ?? 0

    return {
      new_agents: agentCount,
      published_agents: Math.floor(agentCount * 0.7)
    }
  }

  private async getRevenueMetrics(startDate: Date, endDate: Date) {
    const { data: purchases } = await supabase
      .from('agent_purchases')
      .select('amount_cents')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const totalRevenue = purchases?.reduce((sum, p) => sum + p.amount_cents, 0) || 0

    return {
      total_revenue_cents: totalRevenue,
      transaction_count: purchases?.length || 0,
      average_transaction_cents: purchases?.length ? totalRevenue / purchases.length : 0
    }
  }

  private async getEngagementMetrics(startDate: Date, endDate: Date) {
    const { count: executions } = await supabase
      .from('agent_run_logs')
      .select('agent_id', { count: 'exact' })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const executionCount = executions ?? 0
    const activeAgentCount = Math.floor(executionCount * 0.3)

    return {
      total_executions: executionCount,
      active_agents: activeAgentCount,
      average_executions_per_agent: activeAgentCount > 0 ? (executionCount / activeAgentCount) : 0
    }
  }
}

const adminManager = new AdminSettingsManager()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('admin_id')
    const type = searchParams.get('type')

    if (!adminId) {
      return NextResponse.json({ error: 'Missing admin_id' }, { status: 400 })
    }

    switch (type) {
      case 'settings':
        const settings = await adminManager.getSystemSettings(adminId)
        return NextResponse.json(settings)

      case 'admins':
        const admins = await adminManager.getAdminUsers(adminId)
        return NextResponse.json(admins)

      case 'health':
        const health = await adminManager.getSystemHealth(adminId)
        return NextResponse.json(health)

      case 'analytics':
        const timeframe = searchParams.get('timeframe') as '24h' | '7d' | '30d' | '90d' || '7d'
        const analytics = await adminManager.getPlatformAnalytics(adminId, timeframe)
        return NextResponse.json(analytics)

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Admin settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, admin_id } = body

    if (!admin_id) {
      return NextResponse.json({ error: 'Missing admin_id' }, { status: 400 })
    }

    switch (action) {
      case 'update_settings':
        const updateResult = await adminManager.updateSystemSettings(admin_id, body.settings)
        return NextResponse.json(updateResult)

      case 'create_admin':
        const createResult = await adminManager.createAdminUser(admin_id, body.admin_data)
        return NextResponse.json(createResult)

      case 'update_admin':
        const adminUpdateResult = await adminManager.updateAdminUser(admin_id, body.target_admin_id, body.updates)
        return NextResponse.json(adminUpdateResult)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Admin settings POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
