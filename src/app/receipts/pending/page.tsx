'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { 
  Receipt, 
  ArrowLeft, 
  Eye, 
  Calendar, 
  DollarSign, 
  Building, 
  Tag, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  AlertTriangle
} from 'lucide-react'

interface ReceiptData {
  id: string
  file_url: string
  file_name: string
  vendor_name: string | null
  amount: number | null
  date: string | null
  category: string | null
  description: string | null
  status: 'pending' | 'approved' | 'rejected' | 'error'
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  profiles: {
    full_name: string | null
    email: string
    department: string | null
  }
  ocr_data?: {
    items: {
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
  };
}

export default function PendingReceiptsPage() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [receipts, setReceipts] = useState<ReceiptData[]>([])
  const [receiptsLoading, setReceiptsLoading] = useState(true)
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [counts, setCounts] = useState<any>({})
  const [statusFilter, setStatusFilter] = useState('pending')
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
      } else {
        setUser(user)
        await checkAdminAccess(user.id)
      }
      setLoading(false)
    }

    getUser()
  }, [router])

  const checkAdminAccess = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, email')
        .eq('id', userId)
        .single()

      if (!profile || profile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setUserProfile(profile)
      await fetchReceipts()
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/dashboard')
    }
  }

  const fetchReceipts = async () => {
    try {
      setReceiptsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/receipts/approve?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setReceipts(data.receipts)
        setCounts(data.counts)
      } else {
        console.error('Failed to fetch receipts')
      }
    } catch (error) {
      console.error('Error fetching receipts:', error)
    } finally {
      setReceiptsLoading(false)
    }
  }

  const handleApprovalAction = async (receiptId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    try {
      setIsProcessing(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/receipts/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          receiptId,
          action,
          rejectionReason: action === 'reject' ? rejectionReason : null
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update the receipt in local state
        setReceipts(prev => prev.map(receipt => 
          receipt.id === receiptId 
            ? { ...receipt, ...data.receipt }
            : receipt
        ))
        
        // Close modals
        setSelectedReceipt(null)
        setActionType(null)
        setRejectionReason('')
        
        // Refresh the list
        await fetchReceipts()
        
        alert(data.message)
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to process action')
      }
    } catch (error) {
      console.error('Error processing action:', error)
      alert('An error occurred while processing the action')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!userProfile || userProfile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Access denied. Admin privileges required.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 mobile-safe">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mobile-header py-4 sm:py-6">
            <div className="flex items-center min-w-0">
              <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mr-2 sm:mr-4 p-2 flex-shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
              <span className="ml-2 text-lg sm:text-2xl font-bold text-gray-900 truncate">Receipt Approval</span>
            </div>
            <div className="mobile-nav">
              <span className="text-xs sm:text-sm text-gray-600 text-truncate-mobile">
                Welcome, {userProfile.full_name || userProfile.email}
              </span>
              <Button variant="outline" onClick={() => router.push('/receipts')} size="sm" className="flex-shrink-0">
                All Receipts
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{counts.pending || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{counts.approved || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{counts.rejected || 0}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(counts.pending || 0) + (counts.approved || 0) + (counts.rejected || 0)}
                  </p>
                </div>
                <Receipt className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchReceipts}>Apply Filter</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipts Grid */}
        {receiptsLoading ? (
          <div className="text-center py-8">Loading receipts...</div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No receipts found</h3>
            <p className="text-gray-500">No receipts match the current filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {receipts.map((receipt) => (
              <Card key={receipt.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{receipt.vendor_name || 'Unknown Vendor'}</CardTitle>
                      <CardDescription>{formatDate(receipt.date)}</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReceipt(receipt)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {receipt.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReceipt(receipt)
                              setActionType('approve')
                            }}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReceipt(receipt)
                              setActionType('reject')
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 text-gray-600 mr-2" />
                      <span>{receipt.profiles?.full_name || receipt.profiles?.email}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4 text-green-600 mr-2" />
                      <span className="font-medium">{formatCurrency(receipt.amount)}</span>
                    </div>
                    {receipt.category && (
                      <div className="flex items-center text-sm">
                        <Tag className="h-4 w-4 text-blue-600 mr-2" />
                        <span>{receipt.category}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(receipt.status)}`}>
                        {receipt.status}
                      </span>
                    </div>
                    {receipt.rejection_reason && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        <strong>Rejection reason:</strong> {receipt.rejection_reason}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Receipt Detail Modal */}
        {selectedReceipt && !actionType && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-sm sm:max-w-2xl lg:max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">Receipt Details</h2>
                  <div className="flex space-x-2">
                    {selectedReceipt.status === 'pending' && (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={() => setActionType('approve')}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setActionType('reject')}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button variant="outline" onClick={() => setSelectedReceipt(null)}>
                      Close
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Employee</Label>
                      <p className="text-lg">{selectedReceipt.profiles?.full_name || selectedReceipt.profiles?.email}</p>
                      {selectedReceipt.profiles?.department && (
                        <p className="text-sm text-gray-600">{selectedReceipt.profiles.department}</p>
                      )}
                    </div>
                    <div>
                      <Label>Vendor</Label>
                      <p className="text-lg">{selectedReceipt.vendor_name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <p className="text-lg font-medium text-green-600">
                        {formatCurrency(selectedReceipt.amount)}
                      </p>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <p className="text-lg">{formatDate(selectedReceipt.date)}</p>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <p className="text-lg">{selectedReceipt.category || 'N/A'}</p>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <p className="text-lg">{selectedReceipt.description || 'N/A'}</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedReceipt.status)}`}>
                        {selectedReceipt.status}
                      </span>
                    </div>
                    
                    {selectedReceipt.rejection_reason && (
                      <div>
                        <Label>Rejection Reason</Label>
                        <p className="text-sm text-red-600 bg-red-50 p-3 rounded">
                          {selectedReceipt.rejection_reason}
                        </p>
                      </div>
                    )}
                    
                    {/* Itemized Details Section */}
                    <div>
                      <Label>Itemized Details</Label>
                      {selectedReceipt.ocr_data?.items && selectedReceipt.ocr_data.items.length > 0 ? (
                        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                          {selectedReceipt.ocr_data.items.map((item: any, index: number) => (
                            <div key={index} className="bg-gray-50 p-3 rounded text-sm border">
                              <div className="font-medium">{item.description}</div>
                              <div className="text-gray-600 text-xs mt-1">
                                {item.quantity && `Qty: ${item.quantity}`}
                                {item.unitPrice && ` • Unit: $${item.unitPrice.toFixed(2)}`}
                                {item.totalPrice && ` • Total: $${item.totalPrice.toFixed(2)}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : selectedReceipt.ocr_data ? (
                        <p className="text-sm text-gray-500 mt-2">No itemized details found</p>
                      ) : (
                        <p className="text-sm text-gray-400 mt-2">No OCR data available</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Receipt Image</Label>
                    <div className="mt-2">
                      <img 
                        src={selectedReceipt.file_url} 
                        alt="Receipt"
                        className="w-full h-auto rounded-lg border"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Approval/Rejection Modal */}
        {selectedReceipt && actionType && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-xs sm:max-w-md w-full p-4 sm:p-6">
              <div className="flex justify-center items-center mb-4">
                {actionType === 'approve' ? (
                  <CheckCircle className="h-12 w-12 text-green-500" />
                ) : (
                  <XCircle className="h-12 w-12 text-red-500" />
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">
                {actionType === 'approve' ? 'Approve Receipt' : 'Reject Receipt'}
              </h3>
              <p className="text-gray-700 mb-4 text-center">
                {actionType === 'approve' 
                  ? 'Are you sure you want to approve this receipt?' 
                  : 'Please provide a reason for rejecting this receipt:'
                }
              </p>
              
              {actionType === 'reject' && (
                <div className="mb-4">
                  <Label htmlFor="rejectionReason">Rejection Reason</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setActionType(null)
                    setRejectionReason('')
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant={actionType === 'approve' ? 'default' : 'destructive'}
                  onClick={() => handleApprovalAction(selectedReceipt.id, actionType)}
                  disabled={isProcessing || (actionType === 'reject' && !rejectionReason.trim())}
                >
                  {isProcessing ? 'Processing...' : (actionType === 'approve' ? 'Approve' : 'Reject')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
} 