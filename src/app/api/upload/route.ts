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

export async function POST(request: NextRequest) {
  try {
    console.log('Upload API called')
    
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
    const file = formData.get('file') as File
    const vendor = formData.get('vendor') as string
    const amount = formData.get('amount') as string
    const date = formData.get('date') as string
    const category = formData.get('category') as string
    const description = formData.get('description') as string
    const ocrData = formData.get('ocrData') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // Validate file
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only image and PDF files are allowed' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const fileName = `${user.id}/${timestamp}-${randomSuffix}.${fileExt}`

    console.log('Uploading file as:', fileName)

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
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    console.log('File uploaded successfully:', uploadData)

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('receipts')
      .getPublicUrl(fileName)

    console.log('Public URL:', publicUrl)

    // Parse OCR data if provided
    let parsedOcrData = null
    if (ocrData) {
      try {
        parsedOcrData = JSON.parse(ocrData)
        console.log('Parsed OCR data:', {
          vendor: parsedOcrData.vendor,
          amount: parsedOcrData.amount,
          itemsCount: parsedOcrData.items?.length || 0,
          suggestedCategory: parsedOcrData.suggestedCategory,
          confidence: parsedOcrData.confidence
        })
      } catch (e) {
        console.warn('Failed to parse OCR data:', e)
      }
    }

    // Use OCR-suggested category if no category provided
    const finalCategory = category || (parsedOcrData?.suggestedCategory) || null

    // Save receipt data to database using service role
    const receiptData = {
      user_id: user.id,
      file_url: publicUrl,
      file_name: file.name,
      vendor_name: vendor || null,
      amount: amount ? parseFloat(amount) : null,
      date: date || null,
      category: finalCategory,
      description: description || null,
      ocr_data: parsedOcrData,
      status: 'pending' as const
    }

    console.log('Saving receipt data:', {
      ...receiptData,
      ocr_data: parsedOcrData ? 'OCR data present' : 'No OCR data'
    })

    const { data: insertData, error: dbError } = await supabaseAdmin
      .from('receipts')
      .insert(receiptData)
      .select()

    if (dbError) {
      console.error('Database error:', dbError)
      
      // Clean up uploaded file
      try {
        await supabaseAdmin.storage.from('receipts').remove([fileName])
        console.log('Cleaned up uploaded file after database error')
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', cleanupError)
      }

      return NextResponse.json(
        { error: `Failed to save receipt: ${dbError.message}` },
        { status: 500 }
      )
    }

    console.log('Receipt saved successfully:', insertData[0].id)

    return NextResponse.json({
      success: true,
      receipt: insertData[0],
      message: 'Receipt uploaded and saved successfully'
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 