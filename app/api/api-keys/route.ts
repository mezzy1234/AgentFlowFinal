import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface APIKey {
  id: string
  user_id: string
  name: string
  key_prefix: string
  key_hash: string
  permissions: APIKeyPermission[]
  rate_limits: RateLimit
  usage_stats: UsageStats
  status: 'active' | 'revoked' | 'expired'
  expires_at?: string
  last_used_at?: string
  created_at: string
  updated_at: string
}

interface APIKeyPermission {
  resource: string
  actions: string[]
  conditions?: {
    rate_limit?: number
    ip_whitelist?: string[]
    time_restrictions?: {
      start_hour: number
      end_hour: number
      days: number[]
    }
    agent_whitelist?: string[]
  }
}

interface RateLimit {
  requests_per_minute: number
  requests_per_hour: number
  requests_per_day: number
  burst_limit: number
}

interface UsageStats {
  total_requests: number
  requests_today: number
  requests_this_month: number
  last_request_at?: string
  most_used_endpoint: string
  error_rate: number
}

class APIKeyManager {
  async generateAPIKey(userId: string, name: string, permissions: APIKeyPermission[], options: {
    expires_at?: string
    rate_limits?: Partial<RateLimit>
    description?: string
  } = {}): Promise<{ api_key: string; key_info: Partial<APIKey> }> {
    
    // Generate secure API key
    const keyId = randomBytes(8).toString('hex')
    const keySecret = randomBytes(32).toString('hex')
    const apiKey = `ak_${keyId}_${keySecret}`
    const keyPrefix = `ak_${keyId}`
    
    // Hash the key for storage
    const crypto = require('crypto')
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    
    // Set default rate limits
    const defaultRateLimits: RateLimit = {
      requests_per_minute: 60,
      requests_per_hour: 1000,
      requests_per_day: 10000,
      burst_limit: 10
    }
    
    const rateLimits = { ...defaultRateLimits, ...(options.rate_limits || {}) }
    
    // Validate permissions
    this.validatePermissions(permissions)
    
    const keyData: Partial<APIKey> = {
      id: keyId,
      user_id: userId,
      name: name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      permissions: permissions,
      rate_limits: rateLimits,
      usage_stats: {
        total_requests: 0,
        requests_today: 0,
        requests_this_month: 0,
        most_used_endpoint: '',
        error_rate: 0
      },
      status: 'active',
      expires_at: options.expires_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Store in database
    const { error } = await supabase
      .from('api_keys')
      .insert(keyData)
    
    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`)
    }
    
    return {
      api_key: apiKey,
      key_info: {
        id: keyId,
        name: name,
        key_prefix: keyPrefix,
        permissions: permissions,
        rate_limits: rateLimits,
        status: 'active',
        created_at: keyData.created_at
      }
    }
  }
  
  async validateAPIKey(apiKey: string): Promise<APIKey | null> {
    try {
      // Extract key ID from API key
      const keyPrefix = apiKey.split('_').slice(0, 2).join('_')
      
      // Hash the full key
      const crypto = require('crypto')
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
      
      const { data: keyRecord, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_prefix', keyPrefix)
        .eq('key_hash', keyHash)
        .eq('status', 'active')
        .single()
      
      if (error || !keyRecord) {
        return null
      }
      
      // Check expiration
      if (keyRecord.expires_at && new Date() > new Date(keyRecord.expires_at)) {
        // Mark as expired
        await supabase
          .from('api_keys')
          .update({ status: 'expired' })
          .eq('id', keyRecord.id)
        return null
      }
      
      return keyRecord as APIKey
    } catch (error) {
      return null
    }
  }
  
  async checkRateLimit(keyId: string, endpoint: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = new Date()
    const windowStart = new Date(now.getTime() - 60000) // 1 minute window
    
    // Get recent requests for this key
    const { data: recentRequests } = await supabase
      .from('api_key_usage')
      .select('*')
      .eq('api_key_id', keyId)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })
    
    const { data: keyRecord } = await supabase
      .from('api_keys')
      .select('rate_limits')
      .eq('id', keyId)
      .single()
    
    if (!keyRecord) {
      return { allowed: false, remaining: 0, resetTime: 0 }
    }
    
    const rateLimits = keyRecord.rate_limits as RateLimit
    const requestsInLastMinute = recentRequests?.length || 0
    
    const allowed = requestsInLastMinute < rateLimits.requests_per_minute
    const remaining = Math.max(0, rateLimits.requests_per_minute - requestsInLastMinute)
    const resetTime = Math.ceil((60000 - (now.getTime() - windowStart.getTime())) / 1000)
    
    return { allowed, remaining, resetTime }
  }
  
  async checkPermission(keyId: string, resource: string, action: string, context: any = {}): Promise<boolean> {
    const { data: keyRecord } = await supabase
      .from('api_keys')
      .select('permissions')
      .eq('id', keyId)
      .single()
    
    if (!keyRecord) {
      return false
    }
    
    const permissions = keyRecord.permissions as APIKeyPermission[]
    
    // Find matching permission
    const permission = permissions.find(p => 
      p.resource === resource || p.resource === '*'
    )
    
    if (!permission) {
      return false
    }
    
    // Check if action is allowed
    if (!permission.actions.includes(action) && !permission.actions.includes('*')) {
      return false
    }
    
    // Check additional conditions
    if (permission.conditions) {
      // IP whitelist check
      if (permission.conditions.ip_whitelist && context.ip) {
        if (!permission.conditions.ip_whitelist.includes(context.ip)) {
          return false
        }
      }
      
      // Time restrictions
      if (permission.conditions.time_restrictions) {
        const now = new Date()
        const hour = now.getHours()
        const day = now.getDay()
        
        const { start_hour, end_hour, days } = permission.conditions.time_restrictions
        
        if (hour < start_hour || hour > end_hour) {
          return false
        }
        
        if (!days.includes(day)) {
          return false
        }
      }
      
      // Agent whitelist
      if (permission.conditions.agent_whitelist && context.agent_id) {
        if (!permission.conditions.agent_whitelist.includes(context.agent_id)) {
          return false
        }
      }
    }
    
    return true
  }
  
  async logAPIUsage(keyId: string, endpoint: string, method: string, statusCode: number, responseTime: number, userAgent?: string) {
    const usageRecord = {
      api_key_id: keyId,
      endpoint: endpoint,
      method: method,
      status_code: statusCode,
      response_time_ms: responseTime,
      user_agent: userAgent,
      created_at: new Date().toISOString()
    }
    
    await supabase
      .from('api_key_usage')
      .insert(usageRecord)
    
    // Update key stats
    await this.updateKeyStats(keyId, endpoint, statusCode >= 400)
    
    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ 
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId)
  }
  
  async updateKeyStats(keyId: string, endpoint: string, isError: boolean) {
    const { data: keyRecord } = await supabase
      .from('api_keys')
      .select('usage_stats')
      .eq('id', keyId)
      .single()
    
    if (!keyRecord) return
    
    const stats = keyRecord.usage_stats as UsageStats
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().substr(0, 7)
    
    // Count requests for today and this month
    const { count: todayCount } = await supabase
      .from('api_key_usage')
      .select('*', { count: 'exact' })
      .eq('api_key_id', keyId)
      .gte('created_at', `${today}T00:00:00Z`)
    
    const { count: monthCount } = await supabase
      .from('api_key_usage')
      .select('*', { count: 'exact' })
      .eq('api_key_id', keyId)
      .gte('created_at', `${thisMonth}-01T00:00:00Z`)
    
    const updatedStats: UsageStats = {
      total_requests: stats.total_requests + 1,
      requests_today: todayCount || 0,
      requests_this_month: monthCount || 0,
      last_request_at: new Date().toISOString(),
      most_used_endpoint: endpoint, // Simplified - would need more logic for actual most used
      error_rate: stats.error_rate // Would need calculation based on error history
    }
    
    await supabase
      .from('api_keys')
      .update({ 
        usage_stats: updatedStats,
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId)
  }
  
  async listAPIKeys(userId: string): Promise<Partial<APIKey>[]> {
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, permissions, rate_limits, usage_stats, status, expires_at, last_used_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to list API keys: ${error.message}`)
    }
    
