const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addArchivedAtColumn() {
  try {
    console.log('Testing if archived_at column exists...')
    
    // First, test if the column exists by trying to select it
    const { data, error } = await supabase
      .from('receipts')
      .select('archived_at')
      .limit(1)
    
    if (!error) {
      console.log('✅ archived_at column already exists!')
      console.log('Your database is ready to use the archive functionality.')
      return
    }
    
    console.log('Column does not exist. Adding archived_at column...')
    
    // If the column doesn't exist, we need to add it
    // Since we can't directly execute DDL through the client, we'll provide instructions
    console.log('\n🔧 MANUAL STEP REQUIRED:')
    console.log('Please add the archived_at column to your receipts table.')
    console.log('\nOption 1 - Supabase Dashboard:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to Database > Tables > receipts')
    console.log('3. Click "Add Column"')
    console.log('4. Name: archived_at')
    console.log('5. Type: timestamptz (timestamp with timezone)')
    console.log('6. Allow NULL: Yes')
    console.log('7. Click Save')
    
    console.log('\nOption 2 - SQL Editor:')
    console.log('1. Go to Supabase Dashboard > SQL Editor')
    console.log('2. Run this SQL command:')
    console.log('   ALTER TABLE receipts ADD COLUMN archived_at TIMESTAMPTZ;')
    
    console.log('\nAfter adding the column, run this script again to verify.')
    
  } catch (error) {
    console.error('Error during migration:', error)
    console.log('\n🔧 MANUAL STEP REQUIRED:')
    console.log('Please add the archived_at column manually in your Supabase dashboard.')
    console.log('SQL: ALTER TABLE receipts ADD COLUMN archived_at TIMESTAMPTZ;')
  }
}

addArchivedAtColumn() 