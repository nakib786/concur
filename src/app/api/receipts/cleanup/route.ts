import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

// POST - Cleanup old archived receipts (30+ days)
export async function POST(request: NextRequest) {
  try {
    // Check for authorization (optional: use a secret key for cron jobs)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate the cutoff date (30 days ago)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    console.log(`Starting cleanup for receipts archived before: ${thirtyDaysAgo.toISOString()}`)

    // Get all receipts that are archived and older than 30 days
    const { data: oldReceipts, error: fetchError } = await supabaseAdmin
      .from('receipts')
      .select('*')
      .not('archived_at', 'is', null) // Only archived receipts
      .lt('archived_at', thirtyDaysAgo.toISOString()) // Older than 30 days

    if (fetchError) {
      console.error('Error fetching old receipts:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch old receipts' }, { status: 500 })
    }

    if (!oldReceipts || oldReceipts.length === 0) {
      console.log('No old receipts found for cleanup')
      return NextResponse.json({ 
        message: 'No old receipts found for cleanup',
        deletedCount: 0 
      })
    }

    console.log(`Found ${oldReceipts.length} receipts to cleanup`)

    let deletedFiles = 0
    let deletedRecords = 0
    const errors: string[] = []

    // Process each receipt
    for (const receipt of oldReceipts) {
      try {
        // Delete the file from storage if it exists
        if (receipt.file_url) {
          try {
            // Extract the file path from the URL
            const urlParts = receipt.file_url.split('/')
            const fileName = urlParts[urlParts.length - 1]
            const filePath = `receipts/${receipt.user_id}/${fileName}`
            
            const { error: storageError } = await supabaseAdmin.storage
              .from('receipts')
              .remove([filePath])
            
            if (storageError) {
              console.warn(`Warning: Failed to delete file for receipt ${receipt.id}:`, storageError)
              errors.push(`File deletion failed for receipt ${receipt.id}: ${storageError.message}`)
            } else {
              deletedFiles++
            }
          } catch (storageError) {
            console.warn(`Warning: Error during file deletion for receipt ${receipt.id}:`, storageError)
            errors.push(`File deletion error for receipt ${receipt.id}: ${storageError}`)
          }
        }

        // Delete the receipt from database
        const { error: deleteError } = await supabaseAdmin
          .from('receipts')
          .delete()
          .eq('id', receipt.id)

        if (deleteError) {
          console.error(`Error deleting receipt ${receipt.id}:`, deleteError)
          errors.push(`Database deletion failed for receipt ${receipt.id}: ${deleteError.message}`)
        } else {
          deletedRecords++
          console.log(`Successfully deleted receipt ${receipt.id}`)
        }

      } catch (error) {
        console.error(`Error processing receipt ${receipt.id}:`, error)
        errors.push(`Processing error for receipt ${receipt.id}: ${error}`)
      }
    }

    const result = {
      message: 'Cleanup completed',
      totalFound: oldReceipts.length,
      deletedRecords,
      deletedFiles,
      errors: errors.length > 0 ? errors : undefined
    }

    console.log('Cleanup result:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Cleanup API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Check how many receipts would be cleaned up (dry run)
export async function GET(request: NextRequest) {
  try {
    // Check for authorization (optional: use a secret key for cron jobs)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate the cutoff date (30 days ago)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Count receipts that would be cleaned up
    const { count, error: countError } = await supabaseAdmin
      .from('receipts')
      .select('id', { count: 'exact' })
      .not('archived_at', 'is', null) // Only archived receipts
      .lt('archived_at', thirtyDaysAgo.toISOString()) // Older than 30 days

    if (countError) {
      console.error('Error counting old receipts:', countError)
      return NextResponse.json({ error: 'Failed to count old receipts' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Dry run completed',
      cutoffDate: thirtyDaysAgo.toISOString(),
      receiptsToDelete: count || 0
    })

  } catch (error) {
    console.error('Cleanup dry run API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 