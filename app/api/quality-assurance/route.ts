import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Quality Assurance and Test Automation API
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
      case 'run_quality_checks':
        return await runQualityChecks(supabase, user.id, actionData);
      
      case 'create_test_pipeline':
        return await createTestPipeline(supabase, user.id, actionData);
      
      case 'run_automated_tests':
        return await runAutomatedTests(supabase, user.id, actionData);
      
      case 'validate_agent_quality':
        return await validateAgentQuality(supabase, user.id, actionData);
      
      case 'setup_monitoring':
        return await setupMonitoring(supabase, user.id, actionData);
      
      case 'generate_quality_report':
        return await generateQualityReport(supabase, user.id, actionData);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('QA API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// GET endpoint for QA data and reports
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
    const agentId = searchParams.get('agentId');

    switch (dataType) {
      case 'quality_metrics':
        return await getQualityMetrics(supabase, user.id, agentId);
      
      case 'test_pipelines':
        return await getTestPipelines(supabase, user.id, agentId);
      
      case 'quality_reports':
        return await getQualityReports(supabase, user.id, agentId);
      
      case 'monitoring_status':
        return await getMonitoringStatus(supabase, user.id, agentId);
      
      default:
        return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('QA GET API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// Implementation functions
async function runQualityChecks(supabase: any, userId: string, data: any) {
  const { agentId, checkTypes = ['code_quality', 'security', 'performance', 'reliability'] } = data;

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

  const qualityResults = {
    agentId,
    checkTimestamp: new Date().toISOString(),
    checks: {} as Record<string, any>
  };

  // Run each quality check
  for (const checkType of checkTypes) {
    try {
      let checkResult;
      
      switch (checkType) {
        case 'code_quality':
          checkResult = await runCodeQualityCheck(agent);
          break;
        case 'security':
          checkResult = await runSecurityCheck(agent);
          break;
        case 'performance':
          checkResult = await runPerformanceCheck(agent);
          break;
        case 'reliability':
          checkResult = await runReliabilityCheck(agent);
          break;
        default:
          checkResult = { status: 'skipped', message: 'Unknown check type' };
      }
      
      qualityResults.checks[checkType] = checkResult;
      
    } catch (error: any) {
      qualityResults.checks[checkType] = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Calculate overall quality score
  const passedChecks = Object.values(qualityResults.checks).filter((check: any) => check.status === 'passed').length;
  const totalChecks = Object.keys(qualityResults.checks).length;
  const qualityScore = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

  // Save quality check results
  const { data: qualityRecord, error: saveError } = await supabase
    .from('agent_quality_checks')
    .insert({
      agent_id: agentId,
      checked_by: userId,
      check_results: qualityResults.checks,
      quality_score: qualityScore,
      status: qualityScore >= 80 ? 'passed' : qualityScore >= 60 ? 'warning' : 'failed'
    })
    .select()
    .single();

  if (saveError) {
    console.error('Failed to save quality check results:', saveError);
  }

  return NextResponse.json({
    success: true,
    qualityResults: {
      ...qualityResults,
      qualityScore,
      status: qualityScore >= 80 ? 'passed' : qualityScore >= 60 ? 'warning' : 'failed',
      recordId: qualityRecord?.id
    }
  });
}

async function createTestPipeline(supabase: any, userId: string, data: any) {
  const { 
    agentId, 
    pipelineName, 
    stages = ['lint', 'test', 'security', 'performance'],
    trigger = 'manual',
    schedule 
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

  // Create test pipeline configuration
  const pipelineConfig = {
    stages: stages.map((stage: string, index: number) => ({
      name: stage,
      order: index,
      enabled: true,
      configuration: getStageConfiguration(stage)
    })),
    trigger,
    schedule: schedule || null,
    notifications: {
      onSuccess: true,
      onFailure: true,
      channels: ['email'] // Could include webhook, slack, etc.
    }
  };

  const { data: pipeline, error } = await supabase
    .from('test_pipelines')
    .insert({
      agent_id: agentId,
      created_by: userId,
      pipeline_name: pipelineName,
      configuration: pipelineConfig,
      active: true
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create test pipeline:', error);
    return NextResponse.json({ error: 'Failed to create pipeline' }, { status: 500 });
  }

  // Register with n8n for pipeline execution
  if (process.env.N8N_PIPELINE_WEBHOOK_URL) {
    try {
      await fetch(process.env.N8N_PIPELINE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'register_pipeline',
          pipelineId: pipeline.id,
          agentId,
          configuration: pipelineConfig
        })
      });
    } catch (error) {
      console.error('Failed to register pipeline with n8n:', error);
    }
  }

  return NextResponse.json({
    success: true,
    pipeline: {
      id: pipeline.id,
      name: pipeline.pipeline_name,
      stages: pipelineConfig.stages.length
    }
  });
}

async function runAutomatedTests(supabase: any, userId: string, data: any) {
  const { pipelineId, agentId } = data;

  // Get pipeline configuration
  let pipeline;
  if (pipelineId) {
    const { data: pipelineData } = await supabase
      .from('test_pipelines')
      .select('*')
      .eq('id', pipelineId)
      .eq('created_by', userId)
      .single();
    pipeline = pipelineData;
  } else if (agentId) {
    // Run default pipeline for agent
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('created_by', userId)
      .single();
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found or access denied' }, { status: 403 });
    }

    // Create temporary pipeline
    pipeline = {
      id: 'temp',
      agent_id: agentId,
      configuration: {
        stages: [
          { name: 'lint', order: 0, enabled: true },
          { name: 'test', order: 1, enabled: true },
          { name: 'security', order: 2, enabled: true }
        ]
      }
    };
  }

  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
  }

  // Create pipeline run record
  const { data: pipelineRun, error: runError } = await supabase
    .from('pipeline_runs')
    .insert({
      pipeline_id: pipeline.id === 'temp' ? null : pipeline.id,
      agent_id: pipeline.agent_id,
      run_by: userId,
      status: 'running',
      total_stages: pipeline.configuration.stages.length
    })
    .select()
    .single();

  if (runError) {
    console.error('Failed to create pipeline run:', runError);
    return NextResponse.json({ error: 'Failed to start pipeline' }, { status: 500 });
  }

  // Execute pipeline stages
  const stageResults = [];
  let failedStages = 0;

  for (const stage of pipeline.configuration.stages) {
    if (!stage.enabled) continue;

    try {
      const stageResult = await executeStage(stage, pipeline.agent_id, supabase);
      stageResults.push({
        stage_name: stage.name,
        status: stageResult.success ? 'passed' : 'failed',
        execution_time_ms: stageResult.executionTime,
        output: stageResult.output,
        error_message: stageResult.error
      });

      if (!stageResult.success) {
        failedStages++;
        // Stop pipeline if stage fails (configurable)
        break;
      }
    } catch (error: any) {
      stageResults.push({
        stage_name: stage.name,
        status: 'failed',
        execution_time_ms: 0,
        error_message: error.message
      });
      failedStages++;
      break;
    }
  }

  // Save stage results
  if (stageResults.length > 0 && pipeline.id !== 'temp') {
    const resultsWithRunId = stageResults.map(result => ({
      ...result,
      run_id: pipelineRun.id
    }));

    await supabase
      .from('pipeline_stage_results')
      .insert(resultsWithRunId);
  }

  // Update pipeline run status
  const finalStatus = failedStages === 0 ? 'passed' : 'failed';
  if (pipeline.id !== 'temp') {
    await supabase
      .from('pipeline_runs')
      .update({
        status: finalStatus,
        passed_stages: stageResults.filter(r => r.status === 'passed').length,
        failed_stages: failedStages,
        completed_at: new Date().toISOString()
      })
      .eq('id', pipelineRun.id);
  }

  return NextResponse.json({
    success: true,
    pipelineRun: {
      id: pipelineRun.id,
      status: finalStatus,
      totalStages: pipeline.configuration.stages.length,
      passedStages: stageResults.filter(r => r.status === 'passed').length,
      failedStages
    },
    results: stageResults
  });
}

async function validateAgentQuality(supabase: any, userId: string, data: any) {
  const { agentId, qualityGates = {} } = data;

  // Default quality gates
  const defaultGates = {
    minTestCoverage: 80,
    maxResponseTime: 2000,
    minSuccessRate: 95,
    securityScanPassed: true,
    ...qualityGates
  };

  // Check if user owns the agent
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .eq('created_by', userId)
    .single();

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found or access denied' }, { status: 403 });
  }

  const validationResults = {
    agentId,
    validationTimestamp: new Date().toISOString(),
    gates: {} as Record<string, any>,
    overallStatus: 'unknown' as string
  };

  // Validate each quality gate
  try {
    // Test Coverage Gate
    if (defaultGates.minTestCoverage) {
      const { data: coverage } = await supabase
        .from('test_coverage')
        .select('coverage_percentage')
        .eq('agent_id', agentId);
      
      const avgCoverage = coverage?.length > 0 
        ? coverage.reduce((sum: number, c: any) => sum + c.coverage_percentage, 0) / coverage.length
        : 0;
      
      validationResults.gates.testCoverage = {
        required: defaultGates.minTestCoverage,
        actual: avgCoverage,
        passed: avgCoverage >= defaultGates.minTestCoverage,
        message: `Test coverage is ${avgCoverage.toFixed(1)}% (required: ${defaultGates.minTestCoverage}%)`
      };
    }

    // Performance Gate
    if (defaultGates.maxResponseTime) {
      const { data: metrics } = await supabase
        .from('test_performance_metrics')
        .select('metric_value')
        .eq('agent_id', agentId)
        .eq('metric_type', 'response_time')
        .order('recorded_at', { ascending: false })
        .limit(10);
      
      const avgResponseTime = metrics?.length > 0
        ? metrics.reduce((sum: number, m: any) => sum + m.metric_value, 0) / metrics.length
        : 0;
      
      validationResults.gates.performance = {
        required: defaultGates.maxResponseTime,
        actual: avgResponseTime,
        passed: avgResponseTime <= defaultGates.maxResponseTime,
        message: `Average response time is ${avgResponseTime.toFixed(0)}ms (max: ${defaultGates.maxResponseTime}ms)`
      };
    }

    // Success Rate Gate
    if (defaultGates.minSuccessRate) {
      const { data: testRuns } = await supabase
        .from('test_runs')
        .select('status')
        .eq('run_by', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      const successRate = testRuns?.length > 0
        ? (testRuns.filter((r: any) => r.status === 'passed').length / testRuns.length) * 100
        : 0;
      
      validationResults.gates.successRate = {
        required: defaultGates.minSuccessRate,
        actual: successRate,
        passed: successRate >= defaultGates.minSuccessRate,
        message: `Success rate is ${successRate.toFixed(1)}% (min: ${defaultGates.minSuccessRate}%)`
      };
    }

    // Security Gate
    if (defaultGates.securityScanPassed) {
      const { data: securityChecks } = await supabase
        .from('agent_quality_checks')
        .select('check_results')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      const latestSecurityResult = securityChecks?.[0]?.check_results?.security;
      const securityPassed = latestSecurityResult?.status === 'passed';
      
      validationResults.gates.security = {
        required: true,
        actual: securityPassed,
        passed: securityPassed,
        message: securityPassed ? 'Security scan passed' : 'Security scan failed or not run'
      };
    }

    // Calculate overall status
    const passedGates = Object.values(validationResults.gates).filter((gate: any) => gate.passed).length;
    const totalGates = Object.keys(validationResults.gates).length;
    
    if (passedGates === totalGates) {
      validationResults.overallStatus = 'passed';
    } else if (passedGates >= totalGates * 0.8) {
      validationResults.overallStatus = 'warning';
    } else {
      validationResults.overallStatus = 'failed';
    }

    // Save validation results
    const { data: validationRecord } = await supabase
      .from('agent_quality_validations')
      .insert({
        agent_id: agentId,
        validated_by: userId,
        validation_results: validationResults.gates,
        overall_status: validationResults.overallStatus,
        quality_gates: defaultGates
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      validation: {
        ...validationResults,
        recordId: validationRecord?.id
      }
    });

  } catch (error: any) {
    console.error('Quality validation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      validation: validationResults
    }, { status: 500 });
  }
}

// Helper functions
function getStageConfiguration(stageName: string) {
  const configurations: Record<string, any> = {
    lint: {
      rules: ['no-unused-vars', 'no-console', 'prefer-const'],
      failOnError: false
    },
    test: {
      coverage: true,
      timeout: 30000,
      failFast: true
    },
    security: {
      scanTypes: ['dependency', 'static-analysis', 'secrets'],
      severity: 'medium'
    },
    performance: {
      thresholds: {
        responseTime: 2000,
        throughput: 10
      }
    }
  };

  return configurations[stageName] || {};
}

async function executeStage(stage: any, agentId: string, supabase: any) {
  const startTime = Date.now();
  
  try {
    let result;
    
    switch (stage.name) {
      case 'lint':
        result = await runLintStage(agentId, stage.configuration);
        break;
      case 'test':
        result = await runTestStage(agentId, stage.configuration);
        break;
      case 'security':
        result = await runSecurityStage(agentId, stage.configuration);
        break;
      case 'performance':
        result = await runPerformanceStage(agentId, stage.configuration);
        break;
      default:
        result = { success: false, output: 'Unknown stage type' };
    }
    
    return {
      success: result.success,
      executionTime: Date.now() - startTime,
      output: result.output,
      error: result.error || null
    };
    
  } catch (error: any) {
    return {
      success: false,
      executionTime: Date.now() - startTime,
      output: null,
      error: error.message
    };
  }
}

async function runLintStage(agentId: string, config: any) {
  // Simulate linting process
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    output: {
      filesChecked: 5,
      warnings: 2,
      errors: 0,
      issues: [
        { rule: 'no-unused-vars', line: 42, severity: 'warning' },
        { rule: 'prefer-const', line: 58, severity: 'warning' }
      ]
    }
  };
}

