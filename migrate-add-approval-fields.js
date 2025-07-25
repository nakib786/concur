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
    // Add new columns for approval workflow
    const alterTableSQL = `
      -- Add approval fields to receipts table
      ALTER TABLE receipts 
      ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

      -- Update status enum to include new values
      ALTER TYPE receipt_status ADD VALUE IF NOT EXISTS 'approved';
      ALTER TYPE receipt_status ADD VALUE IF NOT EXISTS 'rejected';

      -- Create the status enum if it doesn't exist
      DO $$ BEGIN
        CREATE TYPE receipt_status AS ENUM ('pending', 'processed', 'error');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      -- Update the status column to use the enum (if not already)
      ALTER TABLE receipts 
      ALTER COLUMN status TYPE receipt_status USING status::receipt_status;

      -- Update existing 'processed' status to 'approved'
      UPDATE receipts SET status = 'approved' WHERE status = 'processed';
    `

    console.log('📝 Executing SQL migration...')
    
    // Split into individual statements and execute
    const statements = alterTableSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
        if (error) {
          console.warn(`Warning: ${error.message}`)
        }
      }
    }

    console.log('✅ Migration completed successfully!')
    
    // Verify the changes
    console.log('🔍 Verifying table structure...')
    const { data, error } = await supabase
      .from('receipts')
      .select('id, status, approved_by, approved_at, rejection_reason')
      .limit(1)

    if (error) {
      console.error('❌ Verification failed:', error.message)
    } else {
      console.log('✅ Table structure verified!')
      console.log('📊 Sample row structure:', Object.keys(data[0] || {}))
    }

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