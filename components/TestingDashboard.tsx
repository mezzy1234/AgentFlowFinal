import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  TestTube2, 
  Timer, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Target,
  Zap,
  Shield,
  BarChart3,
  Settings
} from 'lucide-react';

interface TestSuite {
  id: string;
  suite_name: string;
  agent_id: string;
  total_tests: number;
  description?: string;
  testCaseCount: number;
  lastRunAt?: string;
  lastRunStatus?: 'passed' | 'failed' | 'running';
  created_at: string;
}

interface TestRun {
  id: string;
  suite_id: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  execution_time_ms: number;
  created_at: string;
  test_suites?: {
    suite_name: string;
  };
}

interface LoadTest {
  id: string;
  test_name: string;
  concurrent_users: number;
  duration_seconds: number;
  status: 'created' | 'running' | 'completed' | 'failed';
  results?: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    average_response_time: number;
    throughput: number;
  };
  created_at: string;
}

interface TestCoverage {
  agentId: string;
  coverage: Record<string, { count: number; covered: boolean }>;
  totalCoveragePercentage: number;
  recommendations: string[];
}

export default function TestingDashboard({ agentId }: { agentId: string }) {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loadTests, setLoadTests] = useState<LoadTest[]>([]);
  const [testCoverage, setTestCoverage] = useState<TestCoverage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchTestingData();
  }, [agentId]);

  const fetchTestingData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch test suites
      const suitesResponse = await fetch(`/api/testing?type=test_suites&agentId=${agentId}`, {
        headers
      });
      if (suitesResponse.ok) {
        const suitesData = await suitesResponse.json();
        setTestSuites(suitesData.testSuites || []);
      }

      // Fetch test runs
      const runsResponse = await fetch(`/api/testing?type=test_results`, {
        headers
      });
      if (runsResponse.ok) {
        const runsData = await runsResponse.json();
        setTestRuns(runsData.testRuns || []);
      }

      // Fetch load tests
      const loadResponse = await fetch(`/api/testing?type=load_test_results&agentId=${agentId}`, {
        headers
      });
      if (loadResponse.ok) {
        const loadData = await loadResponse.json();
        setLoadTests(loadData.loadTests || []);
      }

      // Fetch test coverage
      const coverageResponse = await fetch(`/api/testing?type=test_coverage&agentId=${agentId}`, {
        headers
      });
      if (coverageResponse.ok) {
        const coverageData = await coverageResponse.json();
        setTestCoverage(coverageData);
      }

    } catch (error) {
      console.error('Failed to fetch testing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runTestSuite = async (suiteId: string) => {
    setRunningTests(prev => new Set(prev).add(suiteId));
    
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const response = await fetch('/api/testing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'run_test_suite',
          suiteId,
          runMode: 'parallel'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Test run completed:', result);
        await fetchTestingData(); // Refresh data
      } else {
        console.error('Failed to run test suite');
      }
    } catch (error) {
      console.error('Error running test suite:', error);
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(suiteId);
        return newSet;
      });
    }
  };

  const generateAutomatedTests = async () => {
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const response = await fetch('/api/testing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'generate_tests',
          agentId,
          testTypes: ['functional', 'edge_case', 'error_handling', 'security']
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Generated tests:', result);
        // You could show a modal with the generated tests for review
        await fetchTestingData();
      }
    } catch (error) {
      console.error('Error generating tests:', error);
    }
  };

  const createLoadTest = async () => {
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const response = await fetch('/api/testing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create_load_test',
          agentId,
          testName: 'Performance Test',
          concurrentUsers: 10,
          duration: 60,
          testScenario: { type: 'basic_load' }
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Immediately run the load test
        await fetch('/api/testing', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'run_load_test',
            loadTestId: result.loadTest.id
          })
        });
        
        await fetchTestingData();
      }
    } catch (error) {
      console.error('Error creating load test:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading testing data...</span>
      </div>
    );
  }

  const totalTests = testSuites.reduce((sum, suite) => sum + suite.total_tests, 0);
  const recentRuns = testRuns.slice(0, 5);
  const passedRuns = testRuns.filter(run => run.status === 'passed').length;
  const failedRuns = testRuns.filter(run => run.status === 'failed').length;
  const successRate = testRuns.length > 0 ? (passedRuns / testRuns.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Testing Dashboard</h2>
          <p className="text-gray-600">Automated testing and quality assurance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generateAutomatedTests} variant="outline">
            <TestTube2 className="h-4 w-4 mr-2" />
            Generate Tests
          </Button>
          <Button onClick={createLoadTest} variant="outline">
            <Zap className="h-4 w-4 mr-2" />
            Load Test
          </Button>
          <Button onClick={fetchTestingData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Testing Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TestTube2 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tests</p>
                <p className="text-2xl font-bold text-gray-900">{totalTests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{successRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Coverage</p>
                <p className="text-2xl font-bold text-gray-900">
                  {testCoverage?.totalCoveragePercentage || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Timer className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900">
                  {recentRuns.length > 0 
                    ? Math.round(recentRuns.reduce((sum, run) => sum + (run.execution_time_ms || 0), 0) / recentRuns.length)
                    : 0}ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue={activeTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="test-suites">Test Suites</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Test Runs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Test Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentRuns.map((run) => (
                    <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {run.status === 'passed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : run.status === 'failed' ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                        )}
                        <div>
                          <p className="font-medium">{run.test_suites?.suite_name || 'Unknown Suite'}</p>
                          <p className="text-sm text-gray-600">
                            {run.passed_tests}/{run.total_tests} passed • {run.execution_time_ms}ms
                          </p>
                        </div>
                      </div>
                      <Badge variant={run.status === 'passed' ? 'default' : 'destructive'}>
                        {run.status}
                      </Badge>
                    </div>
                  ))}
                  {recentRuns.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No test runs yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Test Coverage Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Test Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                {testCoverage ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Overall Coverage</span>
                      <span className="text-sm text-gray-600">
                        {testCoverage.totalCoveragePercentage}%
                      </span>
                    </div>
                    <Progress value={testCoverage.totalCoveragePercentage} className="w-full" />
                    
                    <div className="space-y-2">
                      {Object.entries(testCoverage.coverage).map(([type, data]) => (
                        <div key={type} className="flex items-center justify-between text-sm">
                          <span className="capitalize">{type.replace('_', ' ')}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">{data.count} tests</span>
                            {data.covered ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {testCoverage.recommendations.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-2">Recommendations:</p>
                        <ul className="text-sm text-blue-800 space-y-1">
                          {testCoverage.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No coverage data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="test-suites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Suites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testSuites.map((suite) => (
                  <div key={suite.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{suite.suite_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {suite.total_tests} tests • Created {new Date(suite.created_at).toLocaleDateString()}
                        </p>
                        {suite.description && (
                          <p className="text-sm text-gray-500 mt-1">{suite.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {suite.lastRunStatus && (
                          <Badge variant={suite.lastRunStatus === 'passed' ? 'default' : 'destructive'}>
                            {suite.lastRunStatus}
                          </Badge>
                        )}
                        <Button
                          onClick={() => runTestSuite(suite.id)}
                          disabled={runningTests.has(suite.id)}
                          size="sm"
                        >
                          {runningTests.has(suite.id) ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {testSuites.length === 0 && (
                  <div className="text-center py-8">
                    <TestTube2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No test suites found</p>
                    <Button onClick={generateAutomatedTests} className="mt-4">
                      Generate Your First Tests
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Results History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testRuns.map((run) => (
                  <div key={run.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{run.test_suites?.suite_name || 'Unknown Suite'}</h3>
                          <Badge variant={run.status === 'passed' ? 'default' : 'destructive'}>
                            {run.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(run.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {run.passed_tests}/{run.total_tests} passed
                        </p>
                        <p className="text-sm text-gray-600">
                          {run.execution_time_ms}ms execution time
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <Progress 
                        value={run.total_tests > 0 ? (run.passed_tests / run.total_tests) * 100 : 0} 
                        className="w-full" 
                      />
                    </div>
                  </div>
                ))}
                {testRuns.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No test results available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Load Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadTests.map((test) => (
                  <div key={test.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{test.test_name}</h3>
                        <p className="text-sm text-gray-600">
                          {test.concurrent_users} users • {test.duration_seconds}s duration
                        </p>
                      </div>
                      <Badge variant={test.status === 'completed' ? 'default' : 'secondary'}>
                        {test.status}
                      </Badge>
                    </div>
                    
                    {test.results && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Total Requests</p>
                          <p className="font-semibold">{test.results.total_requests}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Success Rate</p>
                          <p className="font-semibold">
                            {((test.results.successful_requests / test.results.total_requests) * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Avg Response</p>
                          <p className="font-semibold">{test.results.average_response_time.toFixed(0)}ms</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Throughput</p>
                          <p className="font-semibold">{test.results.throughput.toFixed(1)} req/s</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {loadTests.length === 0 && (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No load tests run yet</p>
                    <Button onClick={createLoadTest} className="mt-4">
                      Run Performance Test
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Coverage Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {testCoverage ? (
                <div className="space-y-6">
                  {/* Overall Coverage */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-blue-100 mb-4">
                      <span className="text-3xl font-bold text-blue-600">
                        {testCoverage.totalCoveragePercentage}%
                      </span>
                    </div>
                    <p className="text-lg font-semibold">Overall Test Coverage</p>
                  </div>

                  {/* Coverage by Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(testCoverage.coverage).map(([type, data]) => (
                      <div key={type} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium capitalize">{type.replace('_', ' ')}</h4>
                          {data.covered ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {data.count} test{data.count !== 1 ? 's' : ''} available
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${data.covered ? 'bg-green-600' : 'bg-gray-400'}`}
                            style={{ width: data.covered ? '100%' : '0%' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  {testCoverage.recommendations.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                        <Target className="h-5 w-5 mr-2" />
                        Recommendations to Improve Coverage
                      </h4>
                      <ul className="space-y-2">
                        {testCoverage.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start text-sm text-blue-800">
                            <span className="mr-2 mt-1">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No coverage data available</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Run some tests to generate coverage analysis
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
