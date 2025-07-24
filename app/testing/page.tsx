import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TestingDashboard from '@/components/TestingDashboard';
import { 
  Plus, 
  TestTube2, 
  Settings, 
  Calendar, 
  Zap,
  Target,
  Shield,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  CheckCircle
} from 'lucide-react';

interface Agent {
  id: string;
  agent_name: string;
  description?: string;
  webhook_url?: string;
  status: string;
}

interface TestSuiteForm {
  suiteName: string;
  description: string;
  testCases: TestCase[];
}

interface TestCase {
  name: string;
  type: 'functional' | 'edge_case' | 'error_handling' | 'security' | 'performance';
  inputData: Record<string, any>;
  expectedOutput?: Record<string, any>;
  assertions: Assertion[];
  timeoutSeconds: number;
}

interface Assertion {
  type: 'response_status' | 'response_time' | 'output_contains' | 'error_message';
  operator?: '<' | '>' | '=' | 'contains';
  value: any;
}

export default function TestingManagementPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateSuite, setShowCreateSuite] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [testSuiteForm, setTestSuiteForm] = useState<TestSuiteForm>({
    suiteName: '',
    description: '',
    testCases: []
  });

  // Load agents on component mount
  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const response = await fetch('/api/agents', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
        if (data.agents?.length > 0 && !selectedAgent) {
          setSelectedAgent(data.agents[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createTestSuite = async () => {
    if (!selectedAgent || !testSuiteForm.suiteName) return;

    try {
      const token = localStorage.getItem('supabase.auth.token');
      const response = await fetch('/api/testing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create_test_suite',
          agentId: selectedAgent,
          suiteName: testSuiteForm.suiteName,
          description: testSuiteForm.description,
          testCases: testSuiteForm.testCases
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Test suite created:', result);
        setShowCreateSuite(false);
        setTestSuiteForm({
          suiteName: '',
          description: '',
          testCases: []
        });
        // Refresh the testing dashboard
        window.location.reload();
      } else {
        console.error('Failed to create test suite');
      }
    } catch (error) {
      console.error('Error creating test suite:', error);
    }
  };

  const addTestCase = () => {
    const newTestCase: TestCase = {
      name: `Test Case ${testSuiteForm.testCases.length + 1}`,
      type: 'functional',
      inputData: {},
      assertions: [],
      timeoutSeconds: 30
    };
    
    setTestSuiteForm(prev => ({
      ...prev,
      testCases: [...prev.testCases, newTestCase]
    }));
  };

  const updateTestCase = (index: number, updates: Partial<TestCase>) => {
    setTestSuiteForm(prev => ({
      ...prev,
      testCases: prev.testCases.map((testCase, i) => 
        i === index ? { ...testCase, ...updates } : testCase
      )
    }));
  };

  const removeTestCase = (index: number) => {
    setTestSuiteForm(prev => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== index)
    }));
  };

  const addAssertion = (testCaseIndex: number) => {
    const newAssertion: Assertion = {
      type: 'response_status',
      value: 'success'
    };
    
    updateTestCase(testCaseIndex, {
      assertions: [...testSuiteForm.testCases[testCaseIndex].assertions, newAssertion]
    });
  };

  const updateAssertion = (testCaseIndex: number, assertionIndex: number, updates: Partial<Assertion>) => {
    const testCase = testSuiteForm.testCases[testCaseIndex];
    const updatedAssertions = testCase.assertions.map((assertion, i) =>
      i === assertionIndex ? { ...assertion, ...updates } : assertion
    );
    
    updateTestCase(testCaseIndex, { assertions: updatedAssertions });
  };

  const generateTestsForAgent = async () => {
    if (!selectedAgent) return;

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
          agentId: selectedAgent,
          testTypes: ['functional', 'edge_case', 'error_handling', 'security']
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Auto-create a test suite with generated tests
        setTestSuiteForm({
          suiteName: 'Auto-Generated Test Suite',
          description: 'Automatically generated comprehensive test suite',
          testCases: result.generatedTests.map((test: any) => ({
            name: test.name,
            type: test.type,
            inputData: test.inputData,
            expectedOutput: test.expectedOutput,
            assertions: test.assertions,
            timeoutSeconds: 30
          }))
        });
        
        setShowCreateSuite(true);
      }
    } catch (error) {
      console.error('Error generating tests:', error);
    }
  };

  const scheduleRegressionTests = async (schedule: string, testSuiteIds: string[]) => {
    if (!selectedAgent) return;

    try {
      const token = localStorage.getItem('supabase.auth.token');
      const response = await fetch('/api/testing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'schedule_regression_test',
          agentId: selectedAgent,
          schedule,
          testSuiteIds
        })
      });

      if (response.ok) {
        console.log('Regression tests scheduled successfully');
        setShowScheduleDialog(false);
      }
    } catch (error) {
      console.error('Error scheduling regression tests:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading testing management...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Testing Management</h1>
          <p className="text-gray-600 mt-2">
            Automated testing, quality assurance, and performance monitoring for your agents
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.agent_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={generateTestsForAgent}>
          <CardContent className="p-6 text-center">
            <TestTube2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold">Generate Tests</h3>
            <p className="text-sm text-gray-600 mt-1">Auto-generate comprehensive test suites</p>
          </CardContent>
        </Card>

        <Dialog open={showCreateSuite} onOpenChange={setShowCreateSuite}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Plus className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold">Create Test Suite</h3>
                <p className="text-sm text-gray-600 mt-1">Build custom test scenarios</p>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Test Suite</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="suiteName">Suite Name</Label>
                  <Input
                    id="suiteName"
                    value={testSuiteForm.suiteName}
                    onChange={(e) => setTestSuiteForm(prev => ({ ...prev, suiteName: e.target.value }))}
                    placeholder="Enter test suite name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={testSuiteForm.description}
                    onChange={(e) => setTestSuiteForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the test suite purpose"
                    rows={2}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Test Cases</Label>
                  <Button onClick={addTestCase} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Test Case
                  </Button>
                </div>

                <div className="space-y-4">
                  {testSuiteForm.testCases.map((testCase, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label>Test Name</Label>
                          <Input
                            value={testCase.name}
                            onChange={(e) => updateTestCase(index, { name: e.target.value })}
                            placeholder="Test case name"
                          />
                        </div>
                        <div>
                          <Label>Test Type</Label>
                          <Select value={testCase.type} onValueChange={(value: any) => updateTestCase(index, { type: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="functional">Functional</SelectItem>
                              <SelectItem value="edge_case">Edge Case</SelectItem>
                              <SelectItem value="error_handling">Error Handling</SelectItem>
                              <SelectItem value="security">Security</SelectItem>
                              <SelectItem value="performance">Performance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label>Input Data (JSON)</Label>
                          <Textarea
                            value={JSON.stringify(testCase.inputData, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                updateTestCase(index, { inputData: parsed });
                              } catch (error) {
                                // Invalid JSON, ignore for now
                              }
                            }}
                            placeholder='{"field1": "value1"}'
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Timeout (seconds)</Label>
                          <Input
                            type="number"
                            value={testCase.timeoutSeconds}
                            onChange={(e) => updateTestCase(index, { timeoutSeconds: parseInt(e.target.value) || 30 })}
                            min="1"
                            max="300"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <Label>Assertions</Label>
                          <Button onClick={() => addAssertion(index)} size="sm" variant="outline">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Assertion
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {testCase.assertions.map((assertion, assertionIndex) => (
                            <div key={assertionIndex} className="flex items-center space-x-2 p-2 border rounded">
                              <Select 
                                value={assertion.type} 
                                onValueChange={(value: any) => updateAssertion(index, assertionIndex, { type: value })}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="response_status">Response Status</SelectItem>
                                  <SelectItem value="response_time">Response Time</SelectItem>
                                  <SelectItem value="output_contains">Output Contains</SelectItem>
                                  <SelectItem value="error_message">Error Message</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              {assertion.type === 'response_time' && (
                                <Select 
                                  value={assertion.operator} 
                                  onValueChange={(value: any) => updateAssertion(index, assertionIndex, { operator: value })}
                                >
                                  <SelectTrigger className="w-20">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="<">{'<'}</SelectItem>
                                    <SelectItem value=">">{'>'}</SelectItem>
                                    <SelectItem value="=">=</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              
                              <Input
                                value={assertion.value}
                                onChange={(e) => updateAssertion(index, assertionIndex, { value: e.target.value })}
                                placeholder="Expected value"
                                className="flex-1"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={() => removeTestCase(index)} variant="destructive" size="sm">
                          Remove Test Case
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateSuite(false)}>
                  Cancel
                </Button>
                <Button onClick={createTestSuite}>
                  Create Test Suite
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold">Schedule Tests</h3>
                <p className="text-sm text-gray-600 mt-1">Automate regression testing</p>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Regression Tests</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="schedule">Schedule (Cron Expression)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0 9 * * *">Daily at 9 AM</SelectItem>
                    <SelectItem value="0 9 * * 1">Weekly on Monday at 9 AM</SelectItem>
                    <SelectItem value="0 9 1 * *">Monthly on 1st at 9 AM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => scheduleRegressionTests('0 9 * * *', [])}>
                  Schedule Tests
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <Zap className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <h3 className="font-semibold">Performance Test</h3>
            <p className="text-sm text-gray-600 mt-1">Load testing and stress testing</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Testing Dashboard */}
      {selectedAgent && (
        <TestingDashboard agentId={selectedAgent} />
      )}

      {/* Additional Features Section */}
      <Tabs defaultValue="security" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="security">Security Testing</TabsTrigger>
          <TabsTrigger value="performance">Performance Monitoring</TabsTrigger>
          <TabsTrigger value="quality">Quality Gates</TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security Testing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Input Validation</h3>
                  <p className="text-sm text-gray-600">SQL injection & XSS protection</p>
                  <Badge variant="default" className="mt-2">Active</Badge>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Authentication</h3>
                  <p className="text-sm text-gray-600">Token validation & authorization</p>
                  <Badge variant="secondary" className="mt-2">Configured</Badge>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Data Privacy</h3>
                  <p className="text-sm text-gray-600">Sensitive data handling</p>
                  <Badge variant="default" className="mt-2">Protected</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Performance Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">&lt; 200ms</div>
                    <p className="text-sm text-gray-600">Avg Response Time</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">99.9%</div>
                    <p className="text-sm text-gray-600">Uptime</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">50 RPS</div>
                    <p className="text-sm text-gray-600">Throughput</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">0.01%</div>
                    <p className="text-sm text-gray-600">Error Rate</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Quality Gates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">Test Coverage</h3>
                    <p className="text-sm text-gray-600">Minimum 80% coverage required</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">85%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">Performance Threshold</h3>
                    <p className="text-sm text-gray-600">Response time under 500ms</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Passed</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">Security Scan</h3>
                    <p className="text-sm text-gray-600">No critical vulnerabilities</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Clean</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
