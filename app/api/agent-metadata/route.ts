import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AgentMetadata {
  agent_id: string
  name: string
  version: string
  created_at: string
  updated_at: string
  creator_id: string
  
  // Configuration Analysis
  configuration: {
    trigger_count: number
    action_count: number
    condition_count: number
    total_steps: number
    complexity_score: number
    dependencies: string[]
    api_integrations: string[]
    data_flow_analysis: DataFlowNode[]
  }
  
  // Performance Metrics
  performance: {
    avg_execution_time_ms: number
    success_rate: number
    total_executions: number
    last_30_days_executions: number
    error_frequency: number
    resource_usage: {
      avg_memory_mb: number
      avg_api_calls_per_run: number
      avg_data_processed_mb: number
    }
  }
  
  // Health & Issues
  health: {
    status: 'healthy' | 'warning' | 'critical'
    issues: HealthIssue[]
    recommendations: string[]
    last_health_check: string
  }
  
  // Usage Analytics
  usage: {
    total_users: number
    active_users_30d: number
    total_runs: number
    revenue_generated: number
    popularity_score: number
  }
  
  // Security Analysis
  security: {
    credential_count: number
    external_domains: string[]
    permission_level: 'low' | 'medium' | 'high'
    data_sensitivity: 'public' | 'internal' | 'confidential'
    compliance_flags: string[]
  }
}

interface DataFlowNode {
  step_id: string
  step_name: string
  type: 'trigger' | 'action' | 'condition'
  inputs: string[]
  outputs: string[]
  transformations: string[]
  data_sensitivity: string
}

interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'performance' | 'security' | 'reliability' | 'configuration'
  issue: string
  description: string
  suggested_fix: string
  impact: string
}

class AgentMetadataInspector {
  async getAgentMetadata(agentId: string, userId: string): Promise<AgentMetadata> {
    // Get basic agent info
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', userId)
      .single()

    if (!agent) {
      throw new Error('Agent not found or access denied')
    }

    // Get execution logs for performance analysis
    const { data: executions } = await supabase
      .from('agent_execution_logs')
      .select('*')
      .eq('agent_id', agentId)
      .order('execution_start', { ascending: false })
      .limit(500)

    // Get user integrations for security analysis
    const { data: integrations } = await supabase
      .from('user_integrations')
      .select('service_name')
      .eq('user_id', userId)

    // Analyze configuration
    const configuration = await this.analyzeConfiguration(agent)
    
    // Analyze performance
    const performance = await this.analyzePerformance(executions || [])
    
    // Analyze health
    const health = await this.analyzeHealth(agent, executions || [], configuration)
    
    // Analyze usage
    const usage = await this.analyzeUsage(agentId, executions || [])
    
    // Analyze security
    const security = await this.analyzeSecurity(agent, integrations || [])

    return {
      agent_id: agentId,
      name: agent.name,
      version: agent.version || '1.0.0',
      created_at: agent.created_at,
      updated_at: agent.updated_at,
      creator_id: agent.user_id,
      configuration,
      performance,
      health,
      usage,
      security
    }
  }

  private async analyzeConfiguration(agent: any) {
    const config = agent.configuration || {}
    const configTriggers = config.triggers || []
    const configActions = config.actions || []
    const configConditions = config.conditions || []
    
    const totalSteps = configTriggers.length + configActions.length + configConditions.length
    
    // Calculate complexity score (0-100)
    let complexityScore = 0
    complexityScore += configTriggers.length * 5  // Each trigger adds 5 points
    complexityScore += configActions.length * 10  // Each action adds 10 points
    complexityScore += configConditions.length * 15  // Each condition adds 15 points
    
    // Add complexity for nested conditions
    const nestedConditions = configConditions.filter((c: any) => c.conditions && c.conditions.length > 0)
    complexityScore += nestedConditions.length * 20
    
    complexityScore = Math.min(complexityScore, 100)  // Cap at 100

    // Extract dependencies and integrations
    const dependencies: string[] = []
    const apiIntegrations: string[] = []
    
    const allSteps = [...configTriggers, ...configActions]
    allSteps.forEach((step: any) => {
      if (step.service && !apiIntegrations.includes(step.service)) {
        apiIntegrations.push(step.service)
      }
      if (step.dependencies) {
        step.dependencies.forEach((dep: string) => {
          if (!dependencies.includes(dep)) {
            dependencies.push(dep)
          }
        })
      }
    })

    // Analyze data flow
    const dataFlowAnalysis = this.analyzeDataFlow([...configTriggers, ...configActions, ...configConditions])

    return {
      trigger_count: configTriggers.length,
      action_count: configActions.length,
      condition_count: configConditions.length,
      total_steps: totalSteps,
      complexity_score: complexityScore,
      dependencies,
      api_integrations: apiIntegrations,
      data_flow_analysis: dataFlowAnalysis
    }
  }

