'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { Upload, FileImage, Loader2, Copy, Download, X, Plus, Check, AlertCircle, Tag, Zap } from 'lucide-react'

interface LineItem {
  description: string
  quantity?: number
  unitPrice?: number
  totalPrice?: number
}

interface OCRResult {
  vendor: string
  amount: number | null
  date: string
  text: string
  success: boolean
  items: LineItem[]
  suggestedCategory: string
  confidence: number
}

interface ReceiptData {
  id: string
  file: File
  preview: string | null
  isProcessing: boolean
  ocrResult: OCRResult | null
  vendor: string
  amount: string
  date: string
  category: string
  description: string
  error: string
}

export default function UploadPage() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const [isProcessingAll, setIsProcessingAll] = useState(false)
  const [isSavingAll, setIsSavingAll] = useState(false)
  const [autoProcessOCR, setAutoProcessOCR] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // File validation
  const validateFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    const maxSize = 10 * 1024 * 1024 // 10MB
    
    if (!allowedTypes.includes(file.type)) {
      return false
    }
    
    if (file.size > maxSize) {
      return false
    }
    
    return true
  }

  // Generate unique ID for receipts
  const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36)

  // Handle file processing
  const processFiles = useCallback(async (files: FileList | File[]) => {
    console.log('processFiles called with files:', files.length, 'autoProcessOCR:', autoProcessOCR)
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(validateFile)
    
    if (validFiles.length === 0) {
      // Show error for invalid files
      setReceipts(prev => [...prev, {
        id: generateId(),
        file: fileArray[0],
        preview: null,
        isProcessing: false,
        ocrResult: null,
        vendor: '',
        amount: '',
        date: '',
        category: '',
        description: '',
        error: 'Invalid file type or size. Please upload images (JPEG, PNG, GIF, WebP) or PDFs under 10MB.'
      }])
      return [] // Return empty array if no valid files
    }

    const newReceipts: ReceiptData[] = validFiles.map(file => {
      const id = generateId()
      let preview: string | null = null
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setReceipts(prev => prev.map(receipt => 
            receipt.id === id 
              ? { ...receipt, preview: e.target?.result as string }
              : receipt
          ))
        }
        reader.readAsDataURL(file)
      }
      
      return {
        id,
        file,
        preview,
        isProcessing: false, // Don't set to processing immediately
        ocrResult: null,
        vendor: '',
        amount: '',
        date: '',
        category: '',
        description: '',
        error: ''
      }
    })
    
    setReceipts(prev => [...prev, ...newReceipts])
    
    // Return the new receipt IDs for auto-processing
    const receiptIds = newReceipts.map(r => r.id)
    console.log('processFiles returning receipt IDs:', receiptIds)
    return receiptIds
  }, [autoProcessOCR])

  // Handle file input change
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      console.log('File select - autoProcessOCR:', autoProcessOCR)
      const receiptIds = await processFiles(files)
      console.log('File select - received receipt IDs:', receiptIds)
    }
  }

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev + 1)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => {
      const newCounter = prev - 1
      if (newCounter === 0) {
        setIsDragOver(false)
      }
      return newCounter
    })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setDragCounter(0)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const receiptIds = await processFiles(files)
      console.log('Drop - received receipt IDs:', receiptIds)
    }
  }, [processFiles])

  // Paste handler for clipboard images
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          files.push(file)
        }
      }
    }
    
    if (files.length > 0) {
      const receiptIds = await processFiles(files)
      console.log('Paste - received receipt IDs:', receiptIds)
    }
  }, [processFiles])

  // Auto-process new receipts when they're added
  useEffect(() => {
    if (!autoProcessOCR) return

    const newReceipts = receipts.filter(r => 
      !r.isProcessing && 
      !r.ocrResult && 
      !r.error && 
      r.file
    )

    newReceipts.forEach(receipt => {
      console.log('useEffect auto-processing receipt:', receipt.id)
      processWithOCR(receipt.id)
    })
  }, [receipts, autoProcessOCR])

  // Set up paste event listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [handlePaste])

  // Prevent default drag behaviors on the entire page
  useEffect(() => {
    const preventDefaults = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const events = ['dragenter', 'dragover', 'dragleave', 'drop']
    events.forEach(eventName => {
      document.addEventListener(eventName, preventDefaults)
    })

    return () => {
      events.forEach(eventName => {
        document.removeEventListener(eventName, preventDefaults)
      })
    }
  }, [])

  // Process single receipt with OCR
  const processWithOCR = async (receiptId: string) => {
    console.log('processWithOCR called for receipt:', receiptId)
    const receipt = receipts.find(r => r.id === receiptId)
    console.log('Found receipt in state:', receipt ? 'YES' : 'NO', receipt?.file?.name)
    
    if (!receipt) {
      console.error('Receipt not found in state for ID:', receiptId)
      return
    }

    console.log('Setting receipt to processing state for:', receiptId)
    setReceipts(prev => prev.map(r => 
      r.id === receiptId 
        ? { ...r, isProcessing: true, error: '' }
        : r
    ))

    try {
      console.log('Starting OCR processing for receipt:', receiptId)
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const base64 = (e.target?.result as string).split(',')[1]
          console.log('Base64 image size:', base64.length)
          
          const response = await fetch('/api/ocr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: base64 }),
          })

          console.log('OCR API response status:', response.status)

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('OCR API error:', errorData)
            throw new Error(`OCR processing failed: ${response.status} ${response.statusText}${errorData.error ? ` - ${errorData.error}` : ''}`)
          }

          const result: OCRResult = await response.json()
          console.log('OCR result:', result)
          
          if (!result.success) {
            throw new Error('OCR processing returned unsuccessful result')
          }
          
          setReceipts(prev => prev.map(r => 
            r.id === receiptId 
              ? { 
                  ...r, 
                  isProcessing: false,
                  ocrResult: result,
                  vendor: result.vendor || '',
                  amount: result.amount?.toString() || '',
                  date: result.date || '',
                  category: result.suggestedCategory || ''
                }
              : r
          ))
        } catch (innerError) {
          console.error('OCR processing inner error:', innerError)
          setReceipts(prev => prev.map(r => 
            r.id === receiptId 
              ? { 
                  ...r, 
                  isProcessing: false,
                  error: `Failed to process receipt: ${innerError instanceof Error ? innerError.message : 'Unknown error'}`
                }
              : r
          ))
        }
      }
      
      reader.onerror = () => {
        console.error('FileReader error for receipt:', receiptId)
        setReceipts(prev => prev.map(r => 
          r.id === receiptId 
            ? { ...r, isProcessing: false, error: 'Failed to read the selected file' }
            : r
        ))
      }
      
      console.log('Starting FileReader for receipt:', receiptId)
      reader.readAsDataURL(receipt.file)
    } catch (err) {
      console.error('OCR processing outer error:', err)
      setReceipts(prev => prev.map(r => 
        r.id === receiptId 
          ? { 
              ...r, 
              isProcessing: false, 
              error: `Processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`
            }
          : r
      ))
    }
  }

  // Process all receipts with OCR
  const processAllWithOCR = async () => {
    setIsProcessingAll(true)
    const unprocessedReceipts = receipts.filter(r => !r.ocrResult && !r.error && !r.isProcessing)
    
    for (const receipt of unprocessedReceipts) {
      await processWithOCR(receipt.id)
    }
    
    setIsProcessingAll(false)
  }

  // Remove receipt
  const removeReceipt = (receiptId: string) => {
    setReceipts(prev => prev.filter(r => r.id !== receiptId))
  }

  // Update receipt field
  const updateReceiptField = (receiptId: string, field: keyof ReceiptData, value: string) => {
    setReceipts(prev => prev.map(r => 
      r.id === receiptId 
        ? { ...r, [field]: value }
        : r
    ))
  }

  // Save all receipts
  const saveAllReceipts = async () => {
    const validReceipts = receipts.filter(r => !r.error && (r.vendor || r.amount || r.date))
    
    if (validReceipts.length === 0) {
      return
    }

    try {
      setIsSavingAll(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      const uploadPromises = validReceipts.map(async (receipt) => {
        const formData = new FormData()
        formData.append('file', receipt.file)
        formData.append('vendor', receipt.vendor)
        formData.append('amount', receipt.amount)
        formData.append('date', receipt.date)
        formData.append('category', receipt.category)
        formData.append('description', receipt.description)
        if (receipt.ocrResult) {
          formData.append('ocrData', JSON.stringify(receipt.ocrResult))
        }

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Upload failed: ${response.status} ${response.statusText}`)
        }

        return await response.json()
      })

      await Promise.all(uploadPromises)
      router.push('/dashboard')

    } catch (err) {
      console.error('Save receipts error:', err)
      // Could add individual error handling per receipt here
    } finally {
      setIsSavingAll(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Receipts</h1>
          <p className="mt-2 text-gray-600">Upload multiple receipts with automatic itemization and category detection</p>
        </div>

        {/* Upload Zone */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Multiple Receipts</CardTitle>
            <CardDescription>
              Drag & drop, paste, or select multiple receipt images (JPG, PNG, PDF)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Auto-process toggle */}
            <div className="mb-6 flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Zap className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Auto-process with OCR</p>
                <p className="text-xs text-blue-700">Automatically extract data from receipts after upload</p>
              </div>
              <Button
                variant={autoProcessOCR ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoProcessOCR(!autoProcessOCR)}
              >
                {autoProcessOCR ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div 
              ref={dropZoneRef}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50 scale-105' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {isDragOver ? (
                <div className="space-y-4">
                  <Download className="h-16 w-16 text-blue-500 mx-auto animate-bounce" />
                  <p className="text-blue-600 font-medium text-lg">Drop your files here!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <FileImage className="h-16 w-16 text-gray-400 mx-auto" />
                  <div className="space-y-2">
                    <p className="text-gray-600 text-lg">
                      <strong>Drag & drop</strong> multiple receipts here
                    </p>
                    <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
                      <Copy className="h-4 w-4" />
                      or paste from clipboard (Ctrl+V)
                    </p>
                    <div className="pt-4">
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        size="lg"
                      >
                        <Upload className="h-5 w-5 mr-2" />
                        Browse Files
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {receipts.length > 0 && (
              <div className="mt-6 flex gap-3">
                <Button 
                  onClick={processAllWithOCR}
                  disabled={isProcessingAll || receipts.every(r => r.ocrResult || r.error || r.isProcessing)}
                  className="flex-1"
                  variant="outline"
                >
                  {isProcessingAll ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing All...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Process Remaining with OCR
                    </>
                  )}
                </Button>
                <Button 
                  onClick={saveAllReceipts}
                  disabled={isSavingAll || receipts.length === 0 || receipts.every(r => r.error)}
                  variant="default"
                  className="flex-1"
                >
                  {isSavingAll ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving All...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save All Receipts ({receipts.filter(r => !r.error).length})
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receipt Cards */}
        {receipts.length > 0 && (
          <div className="space-y-6">
            {receipts.map((receipt) => (
              <Card key={receipt.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{receipt.file.name}</CardTitle>
                      {receipt.ocrResult && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">
                            {receipt.ocrResult.suggestedCategory}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({Math.round(receipt.ocrResult.confidence * 100)}% confidence)
                          </span>
                        </div>
                      )}
                      {receipt.isProcessing && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                          <span className="text-sm text-blue-600">Processing...</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeReceipt(receipt.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription>
                    {(receipt.file.size / 1024 / 1024).toFixed(2)} MB
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Preview Section */}
                    <div className="space-y-4">
                      {receipt.preview ? (
                        <img 
                          src={receipt.preview} 
                          alt="Receipt preview" 
                          className="w-full max-h-64 object-contain rounded border"
                        />
                      ) : receipt.file.type === 'application/pdf' ? (
                        <div className="w-full h-64 bg-red-50 border border-red-200 rounded flex items-center justify-center">
                          <div className="text-center">
                            <FileImage className="h-12 w-12 text-red-600 mx-auto mb-2" />
                            <p className="text-sm text-red-700 font-medium">PDF File</p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-64 bg-gray-100 border rounded flex items-center justify-center">
                          <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                        </div>
                      )}
                      
                      {!autoProcessOCR && (
                        <Button 
                          onClick={() => processWithOCR(receipt.id)}
                          disabled={receipt.isProcessing || !!receipt.ocrResult}
                          className="w-full"
                          size="sm"
                        >
                          {receipt.isProcessing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : receipt.ocrResult ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Processed
                            </>
                          ) : (
                            'Process with OCR'
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Form Section */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`vendor-${receipt.id}`}>Vendor Name</Label>
                        <Input
                          id={`vendor-${receipt.id}`}
                          value={receipt.vendor}
                          onChange={(e) => updateReceiptField(receipt.id, 'vendor', e.target.value)}
                          placeholder="Enter vendor name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`amount-${receipt.id}`}>Amount</Label>
                        <Input
                          id={`amount-${receipt.id}`}
                          type="number"
                          step="0.01"
                          value={receipt.amount}
                          onChange={(e) => updateReceiptField(receipt.id, 'amount', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`date-${receipt.id}`}>Date</Label>
                        <Input
                          id={`date-${receipt.id}`}
                          type="date"
                          value={receipt.date}
                          onChange={(e) => updateReceiptField(receipt.id, 'date', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`category-${receipt.id}`}>Category</Label>
                        <Input
                          id={`category-${receipt.id}`}
                          value={receipt.category}
                          onChange={(e) => updateReceiptField(receipt.id, 'category', e.target.value)}
                          placeholder="e.g., Meals, Travel, Office Supplies"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`description-${receipt.id}`}>Description</Label>
                        <Textarea
                          id={`description-${receipt.id}`}
                          value={receipt.description}
                          onChange={(e) => updateReceiptField(receipt.id, 'description', e.target.value)}
                          placeholder="Additional notes"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Itemization Section */}
                    <div className="space-y-4">
                      <div>
                        <Label>Itemized Details</Label>
                        {receipt.ocrResult?.items && receipt.ocrResult.items.length > 0 ? (
                          <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                            {receipt.ocrResult.items.map((item, index) => (
                              <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                                <div className="font-medium">{item.description}</div>
                                <div className="text-gray-600 text-xs mt-1">
                                  {item.quantity && `Qty: ${item.quantity}`}
                                  {item.unitPrice && ` • Unit: $${item.unitPrice.toFixed(2)}`}
                                  {item.totalPrice && ` • Total: $${item.totalPrice.toFixed(2)}`}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : receipt.ocrResult ? (
                          <p className="text-sm text-gray-500 mt-2">No itemized details found</p>
                        ) : receipt.isProcessing ? (
                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Extracting items...
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 mt-2">
                            {autoProcessOCR ? "Processing..." : "Process with OCR to see itemized details"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {receipt.error && (
                    <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {receipt.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 