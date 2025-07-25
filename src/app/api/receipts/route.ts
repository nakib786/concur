import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

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
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build query
    let query = supabaseAdmin
      .from('receipts')
      .select('*')
      .eq('user_id', user.id)
      .is('archived_at', null) // Exclude archived receipts by default
      .order('created_at', { ascending: false })

    // Add filters
    if (status) {
      query = query.eq('status', status)
    }
    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1)

    const { data: receipts, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching receipts:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('receipts')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .is('archived_at', null) // Exclude archived receipts from count

    if (status) {
      countQuery = countQuery.eq('status', status)
    }
    if (startDate) {
      countQuery = countQuery.gte('date', startDate)
    }
    if (endDate) {
      countQuery = countQuery.lte('date', endDate)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting receipts:', countError)
      return NextResponse.json({ error: 'Failed to count receipts' }, { status: 500 })
    }

    return NextResponse.json({
      receipts,
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Receipts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    const { id, ...updateData } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Receipt ID is required' }, { status: 400 })
    }

    // Update receipt
    const { data: receipt, error: updateError } = await supabaseAdmin
      .from('receipts')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user can only update their own receipts
      .select()
      .single()

    if (updateError) {
      console.error('Error updating receipt:', updateError)
      return NextResponse.json({ error: 'Failed to update receipt' }, { status: 500 })
    }

    return NextResponse.json({ receipt })

  } catch (error) {
    console.error('Receipt update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 

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

    // First, check if receipt exists and user owns it
    const { data: receipt, error: fetchError } = await supabaseAdmin
      .from('receipts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('archived_at', null) // Only allow archiving non-archived receipts
      .single()

    if (fetchError || !receipt) {
      return NextResponse.json({ error: 'Receipt not found or access denied' }, { status: 404 })
    }

    // Archive the receipt by setting archived_at timestamp instead of deleting
    const { error: archiveError } = await supabaseAdmin
      .from('receipts')
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (archiveError) {
      console.error('Error archiving receipt:', archiveError)
      return NextResponse.json({ error: 'Failed to archive receipt' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Receipt archived successfully' })

  } catch (error) {
    console.error('Receipt archive API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 