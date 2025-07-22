// Enhanced security utilities and audit logging for AgentFlow.AI
// Provides encryption, rate limiting, audit trails, and security monitoring

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SecurityEvent {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs?: number;
}

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export class SecurityManager {
  private static instance: SecurityManager;
  private rateLimitStore = new Map<string, { count: number; resetTime: number; blocked?: number }>();
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  }

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Log security events for audit trail
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: event.userId,
          action: event.action,
          resource_type: event.resourceType,
          resource_id: event.resourceId,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          session_id: event.sessionId,
          old_values: null,
          new_values: {
            riskLevel: event.riskLevel,
            metadata: event.metadata
          }
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }

      // Alert on high-risk events
      if (event.riskLevel === 'high' || event.riskLevel === 'critical') {
        await this.createSecurityAlert(event);
      }

    } catch (error) {
      console.error('Security event logging error:', error);
    }
  }

  /**
   * Check rate limits for user actions
   */
  checkRateLimit(identifier: string, config: RateLimitConfig): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const key = `${identifier}:${config.windowMs}`;
    const existing = this.rateLimitStore.get(key);

    // Check if blocked
    if (existing?.blocked && existing.blocked > now) {
      return {
        allowed: false,
        retryAfter: Math.ceil((existing.blocked - now) / 1000)
      };
    }

    // Reset window if expired
    if (!existing || existing.resetTime <= now) {
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return { allowed: true };
    }

    // Check limit
    if (existing.count >= config.maxRequests) {
      // Block if configured
      if (config.blockDurationMs) {
        this.rateLimitStore.set(key, {
          ...existing,
          blocked: now + config.blockDurationMs
        });
      }

      return {
        allowed: false,
        retryAfter: Math.ceil((existing.resetTime - now) / 1000)
      };
    }

    // Increment count
    this.rateLimitStore.set(key, {
      ...existing,
      count: existing.count + 1
    });

    return { allowed: true };
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: string): EncryptionResult {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', Buffer.from(this.encryptionKey, 'hex'));
    cipher.setAAD(Buffer.from('AgentFlow-Security', 'utf8'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipher('aes-256-gcm', Buffer.from(this.encryptionKey, 'hex'));
    decipher.setAAD(Buffer.from('AgentFlow-Security', 'utf8'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Validate session security
   */
  async validateSession(sessionId: string, userId: string, ipAddress: string): Promise<{
    valid: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    try {
      // Check for suspicious activity patterns
      const recentLogs = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (recentLogs.data) {
        // Check for multiple IP addresses
        const uniqueIPs = new Set(recentLogs.data.map(log => log.ip_address).filter(Boolean));
        if (uniqueIPs.size > 5) {
          warnings.push('Multiple IP addresses detected');
          riskLevel = 'medium';
        }

        // Check for rapid successive actions
        const rapidActions = recentLogs.data.filter(log => 
          new Date(log.created_at).getTime() > Date.now() - 5 * 60 * 1000
        );
        if (rapidActions.length > 20) {
          warnings.push('High activity rate detected');
          riskLevel = 'high';
        }

        // Check for failed authentication attempts
        const failedAuth = recentLogs.data.filter(log => 
          log.action.includes('auth') && log.new_values?.success === false
        );
        if (failedAuth.length > 5) {
          warnings.push('Multiple authentication failures');
          riskLevel = 'high';
        }
      }

      // Log session validation
      await this.logSecurityEvent({
        userId,
        action: 'session_validated',
        resourceType: 'session',
        resourceId: sessionId,
        ipAddress,
        riskLevel,
        metadata: { warnings, validationTime: new Date().toISOString() }
      });

      return {
        valid: riskLevel !== 'high',
        riskLevel,
        warnings
      };

    } catch (error) {
      console.error('Session validation error:', error);
      return {
        valid: false,
        riskLevel: 'high',
        warnings: ['Session validation failed']
      };
    }
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[<>'"]/g, (match) => { // Escape HTML characters
        const map: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;'
        };
        return map[match] || match;
      })
      .trim();
  }

  /**
   * Generate secure API keys
   */
  generateApiKey(userId: string, purpose: string): {
    keyId: string;
    publicKey: string;
    secretKey: string;
    hashedSecret: string;
  } {
    const keyId = `ak_${crypto.randomBytes(8).toString('hex')}`;
    const publicKey = `${keyId}_${crypto.randomBytes(16).toString('hex')}`;
    const secretKey = crypto.randomBytes(32).toString('hex');
    const hashedSecret = crypto.createHash('sha256').update(secretKey).digest('hex');

    // Log key generation
    this.logSecurityEvent({
      userId,
      action: 'api_key_generated',
      resourceType: 'api_key',
      resourceId: keyId,
      riskLevel: 'low',
      metadata: { purpose, generatedAt: new Date().toISOString() }
    });

    return {
      keyId,
      publicKey,
      secretKey,
      hashedSecret
    };
  }

  /**
   * Validate API key
   */
  async validateApiKey(providedKey: string): Promise<{
    valid: boolean;
    userId?: string;
    keyId?: string;
    rateLimit?: RateLimitConfig;
  }> {
    try {
      const [keyId, secret] = providedKey.split('_').slice(1); // Remove 'ak_' prefix
      
      if (!keyId || !secret) {
        await this.logSecurityEvent({
          action: 'api_key_validation_failed',
          resourceType: 'api_key',
          riskLevel: 'medium',
          metadata: { reason: 'invalid_format' }
        });
        return { valid: false };
      }

      // Get key from database (this would be a new table)
      const { data: keyData } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_id', `ak_${keyId}`)
        .eq('is_active', true)
        .single();

      if (!keyData) {
        await this.logSecurityEvent({
          action: 'api_key_validation_failed',
          resourceType: 'api_key',
          resourceId: `ak_${keyId}`,
          riskLevel: 'medium',
          metadata: { reason: 'key_not_found' }
        });
        return { valid: false };
      }

      // Validate secret
      const providedHash = crypto.createHash('sha256').update(secret).digest('hex');
      if (providedHash !== keyData.secret_hash) {
        await this.logSecurityEvent({
          userId: keyData.user_id,
          action: 'api_key_validation_failed',
          resourceType: 'api_key',
          resourceId: keyData.key_id,
          riskLevel: 'high',
          metadata: { reason: 'invalid_secret' }
        });
        return { valid: false };
      }

      // Update last used
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyData.id);

      return {
        valid: true,
        userId: keyData.user_id,
        keyId: keyData.key_id,
        rateLimit: keyData.rate_limit
      };

    } catch (error) {
      console.error('API key validation error:', error);
      return { valid: false };
    }
  }

  /**
   * Create security alert for high-risk events
   */
  private async createSecurityAlert(event: SecurityEvent): Promise<void> {
    try {
      const alertId = crypto.randomBytes(16).toString('hex');
      
      // Create security alert notification
      if (event.userId) {
        await supabase
          .from('notifications')
          .insert({
            user_id: event.userId,
            title: 'Security Alert',
            message: `Suspicious activity detected: ${event.action}`,
            type: 'security',
            priority: event.riskLevel === 'critical' ? 'high' : 'medium',
            metadata: {
              alertId,
              event: event.action,
              riskLevel: event.riskLevel,
              timestamp: new Date().toISOString()
            }
          });
      }

      // For critical events, could trigger additional actions like:
      // - Email notifications to admins
      // - Temporary account restrictions
      // - Enhanced monitoring
      
      console.warn('Security Alert:', {
        alertId,
        event: event.action,
        riskLevel: event.riskLevel,
        userId: event.userId
      });

    } catch (error) {
      console.error('Failed to create security alert:', error);
    }
  }

  /**
   * Clean expired rate limit entries
   */
  cleanupRateLimits(): void {
    const now = Date.now();
    for (const [key, data] of this.rateLimitStore.entries()) {
      if (data.resetTime <= now && (!data.blocked || data.blocked <= now)) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Get security metrics for monitoring
   */
  async getSecurityMetrics(timeRangeHours: number = 24): Promise<{
    totalEvents: number;
    highRiskEvents: number;
    uniqueUsers: number;
    topActions: Array<{ action: string; count: number }>;
    riskDistribution: Record<string, number>;
  }> {
    try {
      const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString();
      
      const { data: events } = await supabase
        .from('audit_logs')
        .select('*')
        .gte('created_at', since);

      if (!events) {
        return {
          totalEvents: 0,
          highRiskEvents: 0,
          uniqueUsers: 0,
          topActions: [],
          riskDistribution: {}
        };
      }

      const uniqueUsers = new Set(events.map(e => e.user_id).filter(Boolean)).size;
      const highRiskEvents = events.filter(e => 
        e.new_values?.riskLevel === 'high' || e.new_values?.riskLevel === 'critical'
      ).length;

      // Action frequency
      const actionCounts = new Map<string, number>();
      events.forEach(e => {
        actionCounts.set(e.action, (actionCounts.get(e.action) || 0) + 1);
      });

      const topActions = Array.from(actionCounts.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Risk distribution
      const riskDistribution: Record<string, number> = {};
      events.forEach(e => {
        const risk = e.new_values?.riskLevel || 'unknown';
        riskDistribution[risk] = (riskDistribution[risk] || 0) + 1;
      });

      return {
        totalEvents: events.length,
        highRiskEvents,
        uniqueUsers,
        topActions,
        riskDistribution
      };

    } catch (error) {
      console.error('Failed to get security metrics:', error);
      return {
        totalEvents: 0,
        highRiskEvents: 0,
        uniqueUsers: 0,
        topActions: [],
        riskDistribution: {}
      };
    }
  }
}

// Rate limiting configurations for different endpoints
export const RATE_LIMITS = {
  API_GENERAL: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
  API_SENSITIVE: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 requests per minute
  AGENT_EXECUTION: { windowMs: 60 * 1000, maxRequests: 50 }, // 50 executions per minute
  PURCHASE: { windowMs: 60 * 1000, maxRequests: 5, blockDurationMs: 5 * 60 * 1000 }, // 5 purchases per minute, 5min block
  LOGIN_ATTEMPT: { windowMs: 15 * 60 * 1000, maxRequests: 5, blockDurationMs: 30 * 60 * 1000 }, // 5 attempts per 15 minutes, 30min block
};

// Export singleton instance
export const securityManager = SecurityManager.getInstance();
