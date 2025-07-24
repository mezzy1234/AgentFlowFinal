import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ErrorIncident {
  error_type: string
  error_category: string
  error_message: string
  affected_service?: string
  affected_user_id?: string
  severity?: string
  error_context?: any
}

interface CircuitBreakerConfig {
  service_name: string
  endpoint: string
  failure_threshold?: number
  success_threshold?: number
  timeout_duration_ms?: number
}

interface SystemHealthMetric {
  metric_type: string
  metric_name: string
  metric_value: number
  metric_unit?: string
  threshold_warning?: number
  threshold_critical?: number
  service_name?: string
  instance_id?: string
}

class EdgeCaseManager {
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
  }

  async recordErrorIncident(incident: ErrorIncident): Promise<{ success: boolean; incident_id?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('record_error_incident', {
        p_error_type: incident.error_type,
        p_error_category: incident.error_category,
        p_error_message: incident.error_message,
        p_affected_service: incident.affected_service,
        p_affected_user_id: incident.affected_user_id,
        p_severity: incident.severity || 'medium',
        p_error_context: incident.error_context || {}
      })

      if (error) {
        console.error('Error incident recording error:', error)
        return { success: false, error: 'Failed to record error incident' }
      }

      return { success: true, incident_id: data }
    } catch (error) {
      console.error('Error incident exception:', error)
      return { success: false, error: 'Error incident recording failed' }
    }
  }

  async checkCircuitBreaker(serviceName: string, endpoint: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('check_circuit_breaker', {
        p_service_name: serviceName,
        p_endpoint: endpoint
      })

      if (error) {
        console.error('Circuit breaker check error:', error)
        return { success: false, error: 'Failed to check circuit breaker' }
      }

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Circuit breaker check exception:', error)
      return { success: false, error: 'Circuit breaker check failed' }
    }
  }

  async recordCircuitBreakerResult(serviceName: string, endpoint: string, success: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('record_circuit_breaker_result', {
        p_service_name: serviceName,
        p_endpoint: endpoint,
        p_success: success
      })

      if (error) {
        return { success: false, error: 'Failed to record circuit breaker result' }
      }

      return { success: true }
    } catch (error) {
      console.error('Circuit breaker result recording error:', error)
      return { success: false, error: 'Circuit breaker result recording failed' }
    }
  }

  async createCircuitBreaker(config: CircuitBreakerConfig): Promise<{ success: boolean; breaker_id?: string; error?: string }> {
    try {
      const breakerId = this.generateId('cb')

      const { error } = await supabase
        .from('circuit_breakers')
        .insert({
          id: breakerId,
          service_name: config.service_name,
          endpoint: config.endpoint,
          failure_threshold: config.failure_threshold || 5,
          success_threshold: config.success_threshold || 3,
          timeout_duration_ms: config.timeout_duration_ms || 60000,
          created_at: new Date().toISOString()
        })

      if (error) {
        return { success: false, error: 'Failed to create circuit breaker' }
      }

      return { success: true, breaker_id: breakerId }
    } catch (error) {
      console.error('Circuit breaker creation error:', error)
      return { success: false, error: 'Circuit breaker creation failed' }
    }
  }

  async recordSystemHealthMetric(metric: SystemHealthMetric): Promise<{ success: boolean; error?: string }> {
    try {
      const metricId = this.generateId('metric')

      // Determine status based on thresholds
      let status = 'normal'
      if (metric.threshold_critical && metric.metric_value >= metric.threshold_critical) {
        status = 'critical'
      } else if (metric.threshold_warning && metric.metric_value >= metric.threshold_warning) {
        status = 'warning'
      }

      const { error } = await supabase
        .from('system_health_metrics')
        .insert({
          id: metricId,
          metric_type: metric.metric_type,
          metric_name: metric.metric_name,
          metric_value: metric.metric_value,
          metric_unit: metric.metric_unit || 'count',
          threshold_warning: metric.threshold_warning,
          threshold_critical: metric.threshold_critical,
          status,
          service_name: metric.service_name,
          instance_id: metric.instance_id,
          measured_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })

      if (error) {
        return { success: false, error: 'Failed to record system health metric' }
      }

      return { success: true }
    } catch (error) {
      console.error('System health metric recording error:', error)
      return { success: false, error: 'System health metric recording failed' }
    }
  }

  async getSystemHealthStatus(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('get_system_health_status')

      if (error || !data || data.length === 0) {
        return { success: false, error: 'Failed to get system health status' }
      }

      return { success: true, data: data[0] }
    } catch (error) {
      console.error('System health status error:', error)
      return { success: false, error: 'Failed to get system health status' }
    }
  }

  async getActiveIncidents(severity?: string, limit: number = 20): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      let query = supabase
        .from('error_incidents')
        .select('*')
        .neq('recovery_status', 'recovered')

      if (severity) {
        query = query.eq('severity', severity)
      }

      const { data: incidents, error } = await query
        .order('first_occurred_at', { ascending: false })
        .limit(limit)

      if (error) {
        return { success: false, error: 'Failed to fetch active incidents' }
      }

      return { success: true, data: incidents }
    } catch (error) {
      console.error('Active incidents fetch error:', error)
      return { success: false, error: 'Failed to fetch active incidents' }
    }
  }

  async resolveIncident(incidentId: string, resolutionMethod: string, resolutionNotes?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('error_incidents')
        .update({
          recovery_status: 'recovered',
          resolved_at: new Date().toISOString(),
          resolution_method: resolutionMethod,
          resolution_notes: resolutionNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', incidentId)

      if (error) {
        return { success: false, error: 'Failed to resolve incident' }
      }

      return { success: true }
    } catch (error) {
      console.error('Incident resolution error:', error)
      return { success: false, error: 'Incident resolution failed' }
    }
  }

  async recordRateLimitIncident(
    userId: string,
    ipAddress: string,
    limitType: string,
    limitValue: number,
    currentUsage: number,
    timeWindowMinutes: number
  ): Promise<{ success: boolean; incident_id?: string; error?: string }> {
    try {
      const incidentId = this.generateId('rli')

      const { error } = await supabase
        .from('rate_limit_incidents')
        .insert({
          id: incidentId,
          user_id: userId,
          ip_address: ipAddress,
          limit_type: limitType,
          limit_value: limitValue,
          current_usage: currentUsage,
          time_window_minutes: timeWindowMinutes,
          exceeded_by: currentUsage - limitValue,
          incident_time: new Date().toISOString(),
          created_at: new Date().toISOString()
        })

      if (error) {
        return { success: false, error: 'Failed to record rate limit incident' }
      }

      return { success: true, incident_id: incidentId }
    } catch (error) {
      console.error('Rate limit incident recording error:', error)
      return { success: false, error: 'Rate limit incident recording failed' }
    }
  }

  async recordPaymentEdgeCase(
    userId: string,
    caseType: string,
    caseDescription: string,
    intendedAmountCents?: number,
    actualAmountCents?: number,
    paymentIntentId?: string
  ): Promise<{ success: boolean; case_id?: string; error?: string }> {
    try {
      const caseId = this.generateId('pec')

      const { error } = await supabase
        .from('payment_edge_cases')
        .insert({
          id: caseId,
          user_id: userId,
          payment_intent_id: paymentIntentId,
          case_type: caseType,
          case_description: caseDescription,
          intended_amount_cents: intendedAmountCents,
          actual_amount_cents: actualAmountCents,
          discrepancy_cents: intendedAmountCents && actualAmountCents ? 
            Math.abs(intendedAmountCents - actualAmountCents) : 0,
          created_at: new Date().toISOString()
        })

      if (error) {
        return { success: false, error: 'Failed to record payment edge case' }
      }

      return { success: true, case_id: caseId }
    } catch (error) {
      console.error('Payment edge case recording error:', error)
      return { success: false, error: 'Payment edge case recording failed' }
    }
  }

  async recordIntegrationFailure(
    integrationName: string,
    failureType: string,
    endpoint: string,
    errorMessage: string,
    affectedFeatures: string[]
  ): Promise<{ success: boolean; failure_id?: string; error?: string }> {
    try {
      const failureId = this.generateId('if')

      const { error } = await supabase
        .from('integration_failures')
        .insert({
          id: failureId,
          integration_name: integrationName,
          failure_type: failureType,
          endpoint: endpoint,
          error_message: errorMessage,
          affected_features: affectedFeatures,
          first_failed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })

      if (error) {
        return { success: false, error: 'Failed to record integration failure' }
      }

      return { success: true, failure_id: failureId }
    } catch (error) {
      console.error('Integration failure recording error:', error)
      return { success: false, error: 'Integration failure recording failed' }
    }
  }

  async getCircuitBreakerStatus(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data: breakers, error } = await supabase
        .from('circuit_breakers')
        .select('*')
        .eq('is_enabled', true)
        .order('service_name')

      if (error) {
        return { success: false, error: 'Failed to fetch circuit breaker status' }
      }

      return { success: true, data: breakers }
    } catch (error) {
      console.error('Circuit breaker status fetch error:', error)
      return { success: false, error: 'Failed to fetch circuit breaker status' }
    }
  }
}

