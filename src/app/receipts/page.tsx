'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { Receipt, ArrowLeft, Edit, Eye, Calendar, DollarSign, Building, Tag, Trash2, AlertTriangle, Archive, Clock } from 'lucide-react'

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
  archived_at: string | null
  created_at: string
  updated_at: string
  ocr_data?: {
    items: {
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
  };
}

export default function ReceiptsPage() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [receipts, setReceipts] = useState<ReceiptData[]>([])
  const [receiptsLoading, setReceiptsLoading] = useState(true)
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editForm, setEditForm] = useState({
    vendor_name: '',
    amount: '',
    date: '',
    category: '',
    description: ''
  })
  const [filters, setFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: ''
  })
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
      } else {
        setUser(user)
        await fetchUserProfile(user.id)
        await fetchReceipts()
      }
      setLoading(false)
    }

    getUser()
  }, [router])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, email')
        .eq('id', userId)
        .single()

      setUserProfile(profile)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchReceipts = async () => {
    try {
      setReceiptsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const params = new URLSearchParams()
      if (filters.status && filters.status !== 'all') params.append('status', filters.status)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await fetch(`/api/receipts?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setReceipts(data.receipts)
      } else {
        console.error('Failed to fetch receipts')
      }
    } catch (error) {
      console.error('Error fetching receipts:', error)
    } finally {
      setReceiptsLoading(false)
    }
  }

  const handleEditReceipt = (receipt: ReceiptData) => {
    setSelectedReceipt(receipt)
    setEditForm({
      vendor_name: receipt.vendor_name || '',
      amount: receipt.amount?.toString() || '',
      date: receipt.date || '',
      category: receipt.category || '',
      description: receipt.description || ''
    })
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedReceipt) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/receipts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id: selectedReceipt.id,
          vendor_name: editForm.vendor_name || null,
          amount: editForm.amount ? parseFloat(editForm.amount) : null,
          date: editForm.date || null,
          category: editForm.category || null,
          description: editForm.description || null
        })
      })

      if (response.ok) {
        await fetchReceipts()
        setIsEditing(false)
        setSelectedReceipt(null)
      } else {
        console.error('Failed to update receipt')
      }
    } catch (error) {
      console.error('Error updating receipt:', error)
    }
  }

  const handleDeleteReceipt = async (receiptId: string) => {
    try {
      setIsDeleting(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/receipts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id: receiptId })
      })

      if (response.ok) {
        // Remove the receipt from local state
        setReceipts(prev => prev.filter(r => r.id !== receiptId))
        setDeleteConfirm(null)
        // Close any open modals if the deleted receipt was selected
        if (selectedReceipt?.id === receiptId) {
          setSelectedReceipt(null)
          setIsEditing(false)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to delete receipt:', errorData)
        alert('Failed to delete receipt. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting receipt:', error)
      alert('An error occurred while deleting the receipt.')
    } finally {
      setIsDeleting(false)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
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
              <span className="ml-2 text-lg sm:text-2xl font-bold text-gray-900 truncate">My Receipts</span>
            </div>
            <div className="mobile-nav">
              {userProfile?.role === 'admin' && (
                <Button variant="outline" onClick={() => router.push('/receipts/pending')} size="sm">
                  <Clock className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Pending Approval</span>
                  <span className="sm:hidden">Pending</span>
                </Button>
              )}
              <Button variant="outline" onClick={() => router.push('/receipts/archived')} size="sm">
                <Archive className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Archived Receipts</span>
                <span className="sm:hidden">Archived</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={fetchReceipts}>Apply Filters</Button>
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
            <p className="text-gray-500">Upload your first receipt to get started.</p>
            <Button className="mt-4" onClick={() => router.push('/upload')}>
              Upload Receipt
            </Button>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditReceipt(receipt)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirm(receipt.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
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
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        receipt.status === 'approved' ? 'bg-green-100 text-green-800' :
                        receipt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        receipt.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {receipt.status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Receipt Detail Modal */}
        {selectedReceipt && !isEditing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-sm sm:max-w-2xl lg:max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">Receipt Details</h2>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => handleEditReceipt(selectedReceipt)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" onClick={() => setDeleteConfirm(selectedReceipt.id)}>
                      <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                      Delete
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedReceipt(null)}>
                      Close
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
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
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        selectedReceipt.status === 'approved' ? 'bg-green-100 text-green-800' :
                        selectedReceipt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedReceipt.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedReceipt.status}
                      </span>
                    </div>
                    
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

        {/* Edit Receipt Modal */}
        {isEditing && selectedReceipt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-sm sm:max-w-lg lg:max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">Edit Receipt</h2>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="vendor_name">Vendor Name</Label>
                    <Input
                      id="vendor_name"
                      value={editForm.vendor_name}
                      onChange={(e) => setEditForm({...editForm, vendor_name: e.target.value})}
                      placeholder="Enter vendor name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={editForm.category} onValueChange={(value) => setEditForm({...editForm, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="food">Food & Dining</SelectItem>
                        <SelectItem value="transportation">Transportation</SelectItem>
                        <SelectItem value="accommodation">Accommodation</SelectItem>
                        <SelectItem value="supplies">Office Supplies</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={editForm.description}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      placeholder="Enter description"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEdit}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-xs sm:max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-auto p-4 sm:p-6">
              <div className="flex justify-center items-center mb-4 text-red-500">
                <AlertTriangle className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Confirm Deletion</h3>
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this receipt? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => handleDeleteReceipt(deleteConfirm)} disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
} 