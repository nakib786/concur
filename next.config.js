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
  },
  // Increase body size limit for file uploads
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // API route configuration
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}

module.exports = nextConfig 