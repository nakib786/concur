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
import { FileText, ArrowLeft, Plus, Eye, Send, DollarSign, Calendar, User, CheckCircle, XCircle, Clock } from 'lucide-react'

interface ReceiptData {
  id: string
  vendor_name: string | null
  amount: number | null
  date: string | null
  file_url: string
}

interface ExpenseReport {
  id: string
  title: string
  description: string | null
  total_amount: number
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  submitted_at: string | null
  created_at: string
  expense_report_items: {
    id: string
    receipt_id: string
    receipts: ReceiptData
  }[]
}

export default function ReportsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<ExpenseReport[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [receipts, setReceipts] = useState<ReceiptData[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ExpenseReport | null>(null)
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    selectedReceiptIds: [] as string[]
  })
  const [filters, setFilters] = useState({
    status: 'all'
  })
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
      } else {
        setUser(user)
        await Promise.all([fetchReports(), fetchAvailableReceipts()])
      }
      setLoading(false)
    }

    getUser()
  }, [router])

  const fetchReports = async () => {
    try {
      setReportsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const params = new URLSearchParams()
      if (filters.status && filters.status !== 'all') params.append('status', filters.status)

      const response = await fetch(`/api/reports?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setReports(data.reports)
      } else {
        console.error('Failed to fetch reports')
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setReportsLoading(false)
    }
  }

  const fetchAvailableReceipts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/receipts?status=processed', {
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
    }
  }

  const handleCreateReport = async () => {
    if (!createForm.title || createForm.selectedReceiptIds.length === 0) {
      alert('Please provide a title and select at least one receipt')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description,
          receiptIds: createForm.selectedReceiptIds
        })
      })

      if (response.ok) {
        await fetchReports()
        setShowCreateForm(false)
        setCreateForm({ title: '', description: '', selectedReceiptIds: [] })
      } else {
        console.error('Failed to create report')
        alert('Failed to create report')
      }
    } catch (error) {
      console.error('Error creating report:', error)
      alert('Error creating report')
    }
  }

  const handleSubmitReport = async (reportId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/reports', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id: reportId,
          status: 'submitted'
        })
      })

      if (response.ok) {
        await fetchReports()
      } else {
        console.error('Failed to submit report')
        alert('Failed to submit report')
      }
    } catch (error) {
      console.error('Error submitting report:', error)
      alert('Error submitting report')
    }
  }

  const toggleReceiptSelection = (receiptId: string) => {
    setCreateForm(prev => ({
      ...prev,
      selectedReceiptIds: prev.selectedReceiptIds.includes(receiptId)
        ? prev.selectedReceiptIds.filter(id => id !== receiptId)
        : [...prev.selectedReceiptIds, receiptId]
    }))
  }

  const getSelectedReceiptsTotal = () => {
    return receipts
      .filter(receipt => createForm.selectedReceiptIds.includes(receipt.id))
      .reduce((total, receipt) => total + (receipt.amount || 0), 0)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'submitted':
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <FileText className="h-5 w-5 text-gray-600" />
    }
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
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
              <span className="ml-2 text-lg sm:text-2xl font-bold text-gray-900 truncate">Expense Reports</span>
            </div>
            <Button onClick={() => setShowCreateForm(true)} size="sm" className="flex-shrink-0">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Create Report</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchReports}>Apply Filters</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        {reportsLoading ? (
          <div className="text-center py-8">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No expense reports found</h3>
            <p className="text-gray-500">Create your first expense report to get started.</p>
            <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Report
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {getStatusIcon(report.status)}
                        {report.title}
                      </CardTitle>
                      <CardDescription>
                        Created {formatDate(report.created_at)} • {report.expense_report_items.length} receipts
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(report.total_amount)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        report.status === 'approved' ? 'bg-green-100 text-green-800' :
                        report.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        report.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <p className="text-gray-600">{report.description || 'No description'}</p>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReport(report)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {report.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => handleSubmitReport(report.id)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Submit
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Report Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-sm sm:max-w-2xl lg:max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">Create Expense Report</h2>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="title">Report Title</Label>
                    <Input
                      id="title"
                      value={createForm.title}
                      onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                      placeholder="Enter report title"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={createForm.description}
                      onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                      placeholder="Enter report description"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label>Select Receipts</Label>
                    <div className="mt-2 max-h-60 overflow-y-auto border rounded-lg">
                      {receipts.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No processed receipts available. Upload and process receipts first.
                        </div>
                      ) : (
                        <div className="space-y-2 p-2">
                          {receipts.map((receipt) => (
                            <div
                              key={receipt.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                createForm.selectedReceiptIds.includes(receipt.id)
                                  ? 'bg-blue-50 border-blue-300'
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                              onClick={() => toggleReceiptSelection(receipt.id)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium">{receipt.vendor_name || 'Unknown Vendor'}</p>
                                  <p className="text-sm text-gray-600">{formatDate(receipt.date)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-green-600">
                                    {formatCurrency(receipt.amount || 0)}
                                  </p>
                                  <input
                                    type="checkbox"
                                    checked={createForm.selectedReceiptIds.includes(receipt.id)}
                                    onChange={() => toggleReceiptSelection(receipt.id)}
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {createForm.selectedReceiptIds.length > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Amount:</span>
                        <span className="text-xl font-bold text-green-600">
                          {formatCurrency(getSelectedReceiptsTotal())}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {createForm.selectedReceiptIds.length} receipt(s) selected
                      </p>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateReport}>
                      Create Report
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Report Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-sm sm:max-w-2xl lg:max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">Report Details</h2>
                  <Button variant="outline" onClick={() => setSelectedReport(null)}>
                    Close
                  </Button>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>Title</Label>
                      <p className="text-lg font-medium">{selectedReport.title}</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedReport.status)}
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          selectedReport.status === 'approved' ? 'bg-green-100 text-green-800' :
                          selectedReport.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          selectedReport.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedReport.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label>Total Amount</Label>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(selectedReport.total_amount)}
                      </p>
                    </div>
                    <div>
                      <Label>Created</Label>
                      <p className="text-lg">{formatDate(selectedReport.created_at)}</p>
                    </div>
                  </div>
                  
                  {selectedReport.description && (
                    <div>
                      <Label>Description</Label>
                      <p className="text-lg">{selectedReport.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label>Receipts ({selectedReport.expense_report_items.length})</Label>
                    <div className="mt-2 space-y-3">
                      {selectedReport.expense_report_items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <img 
                              src={item.receipts.file_url} 
                              alt="Receipt"
                              className="w-12 h-12 object-cover rounded border"
                            />
                            <div>
                              <p className="font-medium">{item.receipts.vendor_name || 'Unknown Vendor'}</p>
                              <p className="text-sm text-gray-600">{formatDate(item.receipts.date)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-green-600">
                              {formatCurrency(item.receipts.amount || 0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
} 