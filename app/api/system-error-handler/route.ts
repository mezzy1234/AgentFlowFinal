import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ErrorReport {
  id: string
  user_id?: string
  error_type: 'credential_error' | 'sync_failure' | 'payout_error' | 'restore_failure' | 'api_error'
  error_code: string
  error_message: string
  stack_trace?: string
  context: any
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved' | 'dismissed'
  resolution?: string
  first_occurred: string
  last_occurred: string
  occurrence_count: number
  user_impact: number
  created_at: string
  updated_at: string
}

interface RetryConfiguration {
  max_attempts: number
  delay_ms: number
  backoff_multiplier: number
  retry_conditions: string[]
}

class SystemErrorHandler {
  private retryConfigs: { [key: string]: RetryConfiguration } = {
    credential_refresh: {
      max_attempts: 3,
      delay_ms: 1000,
      backoff_multiplier: 2,
      retry_conditions: ['token_expired', 'network_error', 'rate_limit']
    },
    agent_sync: {
      max_attempts: 5,
      delay_ms: 2000,
      backoff_multiplier: 1.5,
      retry_conditions: ['network_error', 'timeout', 'invalid_response']
    },
    payout_processing: {
      max_attempts: 3,
      delay_ms: 5000,
      backoff_multiplier: 2,
      retry_conditions: ['stripe_error', 'network_error', 'temporary_failure']
    },
    backup_restore: {
      max_attempts: 2,
      delay_ms: 10000,
      backoff_multiplier: 1,
      retry_conditions: ['network_error', 'database_error']
    }
  }

  async handleCredentialError(userId: string, serviceId: string, error: any, context: any = {}): Promise<{ success: boolean; retry: boolean; message: string }> {
    console.error('Credential error:', error)

    // Log the error
    await this.logError({
      user_id: userId,
      error_type: 'credential_error',
      error_code: error.code || 'CREDENTIAL_ERROR',
      error_message: error.message,
      context: { serviceId, ...context },
      severity: 'high'
    })

    // Determine error type and response
    if (error.message?.includes('expired') || error.code === 'token_expired') {
      // Try to refresh token
      const refreshResult = await this.attemptTokenRefresh(userId, serviceId)
      return {
        success: refreshResult.success,
        retry: refreshResult.success,
        message: refreshResult.success 
          ? 'Credentials refreshed successfully' 
          : 'Token expired. Please reconnect your account.'
      }
    } else if (error.message?.includes('scope') || error.code === 'insufficient_scope') {
      return {
        success: false,
        retry: false,
        message: 'This agent requires additional permissions. Please reconnect your account with the required permissions.'
      }
    } else if (error.message?.includes('rate limit') || error.code === 'rate_limited') {
      return {
        success: false,
        retry: true,
        message: 'Rate limit exceeded. Please try again in a few minutes.'
      }
    } else {
      return {
        success: false,
        retry: false,
        message: 'Authentication failed. Please check your credentials and try reconnecting.'
      }
    }
  }

