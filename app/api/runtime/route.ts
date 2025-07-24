import { NextRequest, NextResponse } from 'next/server'
import { SimpleRuntimeManager } from '@/lib/runtime/simple-manager'

export async function GET() {
  try {
    const runtimeManager = new SimpleRuntimeManager(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const runtimes = await runtimeManager.getRuntimes()
    return NextResponse.json({ runtimes })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch runtimes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { runtimeName, memoryMb } = await request.json()
    
    const runtimeManager = new SimpleRuntimeManager(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const runtime = await runtimeManager.createRuntime(runtimeName, memoryMb)
    return NextResponse.json({ runtime })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Failed to create runtime' }, { status: 500 })
  }
}