async function runTestStage(agentId: string, config: any) {
  // Simulate test execution
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    success: true,
    output: {
      testsRun: 25,
      passed: 24,
      failed: 1,
      coverage: 85.5,
      duration: 1850
    }
  };
}

async function runSecurityStage(agentId: string, config: any) {
  // Simulate security scan
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return {
    success: true,
    output: {
      vulnerabilities: 0,
      dependencyIssues: 0,
      secretsFound: 0,
      score: 95
    }
  };
}

async function runPerformanceStage(agentId: string, config: any) {
  // Simulate performance test
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  return {
    success: true,
    output: {
      averageResponseTime: 245,
      throughput: 45,
      errorRate: 0.1,
      p95ResponseTime: 380
    }
  };
}

// Quality check implementations
async function runCodeQualityCheck(agent: any) {
  // Simulate code quality analysis
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    status: 'passed',
    score: 85,
    metrics: {
      complexity: 'low',
      maintainability: 'high',
      readability: 'good'
    },
    timestamp: new Date().toISOString()
  };
}

async function runSecurityCheck(agent: any) {
  // Simulate security scan
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    status: 'passed',
    vulnerabilities: 0,
    issues: [],
    timestamp: new Date().toISOString()
  };
}

async function runPerformanceCheck(agent: any) {
  // Simulate performance analysis
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    status: 'passed',
    metrics: {
      responseTime: 245,
      throughput: 45,
      errorRate: 0.1
    },
    timestamp: new Date().toISOString()
  };
}

