import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

// Use service role key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for auth callback')
}

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    try {
      // Exchange the code for a session
      const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`)
      }

      if (data.user) {
        // Ensure user profile exists after email confirmation
        try {
          const { data: existingProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          if (profileError && profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const { error: insertError } = await supabaseAdmin
              .from('profiles')
              .insert({
                id: data.user.id,
                email: data.user.email!,
                full_name: data.user.user_metadata?.full_name || null,
                role: data.user.user_metadata?.role || 'employee',
                department: data.user.user_metadata?.department || null,
              })

            if (insertError) {
              console.error('Failed to create profile after confirmation:', insertError)
            }
          }
        } catch (profileError) {
          console.error('Profile check/creation error:', profileError)
        }

        // Redirect to confirmation success page
        return NextResponse.redirect(`${origin}/auth/confirmed?next=${encodeURIComponent(next)}`)
      }
    } catch (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`)
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(`${origin}/auth/login?error=no_code_provided`)
} 