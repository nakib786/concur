# 🚨 Fix Signup Issues - Database Setup Required

## Problems You're Experiencing
1. **HTTP 429 (Rate Limiting)**: Too many signup attempts to Supabase
2. **HTTP 403 (Forbidden)**: Database permissions preventing profile creation

## 🛠️ COMPLETE FIX

### Step 1: Run Database Setup SQL

1. **Go to Supabase Dashboard**
   - Open [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Run the SQL**
   - Open the file `setup-database-rls.sql` in your project
   - Copy the ENTIRE contents
   - Paste into Supabase SQL Editor
   - Click "Run" button

### Step 2: Wait for Rate Limit Reset

The 429 errors are from Supabase rate limiting. You need to:
- **Wait 10-15 minutes** before trying to sign up again
- The rate limit will reset automatically

### Step 3: Test Signup

After running the SQL and waiting:
1. Try creating a new account with a **different email address**
2. The signup should now work properly
3. Profile will be created automatically

## 🎯 What the SQL Fix Does

### Database Permissions (RLS Policies)
- ✅ Allows users to create their own profiles during signup
- ✅ Allows users to view/edit their own data
- ✅ Allows admins to manage all data
- ✅ Prevents unauthorized access

### Automatic Profile Creation
- ✅ Creates a database trigger that automatically creates user profiles
- ✅ No more manual profile creation needed
- ✅ Uses user metadata from signup form

### Database Schema Updates
- ✅ Adds missing approval fields to receipts table
- ✅ Fixes status constraints
- ✅ Updates any old 'processed' receipts to 'approved'

## 🚨 Important Notes

### Rate Limiting
- Supabase limits signup attempts to prevent abuse
- If you see 429 errors, **wait 10-15 minutes**
- Don't keep trying repeatedly - it makes the lockout longer

### Email Confirmation
- Check if your Supabase project requires email confirmation
- If enabled, users must click the confirmation link before accessing the app

### Testing
- Use different email addresses for testing
- Clear browser cache if you have issues
- Check browser console for detailed error messages

## ✅ Verification Steps

After running the SQL:

1. **Check Database Tables**
   - Go to Table Editor in Supabase
   - Verify `profiles` table has proper RLS policies
   - Check that approval fields exist in `receipts` table

2. **Test Signup Flow**
   - Wait for rate limit to reset (10-15 minutes)
   - Try signing up with a new email
   - Should redirect to dashboard successfully

3. **Test Login**
   - Try logging in with the new account
   - Should work without profile creation errors

## 🔧 If You Still Have Issues

### Check Environment Variables
Make sure these are set in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Check Supabase Settings
1. **Authentication Settings**
   - Go to Authentication > Settings
   - Check if email confirmation is required
   - Verify signup is enabled

2. **Database Policies**
   - Go to Authentication > Policies
   - Should see the RLS policies created by the SQL

### Browser Console Errors
- Open browser DevTools (F12)
- Check Console tab for detailed error messages
- Look for specific error codes and messages

## 📞 Quick Troubleshooting

**Still getting 403 errors?**
- The SQL script didn't run properly
- Check Supabase logs for SQL execution errors
- Verify your service role key is correct

**Still getting 429 errors?**
- Wait longer (up to 30 minutes)
- Try from a different network/device
- Use a different email address

**Profile not created?**
- Check if the database trigger was created
- Verify the `handle_new_user()` function exists
- Check Supabase logs for trigger execution

## 🎉 Expected Result

After the fix:
1. ✅ Signup works without errors
2. ✅ User profiles are created automatically  
3. ✅ Users can access dashboard immediately
4. ✅ Camera functionality works on mobile
5. ✅ All existing features continue to work

The system will be fully functional for client signups and expense management! 