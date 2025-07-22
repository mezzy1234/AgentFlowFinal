import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'
import { createClient } from '@supabase/supabase-js'

export async function createAuthenticatedSupabaseClient() {
  // Use the direct client approach for now
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  return supabase
}

export async function getAuthenticatedUser() {
  const supabase = await createAuthenticatedSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  return user
}

export async function getUserProfile(userId: string) {
  const supabase = await createAuthenticatedSupabaseClient()
  
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error('User profile not found')
  }

  return profile
}

export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { error: message },
    { status }
  )
}

export function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status })
}

export async function requireDeveloperRole(userId: string) {
  const profile = await getUserProfile(userId)
  
  if (profile.role !== 'developer') {
    throw new Error('Developer role required')
  }
  
  return profile
}

export async function requireActiveSubscription(userId: string) {
  const profile = await getUserProfile(userId)
  
  if (!profile.subscription_active) {
    throw new Error('Active subscription required')
  }
  
  return profile
}
