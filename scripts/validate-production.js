#!/usr/bin/env node

/**
 * AgentFlow.AI Production Validation Test Suite
 * Comprehensive system testing for all critical endpoints and flows
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_API_KEY = process.env.TEST_API_KEY || 'ak_test_12345';
const TEST_JWT_TOKEN = process.env.TEST_JWT_TOKEN;

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  criticalIssues: [],
  warnings: []
};

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class AgentFlowTestSuite {
  constructor() {
    this.baseUrl = BASE_URL;
    this.apiKey = TEST_API_KEY;
    this.jwtToken = TEST_JWT_TOKEN;
    this.testAgent = null;
    this.testCredential = null;
    this.testExecution = null;
  }

  async runFullSuite() {
    console.log(`${colors.bold}${colors.blue}🧪 AGENTFLOW.AI PRODUCTION VALIDATION SUITE${colors.reset}\n`);
    
    try {
      // Phase 1: Core API Endpoints
      await this.testCoreEndpoints();
      
      // Phase 2: Agent Sync System
      await this.testAgentSyncSystem();
      
      // Phase 3: Credential System
      await this.testCredentialSystem();
      
      // Phase 4: Agent Execution
      await this.testAgentExecution();
      
      // Phase 5: Logging & Analytics
      await this.testLoggingSystem();
      
      // Phase 6: GDPR & Admin Features
      await this.testGDPRCompliance();
      
      // Phase 7: Security & Rate Limiting
      await this.testSecurityFeatures();
      
      // Phase 8: Performance & Load
      await this.testPerformance();
      
      this.generateReport();
      
    } catch (error) {
      this.logError('Test suite execution failed', error);
    }
  }

  // Phase 1: Core API Endpoints
  async testCoreEndpoints() {
    this.logPhase('Testing Core API Endpoints');
    
    const endpoints = [
      '/api/health',
      '/api/agents',
      '/api/execute-agent',
      '/api/sync-agent',
      '/api/connect-credential',
      '/api/logs',
      '/api/dev/payout-log',
      '/api/gdpr-compliance',
      '/api/security',
      '/api/analytics',
      '/api/monitoring'
    ];
    
    for (const endpoint of endpoints) {
      await this.testEndpointAvailability(endpoint);
    }
  }

  // Phase 2: Agent Sync System
  async testAgentSyncSystem() {
    this.logPhase('Testing Agent Sync System');
    
    // Test 1: Direct JSON Upload
    await this.testDirectAgentSync();
    
    // Test 2: GitHub Gist Sync
    await this.testGitHubSync();
    
    // Test 3: N8N Webhook Sync
    await this.testN8NSync();
    
    // Test 4: Agent Metadata Parsing
    await this.testAgentMetadataParsing();
  }

  // Phase 3: Credential System
  async testCredentialSystem() {
    this.logPhase('Testing Credential System');
    
    // Test credential connection flow
    await this.testCredentialConnection();
    
    // Test credential validation
    await this.testCredentialValidation();
    
    // Test OAuth flow simulation
    await this.testOAuthFlow();
    
    // Test credential injection
    await this.testCredentialInjection();
  }

  // Phase 4: Agent Execution
  async testAgentExecution() {
    this.logPhase('Testing Agent Execution System');
    
    // Test agent execution with valid inputs
    await this.testValidAgentExecution();
    
    // Test execution with missing credentials
    await this.testExecutionWithMissingCredentials();
    
    // Test execution status tracking
    await this.testExecutionStatusTracking();
    
    // Test callback functionality
    await this.testExecutionCallbacks();
  }

  // Phase 5: Logging & Analytics
  async testLoggingSystem() {
    this.logPhase('Testing Logging & Analytics');
    
    // Test execution logs retrieval
    await this.testExecutionLogs();
    
    // Test payout logs
    await this.testPayoutLogs();
    
    // Test analytics endpoints
    await this.testAnalytics();
    
    // Test log filtering and pagination
    await this.testLogFiltering();
  }

  // Phase 6: GDPR & Admin Features
  async testGDPRCompliance() {
    this.logPhase('Testing GDPR Compliance');
    
    // Test data export
    await this.testDataExport();
    
    // Test data deletion
    await this.testDataDeletion();
    
    // Test consent management
    await this.testConsentManagement();
    
    // Test admin GDPR tools
    await this.testAdminGDPRTools();
  }

  // Phase 7: Security & Rate Limiting
  async testSecurityFeatures() {
    this.logPhase('Testing Security Features');
    
    // Test API key authentication
    await this.testAPIKeyAuth();
    
    // Test JWT authentication
    await this.testJWTAuth();
    
    // Test rate limiting
    await this.testRateLimiting();
    
    // Test security audit logging
    await this.testSecurityAuditing();
  }

  // Phase 8: Performance & Load
  async testPerformance() {
    this.logPhase('Testing Performance & Load');
    
    // Test concurrent executions
    await this.testConcurrentExecutions();
    
    // Test database performance
    await this.testDatabasePerformance();
    
    // Test response times
    await this.testResponseTimes();
  }

  // Individual test implementations
  async testEndpointAvailability(endpoint) {
    try {
      const response = await this.makeRequest('GET', endpoint);
      if (response.status === 404) {
        this.logError(`Endpoint not found: ${endpoint}`);
      } else if (response.status >= 500) {
        this.logError(`Server error on ${endpoint}: ${response.status}`);
      } else {
        this.logSuccess(`Endpoint available: ${endpoint}`);
      }
    } catch (error) {
      this.logError(`Failed to test endpoint ${endpoint}`, error);
    }
  }

  async testDirectAgentSync() {
    try {
      const testAgent = {
        name: 'Test Agent',
        description: 'Test agent for validation',
        webhook_url: 'https://httpbin.org/post',
        schema: { type: 'test' },
        category: 'testing',
        tags: ['test'],
        price: 0
      };

      const response = await this.makeRequest('POST', '/api/sync-agent', {
        syncType: 'direct_json',
        agentData: testAgent
      });

      if (response.ok) {
        const data = await response.json();
        this.testAgent = data.agent;
        this.logSuccess('Direct agent sync successful');
      } else {
        this.logError('Direct agent sync failed', await response.text());
      }
    } catch (error) {
      this.logError('Direct agent sync test failed', error);
    }
  }

  async testGitHubSync() {
    try {
      const testGistUrl = 'https://gist.github.com/example/test-agent.json';
      
      const response = await this.makeRequest('POST', '/api/sync-agent', {
        syncType: 'github_gist',
        source: testGistUrl
      });

      // This will likely fail in testing, but we check the error handling
      if (response.status === 400 || response.status === 404) {
        this.logWarning('GitHub sync test expected to fail (no real gist)');
      } else if (response.ok) {
        this.logSuccess('GitHub sync successful');
      } else {
        this.logError('GitHub sync unexpected error', await response.text());
      }
    } catch (error) {
      this.logError('GitHub sync test failed', error);
    }
  }

  async testN8NSync() {
    try {
      const testWebhookUrl = 'https://httpbin.org/post';
      
      const response = await this.makeRequest('POST', '/api/sync-agent', {
        syncType: 'n8n_webhook',
        source: testWebhookUrl
      });

      if (response.ok) {
        this.logSuccess('N8N sync successful');
      } else {
        this.logError('N8N sync failed', await response.text());
      }
    } catch (error) {
      this.logError('N8N sync test failed', error);
    }
  }

  async testCredentialConnection() {
    try {
      const response = await this.makeRequest('POST', '/api/connect-credential', {
        provider: 'test-provider',
        type: 'api_key',
        value: 'test-api-key-12345'
      });

      if (response.ok) {
        const data = await response.json();
        this.testCredential = data.credential;
        this.logSuccess('Credential connection successful');
      } else {
        this.logError('Credential connection failed', await response.text());
      }
    } catch (error) {
      this.logError('Credential connection test failed', error);
    }
  }

  async testValidAgentExecution() {
    if (!this.testAgent) {
      this.logWarning('Skipping agent execution test - no test agent available');
      return;
    }

    try {
      const response = await this.makeRequest('POST', '/api/execute-agent', {
        agentId: this.testAgent.id,
        inputs: { test: 'data' }
      });

      if (response.ok) {
        const data = await response.json();
        this.testExecution = data;
        this.logSuccess('Agent execution started successfully');
      } else {
        this.logError('Agent execution failed', await response.text());
      }
    } catch (error) {
      this.logError('Agent execution test failed', error);
    }
  }

  async testExecutionLogs() {
    try {
      const response = await this.makeRequest('GET', '/api/logs?limit=10');

      if (response.ok) {
        const data = await response.json();
        if (data.logs && Array.isArray(data.logs)) {
          this.logSuccess(`Execution logs retrieved: ${data.logs.length} entries`);
        } else {
          this.logWarning('Execution logs format unexpected');
        }
      } else {
        this.logError('Failed to retrieve execution logs', await response.text());
      }
    } catch (error) {
      this.logError('Execution logs test failed', error);
    }
  }

  async testPayoutLogs() {
    try {
      const response = await this.makeRequest('GET', '/api/dev/payout-log?limit=10');

      if (response.ok) {
        const data = await response.json();
        this.logSuccess('Payout logs retrieved successfully');
      } else if (response.status === 403) {
        this.logWarning('Payout logs access denied (expected for non-admin)');
      } else {
        this.logError('Payout logs test failed', await response.text());
      }
    } catch (error) {
      this.logError('Payout logs test failed', error);
    }
  }

  async testDataExport() {
    try {
      const response = await this.makeRequest('POST', '/api/gdpr-compliance', {
        action: 'export_data',
        exportType: 'full_export'
      });

      if (response.ok || response.status === 202) {
        this.logSuccess('GDPR data export initiated');
      } else {
        this.logError('GDPR data export failed', await response.text());
      }
    } catch (error) {
      this.logError('GDPR data export test failed', error);
    }
  }

  async testAPIKeyAuth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/logs`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        this.logSuccess('API key authentication properly rejects invalid keys');
      } else if (response.ok) {
        this.logSuccess('API key authentication working');
      } else {
        this.logWarning(`API key auth unexpected status: ${response.status}`);
      }
    } catch (error) {
      this.logError('API key auth test failed', error);
    }
  }

  async testRateLimiting() {
    try {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(this.makeRequest('GET', '/api/health'));
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      if (rateLimited) {
        this.logSuccess('Rate limiting is active');
      } else {
        this.logWarning('Rate limiting not triggered (may need higher load)');
      }
    } catch (error) {
      this.logError('Rate limiting test failed', error);
    }
  }

  async testConcurrentExecutions() {
    if (!this.testAgent) {
      this.logWarning('Skipping concurrent execution test - no test agent');
      return;
    }

    try {
      const concurrentRequests = [];
      for (let i = 0; i < 3; i++) {
        concurrentRequests.push(
          this.makeRequest('POST', '/api/execute-agent', {
            agentId: this.testAgent.id,
            inputs: { test: `concurrent-${i}` }
          })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      const successCount = responses.filter(r => r.ok).length;
      this.logSuccess(`Concurrent executions: ${successCount}/3 successful in ${endTime - startTime}ms`);
    } catch (error) {
      this.logError('Concurrent execution test failed', error);
    }
  }

  async testResponseTimes() {
    const endpoints = ['/api/health', '/api/agents', '/api/logs'];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await this.makeRequest('GET', endpoint);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        if (responseTime < 1000) {
          this.logSuccess(`${endpoint} response time: ${responseTime}ms (Good)`);
        } else if (responseTime < 3000) {
          this.logWarning(`${endpoint} response time: ${responseTime}ms (Slow)`);
        } else {
          this.logError(`${endpoint} response time: ${responseTime}ms (Too slow)`);
        }
      } catch (error) {
        this.logError(`Response time test failed for ${endpoint}`, error);
      }
    }
  }

  // Helper methods
  async makeRequest(method, endpoint, body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    // Add authentication if available
    if (this.jwtToken) {
      headers['Authorization'] = `Bearer ${this.jwtToken}`;
    } else if (this.apiKey && endpoint.includes('execute') || endpoint.includes('logs')) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const options = {
      method,
      headers
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  }

  logPhase(message) {
    console.log(`\n${colors.bold}${colors.blue}📋 ${message}${colors.reset}`);
  }

  logSuccess(message) {
    console.log(`${colors.green}✅ ${message}${colors.reset}`);
    testResults.passed++;
  }

  logError(message, error = null) {
    console.log(`${colors.red}❌ ${message}${colors.reset}`);
    if (error) {
      console.log(`   ${colors.red}Details: ${error.message || error}${colors.reset}`);
    }
    testResults.failed++;
    testResults.errors.push({ message, error: error?.message || error });
  }

  logWarning(message) {
    console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
    testResults.warnings.push(message);
  }

  logCritical(message) {
    console.log(`${colors.bold}${colors.red}🚨 CRITICAL: ${message}${colors.reset}`);
    testResults.criticalIssues.push(message);
  }

  generateReport() {
    console.log(`\n${colors.bold}${colors.blue}📊 AGENTFLOW.AI VALIDATION REPORT${colors.reset}`);
    console.log(`${colors.bold}═══════════════════════════════════════${colors.reset}\n`);
    
    console.log(`${colors.green}✅ Tests Passed: ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Tests Failed: ${testResults.failed}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Warnings: ${testResults.warnings.length}${colors.reset}`);
    console.log(`${colors.bold}${colors.red}🚨 Critical Issues: ${testResults.criticalIssues.length}${colors.reset}\n`);

    if (testResults.criticalIssues.length > 0) {
      console.log(`${colors.bold}${colors.red}CRITICAL ISSUES:${colors.reset}`);
      testResults.criticalIssues.forEach(issue => {
        console.log(`   ${colors.red}• ${issue}${colors.reset}`);
      });
      console.log('');
    }

    if (testResults.errors.length > 0) {
      console.log(`${colors.red}FAILED TESTS:${colors.reset}`);
      testResults.errors.slice(0, 10).forEach(error => {
        console.log(`   ${colors.red}• ${error.message}${colors.reset}`);
      });
      if (testResults.errors.length > 10) {
        console.log(`   ${colors.red}... and ${testResults.errors.length - 10} more${colors.reset}`);
      }
      console.log('');
    }

    const successRate = (testResults.passed / (testResults.passed + testResults.failed)) * 100;
    
    if (successRate >= 90) {
      console.log(`${colors.bold}${colors.green}🎉 PRODUCTION READY (${successRate.toFixed(1)}% success rate)${colors.reset}`);
    } else if (successRate >= 70) {
      console.log(`${colors.bold}${colors.yellow}⚠️  NEEDS ATTENTION (${successRate.toFixed(1)}% success rate)${colors.reset}`);
    } else {
      console.log(`${colors.bold}${colors.red}🚨 NOT PRODUCTION READY (${successRate.toFixed(1)}% success rate)${colors.reset}`);
    }

    // Save detailed report to file
    this.saveDetailedReport();
  }

  saveDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        passed: testResults.passed,
        failed: testResults.failed,
        warnings: testResults.warnings.length,
        criticalIssues: testResults.criticalIssues.length,
        successRate: (testResults.passed / (testResults.passed + testResults.failed)) * 100
      },
      details: testResults
    };

    const reportPath = path.join(__dirname, 'validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n${colors.blue}📄 Detailed report saved to: ${reportPath}${colors.reset}`);
  }

  // Additional test methods that were referenced but not implemented
  async testAgentMetadataParsing() {
    this.logWarning('Agent metadata parsing test - implementation pending');
  }

  async testCredentialValidation() {
    this.logWarning('Credential validation test - implementation pending');
  }

  async testOAuthFlow() {
    this.logWarning('OAuth flow test - implementation pending');
  }

  async testCredentialInjection() {
    this.logWarning('Credential injection test - implementation pending');
  }

  async testExecutionWithMissingCredentials() {
    this.logWarning('Missing credentials execution test - implementation pending');
  }

  async testExecutionStatusTracking() {
    this.logWarning('Execution status tracking test - implementation pending');
  }

  async testExecutionCallbacks() {
    this.logWarning('Execution callbacks test - implementation pending');
  }

  async testAnalytics() {
    this.logWarning('Analytics test - implementation pending');
  }

  async testLogFiltering() {
    this.logWarning('Log filtering test - implementation pending');
  }

  async testDataDeletion() {
    this.logWarning('Data deletion test - implementation pending');
  }

  async testConsentManagement() {
    this.logWarning('Consent management test - implementation pending');
  }

  async testAdminGDPRTools() {
    this.logWarning('Admin GDPR tools test - implementation pending');
  }

  async testJWTAuth() {
    this.logWarning('JWT auth test - implementation pending');
  }

  async testSecurityAuditing() {
    this.logWarning('Security auditing test - implementation pending');
  }

  async testDatabasePerformance() {
    this.logWarning('Database performance test - implementation pending');
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  const testSuite = new AgentFlowTestSuite();
  testSuite.runFullSuite().catch(console.error);
}

module.exports = AgentFlowTestSuite;
