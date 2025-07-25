import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

export async function ensureUserProfile(userId: string, userEmail: string, userMetadata?: any) {
  try {
    // Check if profile exists
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking profile:', profileError)
      throw new Error(`Failed to check user profile: ${profileError.message}`)
    }

    if (!profile) {
      console.log('Creating profile for user:', userId)
      
      // Create profile
      const { error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: userEmail,
          full_name: userMetadata?.full_name || null,
          role: (userMetadata?.role as 'employee' | 'manager' | 'admin') || 'employee',
          department: userMetadata?.department || null,
        })

      if (createError) {
        console.error('Failed to create profile:', createError)
        throw new Error(`Failed to create user profile: ${createError.message}`)
      }
      
      console.log('Profile created successfully for user:', userId)
      return { created: true }
    }

    console.log('Profile already exists for user:', userId)
    return { created: false }
    
  } catch (error) {
    console.error('Error in ensureUserProfile:', error)
    throw error
  }
} 