  private analyzeDataFlow(steps: any[]): DataFlowNode[] {
    return steps.map((step, index) => {
      const inputs = step.input_mapping ? Object.keys(step.input_mapping) : []
      const outputs = step.output_mapping ? Object.keys(step.output_mapping) : []
      const transformations = step.transformations || []
      
      // Determine data sensitivity based on step type and service
      let dataSensitivity = 'public'
      if (step.service && ['salesforce', 'hubspot', 'gmail', 'stripe'].includes(step.service)) {
        dataSensitivity = 'confidential'
      } else if (step.service && ['slack', 'trello', 'notion'].includes(step.service)) {
        dataSensitivity = 'internal'
      }

      return {
        step_id: step.id || `step_${index}`,
        step_name: step.name || `Step ${index + 1}`,
        type: step.type || 'action',
        inputs,
        outputs,
        transformations,
        data_sensitivity: dataSensitivity
      }
    })
  }

  private async analyzePerformance(executions: any[]) {
    if (executions.length === 0) {
      return {
        avg_execution_time_ms: 0,
        success_rate: 0,
        total_executions: 0,
        last_30_days_executions: 0,
        error_frequency: 0,
        resource_usage: {
          avg_memory_mb: 0,
          avg_api_calls_per_run: 0,
          avg_data_processed_mb: 0
        }
      }
    }

    const completedExecutions = executions.filter(e => e.status === 'completed')
    const failedExecutions = executions.filter(e => e.status === 'failed')
    
    const successRate = (completedExecutions.length / executions.length) * 100
    const errorFrequency = (failedExecutions.length / executions.length) * 100

    // Calculate average execution time
    const avgExecutionTime = completedExecutions.reduce((sum, e) => {
      if (e.execution_end && e.execution_start) {
        const duration = new Date(e.execution_end).getTime() - new Date(e.execution_start).getTime()
        return sum + duration
      }
      return sum
    }, 0) / (completedExecutions.length || 1)

    // Last 30 days executions
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const last30DaysExecutions = executions.filter(e => 
      new Date(e.execution_start) > thirtyDaysAgo
    ).length

    // Resource usage analysis
    const totalApiCalls = executions.reduce((sum, e) => 
      sum + (e.performance_metrics?.api_calls_count || 0), 0)
    const totalDataProcessed = executions.reduce((sum, e) => 
      sum + (e.performance_metrics?.data_processed_bytes || 0), 0)

    return {
      avg_execution_time_ms: Math.round(avgExecutionTime),
      success_rate: Math.round(successRate * 100) / 100,
      total_executions: executions.length,
      last_30_days_executions: last30DaysExecutions,
      error_frequency: Math.round(errorFrequency * 100) / 100,
      resource_usage: {
        avg_memory_mb: 0, // Would need memory tracking in execution logs
        avg_api_calls_per_run: Math.round(totalApiCalls / (executions.length || 1)),
        avg_data_processed_mb: Math.round(totalDataProcessed / (executions.length || 1) / 1024 / 1024)
      }
    }
  }