async function runReliabilityCheck(agent: any) {
  // Simulate reliability assessment
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    status: 'passed',
    uptime: 99.9,
    errorRate: 0.1,
    timestamp: new Date().toISOString()
  };
}

// GET implementation functions
async function getQualityMetrics(supabase: any, userId: string, agentId?: string) {
  let query = supabase
    .from('agent_quality_checks')
    .select('*')
    .eq('checked_by', userId);

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data: qualityChecks, error } = await query
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Failed to fetch quality metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch quality metrics' }, { status: 500 });
  }

  return NextResponse.json({
    qualityChecks: qualityChecks || []
  });
}

async function getTestPipelines(supabase: any, userId: string, agentId?: string) {
  let query = supabase
    .from('test_pipelines')
    .select(`
      *,
      pipeline_runs(id, status, created_at)
    `)
    .eq('created_by', userId);

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data: pipelines, error } = await query
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch test pipelines:', error);
    return NextResponse.json({ error: 'Failed to fetch test pipelines' }, { status: 500 });
  }

  return NextResponse.json({
    pipelines: pipelines || []
  });
}

async function getQualityReports(supabase: any, userId: string, agentId?: string) {
  let query = supabase
    .from('test_reports')
    .select('*')
    .eq('generated_by', userId)
    .eq('report_type', 'summary');

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data: reports, error } = await query
    .order('generated_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Failed to fetch quality reports:', error);
    return NextResponse.json({ error: 'Failed to fetch quality reports' }, { status: 500 });
  }

  return NextResponse.json({
    reports: reports || []
  });
}

