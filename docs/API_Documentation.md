# 📚 AgentFlow.AI Complete API Documentation

## Overview
AgentFlow.AI is a comprehensive SaaS platform for creating, managing, and executing AI automation agents. This API provides programmatic access to all platform features with enterprise-grade security, monitoring, and compliance.

## 🔑 Authentication

### API Keys
Generate API keys through the dashboard or API:
```bash
POST /api/api-keys
{
  "action": "generate",
  "user_id": "your_user_id",
  "name": "Production Key",
  "permissions": [
    {"resource": "agents", "actions": ["read", "execute"]},
    {"resource": "executions", "actions": ["read"]}
  ]
}
```

### Headers
```
Authorization: Bearer ak_your_api_key_here
Content-Type: application/json
```

## 🔗 Base URLs
- **Production**: `https://agentflow.ai`
- **Staging**: `https://staging.agentflow.ai`
- **Development**: `http://localhost:3000`

---

## 🤖 Agent Management

### List Agents
```
GET /api/agents?user_id={user_id}&category={category}&is_public={boolean}
```

**Parameters:**
- `user_id` (string): Filter by agent creator
- `category` (string): Filter by category (productivity, communication, etc.)
- `is_public` (boolean): Show only public agents
- `limit` (number): Maximum results (default: 50)
- `offset` (number): Pagination offset

**Response:**
```json
{
  "success": true,
  "agents": [
    {
      "id": "agent_12345",
      "name": "Slack Automation Bot",
      "category": "communication",
      "is_public": true,
      "creator_id": "user_67890",
      "downloads": 1250,
      "rating": 4.8,
      "description": "Automates Slack messaging workflows",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 1,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

### Get Agent Details
```
GET /api/agents/{agent_id}
```

**Response:**
```json
{
  "success": true,
  "agent": {
    "id": "agent_12345",
    "name": "Slack Automation Bot",
    "description": "Comprehensive Slack automation agent",
    "configuration": {
      "triggers": [
        {
          "type": "webhook",
          "url": "https://api.agentflow.ai/webhook/agent_12345"
        }
      ],
      "actions": [
        {
          "type": "slack",
          "service": "slack",
          "action": "send_message"
        }
      ]
    },
    "metadata": {
      "version": "1.2.0",
      "last_updated": "2025-01-15T10:00:00Z",
      "execution_count": 5420,
      "success_rate": 98.5
    }
  }
}
```

### Execute Agent
```
POST /api/agent-orchestrator
```

**Request:**
```json
{
  "agent_id": "agent_12345",
  "user_id": "user_67890",
  "input_data": {
    "message": "Hello from API",
    "channel": "#general"
  },
  "trigger_type": "api"
}
```

**Response:**
```json
{
  "success": true,
  "execution_id": "exec_98765",
  "status": "completed",
  "results": {
    "message_sent": true,
    "timestamp": "2025-01-15T10:30:00Z",
    "response_data": {
      "slack_ts": "1705316400.123456"
    }
  },
  "execution_time": 1250
}
```

### Upload Agent
```
POST /api/agent-uploader
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: Agent JSON/ZIP file
- `user_id`: Your user ID
- `action`: "upload"
- `validation_mode`: "strict" | "lenient"

**Response:**
```json
{
  "success": true,
  "agent": {
    "id": "agent_new123",
    "name": "Uploaded Agent",
    "status": "active",
    "validation_results": {
      "passed": true,
      "warnings": [],
      "errors": []
    }
  }
}
```

---

## 🔐 Authentication & OAuth

### Generate API Key
```
POST /api/api-keys
```

**Request:**
```json
{
  "action": "generate",
  "user_id": "user_67890",
  "name": "Production API Key",
  "permissions": [
    {"resource": "agents", "actions": ["read", "execute"]},
    {"resource": "executions", "actions": ["read"]}
  ],
  "options": {
    "rate_limits": {
      "requests_per_minute": 100,
      "requests_per_hour": 5000
    },
    "expires_at": "2026-01-15T10:00:00Z"
  }
}
```

### List API Keys
```
GET /api/api-keys?user_id={user_id}&status=active
```

### Initiate OAuth
```
POST /api/multi-oauth
```

**Request:**
```json
{
  "action": "initiate_oauth",
  "provider": "slack",
  "user_id": "user_67890",
  "redirect_uri": "https://yourapp.com/oauth/callback",
  "scopes": ["channels:read", "chat:write"]
}
```

**Response:**
```json
{
  "success": true,
  "oauth_url": "https://slack.com/oauth/v2/authorize?client_id=...",
  "state": "state_abc123",
  "expires_in": 600
}
```

### List OAuth Providers
```
GET /api/multi-oauth?type=providers&category=communication
```

**Response:**
```json
{
  "success": true,
  "providers": [
    {
      "id": "slack",
      "name": "Slack",
      "category": "communication",
      "oauth_version": "2.0",
      "supported_scopes": ["channels:read", "chat:write", "users:read"]
    },
    {
      "id": "discord",
      "name": "Discord",
      "category": "communication",
      "oauth_version": "2.0",
      "supported_scopes": ["identify", "guilds", "bot"]
    }
  ]
}
```