  private async analyzeHealth(agent: any, executions: any[], configuration: any): Promise<any> {
    const issues: HealthIssue[] = []
    const recommendations: string[] = []

    // Check for performance issues
    const recentExecutions = executions.slice(0, 10)
    const recentFailures = recentExecutions.filter(e => e.status === 'failed').length
    
    if (recentFailures > 3) {
      issues.push({
        severity: 'high',
        category: 'reliability',
        issue: 'High Failure Rate',
        description: `${recentFailures} out of last 10 executions failed`,
        suggested_fix: 'Review error logs and fix configuration issues',
        impact: 'Agent reliability is compromised'
      })
    }

    // Check for complexity issues
    if (configuration.complexity_score > 80) {
      issues.push({
        severity: 'medium',
        category: 'performance',
        issue: 'High Complexity',
        description: `Agent complexity score is ${configuration.complexity_score}/100`,
        suggested_fix: 'Consider breaking down into smaller agents',
        impact: 'May lead to slower execution and harder maintenance'
      })
      recommendations.push('Consider splitting complex logic into multiple simpler agents')
    }

    // Check for outdated integrations
    const oldIntegrations = configuration.api_integrations.filter((integration: string) => {
      // This would check against a database of deprecated APIs
      return ['deprecated_api', 'old_service'].includes(integration)
    })

    if (oldIntegrations.length > 0) {
      issues.push({
        severity: 'low',
        category: 'configuration',
        issue: 'Outdated Integrations',
        description: `Using deprecated services: ${oldIntegrations.join(', ')}`,
        suggested_fix: 'Update to newer API versions',
        impact: 'May stop working when services are discontinued'
      })
    }

    // Check for security issues
    const hasHighPrivilegeSteps = configuration.data_flow_analysis.some(
      (step: DataFlowNode) => step.data_sensitivity === 'confidential'
    )

    if (hasHighPrivilegeSteps && agent.is_public) {
      issues.push({
        severity: 'critical',
        category: 'security',
        issue: 'Public Agent with Sensitive Data',
        description: 'Agent handles confidential data but is marked as public',
        suggested_fix: 'Make agent private or remove sensitive data handling',
        impact: 'Potential data exposure risk'
      })
    }

    // Generate recommendations
    if (configuration.total_steps > 20) {
      recommendations.push('Consider using sub-agents for better modularity')
    }

    if (executions.length > 0) {
      const avgDuration = executions.reduce((sum, e) => {
        if (e.execution_end && e.execution_start) {
          return sum + (new Date(e.execution_end).getTime() - new Date(e.execution_start).getTime())
        }
        return sum
      }, 0) / executions.length

      if (avgDuration > 30000) { // 30 seconds
        recommendations.push('Optimize slow steps or add parallel processing')
      }
    }

    // Determine overall health status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (issues.some(i => i.severity === 'critical')) {
      status = 'critical'
    } else if (issues.some(i => i.severity === 'high') || issues.length > 3) {
      status = 'warning'
    }

