/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['hfcceorwztdeqbopepse.supabase.co'],
  },
  // Handle missing environment variables during build
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  }
}

module.exports = nextConfig 