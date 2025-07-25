import { GoogleAuth } from 'google-auth-library'
import path from 'path'
import fs from 'fs'

// Initialize Google Auth with service account
const serviceAccountPath = path.join(process.cwd(), 'env/journal-448a1-33f9045e5f96.json')

// Validate service account file exists
if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Google service account file not found at: ${serviceAccountPath}`)
}

const auth = new GoogleAuth({
  keyFilename: serviceAccountPath,
  scopes: ['https://www.googleapis.com/auth/cloud-vision'],
})

export async function processImageWithVision(imageBase64: string): Promise<any> {
  try {
    if (!imageBase64) {
      throw new Error('No image data provided')
    }

    console.log('Initializing Google Vision client...')
    const client = await auth.getClient()
    const projectId = await auth.getProjectId()
    
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