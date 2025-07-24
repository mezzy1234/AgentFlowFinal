export default function Pricing() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Developer Pricing Plans</h1>
        <p className="text-xl text-gray-600">Build, monetize, and scale your AI agents</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Developer Starter */}
        <div className="bg-white rounded-lg shadow-lg p-8 border">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🧪</div>
            <h3 className="text-2xl font-bold mb-2">Developer Starter</h3>
            <p className="text-gray-600 mb-4">Perfect for indie devs testing the waters</p>
            <div className="text-4xl font-bold mb-2">$0<span className="text-lg text-gray-600">/month</span></div>
          </div>
          
          <ul className="space-y-3 mb-8">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Access to all public agents
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Build and run 1 private agent
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              1,000 agent interactions/month
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Basic developer dashboard
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Community support
            </li>
          </ul>
          
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition">
            Start for Free →
          </button>
        </div>

        {/* Developer Pro */}
        <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-blue-500 relative">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm">Most Popular</span>
          </div>
          
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🚀</div>
            <h3 className="text-2xl font-bold mb-2">Developer Pro</h3>
            <p className="text-gray-600 mb-4">Ideal for monetizing your agents and scaling growth</p>
            <div className="text-4xl font-bold mb-2">$99<span className="text-lg text-gray-600">/month</span></div>
          </div>
          
          <ul className="space-y-3 mb-8">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Everything in Starter plan
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Unlimited agent creation
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Developer analytics dashboard
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Revenue sharing (70/30 split)
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Runtime management & logs
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              API access
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Priority support
            </li>
          </ul>
          
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition">
            Upgrade to Pro →
          </button>
        </div>

        {/* Developer Enterprise */}
        <div className="bg-white rounded-lg shadow-lg p-8 border">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🏢</div>
            <h3 className="text-2xl font-bold mb-2">Developer Enterprise</h3>
            <p className="text-gray-600 mb-4">Custom infrastructure and advanced integrations</p>
            <div className="text-4xl font-bold mb-2">Custom</div>
          </div>
          
          <ul className="space-y-3 mb-8">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Everything in Pro plan
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Unlimited usage & interactions
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Dedicated infrastructure
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              White-label dashboard
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Custom integrations & SLAs
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              24/7 dedicated support
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Early access to beta tools
            </li>
          </ul>
          
          <button className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition">
            Contact Sales →
          </button>
        </div>
      </div>

      <div className="text-center mt-12">
        <p className="text-gray-600 mb-4">All plans include access to our marketplace and runtime management.</p>
        <p className="text-sm text-gray-500">Prices are in USD and billed monthly. Cancel anytime.</p>
      </div>
    </div>
  )
}
