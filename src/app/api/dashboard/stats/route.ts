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

    // Get current month start and end dates
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    console.log('Date range for monthly expenses:', { monthStart, monthEnd, userId: user.id })

    // Get total expenses for this month - ONLY count approved receipts
    // Use created_at for date range and filter by approved status
    const { data: monthlyReceipts, error: receiptsError } = await supabaseAdmin
      .from('receipts')
      .select('amount, date, created_at, vendor_name, status')
      .eq('user_id', user.id)
      .eq('status', 'approved') // Only count approved receipts
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd)
      .not('amount', 'is', null)

    if (receiptsError) {
      console.error('Error fetching monthly receipts:', receiptsError)
      return NextResponse.json({ error: 'Failed to fetch monthly expenses' }, { status: 500 })
    }

    console.log('Monthly receipts found:', monthlyReceipts?.length || 0)
    console.log('Monthly receipts data:', monthlyReceipts)

    const totalMonthlyExpenses = monthlyReceipts?.reduce((sum, receipt) => {
      const amount = receipt.amount || 0
      console.log('Adding amount:', amount, 'from receipt:', receipt.vendor_name, '(status:', receipt.status, ')')
      return sum + amount
    }, 0) || 0

    console.log('Total monthly expenses calculated:', totalMonthlyExpenses)

    // Get pending reports count
    const { count: pendingReports, error: pendingError } = await supabaseAdmin
      .from('expense_reports')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .in('status', ['draft', 'submitted'])

    if (pendingError) {
      console.error('Error fetching pending reports:', pendingError)
      return NextResponse.json({ error: 'Failed to fetch pending reports' }, { status: 500 })
    }

    // Get approved receipts uploaded this month
    const { count: monthlyReceiptsCount, error: countError } = await supabaseAdmin
      .from('receipts')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', 'approved') // Only count approved receipts
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd)

    if (countError) {
      console.error('Error counting monthly receipts:', countError)
      return NextResponse.json({ error: 'Failed to count monthly receipts' }, { status: 500 })
    }

    // Get total approved receipts count
    const { count: totalReceiptsCount, error: totalCountError } = await supabaseAdmin
      .from('receipts')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', 'approved') // Only count approved receipts

    if (totalCountError) {
      console.error('Error counting total receipts:', totalCountError)
      return NextResponse.json({ error: 'Failed to count total receipts' }, { status: 500 })
    }

    // Get total reports count
    const { count: totalReportsCount, error: totalReportsError } = await supabaseAdmin
      .from('expense_reports')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)

    if (totalReportsError) {
      console.error('Error counting total reports:', totalReportsError)
      return NextResponse.json({ error: 'Failed to count total reports' }, { status: 500 })
    }

    // Get receipt status breakdown for admin users
    const { data: statusBreakdown } = await supabaseAdmin
      .from('receipts')
      .select('status')
      .eq('user_id', user.id)

    const statusCounts = statusBreakdown?.reduce((acc: any, receipt: any) => {
      acc[receipt.status] = (acc[receipt.status] || 0) + 1
      return acc
    }, {}) || {}

    const result = {
      totalMonthlyExpenses,
      pendingReports: pendingReports || 0,
      monthlyReceiptsCount: monthlyReceiptsCount || 0,
      totalReceiptsCount: totalReceiptsCount || 0,
      totalReportsCount: totalReportsCount || 0,
      receiptStatusBreakdown: statusCounts
    }

    console.log('Final dashboard stats:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Dashboard stats API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 