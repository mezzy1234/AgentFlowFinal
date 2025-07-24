import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Email service configuration - using Resend as example
const RESEND_API_KEY = process.env.RESEND_API_KEY || 'your-resend-api-key'
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@agentflow.ai'

interface EmailRequest {
  type: 'welcome' | 'purchase_confirmation' | 'agent_approved' | 'agent_rejected' | 'revenue_earned' | 'integration_expired' | 'system_alert'
  recipient_email: string
  recipient_name?: string
  data: any
}

interface EmailTemplate {
  subject: string
  html_content: string
  text_content: string
}

class AutomatedEmailSystem {
  async sendEmail(emailRequest: EmailRequest) {
    try {
      const template = await this.getEmailTemplate(emailRequest.type, emailRequest.data)
      
      const emailPayload = {
        from: FROM_EMAIL,
        to: emailRequest.recipient_email,
        subject: template.subject,
        html: template.html_content,
        text: template.text_content
      }

      // Send via Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(`Email sending failed: ${result.message}`)
      }

      // Log email sent
      await this.logEmailSent(emailRequest, result.id)

      return {
        success: true,
        email_id: result.id,
        message: 'Email sent successfully'
      }
    } catch (error) {
      console.error('Email sending error:', error)
      await this.logEmailError(emailRequest, (error as Error).message)
      
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async getEmailTemplate(type: string, data: any): Promise<EmailTemplate> {
    switch (type) {
      case 'welcome':
        return this.getWelcomeTemplate(data)
      case 'purchase_confirmation':
        return this.getPurchaseConfirmationTemplate(data)
      case 'agent_approved':
        return this.getAgentApprovedTemplate(data)
      case 'agent_rejected':
        return this.getAgentRejectedTemplate(data)
      case 'revenue_earned':
        return this.getRevenueEarnedTemplate(data)
      case 'integration_expired':
        return this.getIntegrationExpiredTemplate(data)
      case 'system_alert':
        return this.getSystemAlertTemplate(data)
      default:
        throw new Error(`Unknown email template type: ${type}`)
    }
  }

  getWelcomeTemplate(data: any): EmailTemplate {
    return {
      subject: `Welcome to AgentFlow.AI, ${data.user_name}!`,
      html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to AgentFlow.AI!</h1>
          <p>Hi ${data.user_name},</p>
          <p>Welcome to AgentFlow.AI! We're excited to have you join our community of AI automation enthusiasts.</p>
          
          <h2>Getting Started</h2>
          <ul>
            <li><strong>Browse the Marketplace:</strong> Discover pre-built agents for various tasks</li>
            <li><strong>Connect Integrations:</strong> Link your favorite tools and services</li>
            <li><strong>Create Your First Automation:</strong> Start building custom workflows</li>
          </ul>

          <div style="background: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3>Quick Links</h3>
            <p><a href="${data.dashboard_url}" style="color: #2563eb;">Go to Dashboard</a></p>
            <p><a href="${data.marketplace_url}" style="color: #2563eb;">Browse Marketplace</a></p>
            <p><a href="${data.help_url}" style="color: #2563eb;">Help & Support</a></p>
          </div>

          <p>If you have any questions, don't hesitate to reach out to our support team.</p>
          <p>Best regards,<br>The AgentFlow.AI Team</p>
        </div>
      `,
      text_content: `Welcome to AgentFlow.AI, ${data.user_name}! We're excited to have you join our community...`
    }
  }

  getPurchaseConfirmationTemplate(data: any): EmailTemplate {
    return {
      subject: `Purchase Confirmed: ${data.agent_name}`,
      html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Purchase Confirmed</h1>
          <p>Hi ${data.user_name},</p>
          <p>Thank you for your purchase! Your agent is now active and ready to use.</p>
          
          <div style="background: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3>Purchase Details</h3>
            <p><strong>Agent:</strong> ${data.agent_name}</p>
            <p><strong>Amount:</strong> $${(data.amount_cents / 100).toFixed(2)}</p>
            <p><strong>Transaction ID:</strong> ${data.transaction_id}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          <h3>Next Steps</h3>
          <ol>
            <li>Go to your <a href="${data.dashboard_url}" style="color: #2563eb;">Dashboard</a></li>
            <li>Click on "${data.agent_name}" to configure it</li>
            <li>Connect any required integrations</li>
            <li>Turn on the agent to start automation</li>
          </ol>

          <p>Need help getting started? Check our <a href="${data.help_url}" style="color: #2563eb;">documentation</a> or contact support.</p>
          <p>Best regards,<br>The AgentFlow.AI Team</p>
        </div>
      `,
      text_content: `Purchase Confirmed: ${data.agent_name}. Thank you for your purchase!...`
    }
  }

  getAgentApprovedTemplate(data: any): EmailTemplate {
    return {
      subject: `🎉 Your Agent "${data.agent_name}" has been Approved!`,
      html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Agent Approved! 🎉</h1>
          <p>Hi ${data.developer_name},</p>
          <p>Great news! Your agent "${data.agent_name}" has been approved and is now live in the AgentFlow.AI marketplace.</p>
          
          <div style="background: #ecfdf5; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10b981;">
            <h3>Agent Details</h3>
            <p><strong>Name:</strong> ${data.agent_name}</p>
            <p><strong>Status:</strong> Live in Marketplace</p>
            <p><strong>Pricing:</strong> ${data.pricing_model}</p>
            <p><strong>Approval Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          <h3>What's Next?</h3>
          <ul>
            <li>Your agent is now discoverable by all AgentFlow.AI users</li>
            <li>You'll start earning revenue when users purchase/use your agent</li>
            <li>Monitor performance in your <a href="${data.developer_dashboard_url}" style="color: #2563eb;">Developer Dashboard</a></li>
          </ul>

          <p>Congratulations on your successful submission!</p>
          <p>Best regards,<br>The AgentFlow.AI Team</p>
        </div>
      `,
      text_content: `Your Agent "${data.agent_name}" has been Approved! Great news!...`
    }
  }

  getAgentRejectedTemplate(data: any): EmailTemplate {
    return {
      subject: `Agent Review Update: "${data.agent_name}"`,
      html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Agent Review Update</h1>
          <p>Hi ${data.developer_name},</p>
          <p>Thank you for submitting "${data.agent_name}" for marketplace review. Unfortunately, we need some changes before it can be approved.</p>
          
          <div style="background: #fef2f2; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #dc2626;">
            <h3>Required Changes</h3>
            <ul>
              ${data.rejection_reasons.map((reason: string) => `<li>${reason}</li>`).join('')}
            </ul>
          </div>

          <h3>Next Steps</h3>
          <ol>
            <li>Address the issues listed above</li>
            <li>Test your agent thoroughly</li>
            <li>Resubmit for review via your <a href="${data.developer_dashboard_url}" style="color: #2563eb;">Developer Dashboard</a></li>
          </ol>

          <p>If you have questions about these requirements, please contact our support team.</p>
          <p>Best regards,<br>The AgentFlow.AI Team</p>
        </div>
      `,
      text_content: `Agent Review Update: "${data.agent_name}". We need some changes before approval...`
    }
  }

  getRevenueEarnedTemplate(data: any): EmailTemplate {
    return {
      subject: `💰 You've earned $${(data.amount_cents / 100).toFixed(2)} on AgentFlow.AI!`,
      html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Revenue Earned! 💰</h1>
          <p>Hi ${data.developer_name},</p>
          <p>Great news! You've earned revenue from your agents on AgentFlow.AI.</p>
          
          <div style="background: #ecfdf5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3>Revenue Summary</h3>
            <p><strong>Amount Earned:</strong> $${(data.amount_cents / 100).toFixed(2)}</p>
            <p><strong>Agent:</strong> ${data.agent_name}</p>
            <p><strong>Period:</strong> ${data.period}</p>
            <p><strong>Total Users:</strong> ${data.user_count}</p>
          </div>

          <p>Your next payout will be processed on ${data.next_payout_date}.</p>
          <p>View detailed analytics in your <a href="${data.developer_dashboard_url}" style="color: #2563eb;">Developer Dashboard</a>.</p>
          
          <p>Keep building amazing agents!</p>
          <p>Best regards,<br>The AgentFlow.AI Team</p>
        </div>
      `,
      text_content: `You've earned $${(data.amount_cents / 100).toFixed(2)} on AgentFlow.AI!...`
    }
  }

  getIntegrationExpiredTemplate(data: any): EmailTemplate {
    return {
      subject: `🔴 Integration Expired: ${data.service_name}`,
      html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Integration Expired</h1>
          <p>Hi ${data.user_name},</p>
          <p>Your ${data.service_name} integration has expired and needs to be reconnected.</p>
          
          <div style="background: #fef2f2; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3>Affected Agents</h3>
            <ul>
              ${data.affected_agents.map((agent: string) => `<li>${agent}</li>`).join('')}
            </ul>
          </div>

          <h3>Action Required</h3>
          <p>To restore functionality:</p>
          <ol>
            <li>Go to your <a href="${data.integrations_url}" style="color: #2563eb;">Integrations page</a></li>
            <li>Reconnect your ${data.service_name} account</li>
            <li>Your agents will automatically resume working</li>
          </ol>

          <p>Questions? Contact our support team.</p>
          <p>Best regards,<br>The AgentFlow.AI Team</p>
        </div>
      `,
      text_content: `Integration Expired: ${data.service_name}. Your integration needs to be reconnected...`
    }
  }

  getSystemAlertTemplate(data: any): EmailTemplate {
    return {
      subject: `🚨 System Alert: ${data.alert_type}`,
      html_content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">System Alert</h1>
          <p>Hi ${data.user_name},</p>
          <p>We've detected an issue that requires your attention.</p>
          
          <div style="background: #fef2f2; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3>Alert Details</h3>
            <p><strong>Type:</strong> ${data.alert_type}</p>
            <p><strong>Severity:</strong> ${data.severity}</p>
            <p><strong>Description:</strong> ${data.description}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <p>Please check your <a href="${data.dashboard_url}" style="color: #2563eb;">Dashboard</a> for more details and recommended actions.</p>
          
          <p>Best regards,<br>The AgentFlow.AI Team</p>
        </div>
      `,
      text_content: `System Alert: ${data.alert_type}. We've detected an issue that requires your attention...`
    }
  }

  async logEmailSent(emailRequest: EmailRequest, emailId: string) {
    await supabase
      .from('email_logs')
      .insert({
        email_id: emailId,
        email_type: emailRequest.type,
        recipient_email: emailRequest.recipient_email,
        status: 'sent',
        sent_at: new Date().toISOString(),
        data: emailRequest.data
      })
  }

  async logEmailError(emailRequest: EmailRequest, error: string) {
    await supabase
      .from('email_logs')
      .insert({
        email_type: emailRequest.type,
        recipient_email: emailRequest.recipient_email,
        status: 'failed',
        error_message: error,
        sent_at: new Date().toISOString(),
        data: emailRequest.data
      })
  }

  async sendWelcomeEmail(userId: string, userName: string, userEmail: string) {
    return await this.sendEmail({
      type: 'welcome',
      recipient_email: userEmail,
      recipient_name: userName,
      data: {
        user_name: userName,
        dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        marketplace_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace`,
        help_url: `${process.env.NEXT_PUBLIC_APP_URL}/help`
      }
    })
  }

  async sendPurchaseConfirmation(purchaseData: any) {
    return await this.sendEmail({
      type: 'purchase_confirmation',
      recipient_email: purchaseData.user_email,
      recipient_name: purchaseData.user_name,
      data: {
        user_name: purchaseData.user_name,
        agent_name: purchaseData.agent_name,
        amount_cents: purchaseData.amount_cents,
        transaction_id: purchaseData.transaction_id,
        dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        help_url: `${process.env.NEXT_PUBLIC_APP_URL}/help`
      }
    })
  }
}

const emailSystem = new AutomatedEmailSystem()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'send_email':
        const result = await emailSystem.sendEmail(body.email_request)
        return NextResponse.json(result)

      case 'send_welcome':
        const welcomeResult = await emailSystem.sendWelcomeEmail(body.user_id, body.user_name, body.user_email)
        return NextResponse.json(welcomeResult)

      case 'send_purchase_confirmation':
        const purchaseResult = await emailSystem.sendPurchaseConfirmation(body.purchase_data)
        return NextResponse.json(purchaseResult)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Email system POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')

    switch (type) {
      case 'email_logs':
        const { data: logs } = await supabase
          .from('email_logs')
          .select('*')
          .order('sent_at', { ascending: false })
          .limit(limit)

        return NextResponse.json({ logs: logs || [] })

      case 'email_stats':
        const { data: stats } = await supabase.rpc('get_email_statistics')
        return NextResponse.json({ stats })

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Email system GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
