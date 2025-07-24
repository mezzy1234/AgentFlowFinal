import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth error:', error)
        return NextResponse.redirect(`${requestUrl.origin}/signup?error=auth_failed`)
      }

      if (data.user) {
        // Create or update user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
            avatar_url: data.user.user_metadata?.avatar_url,
            provider: data.user.app_metadata?.provider,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
        }

        // Initialize developer settings
        const { error: devError } = await supabase
          .from('developer_settings')
          .upsert({
            user_id: data.user.id,
            plan: 'starter',
            agents_created: 0,
            monthly_interactions: 0,
            revenue_earned: 0,
            created_at: new Date().toISOString(),
          })

        if (devError) {
          console.error('Developer settings error:', devError)
        }

        // Check if it's a new user for welcome flow
        const isNewUser = data.user.created_at === data.user.last_sign_in_at
        
        if (isNewUser) {
          return NextResponse.redirect(`${requestUrl.origin}/dashboard?welcome=true&setup=true`)
        } else {
          return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
        }
      }
    } catch (err) {
      console.error('Unexpected auth error:', err)
      return NextResponse.redirect(`${requestUrl.origin}/signup?error=unexpected`)
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/signup?error=no_code`)
}
