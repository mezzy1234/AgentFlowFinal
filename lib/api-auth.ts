import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function authenticateAPIKey(request: NextRequest): Promise<{ 
  valid: boolean; 
  keyId?: string; 
  userId?: string; 
  error?: string 
}> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'Missing or invalid authorization header' };
    }
    
    const apiKey = authHeader.substring(7);
    
    if (!apiKey || !apiKey.startsWith('ak_')) {
      return { valid: false, error: 'Invalid API key format' };
    }
    
    // Extract prefix and hash the full key
    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    
    // Find the API key in the database
    const { data: keyData, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('status', 'active')
      .single();
    
    if (error || !keyData) {
      return { valid: false, error: 'Invalid API key' };
    }
    
    // Check if key is expired
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return { valid: false, error: 'API key expired' };
    }
    
    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id);
    
    return {
      valid: true,
      keyId: keyData.id,
      userId: keyData.user_id
    };
    
  } catch (error) {
    console.error('API key authentication error:', error);
    return { 
      valid: false, 
      error: 'Authentication service error' 
    };
  }
}

export async function checkRateLimit(keyId: string, endpoint: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: Date;
}> {
  try {
    // Get rate limit configuration for this key
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('rate_limits')
      .eq('id', keyId)
      .single();
    
    if (!keyData) {
      return { allowed: false, remaining: 0, resetTime: new Date() };
    }
    
    const rateLimits = keyData.rate_limits;
    const endpointLimit = rateLimits.endpoints?.[endpoint] || rateLimits.default;
    
    // Check current usage
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - 1); // 1 hour window
    
    const { data: usageData, error } = await supabase
      .from('api_usage_logs')
      .select('*')
      .eq('api_key_id', keyId)
      .eq('endpoint', endpoint)
      .gte('timestamp', windowStart.toISOString());
    
    if (error) {
      console.error('Rate limit check error:', error);
      return { allowed: false, remaining: 0, resetTime: new Date() };
    }
    
    const currentUsage = usageData?.length || 0;
    const remaining = Math.max(0, endpointLimit - currentUsage);
    const resetTime = new Date();
    resetTime.setHours(resetTime.getHours() + 1);
    
    return {
      allowed: currentUsage < endpointLimit,
      remaining,
      resetTime
    };
    
  } catch (error) {
    console.error('Rate limit service error:', error);
    return { allowed: false, remaining: 0, resetTime: new Date() };
  }
}

export async function logAPIUsage(keyId: string, endpoint: string, success: boolean, responseTime: number): Promise<void> {
  try {
    await supabase
      .from('api_usage_logs')
      .insert({
        api_key_id: keyId,
        endpoint,
        timestamp: new Date().toISOString(),
        success,
        response_time: responseTime,
        ip_address: '', // Would get from request in actual implementation
        user_agent: '' // Would get from request in actual implementation
      });
  } catch (error) {
    console.error('API usage logging error:', error);
  }
}
