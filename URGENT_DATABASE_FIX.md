# 🚨 URGENT: Database Constraint Fix Required

## Problem
Your database has a check constraint `receipts_status_check` that only allows these status values:
- `pending`
- `processed` 
- `error`

But the approval system needs these values:
- `pending`
- `approved`
- `rejected`
- `error`

## Current Database Status
- ✅ Has columns: `id`, `user_id`, `file_url`, `file_name`, `vendor_name`, `amount`, `date`, `category`, `description`, `ocr_data`, `status`, `created_at`, `updated_at`, `archived_at`
- ❌ Missing columns: `approved_by`, `approved_at`, `rejection_reason`
- ❌ Status constraint only allows: `pending`, `processed`, `error`
- 📊 Current data has status values: `processed`, `pending`

## 🛠️ COMPLETE FIX (Run this SQL in Supabase SQL Editor)

Copy and paste this entire SQL block into your Supabase SQL Editor and run it:

```sql
-- Step 1: Drop the existing constraint
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_status_check;

-- Step 2: Add the new constraint with updated values (including both old and new)
ALTER TABLE receipts ADD CONSTRAINT receipts_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'error', 'processed'));

-- Step 3: Add the missing approval columns
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Step 4: Update any existing "processed" status to "approved"
UPDATE receipts SET status = 'approved' WHERE status = 'processed';

-- Step 5: Update the constraint to final values (remove "processed")
ALTER TABLE receipts DROP CONSTRAINT receipts_status_check;
ALTER TABLE receipts ADD CONSTRAINT receipts_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'error'));
```

## 🎯 Quick Steps

1. **Go to Supabase Dashboard**
   - Open [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the SQL**
   - Copy the entire SQL block above
   - Paste it into the editor
   - Click "Run" button

4. **Restart Development Server**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

## ✅ Verification

After running the SQL, verify it worked:

1. **Check Table Structure**
   - Go to Table Editor → receipts
   - Should see new columns: `approved_by`, `approved_at`, `rejection_reason`

2. **Check Status Values**
   - Any `processed` receipts should now be `approved`
   - New uploads will be `pending`

3. **Test Approval Workflow**
   - Access `/receipts/pending` as admin
   - Try approving/rejecting receipts
   - Should work without errors

## 🔧 Alternative: Manual Steps

If the SQL block doesn't work, do these steps individually:

### Step 1: Remove Constraint
```sql
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_status_check;
```

### Step 2: Add Columns
```sql
ALTER TABLE receipts 
ADD COLUMN approved_by UUID REFERENCES profiles(id),
ADD COLUMN approved_at TIMESTAMPTZ,
ADD COLUMN rejection_reason TEXT;
```

### Step 3: Update Data
```sql
UPDATE receipts SET status = 'approved' WHERE status = 'processed';
```

### Step 4: Add New Constraint
```sql
ALTER TABLE receipts ADD CONSTRAINT receipts_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'error'));
```

## 🚨 Important Notes

- **Backup First**: Consider backing up your data before running migrations
- **All at Once**: Run all SQL statements together for best results
- **Restart Required**: Must restart `npm run dev` after database changes
- **Admin Role**: Make sure your user profile has `role = 'admin'` to access approval features

## 📞 If You Still Have Issues

1. Check Supabase logs for detailed error messages
2. Verify all columns were added correctly
3. Ensure your user has admin role in the profiles table
4. Check browser console for any remaining errors

The approval system will work perfectly once this database fix is applied! 