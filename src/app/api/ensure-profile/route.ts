import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { ensureUserProfile } from '@/lib/profile-utils'

// Use service role key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

// Only throw error at runtime, not during build
if (!supabaseServiceKey || supabaseServiceKey === 'placeholder-service-key') {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not configured')
}

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log('Ensure profile API called')
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    console.log('User authenticated:', user.id)

    // Ensure user profile exists
    try {
      const result = await ensureUserProfile(user.id, user.email!, user.user_metadata)
      
      return NextResponse.json({
        success: true,
        profileCreated: result.created,
        message: result.created ? 'Profile created successfully' : 'Profile already exists'
      })
    } catch (profileError) {
      console.error('Failed to ensure user profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to create user profile. Please contact support.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Ensure profile API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 