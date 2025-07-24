export default function CustomerDashboardPreview() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">A</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                PREVIEW MODE
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Sarah Business</p>
                <p className="text-xs text-gray-500">Premium Customer</p>
              </div>
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow p-6 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Welcome back, Sarah! 👋</h2>
              <p className="opacity-90">You have 3 active automations running and saving you 12 hours per week.</p>
            </div>
            <button className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition">
              Setup Helper AI 🤖
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">⚡</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Automations</dt>
                  <dd className="text-lg font-medium text-gray-900">8</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">⏰</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Hours Saved</dt>
                  <dd className="text-lg font-medium text-gray-900">284</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">🔗</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Connected Apps</dt>
                  <dd className="text-lg font-medium text-gray-900">12</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">📈</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Tasks Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">1,247</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Popular Automations */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recommended for You</h3>
                <p className="text-sm text-gray-500">Popular automations based on your business type</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { 
                      name: "Lead Qualification Bot", 
                      description: "Automatically score and route new leads",
                      price: "$29/month",
                      rating: 4.8,
                      users: "2.3k+ users"
                    },
                    { 
                      name: "Social Media Manager", 
                      description: "Schedule and optimize social posts",
                      price: "$19/month",
                      rating: 4.9,
                      users: "5.1k+ users"
                    },
                    { 
                      name: "Invoice Generator", 
                      description: "Create and send invoices automatically",
                      price: "$15/month",
                      rating: 4.7,
                      users: "3.8k+ users"
                    },
                    { 
                      name: "Email Campaign Optimizer", 
                      description: "AI-powered email marketing automation",
                      price: "$39/month",
                      rating: 4.9,
                      users: "1.9k+ users"
                    },
                  ].map((automation, idx) => (
                    <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{automation.name}</h4>
                        <span className="text-sm font-medium text-blue-600">{automation.price}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{automation.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className="text-xs">⭐</span>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">{automation.rating}</span>
                        </div>
                        <span className="text-xs text-gray-500">{automation.users}</span>
                      </div>
                      <button className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 transition">
                        Try Free for 7 Days
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Current Automations */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Your Active Automations</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {[
                  { name: "Customer Support Bot", status: "Running", lastRun: "2 min ago", success: 98 },
                  { name: "Lead Capture Form", status: "Running", lastRun: "5 min ago", success: 94 },
                  { name: "Weekly Report Generator", status: "Scheduled", lastRun: "1 day ago", success: 100 },
                  { name: "Social Media Poster", status: "Paused", lastRun: "3 hours ago", success: 87 },
                ].map((automation, idx) => (
                  <div key={idx} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">🔄</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">{automation.name}</p>
                        <p className="text-sm text-gray-500">Last run: {automation.lastRun}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">{automation.success}% success</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        automation.status === 'Running' 
                          ? 'bg-green-100 text-green-800' 
                          : automation.status === 'Scheduled'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {automation.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Setup */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Quick Setup</h3>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition">
                  <div className="flex items-center">
                    <span className="mr-3">📧</span>
                    <span className="text-sm">Connect Email</span>
                  </div>
                  <span className="text-xs text-blue-600">2 min</span>
                </button>
                <button className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition">
                  <div className="flex items-center">
                    <span className="mr-3">📱</span>
                    <span className="text-sm">Connect CRM</span>
                  </div>
                  <span className="text-xs text-blue-600">5 min</span>
                </button>
                <button className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition">
                  <div className="flex items-center">
                    <span className="mr-3">💬</span>
                    <span className="text-sm">Setup Slack</span>
                  </div>
                  <span className="text-xs text-blue-600">3 min</span>
                </button>
                <button className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition">
                  <div className="flex items-center">
                    <span className="mr-3">📊</span>
                    <span className="text-sm">Connect Analytics</span>
                  </div>
                  <span className="text-xs text-blue-600">4 min</span>
                </button>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Usage This Month</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Automation Runs</span>
                      <span>1,247 / 2,000</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '62%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Data Processing</span>
                      <span>3.2GB / 10GB</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '32%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>API Calls</span>
                      <span>12,456 / 25,000</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '50%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {[
                    { action: "Lead captured from website", time: "5 min ago", type: "success" },
                    { action: "Email campaign sent", time: "1 hour ago", type: "info" },
                    { action: "Report generated", time: "2 hours ago", type: "success" },
                    { action: "Slack notification sent", time: "4 hours ago", type: "info" },
                  ].map((activity, idx) => (
                    <div key={idx} className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        activity.type === 'success' ? 'bg-green-400' : 'bg-blue-400'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Our AI assistant can help you set up new automations in minutes.
              </p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
                Chat with Setup Helper
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
