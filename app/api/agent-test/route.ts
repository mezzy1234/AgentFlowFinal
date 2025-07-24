import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TestExecution {
  id: string
  execution_id: string
  trigger_type: string
  execution_status: string
  started_at: string
  completed_at?: string
  duration_ms?: number
  input_data: any
  output_data?: any
  error_message?: string
}

interface TestSession {
  id: string
  test_name?: string
  status: string
  webhook_url: string
  test_token: string
  executions_count: number
  max_executions: number
  expires_at: string
}

class AgentTestManager {
  async startTestSession(
    userId: string,
    agentData: any,
    options: {
      testName?: string
      testType?: string
      agentId?: string
      uploadSessionId?: string
      maxExecutions?: number
    } = {}
  ): Promise<{ session_id: string; webhook_url: string; test_token: string; error?: string }> {
    try {
      // Validate agent data
      if (!agentData || typeof agentData !== 'object') {
        return { session_id: '', webhook_url: '', test_token: '', error: 'Invalid agent data' }
      }

      // Start test session
      const { data: sessionId, error } = await supabase.rpc('start_agent_test_session', {
        p_user_id: userId,
        p_agent_data: agentData,
        p_test_name: options.testName,
        p_test_type: options.testType || 'manual',
        p_agent_id: options.agentId,
        p_upload_session_id: options.uploadSessionId
      })

      if (error || !sessionId) {
        return { session_id: '', webhook_url: '', test_token: '', error: 'Failed to create test session' }
      }

      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('agent_test_sessions')
        .select('webhook_url, test_token')
        .eq('id', sessionId)
        .single()

      if (sessionError || !session) {
        return { session_id: '', webhook_url: '', test_token: '', error: 'Failed to retrieve session details' }
      }

      // Set max executions if provided
      if (options.maxExecutions) {
        await supabase
          .from('agent_test_sessions')
          .update({ max_executions: options.maxExecutions })
          .eq('id', sessionId)
      }

      return {
        session_id: sessionId,
        webhook_url: session.webhook_url,
        test_token: session.test_token
      }
    } catch (error) {
      console.error('Test session start error:', error)
      return { session_id: '', webhook_url: '', test_token: '', error: 'Internal server error' }
    }
  }

  async executeTest(
    sessionId: string,
    triggerType: string,
    inputData: any = {},
    userId: string
  ): Promise<{ execution_id: string; success: boolean; error?: string }> {
    try {
      // Verify session belongs to user and is active
      const { data: session, error: sessionError } = await supabase
        .from('agent_test_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (sessionError || !session) {
        return { execution_id: '', success: false, error: 'Invalid or inactive test session' }
      }

      // Check if session has expired
      if (new Date(session.expires_at) < new Date()) {
        await this.endTestSession(sessionId, userId, 'Session expired')
        return { execution_id: '', success: false, error: 'Test session has expired' }
      }

      // Check execution limit
      if (session.executions_count >= session.max_executions) {
        return { execution_id: '', success: false, error: 'Maximum test executions reached' }
      }

      // Generate execution ID
      const executionId = `test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`

      // Record test execution start
      const { data: executionUuid, error: executionError } = await supabase.rpc('record_test_execution', {
        p_session_id: sessionId,
        p_execution_id: executionId,
        p_trigger_type: triggerType,
        p_input_data: inputData,
        p_metadata: {
          user_agent: 'AgentFlow-Test',
          test_environment: 'sandbox',
          started_by: userId
        }
      })

      if (executionError) {
        return { execution_id: '', success: false, error: 'Failed to record test execution' }
      }

      // Execute the agent (simulate for now)
      await this.simulateAgentExecution(sessionId, executionUuid, session.agent_data, inputData)

      return { execution_id: executionId, success: true }
    } catch (error) {
      console.error('Test execution error:', error)
      return { execution_id: '', success: false, error: 'Test execution failed' }
    }
  }

  private async simulateAgentExecution(
    sessionId: string,
    executionUuid: string,
    agentData: any,
    inputData: any
  ) {
    const startTime = Date.now()
    
    try {
      // Simulate agent processing
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500)) // 0.5-2.5s

      // Simulate random success/failure (90% success rate)
      const isSuccess = Math.random() > 0.1
      const endTime = Date.now()
      const duration = endTime - startTime

