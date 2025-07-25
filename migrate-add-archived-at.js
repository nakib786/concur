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
    console.log('Adding archived_at column to receipts table...')
    
    // Check if column already exists
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'receipts')
      .eq('column_name', 'archived_at')
    
    if (columnError) {
      console.error('Error checking for existing column:', columnError)
      process.exit(1)
    }
    
    if (columns && columns.length > 0) {
      console.log('archived_at column already exists!')
      return
    }
    
    // Add the column using raw SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE receipts ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;'
    })
    
    if (error) {
      console.error('Error adding column:', error)
      process.exit(1)
    }
    
    console.log('Successfully added archived_at column to receipts table!')
    
    // Verify the column was added
    const { data: newColumns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'receipts')
      .eq('column_name', 'archived_at')
    
    if (verifyError) {
      console.error('Error verifying column:', verifyError)
    } else if (newColumns && newColumns.length > 0) {
      console.log('Column verified:', newColumns[0])
    } else {
      console.warn('Column not found after creation - this might be normal if using a different schema')
    }
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Alternative method if the first one doesn't work
async function addArchivedAtColumnDirect() {
  try {
    console.log('Attempting direct SQL execution...')
    
    // Try direct query execution
    const { error } = await supabase
      .from('receipts')
      .select('archived_at')
      .limit(1)
    
    if (!error) {
      console.log('archived_at column already exists!')
      return
    }
    
    console.log('Column does not exist, adding it...')
    
    // Use direct SQL execution
    const { data, error: sqlError } = await supabase
      .rpc('exec_sql', {
        sql: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'receipts' AND column_name = 'archived_at'
            ) THEN
              ALTER TABLE receipts ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
            END IF;
          END $$;
        `
      })
    
    if (sqlError) {
      console.error('SQL Error:', sqlError)
      throw sqlError
    }
    
    console.log('Column added successfully!')
    
  } catch (error) {
    console.error('Direct SQL method failed:', error)
    throw error
  }
}

async function runMigration() {
  console.log('Starting migration to add archived_at column...')
  
  try {
    await addArchivedAtColumn()
  } catch (error) {
    console.log('First method failed, trying alternative approach...')
    try {
      await addArchivedAtColumnDirect()
    } catch (error2) {
      console.error('Both migration methods failed!')
      console.error('You may need to add the column manually in your Supabase dashboard:')
      console.error('ALTER TABLE receipts ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;')
      process.exit(1)
    }
  }
  
  console.log('Migration completed successfully!')
}

runMigration() 