---

## 📊 Analytics & Logging

### Get Execution Logs
```
GET /api/execution-logging?type=execution_logs&user_id={user_id}&limit=50
```

**Parameters:**
- `agent_id` (string): Filter by specific agent
- `status` (string): Filter by status (completed, failed, running)
- `start_date` (ISO 8601): Start date filter
- `end_date` (ISO 8601): End date filter

**Response:**
```json
{
  "success": true,
  "executions": [
    {
      "id": "exec_98765",
      "agent_id": "agent_12345",
      "user_id": "user_67890",
      "status": "completed",
      "started_at": "2025-01-15T10:30:00Z",
      "completed_at": "2025-01-15T10:30:01.250Z",
      "duration_ms": 1250,
      "trigger_type": "api",
      "steps": [
        {
          "step_name": "slack_send_message",
          "status": "completed",
          "duration_ms": 850,
          "api_calls": 1
        }
      ]
    }
  ],
  "total": 1,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

### Get Analytics
```
GET /api/execution-logging?type=analytics&user_id={user_id}&timeframe=7d
```

**Response:**
```json
{
  "success": true,
  "analytics": {
    "summary": {
      "total_executions": 150,
      "successful_executions": 147,
      "failed_executions": 3,
      "success_rate": 98.0,
      "avg_execution_time": 1200,
      "total_api_calls": 450
    },
    "daily_stats": [
      {
        "date": "2025-01-15",
        "executions": 25,
        "success_rate": 96.0,
        "avg_duration": 1100
      }
    ],
    "top_agents": [
      {
        "agent_id": "agent_12345",
        "name": "Slack Bot",
        "executions": 75,
        "success_rate": 98.7
      }
    ]
  }
}
```

### Export Logs
```
GET /api/execution-logging?type=export&user_id={user_id}&format=csv&start_date=2025-01-01
```

**Parameters:**
- `format`: "csv" | "json"
- `include_steps`: Include step-by-step details
- `include_metadata`: Include execution metadata

---

## 🔍 Agent Metadata & Debugging

### Get Agent Metadata
```
GET /api/agent-metadata?type=metadata&agent_id={agent_id}&user_id={user_id}
```

**Response:**
```json
{
  "success": true,
  "metadata": {
    "basic_info": {
      "name": "Slack Automation Bot",
      "version": "1.2.0",
      "created_at": "2025-01-10T00:00:00Z",
      "last_modified": "2025-01-15T10:00:00Z"
    },
    "configuration_analysis": {
      "trigger_count": 1,
      "action_count": 1,
      "integration_count": 1,
      "complexity_score": 2.5,
      "estimated_cost_per_execution": 0.001
    },
    "performance_metrics": {
      "total_executions": 5420,
      "success_rate": 98.5,
      "avg_execution_time": 1200,
      "last_30_days": {
        "executions": 450,
        "success_rate": 99.1
      }
    },
    "security_analysis": {
      "permissions_used": ["slack:chat:write"],
      "data_retention": "30_days",
      "encryption_status": "enabled",
      "compliance_flags": []
    }
  }
}
```

### Debug Agent
```
GET /api/agent-metadata?type=debug&agent_id={agent_id}&user_id={user_id}
```

**Response:**
```json
{
  "success": true,
  "debug_info": {
    "configuration_issues": [],
    "recent_errors": [
      {
        "timestamp": "2025-01-15T09:30:00Z",
        "error_type": "authentication",
        "message": "Slack token expired",
        "suggested_fix": "Refresh OAuth token in integrations"
      }
    ],
    "performance_analysis": {
      "bottlenecks": [],
      "optimization_suggestions": [
        "Consider caching user data to reduce API calls"
      ]
    },
    "health_score": 85
  }
}
```

---

## 👤 Developer Profiles

### Get Developer Profile
```
GET /api/developer-profiles?type=profile&identifier=username123
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "user_id": "user_67890",
    "username": "awesome_dev",
    "display_name": "Awesome Developer",
    "bio": "Building amazing AI automation agents",
    "avatar_url": "https://...",
    "location": "San Francisco, CA",
    "skills": ["JavaScript", "Python", "AI", "Automation"],
    "specializations": ["productivity", "communication"],
    "stats": {
      "agents_published": 15,
      "total_downloads": 25000,
      "average_rating": 4.7,
      "followers": 320,
      "following": 45
    },
    "featured_agents": [
      {
        "id": "agent_12345",
        "name": "Slack Bot",
        "downloads": 1250
      }
    ],
    "joined_at": "2024-06-15T00:00:00Z"
  }
}
```

### Search Developers
```
GET /api/developer-profiles?type=search&query=automation&specialization=productivity
```

**Parameters:**
- `query`: Search term
- `specialization`: Filter by specialization
- `sort_by`: "followers" | "agents" | "rating" | "recent"
- `limit`: Results limit

### Follow/Unfollow Developer
```
POST /api/developer-profiles
```

**Request:**
```json
{
  "action": "follow",
  "follower_id": "user_67890",
  "following_id": "user_12345"
}
```

---

## 📋 GDPR Compliance

### Request Data Export
```
POST /api/gdpr-compliance
```

**Request:**
```json
{
  "action": "request_export",
  "user_id": "user_67890",
  "export_type": "full_export"
}
```

**Response:**
```json
{
  "success": true,
  "export_request": {
    "id": "export_abc123",
    "status": "processing",
    "estimated_completion": "2025-01-15T11:00:00Z",
    "download_url": null
  }
}
```

### Request Data Deletion
```
POST /api/gdpr-compliance
```

**Request:**
```json
{
  "action": "request_deletion",
  "user_id": "user_67890",
  "deletion_type": "specific_data",
  "data_categories": ["logs", "integrations"],
  "retain_financial": true
}
```

### Get Compliance Report
```
GET /api/gdpr-compliance?type=compliance_report&user_id={user_id}
```

---

## ⚡ Testing

### Test Agent Locally
```
POST /api/agent-testing-cli
```

**Request:**
```json
{
  "action": "run_local_test",
  "user_id": "user_67890",
  "agent_config": {
    "name": "Test Agent",
    "triggers": [
      {
        "type": "webhook",
        "url": "https://webhook.site/test"
      }
    ],
    "actions": [
      {
        "type": "slack",
        "service": "slack",
        "action": "send_message"
      }
    ]
  },
  "test_data": {
    "webhook_payload": {
      "message": "Test message"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "test_result": {
    "test_id": "test_xyz789",
    "status": "passed",
    "execution_time": 1100,
    "steps": [
      {
        "step": "webhook_trigger",
        "status": "passed",
        "duration": 50
      },
      {
        "step": "slack_send_message",
        "status": "passed",
        "duration": 850
      }
    ],
    "output": {
      "message_sent": true,
      "response": "OK"
    }
  }
}
```

---

## 🔧 System Management

### Get System Health
```
GET /api/system-error-handler?type=system_health
```

### Cleanup System
```
POST /api/system-error-handler
```

**Request:**
```json
{
  "action": "cleanup_placeholders"
}
```

---

## 📈 Rate Limits

Default rate limits per API key:
- **Free Tier**: 100 requests/hour
- **Pro Tier**: 1,000 requests/hour  
- **Enterprise**: Custom limits

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705320000
```

---

## ❌ Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or expired",
    "details": {
      "timestamp": "2025-01-15T10:30:00Z",
      "request_id": "req_abc123"
    }
  }
}
```

### Common Error Codes
- `INVALID_API_KEY` (401): API key is invalid or expired
- `INSUFFICIENT_PERMISSIONS` (403): API key lacks required permissions
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `VALIDATION_ERROR` (400): Request validation failed
- `AGENT_NOT_FOUND` (404): Agent doesn't exist
- `EXECUTION_FAILED` (500): Agent execution failed

---

## 🔗 Webhooks

### Webhook Events
Subscribe to real-time events:

**Agent Execution Completed:**
```json
{
  "event": "agent.execution.completed",
  "data": {
    "execution_id": "exec_98765",
    "agent_id": "agent_12345",
    "status": "completed",
    "duration_ms": 1250
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**OAuth Connection Status:**
```json
{
  "event": "oauth.connection.updated",
  "data": {
    "user_id": "user_67890",
    "provider": "slack",
    "status": "connected"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

## 🧪 SDK & Examples

### JavaScript/Node.js
```javascript
const AgentFlow = require('@agentflow/sdk');

const client = new AgentFlow({
  apiKey: 'ak_your_api_key_here',
  baseUrl: 'https://agentflow.ai'
});

// Execute an agent
const result = await client.agents.execute({
  agentId: 'agent_12345',
  inputData: { message: 'Hello World' }
});

console.log(result);
```

### Python
```python
import agentflow

client = agentflow.Client(
    api_key='ak_your_api_key_here',
    base_url='https://agentflow.ai'
)

# Execute an agent
result = client.agents.execute(
    agent_id='agent_12345',
    input_data={'message': 'Hello World'}
)

print(result)
```

### cURL Examples
```bash
# Get agents
curl -H "Authorization: Bearer ak_your_api_key_here" \
  "https://agentflow.ai/api/agents?user_id=user_67890"

# Execute agent
curl -X POST \
  -H "Authorization: Bearer ak_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"agent_12345","user_id":"user_67890","input_data":{"message":"Hello"}}' \
  "https://agentflow.ai/api/agent-orchestrator"
```

---

## 📞 Support

- **Documentation**: [https://docs.agentflow.ai](https://docs.agentflow.ai)
- **API Status**: [https://status.agentflow.ai](https://status.agentflow.ai)  
- **Support Email**: support@agentflow.ai
- **Developer Discord**: [https://discord.gg/agentflow](https://discord.gg/agentflow)

---

*Last Updated: January 15, 2025*