    return {
      status,
      issues,
      recommendations,
      last_health_check: new Date().toISOString()
    }
  }

  private async analyzeUsage(agentId: string, executions: any[]) {
    // Get unique users who have run this agent
    const uniqueUsers = new Set(executions.map(e => e.user_id))
    
    // Get recent users (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentExecutions = executions.filter(e => 
      new Date(e.execution_start) > thirtyDaysAgo
    )
    const recentUsers = new Set(recentExecutions.map(e => e.user_id))

    // Calculate popularity score (0-100)
    let popularityScore = 0
    popularityScore += Math.min(uniqueUsers.size * 2, 40)  // Max 40 points for user count
    popularityScore += Math.min(executions.length / 10, 30)  // Max 30 points for execution count
    popularityScore += Math.min(recentExecutions.length / 5, 30)  // Max 30 points for recent activity

    return {
      total_users: uniqueUsers.size,
      active_users_30d: recentUsers.size,
      total_runs: executions.length,
      revenue_generated: 0, // Would need billing integration
      popularity_score: Math.round(popularityScore)
    }
  }

  private async analyzeSecurity(agent: any, integrations: any[]) {
    const config = agent.configuration || {}
    const allSteps = [
      ...(config.triggers || []),
      ...(config.actions || []),
      ...(config.conditions || [])
    ]

    // Count credentials needed
    const credentialServices = new Set()
    const externalDomains = new Set()
    const complianceFlags: string[] = []

    allSteps.forEach((step: any) => {
      if (step.service && step.service !== 'webhook' && step.service !== 'custom') {
        credentialServices.add(step.service)
      }
      
      if (step.url) {
        try {
          const domain = new URL(step.url).hostname
          externalDomains.add(domain)
        } catch (e) {
          // Invalid URL
        }
      }

      // Check for compliance-sensitive services
      if (['salesforce', 'hubspot', 'stripe', 'quickbooks'].includes(step.service)) {
        if (!complianceFlags.includes('financial_data')) {
          complianceFlags.push('financial_data')
        }
      }
      
      if (['gmail', 'outlook', 'slack'].includes(step.service)) {
        if (!complianceFlags.includes('personal_data')) {
          complianceFlags.push('personal_data')
        }
      }
    })

    // Determine permission level
    let permissionLevel: 'low' | 'medium' | 'high' = 'low'
    if (credentialServices.size > 5 || complianceFlags.length > 1) {
      permissionLevel = 'high'
    } else if (credentialServices.size > 2 || complianceFlags.length > 0) {
      permissionLevel = 'medium'
    }

    // Determine data sensitivity
    let dataSensitivity: 'public' | 'internal' | 'confidential' = 'public'
    if (complianceFlags.includes('financial_data')) {
      dataSensitivity = 'confidential'
    } else if (complianceFlags.includes('personal_data')) {
      dataSensitivity = 'internal'
    }

    return {
      credential_count: credentialServices.size,
      external_domains: Array.from(externalDomains) as string[],
      permission_level: permissionLevel,
      data_sensitivity: dataSensitivity,
      compliance_flags: complianceFlags
    }
  }

  async debugAgent(agentId: string, userId: string) {
    const metadata = await this.getAgentMetadata(agentId, userId)
    
    // Generate detailed debugging information
    const debugInfo = {
      summary: {
        agent_name: metadata.name,
        overall_health: metadata.health.status,
        complexity: metadata.configuration.complexity_score,
        success_rate: metadata.performance.success_rate,
        critical_issues: metadata.health.issues.filter(i => i.severity === 'critical').length
      },
      
      step_analysis: metadata.configuration.data_flow_analysis.map(step => ({
        step_name: step.step_name,
        type: step.type,
        input_count: step.inputs.length,
        output_count: step.outputs.length,
        data_sensitivity: step.data_sensitivity,
        potential_bottleneck: step.inputs.length > 5 || step.outputs.length > 5
      })),
      
      performance_bottlenecks: this.identifyBottlenecks(metadata),
      
      security_recommendations: this.generateSecurityRecommendations(metadata),
      
      optimization_suggestions: this.generateOptimizationSuggestions(metadata)
    }

    return debugInfo
  }

  private identifyBottlenecks(metadata: AgentMetadata) {
    const bottlenecks: string[] = []

    if (metadata.performance.avg_execution_time_ms > 30000) {
      bottlenecks.push('Long average execution time (>30s)')
    }

    if (metadata.configuration.complexity_score > 80) {
      bottlenecks.push('High complexity score may slow execution')
    }

    if (metadata.performance.resource_usage.avg_api_calls_per_run > 20) {
      bottlenecks.push('High API call volume per execution')
    }

    if (metadata.configuration.data_flow_analysis.length > 20) {
      bottlenecks.push('Too many sequential steps')
    }

    return bottlenecks
  }

  private generateSecurityRecommendations(metadata: AgentMetadata) {
    const recommendations: string[] = []

    if (metadata.security.permission_level === 'high') {
      recommendations.push('Consider reducing the number of required integrations')
    }

    if (metadata.security.data_sensitivity === 'confidential' && metadata.usage.total_users > 10) {
      recommendations.push('Limit access to confidential data handling agents')
    }

    if (metadata.security.external_domains.length > 5) {
      recommendations.push('Review external domain dependencies for security risks')
    }

    return recommendations
  }

  private generateOptimizationSuggestions(metadata: AgentMetadata) {
    const suggestions: string[] = []

    if (metadata.configuration.total_steps > 15) {
      suggestions.push('Break down into smaller, more focused agents')
    }

    if (metadata.performance.success_rate < 90) {
      suggestions.push('Add error handling and retry logic to improve reliability')
    }

    if (metadata.performance.resource_usage.avg_data_processed_mb > 100) {
      suggestions.push('Implement data streaming for large data processing')
    }

    return suggestions
  }
}

const metadataInspector = new AgentMetadataInspector()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const agentId = searchParams.get('agent_id')
    const userId = searchParams.get('user_id')

    if (!agentId || !userId) {
      return NextResponse.json({ error: 'Missing agent_id or user_id' }, { status: 400 })
    }

    switch (type) {
      case 'metadata':
        const metadata = await metadataInspector.getAgentMetadata(agentId, userId)
        return NextResponse.json({ success: true, metadata })

      case 'debug':
        const debugInfo = await metadataInspector.debugAgent(agentId, userId)
        return NextResponse.json({ success: true, debug_info: debugInfo })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Metadata inspector error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}
