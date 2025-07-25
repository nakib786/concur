const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  try {
    console.log('Setting up database schema...')
    
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'database_schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    console.log(`Executing ${statements.length} SQL statements...`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`Executing statement ${i + 1}/${statements.length}`)
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          console.warn(`Warning on statement ${i + 1}:`, error.message)
        }
      } catch (err) {
        console.warn(`Warning on statement ${i + 1}:`, err.message)
      }
    }
    
    console.log('Database setup completed!')
    
    // Test the connection by checking if tables exist
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['profiles', 'receipts', 'expense_reports', 'expense_report_items'])
    
    if (error) {
      console.error('Error checking tables:', error)
    } else {
      console.log('Created tables:', tables.map(t => t.table_name))
    }
    
  } catch (error) {
    console.error('Database setup failed:', error)
    process.exit(1)
  }
}

setupDatabase() 