    return keys || []
  }
  
  async revokeAPIKey(keyId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('api_keys')
      .update({ 
        status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId)
      .eq('user_id', userId)
    
    return !error
  }
  
  async updateAPIKey(keyId: string, userId: string, updates: {
    name?: string
    permissions?: APIKeyPermission[]
    rate_limits?: Partial<RateLimit>
    expires_at?: string
  }): Promise<boolean> {
    if (updates.permissions) {
      this.validatePermissions(updates.permissions)
    }
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (updates.name) updateData.name = updates.name
    if (updates.permissions) updateData.permissions = updates.permissions
    if (updates.rate_limits) {
      // Merge with existing rate limits
      const { data: existing } = await supabase
        .from('api_keys')
        .select('rate_limits')
        .eq('id', keyId)
        .single()
      
      if (existing) {
        updateData.rate_limits = { ...existing.rate_limits, ...updates.rate_limits }
      }
    }
    if (updates.expires_at !== undefined) updateData.expires_at = updates.expires_at
    
    const { error } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', keyId)
      .eq('user_id', userId)
    
    return !error
  }
  
  async getAPIKeyUsage(keyId: string, userId: string, timeframe: '24h' | '7d' | '30d' = '7d') {
    // Verify ownership
    const { data: keyRecord } = await supabase
      .from('api_keys')
      .select('id')
      .eq('id', keyId)
      .eq('user_id', userId)
      .single()
    
    if (!keyRecord) {
      throw new Error('API key not found or access denied')
    }
    
    const timeframes = {
      '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
      '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }
    
    const startDate = timeframes[timeframe]
    
    const { data: usage } = await supabase
      .from('api_key_usage')
      .select('*')
      .eq('api_key_id', keyId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
    
    if (!usage) return null
    
    // Calculate analytics
    const totalRequests = usage.length
    const successfulRequests = usage.filter(u => u.status_code < 400).length
    const errorRequests = usage.filter(u => u.status_code >= 400).length
    const avgResponseTime = usage.reduce((sum, u) => sum + u.response_time_ms, 0) / usage.length
    
    // Group by endpoint
    const endpointStats = usage.reduce((acc, u) => {
      if (!acc[u.endpoint]) {
        acc[u.endpoint] = { count: 0, errors: 0, total_time: 0 }
      }
      acc[u.endpoint].count++
      if (u.status_code >= 400) acc[u.endpoint].errors++
      acc[u.endpoint].total_time += u.response_time_ms
      return acc
    }, {} as any)
    
    // Group by day for trends
    const dailyStats = usage.reduce((acc, u) => {
      const date = u.created_at.split('T')[0]
      if (!acc[date]) {
        acc[date] = { requests: 0, errors: 0 }
      }
      acc[date].requests++
      if (u.status_code >= 400) acc[date].errors++
      return acc
    }, {} as any)
    
    return {
      overview: {
        total_requests: totalRequests,
        successful_requests: successfulRequests,
        error_requests: errorRequests,
        success_rate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
        avg_response_time_ms: Math.round(avgResponseTime) || 0
      },
      endpoint_breakdown: Object.entries(endpointStats).map(([endpoint, stats]: [string, any]) => ({
        endpoint,
        requests: stats.count,
        errors: stats.errors,
        avg_response_time: Math.round(stats.total_time / stats.count),
        error_rate: (stats.errors / stats.count) * 100
      })),
      daily_trends: Object.entries(dailyStats).map(([date, stats]: [string, any]) => ({
        date,
        requests: stats.requests,
        errors: stats.errors,
        success_rate: (stats.requests - stats.errors) / stats.requests * 100
      })).sort((a, b) => a.date.localeCompare(b.date))
    }
  }
  
  private validatePermissions(permissions: APIKeyPermission[]) {
    const validResources = ['agents', 'executions', 'webhooks', 'integrations', 'billing', '*']
    const validActions = ['read', 'write', 'execute', 'delete', '*']
    
    for (const permission of permissions) {
      if (!validResources.includes(permission.resource)) {
        throw new Error(`Invalid resource: ${permission.resource}`)
      }
      
      for (const action of permission.actions) {
        if (!validActions.includes(action)) {
          throw new Error(`Invalid action: ${action}`)
        }
      }
    }
  }
}

const apiKeyManager = new APIKeyManager()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    
    switch (action) {
      case 'generate':
        const { user_id, name, permissions, options } = body
        if (!user_id || !name || !permissions) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const result = await apiKeyManager.generateAPIKey(user_id, name, permissions, options || {})
        return NextResponse.json({ success: true, ...result })
      
      case 'revoke':
        const { key_id, user_id: revokeUserId } = body
        if (!key_id || !revokeUserId) {
          return NextResponse.json({ error: 'Missing key_id or user_id' }, { status: 400 })
        }
        const revoked = await apiKeyManager.revokeAPIKey(key_id, revokeUserId)
        return NextResponse.json({ success: revoked })
      
      case 'update':
        const { key_id: updateKeyId, user_id: updateUserId, updates } = body
        if (!updateKeyId || !updateUserId || !updates) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }
        const updated = await apiKeyManager.updateAPIKey(updateKeyId, updateUserId, updates)
        return NextResponse.json({ success: updated })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('API Key management error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const userId = searchParams.get('user_id')
    const keyId = searchParams.get('key_id')
    
    switch (type) {
      case 'list':
        if (!userId) {
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
        }
        const keys = await apiKeyManager.listAPIKeys(userId)
        return NextResponse.json({ success: true, api_keys: keys })
      
      case 'usage':
        if (!keyId || !userId) {
          return NextResponse.json({ error: 'Missing key_id or user_id' }, { status: 400 })
        }
        const timeframe = (searchParams.get('timeframe') as '24h' | '7d' | '30d') || '7d'
        const usage = await apiKeyManager.getAPIKeyUsage(keyId, userId, timeframe)
        return NextResponse.json({ success: true, usage })
      
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('API Key GET error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}

// Middleware function for API key authentication moved to /lib/api-auth.ts
