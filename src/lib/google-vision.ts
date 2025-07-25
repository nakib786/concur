import { GoogleAuth } from 'google-auth-library'
import path from 'path'
import fs from 'fs'

// Initialize Google Auth with service account
// This will be initialized lazily to avoid build-time errors
let auth: GoogleAuth | null = null

function initializeAuth(): GoogleAuth {
  if (auth) return auth

  // Try service account file first (for local development)
  const serviceAccountPath = path.join(process.cwd(), 'env/journal-448a1-33f9045e5f96.json')
  
  if (fs.existsSync(serviceAccountPath)) {
    auth = new GoogleAuth({
      keyFilename: serviceAccountPath,
      scopes: ['https://www.googleapis.com/auth/cloud-vision'],
    })
    return auth
  }

  // Try environment variables (for production)
  if (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_PRIVATE_KEY && process.env.GOOGLE_CLOUD_CLIENT_EMAIL) {
    auth = new GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      },
      scopes: ['https://www.googleapis.com/auth/cloud-vision'],
    })
    return auth
  }

  // If no credentials are available, throw an error
  throw new Error('Google Vision API credentials not configured. Please set up service account file or environment variables (GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_PRIVATE_KEY, GOOGLE_CLOUD_CLIENT_EMAIL).')
}

export async function processImageWithVision(imageBase64: string): Promise<any> {
  try {
    if (!imageBase64) {
      throw new Error('No image data provided')
    }

    console.log('Initializing Google Vision client...')
    console.log('Base64 image length:', imageBase64.length)
    
    // Validate base64 format before sending to API
    try {
      // Test if we can decode the base64 string
      const buffer = Buffer.from(imageBase64, 'base64')
      if (buffer.length === 0) {
        throw new Error('Invalid base64 data - decoded to empty buffer')
      }
      console.log('Base64 validation passed, decoded buffer size:', buffer.length)
    } catch (decodeError) {
      throw new Error(`Invalid base64 format: ${decodeError}`)
    }
    
    // Initialize auth lazily
    const authInstance = initializeAuth()
    const client = await authInstance.getClient()
    const projectId = await authInstance.getProjectId()
    
    console.log('Using project ID:', projectId)
    
    const url = `https://vision.googleapis.com/v1/images:annotate`
    
    const requestBody = {
      requests: [
        {
          image: {
            content: imageBase64,
          },
          features: [
            {
              type: 'DOCUMENT_TEXT_DETECTION',
              maxResults: 1,
            },
          ],
        },
      ],
    }

    console.log('Making request to Google Vision API...')
    const response = await client.request({
      url,
      method: 'POST',
      data: requestBody,
    })

    console.log('Google Vision API response status:', response.status)
    
    if (response.status !== 200) {
      throw new Error(`Google Vision API returned status ${response.status}: ${response.statusText}`)
    }

    // Check for API errors in the response
    const responseData = response.data as any
    if (responseData.responses && responseData.responses[0]?.error) {
      const apiError = responseData.responses[0].error
      throw new Error(`Google Vision API error: ${apiError.message || 'Unknown API error'}`)
    }

    return responseData
  } catch (error) {
    console.error('Google Vision API error details:', error)
    
    if (error instanceof Error) {
      // Re-throw with more context
      if (error.message.includes('authentication')) {
        throw new Error('Google Vision API authentication failed. Please check your service account credentials.')
      } else if (error.message.includes('quota')) {
        throw new Error('Google Vision API quota exceeded. Please check your usage limits.')
      } else if (error.message.includes('permission')) {
        throw new Error('Insufficient permissions for Google Vision API. Please check your service account permissions.')
      } else if (error.message.includes('ENOENT')) {
        throw new Error('Google service account file not found. Please check the file path.')
      }
    }
    
    throw error
  }
} 