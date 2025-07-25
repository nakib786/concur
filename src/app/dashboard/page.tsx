'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { Receipt, Plus, BarChart3, FileText, Clock, Shield } from 'lucide-react'

interface DashboardStats {
  totalMonthlyExpenses: number
  pendingReports: number
  monthlyReceiptsCount: number
  totalReceiptsCount: number
  totalReportsCount: number
  receiptStatusBreakdown: {
    pending?: number
    approved?: number
    rejected?: number
    error?: number
  }
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalMonthlyExpenses: 0,
    pendingReports: 0,
    monthlyReceiptsCount: 0,
    totalReceiptsCount: 0,
    totalReportsCount: 0,
    receiptStatusBreakdown: {}
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
      } else {
        setUser(user)
        
        // Ensure user profile exists
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            const response = await fetch('/api/ensure-profile', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            })
            
            if (!response.ok) {
              console.warn('Failed to ensure profile exists')
            } else {
              const result = await response.json()
              if (result.profileCreated) {
                console.log('Profile created for existing user')
              }
            }

            // Fetch user profile
            await fetchUserProfile(session.access_token)
            
            // Fetch dashboard stats
            await fetchDashboardStats(session.access_token)
          }
        } catch (error) {
          console.warn('Error ensuring profile:', error)
        }
      }
      setLoading(false)
    }

    getUser()
  }, [router])

  const fetchUserProfile = async (accessToken: string) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, email')
        .eq('id', currentUser.id)
        .single()

      setUserProfile(profile)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchDashboardStats = async (accessToken: string) => {
    try {
      setStatsLoading(true)
      console.log('🔍 Fetching dashboard stats with token:', accessToken ? 'Present' : 'Missing')
      
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      console.log('📊 Dashboard stats response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('📈 Dashboard stats data received:', data)
        setStats(data)
      } else {
        const errorText = await response.text()
        console.error('❌ Failed to fetch dashboard stats:', response.status, errorText)
      }
    } catch (error) {
      console.error('💥 Error fetching dashboard stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Receipt className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">ExpenseTracker</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.user_metadata?.full_name || user?.email}
              </span>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage your expenses and receipts</p>
        </div>

        {/* Quick Actions */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${userProfile?.role === 'admin' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-6 mb-8`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/upload')}>
            <CardHeader className="text-center">
              <Plus className="h-12 w-12 text-blue-600 mx-auto" />
              <CardTitle>Upload Receipt</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Upload and process new receipts with OCR
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/reports')}>
            <CardHeader className="text-center">
              <FileText className="h-12 w-12 text-green-600 mx-auto" />
              <CardTitle>Expense Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Create and manage expense reports
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/receipts')}>
            <CardHeader className="text-center">
              <Receipt className="h-12 w-12 text-purple-600 mx-auto" />
              <CardTitle>My Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                View and edit uploaded receipts
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <BarChart3 className="h-12 w-12 text-orange-600 mx-auto" />
              <CardTitle>Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                View expense trends and reports
              </CardDescription>
            </CardContent>
          </Card>

          {/* Admin Only - Pending Receipts */}
          {userProfile?.role === 'admin' && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/receipts/pending')}>
              <CardHeader className="text-center">
                <Clock className="h-12 w-12 text-yellow-600 mx-auto" />
                <CardTitle>Pending Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Review and approve receipts
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Approved Expenses</CardTitle>
              <CardDescription>This month (approved only)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {statsLoading ? 'Loading...' : formatCurrency(stats.totalMonthlyExpenses)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Reports</CardTitle>
              <CardDescription>Awaiting approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {statsLoading ? 'Loading...' : stats.pendingReports}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approved Receipts</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {statsLoading ? 'Loading...' : stats.monthlyReceiptsCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Receipt Status Breakdown (show for all users to understand approval status) */}
        {!statsLoading && stats.receiptStatusBreakdown && Object.keys(stats.receiptStatusBreakdown).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Receipt Status Overview</CardTitle>
              <CardDescription>Breakdown of all your receipts by approval status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.receiptStatusBreakdown.pending && (
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{stats.receiptStatusBreakdown.pending}</div>
                    <div className="text-sm text-yellow-700">Pending Approval</div>
                  </div>
                )}
                {stats.receiptStatusBreakdown.approved && (
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.receiptStatusBreakdown.approved}</div>
                    <div className="text-sm text-green-700">Approved</div>
                  </div>
                )}
                {stats.receiptStatusBreakdown.rejected && (
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{stats.receiptStatusBreakdown.rejected}</div>
                    <div className="text-sm text-red-700">Rejected</div>
                  </div>
                )}
                {stats.receiptStatusBreakdown.error && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">{stats.receiptStatusBreakdown.error}</div>
                    <div className="text-sm text-gray-700">Error</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
} 