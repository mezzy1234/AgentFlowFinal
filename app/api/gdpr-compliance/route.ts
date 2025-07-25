import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface DataAccessLog {
  id: string
  user_id: string
  accessed_by: string
  access_type: 'view' | 'export' | 'modify' | 'delete'
  data_category: 'profile' | 'credentials' | 'agents' | 'logs' | 'revenue' | 'all'
  ip_address?: string
  user_agent?: string
  reason?: string
  timestamp: string
}

interface ConsentRecord {
  id: string
  user_id: string
  consent_type: 'privacy_policy' | 'terms_of_service' | 'marketing' | 'analytics' | 'data_processing'
  status: 'granted' | 'revoked' | 'expired'
  version: string
  granted_at: string
  revoked_at?: string
  ip_address?: string
  user_agent?: string
}

interface DataExportRequest {
  id: string
  user_id: string
  request_type: 'full_export' | 'specific_data'
  data_categories: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  file_url?: string
  expires_at?: string
  requested_at: string
  completed_at?: string
  error_message?: string
}

interface DataDeletionRequest {
  id: string
  user_id: string
  deletion_type: 'account_deletion' | 'specific_data'
  data_categories: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retain_financial: boolean
  scheduled_for: string
  completed_at?: string
  error_message?: string
  requested_at: string
}

class GDPRComplianceManager {
  async logDataAccess(accessLog: Omit<DataAccessLog, 'id' | 'timestamp'>): Promise<string> {
    const logEntry = {
      ...accessLog,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('data_access_logs')
      .insert(logEntry)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to log data access: ${error.message}`)
    }

    return data.id
  }

  async recordConsent(consent: Omit<ConsentRecord, 'id' | 'granted_at'>): Promise<string> {
    const consentRecord = {
      ...consent,
      id: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      granted_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('consent_records')
      .insert(consentRecord)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to record consent: ${error.message}`)
    }