  async attemptTokenRefresh(userId: string, serviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get existing integration
      const { data: integration } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('service_name', serviceId)
        .single()

      if (!integration || !integration.encrypted_credentials) {
        return { success: false, error: 'Integration not found' }
      }

      // Decrypt credentials to get refresh token
      const credentials = await this.decryptCredentials(integration.encrypted_credentials)
      
      if (!credentials.refresh_token) {
        return { success: false, error: 'No refresh token available' }
      }

      // Call multi-oauth endpoint to refresh
      const refreshResponse = await fetch('/api/multi-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refresh_token',
          user_id: userId,
          provider: serviceId
        })
      })

      const result = await refreshResponse.json()
      return { success: result.success, error: result.error }

    } catch (error) {
      console.error('Token refresh failed:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  async handleSyncFailure(agentId: string, syncType: 'github' | 'n8n', error: any, context: any = {}): Promise<{ success: boolean; retry: boolean; message: string }> {
    console.error('Sync failure:', error)

    // Log the error
    await this.logError({
      error_type: 'sync_failure',
      error_code: error.code || 'SYNC_ERROR',
      error_message: error.message,
      context: { agentId, syncType, ...context },
      severity: 'medium'
    })

    // Update agent status
    await supabase
      .from('agents')
      .update({
        sync_status: 'failed',
        sync_error: error.message,
        last_sync_attempt: new Date().toISOString()
      })
      .eq('id', agentId)

    // Determine retry strategy
    if (error.message?.includes('schema') || error.code === 'invalid_schema') {
      return {
        success: false,
        retry: false,
        message: 'Invalid agent schema. Please fix the configuration and try again.'
      }
    } else if (error.message?.includes('not found') || error.code === 'not_found') {
      return {
        success: false,
        retry: false,
        message: 'Source not found. Please check the repository URL or workflow ID.'
      }
    } else if (error.message?.includes('timeout') || error.code === 'timeout') {
      return {
        success: false,
        retry: true,
        message: 'Sync timed out. This will be retried automatically.'
      }
    } else {
      return {
        success: false,
        retry: true,
        message: 'Sync failed. This will be retried automatically.'
      }
    }
  }

  async handlePayoutError(payoutId: string, error: any, context: any = {}): Promise<{ success: boolean; retry: boolean; message: string }> {
    console.error('Payout error:', error)

    // Log the error
    await this.logError({
      error_type: 'payout_error',
      error_code: error.code || 'PAYOUT_ERROR',
      error_message: error.message,
      context: { payoutId, ...context },
      severity: 'high'
    })

    // Log payout failure
    await supabase
      .from('payout_logs')
      .insert({
        payout_id: payoutId,
        status: 'failed',
        error_message: error.message,
        stripe_error_code: error.code,
        created_at: new Date().toISOString()
      })

    // Determine retry strategy
    if (error.code === 'insufficient_funds') {
      return {
        success: false,
        retry: false,
        message: 'Insufficient funds in platform account. Payout will be processed when funds are available.'
      }
    } else if (error.code === 'account_invalid') {
      return {
        success: false,
        retry: false,
        message: 'Invalid payout account. Please update your payout information.'
      }
    } else if (error.code === 'rate_limited') {
      return {
        success: false,
        retry: true,
        message: 'Rate limited by payment processor. Payout will be retried.'
      }
    } else {
      return {
        success: false,
        retry: true,
        message: 'Payout processing failed. This will be retried automatically.'
      }
    }
  }

  async testBackupRestore(testType: 'agent_metadata' | 'user_credentials' | 'revenue_logs' | 'agent_logs' | 'full_system'): Promise<{ success: boolean; details: any; duration_ms: number }> {
    const startTime = Date.now()
    
    try {
      switch (testType) {
        case 'agent_metadata':
          return await this.testAgentMetadataRestore()
        case 'user_credentials':
          return await this.testCredentialRestore()
        case 'revenue_logs':
          return await this.testRevenueRestore()
        case 'agent_logs':
          return await this.testLogRestore()
        case 'full_system':
          return await this.testFullSystemRestore()
        default:
          throw new Error(`Unknown test type: ${testType}`)
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error('Backup restore test failed:', error)
      
      await this.logError({
        error_type: 'restore_failure',
        error_code: 'RESTORE_TEST_FAILED',
        error_message: (error as Error).message,
        context: { testType },
        severity: 'high'
      })

      return {
        success: false,
        details: { error: (error as Error).message },
        duration_ms: duration
      }
    }
  }

  private async testAgentMetadataRestore(): Promise<{ success: boolean; details: any; duration_ms: number }> {
    const startTime = Date.now()
    
    // Create test agent
    const testAgent = {
      name: `Test Agent ${Date.now()}`,
      description: 'Test agent for backup restore testing',
      user_id: 'test-user-id',
      configuration: { test: true },
      created_at: new Date().toISOString()
    }

    const { data: created, error: createError } = await supabase
      .from('agents')
      .insert(testAgent)
      .select('id')
      .single()

    if (createError) throw createError

    // Backup the agent (simulate)
    const { data: backup } = await supabase
      .from('agents')
      .select('*')
      .eq('id', created.id)
      .single()

    // Delete the agent
    await supabase
      .from('agents')
      .delete()
      .eq('id', created.id)

    // Restore the agent
    const { error: restoreError } = await supabase
      .from('agents')
      .insert(backup)

    // Clean up
    await supabase
      .from('agents')
      .delete()
      .eq('id', created.id)

    const duration = Date.now() - startTime

    return {
      success: !restoreError,
      details: {
        agent_id: created.id,
        backup_size: JSON.stringify(backup).length,
        restore_error: restoreError?.message
      },
      duration_ms: duration
    }
  }

  private async testCredentialRestore(): Promise<{ success: boolean; details: any; duration_ms: number }> {
    const startTime = Date.now()
    
    // Test credential backup/restore simulation
    const testCredential = {
      user_id: 'test-user-id',
      service_name: 'test-service',
      encrypted_credentials: 'test-encrypted-data',
      status: 'connected',
      created_at: new Date().toISOString()
    }

    const { data: created, error: createError } = await supabase
      .from('user_integrations')
      .insert(testCredential)
      .select('id')
      .single()

    if (createError) throw createError

    // Simulate backup
    const { data: backup } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('id', created.id)
      .single()

    // Delete and restore
    await supabase.from('user_integrations').delete().eq('id', created.id)
    const { error: restoreError } = await supabase.from('user_integrations').insert(backup)

    // Clean up
    await supabase.from('user_integrations').delete().eq('id', created.id)

    const duration = Date.now() - startTime

    return {
      success: !restoreError,
      details: {
        credential_id: created.id,
        restore_error: restoreError?.message
      },
      duration_ms: duration
    }
  }

  private async testRevenueRestore(): Promise<{ success: boolean; details: any; duration_ms: number }> {
    const startTime = Date.now()
    
    // Test revenue record backup/restore
    const testRevenue = {
      user_id: 'test-user-id',
      agent_id: 'test-agent-id',
      amount: 10.00,
      stripe_payment_id: 'test-payment-id',
      status: 'completed',
      created_at: new Date().toISOString()
    }

    const { data: created, error: createError } = await supabase
      .from('developer_earnings')
      .insert(testRevenue)
      .select('id')
      .single()

    if (createError) throw createError

    // Simulate backup and restore process
    const { data: backup } = await supabase
      .from('developer_earnings')
      .select('*')
      .eq('id', created.id)
      .single()

    await supabase.from('developer_earnings').delete().eq('id', created.id)
    const { error: restoreError } = await supabase.from('developer_earnings').insert(backup)

    // Clean up
    await supabase.from('developer_earnings').delete().eq('id', created.id)

    const duration = Date.now() - startTime

    return {
      success: !restoreError,
      details: {
        revenue_id: created.id,
        amount: testRevenue.amount,
        restore_error: restoreError?.message
      },
      duration_ms: duration
    }
  }

  private async testLogRestore(): Promise<{ success: boolean; details: any; duration_ms: number }> {
    const startTime = Date.now()
    
    // Test execution log backup/restore
    const testLog = {
      execution_id: `test-exec-${Date.now()}`,
      agent_id: 'test-agent-id',
      user_id: 'test-user-id',
      trigger_type: 'manual',
      execution_start: new Date().toISOString(),
      status: 'completed',
      total_steps: 3,
      completed_steps: 3,
      created_at: new Date().toISOString()
    }

    const { data: created, error: createError } = await supabase
      .from('agent_execution_logs')
      .insert(testLog)
      .select('id')
      .single()

    if (createError) throw createError

    // Simulate backup and restore
    const { data: backup } = await supabase
      .from('agent_execution_logs')
      .select('*')
      .eq('id', created.id)
      .single()

    await supabase.from('agent_execution_logs').delete().eq('id', created.id)
    const { error: restoreError } = await supabase.from('agent_execution_logs').insert(backup)

    // Clean up
    await supabase.from('agent_execution_logs').delete().eq('id', created.id)

    const duration = Date.now() - startTime

    return {
      success: !restoreError,
      details: {
        log_id: created.id,
        execution_id: testLog.execution_id,
        restore_error: restoreError?.message
      },
      duration_ms: duration
    }
  }

  private async testFullSystemRestore(): Promise<{ success: boolean; details: any; duration_ms: number }> {
    const startTime = Date.now()
    
    // Run all individual tests
    const results = await Promise.all([
      this.testAgentMetadataRestore(),
      this.testCredentialRestore(),
      this.testRevenueRestore(),
      this.testLogRestore()
    ])

    const allSuccessful = results.every(result => result.success)
    const totalDuration = results.reduce((sum, result) => sum + result.duration_ms, 0)

    return {
      success: allSuccessful,
      details: {
        individual_results: results,
        total_tests: results.length,
        successful_tests: results.filter(r => r.success).length,
        failed_tests: results.filter(r => !r.success).length
      },
      duration_ms: totalDuration
    }
  }

  async cleanupPlaceholderContent(): Promise<{ cleaned: string[]; errors: string[] }> {
    const cleaned: string[] = []
    const errors: string[] = []

    try {
      // Clean up test credentials
      const { data: testCreds, error: testCredsError } = await supabase
        .from('user_integrations')
        .select('id, service_name')
        .ilike('service_name', '%test%')

      if (testCredsError) {
        errors.push(`Failed to find test credentials: ${testCredsError.message}`)
      } else if (testCreds && testCreds.length > 0) {
        for (const cred of testCreds) {
          await supabase.from('user_integrations').delete().eq('id', cred.id)
          cleaned.push(`Removed test credential: ${cred.service_name}`)
        }
      }

      // Clean up placeholder agents
      const { data: placeholderAgents, error: agentsError } = await supabase
        .from('agents')
        .select('id, name')
        .or('name.ilike.%placeholder%,name.ilike.%test%,name.ilike.%demo%')

      if (agentsError) {
        errors.push(`Failed to find placeholder agents: ${agentsError.message}`)
      } else if (placeholderAgents && placeholderAgents.length > 0) {
        for (const agent of placeholderAgents) {
          await supabase.from('agents').delete().eq('id', agent.id)
          cleaned.push(`Removed placeholder agent: ${agent.name}`)
        }
      }

      // Clean up fake metrics in developer profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('developer_profiles')
        .select('user_id, username')
        .ilike('username', '%test%')

      if (profilesError) {
        errors.push(`Failed to find test profiles: ${profilesError.message}`)
      } else if (profiles && profiles.length > 0) {
        for (const profile of profiles) {
          await supabase.from('developer_profiles').delete().eq('user_id', profile.user_id)
          cleaned.push(`Removed test profile: ${profile.username}`)
        }
      }

    } catch (error) {
      errors.push(`Cleanup error: ${(error as Error).message}`)
    }

    return { cleaned, errors }
  }

  private async logError(errorData: Omit<ErrorReport, 'id' | 'first_occurred' | 'last_occurred' | 'occurrence_count' | 'user_impact' | 'created_at' | 'updated_at' | 'status' | 'resolution'>): Promise<string> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Check if similar error exists
    const { data: existingError } = await supabase
      .from('error_reports')
      .select('*')
      .eq('error_code', errorData.error_code)
      .eq('error_type', errorData.error_type)
      .single()

    if (existingError) {
      // Update existing error
      await supabase
        .from('error_reports')
        .update({
          last_occurred: new Date().toISOString(),
          occurrence_count: existingError.occurrence_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingError.id)
      
      return existingError.id
    } else {
      // Create new error report
      const errorReport: Omit<ErrorReport, 'resolution'> = {
        id: errorId,
        ...errorData,
        status: 'open',
        first_occurred: new Date().toISOString(),
        last_occurred: new Date().toISOString(),
        occurrence_count: 1,
        user_impact: errorData.user_id ? 1 : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await supabase
        .from('error_reports')
        .insert(errorReport)

      return errorId
    }
  }

  private async decryptCredentials(encryptedData: string): Promise<any> {
    // Use the same decryption method as the credential engine
    const crypto = require('crypto')
    const algorithm = 'aes-256-cbc'
    const key = process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-key-change-in-production'
    
    const decipher = crypto.createDecipher(algorithm, key)
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return JSON.parse(decrypted)
  }
}

const errorHandler = new SystemErrorHandler()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'handle_credential_error':
        const { user_id, service_id, error, context } = body
        if (!user_id || !service_id || !error) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const credResult = await errorHandler.handleCredentialError(user_id, service_id, error, context || {})
        return NextResponse.json({ success: true, result: credResult })

      case 'handle_sync_failure':
        const { agent_id, sync_type, error: syncError, context: syncContext } = body
        if (!agent_id || !sync_type || !syncError) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const syncResult = await errorHandler.handleSyncFailure(agent_id, sync_type, syncError, syncContext || {})
        return NextResponse.json({ success: true, result: syncResult })

      case 'handle_payout_error':
        const { payout_id, error: payoutError, context: payoutContext } = body
        if (!payout_id || !payoutError) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const payoutResult = await errorHandler.handlePayoutError(payout_id, payoutError, payoutContext || {})
        return NextResponse.json({ success: true, result: payoutResult })

      case 'test_backup_restore':
        const { test_type } = body
        if (!test_type) {
          return NextResponse.json({ error: 'Missing test_type' }, { status: 400 })
        }
        const testResult = await errorHandler.testBackupRestore(test_type)
        return NextResponse.json({ success: true, test_result: testResult })

      case 'cleanup_placeholders':
        const cleanupResult = await errorHandler.cleanupPlaceholderContent()
        return NextResponse.json({ success: true, cleanup_result: cleanupResult })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('System error handler error:', error)
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

    switch (type) {
      case 'error_reports':
        const severity = searchParams.get('severity')
        const status = searchParams.get('status')
        const limit = parseInt(searchParams.get('limit') || '50')
        
        let query = supabase
          .from('error_reports')
          .select('*')
          .order('last_occurred', { ascending: false })
          .limit(limit)

        if (severity) query = query.eq('severity', severity)
        if (status) query = query.eq('status', status)

        const { data: errorReports } = await query
        return NextResponse.json({ success: true, error_reports: errorReports })

      case 'system_health':
        // Get system health overview
        const { data: recentErrors } = await supabase
          .from('error_reports')
          .select('severity, status')
          .gte('last_occurred', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

        const health = {
          critical_errors: recentErrors?.filter(e => e.severity === 'critical' && e.status === 'open').length || 0,
          high_errors: recentErrors?.filter(e => e.severity === 'high' && e.status === 'open').length || 0,
          medium_errors: recentErrors?.filter(e => e.severity === 'medium' && e.status === 'open').length || 0,
          total_errors_24h: recentErrors?.length || 0,
          system_status: 'operational' // Would be calculated based on error thresholds
        }

        if (health.critical_errors > 0) health.system_status = 'critical'
        else if (health.high_errors > 5) health.system_status = 'degraded'
        else if (health.medium_errors > 10) health.system_status = 'warning'

        return NextResponse.json({ success: true, health })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('System error handler GET error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}
