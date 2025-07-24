import { NextRequest, NextResponse } from 'next/server'
import { SimpleRuntimeManager } from '@/lib/runtime/simple-manager'

export async function GET() {
  try {
    const runtimeManager = new SimpleRuntimeManager(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const metrics = await runtimeManager.getRuntimeMetrics()
    return NextResponse.json({ metrics })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}