const edgeCaseManager = new EdgeCaseManager()

// POST /api/edge-case-handling - Record incidents, metrics, and edge cases
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'record_error':
        return await handleRecordError(body)
      case 'record_health_metric':
        return await handleRecordHealthMetric(body)
      case 'create_circuit_breaker':
        return await handleCreateCircuitBreaker(body)
      case 'record_rate_limit_incident':
        return await handleRecordRateLimitIncident(body)
      case 'record_payment_edge_case':
        return await handleRecordPaymentEdgeCase(body)
      case 'record_integration_failure':
        return await handleRecordIntegrationFailure(body)
      case 'resolve_incident':
        return await handleResolveIncident(body)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Edge Case Handling API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleRecordError(body: any) {
  const { error_type, error_category, error_message, affected_service, affected_user_id, severity, error_context } = body

  if (!error_type || !error_category || !error_message) {
    return NextResponse.json({ error: 'Missing required error data' }, { status: 400 })
  }

  const result = await edgeCaseManager.recordErrorIncident({
    error_type,
    error_category,
    error_message,
    affected_service,
    affected_user_id,
    severity,
    error_context
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ incident_id: result.incident_id })
}

async function handleRecordHealthMetric(body: any) {
  const { metric_type, metric_name, metric_value, metric_unit, threshold_warning, threshold_critical, service_name, instance_id } = body

  if (!metric_type || !metric_name || metric_value === undefined) {
    return NextResponse.json({ error: 'Missing required metric data' }, { status: 400 })
  }

  const result = await edgeCaseManager.recordSystemHealthMetric({
    metric_type,
    metric_name,
    metric_value,
    metric_unit,
    threshold_warning,
    threshold_critical,
    service_name,
    instance_id
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

async function handleCreateCircuitBreaker(body: any) {
  const { service_name, endpoint, failure_threshold, success_threshold, timeout_duration_ms } = body

  if (!service_name || !endpoint) {
    return NextResponse.json({ error: 'Missing service_name or endpoint' }, { status: 400 })
  }

  const result = await edgeCaseManager.createCircuitBreaker({
    service_name,
    endpoint,
    failure_threshold,
    success_threshold,
    timeout_duration_ms
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ breaker_id: result.breaker_id })
}

async function handleRecordRateLimitIncident(body: any) {
  const { user_id, ip_address, limit_type, limit_value, current_usage, time_window_minutes } = body

  if (!user_id || !limit_type || !limit_value || !current_usage || !time_window_minutes) {
    return NextResponse.json({ error: 'Missing required rate limit incident data' }, { status: 400 })
  }

  const result = await edgeCaseManager.recordRateLimitIncident(
    user_id, ip_address, limit_type, limit_value, current_usage, time_window_minutes
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ incident_id: result.incident_id })
}

async function handleRecordPaymentEdgeCase(body: any) {
  const { user_id, case_type, case_description, intended_amount_cents, actual_amount_cents, payment_intent_id } = body

  if (!user_id || !case_type || !case_description) {
    return NextResponse.json({ error: 'Missing required payment edge case data' }, { status: 400 })
  }

  const result = await edgeCaseManager.recordPaymentEdgeCase(
    user_id, case_type, case_description, intended_amount_cents, actual_amount_cents, payment_intent_id
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ case_id: result.case_id })
}

async function handleRecordIntegrationFailure(body: any) {
  const { integration_name, failure_type, endpoint, error_message, affected_features } = body

  if (!integration_name || !failure_type || !error_message) {
    return NextResponse.json({ error: 'Missing required integration failure data' }, { status: 400 })
  }

  const result = await edgeCaseManager.recordIntegrationFailure(
    integration_name, failure_type, endpoint, error_message, affected_features || []
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ failure_id: result.failure_id })
}

