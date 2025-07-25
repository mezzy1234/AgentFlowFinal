'use client'

import React from 'react';
import { useState } from 'react';

export default function TestingPage() {
  const [selectedAgent, setSelectedAgent] = useState('');
  
  // Mock data
  const agents = [
    { id: '1', agent_name: 'Test Agent 1' },
    { id: '2', agent_name: 'Test Agent 2' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Agent Testing & Quality Assurance
          </h1>
          <p className="text-gray-600 mt-2">
            Automated testing, quality assurance, and performance monitoring for your agents
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mb-8">
          <select 
            value={selectedAgent} 
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="w-64 h-9 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm"
          >
            <option value="">Select an agent</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.agent_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Test Suites
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Create and manage test suites for your agents
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quality Metrics
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor quality metrics and performance
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Test Results
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              View detailed test execution results
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
