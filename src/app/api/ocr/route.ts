import { NextRequest, NextResponse } from 'next/server'
import { processImageWithVision } from '@/lib/google-vision'

// Category mappings based on vendors and items
const CATEGORY_MAPPINGS = {
  // Vendor-based categories
  vendors: {
    'mcdonalds': 'Meals & Entertainment',
    'mcdonald': 'Meals & Entertainment',
    'starbucks': 'Meals & Entertainment',
    'subway': 'Meals & Entertainment',
    'pizza': 'Meals & Entertainment',
    'restaurant': 'Meals & Entertainment',
    'cafe': 'Meals & Entertainment',
    'kfc': 'Meals & Entertainment',
    'burger king': 'Meals & Entertainment',
    'taco bell': 'Meals & Entertainment',
    'dominos': 'Meals & Entertainment',
    'chipotle': 'Meals & Entertainment',
    'panera': 'Meals & Entertainment',
    'dunkin': 'Meals & Entertainment',
    'uber': 'Transportation',
    'lyft': 'Transportation',
    'taxi': 'Transportation',
    'gas': 'Transportation',
    'shell': 'Transportation',
    'exxon': 'Transportation',
    'mobil': 'Transportation',
    'chevron': 'Transportation',
    'bp': 'Transportation',
    'citgo': 'Transportation',
    'hotel': 'Lodging',
    'marriott': 'Lodging',
    'hilton': 'Lodging',
    'holiday inn': 'Lodging',
    'hyatt': 'Lodging',
    'airbnb': 'Lodging',
    'motel': 'Lodging',
    'staples': 'Office Supplies',
    'office depot': 'Office Supplies',
    'best buy': 'Technology',
    'apple': 'Technology',
    'microsoft': 'Technology',
    'amazon': 'Office Supplies',
    'walmart': 'Office Supplies',
    'target': 'Office Supplies',
    'costco': 'Office Supplies',
    'pharmacy': 'Healthcare',
    'cvs': 'Healthcare',
    'walgreens': 'Healthcare',
    'rite aid': 'Healthcare'
  },
  // Item-based categories
  items: {
    'coffee': 'Meals & Entertainment',
    'lunch': 'Meals & Entertainment',
    'dinner': 'Meals & Entertainment',
    'breakfast': 'Meals & Entertainment',
    'meal': 'Meals & Entertainment',
    'food': 'Meals & Entertainment',
    'drink': 'Meals & Entertainment',
    'beverage': 'Meals & Entertainment',
    'sandwich': 'Meals & Entertainment',
    'burger': 'Meals & Entertainment',
    'pizza': 'Meals & Entertainment',
    'salad': 'Meals & Entertainment',
    'gas': 'Transportation',
    'gasoline': 'Transportation',
    'fuel': 'Transportation',
    'parking': 'Transportation',
    'toll': 'Transportation',
    'taxi': 'Transportation',
    'uber': 'Transportation',
    'flight': 'Transportation',
    'airline': 'Transportation',
    'hotel': 'Lodging',
    'room': 'Lodging',
    'accommodation': 'Lodging',
    'pen': 'Office Supplies',
    'paper': 'Office Supplies',
    'notebook': 'Office Supplies',
    'printer': 'Office Supplies',
    'ink': 'Office Supplies',
    'supplies': 'Office Supplies',
    'computer': 'Technology',
    'laptop': 'Technology',
    'phone': 'Technology',
    'software': 'Technology',
    'electronics': 'Technology',
    'medicine': 'Healthcare',
    'prescription': 'Healthcare',
    'medical': 'Healthcare',
    'pharmacy': 'Healthcare',
    'conference': 'Training & Education',
    'training': 'Training & Education',
    'seminar': 'Training & Education',
    'course': 'Training & Education',
    'workshop': 'Training & Education'
  }
}

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

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    if (typeof image !== 'string') {
      return NextResponse.json({ error: 'Image must be a base64 string' }, { status: 400 })
    }

    // Validate base64 format
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
    if (!base64Regex.test(image)) {
      return NextResponse.json({ error: 'Invalid base64 format' }, { status: 400 })
    }

    // Use Google service account authentication
    const data = await processImageWithVision(image)
    
    const textAnnotations = data.responses[0]?.textAnnotations

    if (!textAnnotations || textAnnotations.length === 0) {
      return NextResponse.json({ 
        vendor: '',
        amount: null,
        date: '',
        text: '',
        items: [],
        suggestedCategory: 'Other',
        confidence: 0,
        success: true 
      })
    }

    const fullText = textAnnotations[0].description
    
    // Extract information using enhanced parsing
    const extractedData = extractReceiptInfo(fullText)

    return NextResponse.json({
      ...extractedData,
      text: fullText,
      success: true,
    })
  } catch (error) {
    console.error('OCR processing error:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to process image'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('authentication')) {
        errorMessage = 'Authentication failed with Google Vision API'
        statusCode = 401
      } else if (error.message.includes('quota')) {
        errorMessage = 'Google Vision API quota exceeded'
        statusCode = 429
      } else if (error.message.includes('permission') || error.message.includes('billing')) {
        errorMessage = 'Google Vision API billing not enabled. Please enable billing on your Google Cloud project.'
        statusCode = 403
      } else {
        errorMessage = `OCR processing failed: ${error.message}`
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}

function extractReceiptInfo(text: string): Omit<OCRResult, 'text' | 'success'> {
  
  // Clean up text for better processing
  const cleanText = text.replace(/\n+/g, '\n').trim()
  const lines = cleanText.split('\n').filter(line => line.trim().length > 0)
  
  // Extract basic information first
  const basicInfo = extractBasicInfo(text, lines)
  
  // Extract itemized line items
  const items = extractLineItems(lines)
  
  // Determine category based on vendor and items
  const categoryResult = determineCategoryFromContext(basicInfo.vendor, items, text)
  
  return {
    ...basicInfo,
    items,
    suggestedCategory: categoryResult.category,
    confidence: categoryResult.confidence
  }
}

function extractBasicInfo(text: string, lines: string[]) {
  // Extract amount - improved patterns for various formats including Euro
  const amountPatterns = [
    // McDonald's specific "IN Total (incl VAT)" pattern
    /in\s+total\s*\(incl\s+vat\)\s*[€\$]?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/gi,
    // European "IN Total" pattern
    /in\s+total[:\s]*[€\$]?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/gi,
    // Total with amount (most reliable) - including Euro
    /(?:total|grand total|amount due)[:\s]*[€\$]?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/gi,
    // Amount with total
    /[€\$]?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)\s*(?:total|grand total)/gi,
    // Subtotal patterns
    /(?:subtotal|sub total)[:\s]*[€\$]?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/gi,
    // Balance or amount due
    /(?:balance|amount due|due)[:\s]*[€\$]?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/gi,
    // Look for amounts at the end of lines (likely totals)
    /\s+(\d{1,3}\.?\d{0,2})\s*$/gm,
    // Currency symbol followed by amount (Euro and Dollar)
    /[€\$](\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/g,
    // Amount followed by currency symbol
    /(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)\s*[€\$]/g
  ]
  
  let amount = null
  let foundAmounts: number[] = []
  
  for (const pattern of amountPatterns) {
    let match
    const regex = new RegExp(pattern.source, pattern.flags)
    while ((match = regex.exec(text)) !== null) {
      const amountStr = match[1]?.replace(/,/g, '')
      if (amountStr) {
        const parsedAmount = parseFloat(amountStr)
        if (parsedAmount > 0 && parsedAmount < 50000) { // Reasonable range
          foundAmounts.push(parsedAmount)
        }
      }
    }
    if (foundAmounts.length > 0) break
  }
  
  // For McDonald's receipts, look for the last reasonable amount on the receipt
  // This is often the total
  if (foundAmounts.length === 0) {
    const linesReversed = lines.slice().reverse()
    
    for (const line of linesReversed) {
      // Look for amounts at the end of lines
      const lineAmountMatch = line.match(/(\d{1,3}\.?\d{0,2})\s*$/)
      if (lineAmountMatch) {
        const parsedAmount = parseFloat(lineAmountMatch[1])
        if (parsedAmount > 0 && parsedAmount < 1000) {
          foundAmounts.push(parsedAmount)
        }
      }
    }
  }
  
  // Use the largest reasonable amount found (likely to be the total)
  if (foundAmounts.length > 0) {
    // For receipts with multiple amounts, prefer amounts > 2.00 as they're more likely to be totals
    const significantAmounts = foundAmounts.filter(amt => amt >= 2.0)
    if (significantAmounts.length > 0) {
      amount = Math.max(...significantAmounts)
    } else {
      amount = Math.max(...foundAmounts)
    }
  }

  // Extract date - improved patterns for various formats including European DD/MM/YYYY
  const datePatterns = [
    // DD/MM/YYYY HH:MM:SS (European format with time)
    /(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2})/g,
    // DD/MM/YYYY (European format)
    /(\d{1,2}\/\d{1,2}\/\d{4})/g,
    // MM/DD/YYYY, DD/MM/YYYY, MM-DD-YYYY, DD-MM-YYYY
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
    // YYYY/MM/DD, YYYY-MM-DD
    /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g,
    // Month DD, YYYY
    /(\w{3,9}\s+\d{1,2},?\s+\d{4})/g,
    // DD Month YYYY
    /(\d{1,2}\s+\w{3,9}\s+\d{4})/g,
    // Month DD YYYY (no comma)
    /(\w{3,9}\s+\d{1,2}\s+\d{4})/g,
    // DD-Mon-YYYY
    /(\d{1,2}[-\/]\w{3}[-\/]\d{4})/g
  ]
  
  let date = ''
  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      date = match[0]
      break
    }
  }

  // Extract vendor name - significantly improved logic
  let vendor = ''
  
  // Enhanced vendor extraction strategies
  const vendorStrategies = [
    // Strategy 1: Look for known business patterns at the top
    () => {
      const topLines = lines.slice(0, 5) // Check first 5 lines
      
      for (const line of topLines) {
        const trimmedLine = line.trim()
        if (trimmedLine.length < 2 || trimmedLine.length > 50) continue
        
        // Check against known vendor keywords
        const lowerLine = trimmedLine.toLowerCase()
        for (const vendorKeyword of Object.keys(CATEGORY_MAPPINGS.vendors)) {
          if (lowerLine.includes(vendorKeyword)) {
            return trimmedLine
          }
        }
      }
      return ''
    },
    
    // Strategy 2: Look for business name patterns (improved)
    () => {
      const businessPatterns = [
        // All caps business names (common on receipts)
        /^[A-Z][A-Z\s&'.-]{2,35}$/,
        // Title case business names
        /^[A-Z][a-z]+(?:\s[A-Z][a-z]*)*(?:\s(?:Inc|LLC|Corp|Ltd|Co|Restaurant|Cafe|Store|Market|Shop)\.?)?$/,
        // Mixed case with common business words
        /^[A-Za-z][A-Za-z\s&'.-]*(?:Restaurant|Cafe|Store|Market|Shop|Inc|LLC|Corp|Ltd|Co)$/i,
        // Patterns with numbers (like "7-Eleven", "24 Hour Fitness")
        /^[A-Za-z0-9][A-Za-z0-9\s&'.-]{2,35}$/
      ]
      
      for (const line of lines.slice(0, 8)) { // Check first 8 lines
        const trimmedLine = line.trim()
        if (trimmedLine.length < 3 || trimmedLine.length > 40) continue
        
        // Skip obvious non-business terms
        const avoidTerms = /^(RECEIPT|INVOICE|BILL|TOTAL|SUBTOTAL|TAX|DATE|TIME|CUSTOMER|COPY|MERCHANT|TERMINAL|STORE|LOCATION|ADDRESS|\d+|THANK YOU|VISIT|AGAIN)$/i
        if (avoidTerms.test(trimmedLine)) continue
        
        // Skip lines that are mostly numbers or symbols
        if (/^[\d\s\-\/\.\(\)]+$/.test(trimmedLine)) continue
        if (/^[*\-=_\s]+$/.test(trimmedLine)) continue
        
        for (const pattern of businessPatterns) {
          if (pattern.test(trimmedLine)) {
            return trimmedLine
          }
        }
      }
      return ''
    },
    
    // Strategy 3: Look for the first meaningful line that could be a business name
    () => {
      for (const line of lines.slice(0, 6)) {
        const trimmedLine = line.trim()
        
        // Must have letters and be reasonable length
        if (trimmedLine.length >= 3 && trimmedLine.length <= 40 && /[a-zA-Z]/.test(trimmedLine)) {
          // Skip obvious non-business terms
          const avoidTerms = /^(RECEIPT|INVOICE|BILL|TOTAL|SUBTOTAL|TAX|DATE|TIME|CUSTOMER|COPY|MERCHANT|TERMINAL|STORE|LOCATION|ADDRESS|THANK YOU|VISIT|AGAIN|\d+)$/i
          if (!avoidTerms.test(trimmedLine)) {
            // Skip lines that are mostly numbers, dates, or addresses
            if (!/^\d+$/.test(trimmedLine) && 
                !/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(trimmedLine) &&
                !/^\d+\s+\w+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane)$/i.test(trimmedLine)) {
              return trimmedLine
            }
          }
        }
      }
      return ''
    },
    
    // Strategy 4: Fallback - find the longest meaningful line in the first few lines
    () => {
      let bestCandidate = ''
      for (const line of lines.slice(0, 4)) {
        const trimmedLine = line.trim()
        if (trimmedLine.length > bestCandidate.length && 
            trimmedLine.length >= 3 && 
            trimmedLine.length <= 40 &&
            /[a-zA-Z]/.test(trimmedLine) &&
            !/^[\d\s\-\/\.]+$/.test(trimmedLine)) {
          bestCandidate = trimmedLine
        }
      }
      return bestCandidate
    }
  ]
  
  // Try each strategy until we find a vendor
  for (const strategy of vendorStrategies) {
    vendor = strategy()
    if (vendor) break
  }

  // Format date to YYYY-MM-DD if possible
  if (date) {
    try {
      // Handle European DD/MM/YYYY format specifically
      if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(date)) {
        const datePart = date.split(' ')[0] // Remove time part if present
        const [day, month, year] = datePart.split('/')
        const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate.toISOString().split('T')[0]
        }
      } else {
        const parsedDate = new Date(date)
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate.toISOString().split('T')[0]
        }
      }
    } catch (e) {
      // Keep original date if parsing fails
    }
  }

  return {
    vendor: vendor || '',
    amount,
    date: date || '',
  }
}