    return data.id
  }

  async revokeConsent(userId: string, consentType: string, reason?: string): Promise<boolean> {
    const { error } = await supabase
      .from('consent_records')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .eq('status', 'granted')

    if (!error) {
      // Log the consent revocation
      await this.logDataAccess({
        user_id: userId,
        accessed_by: userId,
        access_type: 'modify',
        data_category: 'profile',
        reason: `Revoked consent for ${consentType}: ${reason || 'User request'}`
      })
    }

    return !error
  }

  async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    const { data, error } = await supabase
      .from('consent_records')
      .select('*')
      .eq('user_id', userId)
      .order('granted_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get user consents: ${error.message}`)
    }

    return data || []
  }

  async requestDataExport(userId: string, exportType: 'full_export' | 'specific_data', dataCategories: string[] = []): Promise<string> {
    const exportRequest: Omit<DataExportRequest, 'id'> = {
      user_id: userId,
      request_type: exportType,
      data_categories: exportType === 'full_export' ? ['all'] : dataCategories,
      status: 'pending',
      requested_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('data_export_requests')
      .insert(exportRequest)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create export request: ${error.message}`)
    }

    // Log the export request
    await this.logDataAccess({
      user_id: userId,
      accessed_by: userId,
      access_type: 'export',
      data_category: exportType === 'full_export' ? 'all' : dataCategories.join(',') as any,
      reason: 'User requested data export'
    })

    // Process the export asynchronously
    this.processDataExport(data.id).catch(console.error)

    return data.id
  }

  async processDataExport(exportId: string): Promise<void> {
    try {
      // Update status to processing
      await supabase
        .from('data_export_requests')
        .update({ status: 'processing' })
        .eq('id', exportId)

      // Get export request details
      const { data: exportRequest } = await supabase
        .from('data_export_requests')
        .select('*')
        .eq('id', exportId)
        .single()

      if (!exportRequest) {
        throw new Error('Export request not found')
      }

      // Collect user data
      const userData = await this.collectUserData(exportRequest.user_id, exportRequest.data_categories)

      // Generate export file
      const exportData = {
        export_id: exportId,
        user_id: exportRequest.user_id,
        generated_at: new Date().toISOString(),
        data_categories: exportRequest.data_categories,
        data: userData
      }

      const exportJson = JSON.stringify(exportData, null, 2)
      const fileName = `user_data_export_${exportRequest.user_id}_${Date.now()}.json`

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('gdpr-exports')
        .upload(fileName, exportJson, {
          contentType: 'application/json',
          cacheControl: '3600'
        })

      if (uploadError) {
        throw uploadError
      }

      // Get signed URL (expires in 7 days)
      const { data: signedUrl } = await supabase.storage
        .from('gdpr-exports')
        .createSignedUrl(fileName, 604800) // 7 days

      const expiresAt = new Date(Date.now() + 604800 * 1000).toISOString()

      // Update export request with completion
      await supabase
        .from('data_export_requests')
        .update({
          status: 'completed',
          file_url: signedUrl?.signedUrl,
          expires_at: expiresAt,
          completed_at: new Date().toISOString()
        })
        .eq('id', exportId)

      // Log completion
      await this.logDataAccess({
        user_id: exportRequest.user_id,
        accessed_by: 'system',
        access_type: 'export',
        data_category: 'all',
        reason: `Data export completed: ${exportId}`
      })

    } catch (error) {
      // Update export request with error
      await supabase
        .from('data_export_requests')
        .update({
          status: 'failed',
          error_message: (error as Error).message,
          completed_at: new Date().toISOString()
        })
        .eq('id', exportId)

      console.error('Data export failed:', error)
    }
  }

  async collectUserData(userId: string, categories: string[]): Promise<any> {
    const userData: any = {}

    const includeAll = categories.includes('all')

    // Profile data
    if (includeAll || categories.includes('profile')) {
      const { data: profile } = await supabase
        .from('developer_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      userData.profile = profile
    }

    // User account data
    if (includeAll || categories.includes('account')) {
      const { data: user } = await supabase.auth.admin.getUserById(userId)
      userData.account = {
        id: user.user?.id,
        email: user.user?.email,
        created_at: user.user?.created_at,
        updated_at: user.user?.updated_at,
        email_confirmed_at: user.user?.email_confirmed_at
      }
    }

    // Agents data
    if (includeAll || categories.includes('agents')) {
      const { data: agents } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', userId)
      userData.agents = agents
    }

    // Execution logs
    if (includeAll || categories.includes('logs')) {
      const { data: logs } = await supabase
        .from('agent_execution_logs')
        .select('*')
        .eq('user_id', userId)
        .order('execution_start', { ascending: false })
        .limit(1000) // Limit to last 1000 logs
      userData.execution_logs = logs
    }

    // Revenue data
    if (includeAll || categories.includes('revenue')) {
      const { data: earnings } = await supabase
        .from('developer_earnings')
        .select('*')
        .eq('user_id', userId)
      userData.earnings = earnings
    }

    // Integrations (without sensitive credentials)
    if (includeAll || categories.includes('integrations')) {
      const { data: integrations } = await supabase
        .from('user_integrations')
        .select('id, service_name, status, created_at, updated_at')
        .eq('user_id', userId)
      userData.integrations = integrations
    }

    // Consent records
    if (includeAll || categories.includes('consents')) {
      userData.consent_records = await this.getUserConsents(userId)
    }

    // Data access logs
    if (includeAll || categories.includes('access_logs')) {
      const { data: accessLogs } = await supabase
        .from('data_access_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(500) // Limit to last 500 access logs
      userData.access_logs = accessLogs
    }

    return userData
  }

  async requestDataDeletion(userId: string, deletionType: 'account_deletion' | 'specific_data', dataCategories: string[] = [], retainFinancial: boolean = true): Promise<string> {
    const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now

    const deletionRequest: Omit<DataDeletionRequest, 'id'> = {
      user_id: userId,
      deletion_type: deletionType,
      data_categories: deletionType === 'account_deletion' ? ['all'] : dataCategories,
      status: 'pending',
      retain_financial: retainFinancial,
      scheduled_for: scheduledFor,
      requested_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('data_deletion_requests')
      .insert(deletionRequest)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create deletion request: ${error.message}`)
    }

    // Log the deletion request
    await this.logDataAccess({
      user_id: userId,
      accessed_by: userId,
      access_type: 'delete',
      data_category: deletionType === 'account_deletion' ? 'all' : dataCategories.join(',') as any,
      reason: `User requested data deletion: ${deletionType}`
    })

    return data.id
  }

  async processDataDeletion(deletionId: string): Promise<void> {
    try {
      // Update status to processing
      await supabase
        .from('data_deletion_requests')
        .update({ status: 'processing' })
        .eq('id', deletionId)

      // Get deletion request details
      const { data: deletionRequest } = await supabase
        .from('data_deletion_requests')
        .select('*')
        .eq('id', deletionId)
        .single()

      if (!deletionRequest) {
        throw new Error('Deletion request not found')
      }

      const userId = deletionRequest.user_id
      const retainFinancial = deletionRequest.retain_financial

      // Delete data based on categories
      if (deletionRequest.deletion_type === 'account_deletion') {
        await this.deleteAllUserData(userId, retainFinancial)
      } else {
        await this.deleteSpecificData(userId, deletionRequest.data_categories, retainFinancial)
      }

      // Update deletion request with completion
      await supabase
        .from('data_deletion_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', deletionId)

      // Log completion
      await this.logDataAccess({
        user_id: userId,
        accessed_by: 'system',
        access_type: 'delete',
        data_category: 'all',
        reason: `Data deletion completed: ${deletionId}`
      })

    } catch (error) {
      // Update deletion request with error
      await supabase
        .from('data_deletion_requests')
        .update({
          status: 'failed',
          error_message: (error as Error).message,
          completed_at: new Date().toISOString()
        })
        .eq('id', deletionId)

      console.error('Data deletion failed:', error)
      throw error
    }
  }

  async deleteAllUserData(userId: string, retainFinancial: boolean): Promise<void> {
    // Delete in order of dependencies
    
    // 1. Delete agent execution logs
    await supabase.from('agent_execution_logs').delete().eq('user_id', userId)
    
    // 2. Delete API keys and usage
    const { data: apiKeys } = await supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', userId);
    
    if (apiKeys && apiKeys.length > 0) {
      const apiKeyIds = apiKeys.map(key => key.id);
      await supabase.from('api_key_usage').delete().in('api_key_id', apiKeyIds);
    }
    await supabase.from('api_keys').delete().eq('user_id', userId);
    
    // 3. Delete user integrations (credentials)
    await supabase.from('user_integrations').delete().eq('user_id', userId)
    
    // 4. Delete agents
    await supabase.from('agents').delete().eq('user_id', userId)
    
    // 5. Delete developer profile
    await supabase.from('developer_profiles').delete().eq('user_id', userId)
    
    // 6. Delete follows
    await supabase.from('developer_follows').delete().eq('follower_id', userId)
    await supabase.from('developer_follows').delete().eq('following_id', userId)
    
    // 7. Conditionally delete financial data
    if (!retainFinancial) {
      await supabase.from('developer_earnings').delete().eq('user_id', userId)
    } else {
      // Anonymize financial data
      await supabase
        .from('developer_earnings')
        .update({ user_id: null, anonymized: true })
        .eq('user_id', userId)
    }
    
    // 8. Delete consent records (keep for audit)
    // await supabase.from('consent_records').delete().eq('user_id', userId)
    
    // 9. Delete OAuth states
    await supabase.from('oauth_states').delete().eq('user_id', userId)
    
    // 10. Finally delete auth user
    await supabase.auth.admin.deleteUser(userId)
  }

  async deleteSpecificData(userId: string, categories: string[], retainFinancial: boolean): Promise<void> {
    for (const category of categories) {
      switch (category) {
        case 'profile':
          await supabase.from('developer_profiles').delete().eq('user_id', userId)
          break
        case 'agents':
          await supabase.from('agents').delete().eq('user_id', userId)
          break
        case 'logs':
          await supabase.from('agent_execution_logs').delete().eq('user_id', userId)
          break
        case 'integrations':
          await supabase.from('user_integrations').delete().eq('user_id', userId)
          break
        case 'revenue':
          if (!retainFinancial) {
            await supabase.from('developer_earnings').delete().eq('user_id', userId)
          }
          break
      }
    }
  }

  async getDataAccessLogs(userId: string, limit: number = 50, offset: number = 0): Promise<DataAccessLog[]> {
    const { data, error } = await supabase
      .from('data_access_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to get access logs: ${error.message}`)
    }

    return data || []
  }

  async getExportRequests(userId: string): Promise<DataExportRequest[]> {
    const { data, error } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get export requests: ${error.message}`)
    }

    return data || []
  }

  async getDeletionRequests(userId: string): Promise<DataDeletionRequest[]> {
    const { data, error } = await supabase
      .from('data_deletion_requests')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get deletion requests: ${error.message}`)
    }

    return data || []
  }

  async generateComplianceReport(userId: string): Promise<any> {
    const [consents, accessLogs, exportRequests, deletionRequests] = await Promise.all([
      this.getUserConsents(userId),
      this.getDataAccessLogs(userId, 100),
      this.getExportRequests(userId),
      this.getDeletionRequests(userId)
    ])

    const report = {
      user_id: userId,
      generated_at: new Date().toISOString(),
      summary: {
        total_consents: consents.length,
        active_consents: consents.filter(c => c.status === 'granted').length,
        total_access_logs: accessLogs.length,
        export_requests: exportRequests.length,
        deletion_requests: deletionRequests.length
      },
      consent_status: consents.reduce((acc, consent) => {
        acc[consent.consent_type] = consent.status
        return acc
      }, {} as any),
      recent_activity: accessLogs.slice(0, 10),
      data_requests: {
        exports: exportRequests,
        deletions: deletionRequests
      },
      compliance_score: this.calculateComplianceScore(consents, accessLogs)
    }

    return report
  }

  private calculateComplianceScore(consents: ConsentRecord[], accessLogs: DataAccessLog[]): number {
    let score = 0

    // Points for having required consents
    const requiredConsents = ['privacy_policy', 'terms_of_service']
    const activeConsents = consents.filter(c => c.status === 'granted')
    
    requiredConsents.forEach(required => {
      if (activeConsents.some(c => c.consent_type === required)) {
        score += 25
      }
    })

    // Points for recent consent updates (within last year)
    const recentConsents = activeConsents.filter(c => 
      new Date(c.granted_at) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    )
    if (recentConsents.length > 0) score += 25

    // Points for proper access logging
    if (accessLogs.length > 0) score += 25

    return Math.min(score, 100)
  }
}

