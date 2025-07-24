export default function DeveloperDashboardPreview() {
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
              <h1 className="text-2xl font-bold text-gray-900">Developer Dashboard</h1>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                PREVIEW MODE
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">John Developer</p>
                <p className="text-xs text-gray-500">Pro Plan • 70/30 Split</p>
              </div>
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">🤖</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Agents</dt>
                  <dd className="text-lg font-medium text-gray-900">12</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">💰</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Monthly Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">$3,247</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">📊</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Interactions</dt>
                  <dd className="text-lg font-medium text-gray-900">45,231</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">⭐</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Rating</dt>
                  <dd className="text-lg font-medium text-gray-900">4.8/5</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                    <span className="mr-2">🚀</span>
                    Create New Agent
                  </button>
                  <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                    <span className="mr-2">📈</span>
                    View Analytics
                  </button>
                  <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                    <span className="mr-2">💸</span>
                    Revenue Reports
                  </button>
                  <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                    <span className="mr-2">🔧</span>
                    Manage Integrations
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Agents */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Agents</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {[
                  { name: "Email Marketing Assistant", status: "Active", users: 234, revenue: "$456" },
                  { name: "Social Media Scheduler", status: "Active", users: 189, revenue: "$823" },
                  { name: "Customer Support Bot", status: "Paused", users: 67, revenue: "$234" },
                  { name: "Lead Generation Tool", status: "Active", users: 445, revenue: "$1,234" },
                ].map((agent, idx) => (
                  <div key={idx} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">🤖</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                        <p className="text-sm text-gray-500">{agent.users} active users</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        agent.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {agent.status}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{agent.revenue}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Performance Chart */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Performance This Month</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>API Calls</span>
                      <span>8,456 / 10,000</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '84%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Storage Used</span>
                      <span>2.3GB / 5GB</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '46%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Revenue Target</span>
                      <span>$3,247 / $5,000</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '65%' }}></div>
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
                    { action: "Agent deployed", time: "2 min ago", type: "success" },
                    { action: "New user signup", time: "15 min ago", type: "info" },
                    { action: "Payment received", time: "1 hour ago", type: "success" },
                    { action: "API limit warning", time: "3 hours ago", type: "warning" },
                  ].map((activity, idx) => (
                    <div key={idx} className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        activity.type === 'success' ? 'bg-green-400' :
                        activity.type === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
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

            {/* Upgrade Notice */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow p-6 text-white">
              <h3 className="text-lg font-medium mb-2">Upgrade to Enterprise</h3>
              <p className="text-sm opacity-90 mb-4">
                Get dedicated infrastructure, white-label options, and priority support.
              </p>
              <button className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
