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

    // Build query
    let query = supabaseAdmin
      .from('expense_reports')
      .select(`
        *,
        expense_report_items(
          id,
          receipt_id,
          receipts(
            id,
            vendor_name,
            amount,
            date,
            file_url
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Add filters
    if (status) {
      query = query.eq('status', status)
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1)

    const { data: reports, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching expense reports:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch expense reports' }, { status: 500 })
    }

    // Get total count
    let countQuery = supabaseAdmin
      .from('expense_reports')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting expense reports:', countError)
      return NextResponse.json({ error: 'Failed to count expense reports' }, { status: 500 })
    }

    return NextResponse.json({
      reports,
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Expense reports API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const { title, description, receiptIds } = await request.json()

    if (!title || !receiptIds || receiptIds.length === 0) {
      return NextResponse.json({ 
        error: 'Title and at least one receipt are required' 
      }, { status: 400 })
    }

    // Calculate total amount from receipts
    const { data: receipts, error: receiptsError } = await supabaseAdmin
      .from('receipts')
      .select('amount')
      .eq('user_id', user.id)
      .in('id', receiptIds)

    if (receiptsError) {
      console.error('Error fetching receipts for total:', receiptsError)
      return NextResponse.json({ error: 'Failed to calculate total amount' }, { status: 500 })
    }

    const totalAmount = receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0)

    // Create expense report
    const { data: report, error: reportError } = await supabaseAdmin
      .from('expense_reports')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        total_amount: totalAmount,
        status: 'draft'
      })
      .select()
      .single()

    if (reportError) {
      console.error('Error creating expense report:', reportError)
      return NextResponse.json({ error: 'Failed to create expense report' }, { status: 500 })
    }

    // Add receipt items to the report
    const reportItems = receiptIds.map((receiptId: string) => ({
      expense_report_id: report.id,
      receipt_id: receiptId
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('expense_report_items')
      .insert(reportItems)

    if (itemsError) {
      console.error('Error adding receipts to report:', itemsError)
      // Clean up the report if items failed
      await supabaseAdmin
        .from('expense_reports')
        .delete()
        .eq('id', report.id)
      
      return NextResponse.json({ error: 'Failed to add receipts to report' }, { status: 500 })
    }

    return NextResponse.json({ report })

  } catch (error) {
    console.error('Create expense report API error:', error)
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

    const { id, status, ...updateData } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    const updates: any = {
      ...updateData,
      updated_at: new Date().toISOString()
    }

    // Handle status changes
    if (status) {
      updates.status = status
      if (status === 'submitted') {
        updates.submitted_at = new Date().toISOString()
      }
    }

    // Update expense report
    const { data: report, error: updateError } = await supabaseAdmin
      .from('expense_reports')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user can only update their own reports
      .select()
      .single()

    if (updateError) {
      console.error('Error updating expense report:', updateError)
      return NextResponse.json({ error: 'Failed to update expense report' }, { status: 500 })
    }

    return NextResponse.json({ report })

  } catch (error) {
    console.error('Update expense report API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 