const gdprManager = new GDPRComplianceManager()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'record_consent':
        const { user_id, consent_type, status, version, ip_address, user_agent } = body
        if (!user_id || !consent_type || !status || !version) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const consentId = await gdprManager.recordConsent({
          user_id, consent_type, status, version, ip_address, user_agent
        })
        return NextResponse.json({ success: true, consent_id: consentId })

      case 'revoke_consent':
        const { user_id: revokeUserId, consent_type: revokeType, reason } = body
        if (!revokeUserId || !revokeType) {
          return NextResponse.json({ error: 'Missing user_id or consent_type' }, { status: 400 })
        }
        const revoked = await gdprManager.revokeConsent(revokeUserId, revokeType, reason)
        return NextResponse.json({ success: revoked })

      case 'request_export':
        const { user_id: exportUserId, export_type, data_categories } = body
        if (!exportUserId || !export_type) {
          return NextResponse.json({ error: 'Missing user_id or export_type' }, { status: 400 })
        }
        const exportId = await gdprManager.requestDataExport(exportUserId, export_type, data_categories || [])
        return NextResponse.json({ success: true, export_id: exportId })

      case 'request_deletion':
        const { user_id: deleteUserId, deletion_type, data_categories: deleteCategories, retain_financial } = body
        if (!deleteUserId || !deletion_type) {
          return NextResponse.json({ error: 'Missing user_id or deletion_type' }, { status: 400 })
        }
        const deletionId = await gdprManager.requestDataDeletion(
          deleteUserId, 
          deletion_type, 
          deleteCategories || [], 
          retain_financial !== false
        )
        return NextResponse.json({ success: true, deletion_id: deletionId })

      case 'log_access':
        const { user_id: logUserId, accessed_by, access_type, data_category, ip_address: logIp, user_agent: logUA, reason: logReason } = body
        if (!logUserId || !accessed_by || !access_type || !data_category) {
          return NextResponse.json({ error: 'Missing required fields for access log' }, { status: 400 })
        }
        const logId = await gdprManager.logDataAccess({
          user_id: logUserId, accessed_by, access_type, data_category, 
          ip_address: logIp, user_agent: logUA, reason: logReason
        })
        return NextResponse.json({ success: true, log_id: logId })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('GDPR compliance error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    switch (type) {
      case 'consents':
        const consents = await gdprManager.getUserConsents(userId)
        return NextResponse.json({ success: true, consents })

      case 'access_logs':
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')
        const accessLogs = await gdprManager.getDataAccessLogs(userId, limit, offset)
        return NextResponse.json({ success: true, access_logs: accessLogs })

      case 'export_requests':
        const exportRequests = await gdprManager.getExportRequests(userId)
        return NextResponse.json({ success: true, export_requests: exportRequests })

      case 'deletion_requests':
        const deletionRequests = await gdprManager.getDeletionRequests(userId)
        return NextResponse.json({ success: true, deletion_requests: deletionRequests })

      case 'compliance_report':
        const report = await gdprManager.generateComplianceReport(userId)
        return NextResponse.json({ success: true, report })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('GDPR compliance GET error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}
