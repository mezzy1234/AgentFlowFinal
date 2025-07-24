import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Agent Runtime Worker Class
class AgentRuntimeWorker {
  private workerId: string;
  private isRunning: boolean = false;
  private currentJobs: Map<string, any> = new Map();

  constructor(workerId: string) {
    this.workerId = workerId;
  }

  async start() {
    this.isRunning = true;
    console.log(`Agent Worker ${this.workerId} started`);
    
    // Register worker in database
    await this.registerWorker();
    
    // Start job polling loop
    this.pollForJobs();
    
    // Start heartbeat
    this.startHeartbeat();
  }

  async stop() {
    this.isRunning = false;
    console.log(`Agent Worker ${this.workerId} stopped`);
    
    // Update worker status to offline
    await supabase
      .from('agent_workers')
      .update({ status: 'offline' })
      .eq('id', this.workerId);
  }

  private async registerWorker() {
    await supabase
      .from('agent_workers')
      .upsert({
        id: this.workerId,
        status: 'idle',
        max_concurrent_jobs: 5,
        current_job_count: 0,
        capabilities: {
          integrations: ['slack', 'google', 'stripe', 'webhook'],
          memory_gb: 4,
          max_execution_time: 300
        },
        last_heartbeat: new Date().toISOString()
      });
  }

  private async pollForJobs() {
    while (this.isRunning) {
      try {
        if (this.currentJobs.size < 5) { // Max concurrent jobs
          const jobId = await this.getNextJob();
          if (jobId) {
            this.executeJob(jobId);
          }
        }
        
        // Poll every 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Error polling for jobs:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait longer on error
      }
    }
  }

  private async getNextJob(): Promise<string | null> {
    try {
      const { data } = await supabase.rpc('get_next_queued_job', {
        p_worker_id: this.workerId
      });
      
      return data;
    } catch (error) {
      console.error('Error getting next job:', error);
      return null;
    }
  }

