const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addApprovalFields() {
  console.log('🔄 Adding approval fields to receipts table...')
  
  try {
    // First, let's check the current table structure
    console.log('🔍 Checking current table structure...')
    const { data: currentReceipts, error: checkError } = await supabase
      .from('receipts')
      .select('*')
      .limit(1)

    if (checkError) {
      console.error('❌ Error checking table:', checkError.message)
      return
    }

    console.log('📊 Current columns:', Object.keys(currentReceipts[0] || {}))

    // Check if approval fields already exist
    const existingColumns = Object.keys(currentReceipts[0] || {})
    const hasApprovalFields = existingColumns.includes('approved_by') && 
                              existingColumns.includes('approved_at') && 
                              existingColumns.includes('rejection_reason')

    if (hasApprovalFields) {
      console.log('✅ Approval fields already exist!')
      
      // Update existing 'processed' status to 'approved'
      console.log('🔄 Updating processed status to approved...')
      const { error: updateError } = await supabase
        .from('receipts')
        .update({ status: 'approved' })
        .eq('status', 'processed')

      if (updateError) {
        console.warn('⚠️ Warning updating status:', updateError.message)
      } else {
        console.log('✅ Status updates completed!')
      }
      
      return
    }

    console.log('❌ Approval fields missing. Please add them manually in Supabase dashboard:')
    console.log('')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to Table Editor > receipts')
    console.log('3. Add these columns:')
    console.log('   - approved_by (uuid, nullable, foreign key to profiles.id)')
    console.log('   - approved_at (timestamptz, nullable)')
    console.log('   - rejection_reason (text, nullable)')
    console.log('4. Update the status column to allow: pending, approved, rejected, error')
    console.log('')
    console.log('Alternatively, run this SQL in the SQL Editor:')
    console.log('')
    console.log(`
ALTER TABLE receipts 
ADD COLUMN approved_by UUID REFERENCES profiles(id),
ADD COLUMN approved_at TIMESTAMPTZ,
ADD COLUMN rejection_reason TEXT;

-- Update existing processed receipts to approved
UPDATE receipts SET status = 'approved' WHERE status = 'processed';
    `)

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// Run the migration
addApprovalFields().then(() => {
  console.log('🎉 Migration script completed!')
  process.exit(0)
}) 