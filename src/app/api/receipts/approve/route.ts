import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

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

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { receiptId, action, rejectionReason } = await request.json()

    if (!receiptId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })
    }

    if (action === 'reject' && !rejectionReason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
    }

    // Update receipt status
    const updateData: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      updated_at: new Date().toISOString()
    }

    // Only add approval fields if they exist in the database
    try {
      updateData.approved_by = user.id
      updateData.approved_at = new Date().toISOString()
      
      if (action === 'reject') {
        updateData.rejection_reason = rejectionReason
      }
    } catch (error) {
      console.warn('Approval fields may not exist in database yet')
    }

    const { data: updatedReceipt, error: updateError } = await supabaseAdmin
      .from('receipts')
      .update(updateData)
      .eq('id', receiptId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating receipt:', updateError)
      return NextResponse.json({ 
        error: `Failed to update receipt: ${updateError.message}. Please ensure approval fields are added to the database.`,
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      receipt: updatedReceipt,
      message: `Receipt ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    })

  } catch (error) {
    console.error('Error in approval endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get pending receipts for admin review
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

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || 'pending'

    // Build query for pending/all receipts
    let query = supabaseAdmin
      .from('receipts')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    // Add status filter
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1)

    const { data: receipts, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching receipts:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 })
    }

    // Fetch user profiles for each receipt
    const receiptsWithProfiles = await Promise.all(
      (receipts || []).map(async (receipt) => {
        try {
          // Get user profile
          const { data: userProfile } = await supabaseAdmin
            .from('profiles')
            .select('full_name, email, department')
            .eq('id', receipt.user_id)
            .single()

          // Get approver profile if exists (handle case where approved_by field might not exist)
          let approverProfile = null
          if (receipt.approved_by) {
            const { data: approver } = await supabaseAdmin
              .from('profiles')
              .select('full_name, email')
              .eq('id', receipt.approved_by)
              .single()
            approverProfile = approver
          }

          return {
            ...receipt,
            profiles: userProfile || { full_name: null, email: 'Unknown', department: null },
            approver_profiles: approverProfile,
            // Ensure approval fields exist even if not in database
            approved_by: receipt.approved_by || null,
            approved_at: receipt.approved_at || null,
            rejection_reason: receipt.rejection_reason || null
          }
        } catch (error: any) {
          console.warn('Error fetching profile for receipt:', receipt.id, error?.message || 'Unknown error')
          return {
            ...receipt,
            profiles: { full_name: null, email: 'Unknown', department: null },
            approver_profiles: null,
            approved_by: receipt.approved_by || null,
            approved_at: receipt.approved_at || null,
            rejection_reason: receipt.rejection_reason || null
          }
        }
      })
    )

    // Get counts for different statuses
    const { data: statusCounts } = await supabaseAdmin
      .from('receipts')
      .select('status')
      .is('archived_at', null)

    const counts = statusCounts?.reduce((acc: any, receipt: any) => {
      acc[receipt.status] = (acc[receipt.status] || 0) + 1
      return acc
    }, {}) || {}

    return NextResponse.json({
      receipts: receiptsWithProfiles,
      counts,
      pagination: {
        limit,
        offset,
        total: receiptsWithProfiles.length
      }
    })

  } catch (error) {
    console.error('Error fetching pending receipts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 