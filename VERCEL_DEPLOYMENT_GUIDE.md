# Vercel Deployment Guide

## Overview
Your project has been successfully configured for Vercel deployment. The build errors have been resolved by adding fallback values for environment variables during the build process.

## Required Environment Variables

To make your application fully functional, you need to configure the following environment variables in your Vercel dashboard:

### 1. Supabase Configuration (Required)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Google Cloud Vision API (Optional - for OCR functionality)
```
GOOGLE_CLOUD_PROJECT_ID=your_google_cloud_project_id
GOOGLE_CLOUD_PRIVATE_KEY=your_google_cloud_private_key
GOOGLE_CLOUD_CLIENT_EMAIL=your_google_cloud_client_email
```

### 3. Cron Job Security (Optional)
```
CRON_SECRET=your_cron_secret_key
```

## How to Add Environment Variables in Vercel

1. **Go to your Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Navigate to your project

2. **Access Environment Variables**
   - Click on your project
   - Go to "Settings" tab
   - Click on "Environment Variables" in the sidebar

3. **Add Each Variable**
   - Click "Add New"
   - Enter the variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Enter the variable value
   - Select the environments (Production, Preview, Development)
   - Click "Save"

4. **Redeploy Your Application**
   - After adding all environment variables
   - Go to the "Deployments" tab
   - Click "Redeploy" on the latest deployment
   - Or push a new commit to trigger automatic redeployment

## Getting Your Supabase Credentials

1. **Visit your Supabase Dashboard**
   - Go to [supabase.com](https://supabase.com)
   - Navigate to your project

2. **Get the URL and Keys**
   - Go to Settings → API
   - Copy the "Project URL" for `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the "anon public" key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy the "service_role secret" key for `SUPABASE_SERVICE_ROLE_KEY`

## Troubleshooting

### Build Errors
- The project now includes fallback values to prevent build failures
- If you still see build errors, check the Vercel build logs

### Runtime Errors
- If the app loads but features don't work, check that environment variables are properly configured
- Open browser developer tools to check for console errors
- Verify Supabase credentials are correct

### Database Issues
- Ensure your Supabase database is properly set up
- Check that the required tables exist (receipts, profiles, etc.)
- Verify RLS (Row Level Security) policies are configured

## Files Modified

The following files were updated to fix the deployment issues:

1. **`next.config.js`** - Removed deprecated `appDir` config and added environment variable handling
2. **`vercel.json`** - Added Vercel-specific configuration
3. **`src/lib/supabase.ts`** - Added fallback values for environment variables
4. **`src/lib/profile-utils.ts`** - Added fallback values for environment variables
5. **`src/app/api/ensure-profile/route.ts`** - Updated error handling for missing environment variables
6. **`src/app/api/receipts/archived/route.ts`** - Added fallback values
7. **`.env.example`** - Created example environment file

## Next Steps

1. Configure environment variables in Vercel dashboard
2. Redeploy your application
3. Test the functionality
4. Set up your Supabase database if not already done
5. Configure Google Cloud Vision API if you want OCR functionality

Your application should now deploy successfully to Vercel! 