export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose prose-gray max-w-none">
        <p className="text-sm text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p>
            SummitAI Integrations LLC ("we", "our", or "us") operates AgentFlow.AI ("the Service"). 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
            when you use our platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
          
          <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
          <p>We may collect the following personal information:</p>
          <ul className="list-disc pl-6 mt-2 mb-4">
            <li>Name and email address</li>
            <li>Account credentials and authentication information</li>
            <li>Payment and billing information</li>
            <li>Profile information and preferences</li>
          </ul>

          <h3 className="text-lg font-semibold mb-2">Technical Information</h3>
          <p>We automatically collect certain technical information:</p>
          <ul className="list-disc pl-6 mt-2 mb-4">
            <li>IP address and device information</li>
            <li>Browser type and version</li>
            <li>Usage patterns and interaction data</li>
            <li>Performance metrics and error logs</li>
          </ul>

          <h3 className="text-lg font-semibold mb-2">Agent and Integration Data</h3>
          <p>When you use our platform, we collect:</p>
          <ul className="list-disc pl-6 mt-2">
            <li>Agent configurations and code</li>
            <li>Integration credentials (encrypted)</li>
            <li>Runtime logs and execution data</li>
            <li>Usage analytics and performance metrics</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
          <p>We use collected information for:</p>
          <ul className="list-disc pl-6 mt-2">
            <li><strong>Service Provision:</strong> Operating and maintaining the platform</li>
            <li><strong>Account Management:</strong> Creating and managing user accounts</li>
            <li><strong>Payment Processing:</strong> Handling subscriptions and revenue sharing</li>
            <li><strong>Platform Improvement:</strong> Analyzing usage to enhance features</li>
            <li><strong>Security:</strong> Detecting and preventing fraudulent activity</li>
            <li><strong>Communication:</strong> Sending updates, support responses, and notifications</li>
            <li><strong>Compliance:</strong> Meeting legal and regulatory requirements</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
          <p>We implement comprehensive security measures:</p>
          <ul className="list-disc pl-6 mt-2">
            <li><strong>Encryption:</strong> AES-256 encryption for sensitive credentials</li>
            <li><strong>Authentication:</strong> Secure OAuth 2.0 flows and multi-factor authentication</li>
            <li><strong>Access Control:</strong> Role-based permissions and least-privilege principles</li>
            <li><strong>Monitoring:</strong> Continuous security monitoring and threat detection</li>
            <li><strong>Auditing:</strong> Regular security audits and penetration testing</li>
            <li><strong>Infrastructure:</strong> Secure cloud hosting with enterprise-grade protections</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Data Sharing and Disclosure</h2>
          <p>We may share your information in the following circumstances:</p>
          
          <h3 className="text-lg font-semibold mb-2">Service Providers</h3>
          <p>We work with trusted third-party providers for:</p>
          <ul className="list-disc pl-6 mt-2 mb-4">
            <li>Payment processing (Stripe)</li>
            <li>Cloud hosting and infrastructure</li>
            <li>Analytics and performance monitoring</li>
            <li>Customer support tools</li>
          </ul>

          <h3 className="text-lg font-semibold mb-2">Legal Requirements</h3>
          <p>We may disclose information when required by law or to:</p>
          <ul className="list-disc pl-6 mt-2 mb-4">
            <li>Comply with legal processes</li>
            <li>Protect our rights and property</li>
            <li>Ensure user safety and security</li>
            <li>Investigate potential violations</li>
          </ul>

          <h3 className="text-lg font-semibold mb-2">Business Transfers</h3>
          <p>
            In the event of a merger, acquisition, or sale of assets, user information may be transferred 
            as part of the business transaction.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Your Rights and Choices</h2>
          <p>You have the following rights regarding your personal information:</p>
          <ul className="list-disc pl-6 mt-2">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data</li>
            <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
            <li><strong>Restriction:</strong> Limit how we process your information</li>
            <li><strong>Objection:</strong> Object to certain processing activities</li>
          </ul>
          
          <p className="mt-4">
            To exercise these rights, contact us at privacy@agentflow.ai. We will respond within 30 days.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your own. 
            We ensure appropriate safeguards are in place to protect your data in accordance with 
            applicable data protection laws.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Data Retention</h2>
          <p>We retain your information for as long as necessary to:</p>
          <ul className="list-disc pl-6 mt-2">
            <li>Provide our services</li>
            <li>Comply with legal obligations</li>
            <li>Resolve disputes</li>
            <li>Enforce our agreements</li>
          </ul>
          <p className="mt-4">
            When you delete your account, we will delete or anonymize your personal information 
            within 90 days, except where retention is required by law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Cookies and Tracking</h2>
          <p>We use cookies and similar technologies to:</p>
          <ul className="list-disc pl-6 mt-2">
            <li>Maintain user sessions</li>
            <li>Remember user preferences</li>
            <li>Analyze platform usage</li>
            <li>Improve user experience</li>
          </ul>
          <p className="mt-4">
            You can control cookies through your browser settings, but some features may not function properly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
          <p>
            Our service is not intended for children under 13 years of age. We do not knowingly collect 
            personal information from children under 13. If you become aware that a child has provided 
            us with personal information, please contact us immediately.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. California Privacy Rights</h2>
          <p>
            California residents have additional rights under the California Consumer Privacy Act (CCPA):
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Right to know what personal information is collected</li>
            <li>Right to delete personal information</li>
            <li>Right to opt-out of the sale of personal information</li>
            <li>Right to non-discrimination for exercising privacy rights</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material 
            changes by posting the new policy on this page and updating the "Last updated" date. 
            We encourage you to review this policy periodically.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us:
          </p>
          <div className="mt-2">
            <p>SummitAI Integrations LLC</p>
            <p>Email: privacy@agentflow.ai</p>
            <p>Support: support@agentflow.ai</p>
            <p>Address: [Company Address]</p>
          </div>
        </section>
      </div>
    </div>
  )
}
