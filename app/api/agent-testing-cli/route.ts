import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TestConfiguration {
  agent_id?: string
  webhook_url: string
  test_payload: any
  test_credentials: Record<string, any>
  expected_output?: any
  timeout_ms: number
  validate_schema: boolean
}

interface TestResult {
  test_id: string
  success: boolean
  execution_time_ms: number
  output: any
  error?: string
  validation_results: {
    schema_valid: boolean
    output_matches_expected: boolean
    performance_acceptable: boolean
  }
  logs: string[]
}

class AgentTestingCLI {
  async runLocalTest(developerId: string, testConfig: TestConfiguration): Promise<TestResult> {
    const testId = `test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    const logs: string[] = []
    const startTime = Date.now()

    try {
      logs.push(`Starting test ${testId} for developer ${developerId}`)
      
      // Validate developer access
      const hasAccess = await this.validateDeveloperAccess(developerId, testConfig.agent_id)
      if (!hasAccess) {
        throw new Error('Insufficient permissions to test this agent')
      }

      // Validate webhook URL
      if (!this.isValidWebhookUrl(testConfig.webhook_url)) {
        throw new Error('Invalid webhook URL format')
      }

      // Prepare test environment
      const testEnvironment = await this.prepareTestEnvironment(testConfig, logs)
      
      // Execute the webhook with test data
      const executionResult = await this.executeWebhookTest(testEnvironment, logs)
      
      // Validate results
      const validationResults = await this.validateTestResults(
        executionResult, 
        testConfig.expected_output,
        testConfig.validate_schema,
        logs
      )

      const executionTime = Date.now() - startTime
      
      // Log test execution
      await this.logTestExecution(testId, developerId, testConfig, executionResult, executionTime)

      return {
        test_id: testId,
        success: true,
        execution_time_ms: executionTime,
        output: executionResult.data,
        validation_results: validationResults,
        logs: logs
      }

    } catch (error) {
      const executionTime = Date.now() - startTime
      logs.push(`Test failed: ${(error as Error).message}`)

      // Log failed test
      await this.logTestExecution(testId, developerId, testConfig, null, executionTime, (error as Error).message)

      return {
        test_id: testId,
        success: false,
        execution_time_ms: executionTime,
        output: null,
        error: (error as Error).message,
        validation_results: {
          schema_valid: false,
          output_matches_expected: false,
          performance_acceptable: executionTime < testConfig.timeout_ms
        },
        logs: logs
      }
    }
  }

  async validateDeveloperAccess(developerId: string, agentId?: string): Promise<boolean> {
    if (!agentId) return true // Testing arbitrary webhook

    const { data: agent } = await supabase
      .from('agents')
      .select('developer_id')
      .eq('id', agentId)
      .single()

    return agent?.developer_id === developerId
  }

  isValidWebhookUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
      return false
    }
  }

  async prepareTestEnvironment(testConfig: TestConfiguration, logs: string[]) {
    logs.push('Preparing test environment...')

    // Validate and sanitize test credentials
    const sanitizedCredentials = this.sanitizeTestCredentials(testConfig.test_credentials)
    
    // Prepare test payload with metadata
    const testPayload = {
      ...testConfig.test_payload,
      credentials: sanitizedCredentials,
      test_mode: true,
      test_timestamp: new Date().toISOString(),
      agent_metadata: testConfig.agent_id ? await this.getAgentMetadata(testConfig.agent_id) : null
    }

    logs.push(`Test payload prepared with ${Object.keys(testPayload).length} fields`)

    return {
      webhook_url: testConfig.webhook_url,
      payload: testPayload,
      timeout_ms: testConfig.timeout_ms
    }
  }

  sanitizeTestCredentials(credentials: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    
    for (const [service, creds] of Object.entries(credentials)) {
      if (typeof creds === 'object' && creds !== null) {
        sanitized[service] = {
          ...creds,
          test_mode: true,
          // Remove sensitive fields that shouldn't be in test mode
          client_secret: undefined,
          refresh_token: creds.refresh_token ? '[REDACTED_TEST]' : undefined
        }
      } else {
        sanitized[service] = creds
      }
    }

    return sanitized
  }

  async getAgentMetadata(agentId: string) {
    const { data: agent } = await supabase
      .from('agents')
      .select('name, description, metadata, required_integrations')
      .eq('id', agentId)
      .single()

    return agent
  }

  async executeWebhookTest(testEnvironment: any, logs: string[]) {
    logs.push(`Executing webhook: ${testEnvironment.webhook_url}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), testEnvironment.timeout_ms)

    try {
      const response = await fetch(testEnvironment.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AgentFlow-TestingCLI/1.0',
          'X-Test-Mode': 'true'
        },
        body: JSON.stringify(testEnvironment.payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      logs.push(`Webhook responded with status: ${response.status}`)

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
      }

      const responseData = await response.json()
      logs.push(`Response received: ${JSON.stringify(responseData).substring(0, 200)}...`)

      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      }

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Webhook test timed out after ${testEnvironment.timeout_ms}ms`)
      }
      
      throw error
    }
  }

  async validateTestResults(
    executionResult: any,
    expectedOutput: any,
    validateSchema: boolean,
    logs: string[]
  ) {
    logs.push('Validating test results...')

    const validation = {
      schema_valid: true,
      output_matches_expected: true,
      performance_acceptable: true
    }

    // Schema validation
    if (validateSchema && expectedOutput) {
      validation.schema_valid = this.validateOutputSchema(executionResult.data, expectedOutput)
      logs.push(`Schema validation: ${validation.schema_valid ? 'PASS' : 'FAIL'}`)
    }

    // Output matching
    if (expectedOutput) {
      validation.output_matches_expected = this.compareOutputs(executionResult.data, expectedOutput)
      logs.push(`Output matching: ${validation.output_matches_expected ? 'PASS' : 'FAIL'}`)
    }

    return validation
  }

  validateOutputSchema(actual: any, expected: any): boolean {
    if (typeof actual !== typeof expected) return false
    
    if (typeof expected === 'object' && expected !== null) {
      for (const key in expected) {
        if (!(key in actual)) return false
        if (typeof actual[key] !== typeof expected[key]) return false
      }
    }

    return true
  }

  compareOutputs(actual: any, expected: any): boolean {
    try {
      return JSON.stringify(actual) === JSON.stringify(expected)
    } catch {
      return false
    }
  }

  async logTestExecution(
    testId: string,
    developerId: string,
    testConfig: TestConfiguration,
    result: any,
    executionTime: number,
    error?: string
  ) {
    await supabase
      .from('agent_test_logs')
      .insert({
        test_id: testId,
        developer_id: developerId,
        agent_id: testConfig.agent_id,
        webhook_url: testConfig.webhook_url,
        test_payload: testConfig.test_payload,
        test_result: result,
        execution_time_ms: executionTime,
        success: !error,
        error_message: error,
        created_at: new Date().toISOString()
      })
  }

  async getTestHistory(developerId: string, agentId?: string) {
    let query = supabase
      .from('agent_test_logs')
      .select('*')
      .eq('developer_id', developerId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  async generateTestTemplate(agentId: string, developerId: string) {
    // Verify ownership
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('developer_id', developerId)
      .single()

    if (!agent) {
      throw new Error('Agent not found or access denied')
    }

    const template = {
      webhook_url: agent.webhook_url || agent.metadata?.webhook_url || 'https://your-webhook-url.com/webhook',
      test_payload: {
        user_input: 'Sample input data',
        timestamp: new Date().toISOString(),
        ...this.generateSampleInputs(agent.required_integrations)
      },
      test_credentials: this.generateTestCredentialTemplate(agent.required_integrations),
      expected_output: {
        success: true,
        message: 'Expected success message',
        data: {}
      },
      timeout_ms: 30000,
      validate_schema: true
    }

    return template
  }

  generateSampleInputs(requiredIntegrations: string[]): any {
    const samples: any = {}

    requiredIntegrations?.forEach(integration => {
      switch (integration.toLowerCase()) {
        case 'slack':
          samples.slack_channel = '#general'
          samples.slack_message = 'Test message'
          break
        case 'gmail':
          samples.gmail_to = 'test@example.com'
          samples.gmail_subject = 'Test Email'
          break
        case 'notion':
          samples.notion_page_id = 'test-page-id'
          samples.notion_content = 'Test content'
          break
        case 'airtable':
          samples.airtable_base = 'test-base'
          samples.airtable_table = 'test-table'
          break
        default:
          samples[`${integration}_data`] = 'Test data'
      }
    })

    return samples
  }

  generateTestCredentialTemplate(requiredIntegrations: string[]): any {
    const template: any = {}

    requiredIntegrations?.forEach(integration => {
      template[integration] = {
        access_token: 'test_token_123',
        token_type: 'Bearer',
        expires_in: 3600,
        test_mode: true
      }
    })

    return template
  }
}

const testingCLI = new AgentTestingCLI()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, developer_id } = body

    if (!developer_id) {
      return NextResponse.json({ error: 'Missing developer_id' }, { status: 400 })
    }

    switch (action) {
      case 'run_test':
        const testResult = await testingCLI.runLocalTest(developer_id, body.test_config)
        return NextResponse.json({
          success: true,
          test_result: testResult
        })

      case 'generate_template':
        const template = await testingCLI.generateTestTemplate(body.agent_id, developer_id)
        return NextResponse.json({
          success: true,
          template: template
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Testing CLI error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const developerId = searchParams.get('developer_id')
    const agentId = searchParams.get('agent_id')
    const type = searchParams.get('type')

    if (!developerId) {
      return NextResponse.json({ error: 'Missing developer_id' }, { status: 400 })
    }

    switch (type) {
      case 'test_history':
        const history = await testingCLI.getTestHistory(developerId, agentId || undefined)
        return NextResponse.json({
          success: true,
          test_history: history
        })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Testing CLI GET error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}