async function handleResolveIncident(body: any) {
  const { incident_id, resolution_method, resolution_notes } = body

  if (!incident_id || !resolution_method) {
    return NextResponse.json({ error: 'Missing incident_id or resolution_method' }, { status: 400 })
  }

  const result = await edgeCaseManager.resolveIncident(incident_id, resolution_method, resolution_notes)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

// GET /api/edge-case-handling - Get system status, incidents, and monitoring data
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const serviceName = searchParams.get('service_name')
  const endpoint = searchParams.get('endpoint')
  const severity = searchParams.get('severity')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    switch (type) {
      case 'system_health':
        const healthStatus = await edgeCaseManager.getSystemHealthStatus()
        if (!healthStatus.success) {
          return NextResponse.json({ error: healthStatus.error }, { status: 400 })
        }
        return NextResponse.json(healthStatus.data)

      case 'circuit_breaker_check':
        if (!serviceName || !endpoint) {
          return NextResponse.json({ error: 'Missing service_name or endpoint' }, { status: 400 })
        }
        const circuitCheck = await edgeCaseManager.checkCircuitBreaker(serviceName, endpoint)
        if (!circuitCheck.success) {
          return NextResponse.json({ error: circuitCheck.error }, { status: 400 })
        }
        return NextResponse.json(circuitCheck.data)

      case 'circuit_breaker_status':
        const circuitStatus = await edgeCaseManager.getCircuitBreakerStatus()
        if (!circuitStatus.success) {
          return NextResponse.json({ error: circuitStatus.error }, { status: 400 })
        }
        return NextResponse.json({ circuit_breakers: circuitStatus.data })

      case 'active_incidents':
        const incidents = await edgeCaseManager.getActiveIncidents(severity || undefined, limit)
        if (!incidents.success) {
          return NextResponse.json({ error: incidents.error }, { status: 400 })
        }
        return NextResponse.json({ incidents: incidents.data })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Edge Case Handling GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/edge-case-handling - Update circuit breaker results
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'record_circuit_breaker_result':
        const { service_name, endpoint, success } = body

        if (!service_name || !endpoint || success === undefined) {
          return NextResponse.json({ error: 'Missing required circuit breaker data' }, { status: 400 })
        }

        const result = await edgeCaseManager.recordCircuitBreakerResult(service_name, endpoint, success)

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Edge Case Handling PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
