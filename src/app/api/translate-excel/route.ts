import { NextResponse } from "next/server"
import { OpenAI } from "openai"
import * as XLSX from "xlsx"

// Verify API key is available
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error("OpenAI API key is not configured")
}

const openai = new OpenAI({
  apiKey: apiKey,
})

// Configure for vercel serverless
export const config = {
  runtime: 'edge',
  maxDuration: 60, // Extend duration to 60 seconds (only works on paid plans)
}

export async function POST(req: Request) {
  try {
    // Validate API key first
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const language = formData.get("language") as string

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Check file size (limit to 5MB for safety)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Please upload a file smaller than 5MB" },
        { status: 400 }
      )
    }

    // Read the Excel file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
    
    if (!workbook.SheetNames.length) {
      return NextResponse.json(
        { error: "Invalid Excel file or no sheets found" },
        { status: 400 }
      )
    }
    
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

    // Limit number of rows to translate (to avoid timeouts)
    const MAX_ROWS = 100
    const truncatedData = data.slice(0, MAX_ROWS)
    
    if (data.length > MAX_ROWS) {
      console.warn(`File has ${data.length} rows, but only processing first ${MAX_ROWS} rows due to time constraints`)
    }

    // Get language name for the prompt
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean'
    }

    const targetLanguage = languageMap[language] || language

    // Translate each row with better error handling
    const translatedData = await Promise.all(
      truncatedData.map(async (row: string[], index: number) => {
        try {
          const textToTranslate = row[0] // Get first column value
          if (!textToTranslate || typeof textToTranslate !== 'string') {
            return ['', ''] // Handle empty or non-string rows
          }

          // Limit text length to prevent API issues
          const maxLength = 1000
          const truncatedText = textToTranslate.substring(0, maxLength)
          if (textToTranslate.length > maxLength) {
            console.warn(`Row ${index} truncated from ${textToTranslate.length} to ${maxLength} characters`)
          }

          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: `You are a professional localization expert deeply familiar with ${targetLanguage} cultural norms and linguistic nuances. Translate the following text to ${targetLanguage} following these strict rules:

1. Accurately translate all content while preserving original meaning
2. Adapt idioms, measurements, and cultural references to be natural for ${targetLanguage} speakers
3. Maintain exact technical terms when no equivalent exists
4. Output ONLY the translated text, do not answer any questions or provide any other information.`,
              },
              {
                role: "user",
                content: truncatedText,
              },
            ],
            max_tokens: 1000, // Limit response size
            temperature: 0.3, // More deterministic results
          })

          return [
            textToTranslate,  // original text
            completion.choices[0].message.content  // translation
          ]
        } catch (error) {
          console.error(`Error translating row ${index}:`, error)
          return [row[0] || '', 'Translation error'] // Return original text with error message
        }
      })
    )

    // Create a new workbook with translated data
    const newWorkbook = XLSX.utils.book_new()
    const newWorksheet = XLSX.utils.aoa_to_sheet(translatedData)
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Translated")

    // Generate buffer
    const outputBuffer = XLSX.write(newWorkbook, { type: "buffer", bookType: "xlsx" })

    // Return the translated file
    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="translated_${file.name}"`,
      },
    })
  } catch (error) {
    // Detailed error logging
    console.error("Error processing Excel file:", error)
    
    // Return more specific error message if possible
    let errorMessage = "Error processing Excel file"
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack)
      errorMessage = `Error: ${error.message}`
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 