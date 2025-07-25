# Database Migration Guide - Adding Approval Fields

## Issue
The receipt approval system requires additional database columns that don't exist in your current schema. You need to add approval-related fields to the `receipts` table.

## Required Fields
The following columns need to be added to the `receipts` table:
- `approved_by` (UUID, nullable, foreign key to profiles.id)
- `approved_at` (TIMESTAMPTZ, nullable)  
- `rejection_reason` (TEXT, nullable)

## Migration Options

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to your project at [https://app.supabase.com](https://app.supabase.com)

2. **Open Table Editor**
   - Click on "Table Editor" in the left sidebar
   - Select the `receipts` table

3. **Add New Columns**
   
   **Column 1: approved_by**
   - Click "Add Column"
   - Name: `approved_by`
   - Type: `uuid`
   - Default value: Leave empty
   - Is nullable: ✅ Yes
   - Is unique: ❌ No
   - Is primary key: ❌ No
   - Foreign key relation: `profiles` table, `id` column

   **Column 2: approved_at**
   - Click "Add Column"  
   - Name: `approved_at`
   - Type: `timestamptz`
   - Default value: Leave empty
   - Is nullable: ✅ Yes

   **Column 3: rejection_reason**
   - Click "Add Column"
   - Name: `rejection_reason` 
   - Type: `text`
   - Default value: Leave empty
   - Is nullable: ✅ Yes

4. **Update Status Values**
   - The `status` column should allow these values: `pending`, `approved`, `rejected`, `error`
   - You may need to update any existing `processed` status to `approved`

### Option 2: Using SQL Editor

1. **Go to SQL Editor**
   - In your Supabase dashboard, click "SQL Editor"

2. **Run this SQL**
   ```sql
   -- Add approval fields to receipts table
   ALTER TABLE receipts 
   ADD COLUMN approved_by UUID REFERENCES profiles(id),
   ADD COLUMN approved_at TIMESTAMPTZ,
   ADD COLUMN rejection_reason TEXT;

   -- Update existing 'processed' receipts to 'approved' status
   UPDATE receipts SET status = 'approved' WHERE status = 'processed';
   ```

3. **Click "Run"** to execute the migration

### Option 3: Using Migration Script

Run the provided migration script:
```bash
node migrate-add-approval-fields-simple.js
```

## Verification

After adding the columns, verify the migration worked:

1. **Check Table Structure**
   - Go to Table Editor > receipts
   - Confirm the new columns are visible

2. **Test the API**
   - Try accessing the pending receipts page
   - The error should be resolved

## Status Values

After migration, the `status` column should support:
- `pending` - Receipt awaiting approval
- `approved` - Receipt approved by admin  
- `rejected` - Receipt rejected by admin
- `error` - Processing error

## Troubleshooting

**If you get permission errors:**
- Make sure you're using the service role key
- Check that RLS policies allow the operations

**If foreign key constraint fails:**
- Ensure the `profiles` table exists
- Verify the `profiles.id` column is the primary key

**If you still get API errors:**
- Check the browser console for detailed error messages
- Verify all columns were added correctly
- Restart your development server: `npm run dev`

## Next Steps

Once the database migration is complete:
1. Restart your development server
2. Test the approval workflow:
   - Upload a new receipt (should be `pending`)
   - Access `/receipts/pending` as an admin
   - Try approving/rejecting receipts
3. Verify the status updates work correctly

## Need Help?

If you encounter issues:
1. Check the Supabase dashboard logs
2. Look at the browser console for detailed errors
3. Verify your environment variables are correct
4. Ensure you have admin role in your profile 