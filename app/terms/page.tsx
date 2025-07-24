export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      
      <div className="prose prose-gray max-w-none">
        <p className="text-sm text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
          <p>
            By accessing and using AgentFlow.AI ("Service"), operated by SummitAI Integrations LLC ("Company", "we", "our", or "us"), 
            you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, 
            you may not access the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
          <p>
            AgentFlow.AI is a platform that enables developers to build, deploy, and monetize AI agents. 
            Our service includes:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>AI agent creation and management tools</li>
            <li>Runtime environment for agent execution</li>
            <li>Marketplace for agent discovery and monetization</li>
            <li>Integration management and credential storage</li>
            <li>Developer analytics and revenue sharing</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Developer Responsibilities</h2>
          <p>As a developer using our platform, you agree to:</p>
          <ul className="list-disc pl-6 mt-2">
            <li>Provide accurate information when creating your account</li>
            <li>Maintain the security of your account credentials</li>
            <li>Ensure your agents comply with applicable laws and regulations</li>
            <li>Not create agents that infringe on intellectual property rights</li>
            <li>Not use the platform for malicious, harmful, or illegal activities</li>
            <li>Respect usage limits and fair use policies</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Subscription and Billing</h2>
          <p>
            Our Developer Pro and Enterprise plans are subscription-based services. By subscribing, you agree to:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Pay all fees associated with your chosen plan</li>
            <li>Automatic renewal unless cancelled before the billing cycle</li>
            <li>Our right to change pricing with 30 days advance notice</li>
            <li>No refunds for partial months of service</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Revenue Sharing</h2>
          <p>
            For monetized agents on our platform:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Developers retain 70% of net revenue from agent usage</li>
            <li>SummitAI Integrations LLC retains 30% as platform fee</li>
            <li>Payments are processed monthly for amounts above $50</li>
            <li>Tax compliance is the responsibility of the developer</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Contact Information</h2>
          <p>
            For questions about these Terms of Service, please contact us at:
          </p>
          <div className="mt-2">
            <p>SummitAI Integrations LLC</p>
            <p>Email: legal@agentflow.ai</p>
            <p>Support: support@agentflow.ai</p>
          </div>
        </section>
      </div>
    </div>
  )
}