  private async executeJob(jobId: string) {
    try {
      // Get job details
      const { data: job } = await supabase
        .from('agent_execution_queue')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!job) {
        console.error(`Job ${jobId} not found`);
        return;
      }

      console.log(`Executing job ${jobId} for agent ${job.agent_id}`);
      
      // Add to current jobs
      this.currentJobs.set(jobId, job);

      // Log execution start
      await this.logExecution(jobId, 'init', { message: 'Job started' });

      // Execute with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), job.timeout_seconds * 1000);
      });

      const executionPromise = this.runAgentExecution(job);

      try {
        const result = await Promise.race([executionPromise, timeoutPromise]);
        
        // Mark job as completed
        await this.completeJob(jobId, 'completed', result);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage === 'Execution timeout') {
          await this.completeJob(jobId, 'timeout', null, errorMessage);
        } else {
          await this.completeJob(jobId, 'failed', null, errorMessage);
        }
      }

      // Remove from current jobs
      this.currentJobs.delete(jobId);

    } catch (error) {
      console.error(`Error executing job ${jobId}:`, error);
      this.currentJobs.delete(jobId);
    }
  }

  private async runAgentExecution(job: any): Promise<any> {
    // Log running phase
    await this.logExecution(job.id, 'running', { 
      trigger_data: job.trigger_data,
      execution_type: job.execution_type
    });

    // Get agent webhook URL
    const { data: webhook } = await supabase
      .from('agent_webhooks')
      .select('internal_webhook_url, webhook_secret')
      .eq('agent_id', job.agent_id)
      .eq('user_id', job.user_id)
      .single();

    if (!webhook) {
      throw new Error('No webhook configured for this agent');
    }

    // Prepare payload
    const payload = {
      execution_id: job.id,
      agent_id: job.agent_id,
      user_id: job.user_id,
      trigger_data: job.trigger_data,
      execution_type: job.execution_type
    };

    // Log integration call
    await this.logExecution(job.id, 'integration_call', {
      webhook_url: webhook.internal_webhook_url,
      payload_size: JSON.stringify(payload).length
    });

    // Call the actual n8n webhook
    const startTime = Date.now();
    const response = await fetch(webhook.internal_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Secret': webhook.webhook_secret || '',
        'X-Execution-Id': job.id
      },
      body: JSON.stringify(payload)
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`Webhook call failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // Log completion
    await this.logExecution(job.id, 'completed', {
      duration_ms: duration,
      response_status: response.status,
      result_size: JSON.stringify(result).length
    });

    return result;
  }

  private async completeJob(jobId: string, status: string, result: any = null, errorMessage: string | null = null) {
    try {
      await supabase.rpc('complete_agent_job', {
        p_job_id: jobId,
        p_status: status,
        p_result: result,
        p_error_message: errorMessage
      });

      console.log(`Job ${jobId} completed with status: ${status}`);
    } catch (error) {
      console.error(`Error completing job ${jobId}:`, error);
    }
  }

  private async logExecution(jobId: string, phase: string, data: any) {
    try {
      const { data: job } = await supabase
        .from('agent_execution_queue')
        .select('agent_id, user_id')
        .eq('id', jobId)
        .single();

      if (job) {
        await supabase
          .from('agent_execution_history')
          .insert({
            queue_id: jobId,
            agent_id: job.agent_id,
            user_id: job.user_id,
            execution_phase: phase,
            phase_data: data,
            duration_ms: data.duration_ms || null,
            logs: data.logs || []
          });
      }
    } catch (error) {
      console.error('Error logging execution:', error);
    }
  }

  private startHeartbeat() {
    setInterval(async () => {
      if (this.isRunning) {
        try {
          await supabase
            .from('agent_workers')
            .update({ 
              last_heartbeat: new Date().toISOString(),
              current_job_count: this.currentJobs.size
            })
            .eq('id', this.workerId);
        } catch (error) {
          console.error('Heartbeat error:', error);
        }
      }
    }, 30000); // Every 30 seconds
  }
}

// Global worker instance
let globalWorker: AgentRuntimeWorker | null = null;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'queue_status':
        return await getQueueStatus();
      
      case 'execution_logs':
        const agentId = searchParams.get('agent_id');
        const limit = parseInt(searchParams.get('limit') || '50');
        return await getExecutionLogs(agentId, limit);
      
      case 'worker_status':
        return await getWorkerStatus();
      
      case 'rate_limits':
        const userId = searchParams.get('user_id');
        return await getRateLimits(userId);

      case 'schedules':
        return await getSchedules();

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Agent Runtime GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'enqueue_execution':
        return await enqueueExecution(body);
      
      case 'cancel_execution':
        return await cancelExecution(body.executionId);
      
      case 'create_schedule':
        return await createSchedule(body);
      
      case 'update_schedule':
        return await updateSchedule(body);
      
      case 'register_webhook':
        return await registerWebhook(body);
      
      case 'start_worker':
        return await startWorker();
      
      case 'stop_worker':
        return await stopWorker();

      case 'retry_failed_job':
        return await retryFailedJob(body.jobId);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Agent Runtime POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Implementation functions
async function getQueueStatus() {
  const { data: queueStats } = await supabase
    .from('agent_execution_queue')
    .select('status')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const stats = {
    queued: queueStats?.filter(q => q.status === 'queued').length || 0,
    running: queueStats?.filter(q => q.status === 'running').length || 0,
    completed: queueStats?.filter(q => q.status === 'completed').length || 0,
    failed: queueStats?.filter(q => q.status === 'failed').length || 0,
    total: queueStats?.length || 0
  };

  return NextResponse.json({ queue_stats: stats });
}

async function getExecutionLogs(agentId: string | null, limit: number) {
  let query = supabase
    .from('agent_execution_history')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data: logs } = await query;
  return NextResponse.json({ execution_logs: logs || [] });
}

async function getWorkerStatus() {
  const { data: workers } = await supabase
    .from('agent_workers')
    .select('*')
    .order('last_heartbeat', { ascending: false });

  return NextResponse.json({ workers: workers || [] });
}

async function getRateLimits(userId: string | null) {
  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  const { data: limits } = await supabase
    .from('agent_rate_limits')
    .select('*')
    .eq('user_id', userId);

  return NextResponse.json({ rate_limits: limits || [] });
}

async function getSchedules() {
  const { data: schedules } = await supabase
    .from('agent_schedules')
    .select('*')
    .order('next_run', { ascending: true });

  return NextResponse.json({ schedules: schedules || [] });
}

async function enqueueExecution(data: any) {
  const { agent_id, user_id, execution_type, trigger_data, priority, scheduled_for } = data;

  try {
    const { data: queueId } = await supabase.rpc('enqueue_agent_execution', {
      p_agent_id: agent_id,
      p_user_id: user_id,
      p_execution_type: execution_type,
      p_trigger_data: trigger_data || {},
      p_scheduled_for: scheduled_for || new Date().toISOString(),
      p_priority: priority || 5
    });

    return NextResponse.json({ 
      success: true, 
      execution_id: queueId,
      message: 'Agent execution queued successfully'
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to queue execution' 
    }, { status: 400 });
  }
}

async function cancelExecution(executionId: string) {
  const { error } = await supabase
    .from('agent_execution_queue')
    .update({ 
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      error_message: 'Cancelled by user'
    })
    .eq('id', executionId)
    .in('status', ['queued', 'running']);

  if (error) {
    return NextResponse.json({ error: 'Failed to cancel execution' }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'Execution cancelled' });
}

async function createSchedule(data: any) {
  const { agent_id, user_id, schedule_name, cron_expression, timezone } = data;

  // Calculate next run time
  const { data: nextRun } = await supabase.rpc('calculate_next_cron_run', {
    cron_expr: cron_expression,
    tz: timezone || 'UTC'
  });

  const { data: schedule, error } = await supabase
    .from('agent_schedules')
    .insert({
      agent_id,
      user_id,
      schedule_name,
      cron_expression,
      timezone: timezone || 'UTC',
      next_run: nextRun
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 400 });
  }

  return NextResponse.json({ success: true, schedule });
}

async function updateSchedule(data: any) {
  const { schedule_id, ...updates } = data;

  // Recalculate next run if cron expression changed
  if (updates.cron_expression) {
    const { data: nextRun } = await supabase.rpc('calculate_next_cron_run', {
      cron_expr: updates.cron_expression,
      tz: updates.timezone || 'UTC'
    });
    updates.next_run = nextRun;
  }

  const { error } = await supabase
    .from('agent_schedules')
    .update(updates)
    .eq('id', schedule_id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'Schedule updated' });
}

async function registerWebhook(data: any) {
  const { agent_id, user_id, internal_webhook_url, supported_methods } = data;

  // Generate public webhook URL
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/${agent_id}`;
  const webhookSecret = generateWebhookSecret();

  const { data: webhook, error } = await supabase
    .from('agent_webhooks')
    .insert({
      agent_id,
      user_id,
      webhook_url: webhookUrl,
      internal_webhook_url,
      webhook_secret: webhookSecret,
      supported_methods: supported_methods || ['POST']
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to register webhook' }, { status: 400 });
  }

  return NextResponse.json({ success: true, webhook });
}

async function startWorker() {
  if (!globalWorker) {
    const workerId = `worker-${process.env.HOSTNAME || 'local'}-${Date.now()}`;
    globalWorker = new AgentRuntimeWorker(workerId);
    await globalWorker.start();
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Worker started',
    worker_id: globalWorker ? (globalWorker as any).workerId : null
  });
}

async function stopWorker() {
  if (globalWorker) {
    await globalWorker.stop();
    globalWorker = null;
  }

  return NextResponse.json({ success: true, message: 'Worker stopped' });
}

async function retryFailedJob(jobId: string) {
  const { error } = await supabase
    .from('agent_execution_queue')
    .update({
      status: 'queued',
      scheduled_for: new Date().toISOString(),
      retry_count: 0,
      error_message: null
    })
    .eq('id', jobId)
    .eq('status', 'failed');

  if (error) {
    return NextResponse.json({ error: 'Failed to retry job' }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'Job queued for retry' });
}

// Utility functions
function generateWebhookSecret(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
}

// Auto-start worker in production
if (process.env.NODE_ENV === 'production' && !globalWorker) {
  startWorker().catch(console.error);
}