      if (isSuccess) {
        // Simulate successful output
        const outputData = {
          status: 'success',
          message: 'Agent executed successfully',
          result: {
            processed_data: inputData,
            timestamp: new Date().toISOString(),
            execution_id: executionUuid
          }
        }

        await supabase.rpc('complete_test_execution', {
          p_execution_uuid: executionUuid,
          p_status: 'success',
          p_output_data: outputData,
          p_duration_ms: duration,
          p_steps_executed: Math.floor(Math.random() * 5) + 1,
          p_steps_total: Math.floor(Math.random() * 5) + 1
        })

        // Record performance metrics
        await this.recordTestMetrics(sessionId, executionUuid, duration)
      } else {
        // Simulate failure
        await supabase.rpc('complete_test_execution', {
          p_execution_uuid: executionUuid,
          p_status: 'failed',
          p_duration_ms: duration,
          p_error_message: 'Simulated test failure',
          p_error_details: JSON.stringify({
            error_type: 'test_simulation',
            step_failed: 'data_processing',
            details: 'Random test failure for demonstration'
          })
        })
      }
    } catch (error) {
      // Handle execution error
      await supabase.rpc('complete_test_execution', {
        p_execution_uuid: executionUuid,
        p_status: 'failed',
        p_duration_ms: Date.now() - startTime,
        p_error_message: 'Execution error',
        p_error_details: JSON.stringify({ error: error.message })
      })
    }
  }

  private async recordTestMetrics(sessionId: string, executionUuid: string, duration: number) {
    const metrics = [
      { name: 'response_time', value: duration, unit: 'ms' },
      { name: 'memory_usage', value: Math.random() * 100 + 20, unit: 'mb' },
      { name: 'cpu_usage', value: Math.random() * 50 + 10, unit: 'percent' },
      { name: 'api_calls', value: Math.floor(Math.random() * 5) + 1, unit: 'count' }
    ]

    for (const metric of metrics) {
      await supabase.rpc('record_test_metric', {
        p_session_id: sessionId,
        p_execution_id: executionUuid,
        p_metric_name: metric.name,
        p_metric_value: metric.value,
        p_metric_unit: metric.unit
      })
    }
  }

  async getTestSessionSummary(sessionId: string, userId: string) {
    try {
      // Verify session belongs to user
      const { data: session, error: sessionError } = await supabase
        .from('agent_test_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single()

      if (sessionError || !session) {
        return { error: 'Test session not found' }
      }

      // Get session summary
      const { data: summary, error: summaryError } = await supabase.rpc('get_test_session_summary', {
        p_session_id: sessionId
      })

      if (summaryError || !summary || summary.length === 0) {
        return { error: 'Failed to get session summary' }
      }

      // Get recent executions
      const { data: executions, error: executionsError } = await supabase
        .from('agent_test_executions')
        .select('*')
        .eq('test_session_id', sessionId)
        .order('started_at', { ascending: false })
        .limit(10)

      // Get performance metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('agent_test_metrics')
        .select('*')
        .eq('test_session_id', sessionId)
        .order('timestamp', { ascending: false })
        .limit(20)

      return {
        session: session,
        summary: summary[0],
        executions: executions || [],
        metrics: metrics || []
      }
    } catch (error) {
      console.error('Test session summary error:', error)
      return { error: 'Failed to get test session summary' }
    }
  }

  async runTestScenario(
    sessionId: string,
    scenarioId: string,
    userId: string
  ): Promise<{ success: boolean; results?: any; error?: string }> {
    try {
      // Get test scenario
      const { data: scenario, error: scenarioError } = await supabase
        .from('agent_test_scenarios')
        .select('*')
        .eq('id', scenarioId)
        .eq('is_active', true)
        .single()

      if (scenarioError || !scenario) {
        return { success: false, error: 'Test scenario not found' }
      }

      const testData = scenario.test_data
      const validationRules = scenario.validation_rules

      // Execute test based on scenario type
      switch (scenario.scenario_type) {
        case 'webhook_test':
          return await this.runWebhookTest(sessionId, testData, validationRules, userId)
        case 'api_test':
          return await this.runApiTest(sessionId, testData, validationRules, userId)
        case 'performance_test':
          return await this.runPerformanceTest(sessionId, testData, validationRules, userId)
        default:
          return { success: false, error: 'Unsupported scenario type' }
      }
    } catch (error) {
      console.error('Test scenario error:', error)
      return { success: false, error: 'Test scenario execution failed' }
    }
  }

  private async runWebhookTest(sessionId: string, testData: any, validationRules: any[], userId: string) {
    const result = await this.executeTest(sessionId, 'webhook', testData.input, userId)
    
    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Wait for execution to complete
    await new Promise(resolve => setTimeout(resolve, testData.timeout_ms || 5000))

    // Get execution results
    const { data: execution } = await supabase
      .from('agent_test_executions')
      .select('*')
      .eq('execution_id', result.execution_id)
      .single()

    if (!execution) {
      return { success: false, error: 'Execution not found' }
    }

    // Validate results
    const validationResults = this.validateTestResults(execution, validationRules)

    return {
      success: validationResults.passed,
      results: {
        execution: execution,
        validation: validationResults,
        scenario_type: 'webhook_test'
      }
    }
  }

  private async runApiTest(sessionId: string, testData: any, validationRules: any[], userId: string) {
    // Similar to webhook test but with API-specific validation
    return this.runWebhookTest(sessionId, testData, validationRules, userId)
  }

  private async runPerformanceTest(sessionId: string, testData: any, validationRules: any[], userId: string) {
    const concurrentRequests = testData.concurrent_requests || 1
    const totalRequests = testData.total_requests || 10

    const results = []
    const startTime = Date.now()

    // Run concurrent batches
    for (let batch = 0; batch < Math.ceil(totalRequests / concurrentRequests); batch++) {
      const batchPromises = []
      const batchSize = Math.min(concurrentRequests, totalRequests - batch * concurrentRequests)

      for (let i = 0; i < batchSize; i++) {
        batchPromises.push(this.executeTest(sessionId, 'performance', testData.input, userId))
      }

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Small delay between batches
      if (batch < Math.ceil(totalRequests / concurrentRequests) - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    const endTime = Date.now()
    const totalDuration = endTime - startTime

    // Calculate performance metrics
    const successfulResults = results.filter(r => r.success)
    const successRate = (successfulResults.length / results.length) * 100
    const averageResponseTime = totalDuration / results.length
    const throughput = (results.length / totalDuration) * 1000 // requests per second

    const performanceMetrics = {
      total_requests: results.length,
      successful_requests: successfulResults.length,
      success_rate: successRate,
      average_response_time_ms: averageResponseTime,
      throughput_rps: throughput,
      total_duration_ms: totalDuration
    }

    // Validate performance metrics
    const validationResults = this.validatePerformanceResults(performanceMetrics, validationRules)

    return {
      success: validationResults.passed,
      results: {
        performance_metrics: performanceMetrics,
        validation: validationResults,
        scenario_type: 'performance_test'
      }
    }
  }

  private validateTestResults(execution: any, validationRules: any[]) {
    const results = { passed: true, checks: [] }

    for (const rule of validationRules) {
      let checkPassed = false
      let checkMessage = ''

      switch (rule.type) {
        case 'response_time':
          checkPassed = execution.duration_ms <= rule.max_ms
          checkMessage = `Response time: ${execution.duration_ms}ms (max: ${rule.max_ms}ms)`
          break
        case 'status_check':
          checkPassed = execution.execution_status === 'success'
          checkMessage = `Execution status: ${execution.execution_status}`
          break
        case 'output_format':
          checkPassed = this.validateOutputFormat(execution.output_data, rule.required_fields)
          checkMessage = `Output format validation`
          break
        default:
          checkPassed = true
          checkMessage = `Unknown validation rule: ${rule.type}`
      }

      results.checks.push({
        rule: rule.type,
        passed: checkPassed,
        message: checkMessage
      })

      if (!checkPassed) {
        results.passed = false
      }
    }

    return results
  }

  private validatePerformanceResults(metrics: any, validationRules: any[]) {
    const results = { passed: true, checks: [] }

    for (const rule of validationRules) {
      let checkPassed = false
      let checkMessage = ''

      switch (rule.type) {
        case 'response_time':
          checkPassed = metrics.average_response_time_ms <= rule.max_ms
          checkMessage = `Average response time: ${metrics.average_response_time_ms}ms (max: ${rule.max_ms}ms)`
          break
        case 'success_rate':
          checkPassed = metrics.success_rate >= rule.min_percent
          checkMessage = `Success rate: ${metrics.success_rate}% (min: ${rule.min_percent}%)`
          break
        case 'throughput':
          checkPassed = metrics.throughput_rps >= rule.min_rps
          checkMessage = `Throughput: ${metrics.throughput_rps} RPS (min: ${rule.min_rps} RPS)`
          break
        default:
          checkPassed = true
          checkMessage = `Unknown performance rule: ${rule.type}`
      }

      results.checks.push({
        rule: rule.type,
        passed: checkPassed,
        message: checkMessage
      })

      if (!checkPassed) {
        results.passed = false
      }
    }

    return results
  }

  private validateOutputFormat(outputData: any, requiredFields: string[]) {
    if (!outputData || typeof outputData !== 'object') {
      return false
    }

    for (const field of requiredFields) {
      if (!(field in outputData)) {
        return false
      }
    }

    return true
  }

  async endTestSession(sessionId: string, userId: string, feedback?: string, rating?: number) {
    const { data, error } = await supabase.rpc('end_test_session', {
      p_session_id: sessionId,
      p_user_id: userId,
      p_feedback: feedback,
      p_rating: rating
    })

    return { success: data === true, error: error?.message }
  }

  async getTestScenarios(category?: string) {
    let query = supabase
      .from('agent_test_scenarios')
      .select('*')
      .eq('is_active', true)

    if (category) {
      query = query.contains('agent_categories', [category])
    }

    const { data, error } = await query.order('usage_count', { ascending: false })

    if (error) {
      return { scenarios: [], error: 'Failed to fetch test scenarios' }
    }

    return { scenarios: data || [] }
  }

  async getUserTestSessions(userId: string, limit: number = 20) {
    const { data, error } = await supabase
      .from('agent_test_sessions')
      .select(`
        *,
        agent_test_executions (
          id,
          execution_status,
          duration_ms
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return { sessions: [], error: 'Failed to fetch test sessions' }
    }

    return { sessions: data || [] }
  }
}

const testManager = new AgentTestManager()

// POST /api/agent-test - Start test session, execute test, or run scenario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, user_id } = body

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    switch (action) {
      case 'start_session':
        return await handleStartTestSession(body)
      case 'execute':
        return await handleExecuteTest(body)
      case 'run_scenario':
        return await handleRunScenario(body)
      case 'end_session':
        return await handleEndSession(body)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Agent test API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleStartTestSession(body: any) {
  const { user_id, agent_data, test_name, test_type, agent_id, upload_session_id, max_executions } = body

  if (!agent_data) {
    return NextResponse.json({ error: 'Missing agent_data' }, { status: 400 })
  }

  const result = await testManager.startTestSession(user_id, agent_data, {
    testName: test_name,
    testType: test_type,
    agentId: agent_id,
    uploadSessionId: upload_session_id,
    maxExecutions: max_executions
  })

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({
    session_id: result.session_id,
    webhook_url: result.webhook_url,
    test_token: result.test_token
  })
}

async function handleExecuteTest(body: any) {
  const { session_id, trigger_type, input_data, user_id } = body

  if (!session_id || !trigger_type) {
    return NextResponse.json({ error: 'Missing session_id or trigger_type' }, { status: 400 })
  }

  const result = await testManager.executeTest(session_id, trigger_type, input_data, user_id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ execution_id: result.execution_id })
}

async function handleRunScenario(body: any) {
  const { session_id, scenario_id, user_id } = body

  if (!session_id || !scenario_id) {
    return NextResponse.json({ error: 'Missing session_id or scenario_id' }, { status: 400 })
  }

  const result = await testManager.runTestScenario(session_id, scenario_id, user_id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ results: result.results })
}

async function handleEndSession(body: any) {
  const { session_id, user_id, feedback, rating } = body

  if (!session_id) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  const result = await testManager.endTestSession(session_id, user_id, feedback, rating)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

// GET /api/agent-test - Get session summary, scenarios, or user sessions
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const userId = searchParams.get('user_id')

  try {
    switch (action) {
      case 'session_summary':
        const sessionId = searchParams.get('session_id')
        if (!sessionId || !userId) {
          return NextResponse.json({ error: 'Missing session_id or user_id' }, { status: 400 })
        }
        const summary = await testManager.getTestSessionSummary(sessionId, userId)
        return NextResponse.json(summary)
      
      case 'scenarios':
        const category = searchParams.get('category')
        const scenarios = await testManager.getTestScenarios(category || undefined)
        return NextResponse.json(scenarios)
      
      case 'user_sessions':
        if (!userId) {
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
        }
        const limit = parseInt(searchParams.get('limit') || '20')
        const sessions = await testManager.getUserTestSessions(userId, limit)
        return NextResponse.json(sessions)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Agent test GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
