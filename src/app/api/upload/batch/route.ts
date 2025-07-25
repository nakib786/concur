import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { ensureUserProfile } from '@/lib/profile-utils'

// Use service role key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for file uploads')
}

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

interface BatchReceiptData {
  file: File
  vendor: string
  amount: string
  date: string
  category: string
  description: string
  ocrData?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('Batch upload API called')
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    console.log('User authenticated:', user.id)

    // Ensure user profile exists
    try {
      await ensureUserProfile(user.id, user.email!, user.user_metadata)
    } catch (profileError) {
      console.error('Failed to ensure user profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to create user profile. Please contact support.' },
        { status: 500 }
      )
    }

    // Parse the form data
    const formData = await request.formData()
    
    // Extract batch data - expecting JSON string with receipt data
    const batchDataStr = formData.get('batchData') as string
    if (!batchDataStr) {
      return NextResponse.json({ error: 'No batch data provided' }, { status: 400 })
    }

    let batchData: BatchReceiptData[]
    try {
      batchData = JSON.parse(batchDataStr)
    } catch (e) {
      return NextResponse.json({ error: 'Invalid batch data format' }, { status: 400 })
    }

    if (!Array.isArray(batchData) || batchData.length === 0) {
      return NextResponse.json({ error: 'Batch data must be a non-empty array' }, { status: 400 })
    }

    console.log(`Processing batch of ${batchData.length} receipts`)

    const results = []
    const errors = []

    // Process each receipt
    for (let i = 0; i < batchData.length; i++) {
      const receiptData = batchData[i]
      const file = formData.get(`file_${i}`) as File

      if (!file) {
        errors.push({ index: i, error: 'No file provided' })
        continue
      }

      try {
        // Validate file
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          throw new Error('Only image and PDF files are allowed')
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
          throw new Error('File size must be less than 10MB')
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop()?.toLowerCase()
        const timestamp = Date.now()
        const randomSuffix = Math.random().toString(36).substring(2, 8)
        const fileName = `${user.id}/${timestamp}-${i}-${randomSuffix}.${fileExt}`

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer())

        // Upload file using service role (bypasses RLS)
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('receipts')
          .upload(fileName, buffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('receipts')
          .getPublicUrl(fileName)

        // Parse OCR data if provided
        let parsedOcrData = null
        if (receiptData.ocrData) {
          try {
            parsedOcrData = JSON.parse(receiptData.ocrData)
          } catch (e) {
            console.warn(`Failed to parse OCR data for receipt ${i}:`, e)
          }
        }

        // Use OCR-suggested category if no category provided
        const finalCategory = receiptData.category || (parsedOcrData?.suggestedCategory) || null

        // Save receipt data to database
        const dbReceiptData = {
          user_id: user.id,
          file_url: publicUrl,
          file_name: file.name,
          vendor_name: receiptData.vendor || null,
          amount: receiptData.amount ? parseFloat(receiptData.amount) : null,
          date: receiptData.date || null,
          category: finalCategory,
          description: receiptData.description || null,
          ocr_data: parsedOcrData,
          status: 'pending' as const
        }

        const { data: insertData, error: dbError } = await supabaseAdmin
          .from('receipts')
          .insert(dbReceiptData)
          .select()

        if (dbError) {
          // Clean up uploaded file
          try {
            await supabaseAdmin.storage.from('receipts').remove([fileName])
          } catch (cleanupError) {
            console.warn('Failed to cleanup uploaded file:', cleanupError)
          }
          throw new Error(`Database error: ${dbError.message}`)
        }

        results.push({
          index: i,
          success: true,
          receipt: insertData[0]
        })

        console.log(`Receipt ${i + 1}/${batchData.length} processed successfully`)

      } catch (error) {
        console.error(`Error processing receipt ${i}:`, error)
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`Batch processing complete: ${results.length} successful, ${errors.length} errors`)

    return NextResponse.json({
      success: true,
      results,
      errors,
      summary: {
        total: batchData.length,
        successful: results.length,
        failed: errors.length
      }
    })

  } catch (error) {
    console.error('Batch upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 