'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { Receipt, ArrowLeft, RotateCcw, Trash2, AlertTriangle, Archive, DollarSign, Tag, Calendar, Eye } from 'lucide-react'

interface ArchivedReceiptData {
  id: string
  file_url: string
  file_name: string
  vendor_name: string | null
  amount: number | null
  date: string | null
  category: string | null
  description: string | null
  status: 'pending' | 'processed' | 'error'
  archived_at: string
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

export default function ArchivedReceiptsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [receipts, setReceipts] = useState<ArchivedReceiptData[]>([])
  const [receiptsLoading, setReceiptsLoading] = useState(true)
  const [selectedReceipt, setSelectedReceipt] = useState<ArchivedReceiptData | null>(null)
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
      } else {
        setUser(user)
        await fetchArchivedReceipts()
      }
      setLoading(false)
    }

    getUser()
  }, [router])

  const fetchArchivedReceipts = async () => {
    try {
      setReceiptsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/receipts/archived', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setReceipts(data.receipts)
      } else {
        console.error('Failed to fetch archived receipts')
      }
    } catch (error) {
      console.error('Error fetching archived receipts:', error)
    } finally {
      setReceiptsLoading(false)
    }
  }

  const handleRestoreReceipt = async (receiptId: string) => {
    try {
      setIsRestoring(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/receipts/archived', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id: receiptId })
      })

      if (response.ok) {
        // Remove the receipt from archived list
        setReceipts(prev => prev.filter(r => r.id !== receiptId))
        setRestoreConfirm(null)
        // Close modal if the restored receipt was being viewed
        if (selectedReceipt?.id === receiptId) {
          setSelectedReceipt(null)
        }
        alert('Receipt restored successfully!')
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to restore receipt:', errorData)
        alert('Failed to restore receipt. Please try again.')
      }
    } catch (error) {
      console.error('Error restoring receipt:', error)
      alert('An error occurred while restoring the receipt.')
    } finally {
      setIsRestoring(false)
    }
  }

  const handlePermanentDelete = async (receiptId: string) => {
    try {
      setIsDeleting(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/receipts/archived', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id: receiptId })
      })

      if (response.ok) {
        // Remove the receipt from archived list
        setReceipts(prev => prev.filter(r => r.id !== receiptId))
        setDeleteConfirm(null)
        // Close modal if the deleted receipt was being viewed
        if (selectedReceipt?.id === receiptId) {
          setSelectedReceipt(null)
        }
        alert('Receipt permanently deleted!')
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to permanently delete receipt:', errorData)
        alert('Failed to permanently delete receipt. Please try again.')
      }
    } catch (error) {
      console.error('Error permanently deleting receipt:', error)
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

  const getDaysRemaining = (archivedAt: string) => {
    const archivedDate = new Date(archivedAt)
    const expiryDate = new Date(archivedDate)
    expiryDate.setDate(expiryDate.getDate() + 30)
    const today = new Date()
    const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, daysRemaining)
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
              <Button variant="ghost" onClick={() => router.push('/receipts')} className="mr-4">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Archive className="h-8 w-8 text-orange-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">Archived Receipts</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  Archived receipts are automatically deleted after 30 days
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  You can restore receipts to your active list or permanently delete them before the 30-day period expires.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Archived Receipts Grid */}
        {receiptsLoading ? (
          <div className="text-center py-8">Loading archived receipts...</div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-8">
            <Archive className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No archived receipts</h3>
            <p className="text-gray-500">Deleted receipts will appear here for 30 days before permanent deletion.</p>
            <Button className="mt-4" onClick={() => router.push('/receipts')}>
              Back to Receipts
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {receipts.map((receipt) => {
              const daysRemaining = getDaysRemaining(receipt.archived_at)
              return (
                <Card key={receipt.id} className="hover:shadow-lg transition-shadow border-orange-200">
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
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRestoreConfirm(receipt.id)}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(receipt.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
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
                        <Calendar className="h-4 w-4 text-orange-600 mr-2" />
                        <span className="text-orange-700">
                          {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expires today'}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="text-xs text-gray-500">
                          Archived: {formatDate(receipt.archived_at)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Receipt Detail Modal */}
        {selectedReceipt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">Archived Receipt Details</h2>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setRestoreConfirm(selectedReceipt.id)}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setDeleteConfirm(selectedReceipt.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Permanently
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
                        selectedReceipt.status === 'processed' ? 'bg-green-100 text-green-800' :
                        selectedReceipt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedReceipt.status}
                      </span>
                    </div>
                    <div>
                      <Label>Archive Status</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        <span className="text-orange-700">
                          {getDaysRemaining(selectedReceipt.archived_at) > 0 
                            ? `${getDaysRemaining(selectedReceipt.archived_at)} days remaining` 
                            : 'Expires today'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Archived: {formatDate(selectedReceipt.archived_at)}
                      </p>
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

        {/* Restore Confirmation Modal */}
        {restoreConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-center items-center mb-4 text-green-500">
                <RotateCcw className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Restore Receipt</h3>
              <p className="text-gray-700 mb-4">
                Are you sure you want to restore this receipt? It will be moved back to your active receipts.
              </p>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setRestoreConfirm(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleRestoreReceipt(restoreConfirm)} 
                  disabled={isRestoring}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isRestoring ? 'Restoring...' : 'Restore'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Permanent Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-center items-center mb-4 text-red-500">
                <AlertTriangle className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Permanent Deletion</h3>
              <p className="text-gray-700 mb-4">
                <strong>Warning:</strong> This will permanently delete the receipt and its file. This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handlePermanentDelete(deleteConfirm)} 
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
} 