function extractLineItems(lines: string[]): LineItem[] {
  const items: LineItem[] = []
  
  // Enhanced patterns for line items - including McDonald's format
  const itemPatterns = [
    // McDonald's format: "1 McB ChiliChicken                2.50"
    /^(\d{1,2})\s+([A-Za-z][A-Za-z\s&'.-]{2,40}?)\s{2,}(\d{1,3}(?:,\d{3})*\.?\d{0,2})\s*$/,
    // McDonald's format with Euro: "1 McB ChiliChicken                €2.50"
    /^(\d{1,2})\s+([A-Za-z][A-Za-z\s&'.-]{2,40}?)\s{2,}[€\$]?(\d{1,3}(?:,\d{3})*\.?\d{0,2})\s*$/,
    // McDonald's format without price: "1 McB Cola Zero" (some items might not have individual prices)
    /^(\d{1,2})\s+([A-Za-z][A-Za-z\s&'.-]{2,40}?)\s*$/,
    // Item with price at end: "Item Name                    $12.99"
    /^(.{3,45}?)\s{2,}[€\$]?(\d{1,3}(?:,\d{3})*\.?\d{0,2})\s*$/,
    // Item with quantity: "2 Item Name                   $12.99" or "2x Item Name    $12.99"
    /^(\d{1,2})\s*x?\s+(.{3,35}?)\s{2,}[€\$]?(\d{1,3}(?:,\d{3})*\.?\d{0,2})\s*$/,
    // Item with explicit quantity: "Item Name  Qty: 2  $12.99"
    /^(.{3,35}?)\s+(?:qty|quantity)[:.]?\s*(\d{1,2})\s+[€\$]?(\d{1,3}(?:,\d{3})*\.?\d{0,2})\s*$/i,
    // Item with @ symbol: "Item Name @ $5.99"
    /^(.{3,35}?)\s+@\s+[€\$]?(\d{1,3}(?:,\d{3})*\.?\d{0,2})\s*$/,
    // Item with unit price and total: "Item  $5.00 x 2 = $10.00"
    /^(.{3,35}?)\s+[€\$]?(\d{1,3}(?:,\d{3})*\.?\d{0,2})\s*x\s*(\d{1,2})\s*=?\s*[€\$]?(\d{1,3}(?:,\d{3})*\.?\d{0,2})\s*$/i,
    // Simple item and price: "Coffee        4.99"
    /^([a-zA-Z][a-zA-Z\s&'.-]{2,30})\s{2,}(\d{1,3}\.?\d{0,2})\s*$/,
    // Item with size/modifier: "Large Coffee                 $4.99"
    /^((?:small|medium|large|extra|regular)?\s*[a-zA-Z][a-zA-Z\s&'.-]{2,30})\s{2,}[€\$]?(\d{1,3}(?:,\d{3})*\.?\d{0,2})\s*$/i
  ]
  
  // Enhanced skip patterns
  const skipPatterns = [
    // Transaction details
    /^(total|subtotal|tax|discount|tip|change|cash|credit|debit|visa|mastercard|amex|discover)/i,
    // Receipt metadata
    /^(receipt|invoice|bill|date|time|cashier|server|table|order|transaction|reference)/i,
    // Numbers and codes
    /^[\d\s\-\/\.#]+$/, // Just numbers, dates, dashes, reference numbers
    /^[*\-=_\s]+$/, // Just symbols
    /^.{0,2}$/, // Too short
    /^.{60,}$/, // Too long
    // Dates and times
    /^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/, // Dates
    /^\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?/i, // Times
    // Common receipt terms
    /^(thank you|visit us|store|location|address|phone|email|website|manager|employee)/i,
    // Payment and card info
    /^(card|account|approval|auth|ref|terminal|merchant)/i,
    // Promotional text
    /^(save|earn|points|rewards|member|loyalty)/i,
    // McDonald's specific terms to skip
    /^(open|geopend|vrijdag|zaterdag|zondag|maandag|dinsdag|woensdag|donderdag|tel|e-mail|damrak)/i,
    // VAT and totals
    /^(in total|incl vat|vat|btw)/i
  ]
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip obvious non-item lines
    if (skipPatterns.some(pattern => pattern.test(line))) {
      continue
    }
    
    // Try to match item patterns
    for (const pattern of itemPatterns) {
      const match = line.match(pattern)
      if (match) {
        let item: LineItem | null = null
        
        // Check if this is McDonald's format with quantity and description
        if (pattern.source.startsWith('^(\\d{1,2})\\s+([A-Za-z]')) {
          if (match.length === 4) {
            // Format: "1 McB ChiliChicken 2.50"
            const quantity = parseInt(match[1])
            const description = match[2].trim()
            const price = parseFloat(match[3].replace(/,/g, ''))
            
            if (quantity > 0 && quantity < 100 && description.length >= 2) {
              item = {
                description,
                quantity,
                totalPrice: price > 0 && price < 1000 ? price : undefined
              }
            }
          } else if (match.length === 3) {
            // Format: "1 McB Cola Zero" (no price)
            const quantity = parseInt(match[1])
            const description = match[2].trim()
            
            if (quantity > 0 && quantity < 100 && description.length >= 2) {
              item = {
                description,
                quantity
              }
            }
          }
        } else if (match.length === 3) {
          // Simple item and price
          const description = match[1].trim()
          const price = parseFloat(match[2].replace(/,/g, ''))
          
          if (price > 0 && price < 1000) {
            item = {
              description,
              totalPrice: price
            }
          }
        } else if (match.length === 4) {
          // With quantity or other modifier
          if (pattern.source.includes('qty|quantity')) {
            // Explicit quantity pattern
            const description = match[1].trim()
            const quantity = parseInt(match[2])
            const price = parseFloat(match[3].replace(/,/g, ''))
            
            if (price > 0 && price < 1000 && quantity > 0 && quantity < 100) {
              item = {
                description,
                quantity,
                totalPrice: price
              }
            }
          } else if (pattern.source.startsWith('^(\\d{1,2})')) {
            // Leading quantity pattern
            const quantity = parseInt(match[1])
            const description = match[2].trim()
            const price = parseFloat(match[3].replace(/,/g, ''))
            
            if (price > 0 && price < 1000 && quantity > 0 && quantity < 100) {
              item = {
                description,
                quantity,
                totalPrice: price
              }
            }
          } else {
            // Other patterns
            const description = match[1].trim()
            const price = parseFloat(match[2].replace(/,/g, ''))
            
            if (price > 0 && price < 1000) {
              item = {
                description,
                totalPrice: price
              }
            }
          }
        } else if (match.length === 5) {
          // Unit price x quantity = total
          const description = match[1].trim()
          const unitPrice = parseFloat(match[2].replace(/,/g, ''))
          const quantity = parseInt(match[3])
          const totalPrice = parseFloat(match[4].replace(/,/g, ''))
          
          if (unitPrice > 0 && quantity > 0 && totalPrice > 0 && 
              Math.abs(unitPrice * quantity - totalPrice) < 0.02) { // Allow for rounding
            item = {
              description,
              unitPrice,
              quantity,
              totalPrice
            }
          }
        }
        
        // Validate and add the item
        if (item && item.description.length >= 2 && item.description.length <= 50) {
          // Additional validation - ensure it looks like a real item
          if (!/^[\d\s\-\/\.#]+$/.test(item.description) && // Not just numbers
              !/^[*\-=_\s]+$/.test(item.description)) { // Not just symbols
            items.push(item)
          }
        }
        break
      }
    }
  }
  
  // If no structured items found, try to extract simple descriptions from likely item lines
  if (items.length === 0) {
    const possibleItems = lines.filter(line => {
      const trimmed = line.trim()
      return trimmed.length >= 3 && 
             trimmed.length <= 50 && 
             !skipPatterns.some(pattern => pattern.test(trimmed)) &&
             /[a-zA-Z]/.test(trimmed) && // Contains letters
             !/^[\d\s\-\/\.#]+$/.test(trimmed) && // Not just numbers
             !/^[*\-=_\s]+$/.test(trimmed) // Not just symbols
    }).slice(0, 10) // Limit to first 10 possible items
    
    possibleItems.forEach(itemLine => {
      // Try to extract price from the line
      const priceMatch = itemLine.match(/[€\$]?(\d{1,3}(?:,\d{3})*\.?\d{0,2})\s*$/)
      if (priceMatch) {
        const price = parseFloat(priceMatch[1].replace(/,/g, ''))
        const description = itemLine.replace(priceMatch[0], '').trim()
        
        if (price > 0 && price < 1000 && description.length >= 2) {
          items.push({
            description,
            totalPrice: price
          })
        }
      } else {
        // Just add as description without price
        items.push({
          description: itemLine.trim()
        })
      }
    })
  }
  
  return items.slice(0, 15) // Limit to 15 items max
}

function determineCategoryFromContext(vendor: string, items: LineItem[], fullText: string): { category: string, confidence: number } {
  const vendorLower = vendor.toLowerCase()
  const textLower = fullText.toLowerCase()
  
  let categoryScores: { [key: string]: number } = {}
  
  // Check vendor-based categories (higher weight)
  for (const [vendorKeyword, category] of Object.entries(CATEGORY_MAPPINGS.vendors)) {
    if (vendorLower.includes(vendorKeyword)) {
      categoryScores[category] = (categoryScores[category] || 0) + 5 // Increased weight
    }
  }
  
  // Check item-based categories
  items.forEach(item => {
    const itemLower = item.description.toLowerCase()
    for (const [itemKeyword, category] of Object.entries(CATEGORY_MAPPINGS.items)) {
      if (itemLower.includes(itemKeyword)) {
        categoryScores[category] = (categoryScores[category] || 0) + 2 // Increased weight
      }
    }
  })
  
  // Check full text for additional context
  for (const [keyword, category] of Object.entries(CATEGORY_MAPPINGS.items)) {
    if (textLower.includes(keyword)) {
      categoryScores[category] = (categoryScores[category] || 0) + 1
    }
  }
  
  // Find the category with the highest score
  const sortedCategories = Object.entries(categoryScores)
    .sort(([,a], [,b]) => b - a)
  
  if (sortedCategories.length === 0) {
    return { category: 'Other', confidence: 0 }
  }
  
  const [topCategory, topScore] = sortedCategories[0]
  const confidence = Math.min(topScore / 8, 1) // Adjusted for new scoring
  
  return { 
    category: topCategory, 
    confidence: Math.round(confidence * 100) / 100 
  }
} 