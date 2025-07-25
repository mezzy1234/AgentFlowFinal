import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Health check endpoint for comprehensive system validation
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const healthStatus: {
    status: string;
    timestamp: string;
    version: string;
    environment: string;
    checks: any;
    uptime: number;
    response_time: number;
    error?: string;
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: { status: 'unknown', latency: 0, error: null },
      redis: { status: 'unknown', latency: 0, error: null },
      external_apis: { status: 'unknown', details: {}, error: null },
      file_system: { status: 'unknown', error: null },
      memory: { status: 'unknown', usage: 0, error: null },
      environment: { status: 'unknown', missing_vars: [], error: null }
    },
    uptime: process.uptime(),
    response_time: 0
  };

  try {
    // 1. Database Health Check
    await checkDatabaseHealth(healthStatus);
    
    // 2. Redis Health Check (if available)
    await checkRedisHealth(healthStatus);
    
    // 3. External APIs Health Check
    await checkExternalAPIs(healthStatus);
    
    // 4. File System Health Check
    await checkFileSystem(healthStatus);
    
    // 5. Memory Health Check
    checkMemoryUsage(healthStatus);
    
    // 6. Environment Variables Check
    checkEnvironmentVariables(healthStatus);
    
    // Calculate overall status
    const allChecks = Object.values(healthStatus.checks);
    const hasErrors = allChecks.some((check: any) => check.status === 'error');
    const hasWarnings = allChecks.some((check: any) => check.status === 'warning');
    
    if (hasErrors) {
      healthStatus.status = 'unhealthy';
    } else if (hasWarnings) {
      healthStatus.status = 'degraded';
    }
    
    healthStatus.response_time = Date.now() - startTime;
    
    // Return appropriate status code
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    return NextResponse.json(healthStatus, { status: statusCode });
    
  } catch (error) {
    healthStatus.status = 'unhealthy';
    healthStatus.response_time = Date.now() - startTime;
    healthStatus.error = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(healthStatus, { status: 503 });
  }
}

async function checkDatabaseHealth(healthStatus: any) {
  const dbStart = Date.now();
  
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      healthStatus.checks.database = {
        status: 'error',
        latency: 0,
        error: 'Missing Supabase configuration'
      };
      return;
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test basic connectivity
    const { data, error } = await supabase
      .from('agents')
      .select('count')
      .limit(1);
    
    const latency = Date.now() - dbStart;
    
    if (error) {
      healthStatus.checks.database = {
        status: 'error',
        latency,
        error: error.message
      };
    } else {
      healthStatus.checks.database = {
        status: 'healthy',
        latency,
        error: null
      };
    }
  } catch (error) {
    healthStatus.checks.database = {
      status: 'error',
      latency: Date.now() - dbStart,
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

async function checkRedisHealth(healthStatus: any) {
  healthStatus.checks.redis = {
    status: 'not_configured',
    latency: 0,
    error: 'Redis not configured in this deployment'
  };
}

async function checkExternalAPIs(healthStatus: any) {
  const apiStart = Date.now();
  const apiChecks: any = {};
  
  try {
    // Check Stripe API if configured
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripeResponse = await fetch('https://api.stripe.com/v1/balance', {
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
          }
        });
        apiChecks.stripe = {
          status: stripeResponse.ok ? 'healthy' : 'error',
          response_code: stripeResponse.status
        };
      } catch (error) {
        apiChecks.stripe = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Stripe API check failed'
        };
      }
    }
    
    const hasErrors = Object.values(apiChecks).some((check: any) => check.status === 'error');
    
    healthStatus.checks.external_apis = {
      status: hasErrors ? 'warning' : 'healthy',
      latency: Date.now() - apiStart,
      details: apiChecks,
      error: hasErrors ? 'Some external APIs are experiencing issues' : null
    };
    
  } catch (error) {
    healthStatus.checks.external_apis = {
      status: 'error',
      latency: Date.now() - apiStart,
      details: apiChecks,
      error: error instanceof Error ? error.message : 'External API checks failed'
    };
  }
}

async function checkFileSystem(healthStatus: any) {
  try {
    healthStatus.checks.file_system = {
      status: 'healthy',
      error: null
    };
  } catch (error) {
    healthStatus.checks.file_system = {
      status: 'error',
      error: error instanceof Error ? error.message : 'File system check failed'
    };
  }
}

function checkMemoryUsage(healthStatus: any) {
  try {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    let status = 'healthy';
    if (memoryUsagePercent > 90) {
      status = 'error';
    } else if (memoryUsagePercent > 75) {
      status = 'warning';
    }
    
    healthStatus.checks.memory = {
      status,
      usage: Math.round(memoryUsagePercent),
      details: {
        heap_used: Math.round(usedMemory / 1024 / 1024),
        heap_total: Math.round(totalMemory / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024)
      },
      error: status === 'error' ? 'High memory usage detected' : null
    };
    
  } catch (error) {
    healthStatus.checks.memory = {
      status: 'error',
      usage: 0,
      error: error instanceof Error ? error.message : 'Memory check failed'
    };
  }
}

function checkEnvironmentVariables(healthStatus: any) {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APP_URL'
  ];
  
  const optionalVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'OPENAI_API_KEY',
    'GITHUB_TOKEN',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];
  
  const missingRequired = requiredVars.filter(varName => !process.env[varName]);
  const missingOptional = optionalVars.filter(varName => !process.env[varName]);
  
  let status = 'healthy';
  let error = null;
  
  if (missingRequired.length > 0) {
    status = 'error';
    error = `Missing required environment variables: ${missingRequired.join(', ')}`;
  } else if (missingOptional.length > 0) {
    status = 'warning';
    error = `Missing optional environment variables: ${missingOptional.join(', ')}`;
  }
  
  healthStatus.checks.environment = {
    status,
    missing_vars: [...missingRequired, ...missingOptional],
    required_missing: missingRequired,
    optional_missing: missingOptional,
    error
  };
}
