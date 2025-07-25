const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixStatusConstraint() {
  console.log('🔄 Fixing status constraint issue...')
  
  try {
    // First, let's check what status values currently exist
    console.log('🔍 Checking current status values...')
    const { data: statusData, error: statusError } = await supabase
      .from('receipts')
      .select('status')
    
    if (statusError) {
      console.error('❌ Error checking status values:', statusError.message)
      return
    }

    const uniqueStatuses = [...new Set(statusData.map(r => r.status))]
    console.log('📊 Current status values in database:', uniqueStatuses)

    console.log('')
    console.log('🛠️  You need to update the database constraint manually.')
    console.log('   The check constraint "receipts_status_check" only allows certain values.')
    console.log('')
    console.log('📝 Run this SQL in your Supabase SQL Editor:')
    console.log('')
    console.log('-- Step 1: Drop the existing constraint')
    console.log('ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_status_check;')
    console.log('')
    console.log('-- Step 2: Add the new constraint with updated values')
    console.log(`ALTER TABLE receipts ADD CONSTRAINT receipts_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'error', 'processed'));`)
    console.log('')
    console.log('-- Step 3: Add the missing approval columns (if not already added)')
    console.log(`ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;`)
    console.log('')
    console.log('-- Step 4: Update any existing "processed" status to "approved"')
    console.log(`UPDATE receipts SET status = 'approved' WHERE status = 'processed';`)
    console.log('')
    console.log('-- Step 5: Update the constraint again to remove "processed"')
    console.log('ALTER TABLE receipts DROP CONSTRAINT receipts_status_check;')
    console.log(`ALTER TABLE receipts ADD CONSTRAINT receipts_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'error'));`)
    console.log('')
    console.log('🎯 After running this SQL, restart your development server!')

  } catch (error) {
    console.error('❌ Script failed:', error.message)
    process.exit(1)
  }
}

// Run the script
fixStatusConstraint().then(() => {
  console.log('🎉 Script completed!')
  process.exit(0)
}) 