async function getMonitoringStatus(supabase: any, userId: string, agentId?: string) {
  // Get recent test runs and performance metrics
  let testQuery = supabase
    .from('test_runs')
    .select('*')
    .eq('run_by', userId);

  if (agentId) {
    testQuery = testQuery.eq('suite_id', 
      supabase.from('test_suites').select('id').eq('agent_id', agentId)
    );
  }

  const { data: testRuns } = await testQuery
    .order('created_at', { ascending: false })
    .limit(10);

  let metricsQuery = supabase
    .from('test_performance_metrics')
    .select('*');

  if (agentId) {
    metricsQuery = metricsQuery.eq('agent_id', agentId);
  }

  const { data: metrics } = await metricsQuery
    .order('recorded_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    monitoring: {
      recentTestRuns: testRuns || [],
      performanceMetrics: metrics || [],
      status: 'active',
      lastUpdate: new Date().toISOString()
    }
  });
}

async function setupMonitoring(supabase: any, userId: string, data: any) {
  const { agentId, monitoringConfig } = data;

  // Create monitoring configuration
  const { data: monitoringSetup, error } = await supabase
    .from('agent_monitoring')
    .insert({
      agent_id: agentId,
      created_by: userId,
      configuration: monitoringConfig,
      active: true
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to setup monitoring:', error);
    return NextResponse.json({ error: 'Failed to setup monitoring' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    monitoring: monitoringSetup
  });
}

async function generateQualityReport(supabase: any, userId: string, data: any) {
  const { agentId, reportType = 'summary', periodDays = 30 } = data;

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);

  // Generate comprehensive quality report
  const reportData = {
    summary: {
      agent_id: agentId,
      period: `${periodDays} days`,
      generated_at: new Date().toISOString()
    },
    metrics: {
      test_coverage: 85,
      success_rate: 95.5,
      performance_score: 88,
      security_score: 92
    },
    trends: {
      improving: ['test_coverage', 'performance'],
      declining: [],
      stable: ['security_score']
    }
  };

  // Save report
  const { data: report, error } = await supabase
    .from('test_reports')
    .insert({
      agent_id: agentId,
      generated_by: userId,
      report_type: reportType,
      report_period_start: periodStart.toISOString(),
      report_period_end: new Date().toISOString(),
      report_data: reportData
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to save quality report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    report: {
      id: report.id,
      data: reportData
    }
  });
}
