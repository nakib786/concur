import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

// GET - List archived receipts
export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get archived receipts (within 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: archivedReceipts, error: fetchError } = await supabaseAdmin
      .from('receipts')
      .select('*')
      .eq('user_id', user.id)
      .not('archived_at', 'is', null) // Only archived receipts
      .gte('archived_at', thirtyDaysAgo.toISOString()) // Within 30 days
      .order('archived_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fetchError) {
      console.error('Error fetching archived receipts:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch archived receipts' }, { status: 500 })
    }

    // Get total count
    const { count, error: countError } = await supabaseAdmin
      .from('receipts')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .not('archived_at', 'is', null)
      .gte('archived_at', thirtyDaysAgo.toISOString())

    if (countError) {
      console.error('Error counting archived receipts:', countError)
      return NextResponse.json({ error: 'Failed to count archived receipts' }, { status: 500 })
    }

    return NextResponse.json({
      receipts: archivedReceipts,
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Archived receipts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Restore archived receipt
export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Receipt ID is required' }, { status: 400 })
    }

    // Check if receipt exists, is archived, and user owns it
    const { data: receipt, error: fetchError } = await supabaseAdmin
      .from('receipts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .not('archived_at', 'is', null) // Only archived receipts
      .single()

    if (fetchError || !receipt) {
      return NextResponse.json({ error: 'Archived receipt not found or access denied' }, { status: 404 })
    }

    // Check if receipt is still within 30-day restore window
    const archivedDate = new Date(receipt.archived_at!)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    if (archivedDate < thirtyDaysAgo) {
      return NextResponse.json({ error: 'Receipt is beyond the 30-day restore window' }, { status: 400 })
    }

    // Restore the receipt by removing archived_at timestamp
    const { error: restoreError } = await supabaseAdmin
      .from('receipts')
      .update({
        archived_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (restoreError) {
      console.error('Error restoring receipt:', restoreError)
      return NextResponse.json({ error: 'Failed to restore receipt' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Receipt restored successfully' })

  } catch (error) {
    console.error('Receipt restore API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Permanently delete archived receipt
export async function DELETE(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Receipt ID is required' }, { status: 400 })
    }

    // Get the archived receipt to check ownership and get file info
    const { data: receipt, error: fetchError } = await supabaseAdmin
      .from('receipts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .not('archived_at', 'is', null) // Only archived receipts
      .single()

    if (fetchError || !receipt) {
      return NextResponse.json({ error: 'Archived receipt not found or access denied' }, { status: 404 })
    }

    // Delete the file from storage
    if (receipt.file_url) {
      try {
        // Extract the file path from the URL
        const urlParts = receipt.file_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        const filePath = `receipts/${user.id}/${fileName}`
        
        const { error: storageError } = await supabaseAdmin.storage
          .from('receipts')
          .remove([filePath])
        
        if (storageError) {
          console.warn('Warning: Failed to delete file from storage:', storageError)
          // Continue with database deletion even if file deletion fails
        }
      } catch (storageError) {
        console.warn('Warning: Error during file deletion:', storageError)
        // Continue with database deletion even if file deletion fails
      }
    }

    // Permanently delete the receipt from database
    const { error: deleteError } = await supabaseAdmin
      .from('receipts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error permanently deleting receipt:', deleteError)
      return NextResponse.json({ error: 'Failed to permanently delete receipt' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Receipt permanently deleted successfully' })

  } catch (error) {
    console.error('Receipt permanent delete API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 